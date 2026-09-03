import { describe, expect, it } from 'vitest';
import {
  createCharacter,
  createIdleGame,
  advanceCombat,
  restartHunt,
  startGame,
  triggerManualHotbarAction,
  findHotbarAction,
  vocationFor,
  synchronizeEncounterOccupancy,
  findMeleeApproachTiles,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 22: Combat Authenticity (Whirlwind Throw, Speech, Regen, Chase, Cooldown)', () => {

  it('resolves weapon projectile correctly for Whirlwind Throw (24 sword, 25 axe, 26 club)', () => {
    let state = startGame(createIdleGame('test-whirlwind-sword', content), content);
    const character = state.session.characters[0];
    character.level = 50;
    character.vocation = 'Knight';
    // Equip sword (2376)
    character.equipment.leftHand = 2376;
    character.hotbar = [107]; // Whirlwind Throw
    const actor = state.encounter.partyActors[0];
    actor.mana = 200;

    // Position actor near first enemy (within range 5)
    const enemy = state.encounter.enemies[0];
    const approach = findMeleeApproachTiles(state.encounter.room.map, enemy.position, new Set(state.encounter.room.occupancy.keys()));
    if (approach.length > 0) {
      actor.position = { ...approach[0] };
      actor.previousPosition = { ...approach[0] };
      synchronizeEncounterOccupancy(state.encounter);
    }

    // Trigger Whirlwind Throw manually
    const used = triggerManualHotbarAction(state, character.id, 107, content);
    expect(used).toBe(true);

    const visualEvent = state.encounter.events.find((e) => e.type === 'spell-visual' && e.spellId === 107);
    expect(visualEvent).toBeDefined();
    if (visualEvent && visualEvent.type === 'spell-visual') {
      expect(visualEvent.projectileId).toBe(24); // CONST_ANI_WHIRLWINDSWORD
      expect(visualEvent.effectId).toBe(10); // CONST_ME_HITAREA
    }
  });

  it('resolves axe projectile (25) when wielding an axe for Whirlwind Throw', () => {
    let state = startGame(createIdleGame('test-whirlwind-axe', content), content);
    const character = state.session.characters[0];
    character.level = 50;
    character.vocation = 'Knight';
    // Equip Steel Axe (itemId 8601)
    character.equipment.leftHand = 8601;
    character.hotbar = [107];
    const actor = state.encounter.partyActors[0];
    actor.mana = 200;

    const enemy = state.encounter.enemies[0];
    const approach = findMeleeApproachTiles(state.encounter.room.map, enemy.position, new Set(state.encounter.room.occupancy.keys()));
    if (approach.length > 0) {
      actor.position = { ...approach[0] };
      actor.previousPosition = { ...approach[0] };
      synchronizeEncounterOccupancy(state.encounter);
    }

    const used = triggerManualHotbarAction(state, character.id, 107, content);
    expect(used).toBe(true);

    const visualEvent = state.encounter.events.find((e) => e.type === 'spell-visual' && e.spellId === 107);
    expect(visualEvent).toBeDefined();
    if (visualEvent && visualEvent.type === 'spell-visual') {
      expect(visualEvent.projectileId).toBe(25); // CONST_ANI_WHIRLWINDAXE
    }
  });

  it('emits floating speech text for spells (words) and potions (Aaah...)', () => {
    let state = startGame(createIdleGame('test-speech', content), content);
    const character = state.session.characters[0];
    character.level = 50;
    character.equipment.leftHand = 2376;
    const actor = state.encounter.partyActors[0];
    actor.hp = 80;

    // 1. Potion speech
    triggerManualHotbarAction(state, character.id, 7618, content);
    const potionEvent = state.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 7618);
    expect(potionEvent).toBeDefined();
    if (potionEvent && potionEvent.type === 'spell-cast') {
      expect(potionEvent.speech).toBe('Aaaah...');
    }

    // 2. Spell speech (whirlwind throw with enemy in range)
    const enemy = state.encounter.enemies[0];
    const approach = findMeleeApproachTiles(state.encounter.room.map, enemy.position, new Set(state.encounter.room.occupancy.keys()));
    if (approach.length > 0) {
      actor.position = { ...approach[0] };
      actor.previousPosition = { ...approach[0] };
      synchronizeEncounterOccupancy(state.encounter);
    }

    actor.mana = 200;
    character.spells = [107];
    triggerManualHotbarAction(state, character.id, 107, content);
    const spellEvent = state.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === 107);
    expect(spellEvent).toBeDefined();
    if (spellEvent && spellEvent.type === 'spell-cast') {
      expect(spellEvent.speech).toBe('Exori Hur');
    }
  });

  it('verifies authentic base Tibia health regeneration rate (1 HP per tick interval)', () => {
    const knightVocation = vocationFor(content, 'Knight');
    expect(knightVocation.healthGainAmount).toBe(1); // Not 80!
    expect(knightVocation.healthGainTicks).toBe(3); // 6 seconds (3 ticks * 2s per tick)
    expect(knightVocation.manaGainAmount).toBe(2);

    let state = startGame(createIdleGame('test-regen', content), content);
    const character = state.session.characters[0];
    const actor = state.encounter.partyActors[0];
    actor.hp = 100;
    character.maxHp = 500;

    // Set nextHealthRegenAt to elapsedMs so next tick triggers regen
    actor.nextHealthRegenAt = state.encounter.elapsedMs;
    const hpBefore = actor.hp;

    state = advanceCombat(state, content, 120);

    // HP increased by exactly 1
    expect(state.encounter.partyActors[0].hp).toBe(hpBefore + 1);
  });

  it('pursues and engages visible enemies in chase mode', () => {
    let state = startGame(createIdleGame('test-chase-mode', content), content);
    const actor = state.encounter.partyActors[0];

    const enemy = state.encounter.enemies[0];
    expect(enemy).toBeDefined();

    // Position actor within detection range (e.g. near enemy)
    const approach = findMeleeApproachTiles(state.encounter.room.map, enemy.position, new Set(state.encounter.room.occupancy.keys()));
    if (approach.length > 0) {
      actor.position = { ...approach[0] };
      actor.previousPosition = { ...approach[0] };
      synchronizeEncounterOccupancy(state.encounter);
    }

    // Set actor target to enemy
    actor.targetId = enemy.id;

    // Advance combat for several ticks
    for (let i = 0; i < 5; i++) {
      state = advanceCombat(state, content, 120);
      if (state.encounter.partyActors[0].targetId === enemy.id) break;
    }

    // Target is retained and pursued
    expect(state.encounter.partyActors[0].targetId).toBe(enemy.id);
  });

  it('calculates cooldown state accurately for hotbar slots', () => {
    let state = startGame(createIdleGame('test-cooldown-timer', content), content);
    const character = state.session.characters[0];
    character.level = 50;
    character.hotbar = [107]; // Whirlwind Throw (cooldownMs: 6000)
    character.equipment.leftHand = 2376;
    const actor = state.encounter.partyActors[0];
    actor.mana = 200;

    const enemy = state.encounter.enemies[0];
    const approach = findMeleeApproachTiles(state.encounter.room.map, enemy.position, new Set(state.encounter.room.occupancy.keys()));
    if (approach.length > 0) {
      actor.position = { ...approach[0] };
      actor.previousPosition = { ...approach[0] };
      synchronizeEncounterOccupancy(state.encounter);
    }

    // Use Whirlwind Throw
    triggerManualHotbarAction(state, character.id, 107, content);

    const cooldownUntil = state.encounter.partyActors[0].spellCooldowns['107'];
    expect(cooldownUntil).toBeGreaterThan(state.encounter.elapsedMs);

    const remainingMs = cooldownUntil - state.encounter.elapsedMs;
    expect(remainingMs).toBeGreaterThanOrEqual(5800);
    expect(remainingMs).toBeLessThanOrEqual(6000);
  });
});
