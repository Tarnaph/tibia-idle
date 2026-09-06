import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import {
  buyShopItem,
  createIdleGame,
  useTestConsumable,
  isTestShopItem,
  TEST_SHOP_ITEMS,
  experienceForLevel,
} from '../packages/domain/src';

describe('Phase 75: Test & Debug Shop Items (0 GP)', () => {
  const seed = 'test-phase-75-seed';

  it('identifies test shop items correctly with isTestShopItem', () => {
    expect(isTestShopItem(9900)).toBe(true);
    expect(isTestShopItem(9901)).toBe(true);
    expect(isTestShopItem(9910)).toBe(true);
    expect(isTestShopItem(9911)).toBe(true);
    expect(isTestShopItem(9905)).toBe(true);
    expect(isTestShopItem(9909)).toBe(true);

    expect(isTestShopItem(2148)).toBe(false); // Gold coin
    expect(isTestShopItem(2400)).toBe(false); // Magic sword
    expect(isTestShopItem(7618)).toBe(false); // Health potion
    expect(isTestShopItem(9899)).toBe(false);
    expect(isTestShopItem(9920)).toBe(false);
  });

  it('allows purchasing gold pack (9900) for 0 gold even with zero gold balance', () => {
    const game = createIdleGame(seed, content);
    game.session.gold = 0; // Completely broke

    const result = buyShopItem(game, TEST_SHOP_ITEMS.GOLD_PACK, 'Saco de Ouro (10.000 GP)', 0, 1, content);

    expect(result.ok).toBe(true);
    expect(result.state.session.gold).toBe(10000);
    expect(result.message).toMatch(/10[.,]000 Gold/);
    
    // Check item is in bag
    const inBag = result.state.session.bag?.find((i) => i.itemId === TEST_SHOP_ITEMS.GOLD_PACK);
    expect(inBag).toBeDefined();
    expect(inBag?.amount).toBe(1);
  });

  it('advances character level, experience, and vocation-specific HP/Mana when purchasing level item (9901)', () => {
    const game = createIdleGame(seed, content);
    game.session.gold = 0;

    const char = game.session.characters.find((c) => c.id === game.session.selectedCharacterId)!;
    const initialLevel = char.level;
    const initialMaxHp = char.maxHp;
    const initialMaxMana = char.maxMana;

    const result = buyShopItem(game, TEST_SHOP_ITEMS.LEVEL_UP, 'Tomo do Conhecimento (+1 Nível)', 0, 1, content);

    expect(result.ok).toBe(true);
    const updatedChar = result.state.session.characters.find((c) => c.id === char.id)!;
    expect(updatedChar.level).toBe(initialLevel + 1);
    expect(updatedChar.experience).toBe(experienceForLevel(initialLevel + 1));
    expect(updatedChar.maxHp).toBeGreaterThan(initialMaxHp);
    expect(updatedChar.currentHp).toBe(updatedChar.maxHp);
    expect(updatedChar.maxMana).toBeGreaterThanOrEqual(initialMaxMana);
    expect(result.message).toContain(`[Level Up] ${char.name} avançou +1 nível(is) para o Nível ${initialLevel + 1}!`);
  });

  it('advances +10 levels and +50 levels with items 9910 and 9911', () => {
    let game = createIdleGame(seed, content);
    const char = game.session.characters.find((c) => c.id === game.session.selectedCharacterId)!;
    const initialLevel = char.level;

    const res10 = buyShopItem(game, TEST_SHOP_ITEMS.LEVEL_UP_10, 'Tomo do Conhecimento Supremo (+10 Níveis)', 0, 1, content);
    expect(res10.ok).toBe(true);
    const char10 = res10.state.session.characters.find((c) => c.id === char.id)!;
    expect(char10.level).toBe(initialLevel + 10);

    const res50 = buyShopItem(res10.state, TEST_SHOP_ITEMS.LEVEL_UP_50, 'Elixir Divino (+50 Níveis)', 0, 1, content);
    expect(res50.ok).toBe(true);
    const char50 = res50.state.session.characters.find((c) => c.id === char.id)!;
    expect(char50.level).toBe(initialLevel + 60);
  });

  it('advances all 8 skills when purchasing individual skill items (9902..9909) for 0 GP', () => {
    let game = createIdleGame(seed, content);
    game.session.gold = 0;
    const char = game.session.characters.find((c) => c.id === game.session.selectedCharacterId)!;

    const skillsToTest = [
      { itemId: TEST_SHOP_ITEMS.SKILL_SWORD, name: 'Pergaminho de Espada (+1 Sword)', skillKey: 'sword' as const },
      { itemId: TEST_SHOP_ITEMS.SKILL_AXE, name: 'Pergaminho de Machado (+1 Axe)', skillKey: 'axe' as const },
      { itemId: TEST_SHOP_ITEMS.SKILL_CLUB, name: 'Pergaminho de Clava (+1 Club)', skillKey: 'club' as const },
      { itemId: TEST_SHOP_ITEMS.SKILL_DISTANCE, name: 'Pergaminho de Distância (+1 Distance)', skillKey: 'distance' as const },
      { itemId: TEST_SHOP_ITEMS.SKILL_SHIELDING, name: 'Pergaminho de Escudo (+1 Shielding)', skillKey: 'shielding' as const },
      { itemId: TEST_SHOP_ITEMS.SKILL_MAGIC, name: 'Tomo Arcano (+1 Magic Level)', skillKey: 'magicLevel' as const },
      { itemId: TEST_SHOP_ITEMS.SKILL_FIST, name: 'Faixa de Luta (+1 Fist)', skillKey: 'fist' as const },
      { itemId: TEST_SHOP_ITEMS.SKILL_FISHING, name: 'Isca Mágica (+1 Fishing)', skillKey: 'fishing' as const },
    ];

    for (const testItem of skillsToTest) {
      const currentChar = game.session.characters.find((c) => c.id === char.id)!;
      const initialSkillVal = currentChar.skills[testItem.skillKey] ?? 10;

      const res = buyShopItem(game, testItem.itemId, testItem.name, 0, 1, content);
      expect(res.ok).toBe(true);

      const afterChar = res.state.session.characters.find((c) => c.id === char.id)!;
      expect(afterChar.skills[testItem.skillKey]).toBe(initialSkillVal + 1);
      expect(res.message).toContain('[Skill Up]');

      game = res.state;
    }
  });

  it('allows consuming test items directly from Bag via useTestConsumable', () => {
    let game = createIdleGame(seed, content);
    game.session.bag = [
      { itemId: TEST_SHOP_ITEMS.LEVEL_UP, name: 'Tomo do Conhecimento (+1 Nível)', amount: 2 },
      { itemId: TEST_SHOP_ITEMS.GOLD_PACK, name: 'Saco de Ouro (10.000 GP)', amount: 1 },
    ];
    game.session.gold = 500;

    const char = game.session.characters.find((c) => c.id === game.session.selectedCharacterId)!;
    const initialLevel = char.level;

    // Use Level Up
    const resLevel = useTestConsumable(game, TEST_SHOP_ITEMS.LEVEL_UP, content, char.id);
    expect(resLevel.ok).toBe(true);
    const charAfterLevel = resLevel.state.session.characters.find((c) => c.id === char.id)!;
    expect(charAfterLevel.level).toBe(initialLevel + 1);

    // Amount in bag decreased from 2 to 1
    const levelStack = resLevel.state.session.bag?.find((i) => i.itemId === TEST_SHOP_ITEMS.LEVEL_UP);
    expect(levelStack?.amount).toBe(1);

    // Use Gold Pack
    const resGold = useTestConsumable(resLevel.state, TEST_SHOP_ITEMS.GOLD_PACK, content, char.id);
    expect(resGold.ok).toBe(true);
    expect(resGold.state.session.gold).toBe(10500);

    // Gold pack stack with amount 1 was completely consumed and removed from bag
    const goldStack = resGold.state.session.bag?.find((i) => i.itemId === TEST_SHOP_ITEMS.GOLD_PACK);
    expect(goldStack).toBeUndefined();
  });
});
