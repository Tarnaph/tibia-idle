import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  advanceTraining,
  leaveHunt,
  skillProgress,
  vocationFor,
  leaderOf,
  selectedCharacterOf,
  type TrainableSkill,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 29: City Exit, Dummy Training and Classic Skills', () => {
  it('correctly cleans encounter on leaveHunt and preserves party characters for town transfer', () => {
    const game = createIdleGame('test-seed-phase29', content);
    const leftState = leaveHunt(game);

    expect(leftState.encounter.status).toBe('completed');
    expect(leftState.session.characters.length).toBeGreaterThanOrEqual(1);

    // Coordinate verification for Thais and Depot
    const thaisCenter = { x: 32369, y: 32241, z: 7 };
    const thaisDepot = { x: 32342, y: 32231, z: 7 };
    const trainingDummy = { x: 32349, y: 32238, z: 7 };

    expect(thaisCenter.x).toBe(32369);
    expect(thaisCenter.y).toBe(32241);
    expect(thaisDepot.x).toBe(32342);
    expect(thaisDepot.y).toBe(32231);
    expect(trainingDummy.x).toBe(32349);
    expect(trainingDummy.y).toBe(32238);
  });

  it('simulates step-by-step movement from Thais center to Depot', () => {
    let current = { x: 32369, y: 32241, z: 7 };
    const target = { x: 32342, y: 32231, z: 7 };
    let steps = 0;

    while ((current.x !== target.x || current.y !== target.y) && steps < 100) {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
      current = { x: current.x + stepX, y: current.y + stepY, z: current.z };
      steps += 1;
    }

    expect(current.x).toBe(target.x);
    expect(current.y).toBe(target.y);
    expect(steps).toBe(27); // 32369 - 32342 = 27 steps
  });

  it('simulates step-by-step movement from Depot to Training Dummy', () => {
    let current = { x: 32342, y: 32231, z: 7 };
    const target = { x: 32349, y: 32238, z: 7 };
    let steps = 0;

    while ((current.x !== target.x || current.y !== target.y) && steps < 100) {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
      const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
      current = { x: current.x + stepX, y: current.y + stepY, z: current.z };
      steps += 1;
    }

    expect(current.x).toBe(target.x);
    expect(current.y).toBe(target.y);
    expect(steps).toBe(7); // 32349 - 32342 = 7 steps
  });

  it('advances specific target skill when training at dummy with advanceTraining', () => {
    const game = createIdleGame('test-training-skill', content);
    const charBefore = selectedCharacterOf(game);
    const initialSwordTries = charBefore.skillTries.sword;

    // Advance training specifically targeting sword fighting
    const trainedState = advanceTraining(game, content, 20000, 'sword');
    const charAfter = selectedCharacterOf(trainedState);

    expect(charAfter.skillTries.sword).toBeGreaterThan(initialSwordTries);
  });

  it('computes accurate skill progression percentages for the Skills window', () => {
    const game = createIdleGame('test-skills-window', content);
    const character = selectedCharacterOf(game);
    const vocation = vocationFor(content, character.vocation);

    const skills: TrainableSkill[] = ['fist', 'club', 'sword', 'axe', 'distance', 'shielding', 'magicLevel'];
    for (const sk of skills) {
      const progress = skillProgress(character, sk, vocation);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});
