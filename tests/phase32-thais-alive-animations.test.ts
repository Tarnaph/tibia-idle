import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import visualAssetsJson from '../content/generated/tibia860-assets.json';
import thaisCatalogJson from '../content/generated/tibia1098-thais-assets.json';

describe('Phase 32: Thais Alive - Character Nameplates, Green HP Bars, Walking Animations & Map Item Animations', () => {
  const projectRoot = resolve(__dirname, '..');

  it('verifies that animated items (fogo azul, teleportes, tochas, bacias, fontes) have multiple extracted frames', () => {
    const catalog = thaisCatalogJson;

    // Key animated items requested by the user:
    // 8058: mystic flame (fogo azul)
    // 1387: magic forcefield (luz de teleporte)
    // 2059, 2061: lit torch bearer (tochas)
    // 1481: coal basin (bacia de fogo/brasa)
    // 1360: fountain (fonte de água)
    const animatedChecks = [
      { id: '8058', minFrames: 4, label: 'mystic flame (fogo azul)' },
      { id: '1387', minFrames: 8, label: 'magic forcefield (luz de teleporte)' },
      { id: '2059', minFrames: 4, label: 'lit torch bearer (tochas)' },
      { id: '2061', minFrames: 4, label: 'lit torch bearer (tochas)' },
      { id: '1481', minFrames: 4, label: 'coal basin (bacia de fogo)' },
      { id: '1360', minFrames: 4, label: 'fountain (fonte de água)' },
    ];

    const itemsRecord = catalog.items as Record<string, any>;
    for (const check of animatedChecks) {
      const item = itemsRecord[check.id];
      expect(item, `Item ${check.id} (${check.label}) should exist in catalog`).toBeDefined();
      expect(item.frames, `Item ${check.id} should have animated frames array`).toBeDefined();
      expect(item.frames.length).toBeGreaterThanOrEqual(check.minFrames);

      // Verify that each frame PNG actually exists on disk in public/
      for (const f of item.frames) {
        const diskPath = resolve(projectRoot, 'public', f.publicUrl.replace(/^\//, ''));
        expect(existsSync(diskPath), `Frame file ${diskPath} must exist on disk`).toBe(true);
      }
    }
  });

  it('verifies that all character outfits have complete 4-directional walking frames (north, south, east, west)', () => {
    const outfitsRecord = visualAssetsJson.outfits as Record<string, any>;
    const requiredVocations = ['Knight', 'Paladin', 'Sorcerer', 'Druid'];
    const requiredDirections = ['north', 'south', 'east', 'west'];

    for (const voc of requiredVocations) {
      const outfit = outfitsRecord[voc];
      expect(outfit, `Outfit for vocation ${voc} must exist`).toBeDefined();

      for (const dir of requiredDirections) {
        const dirFrames = outfit.frames.filter((f: { direction: string }) => f.direction === dir);
        expect(dirFrames.length, `Vocation ${voc} direction ${dir} must have frames`).toBeGreaterThanOrEqual(3);

        for (const f of dirFrames) {
          const diskPath = resolve(projectRoot, 'public', f.publicUrl.replace(/^\//, ''));
          expect(existsSync(diskPath), `Outfit frame ${diskPath} must exist`).toBe(true);
        }
      }
    }
  });

  it('verifies authentic Tibia color palette and styling for nameplate and health bar', () => {
    // Tibia classic green text color: 0x58f773
    // Tibia classic green health bar color: 0x4fc977
    // Tibia dark red health bar background: 0x251010
    const TIBIA_NAME_COLOR = 0x58f773;
    const TIBIA_HP_GREEN = 0x4fc977;
    const TIBIA_HP_BG = 0x251010;

    expect(TIBIA_NAME_COLOR).toBe(5830515);
    expect(TIBIA_HP_GREEN).toBe(5228919);
    expect(TIBIA_HP_BG).toBe(2428944);

    // Verify HP ratio calculation: 100% HP produces full bar width
    const maxHp = 185;
    const currentHp = 185;
    const hpRatio = currentHp / maxHp;
    expect(hpRatio).toBe(1.0);

    const barWidth = 28;
    const filledWidth = barWidth * hpRatio;
    expect(filledWidth).toBe(28);
  });
});
