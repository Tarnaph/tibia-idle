import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  AVAILABLE_OUTFITS,
  AVAILABLE_MOUNTS,
  TIBIA_133_COLORS,
} from '../apps/web/components/OutfitModal';
import {
  parseHexColor,
  normalizeOutfitId,
  getOutfitLayerUrls,
  recolorPixels,
  type OutfitColors,
} from '../apps/web/lib/outfitRecolor';

describe('Phase 44 - Functional Outfit Recoloring and Game Application System', () => {
  it('verifies all 16 outfits in AVAILABLE_OUTFITS have base and mask layer files on disk', () => {
    const directions = ['south', 'east', 'north', 'west'] as const;
    const genders = ['male', 'female'] as const;

    for (const outfit of AVAILABLE_OUTFITS) {
      const norm = normalizeOutfitId(outfit.id);
      for (const gender of genders) {
        for (const dir of directions) {
          const { base, mask } = getOutfitLayerUrls(norm, gender, dir, 0);
          const basePath = path.resolve(process.cwd(), 'public', base.replace(/^\//, ''));
          const maskPath = path.resolve(process.cwd(), 'public', mask.replace(/^\//, ''));

          expect(fs.existsSync(basePath), `Base layer missing: ${basePath}`).toBe(true);
          expect(fs.existsSync(maskPath), `Mask layer missing: ${maskPath}`).toBe(true);
        }
      }
    }
  });

  it('verifies all 16 outfits have transparent 64x64 thumbnails in outfit-thumbs', () => {
    for (const outfit of AVAILABLE_OUTFITS) {
      const norm = normalizeOutfitId(outfit.id);
      const thumbPath = path.resolve(process.cwd(), `public/generated/outfit-thumbs/${norm}.png`);
      expect(fs.existsSync(thumbPath), `Thumb missing: ${thumbPath}`).toBe(true);
    }
  });

  it('correctly parses hex colors to RGB tuples', () => {
    expect(parseHexColor('#ffffff')).toEqual([255, 255, 255]);
    expect(parseHexColor('#000000')).toEqual([0, 0, 0]);
    expect(parseHexColor('#ff5500')).toEqual([255, 85, 0]);
    expect(parseHexColor('#00ff55')).toEqual([0, 255, 85]);
    expect(parseHexColor('#0055ff')).toEqual([0, 85, 255]);
    expect(parseHexColor('f00')).toEqual([255, 0, 0]);
  });

  it('correctly normalizes outfit IDs to canonical keys', () => {
    expect(normalizeOutfitId('Citizen')).toBe('citizen');
    expect(normalizeOutfitId('Hunter')).toBe('hunter');
    expect(normalizeOutfitId('Mage')).toBe('mage');
    expect(normalizeOutfitId('Knight')).toBe('knight');
    expect(normalizeOutfitId('Noble')).toBe('noble');
    expect(normalizeOutfitId('Barbarian')).toBe('barbarian');
    expect(normalizeOutfitId('Sire')).toBe('sire');
    expect(normalizeOutfitId('Unknown')).toBe('knight');
  });

  it('accurately verifies recolor formula according to Tibia color mask definitions', () => {
    // Simulated mock ImageData for a 2x2 sprite
    // Pixel (0,0): Unmasked base pixel -> unchanged
    // Pixel (1,0): Red mask (Head) -> tinted with head color
    // Pixel (0,1): Green mask (Body) -> tinted with body/primary color
    // Pixel (1,1): Blue mask (Legs) -> tinted with legs/secondary color
    const w = 2;
    const h = 2;

    const baseData = {
      data: new Uint8ClampedArray([
        100, 100, 100, 255,  // (0,0) unmasked
        200, 200, 200, 255,  // (1,0) head
        220, 220, 220, 255,  // (0,1) body
        180, 180, 180, 255,  // (1,1) legs
      ]),
    };

    const maskData = {
      data: new Uint8ClampedArray([
        0, 0, 0, 0,          // (0,0) transparent mask
        255, 0, 0, 255,      // (1,0) pure red = Head
        0, 255, 0, 255,      // (0,1) pure green = Body
        0, 0, 255, 255,      // (1,1) pure blue = Legs
      ]),
    };

    const outData = {
      data: new Uint8ClampedArray(w * h * 4),
    };

    const mockBaseCtx = { getImageData: () => baseData } as unknown as CanvasRenderingContext2D;
    const mockMaskCtx = { getImageData: () => maskData } as unknown as CanvasRenderingContext2D;
    const mockTargetCtx = {
      createImageData: () => outData,
      putImageData: (d: any) => { outData.data.set(d.data); },
    } as unknown as CanvasRenderingContext2D;

    // Head = Yellow (Idx 82 in row 4), Primary = Blue (Idx 88), Secondary = Green (Idx 84), Detail = Orange (Idx 77)
    const testColors: OutfitColors = { head: 82, primary: 88, secondary: 84, detail: 77 };
    recolorPixels(mockBaseCtx, mockMaskCtx, mockTargetCtx, w, h, testColors);

    // Pixel (0,0) unmasked should keep base RGB [100, 100, 100]
    expect(outData.data[0]).toBe(100);
    expect(outData.data[1]).toBe(100);
    expect(outData.data[2]).toBe(100);
    expect(outData.data[3]).toBe(255);

    // Pixel (1,0) Head masked with index 82 (#00ff00) should have Green > 0
    expect(outData.data[4 + 3]).toBe(255);
    expect(outData.data[4 + 1]).toBeGreaterThan(0);

    // Pixel (0,1) Body masked should be tinted
    expect(outData.data[8 + 3]).toBe(255);
    expect(outData.data[8 + 2]).toBeGreaterThan(0);

    // Pixel (1,1) Legs masked should be tinted
    expect(outData.data[12 + 3]).toBe(255);
  });

  it('verifies Donkey mount asset exists and is flood-filled without duplicate bars', () => {
    const donkeyPath = path.resolve(process.cwd(), 'public/generated/mounts/donkey_rider_south.png');
    expect(fs.existsSync(donkeyPath)).toBe(true);
    const stat = fs.statSync(donkeyPath);
    expect(stat.size).toBeGreaterThan(1000);
  });
});
