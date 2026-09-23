import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { huntConfigs } from '../packages/realmap11-importer/src/importHuntRegions';

describe('Phase 229: Canonical Yalahar Elf Quarter & Hunt Atlas Packaging', () => {
  const root = path.resolve(__dirname, '..');

  it('1. huntConfigs defines elf-sanctuary with canonical Yalahar coordinates [32741, 31298, 7]', () => {
    const elfDef = huntConfigs.find((h) => h.huntId === 'elf-sanctuary');
    expect(elfDef).toBeDefined();
    expect(elfDef?.center).toEqual([32741, 31298, 7]);
    expect(elfDef?.radius).toBe(25);
    expect(elfDef?.available).toBe(true);
  });

  it('2. content/generated/hunt-regions.json contains extracted Yalahar elven quarter with >= 600 walkable tiles', () => {
    const huntRegionsPath = path.join(root, 'content/generated/hunt-regions.json');
    expect(fs.existsSync(huntRegionsPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(huntRegionsPath, 'utf8'));
    const elfRegion = data.regions.find((r: any) => r.huntId === 'elf-sanctuary');
    expect(elfRegion).toBeDefined();
    expect(elfRegion.sourceCenter).toEqual({ x: 32741, y: 31298, z: 7, radius: 25 });
    expect(elfRegion.tiles.length).toBe(2601);

    const walkableCount = elfRegion.tiles.filter((t: any) => t.walkable).length;
    expect(walkableCount).toBeGreaterThanOrEqual(600);

    // Verify circular spawn ring positions
    expect(elfRegion.spawnPositions).toBeDefined();
    expect(elfRegion.spawnPositions.length).toBe(6);
    for (const sp of elfRegion.spawnPositions) {
      expect(sp.z).toBe(7);
      expect(sp.spawntime).toBe(60);
    }
  });

  it('3. hunt-elf-sanctuary-atlas contains both creature frames and map tile frames', () => {
    const atlasJsonPath = path.join(root, 'public/generated/atlases/hunt-elf-sanctuary-atlas.json');
    const atlasPngPath = path.join(root, 'public/generated/atlases/hunt-elf-sanctuary-atlas.png');

    expect(fs.existsSync(atlasJsonPath)).toBe(true);
    expect(fs.existsSync(atlasPngPath)).toBe(true);

    const stats = fs.statSync(atlasPngPath);
    expect(stats.size).toBeGreaterThan(500 * 1024); // Over 500 KB confirming rich tile inclusion

    const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf8'));
    const keys = Object.keys(atlas.frames);
    expect(keys.length).toBeGreaterThan(2000);

    // Has creature frames
    const hasElfMonster = keys.some((k) => k.includes('monster-elf-'));
    expect(hasElfMonster).toBe(true);

    // Has map item frames
    const hasMapItems = keys.some((k) => k.includes('item-') || k.includes('generated/tibia1098/items/'));
    expect(hasMapItems).toBe(true);
  });

  it('4. GamePrototype clean temple return and respawn without stuck walking paths', () => {
    const gameProtoPath = path.join(root, 'apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(gameProtoPath, 'utf8');

    // In exitHunt: sets walkingPath to null and resets heldDirectionRef
    expect(content).toContain('setWalkingPath(null);');
    expect(content).toContain('heldDirectionRef.current = null;');

    // In handleRespawnInTemple: should NOT schedule walkingPath to Depot de Thais
    expect(content).not.toContain("destinationName: 'Depot de Thais'");
  });
});
