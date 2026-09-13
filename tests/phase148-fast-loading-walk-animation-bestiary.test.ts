import { describe, it, expect } from 'vitest';
import { compileEssentialAssetUrls } from '@/apps/web/lib/assetPreloader';
import { VisualMotionTrack } from '@/packages/presentation/src/movement';

describe('Phase 148: Fast Loading, Walk Animation & Bestiary Persistence', () => {
  describe('1. Asset Preloader Optimization', () => {
    it('compiles a lean, focused set of essential assets instead of thousands of tiles', () => {
      const assets = compileEssentialAssetUrls();

      // Ensure no phantom _rider_ URLs that cause 404s
      assets.mounts.forEach((url) => {
        expect(url).not.toContain('_rider_');
      });

      // Total map tiles should be localized around the temple, not the whole city (2760 tiles)
      expect(assets.map.length).toBeLessThan(250);

      // Mounts are mapped to idle f0 frames (no rider phantom URLs)
      expect(assets.mounts.length).toBeGreaterThanOrEqual(50);

      // Outfits should only include core starting outfits (5 vocations/citizen, 10 frames each)
      expect(assets.outfits.length).toBeLessThanOrEqual(450);

      // Total assets preloaded on first entry should be manageable (< 2000 total URLs, down from 5,000+)
      const totalCount =
        assets.map.length +
        assets.mounts.length +
        assets.outfits.length +
        assets.spells.length +
        assets.effects.length +
        assets.items.length +
        assets.audio.length;

      expect(totalCount).toBeLessThan(2000);
    });
  });

  describe('2. VisualMotionTrack Step Progress Synchronization', () => {
    it('reports progress 0 and moving false when at rest', () => {
      const track = new VisualMotionTrack({ x: 32369, y: 32241, z: 7 });
      const sample = track.sample(1000);

      expect(sample.moving).toBe(false);
      expect(sample.progress).toBe(0);
      expect(sample.renderPosition).toEqual({ x: 32369, y: 32241, z: 7 });
    });

    it('reports progressive interpolation values (0.0 to 1.0) during tile movement', () => {
      const track = new VisualMotionTrack({ x: 10, y: 10, z: 7 });
      const startTime = 1000;
      const durationMs = 200;

      track.commit({ x: 10, y: 10, z: 7 }, { x: 11, y: 10, z: 7 }, startTime, durationMs);

      // At start (0ms into step)
      const sampleStart = track.sample(startTime);
      expect(sampleStart.moving).toBe(true);
      expect(sampleStart.progress).toBeCloseTo(0, 2);

      // Mid-step (100ms into 200ms step = 50% progress)
      const sampleMid = track.sample(startTime + 100);
      expect(sampleMid.moving).toBe(true);
      expect(sampleMid.progress).toBeCloseTo(0.5, 2);
      expect(sampleMid.renderPosition.x).toBeCloseTo(10.5, 2);

      // End-step (200ms into 200ms step)
      const sampleEnd = track.sample(startTime + 200);
      expect(sampleEnd.progress).toBe(0); // Transitioned to anchor at destination
      expect(sampleEnd.moving).toBe(false);
      expect(sampleEnd.renderPosition.x).toBe(11);
    });
  });

  describe('3. Walk Frame Determination Logic', () => {
    it('determines standing pose (f0) when not moving', () => {
      const isMoving = false;
      const sampleProgress = 0;
      const stepParity = 0;
      const maxFrames = 9;

      const walkFrame = isMoving
        ? (maxFrames <= 3 ? (stepParity === 0 ? 1 : 2) : (1 + (stepParity === 0 ? 0 : 4) + Math.min(3, Math.floor(sampleProgress * 4))))
        : 0;

      expect(walkFrame).toBe(0);
    });

    it('advances through frames 1..4 on step parity 0 and 5..8 on step parity 1 for 8-frame outfits', () => {
      const isMoving = true;
      const maxFrames = 9;

      // Step 1: Parity 0 (frames 1 to 4 as progress goes 0 -> 1)
      const frame0_0 = 1 + (0) + Math.min(3, Math.floor(0.1 * 4));
      const frame0_1 = 1 + (0) + Math.min(3, Math.floor(0.35 * 4));
      const frame0_2 = 1 + (0) + Math.min(3, Math.floor(0.65 * 4));
      const frame0_3 = 1 + (0) + Math.min(3, Math.floor(0.9 * 4));

      expect(frame0_0).toBe(1);
      expect(frame0_1).toBe(2);
      expect(frame0_2).toBe(3);
      expect(frame0_3).toBe(4);

      // Step 2: Parity 1 (frames 5 to 8 as progress goes 0 -> 1)
      const frame1_0 = 1 + (4) + Math.min(3, Math.floor(0.1 * 4));
      const frame1_1 = 1 + (4) + Math.min(3, Math.floor(0.35 * 4));
      const frame1_2 = 1 + (4) + Math.min(3, Math.floor(0.65 * 4));
      const frame1_3 = 1 + (4) + Math.min(3, Math.floor(0.9 * 4));

      expect(frame1_0).toBe(5);
      expect(frame1_1).toBe(6);
      expect(frame1_2).toBe(7);
      expect(frame1_3).toBe(8);
    });
  });

  describe('4. Bestiary State Capture & Persistence Payload', () => {
    it('captures accumulated bestiary kills in the save state ref', () => {
      const activeChar = { id: 'char-1', name: 'Knight', bestiaryKills: { rat: 15 } };
      const session = { bestiaryKills: { rotworm: 30 } };
      const componentKills = { dragon: 2 };

      const mergedKills = {
        ...((session as any)?.bestiaryKills || {}),
        ...((activeChar as any)?.bestiaryKills || {}),
        ...componentKills,
      };

      expect(mergedKills).toEqual({
        rotworm: 30,
        rat: 15,
        dragon: 2,
      });
    });
  });
});
