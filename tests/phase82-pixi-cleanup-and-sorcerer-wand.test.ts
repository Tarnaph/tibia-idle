import { describe, it, expect } from 'vitest';
import { advanceCombat, advanceTraining, createIdleGame, addPartyMember, restartHunt, positionKey, synchronizePartyWithEncounter, synchronizeEncounterOccupancy } from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 82 - Pixi Cleanup Safety & Sorcerer Wand Visuals', () => {
  it('emits canonical energy projectile (5) and effect (12) for Wand of Vortex in combat', () => {
    let game = createIdleGame('wand-combat-82', content);
    game = synchronizePartyWithEncounter(addPartyMember(game, 'MageTester', 'Sorcerer', content), content);
    game = restartHunt(game, 'wand-combat-82', content);

    const sorcerer = game.encounter.partyActors.find((actor) => actor.characterId.includes('sorcerer'))!;
    const target = game.encounter.enemies[0];

    // Position monster 2 tiles away from sorcerer (ranged wand attack)
    const rangedTile = game.encounter.room.map.tiles.find(
      (tile) =>
        tile.walkable &&
        Math.abs(tile.position.x - sorcerer.position.x) + Math.abs(tile.position.y - sorcerer.position.y) === 2 &&
        !game.encounter.partyActors.some((actor) => positionKey(actor.position) === positionKey(tile.position))
    )!;

    target.position = { ...rangedTile.position };
    target.previousPosition = { ...rangedTile.position };
    synchronizeEncounterOccupancy(game.encounter);

    // Advance combat to start attack
    game = advanceCombat(game, content, 120);
    const projectileEvent = game.encounter.visualEvents.find((e) => e.type === 'projectile-launched');
    expect(projectileEvent).toBeDefined();
    // Wand of Vortex uses canonical CONST_ANI_ENERGY (5)
    expect((projectileEvent as any).projectileId).toBe(5);

    // Advance combat to impact
    game = advanceCombat(game, content, 2000);
    const hitEvent = game.encounter.visualEvents.find((e) => e.type === 'projectile-hit');
    expect(hitEvent).toBeDefined();
    // Wand of Vortex impact effect is CONST_ME_ENERGYHIT (12)
    expect((hitEvent as any).effectId).toBe(12);
  });

  it('emits projectileId: 5 and effectId in training-action for wand training', () => {
    let game = createIdleGame('wand-train-82', content);
    game = addPartyMember(game, 'MageTester', 'Sorcerer', content);

    const next = advanceTraining(game, content, 20_000);
    const trainingEvent = next.encounter.visualEvents.find(
      (e) => e.type === 'training-action' && e.style === 'magic'
    );
    expect(trainingEvent).toBeDefined();
    expect((trainingEvent as any).projectileId).toBe(5);
    expect([12, 13]).toContain((trainingEvent as any).effectId);
  });

  it('safely handles PixiJS TexturePool.returnTexture with missing or uninitialized bucket', async () => {
    const { TexturePool } = await import('pixi.js');
    await import('../apps/web/lib/pixiPolyfill');

    // Simulate texture return
    const dummyTexture = { uid: 999999 } as any;

    expect(() => {
      TexturePool.returnTexture(dummyTexture);
    }).not.toThrow();
  });
});
