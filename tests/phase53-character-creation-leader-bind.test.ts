import { describe, expect, it } from 'vitest';
import { createCharacter, leaderOf, selectedCharacterOf } from '../packages/domain/src/party';
import type { GameContent, GameState } from '../packages/domain/src/types';

const mockContent = {
  vocations: [
    { name: 'Knight', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 15, gainMana: 5, gainCap: 25 },
    { name: 'Paladin', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 10, gainMana: 15, gainCap: 20 },
    { name: 'Sorcerer', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 5, gainMana: 30, gainCap: 10 },
    { name: 'Druid', attackSpeedMs: 2000, baseSpeed: 110, gainHp: 5, gainMana: 30, gainCap: 10 },
  ],
  starterLoadouts: [
    { vocation: 'Knight', equipped: {} },
    { vocation: 'Paladin', equipped: {} },
    { vocation: 'Sorcerer', equipped: {} },
    { vocation: 'Druid', equipped: {} },
  ],
  spells: [],
  equipment: [],
} as unknown as GameContent;

describe('Phase 53: Character Creation Leader Binding & Party Leader Safety', () => {
  it('garante que a seleção de personagem atribui o leaderId e o nome correto', () => {
    const userChar = createCharacter('char-new-999', 'Vingador Supremo', 'Sorcerer', mockContent);
    expect(userChar.name).toBe('Vingador Supremo');
    expect(userChar.vocation).toBe('Sorcerer');

    const state = {
      session: {
        leaderId: userChar.id,
        selectedCharacterId: userChar.id,
        cameraTargetCharacterId: userChar.id,
        characters: [userChar],
        loot: [],
        gold: 0,
        trainingElapsedMs: 0,
        itemLootPreferences: {},
      },
      encounter: {} as any,
    } as unknown as GameState;

    const leader = leaderOf(state);
    expect(leader).toBeDefined();
    expect(leader.id).toBe('char-new-999');
    expect(leader.name).toBe('Vingador Supremo');

    const selected = selectedCharacterOf(state);
    expect(selected.name).toBe('Vingador Supremo');
  });

  it('leaderOf possui fallback seguro se leaderId for inválido ou não encontrado', () => {
    const fallbackChar = createCharacter('char-fallback-1', 'Herói Antigo', 'Knight', mockContent);
    const state = {
      session: {
        leaderId: 'invalid-non-existent-id',
        selectedCharacterId: 'invalid-non-existent-id',
        cameraTargetCharacterId: 'invalid-non-existent-id',
        characters: [fallbackChar],
        loot: [],
        gold: 0,
        trainingElapsedMs: 0,
        itemLootPreferences: {},
      },
      encounter: {} as any,
    } as unknown as GameState;

    // Não deve lançar exceção "Party leader is missing."
    expect(() => leaderOf(state)).not.toThrow();
    expect(leaderOf(state).name).toBe('Herói Antigo');
  });
});
