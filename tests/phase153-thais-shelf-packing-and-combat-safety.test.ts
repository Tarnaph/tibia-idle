import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 153: Thais Atlas Shelf Packing & Combat Safety', () => {
  it('verifies thais-atlas.json exists and supports variable multi-tile dimensions', () => {
    const atlasJsonPath = path.resolve('public/generated/atlases/thais-atlas.json');
    expect(fs.existsSync(atlasJsonPath)).toBe(true);

    const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf8'));
    expect(atlas.meta).toBeDefined();
    expect(atlas.meta.size.w).toBe(2048);
    expect(atlas.meta.size.h).toBeGreaterThanOrEqual(2048);

    // Multi-tile items (e.g. pillars 1050 and 1052) must have their true 64x64 frame bounding box
    const pillar1050 = atlas.frames['item-1050-f0'];
    expect(pillar1050).toBeDefined();
    expect(pillar1050.frame.w).toBe(64);
    expect(pillar1050.frame.h).toBe(64);
    expect(pillar1050.sourceSize.w).toBe(64);
    expect(pillar1050.sourceSize.h).toBe(64);

    const pillar1052 = atlas.frames['item-1052-f0'];
    expect(pillar1052).toBeDefined();
    expect(pillar1052.frame.w).toBe(64);
    expect(pillar1052.frame.h).toBe(64);
  });

  it('verifies no frames overlap inside thais-atlas.json', () => {
    const atlasJsonPath = path.resolve('public/generated/atlases/thais-atlas.json');
    const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf8'));
    const frameEntries = Object.entries(atlas.frames) as [string, { frame: { x: number; y: number; w: number; h: number } }][];

    // Check a sample of 200 items for zero spatial overlap
    const sample = frameEntries.slice(0, 200);
    for (let i = 0; i < sample.length; i++) {
      const [keyA, a] = sample[i];
      for (let j = i + 1; j < sample.length; j++) {
        const [keyB, b] = sample[j];
        const overlapX = a.frame.x < b.frame.x + b.frame.w && a.frame.x + a.frame.w > b.frame.x;
        const overlapY = a.frame.y < b.frame.y + b.frame.h && a.frame.y + a.frame.h > b.frame.y;
        if (overlapX && overlapY) {
          throw new Error(`Collision detected between ${keyA} and ${keyB}: A(${a.frame.x},${a.frame.y},${a.frame.w},${a.frame.h}) vs B(${b.frame.x},${b.frame.y},${b.frame.w},${b.frame.h})`);
        }
      }
    }
  });

  it('verifies thais-item-metadata.json preserves correct width and height for multi-tile items', () => {
    const metaPath = path.resolve('content/generated/thais-item-metadata.json');
    expect(fs.existsSync(metaPath)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const item1050 = meta['1050'];
    expect(item1050).toBeDefined();
    expect(item1050.width).toBe(64);
    expect(item1050.height).toBe(64);
  });

  it('verifies tibia1098-combat-assets.json contains mapItems and corpses with item 8133 present', () => {
    const combatPath = path.resolve('content/generated/tibia1098-combat-assets.json');
    expect(fs.existsSync(combatPath)).toBe(true);

    const combat = JSON.parse(fs.readFileSync(combatPath, 'utf8'));
    expect(combat.mapItems).toBeDefined();
    expect(combat.corpses).toBeDefined();

    // Map item 8133 (hunt room item that caused the crash) must exist
    expect(combat.mapItems['8133']).toBeDefined();
    expect(combat.mapItems['8133'].appearance).toBeDefined();
    expect(combat.mapItems['8133'].frame).toBeDefined();
  });

  it('verifies PixiArena.tsx has defensive null checks for mapItems and corpses', () => {
    const pixiArenaSrc = fs.readFileSync(path.resolve('apps/web/components/PixiArena.tsx'), 'utf8');

    // Must use optional chaining for mapItems lookups
    expect(pixiArenaSrc).toContain('visualAssets.mapItems?.[String(sId)]');
    expect(pixiArenaSrc).toContain('visualAssets.mapItems?.[String(serverId)]');
    expect(pixiArenaSrc).toContain('visualAssets.corpses?.[corpse.monsterId]');

    // Must use fallback for Object.values iteration
    expect(pixiArenaSrc).toContain('visualAssets.mapItems || {}');
    expect(pixiArenaSrc).toContain('visualAssets.corpses || {}');
  });
});
