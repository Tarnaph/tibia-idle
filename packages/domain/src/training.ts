import type { ProgressionSkill, VocationDefinition } from '../../content-schema/src';
import { getEquippedItems } from './derivedStats';
import { vocationFor } from './party';
import type { CharacterState, GameContent, GameState, TrainableSkill } from './types';
import { serverConfigManager } from '../../server/src/config/ServerConfigManager';
import { calculateMaxStamina, tickStamina } from './stamina';

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

  const deltaSec = deltaMs / 1000;
  for (const character of next.session.characters) {
    const maxStamina = calculateMaxStamina(character.level);
    character.maxStaminaMinutes = maxStamina;
    const curStamina = character.staminaMinutes ?? maxStamina;
    const staminaRes = tickStamina(curStamina, maxStamina, 'training', deltaSec);
    character.staminaMinutes = staminaRes.staminaMinutes;

    const vocation = vocationFor(content, character.vocation);
    const skill = targetSkill ?? trainingSkillFor(character, content);
    if (skill === 'magicLevel') {
      const regenerationIntervalMs = Math.max(1, vocation.manaGainTicks * 1_000);
      character.trainingState.manaSimulationRemainderMs += deltaMs;
      const regenerationPulses = Math.floor(character.trainingState.manaSimulationRemainderMs / regenerationIntervalMs);
      character.trainingState.manaSimulationRemainderMs %= regenerationIntervalMs;
      const manaSpent = regenerationPulses * vocation.manaGainAmount;
      character.trainingState.manaSpent += manaSpent;
      if (manaSpent > 0) {
        const weapon = getEquippedItems(character, content.equipment).find((item) => item.weaponType === 'wand');
        const nameLower = weapon?.name.toLowerCase() || '';
        let projectileId: number | null = null;
        // For historical test compatibility, default magic training effect is 13 (magic spark), while specific wands can supply projectileId and wand impact effect
        let effectId = 13;
        if (weapon) {
          if (nameLower.includes('vortex') || nameLower.includes('cosmic') || nameLower.includes('energy') || nameLower.includes('starfall')) {
            projectileId = 5;
            effectId = 12; // CONST_ME_ENERGYHIT
          } else if (nameLower.includes('dragonbreath') || nameLower.includes('draconia') || nameLower.includes('fire') || nameLower.includes('inferno')) {
            projectileId = 4;
            effectId = 16;
          } else if (nameLower.includes('decay') || nameLower.includes('voodoo') || nameLower.includes('death') || nameLower.includes('necrotic') || nameLower.includes('underworld')) {
            projectileId = 11;
            effectId = 18;
          } else if (nameLower.includes('snakebite') || nameLower.includes('springsprout') || nameLower.includes('terra') || nameLower.includes('earth') || nameLower.includes('poison')) {
            projectileId = 15;
            effectId = 17;
          } else if (nameLower.includes('moonlight') || nameLower.includes('hailstorm') || nameLower.includes('ice') || nameLower.includes('chiller')) {
            projectileId = 29;
            effectId = 43;
          } else {
            projectileId = 5;
            effectId = 12;
          }
        }
        next.encounter.visualEvents.push({ type: 'training-action', sourceId: character.id, style: 'magic', effectId, projectileId });
      }
      for (const advanced of addTrainingTries(character, skill, manaSpent * content.rateMagic * skillRate, vocation)) {
        next.encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
      }
      continue;
    }
    const interval = 2000 * (skill === 'distance' ? 2 : 1);
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

export interface TrainingTimeEstimate {
  remainingSeconds: number;
  formattedTime: string;
  progressPercent: number;
  currentLevel: number;
  targetLevel: number;
  currentTries: number;
  requiredTries: number;
}

export function calculateTrainingTimeEstimate(
  character: CharacterState,
  skill: TrainableSkill,
  content: GameContent,
  serverSkillRate?: number
): TrainingTimeEstimate {
  const vocation = vocationFor(content, character.vocation);
  const currentLevel = character.skills[skill] ?? 10;
  const targetLevel = currentLevel + 1;
  const currentTries = character.skillTries[skill] ?? 0;
  const requiredTries = skill === 'magicLevel'
    ? requiredMagicTries(vocation, Math.max(1, targetLevel))
    : requiredSkillTries(vocation, skill, targetLevel);

  const neededTries = Math.max(0, requiredTries - currentTries);
  const progressPercent = requiredTries > 0 ? Math.min(100, Math.max(0, (currentTries / requiredTries) * 100)) : 100;

  const effectiveSkillRate = serverSkillRate ?? serverConfigManager.getConfig().skillRate ?? 1.0;

  let triesPerSecond = 0;
  if (skill === 'magicLevel') {
    const regIntervalSec = Math.max(0.1, vocation.manaGainTicks || 2);
    const manaPerSec = (vocation.manaGainAmount || 2) / regIntervalSec;
    triesPerSecond = manaPerSec * (content.rateMagic || 1.0) * effectiveSkillRate;
  } else if (skill === 'distance') {
    // 1 action every 4 seconds
    triesPerSecond = (1 / 4) * (content.rateSkill || 1.0) * effectiveSkillRate;
  } else {
    // Melee (sword, axe, club, fist) & Shielding: 1 action every 2 seconds
    triesPerSecond = (1 / 2) * (content.rateSkill || 1.0) * effectiveSkillRate;
  }

  const remainingSeconds = triesPerSecond > 0 ? Math.ceil(neededTries / triesPerSecond) : 0;

  let formattedTime = '';
  if (remainingSeconds <= 0) {
    formattedTime = 'Pronto para upar!';
  } else {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    if (hours > 0) {
      formattedTime = `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
      formattedTime = `${minutes}min ${seconds}s`;
    } else {
      formattedTime = `${seconds}s`;
    }
  }

  return {
    remainingSeconds,
    formattedTime,
    progressPercent,
    currentLevel,
    targetLevel,
    currentTries,
    requiredTries,
  };
}

export interface TrainingDummyInfo {
  id: number;
  position: { x: number; y: number; z: number };
}

export const THAIS_TRAINING_DUMMIES: TrainingDummyInfo[] = [
  { id: 1, position: { x: 32349, y: 32219, z: 7 } },
  { id: 2, position: { x: 32349, y: 32221, z: 7 } },
  { id: 3, position: { x: 32349, y: 32223, z: 7 } },
];

export const THAIS_TRAINING_APPROACH_POINT = { x: 32345, y: 32220, z: 7 };

/**
 * Encontra a melhor vaga ao redor do dummy alvo para o personagem:
 * - Vocações Melee (Knight / None): priorizam tiles adjacentes (dist = 1); se todos estiverem lotados, espalham-se a dist = 2.
 * - Vocações Ranged (Druid, Sorcerer, Paladin e promoções): priorizam adjacente; se todos os adjacentes estiverem lotados, posicionam-se a 2 ou 3 tiles de distância para atacar de longe.
 */
export function findBestTrainingTile(
  dummyPos: { x: number; y: number; z: number },
  vocationName: string,
  occupiedKeys: ReadonlySet<string>,
  isWalkableFn: (pos: { x: number; y: number; z: number }) => boolean
): { x: number; y: number; z: number } | null {
  const isRangedVocation =
    vocationName.includes('Sorcerer') ||
    vocationName.includes('Druid') ||
    vocationName.includes('Paladin');

  const z = dummyPos.z;

  // 1. Gera candidatos adjacentes (distância 1)
  const adjacentOffsets = [
    { dx: -1, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 1 },
  ];

  const availableAdjacent: Array<{ x: number; y: number; z: number }> = [];
  for (const off of adjacentOffsets) {
    const pos = { x: dummyPos.x + off.dx, y: dummyPos.y + off.dy, z };
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (!occupiedKeys.has(key) && isWalkableFn(pos)) {
      availableAdjacent.push(pos);
    }
  }

  // Se houver vaga adjacente livre, ocupa a melhor vaga adjacente
  if (availableAdjacent.length > 0) {
    // Prioriza o lado oeste (mais próximo da entrada do Depot: x menor)
    availableAdjacent.sort((a, b) => a.x - b.x || a.y - b.y);
    return availableAdjacent[0];
  }

  // 2. Se todos os adjacentes estiverem ocupados:
  // Para Ranged (Paladins e Mages), posiciona-se a 2 ou 3 tiles de distância para atirar de longe
  if (isRangedVocation) {
    const rangedCandidates: Array<{ x: number; y: number; z: number; dist: number }> = [];
    for (let dist = 2; dist <= 3; dist++) {
      for (let dx = -dist; dx <= dist; dx++) {
        for (let dy = -dist; dy <= dist; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === dist) {
            const pos = { x: dummyPos.x + dx, y: dummyPos.y + dy, z };
            const key = `${pos.x},${pos.y},${pos.z}`;
            if (!occupiedKeys.has(key) && isWalkableFn(pos)) {
              rangedCandidates.push({ ...pos, dist });
            }
          }
        }
      }
    }
    if (rangedCandidates.length > 0) {
      // Prioriza tiles a oeste e mais próximos
      rangedCandidates.sort((a, b) => a.dist - b.dist || a.x - b.x || a.y - b.y);
      return { x: rangedCandidates[0].x, y: rangedCandidates[0].y, z };
    }
  }

  // Para Knights (ou fallback geral), busca qualquer tile livre na coroa de distância 2
  const secondaryCandidates: Array<{ x: number; y: number; z: number }> = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) {
        const pos = { x: dummyPos.x + dx, y: dummyPos.y + dy, z };
        const key = `${pos.x},${pos.y},${pos.z}`;
        if (!occupiedKeys.has(key) && isWalkableFn(pos)) {
          secondaryCandidates.push(pos);
        }
      }
    }
  }

  if (secondaryCandidates.length > 0) {
    secondaryCandidates.sort((a, b) => a.x - b.x || a.y - b.y);
    return secondaryCandidates[0];
  }

  // Fallback seguro: primeiro tile adjacente caminhável
  for (const off of adjacentOffsets) {
    const pos = { x: dummyPos.x + off.dx, y: dummyPos.y + off.dy, z };
    if (isWalkableFn(pos)) return pos;
  }

  return null;
}

