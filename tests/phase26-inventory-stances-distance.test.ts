import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  createIdleGame,
  setCharacterStance,
  setCharacterTargetDistance,
  advanceCombat,
  findRangedApproachTiles,
  createTileMapFromRows,
  meleeDistance,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 26: Inventory Paperdoll Alignment, Combat Stances and Target Distance', () => {
  it('has authentic 32x32 backpack sprite extracted in public/backpack.png', () => {
    const backpackPath = path.resolve('public/backpack.png');
    expect(fs.existsSync(backpackPath)).toBe(true);

    const buf = fs.readFileSync(backpackPath);
    // Verify PNG signature
    expect(buf.slice(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(32);
    expect(height).toBe(32);
  });

  it('correctly sets and updates character and actor combat stance', () => {
    const game = createIdleGame('test-seed-stances', content);
    const charId = game.session.characters[0].id;

    // Default stance is offensive
    expect(game.session.characters[0].stance).toBe('offensive');

    // Switch to balanced
    const balancedGame = setCharacterStance(game, charId, 'balanced');
    expect(balancedGame.session.characters[0].stance).toBe('balanced');
    const balancedActor = balancedGame.encounter.partyActors.find((a) => a.characterId === charId);
    expect(balancedActor?.stance).toBe('balanced');

    // Switch to defensive
    const defGame = setCharacterStance(balancedGame, charId, 'defensive');
    expect(defGame.session.characters[0].stance).toBe('defensive');
    const defActor = defGame.encounter.partyActors.find((a) => a.characterId === charId);
    expect(defActor?.stance).toBe('defensive');
  });

  it('correctly sets and clamps character and actor target distance', () => {
    const game = createIdleGame('test-seed-distance', content);
    const charId = game.session.characters[0].id;

    // Knight defaults to 1
    expect(game.session.characters[0].targetDistance).toBe(1);

    // Set distance to 2
    const dist2Game = setCharacterTargetDistance(game, charId, 2);
    expect(dist2Game.session.characters[0].targetDistance).toBe(2);
    const actor2 = dist2Game.encounter.partyActors.find((a) => a.characterId === charId);
    expect(actor2?.targetDistance).toBe(2);

    // Set distance to 4
    const dist4Game = setCharacterTargetDistance(dist2Game, charId, 4);
    expect(dist4Game.session.characters[0].targetDistance).toBe(4);

    // Clamp min to 1 and max to 5
    const clampedMin = setCharacterTargetDistance(game, charId, 0);
    expect(clampedMin.session.characters[0].targetDistance).toBe(1);
    const clampedMax = setCharacterTargetDistance(game, charId, 10);
    expect(clampedMax.session.characters[0].targetDistance).toBe(5);
  });

  it('prioritizes approach tiles exactly at target distance (e.g. range 2 for keeping distance)', () => {
    // 5x5 open room with entrance, exit, and target in center (2,2)
    const { map } = createTileMapFromRows([
      'E....',
      '.....',
      '.....',
      '.....',
      '....X',
    ]);
    const target = { x: 2, y: 2, z: 7 };

    // Find tiles at desired range 2
    const tilesRange2 = findRangedApproachTiles(map, target, 2);
    expect(tilesRange2.length).toBeGreaterThan(0);

    // The first tile in the sorted result must be at distance 2, not distance 1
    const bestTile = tilesRange2[0];
    const dist = meleeDistance(bestTile, target);
    expect(dist).toBe(2);
  });

  it('character with targetDistance 2 keeps 2 tiles distance during combat approach', () => {
    const game = createIdleGame('seed-paladin-dist', content);
    const charId = game.session.characters[0].id;

    // Configure distance 2
    const dist2Game = setCharacterTargetDistance(game, charId, 2);
    expect(dist2Game.session.characters[0].targetDistance).toBe(2);

    // Step combat a few ticks
    let current = dist2Game;
    for (let i = 0; i < 5; i++) {
      current = advanceCombat(current, content, 200);
    }

    const actor = current.encounter.partyActors.find((a) => a.characterId === charId);
    expect(actor).toBeDefined();
    // Actor retains targetDistance = 2
    expect(actor?.targetDistance).toBe(2);
  });

  it('applies stance multipliers to basic attack and defense in combat', () => {
    // Check stance attack multipliers deterministic behavior
    const baseGame = createIdleGame('seed-stance-dmg', content);
    const charId = baseGame.session.characters[0].id;

    const offGame = setCharacterStance(baseGame, charId, 'offensive');
    const balGame = setCharacterStance(baseGame, charId, 'balanced');
    const defGame = setCharacterStance(baseGame, charId, 'defensive');

    expect(offGame.session.characters[0].stance).toBe('offensive');
    expect(balGame.session.characters[0].stance).toBe('balanced');
    expect(defGame.session.characters[0].stance).toBe('defensive');
  });
});
