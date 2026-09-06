import { describe, expect, it } from 'vitest';
import { createIdleGame, startGame, advanceCombat } from '../packages/domain/src';
import { content } from './fixture';

describe('Damage and XP Duplicate Audit Fix', () => {
  it('ensures experience is granted exactly once when a creature is killed', () => {
    let state = createIdleGame('test-dup-xp', content);
    state = startGame(state, content);
    
    // Spawn room and find first enemy
    let initialXp = state.session.characters[0].experience;
    
    // Run combat until at least one enemy is killed
    let killed = false;

    for (let tick = 0; tick < 100; tick += 1) {
      state = advanceCombat(state, content, 120);
      const xpEvents = state.encounter.events.filter((e) => e.type === 'experience-gained');
      if (xpEvents.length > 0) {
        // Each tick where an enemy dies should emit at most 1 experience-gained event per character
        expect(xpEvents.length).toBeLessThanOrEqual(state.session.characters.length);
        killed = true;
      }
    }

    expect(killed).toBe(true);
    expect(state.session.characters[0].experience).toBeGreaterThan(initialXp);
  });

  it('ensures dead enemies do not trigger defeatEnemy multiple times', () => {
    let state = createIdleGame('test-dup-corpse', content);
    state = startGame(state, content);

    // Run combat and verify corpses array length equals total enemy deaths
    let totalEnemyDeaths = 0;
    for (let tick = 0; tick < 50; tick += 1) {
      state = advanceCombat(state, content, 120);
      totalEnemyDeaths += state.encounter.events.filter((e) => e.type === 'enemy-death').length;
    }

    expect(state.encounter.corpses.length).toBe(totalEnemyDeaths);
  });
});
