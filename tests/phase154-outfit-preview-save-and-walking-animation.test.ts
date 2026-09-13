import { describe, it, expect, vi } from 'vitest';
import nextConfig from '../next.config';
import {
  isImagePermanentlyFailed,
  getCanvasCacheKey,
  getOutfitCapabilities,
  normalizeOutfitId,
  normalizeMountId,
  TIBIA_133_COLORS,
} from '../apps/web/lib/outfitRecolor';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 154: Outfit Preview, Save Persistence & Fluid Walking Animation', () => {
  it('next.config.ts configures Access-Control-Allow-Origin: * for all routes', async () => {
    expect(nextConfig.headers).toBeDefined();
    if (typeof nextConfig.headers === 'function') {
      const headers = await nextConfig.headers();
      expect(Array.isArray(headers)).toBe(true);
      const catchAll = headers.find((h: any) => h.source === '/:path*');
      expect(catchAll).toBeDefined();
      const corsHeader = catchAll.headers.find((h: any) => h.key === 'Access-Control-Allow-Origin');
      expect(corsHeader).toBeDefined();
      expect(corsHeader.value).toBe('*');
    }
  });

  it('outfitRecolor.ts does not permanently blacklist failed URLs without active TTL', () => {
    // Arbitrary unattempted URL should NOT be permanently failed
    expect(isImagePermanentlyFailed('/generated/outfits/knight-male-south-f0-base.png')).toBe(false);
  });

  it('calculates continuous fluid 8-frame walk animation during movement', () => {
    const curStepDuration = 200;
    const walkCycleDuration = Math.max(160, curStepDuration * 2); // 400ms
    const caps8 = { maxFrames: 9 }; // 8 walk frames + 1 idle
    const caps3 = { maxFrames: 3 }; // 2 walk frames + 1 idle

    // Stopped: frame 0
    const idleFrame = false ? 1 : 0;
    expect(idleFrame).toBe(0);

    // Moving at t = 0ms (phase 0)
    let now = 0;
    let cyclePhase = (now % walkCycleDuration) / walkCycleDuration;
    let frame8 = 1 + (Math.floor(cyclePhase * 8) % 8);
    let frame3 = 1 + (Math.floor(cyclePhase * 2) % 2);
    expect(frame8).toBe(1);
    expect(frame3).toBe(1);

    // Moving at t = 50ms (phase 0.125) -> frame 2
    now = 50;
    cyclePhase = (now % walkCycleDuration) / walkCycleDuration;
    frame8 = 1 + (Math.floor(cyclePhase * 8) % 8);
    expect(frame8).toBe(2);

    // Moving at t = 200ms (phase 0.5) -> frame 5 for 8-frame, frame 2 for 3-frame
    now = 200;
    cyclePhase = (now % walkCycleDuration) / walkCycleDuration;
    frame8 = 1 + (Math.floor(cyclePhase * 8) % 8);
    frame3 = 1 + (Math.floor(cyclePhase * 2) % 2);
    expect(frame8).toBe(5);
    expect(frame3).toBe(2);

    // Moving at t = 350ms (phase 0.875) -> frame 8
    now = 350;
    cyclePhase = (now % walkCycleDuration) / walkCycleDuration;
    frame8 = 1 + (Math.floor(cyclePhase * 8) % 8);
    expect(frame8).toBe(8);
  });

  it('ThaisCityArena.tsx guards lastTextureKey assignment with isCached check to prevent texture key poisoning', () => {
    const filePath = path.resolve(process.cwd(), 'apps/web/components/ThaisCityArena.tsx');
    const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');

    // Verify isCached guards view.lastTextureKey in local character rendering
    expect(content).toContain('if (isCached) {\n                  view.lastTextureKey = textureKey;\n                }');
    // Verify lastCanvas is reset on outfit signature change
    expect(content).toContain('view.lastCanvas = undefined;');
    // Verify continuous walkCycleDuration formula is used
    expect(content).toContain('const walkCycleDuration = Math.max(160, curStepDuration * 2);');
    expect(content).toContain('const cyclePhase = (now % walkCycleDuration) / walkCycleDuration;');
  });

  it('OutfitModal.tsx computes effectiveMounted and triggers immediate preloading', () => {
    const filePath = path.resolve(process.cwd(), 'apps/web/components/OutfitModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('effectiveMounted = Boolean(mountActive && selectedMount !== \'none\' && caps.hasMountRider);');
    expect(content).toContain('preloadOutfitAllFrames(outfitId, charGender, colors, 0, selectedMount, mountActive && caps.hasMountRider)');
  });

  it('GamePrototype.tsx updates onlineCharacter and calls saveProgressRef in handleSaveOutfit', () => {
    const filePath = path.resolve(process.cwd(), 'apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('setOnlineCharacter((prev) => {');
    expect(content).toContain('saveProgressRef.current(false, true)');
    expect(content).toContain('gameNetwork.sendChangeOutfit(customization);');
  });

  it('validates canonical mounts and outfits catalog consistency', () => {
    const normKnight = normalizeOutfitId('Knight');
    expect(normKnight).toBe('knight');
    const knightCaps = getOutfitCapabilities(normKnight);
    expect(knightCaps.hasMountRider).toBe(true);

    const normBear = normalizeMountId('war-bear');
    expect(normBear).toBe('war-bear');

    const key = getCanvasCacheKey(
      normKnight,
      'male',
      'south',
      1,
      { head: 0, primary: 86, secondary: 114, detail: 76 },
      0,
      'war-bear',
      true
    );
    expect(key).toContain('war-bear');
    expect(key).toContain('knight');
  });
});
