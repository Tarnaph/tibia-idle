import type { ProgressionSkill, VocationDefinition } from '../../content-schema/src';
import { getEquippedItems } from './derivedStats';
import { vocationFor } from './party';
import type { CharacterState, GameContent, GameState, TrainableSkill } from './types';
import { serverConfigManager } from '../../server/src/config/ServerConfigManager';

const skillBase: Record<ProgressionSkill, number> = { fist: 50, club: 50, sword: 50, axe: 50, distance: 30, shielding: 100 };

export function requiredSkillTries(vocation: VocationDefinition, skill: ProgressionSkill, level: number): number {
  return Math.floor(skillBase[skill] * Math.pow(vocation.skillMultipliers[skill], level - 11));
}

export function requiredMagicTries(vocation: VocationDefinition, magicLevel: number): number {
  return magicLevel === 0 ? 0 : Math.floor(1600 * Math.pow(vocation.manaMultiplier, magicLevel - 1));
}

export function trainingSkillFor(character: CharacterState, content: GameContent): TrainableSkill {
  const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));
  if (weapon?.weaponType === 'sword' || weapon?.weaponType === 'axe' || weapon?.weaponType === 'club' || weapon?.weaponType === 'distance') return weapon.weaponType;
  if (character.baseVocation === 'Sorcerer' || character.baseVocation === 'Druid' || weapon?.weaponType === 'wand') return 'magicLevel';
  return 'fist';
}

export function addTrainingTries(character: CharacterState, skill: TrainableSkill, amount: number, vocation: VocationDefinition): TrainableSkill[] {
  const leveled: TrainableSkill[] = [];
  character.skillTries[skill] += amount;
  const levelOf = () => character.skills[skill];
  const requirement = () => skill === 'magicLevel'
    ? requiredMagicTries(vocation, Math.max(1, levelOf() + 1))
    : requiredSkillTries(vocation, skill, levelOf() + 1);
  while (requirement() > 0 && character.skillTries[skill] >= requirement()) {
    character.skillTries[skill] -= requirement();
    character.skills[skill] += 1;
    leveled.push(skill);
  }
  return leveled;
}

export function skillProgress(character: CharacterState, skill: TrainableSkill, vocation: VocationDefinition): number {
  const next = skill === 'magicLevel'
    ? requiredMagicTries(vocation, Math.max(1, character.skills.magicLevel + 1))
    : requiredSkillTries(vocation, skill, character.skills[skill] + 1);
  return next <= 0 ? 0 : Math.min(1, character.skillTries[skill] / next);
}

export function advanceTraining(state: GameState, content: GameContent, deltaMs: number, targetSkill?: TrainableSkill): GameState {
  if (deltaMs <= 0) return state;
  const next = structuredClone(state) as GameState;
  next.session.trainingElapsedMs += deltaMs;
  next.encounter.events = [];
  next.encounter.visualEvents = [];
  const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;

  for (const character of next.session.characters) {
    const vocation = vocationFor(content, character.vocation);
    const skill = targetSkill ?? trainingSkillFor(character, content);
    if (skill === 'magicLevel') {
      const regenerationIntervalMs = Math.max(1, vocation.manaGainTicks * 2_000);
      character.trainingState.manaSimulationRemainderMs += deltaMs;
      const regenerationPulses = Math.floor(character.trainingState.manaSimulationRemainderMs / regenerationIntervalMs);
      character.trainingState.manaSimulationRemainderMs %= regenerationIntervalMs;
      const manaSpent = regenerationPulses * vocation.manaGainAmount;
      character.trainingState.manaSpent += manaSpent;
      if (manaSpent > 0) next.encounter.visualEvents.push({ type: 'training-action', sourceId: character.id, style: 'magic', effectId: 13, projectileId: null });
      for (const advanced of addTrainingTries(character, skill, manaSpent * content.rateMagic * skillRate, vocation)) {
        next.encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
      }
      continue;
    }
    const interval = vocation.attackSpeedMs * (skill === 'distance' ? 4 : 2);
    character.trainingState.skillRemainderMs += deltaMs;
    const actions = Math.floor(character.trainingState.skillRemainderMs / interval);
    character.trainingState.skillRemainderMs %= interval;
    if (actions > 0) {
      next.encounter.visualEvents.push({ type: 'training-action', sourceId: character.id, style: skill === 'distance' ? 'distance' : 'melee', effectId: 10, projectileId: skill === 'distance' ? 28 : null });
      for (const advanced of addTrainingTries(character, skill, actions * content.rateSkill * skillRate, vocation)) {
        next.encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
      }
    }
    const hasShield = getEquippedItems(character, content.equipment).some((item) => item.weaponType === 'shield');
    if (hasShield) {
      character.trainingState.shieldingRemainderMs += deltaMs;
      const shieldActions = Math.floor(character.trainingState.shieldingRemainderMs / 4000);
      character.trainingState.shieldingRemainderMs %= 4000;
      if (shieldActions > 0) addTrainingTries(character, 'shielding', shieldActions * content.rateSkill * skillRate, vocation);
    }
  }
  return next;
}
