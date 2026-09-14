import { describe, it, expect, vi } from 'vitest';
import {
  ACTION_SUPPLY_COSTS,
  getActionSupplyCost,
  ensureHealthPotionInHotbar,
} from '../packages/domain/src/hotbarActions';
import { CharacterService, VersionConflictError } from '../packages/auth/src/characterService';
import type { CharacterState, GameContent } from '../packages/domain/src/types';

describe('Phase 175 - FIX.md Deep Persistence, Hotbar & Polish Verifications', () => {
  describe('1. Hotbar Supply Costs & Potion Slot Persistence', () => {
    it('provides canonical costs for all core potions and runes', () => {
      // Health Potions
      expect(getActionSupplyCost(7618)).toBe(50); // Health Potion
      expect(getActionSupplyCost(7588)).toBe(100); // Strong Health Potion
      expect(getActionSupplyCost(7591)).toBe(190); // Great Health Potion
      expect(getActionSupplyCost(8473)).toBe(310); // Ultimate Health Potion

      // Mana Potions
      expect(getActionSupplyCost(7620)).toBe(50); // Mana Potion
      expect(getActionSupplyCost(7589)).toBe(80); // Strong Mana Potion
      expect(getActionSupplyCost(7590)).toBe(120); // Great Mana Potion

      // Core Runes
      expect(getActionSupplyCost(2268)).toBe(135); // Sudden Death
      expect(getActionSupplyCost(2304)).toBe(45); // Great Fireball
      expect(getActionSupplyCost(2313)).toBe(45); // Avalanche
      expect(getActionSupplyCost(2305)).toBe(31); // Explosion
      expect(getActionSupplyCost(2296)).toBe(37); // Stone Shower
      expect(getActionSupplyCost(2297)).toBe(37); // Thunderstorm
      expect(getActionSupplyCost(2302)).toBe(4); // Light Magic Missile
      expect(getActionSupplyCost(2311)).toBe(12); // Heavy Magic Missile
      expect(getActionSupplyCost(2315)).toBe(210); // Chameleon
    });

    it('does NOT inject or overwrite potion slots when player intentionally cleared or configured the hotbar', () => {
      const mockChar: CharacterState = {
        id: 'char-custom-1',
        name: 'Custom Knight',
        vocation: 'Knight',
        level: 100,
        experience: 500000,
        hp: 1200,
        maxHp: 1200,
        mana: 300,
        maxMana: 300,
        skills: { sword: 80, club: 10, axe: 10, distance: 10, shielding: 80, magic: 4 },
        equipment: { weapon: null, shield: null, armor: null, helmet: null, legs: null, boots: null },
        inventory: [],
        hotbar: [201, 202], // Exori, Exori Gran. Slot 3 was intentionally cleared by player
        backpack: [],
        conditions: [],
      } as any;

      const mockContent: GameContent = {
        spells: [],
        monsters: [],
        hunts: [],
      } as any;

      const returnedPotionId = ensureHealthPotionInHotbar(mockChar, mockContent);
      // Potion is not forcibly injected; returns undefined and hotbar retains player configuration
      expect(returnedPotionId).toBeUndefined();
      expect(mockChar.hotbar).toHaveLength(2);
      expect(mockChar.hotbar).toEqual([201, 202]);
    });

    it('populates default hotbar only for freshly created characters with zero hotbar actions', () => {
      const freshChar: CharacterState = {
        id: 'char-fresh-1',
        name: 'Fresh Knight',
        vocation: 'Knight',
        level: 1,
        experience: 0,
        hp: 150,
        maxHp: 150,
        mana: 50,
        maxMana: 50,
        skills: { sword: 10, club: 10, axe: 10, distance: 10, shielding: 10, magic: 0 },
        equipment: { weapon: null, shield: null, armor: null, helmet: null, legs: null, boots: null },
        inventory: [],
        hotbar: [], // Fresh character with empty hotbar
        backpack: [],
        conditions: [],
      } as any;

      const mockContent: GameContent = {
        spells: [],
        monsters: [],
        hunts: [],
      } as any;

      const returnedPotionId = ensureHealthPotionInHotbar(freshChar, mockContent);
      expect(returnedPotionId).toBe(7618); // Health Potion
      expect(freshChar.hotbar.length).toBeGreaterThan(0);
      expect(freshChar.hotbar[0]).toBe(7618);
    });
  });

  describe('2. Differential Inventory Persistence for Squad Alts', () => {
    it('performs targeted slot replacement when replaceFullInventory is false', async () => {
      const deleteManyMock = vi.fn().mockResolvedValue({ count: 2 });
      const createManyMock = vi.fn().mockResolvedValue({ count: 2 });
      const findUniqueMock = vi.fn().mockResolvedValue({
        id: 'alt-char-1',
        level: 50,
        experience: BigInt(100000),
        saveVersion: 3,
      });
      const updateMock = vi.fn().mockResolvedValue({
        id: 'alt-char-1',
        level: 50,
        experience: BigInt(100000),
        saveVersion: 4,
      });

      const prismaMock = {
        character: {
          findUnique: findUniqueMock,
          update: updateMock,
        },
        $transaction: vi.fn(async (cb: any) => {
          return cb({
            character: {
              findUnique: findUniqueMock,
              update: updateMock,
            },
            inventoryItem: {
              deleteMany: deleteManyMock,
              createMany: createManyMock,
            },
          });
        }),
      } as any;

      const service = new CharacterService(prismaMock);

      // Save alt progress with 2 equipment slots, preserving backpacks and consumables
      const result = await service.saveCharacterProgress('alt-char-1', {
        level: 50,
        experience: BigInt(100000),
        saveVersion: 3,
        replaceFullInventory: false,
        inventory: [
          { serverId: 2463, slot: 'armor', count: 1, name: 'Plate Armor' },
          { serverId: 2647, slot: 'legs', count: 1, name: 'Plate Legs' },
        ],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('alt-char-1');
      expect(deleteManyMock).toHaveBeenCalledTimes(1);

      // CRITICAL: deleteMany MUST target only the incoming slots, NOT all character items!
      expect(deleteManyMock).toHaveBeenCalledWith({
        where: {
          characterId: 'alt-char-1',
          slot: { in: ['armor', 'legs'] },
        },
      });

      expect(createManyMock).toHaveBeenCalledTimes(1);
    });

    it('performs full inventory deletion when replaceFullInventory is true (main character)', async () => {
      const deleteManyMock = vi.fn().mockResolvedValue({ count: 10 });
      const createManyMock = vi.fn().mockResolvedValue({ count: 4 });
      const findUniqueMock = vi.fn().mockResolvedValue({
        id: 'main-char-1',
        level: 120,
        experience: BigInt(1500000),
        saveVersion: 10,
      });
      const updateMock = vi.fn().mockResolvedValue({
        id: 'main-char-1',
        level: 120,
        experience: BigInt(1500000),
        saveVersion: 11,
      });

      const prismaMock = {
        character: {
          findUnique: findUniqueMock,
          update: updateMock,
        },
        $transaction: vi.fn(async (cb: any) => {
          return cb({
            character: {
              findUnique: findUniqueMock,
              update: updateMock,
            },
            inventoryItem: {
              deleteMany: deleteManyMock,
              createMany: createManyMock,
            },
          });
        }),
      } as any;

      const service = new CharacterService(prismaMock);

      const result = await service.saveCharacterProgress('main-char-1', {
        level: 120,
        experience: BigInt(1500000),
        saveVersion: 10,
        replaceFullInventory: true,
        inventory: [
          { serverId: 2463, slot: 'armor', count: 1, name: 'Plate Armor' },
          { serverId: 2647, slot: 'legs', count: 1, name: 'Plate Legs' },
        ],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('main-char-1');
      expect(deleteManyMock).toHaveBeenCalledWith({
        where: { characterId: 'main-char-1' },
      });
    });
  });

  describe('3. Concurrency Protection & SaveVersion Mismatch Handling', () => {
    it('throws VersionConflictError when saveVersion in database is higher than client saveVersion', async () => {
      const findUniqueMock = vi.fn().mockResolvedValue({
        id: 'char-conflict-1',
        level: 80,
        experience: BigInt(800000),
        saveVersion: 5, // DB is at version 5
      });

      const prismaMock = {
        character: {
          findUnique: findUniqueMock,
        },
        $transaction: vi.fn(async (cb: any) => {
          return cb({
            character: {
              findUnique: findUniqueMock,
            },
          });
        }),
      } as any;

      const service = new CharacterService(prismaMock);

      // Client sends saveVersion: 4 (stale)
      await expect(
        service.saveCharacterProgress('char-conflict-1', {
          level: 79,
          experience: BigInt(750000),
          saveVersion: 4,
        })
      ).rejects.toThrow(VersionConflictError);
    });
  });
});
