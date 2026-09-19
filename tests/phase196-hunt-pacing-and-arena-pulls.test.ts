import { describe, expect, it } from 'vitest';
import {
  advanceCombat,
  createIdleGame,
  defeatEnemy,
  restartHunt,
  startGame,
  type GameContent,
  type GameState,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 196: Hunt Pull Pacing, Single Pack Arena Spawning & Active Aggro', () => {
  it('spawns strictly 2-3 Cyclops for cauteloso, with immediate chase behavior and detectionRange 25', () => {
    let state = createIdleGame('seed-cauteloso-test', content, 'cyclops-camp');
    state = restartHunt(state, 'seed-cauteloso-test', content, 'cyclops-camp', 'cauteloso');

    const living = state.encounter.enemies.filter((e) => e.alive);
    // Must be strictly 2 or 3 creatures (never 10+!)
    expect(living.length).toBeGreaterThanOrEqual(2);
    expect(living.length).toBeLessThanOrEqual(3);

    // All should be regular Cyclops in cauteloso
    for (const enemy of living) {
      expect(enemy.monsterId).toBe('cyclops');
      expect(enemy.detectionRange).toBe(25);
      expect(enemy.behavior).toBe('chase');
      expect(enemy.targetId).toBe(state.session.leaderId);
    }
  });

  it('spawns strictly 4 creatures for ousado', () => {
    let state = createIdleGame('seed-ousado-test', content, 'cyclops-camp');
    state = restartHunt(state, 'seed-ousado-test', content, 'cyclops-camp', 'ousado');

    const living = state.encounter.enemies.filter((e) => e.alive);
    expect(living.length).toBe(4);
  });

  it('spawns 5-6 creatures for agressivo with higher chance of Cyclops Smith', () => {
    let state = createIdleGame('seed-agressivo-test', content, 'cyclops-camp');
    state = restartHunt(state, 'seed-agressivo-test', content, 'cyclops-camp', 'agressivo');

    const living = state.encounter.enemies.filter((e) => e.alive);
    expect(living.length).toBeGreaterThanOrEqual(5);
    expect(living.length).toBeLessThanOrEqual(6);

    // In agressivo, at least one Cyclops Smith should be present
    const hasCyclopsSmith = living.some((e) => e.monsterId === 'cyclops-smith');
    expect(hasCyclopsSmith).toBe(true);
  });

  it('monsters actively move towards the player instead of standing frozen', () => {
    let state = createIdleGame('seed-movement-test', content, 'cyclops-camp');
    state = restartHunt(state, 'seed-movement-test', content, 'cyclops-camp', 'cauteloso');

    const leader = state.encounter.partyActors[0];
    const initialPositions = state.encounter.enemies.map((e) => ({ ...e.position }));

    // Advance combat for several ticks
    for (let i = 0; i < 15; i++) {
      state = advanceCombat(state, content, 120);
    }

    const currentPositions = state.encounter.enemies.map((e) => ({ ...e.position }));

    // At least one monster must have moved from its initial spawn tile
    const moved = initialPositions.some((pos, idx) => {
      const cur = currentPositions[idx];
      return cur && (cur.x !== pos.x || cur.y !== pos.y);
    });

    expect(moved).toBe(true);
  });

  it('triggers in-place respawn of the next pull after clearing all monsters with 1s cooldown', () => {
    let state = createIdleGame('seed-respawn-cycle', content, 'cyclops-camp');
    state = restartHunt(state, 'seed-respawn-cycle', content, 'cyclops-camp', 'cauteloso');

    const initialPullCount = state.encounter.enemies.filter((e) => e.alive).length;
    expect(initialPullCount).toBeGreaterThanOrEqual(2);

    // Defeat all initial enemies
    for (const enemy of [...state.encounter.enemies]) {
      defeatEnemy(state, enemy, content);
    }

    // Now 0 living enemies
    expect(state.encounter.enemies.filter((e) => e.alive).length).toBe(0);

    // Advance 500ms (still within 1000ms cooldown) -> 0 living enemies
    state = advanceCombat(state, content, 500);
    expect(state.encounter.enemies.filter((e) => e.alive).length).toBe(0);

    // Advance another 600ms (exceeds 1000ms cooldown) -> new pull spawned around player!
    state = advanceCombat(state, content, 600);
    const nextPullLiving = state.encounter.enemies.filter((e) => e.alive);
    expect(nextPullLiving.length).toBeGreaterThanOrEqual(2);
    expect(nextPullLiving.length).toBeLessThanOrEqual(3);
  });
});
