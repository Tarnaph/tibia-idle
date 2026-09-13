import { describe, it, expect } from 'vitest';
import { getOutfitCapabilities, normalizeOutfitId, OUTFITS_WITH_MOUNTS } from '../apps/web/lib/outfitRecolor';
import { resolveActionImagePath } from '../apps/web/components/Tibia11ActionIcon';

describe('Phase 156: Outfits, Vocations, and Action Icon Curatorship', () => {
  it('correctly reports mount rider capability based on disk asset availability', () => {
    // Knight, Citizen, Hunter (Paladin), Mage (Sorcerer) have mount assets
    const knightCaps = getOutfitCapabilities('Knight');
    expect(knightCaps.hasMountRider).toBe(true);

    const citizenCaps = getOutfitCapabilities('Citizen');
    expect(citizenCaps.hasMountRider).toBe(true);

    const hunterCaps = getOutfitCapabilities('Hunter');
    expect(hunterCaps.hasMountRider).toBe(true);

    // Sire does NOT have mounted sprites on disk
    const sireCaps = getOutfitCapabilities('Sire');
    expect(sireCaps.hasMountRider).toBe(false);
  });

  it('normalizes outfit aliases accurately', () => {
    expect(normalizeOutfitId('Knight')).toBe('knight');
    expect(normalizeOutfitId('Paladin')).toBe('hunter');
    expect(normalizeOutfitId('Sorcerer')).toBe('mage');
  });

  it('filters spells without CipSoft icons in action image resolver', () => {
    // Authentic CipSoft spells should resolve
    const exura = resolveActionImagePath('exura', 'spell', 'exura');
    expect(exura).toBeTruthy();
    expect(typeof exura).toBe('string');

    // Placeholders or spells without official icons should return null
    const nonExistent = resolveActionImagePath('fake_spell_xyz_123', 'spell');
    expect(nonExistent).toBeNull();
  });
});
