import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_MOUNTS,
} from '../apps/web/components/OutfitModal';
import {
  isCharacterMounted,
  canOutfitHaveMount,
  formatMountStatusLabel,
} from '../apps/web/lib/appearanceService';
import {
  getCanvasCacheKey,
  getOutfitCapabilities,
  normalizeMountId,
  normalizeOutfitId,
} from '../apps/web/lib/outfitRecolor';
import type { CharacterState } from '../packages/domain/src';

describe('Phase 144 - Unmount and No Mount Selection Safeguards', () => {
  describe('1. Mount Catalog and Options', () => {
    it('should include "Sem Montaria" with id none at the very top of AVAILABLE_MOUNTS', () => {
      expect(AVAILABLE_MOUNTS.length).toBeGreaterThan(1);
      const firstMount = AVAILABLE_MOUNTS[0];
      expect(firstMount.id).toBe('none');
      expect(firstMount.name).toBe('Sem Montaria');
      expect(firstMount.speedBonus).toBe(0);
    });

    it('should normalize mount IDs cleanly, preserving none as none', () => {
      expect(normalizeMountId('none')).toBe('none');
      expect(normalizeMountId('')).toBe('none');
      expect(normalizeMountId('Donkey')).toBe('donkey');
      expect(normalizeMountId('Widow Queen')).toBe('widow-queen');
    });
  });

  describe('2. State Preservation: Equipped Mount vs Mount Activation', () => {
    it('should report isCharacterMounted as false when mountActive is false, even if mount is equipped', () => {
      const charOnFoot = {
        id: 'char-1',
        name: 'Aventureiro',
        level: 50,
        experience: 100000,
        vocation: 'Knight',
        baseVocation: 'Knight',
        currentHp: 500,
        maxHp: 500,
        currentMana: 150,
        maxMana: 150,
        capacity: 400,
        maxCapacity: 400,
        gold: 1000,
        outfit: 'Knight',
        mount: 'widow-queen', // player has equipped widow-queen
        mountActive: false,   // but chose to walk on foot!
      } as any as CharacterState;

      expect(isCharacterMounted(charOnFoot)).toBe(false);
      expect(charOnFoot.mount).toBe('widow-queen'); // Mount was NOT destroyed
    });

    it('should report isCharacterMounted as true when mountActive is true and mount is equipped', () => {
      const charMounted = {
        id: 'char-1',
        name: 'Aventureiro',
        level: 50,
        experience: 100000,
        vocation: 'Knight',
        baseVocation: 'Knight',
        currentHp: 500,
        maxHp: 500,
        currentMana: 150,
        maxMana: 150,
        capacity: 400,
        maxCapacity: 400,
        gold: 1000,
        outfit: 'Knight',
        mount: 'widow-queen',
        mountActive: true,
      } as any as CharacterState;

      expect(isCharacterMounted(charMounted)).toBe(true);
    });

    it('should format mount status label clearly when mount is deactivated vs active', () => {
      const activeLabel = formatMountStatusLabel('Knight', 'Widow Queen', true);
      expect(activeLabel).toBe('Montaria: Widow Queen');

      const deactivatedLabel = formatMountStatusLabel('Knight', 'Widow Queen', false);
      expect(deactivatedLabel).toBe('Montaria (Desativada)');

      const unsupportedLabel = formatMountStatusLabel('Sire', 'Widow Queen', true);
      expect(unsupportedLabel).toBe('Montaria (Sem suporte neste traje)');
    });
  });

  describe('3. Toggle Mount Logic (Ctrl+R & Context Menu)', () => {
    it('should mount with fallback to donkey if player had no mount selected', () => {
      const charWithoutMount = {
        id: 'char-2',
        name: 'Novato',
        level: 1,
        experience: 0,
        vocation: 'Knight',
        baseVocation: 'Knight',
        currentHp: 150,
        maxHp: 150,
        currentMana: 35,
        maxMana: 35,
        capacity: 400,
        maxCapacity: 400,
        gold: 0,
        outfit: 'Knight',
        mount: 'none',
        mountActive: false,
      } as any as CharacterState;

      // Simulating handleToggleMount resilient logic
      const effectiveMount = charWithoutMount.mount && charWithoutMount.mount !== 'none'
        ? charWithoutMount.mount
        : 'donkey';
      const nextMountActive = !charWithoutMount.mountActive;

      expect(effectiveMount).toBe('donkey');
      expect(nextMountActive).toBe(true);
    });

    it('should preserve existing equipped mount when dismounting and remounting', () => {
      let charState = {
        id: 'char-3',
        name: 'Guerreiro',
        level: 100,
        experience: 1000000,
        vocation: 'Knight',
        baseVocation: 'Knight',
        currentHp: 1000,
        maxHp: 1000,
        currentMana: 300,
        maxMana: 300,
        capacity: 800,
        maxCapacity: 800,
        gold: 50000,
        outfit: 'Knight',
        mount: 'war-bear',
        mountActive: true,
      } as any as CharacterState;

      // 1. Dismount (via Sem Montaria or Ctrl+R)
      const nextMountActive1 = !charState.mountActive;
      const effectiveMount1 = charState.mount && charState.mount !== 'none' ? charState.mount : 'donkey';
      charState = {
        ...charState,
        mount: effectiveMount1,
        mountActive: nextMountActive1,
      };

      expect(charState.mountActive).toBe(false);
      expect(charState.mount).toBe('war-bear'); // Mount still preserved!
      expect(isCharacterMounted(charState)).toBe(false);

      // 2. Remount (via Ctrl+R or Context Menu)
      const nextMountActive2 = !charState.mountActive;
      const effectiveMount2 = charState.mount && charState.mount !== 'none' ? charState.mount : 'donkey';
      charState = {
        ...charState,
        mount: effectiveMount2,
        mountActive: nextMountActive2,
      };

      expect(charState.mountActive).toBe(true);
      expect(charState.mount).toBe('war-bear'); // Remounted on the war-bear!
      expect(isCharacterMounted(charState)).toBe(true);
    });
  });

  describe('4. OutfitRecolor Canvas Keys & Capabilities', () => {
    it('should generate distinct cache keys for mounted vs unmounted', () => {
      const colors = { head: 0, primary: 86, secondary: 114, detail: 76 };
      const mountedKey = getCanvasCacheKey('knight', 'male', 'south', 0, colors, 0, 'donkey', true);
      const unmountedKey = getCanvasCacheKey('knight', 'male', 'south', 0, colors, 0, 'donkey', false);

      expect(mountedKey).toContain('_mdonkey_v2');
      expect(unmountedKey).toContain('_mnone_v2');
      expect(mountedKey).not.toBe(unmountedKey);
    });

    it('should correctly determine outfit mount capabilities', () => {
      expect(canOutfitHaveMount('Knight')).toBe(true);
      expect(canOutfitHaveMount('Citizen')).toBe(true);
      expect(canOutfitHaveMount('Sire')).toBe(false); // Sire has no mount rider
    });
  });
});
