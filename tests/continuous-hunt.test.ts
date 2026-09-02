import { describe, expect, it } from 'vitest';
import {
  addPartyMember, advanceCombat, advanceTraining, createIdleGame, findPath, leaveHunt, positionKey,
  restartHunt, sellAllLoot, startGame, synchronizeEncounterOccupancy, synchronizePartyWithEncounter,
} from '../packages/domain/src';
import { desiredWorldCamera, worldToViewport } from '../packages/presentation/src';
import { content } from './fixture';

describe('continuous hunt route', () => {
  it('imports a larger coherent Rotworm region with ground on every walkable tile', () => {
    const region = content.huntRegions.find((candidate) => candidate.huntId === 'rotworm-cave')!;
    expect(region.bounds).toMatchObject({ width: 48, height: 32 }); expect(region.spawnPositions.length).toBeGreaterThanOrEqual(20);
    expect(region.tiles.filter((tile) => tile.walkable && tile.serverItemIds.length === 0)).toHaveLength(0);
  });
  it('pre-populates six reachable respawns before the party approaches', () => {
    const game = restartHunt(createIdleGame('pre-populated', content, 'rotworm-cave'), 'pre-populated', content, 'rotworm-cave');
    expect(game.encounter.huntRoute?.respawnZones).toHaveLength(6);
    expect(game.encounter.continuousProgress?.zones.every((zone) => zone.activeEnemyIds.length > 0)).toBe(true);
    expect(game.encounter.enemies.length).toBeGreaterThanOrEqual(6);
    for (const zone of game.encounter.huntRoute!.respawnZones) expect(findPath(game.encounter.room.map, game.encounter.room.entrance, [zone.center], new Set()).length).toBeGreaterThan(0);
    for (const enemy of game.encounter.enemies) expect(game.encounter.room.map.tiles[enemy.position.y * game.encounter.room.map.width + enemy.position.x]?.walkable).toBe(true);
  });

  it('does not duplicate populated zones and uses deterministic rare rolls', () => {
    const first = restartHunt(createIdleGame('rare-repeat', content), 'rare-repeat', content);
    const second = restartHunt(createIdleGame('rare-repeat', content), 'rare-repeat', content);
    const ids = first.encounter.enemies.map((enemy) => enemy.id);
    expect(advanceCombat(first, content, 120).encounter.enemies.map((enemy) => enemy.id)).toEqual(ids);
    expect(second.encounter.enemies.map((enemy) => ({ id: enemy.id, rare: enemy.variant?.visualModifier })))
      .toEqual(first.encounter.enemies.map((enemy) => ({ id: enemy.id, rare: enemy.variant?.visualModifier })));
    const rare = first.encounter.enemies.find((enemy) => enemy.variant);
    if (rare) expect(rare.variant).toMatchObject({ hpMultiplier: 2, damageMultiplier: 1.25, defenseMultiplier: 1.15, xpMultiplier: 2, lootMultiplier: 1.5, visualModifier: 'rare-aura' });
  });

  it('clears, waits for cooldown and blocks unsafe respawn near the party', () => {
    let game = restartHunt(createIdleGame('safe-respawn', content), 'safe-respawn', content);
    const zone = game.encounter.huntRoute!.respawnZones[0];
    for (const enemy of game.encounter.enemies.filter((candidate) => candidate.respawnZoneId === zone.id)) enemy.alive = false;
    synchronizeEncounterOccupancy(game.encounter);
    game = advanceCombat(game, content, 120);
    const cleared = game.encounter.continuousProgress!.zones[0]; expect(cleared.lastClearedAt).not.toBeNull();
    game.encounter.elapsedMs = cleared.nextRespawnAt; const actor = game.encounter.partyActors[0]; actor.position = { ...zone.center }; actor.previousPosition = { ...zone.center };
    synchronizeEncounterOccupancy(game.encounter);
    game = advanceCombat(game, content, 120); expect(game.encounter.continuousProgress!.zones[0].activeEnemyIds).toHaveLength(0);
    const farthest = game.encounter.room.map.tiles.filter((tile) => tile.walkable).sort((a, b) => Math.abs(b.position.x - zone.center.x) + Math.abs(b.position.y - zone.center.y) - Math.abs(a.position.x - zone.center.x) - Math.abs(a.position.y - zone.center.y))[0];
    const movedActor = game.encounter.partyActors[0]; movedActor.position = { ...farthest.position }; movedActor.previousPosition = { ...farthest.position };
    synchronizeEncounterOccupancy(game.encounter);
    game = advanceCombat(game, content, 120); expect(game.encounter.continuousProgress!.zones[0].activeEnemyIds.length).toBeGreaterThan(0);
  });

  it('contains no wave/boss dependency in the normal route and can exit without losing session progress', () => {
    const game = startGame(createIdleGame('leave-continuous', content), content); game.session.characters[0].experience = 321; game.session.trainingElapsedMs = 9000;
    expect(game.encounter.mode).toBe('continuous'); expect(game.encounter.huntRoute?.rareSpawnRules.probability).toBe(0.04);
    const left = leaveHunt(game); expect(left.encounter.status).toBe('completed'); expect(left.session.characters[0].experience).toBe(321); expect(left.session.trainingElapsedMs).toBe(9000);
  });
});

describe('continuous regressions and visuals', () => {
  it('removes only sellable loot and cannot sell the same stacks twice', () => {
    const game = createIdleGame('sell-once', content); const sellable = content.economy.items.find((item) => item.offers.length > 0)!;
    game.session.loot = [{ itemId: sellable.itemId, name: 'sellable item', amount: 2 }, { itemId: 999999, name: 'unknown relic', amount: 1 }];
    const first = sellAllLoot(game, content); const second = sellAllLoot(first.state, content);
    expect(first.goldEarned).toBeGreaterThan(0); expect(first.state.session.loot).toEqual([{ itemId: 999999, name: 'unknown relic', amount: 1 }]);
    expect(second.goldEarned).toBe(0); expect(second.state.session.gold).toBe(first.state.session.gold);
  });

  it('emits melee, distance and magic training visual events without changing deterministic progression rules', () => {
    let game = createIdleGame('training-visuals', content); game = addPartyMember(game, 'Lyra', 'Paladin', content); game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const next = advanceTraining(game, content, 20_000);
    expect(next.encounter.visualEvents.some((event) => event.type === 'training-action' && event.style === 'melee')).toBe(true);
    expect(next.encounter.visualEvents.some((event) => event.type === 'training-action' && event.style === 'distance' && event.projectileId === 28)).toBe(true);
    expect(next.encounter.visualEvents.some((event) => event.type === 'training-action' && event.style === 'magic' && event.effectId === 13)).toBe(true);
  });

  it('emits authoritative melee and projectile events from combat actions', () => {
    let melee = restartHunt(createIdleGame('melee-visual', content), 'melee-visual', content); const knight = melee.encounter.partyActors[0]; const rat = melee.encounter.enemies[0];
    const meleeTile = melee.encounter.room.map.tiles.find((tile) => tile.walkable && Math.abs(tile.position.x - knight.position.x) + Math.abs(tile.position.y - knight.position.y) === 1)!;
    rat.position = { ...meleeTile.position }; rat.previousPosition = { ...meleeTile.position };
    melee = advanceCombat(melee, content, 120); expect(melee.encounter.visualEvents).toContainEqual(expect.objectContaining({ type: 'basic-attack-started', sourceId: knight.characterId, ranged: false }));
    melee = advanceCombat(melee, content, 240); expect(melee.encounter.visualEvents).toContainEqual(expect.objectContaining({ type: 'melee-hit', sourceId: knight.characterId, effectId: 10 }));

    let ranged = createIdleGame('distance-visual', content); ranged = synchronizePartyWithEncounter(addPartyMember(ranged, 'Lyra', 'Paladin', content), content); ranged = restartHunt(ranged, 'distance-visual', content);
    const paladin = ranged.encounter.partyActors.find((actor) => actor.characterId.includes('paladin'))!; const target = ranged.encounter.enemies[0];
    const distanceTile = ranged.encounter.room.map.tiles.find((tile) => tile.walkable && Math.abs(tile.position.x - paladin.position.x) + Math.abs(tile.position.y - paladin.position.y) === 2 && !ranged.encounter.partyActors.some((actor) => positionKey(actor.position) === positionKey(tile.position)))!;
    target.position = { ...distanceTile.position }; target.previousPosition = { ...distanceTile.position };
    ranged = advanceCombat(ranged, content, 120); expect(ranged.encounter.visualEvents).toContainEqual(expect.objectContaining({ type: 'projectile-launched', sourceId: paladin.characterId, projectileId: 28 }));
  });

  it('keeps fixed zoom and framing stable across resize', () => {
    const base = { worldWidth: 1536, worldHeight: 1024, targetX: 700, targetY: 500, fixedZoom: 2 };
    const small = desiredWorldCamera({ ...base, viewportWidth: 800, viewportHeight: 600 }); const large = desiredWorldCamera({ ...base, viewportWidth: 1200, viewportHeight: 800 });
    expect(small).toEqual(large); expect(small.zoom).toBe(2);
    expect(worldToViewport({ x: 700, y: 500 }, small, { width: 800, height: 600 })).toEqual({ x: 400, y: 300 });
  });

  it('keeps all pre-populated creatures on unique world tiles', () => {
    const game = restartHunt(createIdleGame('spawn-occupancy', content, 'rotworm-cave'), 'spawn-occupancy', content, 'rotworm-cave');
    const keys = [...game.encounter.partyActors.filter((actor) => actor.alive).map((actor) => positionKey(actor.position)), ...game.encounter.enemies.filter((enemy) => enemy.alive).map((enemy) => positionKey(enemy.position))];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
