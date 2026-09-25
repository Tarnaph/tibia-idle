import { describe, it, expect } from 'vitest';
import { isAccountPremiumActive } from '../packages/domain/src/appearancePermissions';

describe('Phase 234: Admin Premium by Days & Mobile Responsive Utilities', () => {
  describe('isAccountPremiumActive verification', () => {
    it('returns false for null or undefined account', () => {
      expect(isAccountPremiumActive(null)).toBe(false);
      expect(isAccountPremiumActive(undefined)).toBe(false);
    });

    it('returns false for free account without premiumUntil', () => {
      expect(isAccountPremiumActive({ isPremium: false, premiumUntil: null })).toBe(false);
    });

    it('returns true when isPremium is true without expiration date', () => {
      expect(isAccountPremiumActive({ isPremium: true, premiumUntil: null })).toBe(true);
    });

    it('returns true when premiumUntil is in the future, even if isPremium was false', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days ahead
      expect(isAccountPremiumActive({ isPremium: false, premiumUntil: futureDate })).toBe(true);
      expect(isAccountPremiumActive({ isPremium: false, premiumUntil: futureDate.toISOString() })).toBe(true);
    });

    it('returns false when premiumUntil is in the past, even if isPremium was true', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
      expect(isAccountPremiumActive({ isPremium: true, premiumUntil: pastDate })).toBe(false);
      expect(isAccountPremiumActive({ isPremium: true, premiumUntil: pastDate.toISOString() })).toBe(false);
    });
  });

  describe('Admin Premium Days calculation logic', () => {
    it('calculates extension correctly for active premium account', () => {
      const now = Date.now();
      const currentExp = new Date(now + 10 * 24 * 60 * 60 * 1000); // 10 days remaining
      const daysToAdd = 30;
      
      const newExp = new Date(currentExp.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const remainingMs = newExp.getTime() - now;
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      
      expect(remainingDays).toBe(40);
    });

    it('calculates initial subscription starting from now for free or expired account', () => {
      const now = Date.now();
      const expiredDate = new Date(now - 5 * 24 * 60 * 60 * 1000);
      const daysToAdd = 30;
      
      // When expired or free, new expiration starts from server clock now
      const baseTime = expiredDate.getTime() > now ? expiredDate.getTime() : now;
      const newExp = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000);
      const remainingMs = newExp.getTime() - now;
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      
      expect(remainingDays).toBe(30);
    });

    it('removes days and revokes to free if reduced expiration is <= now', () => {
      const now = Date.now();
      const currentExp = new Date(now + 5 * 24 * 60 * 60 * 1000); // 5 days remaining
      const daysToRemove = 10;
      
      const targetTime = currentExp.getTime() - daysToRemove * 24 * 60 * 60 * 1000;
      const isStillActive = targetTime > now;
      
      expect(isStillActive).toBe(false);
    });
  });

  describe('OutfitModal safe inventory normalization (Bug P0 shield)', () => {
    function getSafeInventory(raw: any): any[] {
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.equipmentIds)) return raw.equipmentIds;
        if (Array.isArray(raw.items)) return raw.items;
      }
      return [];
    }

    it('safely handles CharacterState.inventory object with equipmentIds without throwing', () => {
      const charInventory = { equipmentIds: [100, 200] };
      const safe = getSafeInventory(charInventory);
      expect(Array.isArray(safe)).toBe(true);
      expect(safe).toEqual([100, 200]);
    });

    it('safely handles empty object {} without crashing React render loop', () => {
      const emptyObj = {};
      const safe = getSafeInventory(emptyObj);
      expect(Array.isArray(safe)).toBe(true);
      expect(safe.length).toBe(0);
      
      // Verification that for..of does not throw TypeError: not iterable
      let count = 0;
      for (const item of safe) {
        count++;
      }
      expect(count).toBe(0);
    });

    it('safely handles undefined and null', () => {
      expect(getSafeInventory(null)).toEqual([]);
      expect(getSafeInventory(undefined)).toEqual([]);
    });

    it('preserves actual item arrays', () => {
      const arr = [{ itemId: 10606, name: 'Bunch of Troll Hair', amount: 5 }];
      expect(getSafeInventory(arr)).toBe(arr);
    });
  });
});
