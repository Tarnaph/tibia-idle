import { describe, it, expect } from 'vitest';
import {
  createIdleGame,
  startGame,
  advanceCombat,
  initialHunts,
  synchronizeEncounterOccupancy,
  clonePosition,
  isMeleeRange,
  meleeDistance,
} from '../packages/domain/src';
import { deriveStats } from '../packages/domain/src/derivedStats';
import { createCharacter, vocationFor } from '../packages/domain/src/party';
import type { GameContent } from '../packages/domain/src/types';
import fs from 'node:fs';
import path from 'node:path';

function loadTestContent(): GameContent {
  const root = process.cwd();
  const monsters = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/monsters.json'), 'utf8')).monsters;
  const equipment = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/equipment.json'), 'utf8')).items;
  const vocations = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/vocations.json'), 'utf8')).vocations;
  const spells = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/spells.json'), 'utf8')).spells;
  const starterLoadouts = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/starter-loadouts.json'), 'utf8')).loadouts;
  const huntRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/hunt-regions.json'), 'utf8')).regions;
  return { monsters, equipment, vocations, spells, starterLoadouts, huntRegions, hunts: initialHunts, rateSkill: 1, rateMagic: 1 } as any;
}

describe('Phase 219: Authentic Monster Damage, Shield Defense & Creature Spells', () => {
  const content = loadTestContent();

  it('1. Verifies authentic shield defense block formula in derivedStats (not inflated)', () => {
    const knight = createCharacter('test-char-1', 'Aldric', 'Knight', content);
    knight.skills.shielding = 35;
    // Plate Shield: itemId 2510 (def 17)
    knight.equipment.leftHand = 2510;

    const stats = deriveStats(knight, content.equipment, vocationFor(content, 'Knight'));
    // Base block: Math.round((35 * (17 * 0.05)) + (17 * 0.04)) = 30
    // With Knight defenseMultiplier (1.55): Math.round(30 * 1.55) = 47 (instead of former 82+)
    expect(stats.defense).toBe(47);

    // Bare hands / no shield should have 0 defense
    knight.equipment.leftHand = null;
    knight.equipment.rightHand = null;
    const bareStats = deriveStats(knight, content.equipment, vocationFor(content, 'Knight'));
    expect(bareStats.defense).toBe(0);
  });

  it('2. Verifies monster attacks deal real damage against weak armor vs strong armor', () => {
    let gameWeak = startGame(createIdleGame('seed-dmg-test', content, 'cyclops-camp', 'legacyWaveMode'), content);
    gameWeak.encounter.room.phase = 'combat';
    gameWeak.encounter.room.phaseTicks = 0;
    const weakChar = gameWeak.session.characters[0];
    weakChar.equipment = { head: null, armor: 2467, legs: null, boots: null, leftHand: null, rightHand: null, ring: null }; // Leather Armor (armor 4)
    const weakActor = gameWeak.encounter.partyActors[0];
    weakActor.hp = 1000;

    let gameStrong = startGame(createIdleGame('seed-dmg-test', content, 'cyclops-camp', 'legacyWaveMode'), content);
    gameStrong.encounter.room.phase = 'combat';
    gameStrong.encounter.room.phaseTicks = 0;
    const strongChar = gameStrong.session.characters[0];
    strongChar.equipment = { head: 2457, armor: 2476, legs: 2477, boots: null, leftHand: null, rightHand: null, ring: null }; // Steel Helmet (6) + Knight Armor (12) + Knight Legs (8) = 26
    const strongActor = gameStrong.encounter.partyActors[0];
    strongActor.hp = 1000;

    // Coloca 1 único Cyclops adjacente em ambos
    const tileWeak = gameWeak.encounter.room.map.tiles.find(t => t.walkable && isMeleeRange(t.position, weakActor.position) && (t.position.x !== weakActor.position.x || t.position.y !== weakActor.position.y))!;
    gameWeak.encounter.enemies = [{
      id: 'cyc-test', monsterId: 'cyclops', name: 'Cyclops', hp: 260, maxHp: 260, attackMax: 105, defense: 20, armor: 20,
      alive: true, position: clonePosition(tileWeak.position), previousPosition: clonePosition(tileWeak.position), direction: 'south',
      path: [], targetId: weakActor.characterId, nextAttackAt: 0, attackIntervalMs: 2000, speed: 200, behavior: 'attack',
      nextRoamAt: 0, nextMoveAt: 0, detectionRange: 10, variant: null,
    }];
    synchronizeEncounterOccupancy(gameWeak.encounter);

    const tileStrong = gameStrong.encounter.room.map.tiles.find(t => t.walkable && isMeleeRange(t.position, strongActor.position) && (t.position.x !== strongActor.position.x || t.position.y !== strongActor.position.y))!;
    gameStrong.encounter.enemies = [{
      id: 'cyc-test', monsterId: 'cyclops', name: 'Cyclops', hp: 260, maxHp: 260, attackMax: 105, defense: 20, armor: 20,
      alive: true, position: clonePosition(tileStrong.position), previousPosition: clonePosition(tileStrong.position), direction: 'south',
      path: [], targetId: strongActor.characterId, nextAttackAt: 0, attackIntervalMs: 2000, speed: 200, behavior: 'attack',
      nextRoamAt: 0, nextMoveAt: 0, detectionRange: 10, variant: null,
    }];
    synchronizeEncounterOccupancy(gameStrong.encounter);

    // Run 6 combat ticks (3 seconds = 1 attack cycle)
    for (let i = 0; i < 6; i++) {
      gameWeak = advanceCombat(gameWeak, content, 500);
      gameStrong = advanceCombat(gameStrong, content, 500);
    }

    const weakHpLost = 1000 - gameWeak.encounter.partyActors[0].hp;
    const strongHpLost = 1000 - gameStrong.encounter.partyActors[0].hp;

    expect(weakHpLost).toBeGreaterThan(0);
    expect(weakHpLost).toBeGreaterThan(strongHpLost);
  });


  it('3. Verifies shield break mechanic: 3rd monster in the same 2-second turn breaks shield and hits armor directly', () => {
    let game = startGame(createIdleGame('seed-break-1', content, 'cyclops-camp', 'legacyWaveMode'), content);
    game.encounter.room.phase = 'combat';
    game.encounter.room.phaseTicks = 0;
    const actor = game.encounter.partyActors[0];
    const char = game.session.characters[0];
    char.skills.shielding = 60;
    char.equipment.leftHand = 2515; // Guardian Shield (def 31)
    char.equipment.armor = 2467; // Leather Armor (armor 4)
    actor.hp = 1000;


    // Find 3 valid walkable tiles adjacent to actor position
    const adjacentTiles = game.encounter.room.map.tiles.filter(
      (t) => t.walkable && isMeleeRange(t.position, actor.position) && (t.position.x !== actor.position.x || t.position.y !== actor.position.y)
    );
    expect(adjacentTiles.length).toBeGreaterThanOrEqual(3);

    // Place 3 cyclops adjacent to the actor
    game.encounter.enemies = adjacentTiles.slice(0, 3).map((tile, idx) => ({
      id: `cyc-${idx + 1}`,
      monsterId: 'cyclops',
      name: `Cyclops ${idx + 1}`,
      hp: 260,
      maxHp: 260,
      attackMax: 105,
      defense: 20,
      armor: 20,
      alive: true,
      position: clonePosition(tile.position),
      previousPosition: clonePosition(tile.position),
      direction: 'south' as const,
      path: [],
      targetId: actor.characterId,
      nextAttackAt: 0,
      attackIntervalMs: 2000,
      speed: 200,
      behavior: 'attack' as const,
      nextRoamAt: 0,
      nextMoveAt: 0,
      detectionRange: 10,
      variant: null,
    }));

    synchronizeEncounterOccupancy(game.encounter);

    game = advanceCombat(game, content, 500);

    const updatedActor = game.encounter.partyActors[0];
    // After 3 cyclops attacked, shield blocks used must have reached 2
    expect(updatedActor.shieldBlocksThisTurn).toBe(2);

    // All 3 attacks registered in events
    const enemyAttackEvents = game.encounter.events.filter((e) => e.type === 'enemy-attack');
    expect(enemyAttackEvents.length).toBe(3);
  });

  it('4. Verifies dragon casts spells (Fire Wave / Fireball) at distance with visual events and magic damage', () => {
    let game = startGame(createIdleGame('seed-dragon-1', content, 'dragon-lair', 'legacyWaveMode'), content);
    const actor = game.encounter.partyActors[0];
    actor.hp = 600;

    // Find a valid tile 2 to 4 tiles away from actor
    const rangedTiles = game.encounter.room.map.tiles.filter(
      (t) => t.walkable && meleeDistance(t.position, actor.position) >= 2 && meleeDistance(t.position, actor.position) <= 5
    );
    expect(rangedTiles.length).toBeGreaterThan(0);

    const dragonTile = rangedTiles[0];
    const dragon = {
      id: 'dragon-ranged-test',
      monsterId: 'dragon',
      name: 'Dragon',
      hp: 1000,
      maxHp: 1000,
      attackMax: 120,
      defense: 30,
      armor: 30,
      alive: true,
      position: clonePosition(dragonTile.position),
      previousPosition: clonePosition(dragonTile.position),
      direction: 'south' as const,
      path: [],
      targetId: actor.characterId,
      nextAttackAt: 999999, // Prevent melee attack
      attackIntervalMs: 2000,
      speed: 185,
      behavior: 'idle' as const,
      nextRoamAt: 999999,
      nextMoveAt: 999999,
      detectionRange: 10,
      variant: null,
    };
    game.encounter.enemies = [dragon];
    synchronizeEncounterOccupancy(game.encounter);

    let spellCastFound = false;
    for (let round = 0; round < 30; round++) {
      game = advanceCombat(game, content, 500);
      const spellEvents = game.encounter.visualEvents.filter((ev) => ev.type === 'spell-cast-visual');
      if (spellEvents.length > 0) {
        spellCastFound = true;
        break;
      }
    }

    expect(spellCastFound).toBe(true);
    // Player took spell damage at range without being in melee
    const updatedActor = game.encounter.partyActors[0];
    expect(updatedActor.hp).toBeLessThan(600);
  });

  it('5. Verifies dragon self-heals when wounded using <defense name="healing">', () => {
    let game = startGame(createIdleGame('seed-heal-1', content, 'dragon-lair', 'legacyWaveMode'), content);
    const actor = game.encounter.partyActors[0];

    // Find a walkable tile away from actor
    const farTile = game.encounter.room.map.tiles.find(
      (t) => t.walkable && meleeDistance(t.position, actor.position) >= 4
    ) ?? game.encounter.room.map.tiles.find((t) => t.walkable && t.position.x !== actor.position.x)!;

    const woundedDragon = {
      id: 'dragon-wounded',
      monsterId: 'dragon',
      name: 'Dragon',
      hp: 500,
      maxHp: 1000,
      attackMax: 120,
      defense: 30,
      armor: 30,
      alive: true,
      position: clonePosition(farTile.position),
      previousPosition: clonePosition(farTile.position),
      direction: 'south' as const,
      path: [],
      targetId: actor.characterId,
      nextAttackAt: 999999,
      attackIntervalMs: 2000,
      speed: 185,
      behavior: 'idle' as const,
      nextRoamAt: 999999,
      nextMoveAt: 999999,
      detectionRange: 10,
      variant: null,
    };
    game.encounter.enemies = [woundedDragon];
    synchronizeEncounterOccupancy(game.encounter);

    let healed = false;
    for (let round = 0; round < 30; round++) {
      game = advanceCombat(game, content, 500);
      const enemy = game.encounter.enemies.find((e) => e.id === 'dragon-wounded');
      if (enemy && enemy.hp > 500) {
        healed = true;
        break;
      }
    }

    expect(healed).toBe(true);
  });
});
