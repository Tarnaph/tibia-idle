import type { ItemEconomyDefinition, ItemSellOffer } from '../../content-schema/src';
import type { GameContent, GameState, ItemLootPreference, LootStack } from './types';

export interface SellLootResult { state: GameState; goldEarned: number; soldStacks: number; unsoldStacks: number }

export interface ResolvedSellPrice { price: number; sourceType: 'styller' | 'web'; offer: ItemSellOffer }

/** STYLLER is authoritative. Web provenance is considered only when no internal sell offer exists. */
export function preferredSellPrice(item: ItemEconomyDefinition): ResolvedSellPrice | null {
  const internal = item.offers.filter((offer) => offer.sourceKind !== 'web-reference');
  const web = item.offers.filter((offer) => offer.sourceKind === 'web-reference');
  const candidates = internal.length > 0 ? internal : web;
  if (candidates.length === 0) return null;
  const offer = candidates.reduce((best, candidate) => candidate.price > best.price ? candidate : best);
  return { price: offer.price, sourceType: offer.sourceKind === 'web-reference' ? 'web' : 'styller', offer };
}

export function sellAllLoot(state: GameState, content: GameContent): SellLootResult {
  const prices = new Map(content.economy.items.map((item) => [item.itemId, preferredSellPrice(item)?.price ?? null]));
  let goldEarned = 0;
  let soldStacks = 0;
  const remaining = state.session.loot.filter((stack) => {
    if (stack.itemId !== undefined && itemLootPreference(state, stack.itemId).lockSell) return true;
    const price = stack.itemId === undefined ? null : prices.get(stack.itemId);
    if (price === null || price === undefined) return true;
    goldEarned += price * stack.amount;
    soldStacks += 1;
    return false;
  });
  return {
    state: { ...state, session: { ...state.session, gold: state.session.gold + goldEarned, loot: remaining } },
    goldEarned, soldStacks, unsoldStacks: remaining.length,
  };
}

export function itemLootPreference(state: GameState, itemId: number): ItemLootPreference {
  return state.session.itemLootPreferences[String(itemId)] ?? { itemId, autoLoot: true, lockSell: false, quickSell: false };
}

export function updateItemLootPreference(state: GameState, itemId: number, patch: Partial<Omit<ItemLootPreference, 'itemId'>>): GameState {
  const preference = { ...itemLootPreference(state, itemId), ...patch, itemId };
  return { ...state, session: { ...state.session, itemLootPreferences: { ...state.session.itemLootPreferences, [String(itemId)]: preference } } };
}

export function sellLootStack(state: GameState, content: GameContent, itemId: number): SellLootResult {
  const preference = itemLootPreference(state, itemId);
  const stack = state.session.loot.find((candidate) => candidate.itemId === itemId);
  const economy = content.economy.items.find((candidate) => candidate.itemId === itemId);
  const price = economy ? preferredSellPrice(economy)?.price ?? null : null;
  if (!stack || price === null || preference.lockSell) return { state, goldEarned: 0, soldStacks: 0, unsoldStacks: state.session.loot.length };
  const goldEarned = price * stack.amount;
  return { state: { ...state, session: { ...state.session, gold: state.session.gold + goldEarned, loot: state.session.loot.filter((candidate) => candidate !== stack) } }, goldEarned, soldStacks: 1, unsoldStacks: state.session.loot.length - 1 };
}

export type ItemContainerKind = 'backpack' | 'bag' | 'depot';

export function getContainerItems(state: GameState, container: ItemContainerKind): LootStack[] {
  if (container === 'bag') return state.session.bag ?? [];
  if (container === 'depot') return state.session.depot ?? [];
  return state.session.loot;
}

export function setContainerItems(state: GameState, container: ItemContainerKind, items: LootStack[]): GameState {
  if (container === 'bag') {
    return { ...state, session: { ...state.session, bag: items } };
  }
  if (container === 'depot') {
    return { ...state, session: { ...state.session, depot: items } };
  }
  return { ...state, session: { ...state.session, loot: items } };
}

export function transferItemBetweenContainers(
  state: GameState,
  from: ItemContainerKind,
  to: ItemContainerKind,
  itemIndex: number,
): GameState {
  if (from === to) return state;
  const sourceItems = [...getContainerItems(state, from)];
  if (itemIndex < 0 || itemIndex >= sourceItems.length) return state;

  const [transferred] = sourceItems.splice(itemIndex, 1);
  const targetItems = [...getContainerItems(state, to)];

  const existingIndex = targetItems.findIndex((i) => i.itemId !== undefined && i.itemId === transferred.itemId);
  if (existingIndex !== -1) {
    targetItems[existingIndex] = {
      ...targetItems[existingIndex],
      amount: targetItems[existingIndex].amount + transferred.amount,
    };
  } else {
    targetItems.push(transferred);
  }

  let nextState = setContainerItems(state, from, sourceItems);
  nextState = setContainerItems(nextState, to, targetItems);
  return nextState;
}

export function destroyContainerItem(
  state: GameState,
  container: ItemContainerKind,
  itemIndex: number,
): GameState {
  const items = [...getContainerItems(state, container)];
  if (itemIndex < 0 || itemIndex >= items.length) return state;
  items.splice(itemIndex, 1);
  return setContainerItems(state, container, items);
}

export interface QuickSellResult {
  state: GameState;
  goldEarned: number;
  itemsSold: number;
}

export function executeQuickSell(
  state: GameState,
  content: GameContent,
  selectedItemIds: number[],
): QuickSellResult {
  const selectedSet = new Set(selectedItemIds);
  const prices = new Map(content.economy.items.map((item) => [item.itemId, preferredSellPrice(item)?.price ?? null]));

  let goldEarned = 0;
  let itemsSold = 0;

  const remaining = state.session.loot.filter((stack) => {
    if (stack.itemId === undefined || !selectedSet.has(stack.itemId)) return true;
    const pref = itemLootPreference(state, stack.itemId);
    if (pref.lockSell) return true;
    const price = prices.get(stack.itemId);
    if (price === null || price === undefined) return true;

    goldEarned += price * stack.amount;
    itemsSold += stack.amount;
    return false;
  });

  return {
    state: {
      ...state,
      session: {
        ...state.session,
        gold: state.session.gold + goldEarned,
        loot: remaining,
      },
    },
    goldEarned,
    itemsSold,
  };
}

