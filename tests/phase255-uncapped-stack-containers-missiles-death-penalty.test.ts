import { describe, it, expect } from 'vitest';
import {
  createIdleGame,
  calculateDeathProtection,
  calculateDeathPenaltyReport,
  respawnInTemple,
  resolveDistanceProjectileId,
} from '../packages/domain/src';
import { resolveMissileFrame, MISSILE_DIRECTION_PATTERNS } from '../apps/web/lib/assetPaths';
import tibiaCombatAssets from '../content/generated/tibia1098-combat-assets.json';
import { content } from './fixture';

describe('Phase 255: Uncapped Stacks, Mochila & Loot Bag Containers, Arrow Projectile Directions and Spear Thrown Priority', () => {
  describe('1. Projectile Direction Mapping & Authentic Arrow Orientation', () => {
    it('accurately resolves missile sprite patterns without flipping or inverting arrow tips', () => {
      const arrowMapping = (tibiaCombatAssets as any).missiles['3'];
      expect(arrowMapping).toBeDefined();

      // South shooting missile must have pattern { x: 1, y: 2 } (sprite 984, downward arrow)
      const southFrame = resolveMissileFrame(arrowMapping, 'south');
      expect(southFrame).toBeDefined();
      expect(southFrame?.pattern?.x).toBe(1);
      expect(southFrame?.pattern?.y).toBe(2);
      expect((southFrame as any)?.spriteIds?.[0]).toBe(984);

      // North shooting missile must have pattern { x: 1, y: 0 } (sprite 980, upward arrow)
      const northFrame = resolveMissileFrame(arrowMapping, 'north');
      expect(northFrame).toBeDefined();
      expect(northFrame?.pattern?.x).toBe(1);
      expect(northFrame?.pattern?.y).toBe(0);
      expect((northFrame as any)?.spriteIds?.[0]).toBe(980);

      // West shooting missile must have pattern { x: 0, y: 1 } (sprite 986, leftward arrow)
      const westFrame = resolveMissileFrame(arrowMapping, 'west');
      expect(westFrame).toBeDefined();
      expect(westFrame?.pattern?.x).toBe(0);
      expect(westFrame?.pattern?.y).toBe(1);
      expect((westFrame as any)?.spriteIds?.[0]).toBe(986);

      // East shooting missile must have pattern { x: 2, y: 1 } (sprite 982, rightward arrow)
      const eastFrame = resolveMissileFrame(arrowMapping, 'east');
      expect(eastFrame).toBeDefined();
      expect(eastFrame?.pattern?.x).toBe(2);
      expect(eastFrame?.pattern?.y).toBe(1);
      expect((eastFrame as any)?.spriteIds?.[0]).toBe(982);
    });

    it('resolves all 8 directions with non-overlapping patterns for Spear (Missile 1)', () => {
      const spearMapping = (tibiaCombatAssets as any).missiles['1'];
      expect(spearMapping).toBeDefined();

      const directions = Object.keys(MISSILE_DIRECTION_PATTERNS);
      for (const dir of directions) {
        const frame = resolveMissileFrame(spearMapping, dir);
        expect(frame).toBeDefined();
        const expectedPattern = MISSILE_DIRECTION_PATTERNS[dir];
        expect(frame?.pattern?.x).toBe(expectedPattern.x);
        expect(frame?.pattern?.y).toBe(expectedPattern.y);
      }
    });
  });

  describe('2. Thrown Weapon Priority over Backpack Ammo', () => {
    it('prioritizes Spear weapon in hand over any ammunition present in backpack', () => {
      const spearWeapon: any = { id: 2389, name: 'spear', weaponType: 'distance', slot: 'hand' };
      const burstArrowAmmo: any = { id: 2546, name: 'burst arrow', weaponType: 'ammo', slot: 'ammo' };

      // When wielding a Spear, resolveDistanceProjectileId must return Spear missile (1) even if burst arrows exist
      const projectileId = resolveDistanceProjectileId(spearWeapon, burstArrowAmmo);
      expect(projectileId).toBe(1); // CONST_ANI_SPEAR
    });

    it('prioritizes Royal Spear and Hunting Spear over regular arrows', () => {
      const royalSpear: any = { id: 7378, name: 'royal spear', weaponType: 'distance', slot: 'hand' };
      const regularArrow: any = { id: 2544, name: 'arrow', weaponType: 'ammo', slot: 'ammo' };

      const projectileId = resolveDistanceProjectileId(royalSpear, regularArrow);
      expect(projectileId).toBe(21); // CONST_ANI_ROYALSPEAR
    });

    it('correctly uses ammunition projectile when wielding a Bow', () => {
      const bow: any = { id: 2456, name: 'bow', weaponType: 'distance', slot: 'hand' };
      const poisonArrow: any = { id: 2545, name: 'poison arrow', weaponType: 'ammo', slot: 'ammo' };

      const projectileId = resolveDistanceProjectileId(bow, poisonArrow);
      expect(projectileId).toBe(6); // CONST_ANI_POISONARROW
    });
  });

  describe('3. Death Penalty: Loot Bag Lost, Mochila & Equipment 100% Protected', () => {
    it('loses ONLY the Loot Bag upon unblessed death, keeping Mochila and equipment completely intact', () => {
      let state = createIdleGame('test-death-phase-255', content);
      const char = state.session.characters[0];
      char.blessings = []; // Unblessed

      // Populate personal Mochila (session.bag)
      state.session.bag = [
        { itemId: 7618, name: 'Health Potion', amount: 50 },
        { itemId: 2268, name: 'Sudden Death Rune', amount: 20 },
      ];

      // Populate monster drops Loot Bag (session.loot)
      state.session.loot = [
        { itemId: 2148, name: 'Gold Coin', amount: 1500 },
        { itemId: 2463, name: 'Plate Armor', amount: 1 },
      ];

      // Equip items
      char.equipment.armor = 2463;
      char.equipment.legs = 2647;

      // Check death penalty preview
      const preview = calculateDeathPenaltyReport(char, state.session.loot);
      expect(preview.lostEquipment).toEqual([]);
      expect(preview.lostLoot.length).toBe(2);
      expect(preview.totalLootItemsLost).toBe(1501);

      // Execute respawnInTemple
      const respawned = respawnInTemple(state, undefined, content);

      // Verify Loot Bag (session.loot) was wiped
      expect(respawned.session.loot).toEqual([]);

      // Verify Mochila (session.bag) is 100% PRESERVED
      const bag = respawned.session.bag!;
      expect(bag.length).toBe(2);
      expect(bag[0].name).toBe('Health Potion');
      expect(bag[0].amount).toBe(50);
      expect(bag[1].name).toBe('Sudden Death Rune');
      expect(bag[1].amount).toBe(20);

      // Verify Equipment is 100% PRESERVED
      const respawnedChar = respawned.session.characters.find((c) => c.id === char.id)!;
      expect(respawnedChar.equipment.armor).toBe(2463);
      expect(respawnedChar.equipment.legs).toBe(2647);
    });

    it('protects the Loot Bag as well when player has full 5 blessings', () => {
      let state = createIdleGame('test-blessed-phase-255', content);
      const char = state.session.characters[0];
      char.blessings = [1, 2, 3, 4, 5]; // Full blessings

      state.session.loot = [
        { itemId: 2148, name: 'Gold Coin', amount: 5000 },
      ];

      const preview = calculateDeathPenaltyReport(char, state.session.loot);
      expect(preview.lostEquipment).toEqual([]);
      expect(preview.lostLoot).toEqual([]); // Protected by 5 blessings

      const respawned = respawnInTemple(state, undefined, content);
      expect(respawned.session.loot.length).toBe(1);
      expect(respawned.session.loot[0].amount).toBe(5000);
    });
  });
});
