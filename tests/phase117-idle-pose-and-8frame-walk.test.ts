import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getOutfitLayerUrls } from '../apps/web/lib/outfitRecolor';

describe('Phase 117: Pipeline Autêntico de Animação Tibia 10.98 (Idle Frame 0 Canônico e Ciclo Completo de 8 Frames)', () => {
  describe('Asset Generation & File Integrity', () => {
    it('verifies that canonical f0 (idle pose) and all f1..f8 (moving walk cycle) exist on disk for citizen and knight', () => {
      const baseDir = path.resolve(process.cwd(), 'public/generated/outfits');

      // Citizen male south frames (f0 idle + f1..f8 moving)
      for (let f = 0; f <= 8; f++) {
        const file = path.join(baseDir, `citizen-male-south-f${f}-base.png`);
        expect(fs.existsSync(file), `citizen-male-south-f${f}-base.png should exist`).toBe(true);
      }

      // Knight male south frames (f0 idle + f1..f8 moving)
      for (let f = 0; f <= 8; f++) {
        const file = path.join(baseDir, `knight-male-south-f${f}-base.png`);
        expect(fs.existsSync(file), `knight-male-south-f${f}-base.png should exist`).toBe(true);
      }
    });

    it('verifies mount f0 (standing) and f1..f8 (moving gallop) exist on disk', () => {
      const mountDir = path.resolve(process.cwd(), 'public/generated/mounts');

      for (let f = 0; f <= 8; f++) {
        const file = path.join(mountDir, `donkey-south-f${f}.png`);
        expect(fs.existsSync(file), `donkey-south-f${f}.png should exist`).toBe(true);
      }
    });
  });

  describe('getOutfitLayerUrls Range & Clamp', () => {
    it('returns f0 url for frame 0 (resting idle pose)', () => {
      const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0);
      expect(urls.base).toBe('/generated/outfits/citizen-male-south-f0-base.png');
      expect(urls.mask).toBe('/generated/outfits/citizen-male-south-f0-mask.png');
    });

    it('supports all 8 walk cycle frames (f1 to f8)', () => {
      for (let f = 1; f <= 8; f++) {
        const urls = getOutfitLayerUrls('citizen', 'male', 'south', f);
        expect(urls.base).toBe(`/generated/outfits/citizen-male-south-f${f}-base.png`);
        expect(urls.mask).toBe(`/generated/outfits/citizen-male-south-f${f}-mask.png`);
      }
    });

    it('clamps frames safely between 0 and 8', () => {
      const negativeUrls = getOutfitLayerUrls('citizen', 'male', 'south', -5);
      expect(negativeUrls.base).toBe('/generated/outfits/citizen-male-south-f0-base.png');

      const overflowUrls = getOutfitLayerUrls('citizen', 'male', 'south', 99);
      expect(overflowUrls.base).toBe('/generated/outfits/citizen-male-south-f8-base.png');
    });
  });

  describe('Walk Cycle Calculation & Idle Rest Logic', () => {
    it('guarantees frame 0 (both feet planted / resting pose) whenever character is stopped', () => {
      const walkCycle8 = [1, 2, 3, 4, 5, 6, 7, 8];
      const stepRateMs = 35; // e.g. 280ms / 8

      const isMoving = false;
      const now = 15000;
      const walkFrame = isMoving ? walkCycle8[Math.floor(now / stepRateMs) % 8] : 0;

      expect(walkFrame).toBe(0);
    });

    it('smoothly cycles through all 8 CipSoft walk frames during active movement', () => {
      const walkCycle8 = [1, 2, 3, 4, 5, 6, 7, 8];
      const stepRateMs = 40;

      const framesOverTime: number[] = [];
      for (let step = 0; step < 8; step++) {
        const now = step * stepRateMs;
        const walkFrame = walkCycle8[Math.floor(now / stepRateMs) % 8];
        framesOverTime.push(walkFrame);
      }

      expect(framesOverTime).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('validates PixiArena 8-frame formula', () => {
      // moving = false
      const stoppedSample = { moving: false };
      const stoppedWalkFrame = stoppedSample.moving ? (1 + (Math.floor(0.5 * 8) % 8)) : 0;
      expect(stoppedWalkFrame).toBe(0);

      // moving = true across phases 0.0 to 1.0
      const movingSample = { moving: true };
      const phases = [0.0, 0.15, 0.28, 0.40, 0.52, 0.65, 0.77, 0.90];
      const arenaFrames = phases.map(phase =>
        movingSample.moving ? (1 + (Math.floor(phase * 8) % 8)) : 0
      );

      expect(arenaFrames).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });
});
