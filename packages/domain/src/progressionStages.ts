import type { VocationDefinition } from '../../content-schema/src';
import type { CharacterState, TrainableSkill } from './types';
import { requiredMagicTries, requiredSkillTries } from './training';

/**
 * 2. Progressão de EXP por nível (Stages de EXP canônicos do FIX.md)
 */
export interface ExpStageDefinition {
  min: number;
  max: number;
  multiplier: number;
}

export const EXP_STAGES: readonly ExpStageDefinition[] = [
  { min: 1, max: 8, multiplier: 50 },
  { min: 9, max: 50, multiplier: 80 },
  { min: 51, max: 100, multiplier: 60 },
  { min: 101, max: 150, multiplier: 40 },
  { min: 151, max: 200, multiplier: 30 },
  { min: 201, max: 300, multiplier: 15 },
  { min: 301, max: 400, multiplier: 12 },
  { min: 401, max: 500, multiplier: 10 },
  { min: 501, max: 600, multiplier: 7 },
  { min: 601, max: 700, multiplier: 6 },
  { min: 701, max: 800, multiplier: 5 },
  { min: 801, max: 900, multiplier: 4 },
  { min: 901, max: 1000, multiplier: 3 },
  { min: 1001, max: 1200, multiplier: 2 },
  { min: 1201, max: 1400, multiplier: 1.5 },
  { min: 1401, max: Infinity, multiplier: 1.2 },
] as const;

export function getExpStageMultiplier(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const stage = EXP_STAGES.find((s) => safeLevel >= s.min && safeLevel <= s.max);
  return stage ? stage.multiplier : 1.2;
}

/**
 * 3. Stages de Skills e Magic Level
 */
export interface SkillStageDefinition {
  min: number;
  max: number;
  multiplier: number;
}

export const PHYSICAL_SKILL_STAGES: readonly SkillStageDefinition[] = [
  { min: 1, max: 80, multiplier: 10 },
  { min: 81, max: 100, multiplier: 7 },
  { min: 101, max: 120, multiplier: 4 },
  { min: 121, max: Infinity, multiplier: 2 },
] as const;

export const MAGIC_LEVEL_STAGES: readonly SkillStageDefinition[] = [
  { min: 0, max: 80, multiplier: 10 },
  { min: 81, max: 100, multiplier: 7 },
  { min: 101, max: 120, multiplier: 4 },
  { min: 121, max: 130, multiplier: 3 },
  { min: 131, max: Infinity, multiplier: 2 },
] as const;

export function getSkillStageMultiplier(skill: TrainableSkill, currentLevel: number): number {
  const safeLevel = Math.max(0, Math.floor(currentLevel || 0));
  if (skill === 'magicLevel') {
    const stage = MAGIC_LEVEL_STAGES.find((s) => safeLevel >= s.min && safeLevel <= s.max);
    return stage ? stage.multiplier : 2;
  }
  const stage = PHYSICAL_SKILL_STAGES.find((s) => safeLevel >= s.min && safeLevel <= s.max);
  return stage ? stage.multiplier : 2;
}

import {
  GREEN_STAMINA_BONUS_MULTIPLIER,
  GREEN_STAMINA_THRESHOLD_MINUTES,
  OFFICIAL_MAX_STAMINA_MINUTES,
  isGreenStamina,
} from './stamina';

export const isGreenStaminaActive = isGreenStamina;

/**
 * Retorna o multiplicador efetivo de EXP combinando Stage de Nível, Bônus de Stamina Verde, taxa global do servidor e bônus perpétuo de Bestiário.
 */
export function getEffectiveExpMultiplier(
  level: number,
  staminaMinutes?: number | null,
  serverRate: number = 1.0,
  bestiaryBonusPercent: number = 0.0
): number {
  const stageMult = getExpStageMultiplier(level);
  const staminaBonus = isGreenStaminaActive(staminaMinutes) ? GREEN_STAMINA_BONUS_MULTIPLIER : 1.0;
  const safeServerRate = Math.max(0.1, serverRate || 1.0);
  const safeBestiaryBonus = Math.max(0, bestiaryBonusPercent || 0.0);
  return stageMult * staminaBonus * safeServerRate * (1 + safeBestiaryBonus);
}

/**
 * Aplica progresso de treinamento com transição de faixas de stages:
 * Ao atravessar uma faixa dentro de um ganho de treino, trata o excedente com a taxa da nova faixa.
 */
export function applySkillTrainingProgress(
  character: CharacterState,
  skill: TrainableSkill,
  rawBaseUnits: number,
  vocation: VocationDefinition,
  contentRate: number = 1.0,
  serverRate: number = 1.0
): TrainableSkill[] {
  if (rawBaseUnits <= 0) return [];
  const leveled: TrainableSkill[] = [];
  let remainingBase = rawBaseUnits;
  const effectiveGlobalRate = Math.max(0.1, (contentRate || 1.0) * (serverRate || 1.0));

  // Loop de consumo de unidades base
  while (remainingBase > 0) {
    const curLevel = skill === 'magicLevel' ? character.skills.magicLevel : character.skills[skill];
    const stageMultiplier = getSkillStageMultiplier(skill, curLevel);
    const effectiveMultiplier = stageMultiplier * effectiveGlobalRate;

    const requirement = skill === 'magicLevel'
      ? requiredMagicTries(vocation, Math.max(1, curLevel + 1))
      : requiredSkillTries(vocation, skill, curLevel + 1);

    if (requirement <= 0) {
      break;
    }

    const currentTries = character.skillTries[skill] ?? 0;
    const neededTries = Math.max(0, requirement - currentTries);
    const baseUnitsNeeded = neededTries / effectiveMultiplier;

    if (remainingBase >= baseUnitsNeeded) {
      // Avança de nível completando exatamente os tries restantes na taxa atual
      character.skills[skill] += 1;
      character.skillTries[skill] = 0;
      leveled.push(skill);
      remainingBase -= baseUnitsNeeded;
    } else {
      // Aplica o restante na taxa atual sem upar
      character.skillTries[skill] = currentTries + remainingBase * effectiveMultiplier;
      remainingBase = 0;
    }
  }

  return leveled;
}
