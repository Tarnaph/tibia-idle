import { describe, expect, it } from 'vitest';
import {
  activeCharacterOf, availableOwnedEquipmentIds, createIdleGame, deriveStats, equipCharacterItem, findEquipment,
  runCurrentHuntToEnd, startGame, toggleOwnedEquipment, transferOwnedEquipment, unequipCharacterSlot, vocationFor,
} from '../packages/domain/src';
import { content } from './fixture';

const item = (id: number) => { const found = findEquipment(content.equipment, id); if (!found) throw new Error(`Missing ${id}`); return found; };
const stats = (character: ReturnType<typeof activeCharacterOf>) => deriveStats(character, content.equipment, vocationFor(content, character.vocation));

describe('equipment and derived stats', () => {
  it('uses the firstitems.lua Knight starter equipment', () => {
    const character = activeCharacterOf(createIdleGame('starter', content));
    expect(character.equipment).toMatchObject({ head: 2457, armor: 2463, legs: 2647, boots: 2643, leftHand: 8601, rightHand: 2525 });
    expect(stats(character)).toMatchObject({ activeSkill: 'axe', activeSkillLevel: 25, weaponAttack: 21, armor: 24 });
  });

  it('equipping a weapon changes attack', () => {
    const character = activeCharacterOf(createIdleGame('weapon', content));
    const unarmed = unequipCharacterSlot(character, 'leftHand', content.equipment);
    expect(stats(character).attack).toBeGreaterThan(stats(unarmed).attack);
  });

  it('switching Sword, Axe and Club uses the corresponding skill', () => {
    const base = activeCharacterOf(createIdleGame('skills', content));
    const sword = equipCharacterItem(base, item(2376), 'leftHand', content.equipment).character;
    const axe = equipCharacterItem(base, item(2388), 'leftHand', content.equipment).character;
    const club = equipCharacterItem(base, item(2398), 'leftHand', content.equipment).character;
    expect(stats(sword).activeSkill).toBe('sword');
    expect(stats(axe).activeSkill).toBe('axe');
    expect(stats(club).activeSkill).toBe('club');
  });

  it('equipping a shield changes defense', () => {
    const character = activeCharacterOf(createIdleGame('shield', content));
    const noShield = unequipCharacterSlot(character, 'rightHand', content.equipment);
    expect(stats(character).defense).toBeGreaterThan(stats(noShield).defense);
  });

  it('switching armor changes total armor', () => {
    const character = activeCharacterOf(createIdleGame('armor', content));
    const leather = equipCharacterItem(character, item(2467), 'armor', content.equipment).character;
    expect(stats(character).armor).toBeGreaterThan(stats(leather).armor);
  });

  it('rejects an incompatible slot', () => {
    const character = activeCharacterOf(createIdleGame('slot', content));
    const result = equipCharacterItem(character, item(2458), 'rightHand', content.equipment);
    expect(result.ok).toBe(false); expect(result.character).toBe(character);
  });

  it('same seed and same equipment is deterministic', () => {
    const first = runCurrentHuntToEnd(startGame(createIdleGame('same', content), content), content);
    const second = runCurrentHuntToEnd(startGame(createIdleGame('same', content), content), content);
    expect(second).toEqual(first);
  });

  it('same seed and different equipment can differ', () => {
    const base = createIdleGame('gear-diff', content);
    const changed = toggleOwnedEquipment(base, 2376, content).state;
    const first = runCurrentHuntToEnd(startGame(base, content), content);
    const second = runCurrentHuntToEnd(startGame(changed, content), content);
    expect(second.encounter.log).not.toEqual(first.encounter.log);
  });

  it('click fallback and explicit preferred slot share the same rule', () => {
    const base = createIdleGame('transfer', content);
    const click = transferOwnedEquipment(base, { kind: 'inventory', itemId: 2376 }, { kind: 'auto-slot' }, content);
    const drop = transferOwnedEquipment(base, { kind: 'inventory', itemId: 2376 }, { kind: 'slot', slot: 'leftHand' }, content);
    expect(click.ok).toBe(true); expect(click.state).toEqual(drop.state);
  });

  it('returns replaced equipment to the development inventory', () => {
    const base = createIdleGame('return', content);
    const changed = transferOwnedEquipment(base, { kind: 'inventory', itemId: 2376 }, { kind: 'slot', slot: 'leftHand' }, content);
    expect(activeCharacterOf(changed.state).equipment.leftHand).toBe(2376);
    expect(availableOwnedEquipmentIds(changed.state)).toContain(8601);
  });
});
