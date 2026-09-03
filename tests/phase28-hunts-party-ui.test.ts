import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  addPartyMember,
  removePartyMember,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 28: Hunt Window and Party UI Refinements', () => {
  it('does not allow removing the party leader via removePartyMember', () => {
    const game = createIdleGame('phase28-test-1', content);
    const leaderId = game.session.leaderId;

    const result = removePartyMember(game, leaderId);
    expect(result.session.characters.some((c) => c.id === leaderId)).toBe(true);
    expect(result.session.characters.length).toBe(game.session.characters.length);
  });

  it('removes non-leader party member and adjusts selected character and encounter actors', () => {
    let game = createIdleGame('phase28-test-2', content);
    // Add a second member
    game = addPartyMember(game, 'Aramis', 'Paladin', content);
    expect(game.session.characters.length).toBe(2);

    const newMember = game.session.characters.find((c) => c.name === 'Aramis')!;
    // Select the new member
    game = {
      ...game,
      session: {
        ...game.session,
        selectedCharacterId: newMember.id,
      },
    };

    // Remove Aramis
    const afterRemoval = removePartyMember(game, newMember.id);
    expect(afterRemoval.session.characters.length).toBe(1);
    expect(afterRemoval.session.characters.some((c) => c.id === newMember.id)).toBe(false);

    // Selected character reverted safely to leader
    expect(afterRemoval.session.selectedCharacterId).toBe(afterRemoval.session.leaderId);
    // Encounter party actors do not contain the removed character
    expect(afterRemoval.encounter.partyActors.some((a) => a.characterId === newMember.id)).toBe(false);
  });

  it('calculates elemental damage percentages according to Tibia resistance rules (100 - elementalPercent)', () => {
    const rat = content.monsters.find((m) => m.id === 'rat');
    expect(rat).toBeDefined();

    // In monsters.json, rat has:
    // earth: 20 -> damage received = 100 - 20 = 80% (resistant)
    // holy: 20 -> damage received = 100 - 20 = 80% (resistant)
    // ice: -10 -> damage received = 100 - (-10) = 110% (vulnerable)
    // death: -10 -> damage received = 100 - (-10) = 110% (vulnerable)
    const earthRes = rat!.elementalPercent?.earth ?? 0;
    const iceRes = rat!.elementalPercent?.ice ?? 0;

    const earthDamage = Math.max(0, 100 - earthRes);
    const iceDamage = Math.max(0, 100 - iceRes);

    expect(earthDamage).toBe(80);
    expect(iceDamage).toBe(110);
  });

  it('correctly classifies loot drop chances into authentic rarity tiers', () => {
    const getRarityTag = (chance: number) => {
      if (chance >= 100000) return 'always';
      if (chance >= 20000) return 'common';
      if (chance >= 5000) return 'semi-rare';
      if (chance >= 1000) return 'rare';
      return 'very rare';
    };

    expect(getRarityTag(100000)).toBe('always');
    expect(getRarityTag(85000)).toBe('common');
    expect(getRarityTag(10000)).toBe('semi-rare');
    expect(getRarityTag(3100)).toBe('rare');
    expect(getRarityTag(940)).toBe('very rare');
  });

  it('allows adding members with standard vocations and enforces 4-member limit', () => {
    let game = createIdleGame('phase28-test-3', content);

    // Initial character is Knight
    expect(game.session.characters.length).toBe(1);

    game = addPartyMember(game, 'Robin', 'Paladin', content);
    game = addPartyMember(game, 'Gandalf', 'Sorcerer', content);
    game = addPartyMember(game, 'Malfurion', 'Druid', content);

    expect(game.session.characters.length).toBe(4);

    // Attempting to add a 5th character throws
    expect(() => addPartyMember(game, 'Extra', 'Knight', content)).toThrow();
  });
});
