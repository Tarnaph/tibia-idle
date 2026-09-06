import { describe, expect, it } from 'vitest';
import {
  chooseCharacterVocation,
  createCharacter,
  createIdleGame,
  getTakenAccountVocations,
  resetCharacterVocation,
  vocationFor,
  initialHunts,
  type GameContent,
} from '../packages/domain/src';
import equipmentJson from '../content/generated/equipment.json';
import itemEconomyJson from '../content/generated/item-economy.json';
import monstersJson from '../content/generated/monsters.json';
import starterLoadoutsJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';

const content: GameContent = {
  monsters: (monstersJson as any).monsters,
  equipment: (equipmentJson as any).items,
  vocations: (vocationsJson as any).vocations,
  starterLoadouts: (starterLoadoutsJson as any).loadouts,
  spells: (spellsJson as any).spells,
  huntRegions: (huntRegionsJson as any).regions,
  economy: itemEconomyJson as any,
  hunts: initialHunts,
  rateSkill: (vocationsJson as any).rateSkill,
  rateMagic: (vocationsJson as any).rateMagic,
};

describe('Phase 77: Progressão Difícil de Slots & Vocações Únicas por Conta', () => {
  it('identifica corretamente as vocações ativas da mesma conta', () => {
    let state = createIdleGame('test-seed', content);
    state.session.characters[0].vocation = 'None';
    state.session.characters[0].baseVocation = 'None';
    // Char 1 starts as None
    expect(Array.from(getTakenAccountVocations(state.session.characters))).toEqual([]);

    // Set Char 1 level to 8 and choose Knight
    state.session.characters[0].level = 8;
    const res1 = chooseCharacterVocation(state, state.session.characters[0].id, 'Knight', content);
    expect(res1.ok).toBe(true);
    state = res1.state;

    expect(Array.from(getTakenAccountVocations(state.session.characters))).toEqual(['Knight']);
  });

  it('impede a duplicação de vocações na mesma conta ao escolher vocação', () => {
    let state = createIdleGame('test-seed', content);
    // Char 1: Knight
    state.session.characters[0].level = 8;
    const res1 = chooseCharacterVocation(state, state.session.characters[0].id, 'Knight', content);
    expect(res1.ok).toBe(true);
    state = res1.state;

    // Add Char 2: Level 8
    const char2 = createCharacter('char-2', 'Sir Lancelot', 'None', content);
    char2.level = 8;
    state = {
      ...state,
      session: {
        ...state.session,
        characters: [...state.session.characters, char2],
      },
    };

    // Attempting to choose Knight on Char 2 fails
    const res2Fail = chooseCharacterVocation(state, char2.id, 'Knight', content);
    expect(res2Fail.ok).toBe(false);
    expect(res2Fail.error).toContain('já está em uso por outro personagem nesta conta');

    // Choosing Paladin on Char 2 succeeds
    const res2Success = chooseCharacterVocation(state, char2.id, 'Paladin', content);
    expect(res2Success.ok).toBe(true);
    state = res2Success.state;

    const taken = Array.from(getTakenAccountVocations(state.session.characters));
    expect(taken).toContain('Knight');
    expect(taken).toContain('Paladin');
  });

  it('permite que a conta tenha até 4 vocações únicas completas sem repetição', () => {
    let state = createIdleGame('test-seed', content);
    const chars = [
      createCharacter('char-1', 'Hero 1', 'None', content),
      createCharacter('char-2', 'Hero 2', 'None', content),
      createCharacter('char-3', 'Hero 3', 'None', content),
      createCharacter('char-4', 'Hero 4', 'None', content),
    ];
    chars.forEach((c) => (c.level = 10));
    state = { ...state, session: { ...state.session, characters: chars } };

    const vocs = ['Knight', 'Paladin', 'Sorcerer', 'Druid'] as const;
    vocs.forEach((voc, idx) => {
      const res = chooseCharacterVocation(state, chars[idx].id, voc, content);
      expect(res.ok).toBe(true);
      state = res.state;
    });

    const finalTaken = Array.from(getTakenAccountVocations(state.session.characters));
    expect(finalTaken).toHaveLength(4);
    expect(finalTaken).toEqual(expect.arrayContaining(['Knight', 'Paladin', 'Sorcerer', 'Druid']));
  });

  it('libera a vocação para escolha ao usar resetCharacterVocation (Pergaminho de Troca)', () => {
    let state = createIdleGame('test-seed', content);
    state.session.characters[0].level = 10;

    // Char 1 chooses Knight
    let res = chooseCharacterVocation(state, state.session.characters[0].id, 'Knight', content);
    expect(res.ok).toBe(true);
    state = res.state;

    // Reset Char 1
    const resetRes = resetCharacterVocation(state, state.session.characters[0].id);
    expect(resetRes.ok).toBe(true);
    state = resetRes.state;

    expect(Array.from(getTakenAccountVocations(state.session.characters))).toEqual([]);

    // Now Knight can be chosen again
    res = chooseCharacterVocation(state, state.session.characters[0].id, 'Knight', content);
    expect(res.ok).toBe(true);
  });
});
