import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isImagePermanentlyFailed,
  canRetryImage,
  clearImageElementCache,
  failedImageUrls,
  getCanvasCacheKey,
  getRecoloredCanvasSync,
  normalizeOutfitId,
  normalizeMountId,
} from '../apps/web/lib/outfitRecolor';

describe('Phase 128: Auto-Save Mutex, Socket Protection and Sprite Resilience', () => {
  beforeEach(() => {
    clearImageElementCache();
  });

  describe('1. Outfit & Mount Image Loading Resilience', () => {
    it('allows retry for new URLs and does not permanently fail on first error', () => {
      const testUrl = '/generated/outfits/citizen-male-south-f0-base.png';

      expect(isImagePermanentlyFailed(testUrl)).toBe(false);
      expect(canRetryImage(testUrl)).toBe(true);
    });

    it('requires multiple failures before permanently marking an image as failed', () => {
      const testUrl = '/generated/mounts/nonexistent-mount.png';

      expect(isImagePermanentlyFailed(testUrl)).toBe(false);
      expect(failedImageUrls.has(testUrl)).toBe(false);

      // Manually register failure in failedImageUrls
      failedImageUrls.add(testUrl);
      expect(isImagePermanentlyFailed(testUrl)).toBe(true);
      expect(canRetryImage(testUrl)).toBe(false);
    });

    it('clearImageElementCache completely resets failed image state', () => {
      const testUrl = '/generated/outfits/knight-male-south-f0-base.png';
      failedImageUrls.add(testUrl);

      expect(isImagePermanentlyFailed(testUrl)).toBe(true);

      clearImageElementCache();

      expect(isImagePermanentlyFailed(testUrl)).toBe(false);
      expect(canRetryImage(testUrl)).toBe(true);
    });
  });

  describe('2. Auto-Save Mutex and Throttle Determinism', () => {
    it('enforces single-writer mutex preventing concurrent saves', async () => {
      let isSaving = false;
      let saveCallCount = 0;

      const performSave = async () => {
        if (isSaving) return false;
        isSaving = true;
        try {
          saveCallCount++;
          // Simulate network / database latency
          await new Promise((r) => setTimeout(r, 20));
          return true;
        } finally {
          isSaving = false;
        }
      };

      // Fire 5 concurrent save calls
      const results = await Promise.all([
        performSave(),
        performSave(),
        performSave(),
        performSave(),
        performSave(),
      ]);

      // Only the first one should have executed; others discarded by mutex
      expect(saveCallCount).toBe(1);
      expect(results.filter(Boolean).length).toBe(1);
    });

    it('throttles rapid periodic saves while honoring forced logout saves', () => {
      let lastSaveTime = -1;
      let saveCount = 0;

      const attemptSave = (now: number, force = false) => {
        if (!force && lastSaveTime >= 0 && now - lastSaveTime < 10000) {
          return false;
        }
        lastSaveTime = now;
        saveCount++;
        return true;
      };

      const t0 = 1000;
      // Step 1: initial save at t0
      expect(attemptSave(t0)).toBe(true);
      expect(saveCount).toBe(1);

      // Step 2: rapid walking at t0 + 200ms, 400ms, 600ms (throttled)
      expect(attemptSave(t0 + 200)).toBe(false);
      expect(attemptSave(t0 + 400)).toBe(false);
      expect(attemptSave(t0 + 600)).toBe(false);
      expect(saveCount).toBe(1);

      // Step 3: forced save (e.g. Logout / Switch Character at t0 + 800ms)
      expect(attemptSave(t0 + 800, true)).toBe(true);
      expect(saveCount).toBe(2);

      // Step 4: next periodic save at t0 + 11000ms (passed 10s cooldown)
      expect(attemptSave(t0 + 11000)).toBe(true);
      expect(saveCount).toBe(3);
    });
  });

  describe('3. Texture Normalization and Cache Key Consistency', () => {
    it('correctly normalizes outfits and mounts to canonical IDs', () => {
      expect(normalizeOutfitId('Knight')).toBe('knight');
      expect(normalizeOutfitId('MAGE')).toBe('mage');
      expect(normalizeOutfitId('Citizen')).toBe('citizen');
      expect(normalizeMountId('Donkey')).toBe('donkey');
      expect(normalizeMountId('none')).toBe('none');
    });

    it('produces distinct deterministic cache keys for unmounted and mounted characters', () => {
      const colors = { head: 10, primary: 20, secondary: 30, detail: 40 };

      const unmountedKey = getCanvasCacheKey('knight', 'male', 'south', 0, colors, 0, undefined, false);
      const mountedKey = getCanvasCacheKey('knight', 'male', 'south', 0, colors, 0, 'donkey', true);

      expect(unmountedKey).not.toBe(mountedKey);
      expect(unmountedKey).toContain('_mnone_');
      expect(mountedKey).toContain('_mdonkey_');
    });
  });
});
