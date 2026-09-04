import { describe, expect, it } from 'vitest';
import {
  addPartyMember,
  createIdleGame,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 52: Vocation Unlocking, DB Save & Squad Teleport Effect', () => {
  it('allows adding multiple squad members of any vocation without blocking duplicate vocations', () => {
    let state = createIdleGame('test-dup-vocation', content);

    // Add first Knight
    state = addPartyMember(state, 'Knight One', 'Knight', content);
    expect(state.session.characters.length).toBe(2);

    // Add second Knight (previously blocked, now unlocked and allowed)
    state = addPartyMember(state, 'Knight Two', 'Knight', content);
    expect(state.session.characters.length).toBe(3);
    expect(state.session.characters[2].name).toBe('Knight Two');
    expect(state.session.characters[2].vocation).toBe('Knight');

    // Add Paladin
    state = addPartyMember(state, 'Pally One', 'Paladin', content);
    expect(state.session.characters.length).toBe(4);
  });
});
