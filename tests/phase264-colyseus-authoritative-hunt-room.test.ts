import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HuntDungeonRoom } from '../packages/server/src/rooms/HuntDungeonRoom';
import { gameNetwork } from '../apps/web/lib/GameClientNetworkManager';
import { getHuntWorldEntrance, initialHunts } from '../packages/domain/src';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';

const content = {
  equipment: equipmentJson.items as any,
  monsters: monstersJson.monsters as any,
  starterLoadouts: startersJson.loadouts as any,
  vocations: vocationsJson.vocations as any,
  spells: (spellsJson as any).spells,
  huntRegions: huntRegionsJson.regions as any,
  economy: economyJson as any,
  hunts: initialHunts,
  rateSkill: vocationsJson.rateSkill,
  rateMagic: vocationsJson.rateMagic,
};

describe('Phase 264 - Colyseus Authoritative Hunt Room & Party Hunt Resilience', () => {
  it('1. verifies getHuntWorldEntrance returns valid entrance for cyclops-camp', () => {
    const entrance = getHuntWorldEntrance('cyclops-camp', content);
    expect(entrance).toBeDefined();
    expect(entrance.worldPosition).toBeDefined();
    expect(entrance.worldPosition.x).toBeGreaterThan(0);
    expect(entrance.worldPosition.y).toBeGreaterThan(0);
    expect(entrance.worldPosition.z).toBe(9);
  });

  it('2. initializes HuntDungeonRoom with partyId and huntId options and spawns monsters', () => {
    const room = new HuntDungeonRoom();
    // Simulate onCreate
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-lead-999' });

    expect(room.huntId).toBe('cyclops-camp');
    expect(room.partyId).toBe('party-lead-999');
    expect(room.state.regionName).toBe('hunt:cyclops-camp');
    expect(room.state.monsters.size).toBeGreaterThanOrEqual(4);

    // Verify monsters spawned have valid coordinates around entrance
    let hasCyclops = false;
    room.state.monsters.forEach((monster) => {
      expect(monster.name).toBeDefined();
      expect(monster.hp).toBeGreaterThan(0);
      expect(monster.maxHp).toBeGreaterThan(0);
      expect(monster.posX).toBeGreaterThan(0);
      expect(monster.posY).toBeGreaterThan(0);
      if (monster.name.toLowerCase().includes('cyclops')) {
        hasCyclops = true;
      }
    });
    expect(hasCyclops).toBe(true);
  });

  it('3. verifies HuntDungeonRoom update loop steps monsters towards target player', () => {
    const room = new HuntDungeonRoom();
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-test' });

    // Add a dummy player
    const player = {
      id: 'sess-p1',
      characterId: 'char-p1',
      name: 'Brututus',
      posX: 32700,
      posY: 32300,
      posZ: 7,
      hp: 500,
      maxHp: 500,
      level: 25,
      experience: 10000,
      targetId: '',
      isWalking: false,
    };
    room.state.players.set(player.id, player as any);

    // Grab a monster and place it 3 tiles away
    const monster = Array.from(room.state.monsters.values())[0];
    monster.posX = 32703;
    monster.posY = 32300;
    monster.posZ = 7;
    monster.targetId = player.id;
    monster.lastStepTime = 0; // ready to step

    const initialX = monster.posX;
    // Tick room simulation
    room.update(100);

    // Monster should step closer towards player
    expect(monster.posX).toBeLessThan(initialX);
  });

  it('4. verifies monster death awards shared party EXP to all connected players in room', () => {
    const room = new HuntDungeonRoom();
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-multi' });

    const p1 = {
      id: 'sess-p1',
      characterId: 'char-lead',
      name: 'Brututus',
      posX: 32700,
      posY: 32300,
      posZ: 7,
      hp: 500,
      maxHp: 500,
      level: 20,
      experience: 10000,
      targetId: '',
    };
    const p2 = {
      id: 'sess-p2',
      characterId: 'char-follow',
      name: 'Caos',
      posX: 32701,
      posY: 32301,
      posZ: 7,
      hp: 400,
      maxHp: 400,
      level: 20,
      experience: 10000,
      targetId: '',
    };
    room.state.players.set(p1.id, p1 as any);
    room.state.players.set(p2.id, p2 as any);

    const monster = Array.from(room.state.monsters.values())[0];
    monster.hp = 0; // Dead
    monster.targetId = p1.id;

    const p1InitialExp = p1.experience;
    const p2InitialExp = p2.experience;

    room.update(100);

    // Both players should receive shared party EXP
    expect(p1.experience).toBeGreaterThan(p1InitialExp);
    expect(p2.experience).toBeGreaterThan(p2InitialExp);
    expect(monster.isDead).toBe(true);
  });

  it('5. verifies GameClientNetworkManager exposes hunt dungeon connection and messaging methods', () => {
    expect(typeof gameNetwork.joinHuntDungeon).toBe('function');
    expect(typeof gameNetwork.leaveHuntDungeon).toBe('function');
    expect(typeof gameNetwork.sendHuntMove).toBe('function');
    expect(typeof gameNetwork.sendHuntAttack).toBe('function');
    expect(typeof gameNetwork.sendHuntSpell).toBe('function');
    expect(typeof gameNetwork.onHuntMonsterDied).toBe('function');
    expect(typeof gameNetwork.onHuntStateChange).toBe('function');
    expect(typeof gameNetwork.onPartyHuntStart).toBe('function');
    expect(gameNetwork.IsInHuntRoom).toBe(false);
  });

  it('6. verifies PartyHuntStartListener receives partyId without typescript mismatch', () => {
    let receivedPartyId: string | undefined;
    const unsub = gameNetwork.onPartyHuntStart((data) => {
      receivedPartyId = data.partyId;
    });

    // Simulate event trigger
    (gameNetwork as any).partyHuntStartListeners.forEach((fn: any) =>
      fn({
        huntId: 'cyclops-camp',
        seed: 'test-seed',
        leaderName: 'Brututus',
        leaderSessionId: 'sess-brututus',
        partyId: 'party-999',
      })
    );

    expect(receivedPartyId).toBe('party-999');
    unsub();
  });
});
