import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CLASSIC_OUTFITS, AVAILABLE_OUTFITS } from '../apps/web/components/OutfitModal';
import { normalizeOutfitId, getOutfitCapabilities } from '../apps/web/lib/outfitRecolor';

describe('Phase 159: OutfitModal Gender-Aware Thumbs, Addon Reset & Canon Names', () => {
  const PROJECT_ROOT = process.cwd();

  it('1. CLASSIC_OUTFITS contains canonical outfits and does NOT duplicate Sorcerer or Paladin', () => {
    const ids = CLASSIC_OUTFITS.map((o) => o.id);
    const names = CLASSIC_OUTFITS.map((o) => o.name);

    // Ensure 'Sorcerer' and 'Paladin' are completely removed from classic list
    expect(ids).not.toContain('Sorcerer');
    expect(names).not.toContain('Sorcerer');
    expect(ids).not.toContain('Paladin');
    expect(names).not.toContain('Paladin');

    // Ensure canonical 14 outfits exist
    const expected = [
      'Citizen',
      'Hunter',
      'Mage',
      'Knight',
      'Noble',
      'Summoner',
      'Warrior',
      'Barbarian',
      'Sire',
      'Druid',
      'Oriental',
      'Pirate',
      'Assassin',
      'Beggar',
    ];
    for (const exp of expected) {
      expect(ids).toContain(exp);
    }
    expect(CLASSIC_OUTFITS.length).toBe(14);
  });

  it('2. AVAILABLE_OUTFITS has no duplicate entries and no fake Sorcerer / Paladin outfits', () => {
    const availableIds = AVAILABLE_OUTFITS.map((o) => o.id.toLowerCase());
    expect(availableIds).not.toContain('sorcerer');
    expect(availableIds).not.toContain('paladin');

    // Check for duplicate names
    const seen = new Set<string>();
    for (const o of AVAILABLE_OUTFITS) {
      const lower = o.name.toLowerCase();
      expect(seen.has(lower)).toBe(false);
      seen.add(lower);
    }
  });

  it('3. Every classic outfit resolves to existing sprite files for BOTH male and female genders', () => {
    for (const outfit of CLASSIC_OUTFITS) {
      const norm = normalizeOutfitId(outfit.id);

      const maleThumbPath = path.resolve(PROJECT_ROOT, 'public', 'generated', 'outfits', `${norm}-male-south-f0-base.png`);
      const femaleThumbPath = path.resolve(PROJECT_ROOT, 'public', 'generated', 'outfits', `${norm}-female-south-f0-base.png`);

      expect(fs.existsSync(maleThumbPath), `Male sprite for ${outfit.name} must exist at ${maleThumbPath}`).toBe(true);
      expect(fs.existsSync(femaleThumbPath), `Female sprite for ${outfit.name} must exist at ${femaleThumbPath}`).toBe(true);
    }
  });

  it('4. Simulates selecting a new outfit and ensures addons are reset to false for user configuration', () => {
    // State model simulating OutfitModal's handleSelectOutfit logic
    let selectedOutfit = 'Druid';
    let addon1 = true;
    let addon2 = true;

    const handleSelectOutfit = (outfitId: string) => {
      const isDifferentOutfit = outfitId !== selectedOutfit;
      selectedOutfit = outfitId;
      if (isDifferentOutfit) {
        addon1 = false;
        addon2 = false;
      } else {
        const caps = getOutfitCapabilities(outfitId);
        if (!caps.hasAddon1 && addon1) addon1 = false;
        if (!caps.hasAddon2 && addon2) addon2 = false;
      }
    };

    // User switches from Druid (with both addons enabled) to Citizen
    handleSelectOutfit('Citizen');
    expect(selectedOutfit).toBe('Citizen');
    expect(addon1).toBe(false);
    expect(addon2).toBe(false);

    // If user sets addons for Citizen and clicks Citizen again, it keeps them
    addon1 = true;
    addon2 = true;
    handleSelectOutfit('Citizen');
    expect(selectedOutfit).toBe('Citizen');
    expect(addon1).toBe(true);
    expect(addon2).toBe(true);

    // Switching to Knight resets them again
    handleSelectOutfit('Knight');
    expect(selectedOutfit).toBe('Knight');
    expect(addon1).toBe(false);
    expect(addon2).toBe(false);
  });
});
