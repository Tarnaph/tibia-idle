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

export const WAVE_4_PATTERN = [
  { distance: 1, halfWidth: 0 },
  { distance: 2, halfWidth: 1 },
  { distance: 3, halfWidth: 1 },
  { distance: 4, halfWidth: 2 },
  { distance: 5, halfWidth: 2 },
] as const;

export function getWave4Tiles(
  casterPos: { x: number; y: number; z?: number },
  direction: FacingDirection
): Array<{ x: number; y: number; z: number }> {
  const vectors: Record<FacingDirection, { fx: number; fy: number; lx: number; ly: number }> = {
    north: { fx: 0, fy: -1, lx: 1, ly: 0 },
    south: { fx: 0, fy: 1, lx: 1, ly: 0 },
    east: { fx: 1, fy: 0, lx: 0, ly: 1 },
    west: { fx: -1, fy: 0, lx: 0, ly: 1 },
  };
  const { fx, fy, lx, ly } = vectors[direction] || vectors.south;
  const tiles: Array<{ x: number; y: number; z: number }> = [];
  const cz = casterPos.z ?? 7;

  for (const row of WAVE_4_PATTERN) {
    for (let w = -row.halfWidth; w <= row.halfWidth; w++) {
      tiles.push({
        x: casterPos.x + fx * row.distance + lx * w,
        y: casterPos.y + fy * row.distance + ly * w,
        z: cz,
      });
    }
  }

  return tiles;
}

export function getDirectionalSpellTiles(
  casterPos: { x: number; y: number; z?: number },
  direction: FacingDirection,
  spellName: string,
  spellRangeVal = 1
): Array<{ x: number; y: number; z: number }> {
  const lowerName = spellName.toLowerCase();
  if (lowerName.includes('wave') || lowerName.includes('flam hur') || lowerName.includes('frigo hur') || lowerName.includes('tera hur')) {
    return getWave4Tiles(casterPos, direction);
  }

  const dirMap: Record<FacingDirection, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -1 },
    east: { dx: 1, dy: 0 },
    south: { dx: 0, dy: 1 },
    west: { dx: -1, dy: 0 },
  };

  const { dx, dy } = dirMap[direction] || dirMap.south;
  const tiles: Array<{ x: number; y: number; z: number }> = [];
  const cz = casterPos.z ?? 7;

  if (lowerName.includes('lux') || lowerName.includes('beam') || lowerName.includes('gran vis')) {
    const range = Math.max(3, spellRangeVal);
    for (let r = 1; r <= range; r++) {
      tiles.push({ x: casterPos.x + dx * r, y: casterPos.y + dy * r, z: cz });
    }
  } else {
    tiles.push({ x: casterPos.x + dx, y: casterPos.y + dy, z: cz });
  }

  return tiles;
}

export function getSpellAreaTiles(
  spell: SpellDefinition,
  casterPos: { x: number; y: number; z?: number },
  direction: FacingDirection
): Array<{ x: number; y: number; z: number }> {
  if (spell.area === 'wave-4') {
    return getWave4Tiles(casterPos, direction);
  }
  return getDirectionalSpellTiles(casterPos, direction, spell.name, spell.range);
}


