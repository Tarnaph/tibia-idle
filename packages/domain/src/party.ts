import type { BaseVocationName, StarterLoadoutDefinition, VocationDefinition, VocationName } from '../../content-schema/src';
import type { CharacterSkills, CharacterState, GameContent, GameState, SkillTries } from './types';

const baseSkills: Record<BaseVocationName, CharacterSkills> = {
  Knight: { fist: 10, club: 30, sword: 35, axe: 25, distance: 10, shielding: 35, magicLevel: 0 },
  Paladin: { fist: 10, club: 10, sword: 10, axe: 10, distance: 35, shielding: 30, magicLevel: 0 },
  Sorcerer: { fist: 10, club: 10, sword: 10, axe: 10, distance: 10, shielding: 15, magicLevel: 8 },
  Druid: { fist: 10, club: 10, sword: 10, axe: 10, distance: 10, shielding: 15, magicLevel: 8 },
};

// Deliberately small Phase 8 spell books. The catalog itself is source-driven,
// but owning one supported spell must not silently grant every shared XML spell.
const starterSpellBooks: Record<BaseVocationName, number[]> = {
  Knight: [1, 6, 107, 7, 80],
  Paladin: [1, 2, 111, 125, 122],
  Sorcerer: [1, 88, 89, 19],
  Druid: [1, 113, 112, 84, 121],
};

function emptyTries(): SkillTries {
  return { fist: 0, club: 0, sword: 0, axe: 0, distance: 0, shielding: 0, magicLevel: 0 };
}

export function vocationFor(content: GameContent, name: VocationName): VocationDefinition {
  const vocation = content.vocations.find((candidate) => candidate.name === name);
  if (!vocation) throw new Error(`Missing vocation ${name}.`);
  return vocation;
}

export function starterFor(content: GameContent, name: BaseVocationName): StarterLoadoutDefinition {
  const starter = content.starterLoadouts.find((candidate) => candidate.vocation === name);
  if (!starter) throw new Error(`Missing starter loadout for ${name}.`);
  return starter;
}

export function createCharacter(id: string, name: string, vocationName: BaseVocationName, content: GameContent): CharacterState {
  const vocation = vocationFor(content, vocationName);
  const starter = starterFor(content, vocationName);
  const importedForVocation = new Set(content.spells
    .filter((spell) => spell.vocations.includes(vocationName))
    .map((spell) => spell.spellId));
  const spells = starterSpellBooks[vocationName].filter((spellId) => importedForVocation.has(spellId));
  const maxMana = vocation.gainMana === 30 ? 60 : vocation.gainMana === 15 ? 30 : vocation.gainMana === 5 ? 10 : 0;
  return {
    id, name, vocation: vocationName, baseVocation: vocationName, promotion: null, level: 1, experience: 0,
    currentHp: 150, currentMana: maxMana,
    maxHp: 150, maxMana: vocation.gainMana === 30 ? 60 : vocation.gainMana === 15 ? 30 : vocation.gainMana === 5 ? 10 : 0,
    skills: { ...baseSkills[vocationName] }, skillTries: emptyTries(),
    equipment: { ...starter.equipped },
    inventory: { equipmentIds: content.equipment.map((item) => item.id) }, spells, hotbar: [],
    combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
    trainingState: { skillRemainderMs: 0, shieldingRemainderMs: 0, manaSpent: 0, manaSimulationRemainderMs: 0 },
  };
}

export function leaderOf(state: GameState): CharacterState {
  const character = state.session.characters.find((candidate) => candidate.id === state.session.leaderId);
  if (!character) throw new Error('Party leader is missing.');
  return character;
}

export function selectedCharacterOf(state: GameState): CharacterState {
  return state.session.characters.find((candidate) => candidate.id === state.session.selectedCharacterId) ?? leaderOf(state);
}

/** @deprecated Use selectedCharacterOf. */
export const activeCharacterOf = selectedCharacterOf;

export function selectCharacter(state: GameState, characterId: string): GameState {
  if (!state.session.characters.some((character) => character.id === characterId)) return state;
  return { ...state, session: { ...state.session, selectedCharacterId: characterId, cameraTargetCharacterId: characterId } };
}

export function roleForVocation(vocation: VocationName): 'TANK' | 'SUP' | 'DPS' {
  if (vocation === 'Knight' || vocation === 'Elite Knight') return 'TANK';
  if (vocation === 'Druid' || vocation === 'Elder Druid') return 'SUP';
  return 'DPS';
}

export function addPartyMember(state: GameState, name: string, vocation: BaseVocationName, content: GameContent): GameState {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Nome obrigatório.');
  if (state.session.characters.length >= 4) throw new Error('A party já possui 4 membros.');
  if (state.session.characters.some((character) => character.baseVocation === vocation)) throw new Error(`${vocation} já está na party.`);
  const normalized = cleanName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
  const id = `${vocation.toLowerCase()}-${normalized || state.session.characters.length + 1}`;
  if (state.session.characters.some((character) => character.id === id)) throw new Error('Nome já utilizado.');
  return {
    ...state,
    session: { ...state.session, characters: [...state.session.characters, createCharacter(id, cleanName, vocation, content)] },
  };
}

export function sharedExperiencePerCharacter(rawExperience: number, characters: CharacterState[]): number {
  const uniqueVocations = new Set(characters.map((character) => character.baseVocation)).size;
  const multiplier = uniqueVocations > 1
    ? 1 + (uniqueVocations * (5 * (uniqueVocations - 1) + 10)) / 100
    : 1.2;
  return Math.ceil((rawExperience * multiplier) / characters.length);
}
