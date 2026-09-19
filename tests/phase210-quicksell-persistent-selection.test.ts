import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  QUICK_SELL_STORAGE_KEY,
  loadSavedQuickSellIds,
  saveQuickSellIds,
} from '../apps/web/components/QuickSellWindow';

describe('Phase 210: Quick Sell Persistent Item Selection (localStorage)', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  it('returns null when no quick sell items have been saved yet', () => {
    expect(loadSavedQuickSellIds()).toBeNull();
  });

  it('persists selected item IDs to localStorage correctly', () => {
    const selected = new Set([2148, 2152, 2381]);
    saveQuickSellIds(selected);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      QUICK_SELL_STORAGE_KEY,
      JSON.stringify([2148, 2152, 2381])
    );

    const loaded = loadSavedQuickSellIds();
    expect(loaded).toEqual([2148, 2152, 2381]);
  });

  it('handles malformed or corrupted JSON in localStorage safely without throwing', () => {
    store[QUICK_SELL_STORAGE_KEY] = '{invalid:json,,';
    expect(loadSavedQuickSellIds()).toBeNull();

    store[QUICK_SELL_STORAGE_KEY] = '"not an array"';
    expect(loadSavedQuickSellIds()).toBeNull();
  });

  it('filters non-numeric values gracefully', () => {
    store[QUICK_SELL_STORAGE_KEY] = JSON.stringify([2148, 'abc', null, 2152]);
    const loaded = loadSavedQuickSellIds();
    expect(loaded).toEqual([2148, 2152]);
  });

  it('correctly remembers deselected items across openings', () => {
    // User had 3 items: 101, 102, 103. User deselected 102, so only [101, 103] were saved.
    saveQuickSellIds(new Set([101, 103]));

    const currentBackpack = [
      { itemId: 101, name: 'Gold Coin', amount: 100 },
      { itemId: 102, name: 'Dragon Ham', amount: 5 }, // Deselected by user previously
      { itemId: 103, name: 'Plate Armor', amount: 1 },
    ];

    const saved = loadSavedQuickSellIds();
    expect(saved).not.toBeNull();
    const savedSet = new Set(saved!);

    const restoredSelection = new Set<number>();
    for (const stack of currentBackpack) {
      if (savedSet.has(stack.itemId)) {
        restoredSelection.add(stack.itemId);
      }
    }

    expect(restoredSelection.has(101)).toBe(true);
    expect(restoredSelection.has(102)).toBe(false); // Remained unselected
    expect(restoredSelection.has(103)).toBe(true);
    expect(restoredSelection.size).toBe(2);
  });

  it('select all and deselect all update localStorage state', () => {
    const allItems = [101, 102, 103];

    // Select all
    const allSet = new Set(allItems);
    saveQuickSellIds(allSet);
    expect(loadSavedQuickSellIds()).toEqual([101, 102, 103]);

    // Deselect all
    const emptySet = new Set<number>();
    saveQuickSellIds(emptySet);
    expect(loadSavedQuickSellIds()).toEqual([]);
  });
});
