import { describe, expect, it } from 'vitest';
import {
  findPath,
  createTileMapFromRows,
  createIdleGame,
  transferItemBetweenContainers,
  destroyContainerItem,
  executeQuickSell,
  updateItemLootPreference,
  characterCapacity,
  inventoryWeight,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 25: Orthogonal Movement, Loot Economy, Bag, Backpack, Depot and QuickSell', () => {
  it('prefers orthogonal (horizontal/vertical) movement over diagonal steps in pathfinding', () => {
    // Open 4x4 room with start at (1,1) and goal at (2,2)
    // # # # #
    // # E . #
    // # . X #
    // # # # #
    const { map, entrance, exit } = createTileMapFromRows([
      '####',
      '#E.#',
      '#.X#',
      '####',
    ]);

    const path = findPath(map, entrance, [exit]);
    expect(path.length).toBeGreaterThan(0);
    // With diagonal cost 25 > orthogonal 10 + 10 = 20, the path takes 2 orthogonal steps
    expect(path.length).toBe(2);
    // First step must be purely orthogonal (dx=1, dy=0 or dx=0, dy=1), not diagonal (dx=1, dy=1)
    const first = path[0];
    const dx = Math.abs(first.x - entrance.x);
    const dy = Math.abs(first.y - entrance.y);
    expect((dx === 1 && dy === 0) || (dx === 0 && dy === 1)).toBe(true);
  });

  it('guarantees 100% of economy loot items have a canonical sell price (no unpriced items)', () => {
    const unpriced = content.economy.items.filter((item) => item.canonicalSellPrice === null);
    expect(unpriced.length).toBe(0);
    expect(content.economy.items.every((item) => typeof item.canonicalSellPrice === 'number' && item.canonicalSellPrice > 0)).toBe(true);
  });

  it('calculates character capacity accurately and considers equipped inventory weight', () => {
    const game = createIdleGame('test-seed', content);
    const char = game.session.characters[0]; // Knight
    const cap = characterCapacity(char, content);
    const weight = inventoryWeight(char, content.equipment);

    expect(cap).toBeGreaterThanOrEqual(400);
    expect(weight).toBeGreaterThanOrEqual(0);

    // When level increases, capacity scales up with vocation gainCap:
    const higherLevelChar = { ...char, level: 50 };
    const higherCap = characterCapacity(higherLevelChar, content);
    expect(higherCap).toBe(400 + 49 * 25);
    const freeCap = Math.max(0, higherCap - weight);
    expect(freeCap).toBeGreaterThan(0);
  });

  it('transfers items between Backpack, Bag and Depot cleanly', () => {
    const game = createIdleGame('test-seed-transfers', content);
    // Add 2 items to backpack (session.loot)
    game.session.loot = [
      { itemId: 2148, name: 'Gold Coin', amount: 50 },
      { itemId: 2376, name: 'Sword', amount: 1 },
    ];
    game.session.bag = [];
    game.session.depot = [];

    // Transfer Sword (index 1) from backpack to bag
    const afterBagTransfer = transferItemBetweenContainers(game, 'backpack', 'bag', 1);
    expect(afterBagTransfer.session.loot.length).toBe(1);
    expect(afterBagTransfer.session.loot[0].name).toBe('Gold Coin');
    expect(afterBagTransfer.session.bag?.length).toBe(1);
    expect(afterBagTransfer.session.bag?.[0].name).toBe('Sword');

    // Transfer Sword from bag to depot
    const afterDepotTransfer = transferItemBetweenContainers(afterBagTransfer, 'bag', 'depot', 0);
    expect(afterDepotTransfer.session.bag?.length).toBe(0);
    expect(afterDepotTransfer.session.depot?.length).toBe(1);
    expect(afterDepotTransfer.session.depot?.[0].name).toBe('Sword');

    // Transfer Sword from depot back to backpack
    const backToBackpack = transferItemBetweenContainers(afterDepotTransfer, 'depot', 'backpack', 0);
    expect(backToBackpack.session.depot?.length).toBe(0);
    expect(backToBackpack.session.loot.length).toBe(2);
    expect(backToBackpack.session.loot[1].name).toBe('Sword');
  });

  it('destroys items from containers when requested', () => {
    const game = createIdleGame('test-seed-destroy', content);
    game.session.loot = [
      { itemId: 2230, name: 'Bone', amount: 3 },
      { itemId: 2666, name: 'Meat', amount: 5 },
    ];

    const afterDestroy = destroyContainerItem(game, 'backpack', 0);
    expect(afterDestroy.session.loot.length).toBe(1);
    expect(afterDestroy.session.loot[0].name).toBe('Meat');
  });

  it('executes Quick Sell for selected items and respects locked items', () => {
    const game = createIdleGame('test-seed-quicksell', content);
    // Sword sell price is 25 gp, Meat sell price is 2 gp
    game.session.loot = [
      { itemId: 2376, name: 'Sword', amount: 2 }, // 2 * 25 = 50 gp
      { itemId: 2666, name: 'Meat', amount: 10 }, // 10 * 2 = 20 gp
      { itemId: 2050, name: 'Torch', amount: 1 }, // 1 * 2 = 2 gp
    ];
    game.session.gold = 100;

    // Lock Torch so it cannot be sold
    const lockedGame = updateItemLootPreference(game, 2050, { lockSell: true });

    // Try selling Sword (2376) and Torch (2050)
    const result = executeQuickSell(lockedGame, content, [2376, 2050]);

    // Sword should sell for 50 gp, Torch should remain because it is locked
    expect(result.goldEarned).toBe(50);
    expect(result.itemsSold).toBe(2);
    expect(result.state.session.gold).toBe(150);
    expect(result.state.session.loot.map((i) => i.name)).toEqual(['Meat', 'Torch']);
  });
});
