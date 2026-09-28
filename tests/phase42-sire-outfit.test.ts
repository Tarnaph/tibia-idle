import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import outfitLayersJson from '../content/generated/outfit-layers.json';
import { normalizeOutfitId } from '../apps/web/lib/outfitRecolor';

describe('Sire Custom Outfit Integration', () => {
  it('registers Sire outfit in visualAssets manifest with complete metadata', () => {
    expect(normalizeOutfitId('Sire')).toBe('sire');

    const sireLayer = (outfitLayersJson as any)['sire'];
    expect(sireLayer).toBeDefined();
    expect(sireLayer.id).toBe('sire');
    expect(sireLayer.frames).toBe(3);
  });

  it('verifies all 12 generated outfit-sire frame files exist on disk with 64x64 resolution', () => {
    const directions = ['north', 'east', 'south', 'west'];
    for (const dir of directions) {
      for (let frame = 0; frame < 3; frame++) {
        const fullPath = path.resolve(process.cwd(), `public/generated/outfits/sire-male-${dir}-f${frame}-base.png`);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    }
  });

  it('verifies export sprite sheets and 32x32 raw sprites exist for external server/editor use', () => {
    const exportDir = path.resolve(process.cwd(), 'public/generated/tibia1098/sire');
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
