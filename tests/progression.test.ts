import { describe, expect, it } from 'vitest';
import {
  activeCharacterOf, addPartyMember, addTrainingTries, advanceTraining, createIdleGame, deriveStats, equipCharacterItem,
  findEquipment, requiredSkillTries, restartHunt, skillProgress, trainingSkillFor, vocationFor,
} from '../packages/domain/src';
import { content } from './fixture';

const equip = (state: ReturnType<typeof createIdleGame>, itemId: number) => {
  const character = activeCharacterOf(state);
  const item = findEquipment(content.equipment, itemId)!;
  state.session.characters[0] = equipCharacterItem(character, item, 'leftHand', content.equipment).character;
  return state;
};

describe('functional skill training', () => {
  it.each([[2376, 'sword'], [2388, 'axe'], [2398, 'club']] as const)('weapon %i trains %s', (itemId, skill) => {
    const state = equip(createIdleGame(`train-${skill}`, content), itemId);
    const before = activeCharacterOf(state).skillTries[skill];
    const trained = advanceTraining(state, content, 3_000);
    expect(trainingSkillFor(activeCharacterOf(trained), content)).toBe(skill);
    expect(activeCharacterOf(trained).skillTries[skill]).toBeGreaterThan(before);
  });

  it('raises a skill when enough tries are reached', () => {
    const character = activeCharacterOf(createIdleGame('level-skill', content));
    const vocation = vocationFor(content, 'Knight');
    const current = character.skills.sword;
    const required = requiredSkillTries(vocation, 'sword', current + 1);
    addTrainingTries(character, 'sword', required, vocation);
    expect(character.skills.sword).toBe(current + 1);
    expect(skillProgress(character, 'sword', vocation)).toBe(0);
  });

  it('a higher active skill immediately increases derived damage', () => {
    const state = equip(createIdleGame('damage-skill', content), 2376);
    const character = activeCharacterOf(state);
    const vocation = vocationFor(content, 'Knight');
    const before = deriveStats(character, content.equipment, vocation).attack;
    character.skills.sword += 10;
    expect(deriveStats(character, content.equipment, vocation).attack).toBeGreaterThan(before);
  });

  it('respects vocation skill multipliers', () => {
    const knight = vocationFor(content, 'Knight'); const paladin = vocationFor(content, 'Paladin');
    expect(requiredSkillTries(knight, 'sword', 30)).toBeLessThan(requiredSkillTries(paladin, 'sword', 30));
  });

  it('Paladin trains distance and mages train magic level', () => {
    let state = createIdleGame('voc-training', content);
    state = addPartyMember(state, 'Lysa', 'Paladin', content);
    state = addPartyMember(state, 'Mira', 'Sorcerer', content);
    const trained = advanceTraining(state, content, 6_000);
    const paladin = trained.session.characters.find((character) => character.vocation === 'Paladin')!;
    const sorcerer = trained.session.characters.find((character) => character.vocation === 'Sorcerer')!;
    expect(trainingSkillFor(paladin, content)).toBe('distance');
    expect(paladin.skillTries.distance).toBeGreaterThan(0);
    expect(trainingSkillFor(sorcerer, content)).toBe('magicLevel');
    expect(sorcerer.skillTries.magicLevel).toBeGreaterThan(0);
  });

  it('switching Training to Hunt preserves trained character state', () => {
    const trained = advanceTraining(createIdleGame('preserve-training', content), content, 30_000);
    const before = structuredClone(trained.session.characters[0]);
    const hunt = restartHunt(trained, 'preserve-training', content);
    expect(hunt.session.characters[0]).toEqual(before);
  });
});
