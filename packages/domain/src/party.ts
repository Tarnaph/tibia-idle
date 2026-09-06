import type { BaseVocationName, StarterLoadoutDefinition, VocationDefinition, VocationName } from '../../content-schema/src';
import type { CharacterSkills, CharacterState, GameContent, GameState, SkillTries } from './types';

const baseSkills: Record<BaseVocationName, CharacterSkills> = {
  None: { fist: 10, club: 10, sword: 10, axe: 10, distance: 10, shielding: 10, magicLevel: 0 },
  Knight: { fist: 10, club: 30, sword: 35, axe: 25, distance: 10, shielding: 35, magicLevel: 0 },
  Paladin: { fist: 10, club: 10, sword: 10, axe: 10, distance: 35, shielding: 30, magicLevel: 0 },
  Sorcerer: { fist: 10, club: 10, sword: 10, axe: 10, distance: 10, shielding: 15, magicLevel: 8 },
  Druid: { fist: 10, club: 10, sword: 10, axe: 10, distance: 10, shielding: 15, magicLevel: 8 },
};

// Deliberately small Phase 8 spell books. The catalog itself is source-driven,
// but owning one supported spell must not silently grant every shared XML spell.
const starterSpellBooks: Record<BaseVocationName, number[]> = {
  None: [1],
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
  if (!starter) return content.starterLoadouts[0];
  return starter;
}

export function createCharacter(id: string, name: string, vocationName: BaseVocationName = 'None', content: GameContent, gender: 'male' | 'female' = 'male'): CharacterState {
  const isNone = vocationName === 'None';
  const vocation = !isNone ? vocationFor(content, vocationName) : null;
  const starter = starterFor(content, vocationName);
  const importedForVocation = new Set(content.spells
    .filter((spell) => spell.vocations.includes(vocationName))
    .map((spell) => spell.spellId));
  const spells = (starterSpellBooks[vocationName] ?? [1]).filter((spellId) => importedForVocation.has(spellId) || spellId === 1);
  const gainMana = vocation?.gainMana ?? 5;
  const maxMana = gainMana === 30 ? 60 : gainMana === 15 ? 30 : gainMana === 5 ? 10 : 35;
  return {
    id, name, vocation: vocationName, baseVocation: vocationName, promotion: null, level: 1, experience: 0,
    gender,
    isPremium: true,
    currentHp: 150, currentMana: maxMana,
    maxHp: 150, maxMana: maxMana,
    skills: { ...(baseSkills[vocationName] ?? baseSkills.None) }, skillTries: emptyTries(),
    equipment: { ...starter.equipped },
    inventory: { equipmentIds: content.equipment.map((item) => item.id) }, spells, hotbar: [],
    stance: 'offensive', targetDistance: vocationName === 'Paladin' ? 2 : 1,
    combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
    trainingState: { skillRemainderMs: 0, shieldingRemainderMs: 0, manaSpent: 0, manaSimulationRemainderMs: 0 },
  };
}

export function leaderOf(state: GameState): CharacterState {
  const character = state.session.characters.find((candidate) => candidate.id === state.session.leaderId) ?? state.session.characters[0];
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

export function addPartyMember(state: GameState, name: string, vocation: BaseVocationName, content: GameContent, gender: 'male' | 'female' = 'male'): GameState {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Nome obrigatório.');
  if (state.session.characters.length >= 4) throw new Error('A party já possui 4 membros.');
  const normalized = cleanName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
  const id = `${vocation.toLowerCase()}-${normalized || state.session.characters.length + 1}`;
  if (state.session.characters.some((character) => character.id === id)) throw new Error('Nome já utilizado.');
  return {
    ...state,
    session: { ...state.session, characters: [...state.session.characters, createCharacter(id, cleanName, vocation, content, gender)] },
  };
}

export function sharedExperiencePerCharacter(rawExperience: number, characters: CharacterState[]): number {
  const uniqueVocations = new Set(characters.map((character) => character.baseVocation)).size;
  const multiplier = uniqueVocations > 1
    ? 1 + (uniqueVocations * (5 * (uniqueVocations - 1) + 10)) / 100
    : 1.2;
  return Math.ceil((rawExperience * multiplier) / characters.length);
}

export function removePartyMember(state: GameState, characterId: string): GameState {
  if (state.session.leaderId === characterId) return state; // Líder não pode ser removido
  const remaining = state.session.characters.filter((c) => c.id !== characterId);
  if (remaining.length === 0) return state;

  const newSelected =
    state.session.selectedCharacterId === characterId
      ? state.session.leaderId
      : state.session.selectedCharacterId;

  return {
    ...state,
    session: {
      ...state.session,
      characters: remaining,
      selectedCharacterId: newSelected,
      cameraTargetCharacterId: newSelected,
    },
    encounter: {
      ...state.encounter,
      partyActors: state.encounter.partyActors.filter((a) => a.characterId !== characterId),
    },
  };
}

export function getTakenAccountVocations(
  characters: CharacterState[],
  excludeCharacterId?: string,
): Set<BaseVocationName> {
  const taken = new Set<BaseVocationName>();
  for (const char of characters) {
    if (excludeCharacterId && char.id === excludeCharacterId) continue;
    if (char.baseVocation && char.baseVocation !== 'None') {
      taken.add(char.baseVocation as BaseVocationName);
    }
  }
  return taken;
}

export function chooseCharacterVocation(
  state: GameState,
  characterId: string,
  newVocation: BaseVocationName,
  content: GameContent,
): { ok: boolean; state: GameState; error?: string } {
  if (newVocation === 'None') return { ok: false, state, error: 'Selecione uma vocação válida.' };
  const charIndex = state.session.characters.findIndex((c) => c.id === characterId);
  if (charIndex === -1) return { ok: false, state, error: 'Personagem não encontrado.' };

  const char = state.session.characters[charIndex];
  if (char.level < 8) {
    return { ok: false, state, error: 'É necessário atingir o Nível 8 para escolher uma vocação.' };
  }

  const takenVocations = getTakenAccountVocations(state.session.characters, characterId);
  if (takenVocations.has(newVocation)) {
    return {
      ok: false,
      state,
      error: `A vocação ${newVocation} já está em uso por outro personagem nesta conta. Cada conta só pode ter 1 personagem de cada vocação.`,
    };
  }

  const vocationDef = vocationFor(content, newVocation);
  const importedForVocation = new Set(
    content.spells.filter((spell) => spell.vocations.includes(newVocation)).map((spell) => spell.spellId)
  );
  const newSpells = Array.from(
    new Set([...char.spells, ...(starterSpellBooks[newVocation] ?? []).filter((spellId) => importedForVocation.has(spellId))])
  );

  const gainHp = vocationDef.gainHp ?? 5;
  const gainMana = vocationDef.gainMana ?? 5;
  const levelsAboveOne = char.level - 1;
  const newMaxHp = Math.max(150, 150 + levelsAboveOne * gainHp);
  const newMaxMana = Math.max(0, levelsAboveOne * gainMana);

  const updatedChar: CharacterState = {
    ...char,
    vocation: newVocation,
    baseVocation: newVocation,
    promotion: null,
    maxHp: newMaxHp,
    currentHp: newMaxHp,
    maxMana: newMaxMana,
    currentMana: newMaxMana,
    spells: newSpells,
    targetDistance: newVocation === 'Paladin' ? 2 : 1,
  };

  const nextCharacters = [...state.session.characters];
  nextCharacters[charIndex] = updatedChar;

  return {
    ok: true,
    state: {
      ...state,
      session: {
        ...state.session,
        characters: nextCharacters,
      },
    },
  };
}

export function resetCharacterVocation(
  state: GameState,
  characterId: string,
): { ok: boolean; state: GameState } {
  const charIndex = state.session.characters.findIndex((c) => c.id === characterId);
  if (charIndex === -1) return { ok: false, state };

  const char = state.session.characters[charIndex];
  const updatedChar: CharacterState = {
    ...char,
    vocation: 'None',
    baseVocation: 'None',
    promotion: null,
  };

  const nextCharacters = [...state.session.characters];
  nextCharacters[charIndex] = updatedChar;

  return {
    ok: true,
    state: {
      ...state,
      session: {
        ...state.session,
        characters: nextCharacters,
      },
    },
  };
}
