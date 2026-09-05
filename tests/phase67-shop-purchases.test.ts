import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import { buyShopItem, createIdleGame } from '../packages/domain/src';

describe('Phase 67: Item Shop Purchase System', () => {
  const seed = 'test-shop-seed';

  it('fails purchase if player does not have enough gold coins', () => {
    const game = createIdleGame(seed, content);
    // Set gold to 0
    game.session.gold = 0;

    const result = buyShopItem(game, 2400, 'Magic Sword', 5000, 1, content);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Gold insuficiente');
    expect(result.state.session.gold).toBe(0);
  });

  it('deducts gold and adds equipment to character equipmentIds and bag', () => {
    const game = createIdleGame(seed, content);
    game.session.gold = 10000;
    const initialGold = game.session.gold;
    const price = 1200;

    const activeChar = game.session.characters.find((c) => c.id === game.session.selectedCharacterId)!;
    activeChar.inventory.equipmentIds = [];
    expect(activeChar.inventory.equipmentIds).not.toContain(2463);

    const result = buyShopItem(game, 2463, 'Plate Armor', price, 1, content);

    expect(result.ok).toBe(true);
    expect(result.state.session.gold).toBe(initialGold - price);

    const updatedChar = result.state.session.characters.find((c) => c.id === activeChar.id)!;
    expect(updatedChar.inventory.equipmentIds).toContain(2463);

    const bagItem = (result.state.session.bag ?? []).find((i) => i.itemId === 2463);
    expect(bagItem).toBeDefined();
    expect(bagItem?.amount).toBe(1);
  });

  it('allows purchasing multiple consumable items (potions, runes) and stacks them in bag', () => {
    const game = createIdleGame(seed, content);
    game.session.gold = 5000;
    const potionPrice = 50;
    const quantity = 10;

    const result = buyShopItem(game, 7618, 'Health Potion', potionPrice, quantity, content);

    expect(result.ok).toBe(true);
    expect(result.state.session.gold).toBe(5000 - potionPrice * quantity);

    const potionStack = (result.state.session.bag ?? []).find((i) => i.itemId === 7618);
    expect(potionStack).toBeDefined();
    expect(potionStack?.amount).toBe(10);
  });

  it('accumulates stacked consumables when bought in consecutive transactions', () => {
    let game = createIdleGame(seed, content);
    game.session.gold = 10000;

    const res1 = buyShopItem(game, 7620, 'Mana Potion', 50, 5, content);
    expect(res1.ok).toBe(true);
    game = res1.state;

    const res2 = buyShopItem(game, 7620, 'Mana Potion', 50, 15, content);
    expect(res2.ok).toBe(true);
    game = res2.state;

    const potionStack = (game.session.bag ?? []).find((i) => i.itemId === 7620);
    expect(potionStack).toBeDefined();
    expect(potionStack?.amount).toBe(20);
  });
});
