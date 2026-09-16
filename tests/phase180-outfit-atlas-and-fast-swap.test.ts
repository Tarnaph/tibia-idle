import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  OUTFIT_ATLAS_MANIFESTS,
  MOUNT_ATLAS_MANIFESTS,
} from '../content/generated/atlas-manifests';
import {
  hasOutfitAtlas,
  hasMountAtlas,
  getOutfitAtlasManifest,
  getMountAtlasManifest,
  getOutfitAtlasLayerRect,
  getMountAtlasFrameRect,
} from '../apps/web/lib/outfitAtlasLoader';
import { outfitDiagnostics } from '../apps/web/lib/outfitDiagnostics';

describe('Phase 180: Outfit & Mount Texture Atlases Proof-of-Concept', () => {
  // In Node test environment without browser fetch, ensure manifests are populated from public directory
  const assassinJsonPath = path.join(process.cwd(), 'public', 'generated', 'atlases', 'outfits', 'assassin-male-atlas.99b527c0.json');
  if (fs.existsSync(assassinJsonPath)) {
    OUTFIT_ATLAS_MANIFESTS['assassin-male'] = JSON.parse(fs.readFileSync(assassinJsonPath, 'utf8'));
  }
  const pantherJsonPath = path.join(process.cwd(), 'public', 'generated', 'atlases', 'mounts', 'midnight-panther-atlas.64262477.json');
  if (fs.existsSync(pantherJsonPath)) {
    MOUNT_ATLAS_MANIFESTS['midnight-panther'] = JSON.parse(fs.readFileSync(pantherJsonPath, 'utf8'));
  }

  describe('1. Atlas Artifacts & Filesystem Integrity', () => {
    it('verifies that assassin-male atlas image and manifest files exist on disk', () => {
      const outfitManifest = OUTFIT_ATLAS_MANIFESTS['assassin-male'];
      expect(outfitManifest).toBeDefined();
      expect(outfitManifest.hash).toBe('99b527c0');
      expect(outfitManifest.width).toBe(1024);
      expect(outfitManifest.height).toBe(2048);

      const filePath = path.join(process.cwd(), 'public', outfitManifest.image.replace(/^\//, ''));
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(50000); // ~120 KB
    });

    it('verifies that midnight-panther mount atlas image exists on disk', () => {
      const mountManifest = MOUNT_ATLAS_MANIFESTS['midnight-panther'];
      expect(mountManifest).toBeDefined();
      expect(mountManifest.hash).toBe('64262477');
      expect(mountManifest.width).toBe(512);
      expect(mountManifest.height).toBe(512);

      const filePath = path.join(process.cwd(), 'public', mountManifest.image.replace(/^\//, ''));
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(10000); // ~16 KB
    });
  });

  describe('2. Manifest Frame Coordinates and Coverage', () => {
    it('contains all 432 frames for assassin-male (both addons, mounted and unmounted, 4 dirs, 9 frames)', () => {
      const manifest = getOutfitAtlasManifest('assassin', 'male');
      expect(manifest).toBeDefined();
      const frames = manifest!.frames;
      expect(Object.keys(frames).length).toBe(432);

      const directions = ['south', 'east', 'north', 'west'];
      const frameIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const layers = [
        'base',
        'mask',
        'addon1-base',
        'addon1-mask',
        'addon2-base',
        'addon2-mask',
      ];
      const mountVariants = ['', '-mount'];

      for (const m of mountVariants) {
        for (const dir of directions) {
          for (const f of frameIndices) {
            for (const layer of layers) {
              const key = `assassin-male-${dir}-f${f}${m}-${layer}`;
              const rect = frames[key];
              expect(rect, `Missing frame key: ${key}`).toBeDefined();
              expect(rect.w).toBe(64);
              expect(rect.h).toBe(64);
              expect(rect.x).toBeGreaterThanOrEqual(0);
              expect(rect.y).toBeGreaterThanOrEqual(0);
              expect(rect.x + rect.w).toBeLessThanOrEqual(manifest!.width);
              expect(rect.y + rect.h).toBeLessThanOrEqual(manifest!.height);
            }
          }
        }
      }
    });

    it('contains all 36 frames for midnight-panther (4 directions x 9 frames)', () => {
      const manifest = getMountAtlasManifest('midnight-panther');
      expect(manifest).toBeDefined();
      const frames = manifest!.frames;
      expect(Object.keys(frames).length).toBe(36);

      const directions = ['south', 'east', 'north', 'west'];
      for (const dir of directions) {
        for (let f = 0; f < 9; f++) {
          const key = `midnight-panther-${dir}-f${f}`;
          const rect = frames[key];
          expect(rect, `Missing mount frame: ${key}`).toBeDefined();
          expect(rect.w).toBe(64);
          expect(rect.h).toBe(64);
          expect(rect.x + rect.w).toBeLessThanOrEqual(manifest!.width);
          expect(rect.y + rect.h).toBeLessThanOrEqual(manifest!.height);
        }
      }
    });
  });

  describe('3. Atlas Helper & Normalization Functions', () => {
    it('correctly detects available and unavailable atlases', () => {
      expect(hasOutfitAtlas('assassin', 'male')).toBe(true);
      expect(hasOutfitAtlas('Assassin', 'male')).toBe(true);
      expect(hasOutfitAtlas('nonexistent_outfit_xyz', 'male')).toBe(false);

      expect(hasMountAtlas('midnight-panther')).toBe(true);
      expect(hasMountAtlas('midnight_panther')).toBe(true);
      expect(hasMountAtlas('Midnight Panther')).toBe(true);
      expect(hasMountAtlas('nonexistent_mount_xyz')).toBe(false);
      expect(hasMountAtlas(undefined)).toBe(false);
    });

    it('retrieves accurate layer rectangles via loader API', () => {
      const baseRect = getOutfitAtlasLayerRect('assassin', 'male', 'assassin-male-south-f0-base');
      expect(baseRect).toBeDefined();
      expect(baseRect!.w).toBe(64);
      expect(baseRect!.h).toBe(64);

      const mountRect = getMountAtlasFrameRect('midnight-panther', 'midnight-panther-south-f0');
      expect(mountRect).toBeDefined();
      expect(mountRect!.w).toBe(64);
      expect(mountRect!.h).toBe(64);
    });
  });

  describe('4. Diagnostics & Divergence Tracking', () => {
    it('records atlas telemetry and catches divergences without silent fallback', () => {
      const attemptId = outfitDiagnostics.startAttempt({ outfit: 'Citizen', characterId: 'char-1' });
      outfitDiagnostics.recordAtlasUsage({
        used: true,
        outfitAtlas: 'assassin-male',
        mountAtlas: 'midnight-panther',
      }, attemptId);

      const attempt = outfitDiagnostics.getTargetAttempt(attemptId);
      expect(attempt?.atlas?.used).toBe(true);
      expect(attempt?.atlas?.outfitAtlas).toBe('assassin-male');
      expect(attempt?.atlas?.mountAtlas).toBe('midnight-panther');

      // Test divergence recording:
      outfitDiagnostics.recordDivergence('ATLAS_TEST_DIVERGENCE', attemptId);
      const updated = outfitDiagnostics.getTargetAttempt(attemptId);
      expect(updated?.divergences).toContain('ATLAS_TEST_DIVERGENCE');
    });
  });
});
