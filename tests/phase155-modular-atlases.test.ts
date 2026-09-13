import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initialHunts } from '../packages/domain/src/hunt';

describe('Phase 155 - Modular Atlases & Zone Loading Architecture', () => {
  const atlasesDir = path.resolve('public', 'generated', 'atlases');

  it('Thais Atlas exists with 1px border extrusion to eliminate bleeding seams', () => {
    const pngPath = path.join(atlasesDir, 'thais-atlas.png');
    const jsonPath = path.join(atlasesDir, 'thais-atlas.json');

    expect(fs.existsSync(pngPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const frameKeys = Object.keys(json.frames);
    expect(frameKeys.length).toBeGreaterThan(1000);

    // Verify 1px extrusion offset on frames (x >= 1 and y >= 1)
    for (const key of frameKeys.slice(0, 50)) {
      const f = json.frames[key];
      expect(f.frame.x).toBeGreaterThanOrEqual(1);
      expect(f.frame.y).toBeGreaterThanOrEqual(1);
      expect(f.frame.w).toBeGreaterThanOrEqual(32);
      expect(f.frame.h).toBeGreaterThanOrEqual(32);
    }
  });

  it('Spells & Runes Atlas packages all spells and runes with aliases', () => {
    const pngPath = path.join(atlasesDir, 'spells-atlas.png');
    const jsonPath = path.join(atlasesDir, 'spells-atlas.json');

    expect(fs.existsSync(pngPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const frameKeys = Object.keys(json.frames);
    expect(frameKeys.length).toBeGreaterThan(300);

    // Verify presence of canonical spells, named spells, and runes
    expect(json.frames['spell-0']).toBeDefined();
    expect(json.frames['exura'] || json.frames['spell-exura']).toBeDefined();
    expect(json.frames['/spells/exura.png']).toBeDefined();
    expect(json.frames['sudden-death-rune'] || json.frames['rune-sudden-death-rune']).toBeDefined();
    expect(json.frames['/runes/sudden-death-rune.png']).toBeDefined();
  });

  it('Equipment Atlas packages wearable equipment, coins, backpacks and potions', () => {
    const pngPath = path.join(atlasesDir, 'equipment-atlas.png');
    const jsonPath = path.join(atlasesDir, 'equipment-atlas.json');

    expect(fs.existsSync(pngPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const frameKeys = Object.keys(json.frames);
    expect(frameKeys.length).toBeGreaterThan(1000);

    // Plate Armor (2463)
    expect(json.frames['item-2463']).toBeDefined();
    expect(json.frames['/assets/items/item-2463.png']).toBeDefined();

    // Crystal Coin (2160)
    expect(json.frames['item-2160']).toBeDefined();

    // Potions
    expect(json.frames['health-potion'] || json.frames['potion-health-potion']).toBeDefined();
    expect(json.frames['/potions/health-potion.png']).toBeDefined();
  });

  it('All hunt definitions have a dedicated hunt monster atlas with valid animation frames', () => {
    for (const hunt of initialHunts) {
      const pngPath = path.join(atlasesDir, `hunt-${hunt.id}-atlas.png`);
      const jsonPath = path.join(atlasesDir, `hunt-${hunt.id}-atlas.json`);

      expect(fs.existsSync(pngPath), `Atlas PNG for hunt ${hunt.id} should exist`).toBe(true);
      expect(fs.existsSync(jsonPath), `Atlas JSON for hunt ${hunt.id} should exist`).toBe(true);

      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const frameKeys = Object.keys(json.frames);
      expect(frameKeys.length).toBeGreaterThan(0);

      // Verify specific monsters in rat-cellars
      if (hunt.id === 'rat-cellars') {
        const hasRatFrame = frameKeys.some((k) => k.includes('rat'));
        expect(hasRatFrame).toBe(true);
      }
    }
  });
});
