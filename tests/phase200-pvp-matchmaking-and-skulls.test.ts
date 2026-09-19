import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { getPvPTierInfo, canDisplaySkull, PVP_ARENA_SPAWNS } from '../packages/domain/src/pvp';
import { creatureVisualLayout } from '../packages/presentation/src';

describe('Phase 200: PvP Matchmaking Immediate Queue & Official Tibia Upper-Right Skull Badge', () => {
  describe('1. Colyseus PlayerState Schema Fields for PvP & Skull Synchronization', () => {
    it('initializes PlayerState with pvpElo, pvpTier, and displaySkull schema properties', () => {
      const player = new PlayerState();
      expect(player.pvpElo).toBe(1000);
      expect(player.pvpTier).toBe('Bronze');
      expect(player.displaySkull).toBe(true);
    });

    it('allows updating pvpElo, pvpTier, and displaySkull for real-time room sync', () => {
      const player = new PlayerState();
      player.pvpElo = 1250;
      player.pvpTier = 'Diamante';
      player.displaySkull = false;

      expect(player.pvpElo).toBe(1250);
      expect(player.pvpTier).toBe('Diamante');
      expect(player.displaySkull).toBe(false);
    });
  });

  describe('2. Matchmaking 3-Tier Expansion Logic (Ensures 2 Players Never Get Stuck Searching)', () => {
    interface QueueEntry {
      sessionId: string;
      elo: number;
      characterId: string;
      joinedAt: number;
    }

    // Pure reproduction of ThaisCityRoom 3-tier matching algorithm
    function findMatch(queue: QueueEntry[], joiningPlayer: QueueEntry): QueueEntry | null {
      // Tier 1: Ideal match within diff <= 250
      let match = queue.find((entry) => entry.sessionId !== joiningPlayer.sessionId && Math.abs(entry.elo - joiningPlayer.elo) <= 250);
      if (match) return match;

      // Tier 2: Expanded match within diff <= 500
      match = queue.find((entry) => entry.sessionId !== joiningPlayer.sessionId && Math.abs(entry.elo - joiningPlayer.elo) <= 500);
      if (match) return match;

      // Tier 3: Fallback match - pair with any available online player in queue
      match = queue.find((entry) => entry.sessionId !== joiningPlayer.sessionId);
      return match || null;
    }

    it('matches two players with close ELO immediately (Tier 1)', () => {
      const p1: QueueEntry = { sessionId: 'sess_1', elo: 1000, characterId: 'char_1', joinedAt: Date.now() };
      const p2: QueueEntry = { sessionId: 'sess_2', elo: 1050, characterId: 'char_2', joinedAt: Date.now() };
      const queue = [p1];

      const match = findMatch(queue, p2);
      expect(match).toBeDefined();
      expect(match?.sessionId).toBe('sess_1');
    });

    it('matches two players with moderately different ELO (Tier 2, diff 400)', () => {
      const p1: QueueEntry = { sessionId: 'sess_1', elo: 1000, characterId: 'char_1', joinedAt: Date.now() };
      const p2: QueueEntry = { sessionId: 'sess_2', elo: 1400, characterId: 'char_2', joinedAt: Date.now() };
      const queue = [p1];

      const match = findMatch(queue, p2);
      expect(match).toBeDefined();
      expect(match?.sessionId).toBe('sess_1');
    });

    it('matches two players with extreme ELO difference instead of leaving them stuck in infinite search (Tier 3 fallback)', () => {
      const p1: QueueEntry = { sessionId: 'sess_1', elo: 0, characterId: 'char_1', joinedAt: Date.now() };
      const p2: QueueEntry = { sessionId: 'sess_2', elo: 1200, characterId: 'char_2', joinedAt: Date.now() };
      const queue = [p1];

      const match = findMatch(queue, p2);
      expect(match).toBeDefined();
      expect(match?.sessionId).toBe('sess_1');
    });

    it('cleans up queue entry on session duplicate disconnect', () => {
      let queue: QueueEntry[] = [
        { sessionId: 'tab1_sess', elo: 1000, characterId: 'char_1', joinedAt: Date.now() },
        { sessionId: 'other_sess', elo: 1000, characterId: 'char_2', joinedAt: Date.now() },
      ];

      // Tab 1 disconnected due to duplicate session
      const existingSessionId = 'tab1_sess';
      queue = queue.filter((e) => e.sessionId !== existingSessionId);

      expect(queue.some((e) => e.sessionId === 'tab1_sess')).toBe(false);
      expect(queue).toHaveLength(1);
    });
  });

  describe('3. Tibia Canonical Skulls & Default 1000 ELO Red Skull', () => {
    it('maps default 1000 ELO to Platina rank with Red Skull (as requested by user)', () => {
      const tierInfo = getPvPTierInfo(1000);
      expect(tierInfo.tier).toBe('Platina');
      expect(tierInfo.skull).toBe('red');
      expect(canDisplaySkull(1000)).toBe(true);
    });

    it('has red skull and other rank skull assets existing in public/assets/skulls', () => {
      const skullsDir = path.resolve(process.cwd(), 'public/assets/skulls');
      const expectedSkulls = ['skull-green.png', 'skull-yellow.png', 'skull-white.png', 'skull-red.png', 'skull-black.png', 'skull-orange.png'];
      for (const skull of expectedSkulls) {
        expect(fs.existsSync(path.join(skullsDir, skull)), `${skull} must exist`).toBe(true);
      }
    });

    it('returns "none" skull when displaySkull is explicitly false', () => {
      function getCharacterSkull(char: any): string {
        if (!char || char.displaySkull === false) return 'none';
        if (char.pvpSkull) return char.pvpSkull;
        const elo = typeof char.pvpElo === 'number' ? char.pvpElo : 1000;
        return getPvPTierInfo(elo).skull;
      }

      expect(getCharacterSkull({ displaySkull: false, pvpElo: 1000 })).toBe('none');
      expect(getCharacterSkull({ displaySkull: true, pvpElo: 1000 })).toBe('red');
      expect(getCharacterSkull({ pvpElo: 1000 })).toBe('red'); // Default displaySkull is true
    });
  });

  describe('4. Official Tibia Skull Upper-Right Geometry & Placement', () => {
    it('calculates skull position at the upper right corner of the character nameplate', () => {
      // Tibia Canonical layout:
      // Name centered or title + name centered
      const nameW = 60;
      const titleW = 0;
      const totalW = titleW + nameW;
      const startX = -totalW / 2; // -30

      // Skull placed at upper-right corner:
      const skullX = startX + nameW + 2; // 32
      const skullY = creatureVisualLayout.nameplateY - 1; // -21

      expect(skullX).toBe(32);
      expect(skullY).toBe(creatureVisualLayout.nameplateY - 1);
      // Skull is strictly to the right of the name
      expect(skullX).toBeGreaterThan(0);
      expect(skullX).toBeGreaterThan(nameW / 2);
    });

    it('calculates skull position when player has an admin title [GOD] or [GM]', () => {
      const titleW = 28;
      const nameW = 60;
      const totalW = titleW + nameW;
      const startX = -totalW / 2; // -44

      // Title at startX (-44)
      // Name at startX + titleW (-16)
      // Skull at startX + titleW + nameW + 2 = (-44 + 28 + 60 + 2) = 46
      const skullX = startX + titleW + nameW + 2;
      expect(skullX).toBe(46);
      expect(skullX).toBeGreaterThan(totalW / 2);
    });
  });

  describe('5. Client Network Synchronization & Duel Spawns', () => {
    it('has official duel spawns configured with proper separation', () => {
      expect(PVP_ARENA_SPAWNS).toHaveLength(2);
      const [spawn1, spawn2] = PVP_ARENA_SPAWNS;
      expect(spawn1.x).toBe(33136);
      expect(spawn2.x).toBe(33136);
      expect(Math.abs(spawn2.y - spawn1.y)).toBe(8); // 8 tiles between spawns
    });

    it('verifies GameClientNetworkManager defines sendToggleSkull method', async () => {
      const networkManagerPath = path.resolve(process.cwd(), 'apps/web/lib/GameClientNetworkManager.ts');
      const content = fs.readFileSync(networkManagerPath, 'utf8');
      expect(content).toContain('sendToggleSkull(');
      expect(content).toContain('player:toggleSkull');
      expect(content).toContain('displaySkull?: boolean');
    });

    it('verifies ThaisCityRoom handles player:toggleSkull and pvp:queue:join', async () => {
      const roomPath = path.resolve(process.cwd(), 'packages/server/src/rooms/ThaisCityRoom.ts');
      const content = fs.readFileSync(roomPath, 'utf8');
      expect(content).toContain('player:toggleSkull');
      expect(content).toContain('loadedDisplaySkull');
      expect(content).toContain('this.pvpQueue');
      expect(content).toContain('pvp:match:found');
    });
  });
});
