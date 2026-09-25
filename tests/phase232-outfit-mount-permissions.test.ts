import { describe, it, expect } from 'vitest';
import {
  getOutfitTier,
  isOutfitUnlockedFor,
  getMountTier,
  isMountUnlockedFor,
  isStaff,
  isAddonUnlockedFor,
  parseUnlockedAddons,
  FREE_OUTFIT_KEYS,
  PREMIUM_OUTFIT_KEYS,
  FREE_MOUNT_KEYS,
  type UserAppearanceContext,
} from '../packages/domain/src/appearancePermissions';

describe('Phase 232: Outfit & Mount Permissions Matrix', () => {
  const freePlayer: UserAppearanceContext = { isPremium: false, role: 'PLAYER' };
  const premiumPlayer: UserAppearanceContext = { isPremium: true, role: 'PLAYER' };
  const godStaff: UserAppearanceContext = { isPremium: true, role: 'ADMIN', adminTitle: 'GOD' };
  const gmStaff: UserAppearanceContext = { isPremium: false, role: 'PLAYER', adminTitle: 'GM' };

  it('classifies Free outfits correctly and allows them for all players', () => {
    const freeList = ['citizen', 'hunter', 'mage', 'knight'];
    for (const outfit of freeList) {
      expect(getOutfitTier(outfit)).toBe('free');
      expect(isOutfitUnlockedFor(outfit, freePlayer)).toBe(true);
      expect(isOutfitUnlockedFor(outfit, premiumPlayer)).toBe(true);
      expect(isOutfitUnlockedFor(outfit, godStaff)).toBe(true);
    }
  });

  it('classifies Premium outfits correctly and restricts them for Free players', () => {
    const premiumList = [
      'noble', 'summoner', 'warrior', 'barbarian', 'druid',
      'oriental', 'pirate', 'assassin', 'beggar', 'wizard',
      'shaman', 'norseman', 'nightmare', 'jester', 'brotherhood',
      'demon hunter', 'yalaharian',
    ];
    for (const outfit of premiumList) {
      expect(getOutfitTier(outfit)).toBe('premium');
      expect(isOutfitUnlockedFor(outfit, freePlayer)).toBe(false);
      expect(isOutfitUnlockedFor(outfit, premiumPlayer)).toBe(true);
      expect(isOutfitUnlockedFor(outfit, godStaff)).toBe(true);
      expect(isOutfitUnlockedFor(outfit, gmStaff)).toBe(true);
    }
  });

  it('classifies all remaining outfits as Store ("Loja") and locks them for normal players', () => {
    const storeList = ['Sire', 'Warmaster', 'Wayfarer', 'Retro Warrior', 'Battle Mage'];
    for (const outfit of storeList) {
      expect(getOutfitTier(outfit)).toBe('store');
      expect(isOutfitUnlockedFor(outfit, freePlayer)).toBe(false);
      expect(isOutfitUnlockedFor(outfit, premiumPlayer)).toBe(false);
      // Staff (GOD and GM) have unrestricted visual access
      expect(isOutfitUnlockedFor(outfit, godStaff)).toBe(true);
      expect(isOutfitUnlockedFor(outfit, gmStaff)).toBe(true);
    }
  });

  it('correctly handles mounts permissions for Free, Premium and Staff', () => {
    // Free mounts
    expect(getMountTier('none')).toBe('free');
    expect(isMountUnlockedFor('none', freePlayer)).toBe(true);

    expect(getMountTier('rented horse')).toBe('free');
    expect(isMountUnlockedFor('rented horse', freePlayer)).toBe(true);

    expect(getMountTier('donkey')).toBe('free');
    expect(isMountUnlockedFor('donkey', freePlayer)).toBe(true);

    // Premium mounts
    expect(getMountTier('midnight panther')).toBe('premium');
    expect(isMountUnlockedFor('midnight panther', freePlayer)).toBe(false);
    expect(isMountUnlockedFor('midnight panther', premiumPlayer)).toBe(true);
    expect(isMountUnlockedFor('midnight panther', godStaff)).toBe(true);
    expect(isMountUnlockedFor('midnight panther', gmStaff)).toBe(true);
  });

  it('identifies Staff correctly via role or adminTitle', () => {
    expect(isStaff(godStaff)).toBe(true);
    expect(isStaff(gmStaff)).toBe(true);
    expect(isStaff({ role: 'ADMIN' })).toBe(true);
    expect(isStaff({ adminTitle: 'GOD' })).toBe(true);
    expect(isStaff({ adminTitle: 'GM' })).toBe(true);
    expect(isStaff(freePlayer)).toBe(false);
    expect(isStaff(premiumPlayer)).toBe(false);
  });

  it('checks addon unlocks based on character quest progression or staff privilege', () => {
    const charUnlockedJson = JSON.stringify({ citizen: [1] });
    expect(isAddonUnlockedFor('citizen', 1, charUnlockedJson, freePlayer)).toBe(true);
    expect(isAddonUnlockedFor('citizen', 2, charUnlockedJson, freePlayer)).toBe(false);
    expect(isAddonUnlockedFor('knight', 1, charUnlockedJson, freePlayer)).toBe(false);

    // Staff bypasses quest unlock
    expect(isAddonUnlockedFor('citizen', 2, charUnlockedJson, godStaff)).toBe(true);
    expect(isAddonUnlockedFor('knight', 1, charUnlockedJson, gmStaff)).toBe(true);
  });
});
