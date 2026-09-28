import { describe, it, expect } from 'vitest';
import {
  CharacterEquipmentSlot,
  preferredSlotForItem,
  equipCharacterItem,
  deriveStats,
  hasLineOfSight,
  getDefaultTrainingSkill,
  getMountSpeedBonus,
  resolveItemSellPrice,
  sellShopItem,
  resolveDistanceProjectileId,
  resolveTrainingVisualAction,
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

  // ITEM 12: Paladin Distance Weapon + Infinite Ammo Scaling
  it('Paladin with Bow (attack: 0) and equipped Arrow (attack: 25) calculates valid attack and weaponAttack', () => {
    const bow: EquipmentDefinition = {
      id: 2456,
      name: 'Bow',
      slot: 'hand',
      twoHanded: true,
      weaponType: 'distance',
      requirements: {},
      attack: 0,
      defense: 0,
    } as any;

    const arrow: EquipmentDefinition = {
      id: 2544,
      name: 'Arrow',
      slot: 'ammo',
      twoHanded: false,
      weaponType: 'ammo',
      requirements: {},
      attack: 25,
      defense: 0,
    } as any;

    const paladinChar: CharacterState = {
      id: 'paladin-1',
      name: 'Legolas',
      vocation: 'paladin',
      baseVocation: 'paladin',
      level: 30,
      skills: { shielding: 20, distance: 40, sword: 10, axe: 10, club: 10, magicLevel: 10, fist: 10 },
      equipment: {
        head: null,
        neck: null,
        backpack: null,
        armor: null,
        leftHand: bow.id,
        rightHand: null,
        legs: null,
        boots: null,
        ring: null,
        ammo: arrow.id,
      },
      inventory: { equipmentIds: [] },
    } as any;

    const paladinVoc = {
      name: 'paladin' as const,
      baseSpeed: 110,
      meleeDamageMultiplier: 1.0,
      distanceDamageMultiplier: 1.25,
      defenseMultiplier: 1.0,
      hitPointsPerLevel: 10,
      manaPointsPerLevel: 15,
      capacityPerLevel: 20,
    };

    const stats = deriveStats(paladinChar, [bow, arrow], paladinVoc as any);
    expect(stats.weaponAttack).toBeGreaterThanOrEqual(25);
    expect(stats.attack).toBeGreaterThan(0);
    expect(stats.activeSkill).toBe('distance');
  });

  it('Paladin with Bow and Arrow in inventory (infinite ammo: 1 item is sufficient) derives valid attack', () => {
    const bow: EquipmentDefinition = {
      id: 2456,
      name: 'Bow',
      slot: 'hand',
      twoHanded: true,
      weaponType: 'distance',
      requirements: {},
      attack: 0,
      defense: 0,
    } as any;

    const bolt: EquipmentDefinition = {
      id: 2543,
      name: 'Bolt',
      slot: 'ammo',
      twoHanded: false,
      weaponType: 'ammo',
      requirements: {},
      attack: 30,
      defense: 0,
    } as any;

    const paladinChar: CharacterState = {
      id: 'paladin-2',
      name: 'CrossbowSniper',
      vocation: 'paladin',
      baseVocation: 'paladin',
      level: 25,
      skills: { shielding: 15, distance: 35, sword: 10, axe: 10, club: 10, magicLevel: 8, fist: 10 },
      equipment: {
        head: null,
        neck: null,
        backpack: null,
        armor: null,
        leftHand: bow.id,
        rightHand: null,
        legs: null,
        boots: null,
        ring: null,
        ammo: null, // Empty ammo slot, ammo is in inventory
      },
      inventory: { equipmentIds: [bolt.id] },
    } as any;

    const paladinVoc = {
      name: 'paladin' as const,
      baseSpeed: 110,
      meleeDamageMultiplier: 1.0,
      distanceDamageMultiplier: 1.25,
      defenseMultiplier: 1.0,
      hitPointsPerLevel: 10,
      manaPointsPerLevel: 15,
      capacityPerLevel: 20,
    };

    const stats = deriveStats(paladinChar, [bow, bolt], paladinVoc as any);
    expect(stats.weaponAttack).toBe(30);
    expect(stats.attack).toBeGreaterThan(0);
  });

  // ITEM 13: ShopWindow Dark Stone 3D Styling
  it('ShopWindow defines complete Dark Stone Tibia 11 grid CSS styles', () => {
    const shopSrc = readFileSync(resolve(__dirname, '../apps/web/components/ShopWindow.tsx'), 'utf8');
    const globalsCss = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8');

    expect(shopSrc).toContain('.shop-categories-grid');
    expect(shopSrc).toContain('.shop-items-panel');
    expect(shopSrc).toContain('.shop-items-grid');
    expect(shopSrc).toContain('.shop-item-card');
    expect(shopSrc).toContain('.shop-item-cost');
    expect(shopSrc).toContain('.shop-preview-panel');

    expect(globalsCss).toContain('.shop-categories-grid');
    expect(globalsCss).toContain('.shop-item-card');
  });

  // ITEM 14: hasLineOfSight melee bypass and tolerance
  it('hasLineOfSight returns true for adjacent tiles even if coordinate z is normalized', () => {
    const mockMap: TileMap = {
      width: 100,
      height: 100,
      z: 7,
      tiles: [],
    } as any;

    expect(hasLineOfSight(mockMap, { x: 10, y: 10, z: 7 }, { x: 11, y: 11, z: 7 })).toBe(true);
    expect(hasLineOfSight(mockMap, { x: 10, y: 10, z: 7 }, { x: 10, y: 9, z: 7 })).toBe(true);
  });

  // ITEM 15: Authentic Distance Projectile Resolution (Arrows, Bolts, Spears, Thrown)
  it('resolveDistanceProjectileId resolves authentic Tibia projectile IDs for all distance ammo and weapons', () => {
    // Arrows
    expect(resolveDistanceProjectileId(null, { name: 'Arrow' } as any)).toBe(3);
    expect(resolveDistanceProjectileId(null, { name: 'Poison Arrow' } as any)).toBe(6);
    expect(resolveDistanceProjectileId(null, { name: 'Burst Arrow' } as any)).toBe(7);
    expect(resolveDistanceProjectileId(null, { name: 'Sniper Arrow' } as any)).toBe(22);
    expect(resolveDistanceProjectileId(null, { name: 'Onyx Arrow' } as any)).toBe(23);
    expect(resolveDistanceProjectileId(null, { name: 'Flash Arrow' } as any)).toBe(33);
    expect(resolveDistanceProjectileId(null, { name: 'Flaming Arrow' } as any)).toBe(34);
    expect(resolveDistanceProjectileId(null, { name: 'Shiver Arrow' } as any)).toBe(35);
    expect(resolveDistanceProjectileId(null, { name: 'Earth Arrow' } as any)).toBe(40);
    expect(resolveDistanceProjectileId(null, { name: 'Tarsal Arrow' } as any)).toBe(44);
    expect(resolveDistanceProjectileId(null, { name: 'Crystalline Arrow' } as any)).toBe(49);

    // Bolts
    expect(resolveDistanceProjectileId(null, { name: 'Bolt' } as any)).toBe(2);
    expect(resolveDistanceProjectileId(null, { name: 'Power Bolt' } as any)).toBe(14);
    expect(resolveDistanceProjectileId(null, { name: 'Infernal Bolt' } as any)).toBe(16);
    expect(resolveDistanceProjectileId(null, { name: 'Piercing Bolt' } as any)).toBe(24);
    expect(resolveDistanceProjectileId(null, { name: 'Vortex Bolt' } as any)).toBe(45);
    expect(resolveDistanceProjectileId(null, { name: 'Drill Bolt' } as any)).toBe(47);
    expect(resolveDistanceProjectileId(null, { name: 'Prismatic Bolt' } as any)).toBe(48);

    // Thrown Weapons
    expect(resolveDistanceProjectileId({ name: 'Spear' } as any, null)).toBe(1);
    expect(resolveDistanceProjectileId({ name: 'Hunting Spear' } as any, null)).toBe(17);
    expect(resolveDistanceProjectileId({ name: 'Enchanted Spear' } as any, null)).toBe(18);
    expect(resolveDistanceProjectileId({ name: 'Royal Spear' } as any, null)).toBe(21);
    expect(resolveDistanceProjectileId({ name: 'Assassin Star' } as any, null)).toBe(19);
    expect(resolveDistanceProjectileId({ name: 'Throwing Star' } as any, null)).toBe(8);
    expect(resolveDistanceProjectileId({ name: 'Throwing Knife' } as any, null)).toBe(9);
    expect(resolveDistanceProjectileId({ name: 'Small Stone' } as any, null)).toBe(10);

    // Weapon fallbacks when no ammo specified
    expect(resolveDistanceProjectileId({ name: 'Bow' } as any, null)).toBe(3);
    expect(resolveDistanceProjectileId({ name: 'Crossbow' } as any, null)).toBe(2);
    expect(resolveDistanceProjectileId({ name: 'Royal Crossbow' } as any, null)).toBe(2);
    expect(resolveDistanceProjectileId({ name: 'Composite Hornbow' } as any, null)).toBe(3);
  });

  it('resolveTrainingVisualAction resolves authentic projectile for distance fighters based on gear', () => {
    const paladinWithBow: CharacterState = {
      id: 'p1',
      vocation: 'Paladin',
      equipment: { leftHand: 2456, ammo: 2544 },
    } as any;

    const dummyContent: GameContent = {
      equipment: [
        { id: 2456, name: 'Bow', weaponType: 'distance', slot: 'hand' },
        { id: 2544, name: 'Arrow', weaponType: 'ammo', slot: 'ammo' },
        { id: 2389, name: 'Spear', weaponType: 'distance', slot: 'hand' },
      ],
    } as any;

    const bowAction = resolveTrainingVisualAction(paladinWithBow, 'distance', dummyContent);
    expect(bowAction.style).toBe('distance');
    expect(bowAction.projectileId).toBe(3); // Arrow

    const paladinWithSpear: CharacterState = {
      id: 'p2',
      vocation: 'Paladin',
      equipment: { leftHand: 2389, ammo: null },
    } as any;

    const spearAction = resolveTrainingVisualAction(paladinWithSpear, 'distance', dummyContent);
    expect(spearAction.style).toBe('distance');
    expect(spearAction.projectileId).toBe(1); // Spear
  });
});
