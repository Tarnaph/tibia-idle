import { describe, expect, it } from 'vitest';
import {
  getWave4Tiles,
  getDirectionalSpellTiles,
  getSpellAreaTiles,
  WAVE_4_PATTERN,
  type FacingDirection,
  triggerManualHotbarAction,
  createIdleGame,
  startGame,
  initialHunts,
  type GameContent,
} from '../packages/domain/src';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';
import type {
  EquipmentCatalog,
  HuntRegionCatalog,
  ItemEconomyCatalog,
  MonsterCatalog,
  SpellCatalog,
  StarterLoadoutCatalog,
  VocationCatalog,
} from '../packages/content-schema/src';

const content: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 83: Directional Wave Spells (Exevo Flam Hur / Fire Wave)', () => {
  it('generates exactly 17 tiles in the canonical Tibia wave pattern across 5 rows', () => {
    const totalTilesInPattern = WAVE_4_PATTERN.reduce((sum, row) => sum + (row.halfWidth * 2 + 1), 0);
    expect(totalTilesInPattern).toBe(17);

    const caster = { x: 10, y: 10, z: 7 };
    const southTiles = getWave4Tiles(caster, 'south');
    expect(southTiles.length).toBe(17);

    // Row 1: 1 tile directly in front
    expect(southTiles.filter((t) => t.y === 11).map((t) => t.x)).toEqual([10]);

    // Row 2: 3 tiles (-1, 0, +1)
    expect(southTiles.filter((t) => t.y === 12).map((t) => t.x).sort((a, b) => a - b)).toEqual([9, 10, 11]);

    // Row 3: 3 tiles (-1, 0, +1)
    expect(southTiles.filter((t) => t.y === 13).map((t) => t.x).sort((a, b) => a - b)).toEqual([9, 10, 11]);

    // Row 4: 5 tiles (-2, -1, 0, +1, +2)
    expect(southTiles.filter((t) => t.y === 14).map((t) => t.x).sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12]);

    // Row 5: 5 tiles (-2, -1, 0, +1, +2)
    expect(southTiles.filter((t) => t.y === 15).map((t) => t.x).sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12]);
  });

  it('rotates the 17-tile wave correctly in all 4 cardinal directions', () => {
    const caster = { x: 50, y: 50, z: 7 };
    const directions: FacingDirection[] = ['north', 'south', 'east', 'west'];

    for (const dir of directions) {
      const tiles = getWave4Tiles(caster, dir);
      expect(tiles.length).toBe(17);
      // All tiles share same floor z
      tiles.forEach((t) => expect(t.z).toBe(7));
    }

    // North: y goes from 49 down to 45
    const northTiles = getWave4Tiles(caster, 'north');
    expect(northTiles.some((t) => t.y === 49)).toBe(true);
    expect(northTiles.some((t) => t.y === 45)).toBe(true);
    expect(northTiles.some((t) => t.y > 50)).toBe(false);

    // East: x goes from 51 up to 55
    const eastTiles = getWave4Tiles(caster, 'east');
    expect(eastTiles.some((t) => t.x === 51)).toBe(true);
    expect(eastTiles.some((t) => t.x === 55)).toBe(true);
    expect(eastTiles.some((t) => t.x < 50)).toBe(false);

    // West: x goes from 49 down to 45
    const westTiles = getWave4Tiles(caster, 'west');
    expect(westTiles.some((t) => t.x === 49)).toBe(true);
    expect(westTiles.some((t) => t.x === 45)).toBe(true);
    expect(westTiles.some((t) => t.x > 50)).toBe(false);
  });

  it('getDirectionalSpellTiles and getSpellAreaTiles recognize Fire Wave and wave-4 area', () => {
    const caster = { x: 20, y: 20, z: 7 };
    const waveSpell = content.spells.find((s) => s.words.includes('flam hur') || s.name === 'Fire Wave')!;
    expect(waveSpell).toBeDefined();
    expect(waveSpell.area).toBe('wave-4');

    const areaTiles = getSpellAreaTiles(waveSpell, caster, 'south');
    expect(areaTiles.length).toBe(17);

    const dirTiles = getDirectionalSpellTiles(caster, 'south', 'Fire Wave');
    expect(dirTiles.length).toBe(17);
  });

  it('damages creatures within the 17-tile wave cone and leaves outside enemies undamaged without shooting a homing projectile', () => {
    const game = startGame(createIdleGame('test-seed-wave', content, 'rat-cellars'), content);
    const sorcerer = game.session.characters[0];
    sorcerer.vocation = 'Sorcerer';
    sorcerer.level = 30;
    expect(sorcerer).toBeDefined();

    // Ensure sorcerer has Fire Wave in spellbook and hotbar
    const fireWave = content.spells.find((s) => s.name === 'Fire Wave')!;
    if (!sorcerer.spells.includes(fireWave.spellId)) {
      sorcerer.spells.push(fireWave.spellId);
    }
    sorcerer.hotbar = [fireWave.spellId];
    sorcerer.maxMana = 100;

    const actor = game.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;
    actor.position = { x: 10, y: 10, z: 7 };
    actor.direction = 'south';
    actor.mana = 100;

    // Place enemy 1 inside the wave cone (Row 2, center: x: 10, y: 12)
    // Place enemy 2 inside the wave cone (Row 4, flank: x: 12, y: 14)
    // Place enemy 3 outside the wave cone (behind caster: x: 10, y: 8)
    // Place enemy 4 outside the wave cone (far lateral: x: 16, y: 12)
    game.encounter.enemies = [
      {
        id: 'enemy-inside-1',
        monsterId: 'rotworm',
        name: 'Rotworm Inside 1',
        hp: 100,
        maxHp: 100,
        attackMax: 20,
        defense: 10,
        armor: 5,
        alive: true,
        position: { x: 10, y: 12, z: 7 },
        previousPosition: { x: 10, y: 12, z: 7 },
        direction: 'north',
        path: [],
        targetId: actor.characterId,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'chase',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 10,
        variant: null,
      },
      {
        id: 'enemy-inside-2',
        monsterId: 'rotworm',
        name: 'Rotworm Inside 2',
        hp: 100,
        maxHp: 100,
        attackMax: 20,
        defense: 10,
        armor: 5,
        alive: true,
        position: { x: 12, y: 14, z: 7 },
        previousPosition: { x: 12, y: 14, z: 7 },
        direction: 'north',
        path: [],
        targetId: actor.characterId,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'chase',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 10,
        variant: null,
      },
      {
        id: 'enemy-outside-behind',
        monsterId: 'rotworm',
        name: 'Rotworm Behind',
        hp: 100,
        maxHp: 100,
        attackMax: 20,
        defense: 10,
        armor: 5,
        alive: true,
        position: { x: 10, y: 8, z: 7 },
        previousPosition: { x: 10, y: 8, z: 7 },
        direction: 'south',
        path: [],
        targetId: actor.characterId,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'chase',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 10,
        variant: null,
      },
      {
        id: 'enemy-outside-flank',
        monsterId: 'rotworm',
        name: 'Rotworm Far Flank',
        hp: 100,
        maxHp: 100,
        attackMax: 20,
        defense: 10,
        armor: 5,
        alive: true,
        position: { x: 16, y: 12, z: 7 },
        previousPosition: { x: 16, y: 12, z: 7 },
        direction: 'west',
        path: [],
        targetId: actor.characterId,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'chase',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 10,
        variant: null,
      },
    ];

    game.encounter.events = [];
    const castOk = triggerManualHotbarAction(game, sorcerer.id, fireWave.spellId, content);
    expect(castOk).toBe(true);

    // Mana deducted
    expect(actor.mana).toBe(100 - fireWave.mana);

    // Verify enemies inside cone took damage, outside enemies did NOT
    const eInside1 = game.encounter.enemies.find((e) => e.id === 'enemy-inside-1')!;
    const eInside2 = game.encounter.enemies.find((e) => e.id === 'enemy-inside-2')!;
    const eOutsideBehind = game.encounter.enemies.find((e) => e.id === 'enemy-outside-behind')!;
    const eOutsideFlank = game.encounter.enemies.find((e) => e.id === 'enemy-outside-flank')!;

    expect(eInside1.hp).toBeLessThan(100);
    expect(eInside2.hp).toBeLessThan(100);
    expect(eOutsideBehind.hp).toBe(100);
    expect(eOutsideFlank.hp).toBe(100);

    // Verify spell-visual events: 17 tiles generated, all with projectileId: null
    const visualEvents = game.encounter.events.filter((e) => e.type === 'spell-visual');
    expect(visualEvents.length).toBe(17);
    for (const v of visualEvents) {
      if (v.type === 'spell-visual') {
        expect(v.projectileId).toBeNull();
        expect(v.targetPosition).toBeDefined();
        expect(v.effectId).toBe(16); // CONST_ME_HITBYFIRE
      }
    }
  });
});
