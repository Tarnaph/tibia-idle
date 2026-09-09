import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import {
  createIdleGame,
  advanceCombat,
  advanceCityAutoSpells,
  castAutomaticSpells,
  findHotbarAction,
  evaluateHotbarCondition,
  isHotbarSlotConditionsMet,
  type CharacterState,
  type HotbarSlotConfig,
  type GameState,
} from '../packages/domain/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';

function tickAutoSpells(state: GameState, allowOffensive = true): GameState {
  const next = structuredClone(state) as GameState;
  castAutomaticSpells(next, content, allowOffensive);
  return next;
}

describe('Phase 97 - Hotbar Conditions System (Potions, Spells, Runes)', () => {
  it('respects exact saved HP condition for Health Potion (e.g. <= 75%) without waiting for hardcoded 50%', () => {
    const game = createIdleGame('seed-p97-health-pot', content, 'rat-cellars');
    const character = game.session.characters[0];
    const actor = game.encounter.partyActors[0];

    // Slot 0: Health Potion (7618)
    character.hotbar = [7618];
    character.maxHp = 200;
    character.hotbarConfigs = {
      0: {
        enabled: true,
        healingTarget: 'self',
        conditions: [
          { id: 'c1', target: 'self', metric: 'hp', operator: 'lte', value: 75, isPercent: true },
        ],
      },
    };

    // Case 1: HP is at 76% (152 / 200 HP) -> ABOVE threshold, MUST NOT TRIGGER
    actor.hp = 152;
    game.session.loot = [{ itemId: 7618, name: 'Health Potion', amount: 10 }];
    const afterAbove = tickAutoSpells(game);
    const actorAbove = afterAbove.encounter.partyActors[0];
    expect(actorAbove.hp).toBe(152); // No potion used
    expect(afterAbove.session.loot[0].amount).toBe(10);

    // Case 2: HP is at 75% (150 / 200 HP) -> EXACTLY at threshold, MUST TRIGGER!
    actor.hp = 150;
    const afterEqual = tickAutoSpells(game);
    const actorEqual = afterEqual.encounter.partyActors[0];
    expect(actorEqual.hp).toBeGreaterThan(150); // Potion drank and healed!
    expect(afterEqual.session.loot[0].amount).toBe(9); // 1 consumed

    // Case 3: HP is at 70% (140 / 200 HP) -> BELOW threshold, MUST TRIGGER!
    actor.hp = 140;
    actor.groupCooldowns['potion'] = 0;
    const afterBelow = tickAutoSpells(game);
    const actorBelow = afterBelow.encounter.partyActors[0];
    expect(actorBelow.hp).toBeGreaterThan(140);
  });

  it('respects exact saved Mana condition for Mana Potion (e.g. <= 80%)', () => {
    const game = createIdleGame('seed-p97-mana-pot', content, 'rat-cellars');
    const character = game.session.characters[0];
    const actor = game.encounter.partyActors[0];

    // Slot 0: Mana Potion (7620)
    character.hotbar = [7620];
    character.maxMana = 100;
    character.hotbarConfigs = {
      0: {
        enabled: true,
        conditions: [
          { id: 'c1', target: 'self', metric: 'mana', operator: 'lte', value: 80, isPercent: true },
        ],
      },
    };

    // Case 1: Mana is at 85% (85 / 100 MP) -> ABOVE threshold, MUST NOT TRIGGER
    actor.mana = 85;
    game.session.loot = [{ itemId: 7620, name: 'Mana Potion', amount: 10 }];
    const afterAbove = tickAutoSpells(game);
    const actorAbove = afterAbove.encounter.partyActors[0];
    expect(actorAbove.mana).toBe(85);
    expect(afterAbove.session.loot[0].amount).toBe(10);

    // Case 2: Mana is at 80% (80 / 100 MP) -> EXACTLY at threshold, MUST TRIGGER!
    actor.mana = 80;
    const afterEqual = tickAutoSpells(game);
    const actorEqual = afterEqual.encounter.partyActors[0];
    expect(actorEqual.mana).toBeGreaterThan(80);
    expect(afterEqual.session.loot[0].amount).toBe(9);

    // Case 3: Mana is at 60% (60 / 100 MP) -> BELOW threshold, MUST TRIGGER!
    actor.mana = 60;
    actor.groupCooldowns['potion'] = 0;
    const afterBelow = tickAutoSpells(game);
    const actorBelow = afterBelow.encounter.partyActors[0];
    expect(actorBelow.mana).toBeGreaterThan(60);
  });

  it('NEVER triggers disabled slots automatically, even if conditions are 100% satisfied', () => {
    const game = createIdleGame('seed-p97-disabled-slot', content, 'rat-cellars');
    const character = game.session.characters[0];
    const actor = game.encounter.partyActors[0];

    // Slot 0: Health Potion with enabled: false
    character.hotbar = [7618];
    character.maxHp = 200;
    character.hotbarConfigs = {
      0: {
        enabled: false,
        healingTarget: 'self',
        conditions: [
          { id: 'c1', target: 'self', metric: 'hp', operator: 'lte', value: 90, isPercent: true },
        ],
      },
    };

    // Actor is at 20 HP (10% HP) - dangerously low!
    actor.hp = 20;
    game.session.loot = [{ itemId: 7618, name: 'Health Potion', amount: 10 }];

    const nextState = tickAutoSpells(game);

    // Potion must NOT have been used because slot is disabled
    expect(nextState.session.loot[0].amount).toBe(10);
    const potionEvent = nextState.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 7618);
    expect(potionEvent).toBeUndefined();
  });

  it('evaluates multiple conditions per slot with logical AND combination', () => {
    const game = createIdleGame('seed-p97-multi-cond', content, 'rat-cellars');
    const character = game.session.characters[0];
    const actor = game.encounter.partyActors[0];

    // Slot 0: Health Potion (7618)
    // Condition 1: HP <= 70% AND Condition 2: Mana >= 50 (absolute)
    character.hotbar = [7618];
    character.maxHp = 200;
    character.maxMana = 100;
    character.hotbarConfigs = {
      0: {
        enabled: true,
        conditions: [
          { id: 'c1', target: 'self', metric: 'hp', operator: 'lte', value: 70, isPercent: true },
          { id: 'c2', target: 'self', metric: 'mana', operator: 'gte', value: 50, isPercent: false },
        ],
      },
    };
    game.session.loot = [{ itemId: 7618, name: 'Health Potion', amount: 10 }];

    // Subcase A: HP is 60% (passes c1), but Mana is 30 (fails c2) -> MUST NOT TRIGGER
    actor.hp = 120;
    actor.mana = 30;
    const stateA = tickAutoSpells(game);
    expect(stateA.session.loot[0].amount).toBe(10);

    // Subcase B: HP is 80% (fails c1), but Mana is 60 (passes c2) -> MUST NOT TRIGGER
    actor.hp = 160;
    actor.mana = 60;
    actor.groupCooldowns['potion'] = 0;
    const stateB = tickAutoSpells(game);
    expect(stateB.session.loot[0].amount).toBe(10);

    // Subcase C: HP is 60% (passes c1) AND Mana is 60 (passes c2) -> BOTH PASS, MUST TRIGGER!
    actor.hp = 120;
    actor.mana = 60;
    actor.groupCooldowns['potion'] = 0;
    const stateC = tickAutoSpells(game);
    expect(stateC.session.loot[0].amount).toBe(9);
    expect(stateC.encounter.partyActors[0].hp).toBeGreaterThan(120);
  });

  it('respects conditions on healing spells (e.g. Wound Cleansing at HP <= 65%)', () => {
    const game = createIdleGame('seed-p97-heal-spell', content, 'rat-cellars');
    const knight = game.session.characters[0];
    const actor = game.encounter.partyActors[0];
    knight.vocation = 'Knight';
    knight.level = 15; // Wound Cleansing requires level 10 Knight

    // Slot 0: Wound Cleansing (spellId 123)
    knight.hotbar = [123];
    knight.maxHp = 200;
    actor.mana = 100;
    knight.hotbarConfigs = {
      0: {
        enabled: true,
        healingTarget: 'self',
        conditions: [
          { id: 'c1', target: 'self', metric: 'hp', operator: 'lte', value: 65, isPercent: true },
        ],
      },
    };

    // Case 1: HP is 70% (140 / 200 HP) -> MUST NOT CAST
    actor.hp = 140;
    const stateAbove = tickAutoSpells(game);
    const healEventAbove = stateAbove.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 123);
    expect(healEventAbove).toBeUndefined();

    // Case 2: HP is 65% (130 / 200 HP) -> MUST CAST!
    actor.hp = 130;
    const stateEqual = tickAutoSpells(game);
    const healEventEqual = stateEqual.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 123) as any;
    expect(healEventEqual).toBeDefined();
    expect(healEventEqual?.healing).toBe(true);
  });

  it('respects target HP condition on offensive runes (e.g. Sudden Death at target HP <= 50%)', () => {
    const game = createIdleGame('seed-p97-rune-cond', content, 'rat-cellars');
    const sorcerer = game.session.characters[0];
    sorcerer.vocation = 'Sorcerer';
    sorcerer.level = 50;
    sorcerer.skills.magicLevel = 40;

    const actor = game.encounter.partyActors[0];

    // Slot 0: Sudden Death Rune (2268)
    sorcerer.hotbar = [2268];
    sorcerer.hotbarConfigs = {
      0: {
        enabled: true,
        conditions: [
          { id: 'c1', target: 'target', metric: 'hp', operator: 'lte', value: 50, isPercent: true },
        ],
      },
    };

    // Put enemy in range (range 4)
    game.encounter.enemies = [
      {
        id: 'enemy-rat-1',
        monsterId: 'rat',
        name: 'Rat',
        hp: 10000,
        maxHp: 10000,
        alive: true,
        position: { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z },
        attackIntervalMs: 2000,
        nextAttackAt: 0,
        speed: 100,
        nextMoveAt: 0,
      } as any,
    ];

    // Case 1: Enemy HP is 80% (8000 / 10000 HP) -> MUST NOT FIRE SD
    game.encounter.enemies[0].hp = 8000;
    const stateAbove = tickAutoSpells(game);
    const sdAbove = stateAbove.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 2268);
    expect(sdAbove).toBeUndefined();

    // Case 2: Enemy HP drops to 50% (5000 / 10000 HP) -> MUST FIRE SD!
    game.encounter.enemies[0].hp = 5000;
    actor.groupCooldowns['rune'] = 0;
    actor.groupCooldowns['attack'] = 0;
    const stateEqual = tickAutoSpells(game);
    const sdEqual = stateEqual.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 2268) as any;
    expect(sdEqual).toBeDefined();
    expect(sdEqual?.amount).toBeGreaterThan(0);
  });

  it('guarantees complete slot independence: Slot 0 conditions do not leak into Slot 1 or 2', () => {
    const game = createIdleGame('seed-p97-slot-isolation', content, 'rat-cellars');
    const char = game.session.characters[0];
    const actor = game.encounter.partyActors[0];
    char.maxHp = 200;
    char.maxMana = 100;

    // Slot 0: Health Potion (HP <= 50%)
    // Slot 1: Mana Potion (Mana <= 85%)
    char.hotbar = [7618, 7620];
    char.hotbarConfigs = {
      0: {
        enabled: true,
        conditions: [{ id: 'c0', target: 'self', metric: 'hp', operator: 'lte', value: 50, isPercent: true }],
      },
      1: {
        enabled: true,
        conditions: [{ id: 'c1', target: 'self', metric: 'mana', operator: 'lte', value: 85, isPercent: true }],
      },
    };

    game.session.loot = [
      { itemId: 7618, name: 'Health Potion', amount: 5 },
      { itemId: 7620, name: 'Mana Potion', amount: 5 },
    ];

    // HP is 70% (fails Slot 0), Mana is 80% (passes Slot 1)
    actor.hp = 140; // 70% > 50%
    actor.mana = 80; // 80% <= 85%

    const state = tickAutoSpells(game);

    // Slot 0 must NOT have triggered
    expect(state.session.loot.find((l) => l.itemId === 7618)?.amount).toBe(5);
    // Slot 1 MUST have triggered
    expect(state.session.loot.find((l) => l.itemId === 7620)?.amount).toBe(4);
  });

  it('filters out ignored monsters specified in slotConfig.ignoredMonsters', () => {
    const game = createIdleGame('seed-p97-ignored-monsters', content, 'rat-cellars');
    const char = game.session.characters[0];
    char.vocation = 'Sorcerer';
    char.level = 50;
    char.skills.magicLevel = 40;

    const actor = game.encounter.partyActors[0];

    // Slot 0: SD Rune, with ignoredMonsters: ['Rat']
    char.hotbar = [2268];
    char.hotbarConfigs = {
      0: {
        enabled: true,
        ignoredMonsters: ['Rat'],
      },
    };

    // Enemy 1 is a Rat (ignored)
    game.encounter.enemies = [
      {
        id: 'enemy-rat',
        monsterId: 'rat',
        name: 'Rat',
        hp: 10000,
        maxHp: 10000,
        alive: true,
        position: { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z },
      } as any,
    ];

    const stateWithRat = tickAutoSpells(game);
    const sdOnRat = stateWithRat.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 2268);
    expect(sdOnRat).toBeUndefined(); // Did not shoot Rat!

    // Now add a Cave Rat (not ignored)
    game.encounter.enemies.push({
      id: 'enemy-cave-rat',
      monsterId: 'cave-rat',
      name: 'Cave Rat',
      hp: 10000,
      maxHp: 10000,
      alive: true,
      position: { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z },
    } as any);

    actor.groupCooldowns['rune'] = 0;
    actor.groupCooldowns['attack'] = 0;
    const stateWithCaveRat = tickAutoSpells(game);
    const sdOnCaveRat = stateWithCaveRat.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 2268) as any;
    expect(sdOnCaveRat).toBeDefined();
    expect(sdOnCaveRat?.targetId).toBe('enemy-cave-rat');
  });

  it('supports all operators (lte, gte, lt, gt, eq) and absolute values in evaluateHotbarCondition', () => {
    const actor = { hp: 100, mana: 50, alive: true } as any;
    const character = { maxHp: 200, maxMana: 100 } as any;

    // lte (<=)
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'lte', value: 50, isPercent: true }, { actor, character })).toBe(true); // 100/200 = 50% <= 50%
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'lte', value: 45, isPercent: true }, { actor, character })).toBe(false);

    // gte (>=)
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'mana', operator: 'gte', value: 50, isPercent: true }, { actor, character })).toBe(true); // 50/100 = 50% >= 50%
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'mana', operator: 'gte', value: 55, isPercent: true }, { actor, character })).toBe(false);

    // lt (<)
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'lt', value: 50, isPercent: true }, { actor, character })).toBe(false);
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'lt', value: 55, isPercent: true }, { actor, character })).toBe(true);

    // gt (>)
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'mana', operator: 'gt', value: 50, isPercent: true }, { actor, character })).toBe(false);
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'mana', operator: 'gt', value: 45, isPercent: true }, { actor, character })).toBe(true);

    // eq (==)
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'eq', value: 50, isPercent: true }, { actor, character })).toBe(true);
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'eq', value: 60, isPercent: true }, { actor, character })).toBe(false);

    // Absolute values (isPercent: false)
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'lte', value: 100, isPercent: false }, { actor, character })).toBe(true); // 100 <= 100
    expect(evaluateHotbarCondition({ id: '1', target: 'self', metric: 'hp', operator: 'lte', value: 90, isPercent: false }, { actor, character })).toBe(false);
  });

  it('persists hotbarConfigs permanently across database serialization and deserialization', async () => {
    const mockHotbarConfigs: Record<number, HotbarSlotConfig> = {
      0: {
        enabled: true,
        healingTarget: 'self',
        conditions: [
          { id: 'c1', target: 'self', metric: 'hp', operator: 'lte', value: 75, isPercent: true },
        ],
      },
      1: {
        enabled: false,
        conditions: [
          { id: 'c2', target: 'self', metric: 'mana', operator: 'lte', value: 50, isPercent: true },
        ],
      },
    };

    let savedJson = '';
    const mockPrisma = {
      character: {
        update: async (args: any) => {
          savedJson = args.data.hotbarJson;
          return { id: 'char-p97', hotbarJson: savedJson };
        },
        findUnique: async () => ({
          id: 'char-p97',
          name: 'Aldric',
          level: 50,
          hotbarJson: savedJson,
        }),
      },
    } as any;

    const manager = new PrismaPersistenceManager(mockPrisma);

    // 1. Save character with hotbar and hotbarConfigs
    const playerState = {
      characterId: 'char-p97',
      name: 'Aldric',
      level: 50,
      hotbar: [7618, 7620],
      hotbarConfigs: mockHotbarConfigs,
    } as any;

    await manager.saveCharacter(playerState);
    expect(savedJson).toContain('"hotbarConfigs"');

    // 2. Load character back (simulating relog)
    const loaded = await manager.loadCharacter('char-p97');
    expect(loaded).toBeDefined();
    expect(loaded?.hotbar).toEqual([7618, 7620]);
    expect(loaded?.hotbarConfigs).toEqual(mockHotbarConfigs);
    expect(loaded?.hotbarConfigs[0].conditions[0].value).toBe(75);
    expect(loaded?.hotbarConfigs[1].enabled).toBe(false);
  });
});
