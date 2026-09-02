import type { ItemEconomyDefinition, ItemSellOffer } from '../../content-schema/src';
import type { GameContent, GameState, ItemLootPreference } from './types';

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
