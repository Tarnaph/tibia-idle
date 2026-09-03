import { describe, expect, it } from 'vitest';
import {
  createCharacter,
  createIdleGame,
  advanceCombat,
  restartHunt,
  startGame,
  synchronizeEncounterOccupancy,
  findMeleeApproachTiles,
  findHotbarAction,
  triggerManualHotbarAction,
  type GameContent,
  type GameState,
} from '../packages/domain/src';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { content } from './fixture';

describe('Phase 21: Hotkeys, Potions, Spells & Animations System', () => {

  it('initializes new characters with an empty hotbar by default', () => {
    const knight = createCharacter('c-1', 'Aldric', 'Knight', content);
    expect(knight.hotbar).toEqual([]);

    const sorcerer = createCharacter('c-2', 'Mira', 'Sorcerer', content);
    expect(sorcerer.hotbar).toEqual([]);
  });

  it('triggers health potion auto-cast reactively when taking damage or HP drops', () => {
    let state = createIdleGame('test-potion-heal', content);
    state = restartHunt(state, 'test-potion-heal', content, 'rat-cellars');

    const character = state.session.characters[0];
    character.level = 50;
    // Put Health Potion (id: 7618) in hotbar
    character.hotbar = [7618];
    const actor = state.encounter.partyActors[0];

    // Simulate taking damage
    actor.hp = 50;
    actor.lastHitTakenAt = state.encounter.elapsedMs;

    // Advance combat by 120ms
    state = advanceCombat(state, content, 120);

    // Verify health potion was consumed and healed the actor
    const actorAfter = state.encounter.partyActors[0];
    expect(actorAfter.hp).toBeGreaterThan(50);
    expect(actorAfter.groupCooldowns['potion']).toBeGreaterThan(state.encounter.elapsedMs);
    expect(state.encounter.events.some((e) => e.type === 'spell-cast' && e.spellId === 7618)).toBe(true);
  });

  it('triggers mana potion auto-cast when mana drops below 70%', () => {
    let state = createIdleGame('test-mana-potion', content);
    state = restartHunt(state, 'test-mana-potion', content, 'rat-cellars');

    const character = state.session.characters[0];
    character.level = 50;
    character.maxMana = 200;
    character.currentMana = 40;
    // Put Mana Potion (id: 7620) in hotbar
    character.hotbar = [7620];
    const actor = state.encounter.partyActors[0];
    actor.mana = 40;

    state = advanceCombat(state, content, 120);

    const actorAfter = state.encounter.partyActors[0];
    expect(actorAfter.mana).toBeGreaterThan(40);
    expect(actorAfter.groupCooldowns['potion']).toBeGreaterThan(state.encounter.elapsedMs);
  });

  it('recasts Haste continuously when buff expires', () => {
    let state = createIdleGame('test-haste-recast', content);
    state = restartHunt(state, 'test-haste-recast', content, 'rat-cellars');

    const character = state.session.characters[0];
    character.level = 50;
    // Haste spell id: 6
    character.spells = [6];
    character.hotbar = [6];
    character.maxMana = 500;
    character.currentMana = 500;
    const actor = state.encounter.partyActors[0];
    actor.mana = 500;
    actor.hasteUntil = 0;

    // Casts Haste on first combat advance
    state = advanceCombat(state, content, 120);

    const actorAfter = state.encounter.partyActors[0];
    expect(actorAfter.hasteUntil).toBeGreaterThan(state.encounter.elapsedMs);
    expect(state.encounter.events.some((e) => e.type === 'spell-cast' && e.spellId === 6)).toBe(true);
  });

  it('recasts Magic Shield (Utamo Vita) and absorbs damage into mana first', () => {
    let state = startGame(createIdleGame('test-magic-shield', content), content);

    const character = state.session.characters[0];
    character.level = 50;
    character.vocation = 'Sorcerer';
    // Magic Shield spell id: 44
    character.spells = [44];
    character.hotbar = [44];
    character.maxMana = 500;
    character.currentMana = 500;
    const actor = state.encounter.partyActors[0];
    actor.mana = 500;
    actor.magicShieldUntil = 0;

    // Position actor next to enemy
    const enemy = state.encounter.enemies[0];
    const approach = findMeleeApproachTiles(state.encounter.room.map, enemy.position, new Set(state.encounter.room.occupancy.keys()));
    if (approach.length > 0) {
      actor.position = { ...approach[0] };
      actor.previousPosition = { ...approach[0] };
      actor.targetId = enemy.id;
      enemy.targetId = actor.characterId;
      enemy.hp = 5000;
      enemy.maxHp = 5000;
      enemy.attackMax = 120;
      enemy.nextAttackAt = 0;
      synchronizeEncounterOccupancy(state.encounter);
    }

    // First advance casts Utamo Vita
    state = advanceCombat(state, content, 120);
    expect(state.encounter.partyActors[0].magicShieldUntil).toBeGreaterThan(state.encounter.elapsedMs);

    const hpBefore = state.encounter.partyActors[0].hp;
    const manaAfterCast = state.encounter.partyActors[0].mana;

    // Advance until enemy attacks and player absorbs damage into mana
    let tookEnemyHit = false;
    for (let tick = 0; tick < 20; tick++) {
      state = advanceCombat(state, content, 120);
      if (state.encounter.events.some((e) => e.type === 'enemy-attack' && e.damage > 0)) {
        tookEnemyHit = true;
        break;
      }
    }

    expect(tookEnemyHit).toBe(true);
    // Damage was absorbed by mana instead of HP
    const actorHit = state.encounter.partyActors[0];
    expect(actorHit.mana).toBeLessThan(manaAfterCast);
    expect(actorHit.hp).toBe(hpBefore);
  });

  it('auto-casts attack spells and runes against enemies in range', () => {
    let state = startGame(createIdleGame('test-attack-spells', content), content);

    const character = state.session.characters[0];
    character.level = 50;
    character.vocation = 'Knight';
    // Berserk spell id: 80 (exori)
    character.spells = [80];
    character.hotbar = [80];
    character.maxMana = 300;
    character.currentMana = 300;
    const actor = state.encounter.partyActors[0];
    actor.mana = 300;

    // Position actor next to enemy
    const enemy = state.encounter.enemies[0];
    const approach = findMeleeApproachTiles(state.encounter.room.map, enemy.position, new Set(state.encounter.room.occupancy.keys()));
    if (approach.length > 0) {
      actor.position = { ...approach[0] };
      actor.previousPosition = { ...approach[0] };
      actor.targetId = enemy.id;
      synchronizeEncounterOccupancy(state.encounter);
    }

    let castBerserk = false;
    // Advance combat until Berserk triggers
    for (let tick = 0; tick < 10; tick++) {
      state = advanceCombat(state, content, 120);
      if (state.encounter.events.some((e) => e.type === 'spell-cast' && e.spellId === 80)) {
        castBerserk = true;
        break;
      }
    }

    // Berserk was executed
    expect(castBerserk).toBe(true);
  });

  it('allows manual triggering of hotbar actions via triggerManualHotbarAction', () => {
    let state = createIdleGame('test-manual-trigger', content);
    state = restartHunt(state, 'test-manual-trigger', content, 'rat-cellars');

    const character = state.session.characters[0];
    character.level = 50;
    const actor = state.encounter.partyActors[0];
    actor.hp = 80;

    // Trigger Health Potion manually
    const used = triggerManualHotbarAction(state, character.id, 7618, content);
    expect(used).toBe(true);
    expect(actor.hp).toBeGreaterThan(80);
    expect(state.encounter.events.some((e) => e.type === 'spell-cast' && e.spellId === 7618)).toBe(true);
  });

  it('verifies that all 70 magic effects and all 42 missiles are extracted in assets manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'content', 'generated', 'tibia860-assets.json'), 'utf8'));
    expect(Object.keys(manifest.effects).length).toBe(70);
    expect(Object.keys(manifest.missiles).length).toBe(42);

    // Verify key effects exist
    expect(manifest.effects['1']).toBeDefined(); // Red sparkle
    expect(manifest.effects['13']).toBeDefined(); // Blue sparkle
    expect(manifest.effects['70']).toBeDefined(); // Highest effect

    // Verify key missiles exist
    expect(manifest.missiles['1']).toBeDefined(); // Spear
    expect(manifest.missiles['42']).toBeDefined(); // Highest projectile
  });
});
