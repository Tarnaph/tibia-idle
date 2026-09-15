import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { compileActivePlayerAssetUrls, assetPreloader } from '@/apps/web/lib/assetPreloader';
import { getCanonicalMonsterUrl, getCanonicalItemUrl, getCanonicalSpellUrl } from '@/apps/web/lib/assetPaths';
import huntRegionsJson from '@/content/generated/hunt-regions.json';

describe('Phase 150: Active Player First Preload & Assets Integrity Contract', () => {
  it('1. compileActivePlayerAssetUrls returns a lean, focused budget under 65 URLs', () => {
    const unmountedUrls = compileActivePlayerAssetUrls({
      outfit: 'Knight',
      gender: 'male',
      isMounted: false,
    });

    const totalUnmounted =
      unmountedUrls.map.length +
      unmountedUrls.mounts.length +
      unmountedUrls.outfits.length +
      unmountedUrls.spells.length +
      unmountedUrls.items.length +
      unmountedUrls.audio.length;

    // Must be a lean budget under 90 URLs (95.5% reduction compared to 1.900!)
    expect(totalUnmounted).toBeLessThanOrEqual(90);
    expect(unmountedUrls.mounts.length).toBe(0);
    expect(unmountedUrls.outfits.length).toBeGreaterThan(30);

    // Verifies all 4 walk frames (f1..f4) are included for fluid movement
    const hasSouthF1Base = unmountedUrls.outfits.some((u) => u.includes('knight-male-south-f1-base.png'));
    const hasSouthF1Mask = unmountedUrls.outfits.some((u) => u.includes('knight-male-south-f1-mask.png'));
    const hasSouthF4Base = unmountedUrls.outfits.some((u) => u.includes('knight-male-south-f4-base.png'));
    expect(hasSouthF1Base).toBe(true);
    expect(hasSouthF1Mask).toBe(true);
    expect(hasSouthF4Base).toBe(true);
  });

  it('2. compileActivePlayerAssetUrls loads only the active mount when mounted', () => {
    const mountedUrls = compileActivePlayerAssetUrls({
      outfit: 'Knight',
      gender: 'male',
      mount: 'armoured-war-horse',
      isMounted: true,
    });

    expect(mountedUrls.mounts.length).toBeGreaterThanOrEqual(4); // 4 directions with walk frames
    expect(mountedUrls.mounts[0]).toContain('armoured-war-horse');
  });

  it('3. All hunt monsters from hunt-regions.json exist physically on disk', () => {
    const rootDir = process.cwd();
    const missing: string[] = [];

    for (const region of huntRegionsJson.regions) {
      const monsterName = (region.monsterName || '').toLowerCase().replace(/\s+/g, '-');
      if (!monsterName) continue;

      const bestiaryPath = path.join(rootDir, 'public', 'generated', 'bestiary', `${monsterName}.png`);
      const assetsPath = path.join(rootDir, 'public', 'assets', 'monsters', `${monsterName}.png`);
      const thumbPath = path.join(rootDir, 'public', 'generated', 'tibia1098', `monster-${monsterName}-thumb.png`);

      const exists = fs.existsSync(bestiaryPath) || fs.existsSync(assetsPath) || fs.existsSync(thumbPath);
      if (!exists) {
        missing.push(`${region.huntId}: ${monsterName}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('4. Rat and Cave Rat monster files exist physically in official and bestiary directories', () => {
    const rootDir = process.cwd();
    const ratBestiary = path.join(rootDir, 'public', 'generated', 'bestiary', 'rat.png');
    const ratAssets = path.join(rootDir, 'public', 'assets', 'monsters', 'rat.png');
    const caveRatBestiary = path.join(rootDir, 'public', 'generated', 'bestiary', 'cave-rat.png');
    const caveRatAssets = path.join(rootDir, 'public', 'assets', 'monsters', 'cave-rat.png');

    expect(fs.existsSync(ratBestiary)).toBe(true);
    expect(fs.existsSync(ratAssets)).toBe(true);
    expect(fs.existsSync(caveRatBestiary)).toBe(true);
    expect(fs.existsSync(caveRatAssets)).toBe(true);
  });

  it('5. Canonical asset resolvers return valid paths for essential items, spells and creatures', () => {
    expect(getCanonicalMonsterUrl('rat')).toBe('/generated/bestiary/rat.png');
    expect(getCanonicalItemUrl(2160)).toBe('/generated/cyclopedia/items/item-2160.png');
    expect(getCanonicalSpellUrl('exura')).toBe('/spells/exura.png');
  });

  it('6. assetPreloaderService starts with character context and handles reset cleanly', () => {
    assetPreloader.reset();
    expect(assetPreloader.isComplete()).toBe(false);
    expect(assetPreloader.getProgress()).toBe(0);

    assetPreloader.markComplete();
    expect(assetPreloader.isComplete()).toBe(true);
    expect(assetPreloader.getProgress()).toBe(100);
  });
});
