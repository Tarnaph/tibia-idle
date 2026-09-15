import type { ProgressionSkill, VocationDefinition } from '../../content-schema/src';
import { getEquippedItems } from './derivedStats';
import { vocationFor } from './party';
import type { CharacterState, GameContent, GameState, TrainableSkill } from './types';
import { serverConfigManager } from '../../server/src/config/ServerConfigManager';
import { calculateMaxStamina, tickStamina } from './stamina';
import { applySkillTrainingProgress, getSkillStageMultiplier } from './progressionStages';

const skillBase: Record<ProgressionSkill, number> = { fist: 50, club: 50, sword: 50, axe: 50, distance: 30, shielding: 100 };

export interface TrainingDummyDefinition {
  id: string;
  itemId: number;
  name: string;
  kind: 'classic' | 'exercise' | 'ferumbras' | 'demon' | 'monk';
  description: string;
  isHouseDummy?: boolean;
}

export const CANONICAL_TRAINING_DUMMIES: Record<number, TrainingDummyDefinition> = {
  5787: {
    id: 'dummy-thais-classic',
    itemId: 5787,
    name: 'Training Dummy',
    kind: 'classic',
    description: 'Boneco de treino público padrão de Thais.',
    isHouseDummy: false,
  },
  31827: {
    id: 'dummy-exercise-standard',
    itemId: 31827,
    name: 'Exercise Dummy',
    kind: 'exercise',
    description: 'Boneco de treino padrão para residências.',
    isHouseDummy: true,
  },
  31828: {
    id: 'dummy-ferumbras-1',
    itemId: 31828,
    name: 'Ferumbras Exercise Dummy',
    kind: 'ferumbras',
    description: 'Efigie de treino mística inspirada em Ferumbras.',
    isHouseDummy: true,
  },
  31829: {
    id: 'dummy-ferumbras-2',
    itemId: 31829,
    name: 'Ferumbras Exercise Dummy',
    kind: 'ferumbras',
    description: 'Efigie de treino mística inspirada em Ferumbras.',
    isHouseDummy: true,
  },
  31830: {
    id: 'dummy-demon-1',
    itemId: 31830,
    name: 'Demon Exercise Dummy',
    kind: 'demon',
    description: 'Boneco de treino esculpido na forma de um demônio.',
    isHouseDummy: true,
  },
  31831: {
    id: 'dummy-demon-2',
    itemId: 31831,
    name: 'Demon Exercise Dummy',
    kind: 'demon',
    description: 'Boneco de treino esculpido na forma de um demônio.',
    isHouseDummy: true,
  },
  31832: {
    id: 'dummy-monk-1',
    itemId: 31832,
    name: 'Monk Exercise Dummy',
    kind: 'monk',
    description: 'Boneco de treino sagrado na forma de um monge.',
    isHouseDummy: true,
  },
  31833: {
    id: 'dummy-monk-2',
    itemId: 31833,
    name: 'Monk Exercise Dummy',
    kind: 'monk',
    description: 'Boneco de treino sagrado na forma de um monge.',
    isHouseDummy: true,
  },
};

export const EXERCISE_DUMMY_ITEM_IDS = Object.keys(CANONICAL_TRAINING_DUMMIES).map(Number);

export function isTrainingDummyId(itemId: number): boolean {
  return itemId in CANONICAL_TRAINING_DUMMIES;
}

export function getTrainingDummyDefinition(itemId: number): TrainingDummyDefinition | undefined {
  return CANONICAL_TRAINING_DUMMIES[itemId];
}

export interface TrainingVisualAction {
  style: 'melee' | 'distance' | 'magic';
  effectId: number;
  projectileId: number | null;
}

export function resolveTrainingVisualAction(
  character: CharacterState,
  skill: TrainableSkill,
  content?: GameContent
): TrainingVisualAction {
  const vocation: string = character.vocation || character.baseVocation || '';
  const equippedWeapon = content ? getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType)) : undefined;

  if (skill === 'distance' || vocation === 'Paladin' || vocation === 'Royal Paladin') {
    const isSpear = equippedWeapon?.name.toLowerCase().includes('spear');
    return {
      style: 'distance',
      projectileId: isSpear ? 28 : 3, // CONST_ANI_ARROW (3) ou CONST_ANI_ETHEREALSPEAR (28)
      effectId: 10,                   // CONST_ME_HITAREA (10 - impacto físico de flecha/lança no dummy)
    };
  }

  if (vocation === 'Druid' || vocation === 'Elder Druid') {
    return {
      style: 'magic',
      projectileId: 29, // CONST_ANI_ICE
      effectId: 44,     // CONST_ME_ICEATTACK
    };
  }

  if (skill === 'magicLevel' || vocation === 'Sorcerer' || vocation === 'Master Sorcerer') {
    if (equippedWeapon && (equippedWeapon.weaponType === 'wand' || (equippedWeapon as any).weaponType === 'rod')) {
      const nameLower = equippedWeapon.name.toLowerCase();
      if (nameLower.includes('vortex') || nameLower.includes('cosmic') || nameLower.includes('energy') || nameLower.includes('starfall')) {
        return { style: 'magic', projectileId: 5, effectId: 12 };
      }
      if (nameLower.includes('dragonbreath') || nameLower.includes('draconia') || nameLower.includes('fire') || nameLower.includes('inferno')) {
        return { style: 'magic', projectileId: 4, effectId: 16 };
      }
      if (nameLower.includes('decay') || nameLower.includes('voodoo') || nameLower.includes('death') || nameLower.includes('necrotic')) {
        return { style: 'magic', projectileId: 11, effectId: 18 };
      }
      if (nameLower.includes('snakebite') || nameLower.includes('springsprout') || nameLower.includes('terra')) {
        return { style: 'magic', projectileId: 15, effectId: 17 };
      }
      if (nameLower.includes('moonlight') || nameLower.includes('hailstorm') || nameLower.includes('ice')) {
        return { style: 'magic', projectileId: 29, effectId: 44 };
      }
    }
    // Default Sorcerer Wand/Magic: fogo ou energia (TFS exercise wand)
    return {
      style: 'magic',
      projectileId: 4, // CONST_ANI_FIRE
      effectId: 16,    // CONST_ME_HITBYFIRE
    };
  }

  // Default: Knight / Melee (sword, axe, club, fist, shielding)
  return {
    style: 'melee',
    projectileId: null,
    effectId: 10, // CONST_ME_HITAREA (10 - corte e faísca física no dummy)
  };
}

export function requiredSkillTries(vocation: VocationDefinition, skill: ProgressionSkill, level: number): number {
  return Math.floor(skillBase[skill] * Math.pow(vocation.skillMultipliers[skill], level - 11));
}

export function requiredMagicTries(vocation: VocationDefinition, magicLevel: number): number {
  return magicLevel === 0 ? 0 : Math.floor(1600 * Math.pow(vocation.manaMultiplier, magicLevel - 1));
}

export function trainingSkillFor(character: CharacterState, content: GameContent): TrainableSkill {
  const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));
  if (weapon?.weaponType === 'sword' || weapon?.weaponType === 'axe' || weapon?.weaponType === 'club' || weapon?.weaponType === 'distance') return weapon.weaponType;
  const voc = (character.vocation || character.baseVocation || '').toLowerCase();
  if (voc.includes('sorcerer') || voc.includes('druid') || weapon?.weaponType === 'wand') return 'magicLevel';
  if (voc.includes('paladin')) return 'distance';
  if (character.skills) {
    const { axe = 0, club = 0, sword = 0 } = character.skills;
    if (axe > sword && axe > club) return 'axe';
    if (club > sword && club > axe) return 'club';
  }
  return 'sword';
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

  const activeCharId = state.session.selectedCharacterId || state.session.leaderId || state.session.characters[0]?.id;
  const deltaSec = deltaMs / 1000;
  for (const character of next.session.characters) {
    const maxStamina = calculateMaxStamina(character.level);
    character.maxStaminaMinutes = maxStamina;
    const curStamina = character.staminaMinutes ?? maxStamina;
    const staminaRes = tickStamina(curStamina, maxStamina, 'training', deltaSec);
    character.staminaMinutes = staminaRes.staminaMinutes;

    const vocation = vocationFor(content, character.vocation);
    const isLeader = character.id === activeCharId;
    const skill = (isLeader && targetSkill) ? targetSkill : trainingSkillFor(character, content);
    if (skill === 'magicLevel') {
      const regenerationIntervalMs = Math.max(1, vocation.manaGainTicks * 1_000);
      character.trainingState.manaSimulationRemainderMs += deltaMs;
      const regenerationPulses = Math.floor(character.trainingState.manaSimulationRemainderMs / regenerationIntervalMs);
      character.trainingState.manaSimulationRemainderMs %= regenerationIntervalMs;
      const manaSpent = regenerationPulses * vocation.manaGainAmount;
      character.trainingState.manaSpent += manaSpent;
      if (manaSpent > 0) {
        const visual = resolveTrainingVisualAction(character, skill, content);
        next.encounter.visualEvents.push({
          type: 'training-action',
          sourceId: character.id,
          style: visual.style,
          effectId: visual.effectId,
          projectileId: visual.projectileId,
        });
      }
      for (const advanced of applySkillTrainingProgress(character, skill, manaSpent, vocation, content.rateMagic, skillRate)) {
        next.encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
      }
      continue;
    }
    const interval = 2000;
    character.trainingState.skillRemainderMs += deltaMs;
    const actions = Math.floor(character.trainingState.skillRemainderMs / interval);
    character.trainingState.skillRemainderMs %= interval;
    if (actions > 0) {
      const visual = resolveTrainingVisualAction(character, skill, content);
      next.encounter.visualEvents.push({
        type: 'training-action',
        sourceId: character.id,
        style: visual.style,
        effectId: visual.effectId,
        projectileId: visual.projectileId,
      });
      for (const advanced of applySkillTrainingProgress(character, skill, actions, vocation, content.rateSkill, skillRate)) {
        next.encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
      }
    }
    const hasShield = getEquippedItems(character, content.equipment).some((item) => item.weaponType === 'shield');
    if (hasShield) {
      character.trainingState.shieldingRemainderMs += deltaMs;
      const shieldActions = Math.floor(character.trainingState.shieldingRemainderMs / 4000);
      character.trainingState.shieldingRemainderMs %= 4000;
      if (shieldActions > 0) applySkillTrainingProgress(character, 'shielding', shieldActions, vocation, content.rateSkill, skillRate);
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

  // Auto-level immediately if current tries already satisfy or exceed requirement
  addTrainingTries(character, skill, 0, vocation);

  const currentLevel = character.skills[skill] ?? 10;
  const targetLevel = currentLevel + 1;
  const currentTries = character.skillTries[skill] ?? 0;
  const requiredTries = skill === 'magicLevel'
    ? requiredMagicTries(vocation, Math.max(1, targetLevel))
    : requiredSkillTries(vocation, skill, targetLevel);

  const neededTries = Math.max(0, requiredTries - currentTries);
  const progressPercent = requiredTries > 0 ? Math.min(100, Math.max(0, (currentTries / requiredTries) * 100)) : 100;

  const effectiveSkillRate = serverSkillRate ?? serverConfigManager.getConfig().skillRate ?? 1.0;
  const stageMultiplier = getSkillStageMultiplier(skill, currentLevel);

  let triesPerSecond = 0;
  if (skill === 'magicLevel') {
    const regIntervalSec = Math.max(0.1, vocation.manaGainTicks || 2);
    const manaPerSec = (vocation.manaGainAmount || 2) / regIntervalSec;
    triesPerSecond = manaPerSec * (content.rateMagic || 1.0) * effectiveSkillRate * stageMultiplier;
  } else if (skill === 'distance') {
    // 1 action every 4 seconds
    triesPerSecond = (1 / 4) * (content.rateSkill || 1.0) * effectiveSkillRate * stageMultiplier;
  } else {
    // Melee (sword, axe, club, fist) & Shielding: 1 action every 2 seconds
    triesPerSecond = (1 / 2) * (content.rateSkill || 1.0) * effectiveSkillRate * stageMultiplier;
  }

  const remainingSeconds = triesPerSecond > 0 ? Math.ceil(neededTries / triesPerSecond) : 0;

  let formattedTime = '';
  if (remainingSeconds <= 0) {
    formattedTime = '< 1s';
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

export interface DummyTrainingSlot {
  characterId: string;
  position: { x: number; y: number; z: number };
  facingDirection: 'north' | 'south' | 'east' | 'west';
}

/**
 * Distribui todos os membros seguidores da party em volta do training dummy de forma harmoniosa.
 * Cada membro recebe uma posição adjacente livre ao redor do boneco de treino e sua respectiva orientação
 * visual apontando para o boneco.
 */
export function calculatePartyTrainingPositions(
  dummyPos: { x: number; y: number; z: number },
  leaderPos: { x: number; y: number; z: number },
  followerIds: string[],
  isWalkableFn: (pos: { x: number; y: number; z: number }) => boolean
): Map<string, DummyTrainingSlot> {
  const result = new Map<string, DummyTrainingSlot>();
  if (followerIds.length === 0) return result;

  const z = dummyPos.z;
  const leaderKey = `${leaderPos.x},${leaderPos.y},${leaderPos.z}`;

  // Offsets adjacentes ao redor do dummy ordenados por prioridade cardeal e diagonal
  const candidateOffsets: Array<{ dx: number; dy: number; facing: 'north' | 'south' | 'east' | 'west' }> = [
    { dx: -1, dy: 0, facing: 'east' },  // Oeste do dummy -> olha para leste
    { dx: 1, dy: 0, facing: 'west' },   // Leste do dummy -> olha para oeste
    { dx: 0, dy: -1, facing: 'south' }, // Norte do dummy -> olha para sul
    { dx: 0, dy: 1, facing: 'north' },  // Sul do dummy -> olha para norte
    { dx: -1, dy: -1, facing: 'east' }, // Noroeste -> olha para leste/dummy
    { dx: 1, dy: -1, facing: 'west' },  // Nordeste -> olha para oeste/dummy
    { dx: -1, dy: 1, facing: 'east' },  // Sudoeste -> olha para leste/dummy
    { dx: 1, dy: 1, facing: 'west' },   // Sudeste -> olha para oeste/dummy
  ];

  const occupied = new Set<string>();
  occupied.add(leaderKey);

  let followerIndex = 0;
  for (const off of candidateOffsets) {
    if (followerIndex >= followerIds.length) break;
    const pos = { x: dummyPos.x + off.dx, y: dummyPos.y + off.dy, z };
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (!occupied.has(key) && isWalkableFn(pos)) {
      occupied.add(key);
      result.set(followerIds[followerIndex], {
        characterId: followerIds[followerIndex],
        position: pos,
        facingDirection: off.facing,
      });
      followerIndex++;
    }
  }

  // Se algum seguidor não achou vaga adjacente limpa, tenta anel de distância 2
  if (followerIndex < followerIds.length) {
    const secondaryOffsets: Array<{ dx: number; dy: number; facing: 'north' | 'south' | 'east' | 'west' }> = [
      { dx: -2, dy: 0, facing: 'east' },
      { dx: 2, dy: 0, facing: 'west' },
      { dx: 0, dy: -2, facing: 'south' },
      { dx: 0, dy: 2, facing: 'north' },
    ];
    for (const off of secondaryOffsets) {
      if (followerIndex >= followerIds.length) break;
      const pos = { x: dummyPos.x + off.dx, y: dummyPos.y + off.dy, z };
      const key = `${pos.x},${pos.y},${pos.z}`;
      if (!occupied.has(key) && isWalkableFn(pos)) {
        occupied.add(key);
        result.set(followerIds[followerIndex], {
          characterId: followerIds[followerIndex],
          position: pos,
          facingDirection: off.facing,
        });
        followerIndex++;
      }
    }
  }

  // Fallback seguro: se ainda restar alguém, aloca na posição do líder ou adjacente
  while (followerIndex < followerIds.length) {
    const fId = followerIds[followerIndex];
    result.set(fId, {
      characterId: fId,
      position: { x: dummyPos.x - 1, y: dummyPos.y, z },
      facingDirection: 'east',
    });
    followerIndex++;
  }

  return result;
}


