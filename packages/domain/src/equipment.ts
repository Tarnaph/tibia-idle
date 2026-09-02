import type { EquipmentDefinition } from '../../content-schema/src';
import type {
  CharacterEquipmentSlot,
  CharacterState,
  GameContent,
  GameState,
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
      next.equipment.leftHand = item.id;
      next.equipment.rightHand = item.id;
      return { ok: true, character: next };
    }

    if (currentOther?.twoHanded) {
      next.equipment.leftHand = null;
      next.equipment.rightHand = null;
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

export function preferredSlotForItem(item: EquipmentDefinition): CharacterEquipmentSlot {
  if (item.slot === 'hand') return item.weaponType === 'shield' ? 'rightHand' : 'leftHand';
  if (item.slot === 'ammo') return 'leftHand';
  return item.slot;
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
    return transferOwnedEquipment(
      state,
      source,
      { kind: 'slot', slot: preferredSlotForItem(item) },
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
