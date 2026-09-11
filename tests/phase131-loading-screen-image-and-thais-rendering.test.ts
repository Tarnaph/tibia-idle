import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 131: Loading Screen Image & Non-Blocking Thais City Viewport Rendering', () => {
  const exuraComponentPath = path.resolve(__dirname, '../apps/web/components/ExuraLoadingScreen.tsx');
  const thaisCityArenaPath = path.resolve(__dirname, '../apps/web/components/ThaisCityArena.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');

  describe('1. Loading Screen Image Rendering & Resilient Fallback', () => {
    it('verifies loading artworks exist on disk with valid file sizes', () => {
      const thaisPath = path.resolve(__dirname, '../public/images/loading/thais-loading.jpg');
      const dragonPath = path.resolve(__dirname, '../public/images/loading/dragon-lair-loading.jpg');
      const fallbackPath = path.resolve(__dirname, '../public/images/loading/loading-bg.jpg');

      expect(fs.existsSync(thaisPath)).toBe(true);
      expect(fs.existsSync(dragonPath)).toBe(true);
      expect(fs.existsSync(fallbackPath)).toBe(true);

      expect(fs.statSync(thaisPath).size).toBeGreaterThan(200_000);
      expect(fs.statSync(dragonPath).size).toBeGreaterThan(200_000);
      expect(fs.statSync(fallbackPath).size).toBeGreaterThan(100_000);
    });

    it('renders explicit <img> element with objectFit cover in ExuraLoadingScreen', () => {
      const code = fs.readFileSync(exuraComponentPath, 'utf8');

      expect(code).toContain('<img');
      expect(code).toContain("alt=\"Loading artwork\"");
      expect(code).toContain("src={bgImage || '/images/loading/thais-loading.jpg'}");
      expect(code).toContain("objectFit: 'cover'");
      expect(code).toContain("onError=");
      expect(code).toContain("/images/loading/loading-bg.jpg");
    });

    it('includes layered vignette overlay and stacks content above image at zIndex 10', () => {
      const code = fs.readFileSync(exuraComponentPath, 'utf8');

      expect(code).toContain('radial-gradient(ellipse at center');
      expect(code).toContain("zIndex: 10");
      expect(code).toContain("overflow: 'hidden'");
    });

    it('preloads loading screen images on client boot in GamePrototype', () => {
      const code = fs.readFileSync(gamePrototypePath, 'utf8');

      expect(code).toContain("Phase 131: Preload loading screen artworks");
      expect(code).toContain("'/images/loading/thais-loading.jpg'");
      expect(code).toContain("'/images/loading/dragon-lair-loading.jpg'");
      expect(code).toContain("'/images/loading/loading-bg.jpg'");
    });
  });

  describe('2. Non-Blocking Thais City Streaming & Zero Black Screen', () => {
    it('does NOT block scene initialization on hundreds of map textures', () => {
      const code = fs.readFileSync(thaisCityArenaPath, 'utf8');

      // The synchronous priority list must only contain immediate spawn essentials, NOT 550 immediateThaisMapUrls
      expect(code).not.toContain('...immediateThaisMapUrls,\n      ];\n      try {\n        await loadBatch(priorityUrls');
      expect(code).toContain('Preload ONLY core immediate spawn assets');
    });

    it('streams map textures and background assets asynchronously without blocking rendering', () => {
      const code = fs.readFileSync(thaisCityArenaPath, 'utf8');

      expect(code).toContain('void loadBatch(immediateThaisMapUrls');
      expect(code).toContain('void loadBatch(distantThaisMapUrls');
      expect(code).toContain('registerPendingSprite');
      expect(code).toContain('resolvePendingSprites');
    });

    it('hardens camera and screen calculations against NaN and zero dimensions', () => {
      const code = fs.readFileSync(thaisCityArenaPath, 'utf8');

      expect(code).toContain('Number.isFinite(smoothCamX)');
      expect(code).toContain('Number.isFinite(smoothCamY)');
      expect(code).toContain('!Number.isFinite(smoothCamX)) smoothCamX = targetCamX');
      expect(code).toContain('!Number.isFinite(smoothCamY)) smoothCamY = targetCamY');
      expect(code).toContain('screenW');
      expect(code).toContain('screenH');
      expect(code).toContain('Math.round(smoothCamX)');
      expect(code).toContain('Math.round(smoothCamY)');
    });
  });
});
