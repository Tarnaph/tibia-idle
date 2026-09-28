import type { EquipmentDefinition } from '../../content-schema/src';
import type {
  CharacterEquipmentSlot,
  CharacterState,
  GameContent,
  GameState,
  LootStack,
} from './types';
import { activeCharacterOf } from './party';

export interface CharacterEquipmentResult {
  ok: boolean;
  character: CharacterState;
  error?: string;
}

export interface EquipmentStateResult {
  ok: boolean;
  state: GameState;
  error?: string;
}

export type EquipmentTransferSource =
  | { kind: 'inventory'; itemId: number }
  | { kind: 'equipped'; slot: CharacterEquipmentSlot };

export type EquipmentTransferTarget =
  | { kind: 'inventory' }
  | { kind: 'inventory-index'; index: number }
  | { kind: 'auto-slot' }
  | { kind: 'slot'; slot: CharacterEquipmentSlot };

const armorSlotMap: Partial<Record<CharacterEquipmentSlot, EquipmentDefinition['slot']>> = {
  head: 'head',
  armor: 'armor',
  legs: 'legs',
  boots: 'boots',
  ring: 'ring',
  neck: 'necklace',
  backpack: 'backpack',
  ammo: 'ammo',
};

const handSlots: CharacterEquipmentSlot[] = ['leftHand', 'rightHand'];

function cloneCharacter(character: CharacterState): CharacterState {
  return {
    ...character,
    skills: { ...character.skills },
    equipment: { ...character.equipment },
    inventory: { equipmentIds: [...character.inventory.equipmentIds] },
  };
}

export function findEquipment(
  catalog: EquipmentDefinition[],
  itemId: number | null,
): EquipmentDefinition | undefined {
  return itemId === null ? undefined : catalog.find((item) => item.id === itemId);
}

export function isCompatibleEquipmentSlot(
  item: EquipmentDefinition,
  slot: CharacterEquipmentSlot,
): boolean {
  if (item.slot === 'hand') return handSlots.includes(slot);
  return armorSlotMap[slot] === item.slot;
}

function meetsRequirements(character: CharacterState, item: EquipmentDefinition): boolean {
  if (item.requirements.level && character.level < item.requirements.level) return false;
  if (item.requirements.magicLevel && character.skills.magicLevel < item.requirements.magicLevel) return false;
  if (item.requirements.vocations?.length && !item.requirements.vocations.includes(character.vocation) && !item.requirements.vocations.includes(character.baseVocation)) return false;
  return true;
}

function isMeleeWeapon(item: EquipmentDefinition | undefined): boolean {
  return item?.weaponType === 'sword' || item?.weaponType === 'axe' || item?.weaponType === 'club'
    || item?.weaponType === 'distance' || item?.weaponType === 'wand';
}

export function equipCharacterItem(
  character: CharacterState,
  item: EquipmentDefinition,
  slot: CharacterEquipmentSlot,
  catalog: EquipmentDefinition[],
): CharacterEquipmentResult {
  if (!isCompatibleEquipmentSlot(item, slot)) {
    return { ok: false, character, error: `${item.name} is incompatible with ${slot}.` };
  }
  if (!meetsRequirements(character, item)) {
    return { ok: false, character, error: `${character.name} does not meet the item requirements.` };
  }

  const next = cloneCharacter(character);

  if (item.slot === 'hand') {
    const otherSlot: CharacterEquipmentSlot = slot === 'leftHand' ? 'rightHand' : 'leftHand';
    const currentOther = findEquipment(catalog, next.equipment[otherSlot]);

    if (item.twoHanded) {
      next.equipment[slot] = item.id;
      next.equipment[otherSlot] = null;
      return { ok: true, character: next };
    }

    if (currentOther?.twoHanded) {
      next.equipment[otherSlot] = null;
    }

    for (const handSlot of handSlots) {
      if (next.equipment[handSlot] === item.id) next.equipment[handSlot] = null;
    }

    const otherAfterClear = findEquipment(catalog, next.equipment[otherSlot]);
    const sameCategoryInOtherHand =
      (item.weaponType === 'shield' && otherAfterClear?.weaponType === 'shield') ||
      (isMeleeWeapon(item) && isMeleeWeapon(otherAfterClear));
    if (sameCategoryInOtherHand) next.equipment[otherSlot] = null;
  }

  next.equipment[slot] = item.id;
  return { ok: true, character: next };
}

export function unequipCharacterSlot(
  character: CharacterState,
  slot: CharacterEquipmentSlot,
  catalog: EquipmentDefinition[],
): CharacterState {
  const next = cloneCharacter(character);
  const item = findEquipment(catalog, next.equipment[slot]);
  if (item?.twoHanded) {
    next.equipment.leftHand = null;
    next.equipment.rightHand = null;
  } else {
    next.equipment[slot] = null;
  }
  return next;
}

export function preferredSlotForItem(item: EquipmentDefinition): CharacterEquipmentSlot | null {
  if (item.slot === 'head' || item.slot === 'armor' || item.slot === 'legs' || item.slot === 'boots' || item.slot === 'ring') {
    return item.slot;
  }
  if (item.slot === 'necklace') return 'neck';
  if (item.slot === 'backpack') return 'backpack';
  if (item.slot === 'ammo') return 'ammo';
  if (item.slot === 'hand') return item.weaponType === 'shield' ? 'rightHand' : 'leftHand';
  return null;
}

export function availableOwnedEquipmentIds(state: GameState): number[] {
  const character = activeCharacterOf(state);
  const equipped = new Set(
    Object.values(character.equipment).filter((itemId): itemId is number => itemId !== null),
  );
  return character.inventory.equipmentIds.filter((itemId) => !equipped.has(itemId));
}

export function reorderOwnedEquipment(state: GameState, fromIndex: number, toIndex: number): GameState {
  const character = activeCharacterOf(state);
  const ids = [...character.inventory.equipmentIds];
  if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length || fromIndex === toIndex) return state;
  const [item] = ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, item);
  return { ...state, session: { ...state.session, characters: state.session.characters.map((candidate) => candidate.id === character.id
    ? { ...candidate, inventory: { equipmentIds: ids } }
    : candidate) } };
}

export function inventoryWeight(character: CharacterState, catalog: EquipmentDefinition[]): number {
  return character.inventory.equipmentIds.reduce((total, itemId) => total + (findEquipment(catalog, itemId)?.weight?.ounces ?? 0), 0);
}

/** Mirrors Player::capacity=40000 and the per-level vocation cap gain, expressed in oz. */
export function characterCapacity(character: CharacterState, content: GameContent): number {
  const vocation = content.vocations.find((candidate) => candidate.name === character.vocation);
  return 400 + Math.max(0, character.level - 1) * (vocation?.gainCap ?? 0);
}

export function transferOwnedEquipment(
  state: GameState,
  source: EquipmentTransferSource,
  target: EquipmentTransferTarget,
  content: GameContent,
): EquipmentStateResult {
  const character = activeCharacterOf(state);
  const itemId = source.kind === 'inventory'
    ? source.itemId
    : character.equipment[source.slot];
  if (itemId === null || itemId === undefined) {
    return { ok: false, state, error: 'There is no item at the transfer origin.' };
  }
  if (!character.inventory.equipmentIds.includes(itemId)) {
    return { ok: false, state, error: 'Item is not owned by this character.' };
  }
  const item = findEquipment(content.equipment, itemId);
  if (!item) return { ok: false, state, error: `Unknown equipment ${itemId}.` };

  if (target.kind === 'auto-slot') {
    const slot = preferredSlotForItem(item);
    if (!slot) return { ok: false, state, error: `${item.name} cannot be equipped.` };
    return transferOwnedEquipment(
      state,
      source,
      { kind: 'slot', slot },
      content,
    );
  }

  if (target.kind === 'inventory-index') {
    if (source.kind !== 'inventory') return transferOwnedEquipment(state, source, { kind: 'inventory' }, content);
    const fromIndex = character.inventory.equipmentIds.indexOf(source.itemId);
    return { ok: true, state: reorderOwnedEquipment(state, fromIndex, target.index) };
  }

  if (target.kind === 'inventory') {
    if (source.kind !== 'equipped') {
      return { ok: false, state, error: 'The item is already in the inventory.' };
    }
    return {
      ok: true,
      state: {
        ...state,
        session: {
          ...state.session,
          characters: state.session.characters.map((candidate) => candidate.id === character.id
            ? unequipCharacterSlot(character, source.slot, content.equipment)
            : candidate),
        },
      },
    };
  }

  if (source.kind === 'equipped' && source.slot === target.slot) {
    return { ok: false, state, error: `${item.name} is already equipped in ${target.slot}.` };
  }
  const result = equipCharacterItem(character, item, target.slot, content.equipment);
  if (!result.ok) return { ok: false, state, error: result.error };
  return {
    ok: true,
    state: {
      ...state,
      session: { ...state.session, characters: state.session.characters.map((candidate) => candidate.id === character.id ? result.character : candidate) },
    },
  };
}

export function toggleOwnedEquipment(
  state: GameState,
  itemId: number,
  content: GameContent,
): EquipmentStateResult {
  const item = findEquipment(content.equipment, itemId);
  if (!item) return { ok: false, state, error: `Unknown equipment ${itemId}.` };

  const equippedSlots = (Object.entries(activeCharacterOf(state).equipment) as Array<[
    CharacterEquipmentSlot,
    number | null,
  ]>).filter(([, equippedId]) => equippedId === itemId);

  if (equippedSlots.length > 0) {
    return transferOwnedEquipment(state, { kind: 'equipped', slot: equippedSlots[0][0] }, { kind: 'inventory' }, content);
  }
  return transferOwnedEquipment(
    state,
    { kind: 'inventory', itemId },
    { kind: 'auto-slot' },
    content,
  );
}

export function unequipOwnedSlot(
  state: GameState,
  slot: CharacterEquipmentSlot,
  content: GameContent,
): EquipmentStateResult {
  return transferOwnedEquipment(state, { kind: 'equipped', slot }, { kind: 'inventory' }, content);
}

export function unequipSlotToBag(
  state: GameState,
  characterId: string,
  slot: CharacterEquipmentSlot,
  content: GameContent,
): GameState {
  const character = state.session.characters.find((c) => c.id === characterId);
  if (!character) return state;
  const itemId = (character.equipment as Record<string, number | null>)[slot];
  if (itemId === null || itemId === undefined) return state;

  const itemDef = findEquipment(content.equipment, itemId);
  const itemName = itemDef?.name ?? `Item #${itemId}`;

  const updatedEquipment = { ...character.equipment, [slot]: null };
  const updatedCharacter = { ...character, equipment: updatedEquipment };

  const bag = [...(state.session.bag ?? [])];
  const loot = [...state.session.loot];

  const unequippedStack: LootStack = {
    itemId,
    name: itemName,
    amount: 1,
  };

  if (bag.length < 12) {
    bag.push(unequippedStack);
  } else {
    const existingInLoot = loot.find((s) => s.itemId === itemId);
    if (existingInLoot) {
      existingInLoot.amount += 1;
    } else {
      loot.push(unequippedStack);
    }
  }

  return {
    ...state,
    session: {
      ...state.session,
      bag,
      loot,
      characters: state.session.characters.map((c) => (c.id === characterId ? updatedCharacter : c)),
    },
  };
}

export function equipItemFromContainer(
  state: GameState,
  characterId: string,
  itemId: number,
  content: GameContent,
  requestedSlot?: CharacterEquipmentSlot,
): GameState {
  const character = state.session.characters.find((c) => c.id === characterId);
  if (!character) return state;

  const itemDef = findEquipment(content.equipment, itemId);
  if (!itemDef) return state;

  let targetSlot: CharacterEquipmentSlot | null = null;
  if (requestedSlot) {
    if (!isCompatibleEquipmentSlot(itemDef, requestedSlot)) {
      return state;
    }
    targetSlot = requestedSlot;
  } else {
    targetSlot = preferredSlotForItem(itemDef);
  }
  if (!targetSlot) return state;

  if (!meetsRequirements(character, itemDef)) {
    return state;
  }

  const bag = [...(state.session.bag ?? [])];
  const loot = [...state.session.loot];

  const bagIndex = bag.findIndex((s) => s.itemId === itemId);
  const lootIndex = bagIndex === -1 ? loot.findIndex((s) => s.itemId === itemId) : -1;

  if (bagIndex === -1 && lootIndex === -1) {
    return state;
  }

  const pushStackToInventory = (idToReturn: number) => {
    const prevDef = findEquipment(content.equipment, idToReturn);
    const prevStack: LootStack = {
      itemId: idToReturn,
      name: prevDef?.name ?? `Item #${idToReturn}`,
      amount: 1,
    };
    if (bag.length < 12) {
      bag.push(prevStack);
    } else {
      const existingInLoot = loot.find((s) => s.itemId === idToReturn);
      if (existingInLoot) existingInLoot.amount += 1;
      else loot.push(prevStack);
    }
  };

  if (bagIndex !== -1) {
    if (bag[bagIndex].amount > 1) {
      bag[bagIndex] = { ...bag[bagIndex], amount: bag[bagIndex].amount - 1 };
    } else {
      bag.splice(bagIndex, 1);
    }
  } else if (lootIndex !== -1) {
    if (loot[lootIndex].amount > 1) {
      loot[lootIndex] = { ...loot[lootIndex], amount: loot[lootIndex].amount - 1 };
    } else {
      loot.splice(lootIndex, 1);
    }
  }

  const updatedEquipment: Record<CharacterEquipmentSlot, number | null> = { ...character.equipment };

  const previousItemId = updatedEquipment[targetSlot];
  if (previousItemId !== null && previousItemId !== undefined) {
    pushStackToInventory(previousItemId);
    updatedEquipment[targetSlot] = null;
  }

  if (itemDef.slot === 'hand') {
    const otherSlot: CharacterEquipmentSlot = targetSlot === 'leftHand' ? 'rightHand' : 'leftHand';
    const otherItemId = updatedEquipment[otherSlot];
    if (otherItemId !== null && otherItemId !== undefined) {
      const otherDef = findEquipment(content.equipment, otherItemId);
      if (itemDef.twoHanded || otherDef?.twoHanded) {
        pushStackToInventory(otherItemId);
        updatedEquipment[otherSlot] = null;
      } else {
        const sameCategoryInOtherHand =
          (itemDef.weaponType === 'shield' && otherDef?.weaponType === 'shield') ||
          (isMeleeWeapon(itemDef) && isMeleeWeapon(otherDef));
        if (sameCategoryInOtherHand) {
          pushStackToInventory(otherItemId);
          updatedEquipment[otherSlot] = null;
        }
      }
    }
  }

  updatedEquipment[targetSlot] = itemId;

  const equipmentIds = character.inventory.equipmentIds.includes(itemId)
    ? character.inventory.equipmentIds
    : [...character.inventory.equipmentIds, itemId];

  const updatedCharacter = {
    ...character,
    equipment: updatedEquipment,
    inventory: { ...character.inventory, equipmentIds },
  };

  return {
    ...state,
    session: {
      ...state.session,
      bag,
      loot,
      characters: state.session.characters.map((c) => (c.id === characterId ? updatedCharacter : c)),
    },
  };
}

/**
 * Resolves the authentic Tibia projectile ID (1-50) for distance weapons and ammunition.
 *
 * Tibia Projectile Constants:
 * - CONST_ANI_SPEAR: 1
 * - CONST_ANI_BOLT: 2
 * - CONST_ANI_ARROW: 3
 * - CONST_ANI_POISONARROW: 6
 * - CONST_ANI_BURSTARROW: 7
 * - CONST_ANI_THROWINGSTAR: 8
 * - CONST_ANI_THROWINGKNIFE: 9
 * - CONST_ANI_SMALLSTONE: 10
 * - CONST_ANI_POWERBOLT: 14
 * - CONST_ANI_INFERNALBOLT: 16
 * - CONST_ANI_HUNTINGSPEAR: 17
 * - CONST_ANI_ENCHANTEDSPEAR: 18
 * - CONST_ANI_REDSTAR / ASSASSINSTAR: 19
 * - CONST_ANI_GREENSTAR: 20
 * - CONST_ANI_ROYALSPEAR: 21
 * - CONST_ANI_SNIPERARROW: 22
 * - CONST_ANI_ONYXARROW: 23
 * - CONST_ANI_PIERCINGBOLT: 24
 * - CONST_ANI_ETHEREALSPEAR: 28 (Spells like Exori Con)
 * - CONST_ANI_FLASHARROW: 33
 * - CONST_ANI_FLAMMINGARROW: 34
 * - CONST_ANI_SHIVERARROW: 35
 * - CONST_ANI_EARTHARROW: 40
 * - CONST_ANI_TARSALARROW: 44
 * - CONST_ANI_VORTEXBOLT: 45
 * - CONST_ANI_DRILLBOLT: 47
 * - CONST_ANI_PRISMATICBOLT: 48
 * - CONST_ANI_CRYSTALLINEARROW: 49
 */
export function resolveDistanceProjectileId(
  weapon?: EquipmentDefinition | null,
  ammo?: EquipmentDefinition | null,
): number {
  // 1. Thrown distance weapons equipped in hand (Spears, Stars, Stones) ALWAYS take priority over backpack ammo
  if (weapon) {
    const wepName = (weapon.name || '').toLowerCase();
    if (wepName.includes('hunting spear')) return 17;
    if (wepName.includes('enchanted spear')) return 18;
    if (wepName.includes('royal spear')) return 21;
    if (wepName.includes('glooth spear')) return 49;
    if (wepName.includes('spear')) return 1;

    if (wepName.includes('assassin star') || wepName.includes('red star')) return 19;
    if (wepName.includes('green star')) return 20;
    if (wepName.includes('throwing star') || wepName.includes('star')) return 8;
    if (wepName.includes('throwing knife') || wepName.includes('knife')) return 9;
    if (wepName.includes('small stone')) return 10;
    if (wepName.includes('snowball')) return 13;
  }

  // 2. Bow/Crossbow ammunition (Arrows, Bolts, Special ammo)
  if (ammo) {
    const ammoName = (ammo.name || '').toLowerCase();
    if (ammoName.includes('poison arrow')) return 6;
    if (ammoName.includes('burst arrow')) return 7;
    if (ammoName.includes('sniper arrow')) return 22;
    if (ammoName.includes('onyx arrow')) return 23;
    if (ammoName.includes('flash arrow')) return 33;
    if (ammoName.includes('flaming arrow') || ammoName.includes('flamming arrow')) return 34;
    if (ammoName.includes('shiver arrow')) return 35;
    if (ammoName.includes('earth arrow') || ammoName.includes('envenomed arrow')) return 40;
    if (ammoName.includes('tarsal arrow')) return 44;
    if (ammoName.includes('crystalline arrow')) return 49;
    if (ammoName.includes('arrow')) return 3;

    if (ammoName.includes('power bolt')) return 14;
    if (ammoName.includes('infernal bolt')) return 16;
    if (ammoName.includes('piercing bolt')) return 24;
    if (ammoName.includes('vortex bolt')) return 45;
    if (ammoName.includes('drill bolt')) return 47;
    if (ammoName.includes('prismatic bolt')) return 48;
    if (ammoName.includes('bolt')) return 2;

    if (ammoName.includes('small stone')) return 10;
    if (ammoName.includes('snowball')) return 13;
  }

  // 3. Fallback for Bows/Crossbows without explicit ammo
  if (weapon) {
    const wepName = (weapon.name || '').toLowerCase();
    // Crossbow weapons default to standard Bolt (2)
    if (wepName.includes('crossbow') || wepName.includes('arbalest')) return 2;
    // Bow weapons default to standard Arrow (3)
    if (wepName.includes('bow')) return 3;
  }

  // Default fallback for distance attacks: standard Arrow (3)
  return 3;
}

