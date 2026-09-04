import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import visualAssetsJson from '../content/generated/tibia860-assets.json';
import type { Tibia860AssetManifest, ExtractedFrame } from '../packages/tibia860-assets/src/types';

const assets = visualAssetsJson as unknown as Tibia860AssetManifest;

describe('Sire Custom Outfit Integration', () => {
  it('registers Sire outfit in visualAssets manifest with complete metadata', () => {
    expect(assets.outfits).toBeDefined();
    expect(assets.outfits['Sire']).toBeDefined();

    const sire = assets.outfits['Sire'];
    expect(sire.key).toBe('outfit-sire');
    expect(sire.label).toBe('Sire custom outfit');
    expect(sire.frames).toHaveLength(12);

    const directions = ['north', 'east', 'south', 'west'];
    for (const dir of directions) {
      const dirFrames = sire.frames.filter((f: ExtractedFrame) => f.direction === dir);
      expect(dirFrames).toHaveLength(3);
      expect(dirFrames.map((f: ExtractedFrame) => f.frame).sort()).toEqual([0, 1, 2]);
    }
  });

  it('verifies all 12 generated outfit-sire frame files exist on disk with 64x64 resolution', () => {
    const sire = assets.outfits['Sire'];
    for (const frame of sire.frames) {
      const fullPath = path.resolve(process.cwd(), frame.file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(frame.width).toBe(64);
      expect(frame.height).toBe(64);
      expect(frame.publicUrl).toBe(`/${frame.file.replace(/^public\//, '')}`);
    }
  });

  it('verifies export sprite sheets and 32x32 raw sprites exist for external server/editor use', () => {
    const exportDir = path.resolve(process.cwd(), 'public/generated/tibia860/sire');
    expect(fs.existsSync(path.join(exportDir, 'sire-spritesheet-64x64.png'))).toBe(true);
    expect(fs.existsSync(path.join(exportDir, 'sire-spritesheet-32x32.png'))).toBe(true);

    const raw32Dir = path.join(exportDir, 'raw-32x32');
    expect(fs.existsSync(path.join(raw32Dir, 'sire_north_32x32.png'))).toBe(true);
    expect(fs.existsSync(path.join(raw32Dir, 'sire_south_32x32.png'))).toBe(true);
    expect(fs.existsSync(path.join(raw32Dir, 'sire_east_32x32.png'))).toBe(true);
    expect(fs.existsSync(path.join(raw32Dir, 'sire_west_32x32.png'))).toBe(true);
  });

  it('verifies Sire outfit entry is registered in realmap11 outfits.xml', () => {
    const outfitsXmlPath = path.resolve(process.cwd(), 'realmap11/data/XML/outfits.xml');
    const content = fs.readFileSync(outfitsXmlPath, 'utf-8');
    expect(content).toContain('name="Sire"');
    expect(content).toContain('looktype="999"');
  });
});
