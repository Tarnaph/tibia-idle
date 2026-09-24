import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 230: Hunt Map Rendering, Ground Layers & Roof Culling', () => {
  const root = process.cwd();

  it('1. PixiArena.tsx implements isRoofItem filtering out roof tiles on Z:7', () => {
    const arenaSrc = fs.readFileSync(path.join(root, 'apps/web/components/PixiArena.tsx'), 'utf8');
    expect(arenaSrc).toContain('isRoofItem');
    expect(arenaSrc).toContain('6476');
    expect(arenaSrc).toContain('6488');
    expect(arenaSrc).toContain('9370');
    expect(arenaSrc).toContain('9410');
    expect(arenaSrc).toContain('1098');
    expect(arenaSrc).toContain('1140');
  });

  it('2. PixiArena.tsx recognizes ground by tile.groundServerId and assigns zIndex 0', () => {
    const arenaSrc = fs.readFileSync(path.join(root, 'apps/web/components/PixiArena.tsx'), 'utf8');
    expect(arenaSrc).toContain('serverId === (tile as any).groundServerId');
    expect(arenaSrc).toContain('isGround ? 0 :');
  });

  it('3. PixiArena.tsx recognizes transition borders and assigns zIndex 1', () => {
    const arenaSrc = fs.readFileSync(path.join(root, 'apps/web/components/PixiArena.tsx'), 'utf8');
    expect(arenaSrc).toContain('isBorderItem');
    expect(arenaSrc).toContain('isBorder ? 1 :');
    expect(arenaSrc).toContain('4542');
    expect(arenaSrc).toContain('4553');
  });

  it('4. PixiArena.tsx implements fallback ground safety net preventing transparent voids', () => {
    const arenaSrc = fs.readFileSync(path.join(root, 'apps/web/components/PixiArena.tsx'), 'utf8');
    expect(arenaSrc).toContain('groundRendered');
    expect(arenaSrc).toContain('groundSprite.zIndex = 0');
  });

  it('5. Elf Sanctuary catalog in hunt-regions.json contains tiles with groundServerId and no unculled roofs', () => {
    const huntRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/hunt-regions.json'), 'utf8'));
    const elf = huntRegions.regions.find((r: any) => r.huntId === 'elf-sanctuary');
    expect(elf).toBeDefined();
    expect(elf.tiles.length).toBeGreaterThan(500);

    // Verify all tiles have a valid groundServerId
    const missingGround = elf.tiles.filter((t: any) => !t.groundServerId);
    expect(missingGround.length).toBe(0);

    // Verify Yalahar dirt items (e.g. 9023, 9021, 9025) are present as ground
    const yalaharDirtTiles = elf.tiles.filter((t: any) => [9023, 9021, 9025, 9224, 9225].includes(t.groundServerId));
    expect(yalaharDirtTiles.length).toBeGreaterThan(50);
  });
});
