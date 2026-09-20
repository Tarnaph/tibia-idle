import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { compileActivePlayerAssetUrls, compileEssentialAssetUrls } from '../apps/web/lib/assetPreloader';
import { huntAssetPreloader } from '../apps/web/lib/huntAssetPreloader';

describe('Phase 216 - Combat FX Atlas & PixiJS v8 Texture Resolution', () => {
  it('combat-fx-atlas.png and combat-fx-atlas.json exist in public/generated/atlases', () => {
    const pngPath = path.resolve(process.cwd(), 'public/generated/atlases/combat-fx-atlas.png');
    const jsonPath = path.resolve(process.cwd(), 'public/generated/atlases/combat-fx-atlas.json');

    expect(fs.existsSync(pngPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const pngBuffer = fs.readFileSync(pngPath);
    expect(pngBuffer.length).toBeGreaterThan(100000); // 480KB+

    const jsonRaw = fs.readFileSync(jsonPath, 'utf8');
    const atlasData = JSON.parse(jsonRaw);

    expect(atlasData.frames).toBeDefined();
    const frameKeys = Object.keys(atlasData.frames);
    expect(frameKeys.length).toBeGreaterThan(1000);

    // Deve conter aliases para effects e missiles
    const hasEffect = frameKeys.some((k) => k.includes('effect-1') || k.includes('effect-'));
    const hasMissile = frameKeys.some((k) => k.includes('missile-1') || k.includes('missile-'));
    expect(hasEffect).toBe(true);
    expect(hasMissile).toBe(true);
  });

  it('assetPreloader compiles combat-fx-atlas.png in essential and active player asset sets', () => {
    const essential = compileEssentialAssetUrls();
    expect(essential.map).toContain('/generated/atlases/combat-fx-atlas.png');

    const activeUrls = compileActivePlayerAssetUrls();
    expect(activeUrls.map).toContain('/generated/atlases/combat-fx-atlas.png');
  });

  it('package.json includes build-combat-atlas in build:atlases', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.scripts['build:atlases']).toContain('scripts/build-combat-atlas.mjs');
  });
});
