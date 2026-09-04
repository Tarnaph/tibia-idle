import type { SpellDefinition } from '../../content-schema/src';
import type { CharacterState, GameContent } from './types';

export function spellById(content: GameContent, spellId: number): SpellDefinition {
  const spell = content.spells.find((candidate) => candidate.spellId === spellId);
  if (!spell) throw new Error(`Missing spell ${spellId}.`);
  return spell;
}

export function spellRange(spell: SpellDefinition): number {
  return spell.area === 'self' || spell.group === 'healing' ? 0 : Math.max(1, spell.range);
}

export function spellFormulaRange(
  spell: SpellDefinition,
  character: CharacterState,
  skill: number,
  attack: number,
): { min: number; max: number } {
  const calculate = (side: SpellDefinition['formula']['min']) => side.level * character.level
    + (side.magicLevel ?? 0) * character.skills.magicLevel
    + (side.skillAttack ?? 0) * skill * attack
    + (side.distanceSkill ?? 0) * character.skills.distance
    + side.constant;
  return { min: Math.max(0, calculate(spell.formula.min)), max: Math.max(0, calculate(spell.formula.max)) };
}

export function isSpellUnlocked(character: CharacterState, spell: SpellDefinition): boolean {
  return character.level >= spell.requiredLevel && spell.vocations.includes(character.vocation);
}

export function setCharacterHotbar(character: CharacterState, spellIds: number[]): CharacterState {
  const allowed = new Set(character.spells);
  const hotbar = [...new Set(spellIds)].filter((spellId) => allowed.has(spellId)).slice(0, 5);
  return { ...character, hotbar };
}

export function reorderHotbar(character: CharacterState, fromIndex: number, toIndex: number): CharacterState {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= character.hotbar.length || toIndex >= character.hotbar.length) return character;
  const hotbar = [...character.hotbar];
  const [moved] = hotbar.splice(fromIndex, 1);
  hotbar.splice(toIndex, 0, moved);
  return { ...character, hotbar };
}

export type FacingDirection = 'north' | 'east' | 'south' | 'west';

export function getDirectionalSpellTiles(
  casterPos: { x: number; y: number; z: number },
  direction: FacingDirection,
  spellName: string,
  spellRangeVal = 1
): Array<{ x: number; y: number; z: number }> {
  const dirMap: Record<FacingDirection, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -1 },
    east: { dx: 1, dy: 0 },
    south: { dx: 0, dy: 1 },
    west: { dx: -1, dy: 0 },
  };

  const { dx, dy } = dirMap[direction] || dirMap.south;
  const tiles: Array<{ x: number; y: number; z: number }> = [];

  const lowerName = spellName.toLowerCase();
  if (lowerName.includes('lux') || lowerName.includes('wave') || lowerName.includes('gran vis')) {
    const range = Math.max(3, spellRangeVal);
    for (let r = 1; r <= range; r++) {
      tiles.push({ x: casterPos.x + dx * r, y: casterPos.y + dy * r, z: casterPos.z });
    }
  } else {
    tiles.push({ x: casterPos.x + dx, y: casterPos.y + dy, z: casterPos.z });
  }

  return tiles;
}

