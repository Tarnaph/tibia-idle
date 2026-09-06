import type { ItemEconomyDefinition, ItemSellOffer } from '../../content-schema/src';
import type { GameContent, GameState, ItemLootPreference, LootStack, CharacterState, CharacterSkills } from './types';
import { experienceForLevel } from './experience';
import { vocationFor, resetCharacterVocation } from './party';

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

export const TEST_SHOP_ITEMS = {
  GOLD_PACK: 9900,
  LEVEL_UP: 9901,
  SKILL_SWORD: 9902,
  SKILL_AXE: 9903,
  SKILL_CLUB: 9904,
  SKILL_DISTANCE: 9905,
  SKILL_SHIELDING: 9906,
  SKILL_MAGIC: 9907,
  SKILL_FIST: 9908,
  SKILL_FISHING: 9909,
  LEVEL_UP_10: 9910,
  LEVEL_UP_50: 9911,
  VOCATION_RESET: 9912,
} as const;

export function isTestShopItem(itemId: number): boolean {
  return itemId >= 9900 && itemId <= 9915;
}

export function applyCharacterLevelAdvance(
  character: CharacterState,
  levels: number,
  content?: GameContent,
): CharacterState {
  const newLevel = character.level + levels;
  const newExp = experienceForLevel(newLevel);
  let gainHp = 5;
  let gainMana = 5;
  if (content) {
    try {
      const voc = vocationFor(content, character.vocation);
      gainHp = voc.gainHp ?? 5;
      gainMana = voc.gainMana ?? 5;
    } catch {
      // Fallback
    }
  } else {
    // Canonical TFS defaults
    if (character.baseVocation === 'Knight') {
      gainHp = 15;
      gainMana = 5;
    } else if (character.baseVocation === 'Paladin') {
      gainHp = 10;
      gainMana = 15;
    } else {
      gainHp = 5;
      gainMana = 30;
    }
  }

  const newMaxHp = Math.max(150, character.maxHp + levels * gainHp);
  const newMaxMana = Math.max(0, character.maxMana + levels * gainMana);

  return {
    ...character,
    level: newLevel,
    experience: newExp,
    maxHp: newMaxHp,
    currentHp: newMaxHp,
    maxMana: newMaxMana,
    currentMana: newMaxMana,
  };
}

export function applyCharacterSkillAdvance(
  character: CharacterState,
  skill: keyof CharacterSkills,
  points: number,
): CharacterState {
  const currentVal = character.skills[skill] ?? 10;
  return {
    ...character,
    skills: {
      ...character.skills,
      [skill]: currentVal + points,
    },
    skillTries: {
      ...character.skillTries,
      [skill]: 0,
    },
  };
}

export function applyTestItemEffect(
  state: GameState,
  itemId: number,
  quantity: number = 1,
  content?: GameContent,
  targetCharId?: string,
): { state: GameState; message: string } {
  const activeChar =
    state.session.characters.find(
      (c) => c.id === (targetCharId || state.session.selectedCharacterId || state.session.leaderId)
    ) ?? state.session.characters[0];

  if (itemId === TEST_SHOP_ITEMS.GOLD_PACK) {
    const goldToAdd = 10000 * quantity;
    const nextState = {
      ...state,
      session: {
        ...state.session,
        gold: state.session.gold + goldToAdd,
      },
    };
    return { state: nextState, message: `+${goldToAdd.toLocaleString()} Gold adicionado à sua carteira!` };
  }

  if (
    (itemId === TEST_SHOP_ITEMS.LEVEL_UP ||
      itemId === TEST_SHOP_ITEMS.LEVEL_UP_10 ||
      itemId === TEST_SHOP_ITEMS.LEVEL_UP_50) &&
    activeChar
  ) {
    const levelGain =
      itemId === TEST_SHOP_ITEMS.LEVEL_UP_50
        ? 50 * quantity
        : itemId === TEST_SHOP_ITEMS.LEVEL_UP_10
        ? 10 * quantity
        : 1 * quantity;
    const updatedChar = applyCharacterLevelAdvance(activeChar, levelGain, content);
    const nextState = {
      ...state,
      session: {
        ...state.session,
        characters: state.session.characters.map((c) => (c.id === activeChar.id ? updatedChar : c)),
      },
    };
    return {
      state: nextState,
      message: `[Level Up] ${activeChar.name} avançou +${levelGain} nível(is) para o Nível ${updatedChar.level}!`,
    };
  }

  const SKILL_MAP: Record<number, { key: keyof CharacterSkills; name: string }> = {
    [TEST_SHOP_ITEMS.SKILL_SWORD]: { key: 'sword', name: 'Sword Fighting' },
    [TEST_SHOP_ITEMS.SKILL_AXE]: { key: 'axe', name: 'Axe Fighting' },
    [TEST_SHOP_ITEMS.SKILL_CLUB]: { key: 'club', name: 'Club Fighting' },
    [TEST_SHOP_ITEMS.SKILL_DISTANCE]: { key: 'distance', name: 'Distance Fighting' },
    [TEST_SHOP_ITEMS.SKILL_SHIELDING]: { key: 'shielding', name: 'Shielding' },
    [TEST_SHOP_ITEMS.SKILL_MAGIC]: { key: 'magicLevel', name: 'Magic Level' },
    [TEST_SHOP_ITEMS.SKILL_FIST]: { key: 'fist', name: 'Fist Fighting' },
    [TEST_SHOP_ITEMS.SKILL_FISHING]: { key: 'fishing', name: 'Fishing' },
  };

  const skillInfo = SKILL_MAP[itemId];
  if (skillInfo && activeChar) {
    const updatedChar = applyCharacterSkillAdvance(activeChar, skillInfo.key, quantity);
    const nextState = {
      ...state,
      session: {
        ...state.session,
        characters: state.session.characters.map((c) => (c.id === activeChar.id ? updatedChar : c)),
      },
    };
    return {
      state: nextState,
      message: `[Skill Up] ${activeChar.name}: ${skillInfo.name} avançou para ${updatedChar.skills[skillInfo.key]}!`,
    };
  }

  if (itemId === TEST_SHOP_ITEMS.VOCATION_RESET && activeChar) {
    const resetRes = resetCharacterVocation(state, activeChar.id);
    return {
      state: resetRes.state,
      message: `[Vocação] Vocação de ${activeChar.name} redefinida! Escolha sua nova vocação.`,
    };
  }

  return { state, message: 'Item de teste processado com sucesso.' };
}

export interface BuyShopItemResult {
  ok: boolean;
  state: GameState;
  error?: string;
  item?: LootStack;
  message?: string;
}

export function buyShopItem(
  state: GameState,
  itemId: number,
  itemName: string,
  price: number,
  quantity: number = 1,
  content: GameContent,
): BuyShopItemResult {
  const totalPrice = price * quantity;
  if (totalPrice > 0 && state.session.gold < totalPrice) {
    return { ok: false, state, error: `Gold insuficiente. Você precisa de ${totalPrice} gold.` };
  }

  const activeChar =
    state.session.characters.find(
      (c) => c.id === (state.session.selectedCharacterId || state.session.leaderId)
    ) ?? state.session.characters[0];
  const isEquipment = content.equipment.some((e) => e.id === itemId);

  let nextState = {
    ...state,
    session: {
      ...state.session,
      gold: Math.max(0, state.session.gold - totalPrice),
    },
  };

  let testMessage: string | undefined;
  if (isTestShopItem(itemId)) {
    const effect = applyTestItemEffect(nextState, itemId, quantity, content, activeChar?.id);
    nextState = effect.state;
    testMessage = effect.message;
  }

  if (isEquipment && activeChar) {
    if (!activeChar.inventory.equipmentIds.includes(itemId)) {
      const updatedChar = {
        ...activeChar,
        inventory: {
          ...activeChar.inventory,
          equipmentIds: [...activeChar.inventory.equipmentIds, itemId],
        },
      };
      nextState = {
        ...nextState,
        session: {
          ...nextState.session,
          characters: nextState.session.characters.map((c) => (c.id === activeChar.id ? updatedChar : c)),
        },
      };
    }
  }

  const bag = [...(nextState.session.bag ?? [])];
  const loot = [...nextState.session.loot];
  const newItemStack: LootStack = { itemId, name: itemName, amount: quantity };

  if (bag.length < 12) {
    const existingIndex = bag.findIndex((b) => b.itemId === itemId);
    if (existingIndex !== -1) {
      bag[existingIndex] = { ...bag[existingIndex], amount: bag[existingIndex].amount + quantity };
    } else {
      bag.push(newItemStack);
    }
    nextState = { ...nextState, session: { ...nextState.session, bag } };
  } else {
    const existingIndex = loot.findIndex((l) => l.itemId === itemId);
    if (existingIndex !== -1) {
      loot[existingIndex] = { ...loot[existingIndex], amount: loot[existingIndex].amount + quantity };
    } else {
      loot.push(newItemStack);
    }
    nextState = { ...nextState, session: { ...nextState.session, loot } };
  }

  return { ok: true, state: nextState, item: newItemStack, message: testMessage };
}

export function useTestConsumable(
  state: GameState,
  itemId: number,
  content?: GameContent,
  characterId?: string,
): { ok: boolean; state: GameState; message?: string; error?: string } {
  if (!isTestShopItem(itemId)) {
    return { ok: false, state, error: 'Item não é um consumível de teste.' };
  }

  const bag = [...(state.session.bag ?? [])];
  const bagIndex = bag.findIndex((b) => b.itemId === itemId);
  let nextSession = { ...state.session };

  if (bagIndex !== -1) {
    if (bag[bagIndex].amount > 1) {
      bag[bagIndex] = { ...bag[bagIndex], amount: bag[bagIndex].amount - 1 };
    } else {
      bag.splice(bagIndex, 1);
    }
    nextSession.bag = bag;
  } else {
    const loot = [...nextSession.loot];
    const lootIndex = loot.findIndex((l) => l.itemId === itemId);
    if (lootIndex !== -1) {
      if (loot[lootIndex].amount > 1) {
        loot[lootIndex] = { ...loot[lootIndex], amount: loot[lootIndex].amount - 1 };
      } else {
        loot.splice(lootIndex, 1);
      }
      nextSession.loot = loot;
    }
  }

  const baseState = { ...state, session: nextSession };
  const effect = applyTestItemEffect(baseState, itemId, 1, content, characterId);
  return { ok: true, state: effect.state, message: effect.message };
}



