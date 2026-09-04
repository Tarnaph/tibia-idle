import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_OUTFITS,
  AVAILABLE_MOUNTS,
  TIBIA_133_COLORS,
  TIBIA_PALETTE,
} from '../apps/web/components/OutfitModal';

describe('Phase 43 - Official Tibia 11 Outfit & Mount UI System', () => {
  it('provides the complete official 19x7 matrix containing exactly 133 authentic colors', () => {
    expect(TIBIA_133_COLORS).toHaveLength(133);

    // Row 0 starts with pure white #ffffff
    expect(TIBIA_133_COLORS[0].toLowerCase()).toBe('#ffffff');

    // Row 4 starts with charcoal and contains bright primary hues
    expect(TIBIA_133_COLORS[4 * 19 + 6].toLowerCase()).toBe('#00ff00'); // Green
    expect(TIBIA_133_COLORS[4 * 19 + 12].toLowerCase()).toBe('#0000ff'); // Blue
    expect(TIBIA_133_COLORS[4 * 19 + 18].toLowerCase()).toBe('#ff0000'); // Red

    // Row 6 contains dark shades and near black
    expect(TIBIA_133_COLORS[6 * 19]).toBe('#242424');
    expect(TIBIA_133_COLORS[132]).toBe('#800000');

    // TIBIA_PALETTE backwards-compatible subset
    expect(TIBIA_PALETTE.length).toBeGreaterThanOrEqual(16);
  });

  it('includes all classic outfits visible in the reference layout with premium and custom badges', () => {
    const outfitNames = AVAILABLE_OUTFITS.map((o) => o.name);

    // Row 1 from reference image
    expect(outfitNames).toContain('Citizen');
    expect(outfitNames).toContain('Hunter');
    expect(outfitNames).toContain('Mage');
    expect(outfitNames).toContain('Knight');

    // Row 2 from reference image
    expect(outfitNames).toContain('Noble');
    expect(outfitNames).toContain('Summoner');
    expect(outfitNames).toContain('Warrior');
    expect(outfitNames).toContain('Barbarian');

    // Custom and vocations
    expect(outfitNames).toContain('Sire');
    expect(outfitNames).toContain('Paladin');
    expect(outfitNames).toContain('Druid');
    expect(outfitNames).toContain('Sorcerer');

    const noble = AVAILABLE_OUTFITS.find((o) => o.name === 'Noble');
    expect(noble?.isPremium).toBe(true);

    const summoner = AVAILABLE_OUTFITS.find((o) => o.name === 'Summoner');
    expect(summoner?.isPremium).toBe(true);

    const sire = AVAILABLE_OUTFITS.find((o) => o.name === 'Sire');
    expect(sire?.isCustom).toBe(true);
  });

  it('provides the authentic Donkey mount and client mounts with speed bonus', () => {
    const donkey = AVAILABLE_MOUNTS.find((m) => m.name === 'Donkey');
    expect(donkey).toBeDefined();
    expect(donkey?.speedBonus).toBe(20);
    expect(donkey?.isPremium).toBe(true);

    const warHorse = AVAILABLE_MOUNTS.find((m) => m.name === 'War Horse');
    expect(warHorse).toBeDefined();
    expect(warHorse?.speedBonus).toBe(20);
  });
});
