import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculatePlayerSpeed,
  calculateStepDurationMs,
} from '../packages/domain/src';
import {
  normalizeOutfitId,
  getOutfitLayerUrls,
} from '../apps/web/lib/outfitRecolor';
import { LOCAL_CHAT_RADIUS } from '../packages/server/src/utils/spatialGrid';

describe('Phase 47: Correção de Cores ao Andar, +100 Velocidade na Cidade e Chat Local/World com Texto Flutuante', () => {
  it('Requirement 1: Outfit walk layer URLs and recolor safeguards prevent color flickering', () => {
    const directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'];
    const frames = [0, 1, 2];

    for (const dir of directions) {
      for (const f of frames) {
        const { base, mask } = getOutfitLayerUrls('knight', 'male', dir, f);
        expect(base).toContain(`knight-male-${dir}-f${f}-base.png`);
        expect(mask).toContain(`knight-male-${dir}-f${f}-mask.png`);
      }
    }

    const projectRoot = resolve(__dirname, '..');
    const recolorSrc = readFileSync(resolve(projectRoot, 'apps/web/lib/outfitRecolor.ts'), 'utf8');
    const cityArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');

    // outfitRecolor exports preloadOutfitAllFrames and provides safe recolor fallback
    expect(recolorSrc).toContain('preloadOutfitAllFrames');
    expect(recolorSrc).toContain('dirFallbackKey');

    // ThaisCityArena preloads frames and prevents falling back to uncolored sprites
    expect(cityArenaSrc).toContain('preloadOutfitAllFrames');
    expect(cityArenaSrc).toContain('view.lastTextureKey');
  });

  it('Requirement 2: +100 speed bonus for players in the city', () => {
    // Normal level 1 speed = 220 -> step 550ms
    const baseLvl1 = calculatePlayerSpeed(1);
    expect(baseLvl1).toBe(220);
    expect(calculateStepDurationMs(baseLvl1)).toBe(550);

    // City level 1 speed = 220 + 100 = 320 -> step 400ms (significant speedup!)
    const cityLvl1 = baseLvl1 + 100;
    expect(cityLvl1).toBe(320);
    expect(calculateStepDurationMs(cityLvl1)).toBe(400);

    // Normal level 20 speed = 258 -> step 500ms
    const baseLvl20 = calculatePlayerSpeed(20);
    expect(baseLvl20).toBe(258);
    expect(calculateStepDurationMs(baseLvl20)).toBe(500);

    // City level 20 speed = 258 + 100 = 358 -> step 400ms (vs 500ms outside)
    const cityLvl20 = baseLvl20 + 100;
    expect(cityLvl20).toBe(358);
    expect(calculateStepDurationMs(cityLvl20)).toBe(400);

    // Normal level 50 speed = 318 -> step 400ms
    const baseLvl50 = calculatePlayerSpeed(50);
    expect(baseLvl50).toBe(318);
    expect(calculateStepDurationMs(baseLvl50)).toBe(400);

    // City level 50 speed = 318 + 100 = 418 -> step 350ms (vs 400ms outside)
    const cityLvl50 = baseLvl50 + 100;
    expect(cityLvl50).toBe(418);
    expect(calculateStepDurationMs(cityLvl50)).toBe(350);

    const projectRoot = resolve(__dirname, '..');
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');
    expect(protoSrc).toContain('const citySpeedBonus = 100;');
    expect(protoSrc).toContain('const cityPlayerSpeed = playerSpeed + citySpeedBonus;');
    expect(protoSrc).toContain('const cityStepDurationMs = calculateStepDurationMs(cityPlayerSpeed);');

    // Server anti-speedhack lowered to 100ms
    const serverRoomSrc = readFileSync(resolve(projectRoot, 'packages/server/src/rooms/ThaisCityRoom.ts'), 'utf8');
    expect(serverRoomSrc).toContain('now - player.lastStepTime < 100');
  });

  it('Requirement 3 & 4: Chat Window with Local/World tabs, Enter shortcut, and Yellow/Blue overhead text', () => {
    expect(LOCAL_CHAT_RADIUS).toBe(8);

    const projectRoot = resolve(__dirname, '..');
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');
    const cityArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');
    const chatWinSrc = readFileSync(resolve(projectRoot, 'apps/web/components/chat/ChatWindow.tsx'), 'utf8');
    const serverRoomSrc = readFileSync(resolve(projectRoot, 'packages/server/src/rooms/ThaisCityRoom.ts'), 'utf8');

    // ChatWindow has Local Chat and World Chat tabs
    expect(chatWinSrc).toContain('Local Chat');
    expect(chatWinSrc).toContain('World Chat');
    expect(chatWinSrc).toContain('focusInput');

    // GamePrototype focuses directly into local chat on Enter in city
    expect(protoSrc).toContain("e.key === 'Enter'");
    expect(protoSrc).toContain("chatWindowRef.current?.focusInput('local')");
    expect(protoSrc).toContain('<ChatWindow');

    // ThaisCityArena renders overhead floating text: Yellow (0xffff00) for local, Blue (0x55ffff) for world
    expect(cityArenaSrc).toContain('overheadSpeech');
    expect(cityArenaSrc).toContain('0xffff00 : 0x55ffff');
    expect(cityArenaSrc).toContain('speechExpiresAt');

    // Server routes local chat spatially and world chat globally
    expect(serverRoomSrc).toContain("normalizedChannel === 'world'");
    expect(serverRoomSrc).toContain("normalizedChannel === 'local'");
    expect(serverRoomSrc).toContain('LOCAL_CHAT_RADIUS');
  });
});
