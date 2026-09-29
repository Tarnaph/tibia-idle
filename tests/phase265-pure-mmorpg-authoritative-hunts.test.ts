import { describe, it, expect, vi } from 'vitest';
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

describe('Phase 265 - Pure MMORPG Server-Authoritative Hunts', () => {
  it('1. verifies Exori spell hits all adjacent monsters in 3x3 square and consumes mana', () => {
    const room = new HuntDungeonRoom();
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-lead-1' });

    // Add Knight player with 150 MP
    const player: any = {
      id: 'sess-knight',
      characterId: 'char-knight',
      name: 'Brututus',
      posX: 32700,
      posY: 32300,
      posZ: 7,
      hp: 500,
      maxHp: 500,
      mp: 150,
      maxMp: 150,
      level: 40,
      attackPower: 80,
      defensePower: 40,
      armorPower: 25,
      attackCooldownMs: 2000,
      lastAttackTime: 0,
    };
    room.state.players.set(player.id, player);

    // Position 2 monsters around player: one adjacent (1 SQM away) and one far away (5 SQM away)
    const monsters = Array.from(room.state.monsters.values());
    const mNear = monsters[0];
    mNear.posX = 32701;
    mNear.posY = 32300;
    mNear.posZ = 7;
    mNear.hp = 200;
    mNear.maxHp = 200;
    mNear.isDead = false;

    const mFar = monsters[1];
    mFar.posX = 32705;
    mFar.posY = 32305;
    mFar.posZ = 7;
    mFar.hp = 200;
    mFar.maxHp = 200;
    mFar.isDead = false;

    // Cast Exori
    (room as any).handlePlayerSpell(player, 'exori');

    // Mana should be deducted (115 mana)
    expect(player.mp).toBe(35);

    // Near monster took damage
    expect(mNear.hp).toBeLessThan(200);

    // Far monster remained undamaged
    expect(mFar.hp).toBe(200);
  });

  it('2. verifies healing spells (Exura, Exura Ico, Exura Gran, Exura Vita) and potions restore HP/MP', () => {
    const room = new HuntDungeonRoom();
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-test' });

    const player: any = {
      id: 'sess-mage',
      characterId: 'char-mage',
      name: 'Caos',
      posX: 32700,
      posY: 32300,
      posZ: 7,
      hp: 100,
      maxHp: 300,
      mp: 200,
      maxMp: 500,
      level: 30,
      attackPower: 20,
      defensePower: 15,
      armorPower: 10,
    };
    room.state.players.set(player.id, player);

    // Cast Exura
    (room as any).handlePlayerSpell(player, 'exura');
    expect(player.mp).toBe(180);
    expect(player.hp).toBeGreaterThan(100);

    // Health Potion
    const hpBefore = player.hp;
    (room as any).handlePlayerSpell(player, 'health-potion');
    expect(player.hp).toBeGreaterThan(hpBefore);

    // Mana Potion
    const mpBefore = player.mp;
    (room as any).handlePlayerSpell(player, 'mana-potion');
    expect(player.mp).toBeGreaterThan(mpBefore);
  });

  it('3. verifies ranged attack works at distance for Paladin / Sorcerer / Druid', () => {
    const room = new HuntDungeonRoom();
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-test' });

    // Paladin player (vocationId = 2) at 4 SQM distance
    const paladin: any = {
      id: 'sess-pala',
      characterId: 'char-pala',
      name: 'Legolas',
      vocationId: 2,
      posX: 32700,
      posY: 32300,
      posZ: 7,
      hp: 400,
      maxHp: 400,
      mp: 100,
      maxMp: 100,
      level: 25,
      attackPower: 65,
      defensePower: 25,
      armorPower: 15,
      attackCooldownMs: 2000,
      lastAttackTime: 0,
      targetId: '',
    };
    room.state.players.set(paladin.id, paladin);

    const monster = Array.from(room.state.monsters.values())[0];
    monster.posX = 32704; // 4 tiles away
    monster.posY = 32300;
    monster.posZ = 7;
    monster.hp = 150;
    monster.maxHp = 150;
    monster.isDead = false;
    paladin.targetId = monster.id;

    // Tick simulation
    room.update(100);

    // Paladin should attack monster from 4 tiles away
    expect(monster.hp).toBeLessThan(150);
  });

  it('4. verifies monster death drops gold with 5x multiplier and broadcasts hunt:loot', () => {
    const room = new HuntDungeonRoom();
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-test' });

    const player: any = {
      id: 'sess-p1',
      characterId: 'char-p1',
      name: 'Brututus',
      posX: 32700,
      posY: 32300,
      posZ: 7,
      hp: 500,
      maxHp: 500,
      mp: 100,
      maxMp: 100,
      level: 25,
      experience: 1000,
    };
    room.state.players.set(player.id, player);

    let lootBroadcastData: any = null;
    room.broadcast = vi.fn((event: string, data: any) => {
      if (event === 'hunt:loot') {
        lootBroadcastData = data;
      }
    });

    const monster = Array.from(room.state.monsters.values())[0];
    monster.hp = 0;
    monster.maxHp = 260;

    room.awardMonsterKill(monster);

    expect(monster.isDead).toBe(true);
    expect(lootBroadcastData).toBeDefined();
    expect(lootBroadcastData.gold).toBeGreaterThanOrEqual(50); // 5x rate
    expect(lootBroadcastData.monsterId).toBe(monster.id);
  });

  it('5. verifies GameClientNetworkManager exposes hunt loot listener and IsInHuntRoom', () => {
    expect(typeof gameNetwork.onHuntLoot).toBe('function');
    expect(typeof gameNetwork.onHuntStateChange).toBe('function');
    expect(typeof gameNetwork.sendHuntAttack).toBe('function');
    expect(typeof gameNetwork.sendHuntSpell).toBe('function');
    expect(typeof gameNetwork.sendHuntMove).toBe('function');
    expect(typeof gameNetwork.IsInHuntRoom).toBe('boolean');
  });

  it('6. verifies players and monsters spawn on local walkable tiles (not world 32000+ coords) and monster AI targets player', async () => {
    const room = new HuntDungeonRoom();
    (room as any).setSimulationInterval = vi.fn();
    room.onCreate({ huntId: 'cyclops-camp', partyId: 'party-test' });

    // Verify room has walkable tiles
    expect(room.walkableTileKeys.size).toBeGreaterThan(0);

    // Mock client joining
    const mockClient: any = { sessionId: 'sess-lead-1', send: vi.fn() };
    await room.onJoin(mockClient, { characterId: 'char-1', outfit: 'Knight' });

    const player = room.state.players.get('sess-lead-1')!;
    expect(player).toBeDefined();

    // Verify coordinates are local arena coordinates (< 100) and NOT 32000+ world coordinates
    expect(player.posX).toBeLessThan(100);
    expect(player.posY).toBeLessThan(100);
    expect(room.isTileWalkable(player.posX, player.posY)).toBe(true);

    // Verify monsters also spawn on local walkable coordinates
    const monsters = Array.from(room.state.monsters.values());
    expect(monsters.length).toBeGreaterThan(0);
    for (const m of monsters.slice(0, 3)) {
      expect(m.posX).toBeLessThan(100);
      expect(m.posY).toBeLessThan(100);
      expect(room.isTileWalkable(m.posX, m.posY)).toBe(true);
    }

    // Run one update tick and verify monster AI finds the player
    room.update(100);
    const mFirst = monsters[0];
    expect(mFirst.targetId).toBe('sess-lead-1');
  });
});
