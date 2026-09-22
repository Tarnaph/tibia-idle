import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterService, ServerCharacterContextRegistry, SkillRateLimiter } from '../packages/auth/src';
import { HuntDungeonRoom } from '../packages/server/src/rooms/HuntDungeonRoom';
import { persistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';

describe('Phase 225: Server-Authoritative Hunts & Save Telemetry Resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    SkillRateLimiter.resetAll();
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
  });

  describe('1. CharacterService Save Telemetry & Unblocked Progression', () => {
    it('saves successfully and logs audit telemetry instead of throwing fatal 400 when delta exceeds standard budget', async () => {
      const charId = 'test-char-telemetry-225';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockDbChar: any = {
        id: charId,
        accountId: 'acc-1',
        name: 'Wolfy',
        level: 30,
        experience: BigInt(500000),
        vocationName: 'Knight',
        vocationId: 4,
        health: 500,
        maxHealth: 500,
        mana: 150,
        maxMana: 150,
        capacity: 800,
        saveVersion: 5,
        isHunting: true,
        lastHuntId: 'cyclops-camp',
        lastSavedAt: new Date(Date.now() - 1000), // 1 second ago
        skills: [
          { skillId: 2, skillName: 'Sword Fighting', value: 50, tries: BigInt(100) },
        ],
      };

      const mockPrisma: any = {
        character: {
          findUnique: vi.fn().mockResolvedValue(mockDbChar),
          update: vi.fn().mockImplementation(({ data }) => {
            Object.assign(mockDbChar, data);
            return Promise.resolve(mockDbChar);
          }),
        },
        characterSkill: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      };

      const service = new CharacterService(mockPrisma);

      // Simula envio de tentativas de treino que excedem o teto teórico no delta de tempo
      const result = await service.saveCharacterProgress(
        charId,
        {
          saveVersion: 5,
          isHunting: true,
          lastHuntId: 'cyclops-camp',
          skills: [
            { skillId: 2, skillName: 'Sword Fighting', value: 52, tries: BigInt(900000) },
          ],
        },
        { isHunting: true, permissiveTelemetry: true }
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(charId);
      expect(mockDbChar.saveVersion).toBe(6); // Monotonically incremented!
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT_TELEMETRY]')
      );
    });

    it('preserves strict security throw when explicitly requested by test runner or strict mode', async () => {
      const charId = 'test-char-strict-225';

      const mockDbChar: any = {
        id: charId,
        accountId: 'acc-1',
        name: 'Wolfy',
        level: 30,
        experience: BigInt(500000),
        vocationName: 'Knight',
        vocationId: 4,
        saveVersion: 1,
        lastSavedAt: new Date(Date.now()),
        skills: [
          { skillId: 2, skillName: 'Sword Fighting', value: 50, tries: BigInt(100) },
        ],
      };

      const mockPrisma: any = {
        character: {
          findUnique: vi.fn().mockResolvedValue(mockDbChar),
        },
      };

      const service = new CharacterService(mockPrisma);

      // Em modo estrito com esgotamento de saldo urbano
      await expect(
        service.saveCharacterProgress(
          charId,
          {
            saveVersion: 1,
            isHunting: false,
            skills: [
              { skillId: 2, skillName: 'Sword Fighting', value: 52, tries: BigInt(999999) },
            ],
          },
          { isHunting: false, strictSecurity: true }
        )
      ).rejects.toThrow(/Salto anômalo de habilidade não permitido/);
    });
  });

  describe('2. HuntDungeonRoom Server-Authoritative Dungeon Architecture', () => {
    it('initializes dungeon room, spawns thematic monsters and accepts player connection', async () => {
      const room = new HuntDungeonRoom();
      room.onCreate({ huntId: 'cyclops-camp' });

      expect(room.huntId).toBe('cyclops-camp');
      expect(room.state.regionName).toBe('hunt:cyclops-camp');

      // Verify dungeon monsters spawned
      expect(room.state.monsters.size).toBeGreaterThan(0);
      const cyclops = Array.from(room.state.monsters.values()).find((m) => m.name === 'Cyclops');
      expect(cyclops).toBeDefined();
      expect(cyclops?.hp).toBe(260);

      // Mock Client joining the dungeon
      const mockClient: any = {
        sessionId: 'session_wolfy_1',
        send: vi.fn(),
      };

      vi.spyOn(persistenceManager, 'loadCharacter').mockResolvedValue({
        id: 'char-wolfy',
        accountId: 'acc-wolfy',
        name: 'Wolfy',
        level: 35,
        experience: 650000,
        vocationId: 4,
        vocationName: 'Elite Knight',
        health: 600,
        maxHealth: 600,
        mana: 180,
        maxMana: 180,
      } as any);

      vi.spyOn(persistenceManager, 'setPlayerHuntStatus').mockResolvedValue();

      await room.onJoin(mockClient, {
        characterId: 'char-wolfy',
        huntId: 'cyclops-camp',
      });

      const player = room.state.players.get('session_wolfy_1');
      expect(player).toBeDefined();
      expect(player?.name).toBe('Wolfy');
      expect(player?.inHunt).toBe(true);
      expect(player?.lastHuntId).toBe('cyclops-camp');

      // Check hunt context confirmation dispatched to client
      expect(mockClient.send).toHaveBeenCalledWith('server:huntContextReady', {
        isHunting: true,
        huntId: 'cyclops-camp',
      });

      // Verify active hunt status in context registry
      expect(ServerCharacterContextRegistry.isHunting('char-wolfy')).toBe(true);

      // Clean up room
      room.onDispose();
    });

    it('advances authoritative combat ticks and handles monster kills with experience reward', () => {
      const room = new HuntDungeonRoom();
      room.onCreate({ huntId: 'rat-cellars' });

      // Add test player directly
      const mockClient: any = { sessionId: 'sess_hero', send: vi.fn() };
      const player: any = {
        id: 'sess_hero',
        characterId: 'char_hero',
        name: 'Hero',
        level: 1,
        experience: 0,
        hp: 150,
        maxHp: 150,
        attackPower: 50,
        armorPower: 10,
        defensePower: 15,
        lastAttackTime: 0,
        posX: 32000,
        posY: 32000,
        posZ: 8,
        targetId: '',
        vocationName: 'Knight',
      };
      room.state.players.set('sess_hero', player);

      const rat = Array.from(room.state.monsters.values())[0];
      expect(rat).toBeDefined();
      rat.hp = 10; // Low hp so next player hit kills it
      player.targetId = rat.id;

      // Advance one tick of simulation (100ms)
      (room as any).update(100);

      // Player attacked and rat died authoritatively
      expect(rat.isDead).toBe(true);
      expect(rat.respawnTimerMs).toBe(15000);
      expect(player.experience).toBeGreaterThan(0);

      // Combat event emitted
      const deathEvent = room.state.combatEvents.find((e) => e.type === 'creature-died');
      expect(deathEvent).toBeDefined();
      expect(deathEvent?.targetId).toBe(rat.id);

      room.onDispose();
    });

    it('saves character authoritatively and cleans up active hunt on player exit', async () => {
      const room = new HuntDungeonRoom();
      room.onCreate({ huntId: 'cyclops-camp' });

      const mockClient: any = { sessionId: 'sess_leaving', send: vi.fn() };
      const player: any = {
        id: 'sess_leaving',
        characterId: 'char_leaving',
        name: 'Leaver',
        level: 20,
        experience: 150000,
        hp: 400,
        maxHp: 400,
        inHunt: true,
        lastHuntId: 'cyclops-camp',
      };
      room.state.players.set('sess_leaving', player);
      ServerCharacterContextRegistry.setActivity('char_leaving', { isHunting: true, huntId: 'cyclops-camp' });

      const saveSpy = vi.spyOn(persistenceManager, 'saveCharacter').mockResolvedValue();
      const statusSpy = vi.spyOn(persistenceManager, 'setPlayerHuntStatus').mockResolvedValue();

      await room.onLeave(mockClient);

      expect(saveSpy).toHaveBeenCalledWith(player, { allowInHunt: true });
      expect(statusSpy).toHaveBeenCalledWith('char_leaving', false);
      expect(room.state.players.has('sess_leaving')).toBe(false);
      expect(ServerCharacterContextRegistry.isHunting('char_leaving')).toBe(false);

      room.onDispose();
    });
  });
});
