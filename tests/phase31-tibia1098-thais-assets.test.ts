import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 31: Tibia 10.98 DAT/SPR Asset Pipeline and Authentic Thais Rendering', () => {
  const projectRoot = resolve(__dirname, '..');
  const datPath = 'C:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia 11/Tibia 11/Tibia 11/Tibia.dat';
  const sprPath = 'C:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia 11/Tibia 11/Tibia 11/Tibia.spr';

  it('validates authentic Tibia 10.98 DAT and SPR file integrity', () => {
    expect(existsSync(datPath)).toBe(true);
    expect(existsSync(sprPath)).toBe(true);

    const datBuf = readFileSync(datPath);
    const sprBuf = readFileSync(sprPath);

    // DAT signature 0x42A3 for 10.98
    expect(datBuf.readUInt32LE(0)).toBe(0x42a3);
    const itemCount = datBuf.readUInt16LE(4);
    expect(itemCount).toBe(23725);

    // SPR signature 0x57bbd603 for 10.98
    expect(sprBuf.readUInt32LE(0)).toBe(0x57bbd603);
    const spriteCount = sprBuf.readUInt32LE(4);
    expect(spriteCount).toBe(338944);
  });

  it('validates that key Thais landmark items have authentic extracted PNG sprites', () => {
    const assetsJsonPath = resolve(projectRoot, 'content/generated/tibia1098-thais-assets.json');
    expect(existsSync(assetsJsonPath)).toBe(true);

    const catalog = JSON.parse(readFileSync(assetsJsonPath, 'utf8'));
    expect(catalog.itemsCount).toBeGreaterThan(200);

    // Key Thais Landmark Server IDs:
    // 406, 407: Temple checkerboard floor
    // 1448: Temple Altar
    // 1515, 1481: Temple marble columns
    // 1049: Thais city stone wall
    // 2598: Depot locker
    const requiredItems = [406, 407, 1448, 1515, 1481, 1049, 2598];
    for (const id of requiredItems) {
      const item = catalog.items[String(id)];
      expect(item, `Item ${id} should be present in extracted catalog`).toBeDefined();
      expect(item.frame.publicUrl).toBeDefined();

      const diskPath = resolve(projectRoot, 'public', item.frame.publicUrl.replace(/^\//, ''));
      expect(existsSync(diskPath), `Sprite file ${diskPath} should exist on disk`).toBe(true);
      expect(readFileSync(diskPath).length).toBeGreaterThan(50);
    }
  });

  it('verifies that the Temple of Thais spawn tile (32369, 32241) resolves an authentic ground sprite', () => {
    const assetsJsonPath = resolve(projectRoot, 'content/generated/tibia860-assets.json');
    const visualAssets = JSON.parse(readFileSync(assetsJsonPath, 'utf8'));

    const spawnTile = thaisCityJson.tiles.find(
      (t: { x: number; y: number }) => t.x === 32369 && t.y === 32241
    );
    expect(spawnTile).toBeDefined();
    expect(spawnTile!.serverItemIds).toContain(407);

    const mapping = visualAssets.mapItems['407'];
    expect(mapping).toBeDefined();
    expect(mapping.isGround).toBe(true);
    expect(mapping.frame.publicUrl).toContain('item-407.png');
  });

  it('verifies ground vs non-ground classification for proper depth sorting in the city arena', () => {
    const assetsJsonPath = resolve(projectRoot, 'content/generated/tibia860-assets.json');
    const visualAssets = JSON.parse(readFileSync(assetsJsonPath, 'utf8'));

    // Floor 406, 407 must be ground
    expect(visualAssets.mapItems['406'].isGround).toBe(true);
    expect(visualAssets.mapItems['407'].isGround).toBe(true);

    // Columns, Altar and Walls must NOT be ground (render in objectsLayer with zIndex)
    expect(visualAssets.mapItems['1448'].isGround).toBe(false); // Altar
    expect(visualAssets.mapItems['1515'].isGround).toBe(false); // Column
    expect(visualAssets.mapItems['1049'].isGround).toBe(false); // Wall
  });
});
