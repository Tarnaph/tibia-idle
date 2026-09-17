import type { CharacterSkills, CharacterEquipmentSlot } from '../../../packages/domain/src/types';
import { findEquipment } from '../../../packages/domain/src/equipment';

export const SKILL_ID_TO_KEY: Record<number, keyof CharacterSkills> = {
  0: 'fist',
  1: 'club',
  2: 'sword',
  3: 'axe',
  4: 'distance',
  5: 'shielding',
  6: 'fishing',
  7: 'magicLevel',
};

export const SKILL_NAME_TO_KEY: Record<string, keyof CharacterSkills> = {
  fist: 'fist',
  'fist fighting': 'fist',
  club: 'club',
  'club fighting': 'club',
  sword: 'sword',
  'sword fighting': 'sword',
  axe: 'axe',
  'axe fighting': 'axe',
  distance: 'distance',
  'distance fighting': 'distance',
  shielding: 'shielding',
  fishing: 'fishing',
  magiclevel: 'magicLevel',
  'magic level': 'magicLevel',
  magic: 'magicLevel',
};

export function resolveSkillKey(sk: { skillId?: number; skillName?: string }): keyof CharacterSkills | undefined {
  if (typeof sk.skillId === 'number' && SKILL_ID_TO_KEY[sk.skillId] !== undefined) {
    return SKILL_ID_TO_KEY[sk.skillId];
  }
  if (sk.skillName) {
    const norm = sk.skillName.toLowerCase().trim();
    if (SKILL_NAME_TO_KEY[norm] !== undefined) {
      return SKILL_NAME_TO_KEY[norm];
    }
  }
  return undefined;
}

export interface HydratedInventoryResult {
  equipment: Record<CharacterEquipmentSlot, number | null>;
  equipmentIds: number[];
  gold: number;
  bag: Array<{ itemId?: number; name: string; amount: number }>;
  loot: Array<{ itemId?: number; name: string; amount: number }>;
}

export function parseInventoryData(
  dbInventory: any[],
  contentEquipment: any[]
): HydratedInventoryResult {
  let gold = 0;
  const bag: Array<{ itemId?: number; name: string; amount: number }> = [];
  const loot: Array<{ itemId?: number; name: string; amount: number }> = [];
  const equipment: Record<CharacterEquipmentSlot, number | null> = {
    head: null,
    armor: null,
    legs: null,
    boots: null,
    leftHand: null,
    rightHand: null,
  };
  const equipmentIds: number[] = [];

  const equipSlots: Record<string, CharacterEquipmentSlot> = {
    head: 'head',
    armor: 'armor',
    legs: 'legs',
    boots: 'boots',
    feet: 'boots',
    lefthand: 'leftHand',
    righthand: 'rightHand',
    left: 'leftHand',
    right: 'rightHand',
  };

  if (Array.isArray(dbInventory)) {
    dbInventory.forEach((item: any) => {
      const serverId = Number(item.serverId) || 0;
      const count = Number(item.count) || 1;
      const normSlot = typeof item.slot === 'string' ? item.slot.toLowerCase() : '';
      const targetSlot = equipSlots[normSlot];

      if (item.slot === 'gold' || serverId === 2148 || item.name === 'Gold Coin') {
        gold += count;
      } else if (serverId === 2152 || item.name === 'Platinum Coin') {
        gold += count * 100;
      } else if (targetSlot) {
        equipment[targetSlot] = serverId;
        if (!equipmentIds.includes(serverId)) {
          equipmentIds.push(serverId);
        }
      } else if (normSlot.startsWith('bag_') || normSlot.startsWith('backpack_bag_')) {
        bag.push({
          itemId: serverId,
          name: item.name || 'Item',
          amount: count,
        });
        if (findEquipment(contentEquipment, serverId) && !equipmentIds.includes(serverId)) {
          equipmentIds.push(serverId);
        }
      } else if (normSlot.startsWith('backpack_loot_') || normSlot.startsWith('loot_')) {
        loot.push({
          itemId: serverId,
          name: item.name || 'Loot',
          amount: count,
        });
        if (findEquipment(contentEquipment, serverId) && !equipmentIds.includes(serverId)) {
          equipmentIds.push(serverId);
        }
      } else if (serverId) {
        if (findEquipment(contentEquipment, serverId)) {
          if (!equipmentIds.includes(serverId)) {
            equipmentIds.push(serverId);
          }
        } else {
          loot.push({
            itemId: serverId,
            name: item.name || 'Item',
            amount: count,
          });
        }
      }
    });
  }

  return { equipment, equipmentIds, gold, bag, loot };
}

/**
 * Merges local and server loot/bag stacks monotonically so items obtained during active gameplay are not lost.
 */
export function mergeLootStacks(
  localStacks: Array<{ itemId?: number; name: string; amount: number }> = [],
  serverStacks: Array<{ itemId?: number; name: string; amount: number }> = []
): Array<{ itemId?: number; name: string; amount: number }> {
  const map = new Map<string, { itemId?: number; name: string; amount: number }>();

  for (const item of localStacks) {
    const key = item.itemId ? `id_${item.itemId}` : `name_${item.name}`;
    map.set(key, { ...item });
  }

  for (const srvItem of serverStacks) {
    const key = srvItem.itemId ? `id_${srvItem.itemId}` : `name_${srvItem.name}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount = Math.max(existing.amount, srvItem.amount);
    } else {
      map.set(key, { ...srvItem });
    }
  }

  return Array.from(map.values());
}

