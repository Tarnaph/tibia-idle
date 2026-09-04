import { describe, expect, it } from 'vitest';
import {
  addPartyMember,
  createIdleGame,
  removePartyMember,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 53: Gearbox Saved Character Pool & Squad Slots', () => {
  it('manages active squad members and allows removing and re-adding saved characters', () => {
    let state = createIdleGame('test-gearbox-squad', content);

    // Initial squad has 1 member
    expect(state.session.characters.length).toBe(1);

    // Add 3 squad members (total 4 members max)
    state = addPartyMember(state, 'Paladin Hero', 'Paladin', content);
    state = addPartyMember(state, 'Sorcerer Hero', 'Sorcerer', content);
    state = addPartyMember(state, 'Druid Hero', 'Druid', content);

    expect(state.session.characters.length).toBe(4);

    const sorcId = state.session.characters.find((c) => c.vocation === 'Sorcerer')!.id;

    // Remove sorcerer from active squad (squad becomes 3, slot becomes empty)
    state = removePartyMember(state, sorcId);
    expect(state.session.characters.length).toBe(3);
    expect(state.session.characters.some((c) => c.id === sorcId)).toBe(false);
  });
});
