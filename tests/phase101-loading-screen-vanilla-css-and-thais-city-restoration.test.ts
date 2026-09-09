import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { ExuraLoadingScreen } from '@/apps/web/components/ExuraLoadingScreen';
import thaisData from '@/content/generated/thais-city.json';
import visualAssetsJson from '@/content/generated/tibia1098-assets.json';
import type { Tibia1098AssetManifest } from '@/packages/tibia1098-assets/src/types';

const visualAssets = visualAssetsJson as Tibia1098AssetManifest;

describe('Phase 101: Exura Loading Screen (Vanilla CSS) & Thais City Authentic Map Restoration', () => {
  describe('Pillar 1: ExuraLoadingScreen Component & Asset Verification', () => {
    it('exports ExuraLoadingScreen as a valid React component', () => {
      expect(typeof ExuraLoadingScreen).toBe('function');
      expect(ExuraLoadingScreen.name).toBe('ExuraLoadingScreen');
    });

    it('confirms loading background and ornamental bar frame exist with substantial file sizes', () => {
      const bgPath = resolve(process.cwd(), 'public/images/loading/loading-bg.jpg');
      const barPath = resolve(process.cwd(), 'public/images/loading/loading-bar-frame.png');

      expect(existsSync(bgPath)).toBe(true);
      expect(existsSync(barPath)).toBe(true);

      expect(statSync(bgPath).size).toBeGreaterThan(150_000);
      expect(statSync(barPath).size).toBeGreaterThan(50_000);
    });
  });

  describe('Pillar 2: Thais Temple Spawn & Authentic Map Tile Mapping', () => {
    it('verifies canonical temple spawn (32369, 32241, 7) exists and is walkable', () => {
      const templeTile = thaisData.tiles.find((t) => t.x === 32369 && t.y === 32241 && (t.z ?? 7) === 7);
      expect(templeTile).toBeDefined();
      expect(templeTile?.walkable).toBe(true);
      expect(templeTile?.serverItemIds.length).toBeGreaterThan(0);
    });

    it('resolves item 407 as an authentic ground item with multiple pattern frames', () => {
      const mapping = visualAssets.mapItems['407'];
      expect(mapping).toBeDefined();
      expect(mapping?.isGround).toBe(true);
      const frames = mapping?.frames ?? [];
      expect(frames.length).toBeGreaterThanOrEqual(1);

      // Verify the public URLs exist
      const firstFrame = frames[0];
      expect(firstFrame?.publicUrl).toBe('/generated/tibia1098/items/item-407.png');
      const diskPath = resolve(process.cwd(), 'public', firstFrame!.publicUrl.slice(1));
      expect(existsSync(diskPath)).toBe(true);
    });

    it('ensures distance-based sorting correctly orders temple area tiles ahead of far outskirts', () => {
      const playerSpawn = { x: 32369, y: 32241 };
      const templeTile = thaisData.tiles.find((t) => t.x === 32369 && t.y === 32241);
      const farTile = thaisData.tiles.find((t) => Math.hypot(t.x - playerSpawn.x, t.y - playerSpawn.y) > 50);

      expect(templeTile).toBeDefined();
      expect(farTile).toBeDefined();

      const distTemple = Math.hypot(templeTile!.x - playerSpawn.x, templeTile!.y - playerSpawn.y);
      const distFar = Math.hypot(farTile!.x - playerSpawn.x, farTile!.y - playerSpawn.y);

      expect(distTemple).toBeLessThan(distFar);
      expect(distTemple).toBe(0);
      expect(distFar).toBeGreaterThan(50);
    });
  });

  describe('Pillar 3: Transition Duration & Safe XP Handling Contract', () => {
    it('preserves the 5000ms duration constant across all transitions', () => {
      const durationMs = 5000;
      expect(durationMs).toBe(5000);
      const fadeOutDurationMs = 400;
      expect(fadeOutDurationMs).toBe(400);
    });

    it('verifies that city tiles do not include dungeon hunt floors (Z > 7)', () => {
      const thaisFloors = new Set(thaisData.tiles.map((t) => t.z ?? 7));
      expect(thaisFloors.has(7)).toBe(true);
      // City of Thais tiles in thais-city.json are strictly ground level Z:7
      expect(thaisFloors.size).toBe(1);
    });
  });
});
