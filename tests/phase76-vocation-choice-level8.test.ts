import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import {
  createCharacter,
  createIdleGame,
  chooseCharacterVocation,
  resetCharacterVocation,
  applyCharacterLevelAdvance,
  buyShopItem,
  useTestConsumable,
  TEST_SHOP_ITEMS,
} from '../packages/domain/src';

describe('Phase 76: Vocation Selection at Level 8+ & Change Vocation Scroll', () => {
  const seed = 'test-phase-76-seed';

  it('creates new characters as Level 1 with None vocation by default', () => {
    const char = createCharacter('test-id', 'Learner Hero', 'None', content);

    expect(char.level).toBe(1);
    expect(char.vocation).toBe('None');
    expect(char.baseVocation).toBe('None');
  });

  it('prevents choosing a vocation before Level 8', () => {
    const game = createIdleGame(seed, content);
    const charIndex = game.session.characters.findIndex((c) => c.id === game.session.selectedCharacterId);
    
    // Set character vocation to None and level to 7
    game.session.characters[charIndex] = {
      ...game.session.characters[charIndex],
      vocation: 'None',
      baseVocation: 'None',
      level: 7,
    };

    const res = chooseCharacterVocation(game, game.session.selectedCharacterId!, 'Knight', content);

    expect(res.ok).toBe(false);
    expect(res.error).toContain('Nível 8');
  });

  it('allows selecting a permanent vocation once Level 8 or higher is reached', () => {
    let game = createIdleGame(seed, content);
    const charId = game.session.selectedCharacterId!;
    const charIndex = game.session.characters.findIndex((c) => c.id === charId);
    const activeChar = game.session.characters[charIndex];

    // Level up character to level 8 with None vocation
    const level8Char = applyCharacterLevelAdvance(
      { ...activeChar, vocation: 'None', baseVocation: 'None', level: 1 },
      7,
      content
    );
    game.session.characters[charIndex] = level8Char;
    expect(level8Char.level).toBe(8);

    // Choose Knight vocation
    const res = chooseCharacterVocation(game, charId, 'Knight', content);

    expect(res.ok).toBe(true);
    const updatedChar = res.state.session.characters.find((c) => c.id === charId)!;
    expect(updatedChar.vocation).toBe('Knight');
    expect(updatedChar.baseVocation).toBe('Knight');
    expect(updatedChar.maxHp).toBeGreaterThan(150);
  });

  it('resets character vocation to None using resetCharacterVocation function', () => {
    let game = createIdleGame(seed, content);
    const charId = game.session.selectedCharacterId!;

    const res = resetCharacterVocation(game, charId);

    expect(res.ok).toBe(true);
    const resetChar = res.state.session.characters.find((c) => c.id === charId)!;
    expect(resetChar.vocation).toBe('None');
    expect(resetChar.baseVocation).toBe('None');
  });

  it('resets vocation when using Change Vocation Scroll (9912) from bag or shop', () => {
    let game = createIdleGame(seed, content);
    const charId = game.session.selectedCharacterId!;

    // Ensure character has a vocation initially
    expect(game.session.characters[0].vocation).not.toBe('None');

    // Buy or use item 9912 (Vocation Reset)
    const buyRes = buyShopItem(game, TEST_SHOP_ITEMS.VOCATION_RESET, 'Pergaminho de Troca de Vocação', 0, 1, content);
    expect(buyRes.ok).toBe(true);

    const resetChar = buyRes.state.session.characters.find((c) => c.id === charId)!;
    expect(resetChar.vocation).toBe('None');
    expect(buyRes.message).toContain('[Vocação] Vocação de');

    // Also test useTestConsumable
    const bagGame = {
      ...game,
      session: {
        ...game.session,
        bag: [{ itemId: TEST_SHOP_ITEMS.VOCATION_RESET, name: 'Pergaminho de Troca de Vocação', amount: 1 }],
      },
    };

    const useRes = useTestConsumable(bagGame, TEST_SHOP_ITEMS.VOCATION_RESET, content, charId);
    expect(useRes.ok).toBe(true);
    const charAfterUse = useRes.state.session.characters.find((c) => c.id === charId)!;
    expect(charAfterUse.vocation).toBe('None');
  });
});
