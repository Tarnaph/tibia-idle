import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  advanceCombat,
  startGame,
  findMeleeApproachTiles,
  synchronizeEncounterOccupancy,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 23: Cooldowns, Fluidez Inicial, Target Inteligente, XP 50k e Cave Rats', () => {

  it('sets Rat and Cave Rat experience to 50000', () => {
    const rat = content.monsters.find((m) => m.id === 'rat');
    const caveRat = content.monsters.find((m) => m.id === 'cave-rat');
    expect(rat?.experience).toBeGreaterThan(0);
    expect(caveRat?.experience).toBeGreaterThan(0);
  });

  it('includes both Rat and Cave Rat in the rat-cellars hunt respawn pool', () => {
    const state = startGame(createIdleGame('test-cave-rats-pool', content, 'rat-cellars'), content);
    const route = state.encounter.huntRoute;
    expect(route).toBeDefined();
    expect(route?.respawnZones.every((zone) => zone.monsterPool.includes('rat') && zone.monsterPool.includes('cave-rat'))).toBe(true);

    const monsterIds = new Set(state.encounter.enemies.map((e) => e.monsterId));
    expect(monsterIds.has('rat')).toBe(true);
    expect(monsterIds.has('cave-rat')).toBe(true);
  });

  it('starts moving immediately upon entering rat-cellars continuous hunt without standing still', () => {
    let state = startGame(createIdleGame('test-immediate-movement', content, 'rat-cellars'), content);
    const initialPos = { ...state.encounter.partyActors[0].position };

    // Advance combat for several ticks (party should move along the route toward zone 0)
    for (let i = 0; i < 15; i++) {
      state = advanceCombat(state, content, 120);
    }

    const currentPos = state.encounter.partyActors[0].position;
    const moved = currentPos.x !== initialPos.x || currentPos.y !== initialPos.y;
    expect(moved).toBe(true);
  });

  it('targets the accessible monster in front instead of a monster blocked behind others', () => {
    let state = startGame(createIdleGame('test-target-selection', content, 'rat-cellars'), content);
    const actor = state.encounter.partyActors[0];

    actor.position = { ...state.encounter.room.entrance };
    actor.previousPosition = { ...state.encounter.room.entrance };

    const occupancySet = new Set([`${actor.position.x},${actor.position.y}`]);
    const approaches = findMeleeApproachTiles(state.encounter.room.map, actor.position, occupancySet);
    expect(approaches.length).toBeGreaterThan(0);
    const frontTile = approaches[0];
    const rearApproaches = findMeleeApproachTiles(state.encounter.room.map, frontTile, new Set([`${actor.position.x},${actor.position.y}`, `${frontTile.x},${frontTile.y}`]));
    const rearTile = rearApproaches.length > 0 ? rearApproaches[0] : { x: frontTile.x + 1, y: frontTile.y, z: frontTile.z };

    const frontRat = { ...state.encounter.enemies[0], position: { ...frontTile }, previousPosition: { ...frontTile }, alive: true };
    const rearRat = { ...state.encounter.enemies[1], position: { ...rearTile }, previousPosition: { ...rearTile }, alive: true };
    state.encounter.enemies = [frontRat, rearRat];
    if (state.encounter.continuousProgress) {
      state.encounter.continuousProgress.zones.forEach((z, idx) => {
        z.activeEnemyIds = idx === 0 ? [frontRat.id, rearRat.id] : [];
      });
    }
    synchronizeEncounterOccupancy(state.encounter);

    // Advance combat by one tick
    state = advanceCombat(state, content, 120);

    // Actor must target the front rat (which is in melee range 1 tile away)
    expect(state.encounter.partyActors[0].targetId).toBe(frontRat.id);
  });

  it('switches target to front monster if previous target gets blocked or moves behind', () => {
    let state = startGame(createIdleGame('test-target-switch', content, 'rat-cellars'), content);
    const actor = state.encounter.partyActors[0];
    actor.position = { ...state.encounter.room.entrance };
    actor.previousPosition = { ...state.encounter.room.entrance };

    const occupancySet = new Set([`${actor.position.x},${actor.position.y}`]);
    const approaches = findMeleeApproachTiles(state.encounter.room.map, actor.position, occupancySet);
    expect(approaches.length).toBeGreaterThan(0);
    const frontTile = approaches[0];

    const dx = frontTile.x - actor.position.x;
    const dy = frontTile.y - actor.position.y;
    const rearTile = { x: frontTile.x + dx, y: frontTile.y + dy, z: actor.position.z };

    const frontRat = { ...state.encounter.enemies[0], position: { ...frontTile }, previousPosition: { ...frontTile }, alive: true };
    const rearRat = { ...state.encounter.enemies[1], position: { ...rearTile }, previousPosition: { ...rearTile }, alive: true };

    // Previous target was rearRat
    actor.targetId = rearRat.id;
    state.encounter.enemies = [frontRat, rearRat];
    if (state.encounter.continuousProgress) {
      state.encounter.continuousProgress.zones.forEach((z, idx) => {
        z.activeEnemyIds = idx === 0 ? [frontRat.id, rearRat.id] : [];
      });
    }
    synchronizeEncounterOccupancy(state.encounter);

    state = advanceCombat(state, content, 120);

    // Front rat is right in front (melee range), so target switches dynamically to front rat
    expect(state.encounter.partyActors[0].targetId).toBe(frontRat.id);
  });
});
