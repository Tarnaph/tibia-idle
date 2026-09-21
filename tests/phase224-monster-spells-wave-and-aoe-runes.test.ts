import { describe, it, expect } from 'vitest';
import {
  createIdleGame,
  mapMonsterEffectToId,
  mapMonsterProjectileToId,
  castAutomaticSpells,
  triggerManualHotbarAction,
} from '../packages/domain/src/combat';
import { getMonsterWaveTiles } from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 224: Skeleton Monster Corpses, Dragon Fire Wave, Druid Avalanche & AoE Runes Fix', () => {
  it('1. getMonsterWaveTiles projects authentic directional cone across 8 SQMs', () => {
    const origin = { x: 100, y: 100, z: 7 };

    // South direction wave
    const southTiles = getMonsterWaveTiles(origin, 'south', 8, 3);
    expect(southTiles.length).toBeGreaterThan(15);
    // At d=1 (y=101), halfWidth is 0 -> 1 tile: (100, 101)
    expect(southTiles.some((t) => t.x === 100 && t.y === 101)).toBe(true);
    // At d=8 (y=108), halfWidth is 3 -> tiles from 97 to 103 on y=108
    expect(southTiles.some((t) => t.x === 97 && t.y === 108)).toBe(true);
    expect(southTiles.some((t) => t.x === 100 && t.y === 108)).toBe(true);
    expect(southTiles.some((t) => t.x === 103 && t.y === 108)).toBe(true);

    // North direction wave
    const northTiles = getMonsterWaveTiles(origin, 'north', 8, 3);
    expect(northTiles.some((t) => t.x === 100 && t.y === 99)).toBe(true);
    expect(northTiles.some((t) => t.x === 100 && t.y === 92)).toBe(true);

    // East direction wave
    const eastTiles = getMonsterWaveTiles(origin, 'east', 8, 3);
    expect(eastTiles.some((t) => t.x === 101 && t.y === 100)).toBe(true);
    expect(eastTiles.some((t) => t.x === 108 && t.y === 100)).toBe(true);

    // West direction wave
    const westTiles = getMonsterWaveTiles(origin, 'west', 8, 3);
    expect(westTiles.some((t) => t.x === 99 && t.y === 100)).toBe(true);
    expect(westTiles.some((t) => t.x === 92 && t.y === 100)).toBe(true);
  });

  it('2. mapMonsterEffectToId maps firearea to effect 7 (CONST_ME_FIREAREA)', () => {
    expect(mapMonsterEffectToId('firearea')).toBe(7);
    expect(mapMonsterEffectToId('fire')).toBe(7);
    expect(mapMonsterEffectToId('explosion')).toBe(7);
    expect(mapMonsterEffectToId('blueenergy')).toBe(13);
    expect(mapMonsterEffectToId('yellowenergy')).toBe(11);
    expect(mapMonsterEffectToId('poison')).toBe(8);
  });

  it('3. mapMonsterProjectileToId maps standard Tibia monster projectiles', () => {
    expect(mapMonsterProjectileToId('fire')).toBe(4);
    expect(mapMonsterProjectileToId('arrow')).toBe(3);
    expect(mapMonsterProjectileToId('stone')).toBe(11);
    expect(mapMonsterProjectileToId('bolt')).toBe(2);
  });

  it('4. Area Runes (Avalanche) in party hunt hit ALL enemies within 3x3 circle even with focused leader target', () => {
    const state = createIdleGame('test-phase-224-aoe', content);

    // Setup 1 Druid and 1 Knight in party
    const druidChar = state.session.characters[0];
    druidChar.baseVocation = 'Druid';
    druidChar.vocation = 'Elder Druid';
    druidChar.level = 50;
    druidChar.skills.magicLevel = 60;
    (druidChar as any).gold = 50000;

    // Hotbar slot 0: Avalanche rune (id 2274)
    druidChar.hotbar = [2274, 0, 0, 0, 0];
    druidChar.hotbarConfigs = {
      0: {
        enabled: true,
      },
    };

    const druidActor = state.encounter.partyActors[0];
    druidActor.position = { x: 10, y: 10, z: 7 };

    // 4 Cyclopes grouped together within 3x3 around primary target (12, 10)
    const enemies = [
      {
        id: 'cyclops-primary',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 12, y: 10, z: 7 },
        hp: 260,
        maxHp: 260,
        alive: true,
        speed: 100,
        spellCooldowns: {},
        attackCooldownMs: 0,
      },
      {
        id: 'cyclops-sec-1',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 12, y: 11, z: 7 }, // dx: 0, dy: 1 (in 3x3 circle)
        hp: 260,
        maxHp: 260,
        alive: true,
        speed: 100,
        spellCooldowns: {},
        attackCooldownMs: 0,
      },
      {
        id: 'cyclops-sec-2',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 13, y: 10, z: 7 }, // dx: 1, dy: 0 (in 3x3 circle)
        hp: 260,
        maxHp: 260,
        alive: true,
        speed: 100,
        spellCooldowns: {},
        attackCooldownMs: 0,
      },
      {
        id: 'cyclops-sec-3',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 11, y: 10, z: 7 }, // dx: -1, dy: 0 (in 3x3 circle)
        hp: 260,
        maxHp: 260,
        alive: true,
        speed: 100,
        spellCooldowns: {},
        attackCooldownMs: 0,
      },
    ];

    state.encounter.enemies = enemies as any;
    druidActor.targetId = 'cyclops-primary';

    // Clear cooldowns
    druidActor.groupCooldowns = {};
    druidActor.spellCooldowns = {};

    // Cast automatic spells/runes
    castAutomaticSpells(state, content);

    // Verify all 4 cyclopes took damage!
    const damagedCount = state.encounter.enemies.filter((e) => e.hp < e.maxHp).length;
    expect(damagedCount).toBe(4);

    // Verify spell-cast events were generated for all 4
    const runeCastEvents = state.encounter.events.filter(
      (ev) => ev.type === 'spell-cast' && ev.spellId === 2274
    );
    expect(runeCastEvents.length).toBe(4);
  });

  it('5. Manual Avalanche casting hits all secondary enemies in 3x3 circle even with locked target', () => {
    const state = createIdleGame('test-phase-224-manual-aoe', content);
    const druidChar = state.session.characters[0];
    druidChar.baseVocation = 'Druid';
    druidChar.vocation = 'Elder Druid';
    druidChar.level = 50;
    druidChar.skills.magicLevel = 60;

    const druidActor = state.encounter.partyActors[0];
    druidActor.position = { x: 10, y: 10, z: 7 };

    state.encounter.enemies = [
      {
        id: 'c-1',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 12, y: 10, z: 7 },
        hp: 300,
        maxHp: 300,
        alive: true,
      },
      {
        id: 'c-2',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 12, y: 11, z: 7 },
        hp: 300,
        maxHp: 300,
        alive: true,
      },
      {
        id: 'c-3',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 13, y: 10, z: 7 },
        hp: 300,
        maxHp: 300,
        alive: true,
      },
    ] as any;

    druidActor.targetId = 'c-1';
    druidActor.groupCooldowns = {};

    const action = {
      actionId: 2274,
      kind: 'rune' as const,
      rune: {
        id: 2274,
        name: 'Avalanche',
        category: 'attack' as const,
        range: 5,
        area: 'circle-3x3',
        combatType: 'ice',
        effectId: 43,
        projectileId: 43,
        cooldownMs: 2000,
      },
    };

    const executed = triggerManualHotbarAction(state, druidActor.characterId, 2274, content);
    expect(executed).toBe(true);

    const hitEnemies = state.encounter.enemies.filter((e) => e.hp < 300);
    expect(hitEnemies.length).toBe(3);
  });

  it('6. Druid is not blocked from casting Avalanche when Knight HP < 85%', () => {
    const state = createIdleGame('test-phase-224-druid-attack', content);

    // Setup 1 Knight and 1 Druid
    const knightChar = state.session.characters[0];
    knightChar.baseVocation = 'Knight';
    knightChar.vocation = 'Elite Knight';
    knightChar.maxHp = 1000;

    const druidChar = state.session.characters[1] ?? { ...knightChar, id: 'char-druid-2', name: 'Cerberus' };
    druidChar.baseVocation = 'Druid';
    druidChar.vocation = 'Elder Druid';
    druidChar.level = 45;
    druidChar.skills.magicLevel = 50;
    druidChar.hotbar = [2274, 0, 0, 0, 0];
    if (!state.session.characters.find((c) => c.id === druidChar.id)) {
      state.session.characters.push(druidChar);
    }

    const knightActor = state.encounter.partyActors[0];
    knightActor.characterId = knightChar.id;
    knightActor.hp = 500; // 50% HP (well below 85%)
    knightActor.alive = true;

    let druidActor = state.encounter.partyActors[1];
    if (!druidActor) {
      druidActor = { ...knightActor, characterId: druidChar.id, hp: 400, alive: true };
      state.encounter.partyActors.push(druidActor);
    }
    druidActor.characterId = druidChar.id;
    druidActor.position = { x: 10, y: 10, z: 7 };
    druidActor.alive = true;
    druidActor.groupCooldowns = {};

    state.encounter.enemies = [
      {
        id: 'enemy-1',
        monsterId: 'cyclops',
        name: 'Cyclops',
        position: { x: 11, y: 10, z: 7 },
        hp: 260,
        maxHp: 260,
        alive: true,
      },
    ] as any;

    castAutomaticSpells(state, content);

    // Druid should have cast Avalanche on enemy-1
    expect(state.encounter.enemies[0].hp).toBeLessThan(260);
  });
});
