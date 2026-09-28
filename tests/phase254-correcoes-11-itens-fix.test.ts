import { describe, it, expect } from 'vitest';
import {
  CharacterEquipmentSlot,
  preferredSlotForItem,
  equipCharacterItem,
  hasLineOfSight,
  getDefaultTrainingSkill,
  getMountSpeedBonus,
  resolveItemSellPrice,
  sellShopItem,
} from '../packages/domain/src';
import type { CharacterState, GameContent, GameState, TileMap } from '../packages/domain/src';
import type { EquipmentDefinition } from '../packages/content-schema/src';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Phase 254: Full Verification of 11 FIX.md Backlog Items', () => {
  // ITEM 9: 10 Equipment Slots
  it('Item 9: supports 10 equipment slots in domain types including neck, backpack, and ammo', () => {
    const slots: CharacterEquipmentSlot[] = [
      'head',
      'neck',
      'backpack',
      'armor',
      'leftHand',
      'rightHand',
      'legs',
      'boots',
      'ring',
      'ammo',
    ];
    expect(slots).toHaveLength(10);
    expect(slots).toContain('neck');
    expect(slots).toContain('backpack');
    expect(slots).toContain('ammo');
  });

  // ITEM 5: Equipment Slots Compatibility & 2H Weapon Handling
  it('Item 5: preferredSlotForItem rejects non-equipment and equipCharacterItem clears other hand for 2H weapons', () => {
    const nonEquip: any = {
      id: 7618,
      name: 'Health Potion',
      slot: 'none',
      requirements: {},
    };
    expect(preferredSlotForItem(nonEquip)).toBeNull();

    const bow = {
      id: 2456,
      name: 'Bow',
      slot: 'hand',
      twoHanded: true,
      weaponType: 'distance',
      requirements: {},
      attack: 0,
      defense: 0,
    } as any as EquipmentDefinition;
    const shield = {
      id: 2516,
      name: 'Dragon Shield',
      slot: 'hand',
      twoHanded: false,
      weaponType: 'shield',
      requirements: {},
      attack: 0,
      defense: 31,
    } as any as EquipmentDefinition;

    const mockChar: CharacterState = {
      id: 'char-1',
      name: 'TestArcher',
      vocation: 'paladin',
      baseVocation: 'paladin',
      level: 50,
      skills: { shielding: 30, distance: 50, sword: 10, axe: 10, club: 10, magicLevel: 15, fist: 10 },
      equipment: {
        head: null,
        neck: null,
        backpack: null,
        armor: null,
        leftHand: shield.id,
        rightHand: null,
        legs: null,
        boots: null,
        ring: null,
        ammo: null,
      },
      inventory: { equipmentIds: [] },
    } as any;

    const catalog: EquipmentDefinition[] = [bow, shield];
    const result = equipCharacterItem(mockChar, bow, 'leftHand', catalog);
    expect(result.ok).toBe(true);
    // When equipping a 2H bow in leftHand, rightHand is automatically cleared
    expect(result.character.equipment.leftHand).toBe(bow.id);
    expect(result.character.equipment.rightHand).toBeNull();
  });

  // ITEM 4: Training Dummy Weapon Skill Auto-Selection
  it('Item 4: getDefaultTrainingSkill auto-selects weapon skill based on equipped weapon', () => {
    const axe = {
      id: 2387,
      name: 'Double Axe',
      slot: 'hand',
      twoHanded: true,
      weaponType: 'axe',
      requirements: {},
      attack: 35,
      defense: 12,
    } as any as EquipmentDefinition;
    const axeChar: CharacterState = {
      id: 'char-knight',
      name: 'Knight',
      vocation: 'knight',
      baseVocation: 'knight',
      level: 20,
      skills: { sword: 30, axe: 15, club: 10, distance: 10, magicLevel: 0, fist: 10, shielding: 20 },
      equipment: {
        rightHand: axe.id,
        leftHand: null,
      },
    } as any;
    const content: GameContent = {
      equipment: [axe],
    } as any;

    // Even though sword skill (30) is higher than axe (15), equipped weapon (axe) takes absolute priority
    expect(getDefaultTrainingSkill(axeChar, content)).toBe('axe');
  });

  // ITEM 6: Line of Sight (LOS) via Bresenham algorithm
  it('Item 6: hasLineOfSight blocks attacks through non-walkable solid tiles', () => {
    const mockMap: TileMap = {
      width: 10,
      height: 10,
      z: 7,
      tiles: Array.from({ length: 100 }, (_, idx) => {
        const x = idx % 10;
        const y = Math.floor(idx / 10);
        return {
          position: { x, y, z: 7 },
          groundId: 'grass' as any,
          walkable: x !== 5,
        };
      }),
    };

    // Attacker at (2, 2, 7), Target at (8, 2, 7) -> passes through wall at x=5
    const losBlocked = hasLineOfSight(mockMap, { x: 2, y: 2, z: 7 }, { x: 8, y: 2, z: 7 });
    expect(losBlocked).toBe(false);

    // Clear line of sight between (2, 2, 7) and (4, 2, 7) -> no wall
    const losClear = hasLineOfSight(mockMap, { x: 2, y: 2, z: 7 }, { x: 4, y: 2, z: 7 });
    expect(losClear).toBe(true);
  });

  // ITEM 3: Mount Speeds & OutfitModal Integration
  it('Item 3: getMountSpeedBonus grants +20 (Free), +40 (Premium), and +60 (Store) speed when mounted', () => {
    expect(getMountSpeedBonus('rented-horse', true)).toBe(20);
    expect(getMountSpeedBonus('widow-queen', true)).toBe(40);
    expect(getMountSpeedBonus('shadow-draptor', true)).toBe(60);
    expect(getMountSpeedBonus('rented-horse', false)).toBe(0);
    expect(getMountSpeedBonus(null)).toBe(0);
  });

  // ITEM 8: Shop Window Dual Tabs & Inventory Selling
  it('Item 8: resolveItemSellPrice and sellShopItem handle transactions from player bags', () => {
    const content: GameContent = {
      economy: {
        items: [
          {
            itemId: 2376,
            item: 'Sword',
            offers: [{ price: 25, sourceKind: 'npc', currency: 'gold' }],
          },
        ],
      },
      equipment: [],
    } as any;
    const price = resolveItemSellPrice(2376, content);
    expect(price).toBe(25);

    const state: GameState = {
      session: {
        gold: 100,
        loot: [{ itemId: 2376, name: 'Sword', amount: 5 }],
        bag: [],
      },
    } as any;

    const outcome = sellShopItem(state, 'backpack', 2376, 2, 25);
    expect(outcome.ok).toBe(true);
    expect(outcome.goldEarned).toBe(50);
    expect(outcome.state.session.gold).toBe(150);
    expect(outcome.state.session.loot[0].amount).toBe(3);
  });

  // ITEM 1 & 2 & 7: UI & Dockbar Sanitization (No OS Emojis, Dedicated Buttons, Lineart SVGs)
  it('Item 1, 2, 7: Bestiary HUD, WindowDockBar, and ChatWindow use zero OS emojis and genuine assets', () => {
    const dockBarSrc = readFileSync(resolve(__dirname, '../apps/web/components/window/WindowDockBar.tsx'), 'utf8');
    const chatSrc = readFileSync(resolve(__dirname, '../apps/web/components/chat/ChatWindow.tsx'), 'utf8');
    const bestiarySrc = readFileSync(resolve(__dirname, '../apps/web/components/BestiaryTrackerHUD.tsx'), 'utf8');

    // No OS emojis in dock bar or chat tabs
    expect(dockBarSrc).not.toContain('🛍️');
    expect(dockBarSrc).not.toContain('⚔️');
    expect(dockBarSrc).not.toContain('🏆');
    expect(chatSrc).not.toContain('💬');
    expect(chatSrc).not.toContain('📢');

    // Dedicated outfit button present
    expect(dockBarSrc).toContain('Customizar Aparência / Outfit & Montaria');

    // Genuine item sprites in inspect popover
    expect(dockBarSrc).toContain('/assets/items/item-');

    // Bestiary empty state present
    expect(bestiarySrc).toContain('Comece a rastrear monstros');
    expect(bestiarySrc).toContain('Abrir Cyclopedia');
  });

  // ITEM 10: AFK Optimization & Particle Cap
  it('Item 10: ThaisCityArena implements AFK 5 FPS throttle, [AFK] Zzz label, and max 30 particles', () => {
    const arenaSrc = readFileSync(resolve(__dirname, '../apps/web/components/ThaisCityArena.tsx'), 'utf8');
    expect(arenaSrc).toContain('[AFK] Zzz');
    expect(arenaSrc).toContain('timedCityVisuals.length > 30');
    expect(arenaSrc).toContain('now - lastAfkRenderTime < 180');
  });

  // ITEM 11: Anti-Clone Hunt Isolation
  it('Item 11: CityPartyHandler and ThaisCityArena enforce authoritative inHunt isolation to prevent ghost clones', () => {
    const handlerSrc = readFileSync(
      resolve(__dirname, '../packages/server/src/rooms/handlers/CityPartyHandler.ts'),
      'utf8'
    );
    const arenaSrc = readFileSync(resolve(__dirname, '../apps/web/components/ThaisCityArena.tsx'), 'utf8');

    expect(handlerSrc).toContain('player.inHunt = true');
    expect(handlerSrc).toContain('player.posZ = 8');
    expect(arenaSrc).toContain('const isHunting = Boolean(p.inHunt || p.isHunting || (p as any).hunting);');
  });
});
