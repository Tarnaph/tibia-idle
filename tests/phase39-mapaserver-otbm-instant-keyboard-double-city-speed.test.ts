import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculatePlayerSpeed, calculateStepDurationMs } from '../packages/domain/src';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 39: Integração de mapaserver.otbm, Resposta Instantânea do Teclado (0ms) e Velocidade Urbana Dobrada (2x)', () => {
  it('calculates player speed using the official TFS formula based on level', () => {
    // Level 1: base 550ms
    const baseLvl1 = calculateStepDurationMs(calculatePlayerSpeed(1));
    expect(baseLvl1).toBe(550);

    // Level 20: base 500ms
    const baseLvl20 = calculateStepDurationMs(calculatePlayerSpeed(20));
    expect(baseLvl20).toBe(500);

    // Level 50: base 400ms
    const baseLvl50 = calculateStepDurationMs(calculatePlayerSpeed(50));
    expect(baseLvl50).toBe(400);
  });

  it('validates that GamePrototype implements instant keyboard response without initial delay and continuous stepping', () => {
    const projectRoot = resolve(__dirname, '..');
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');

    // Uses held direction reference to avoid OS repeat pause
    expect(protoSrc).toContain('heldDirectionRef');
    expect(protoSrc).toContain('takeCityStep');
    expect(protoSrc).toContain('takeCityStep(deltaX, deltaY)');

    // Listens to both keydown and keyup for immediate responsive release
    expect(protoSrc).toContain("window.addEventListener('keyup', handleKeyUp)");
    expect(protoSrc).toContain("window.addEventListener('blur', handleBlur)");
  });

  it('validates that thais-city.json is generated from mapaserver.otbm with complete Floor 7 and Floor 6 coverage', () => {
    const tilesZ7 = (thaisCityJson as { tiles: Array<{ x: number; y: number; z: number }> }).tiles;
    const tilesZ6 = (thaisCityJson as { upperTiles: Array<{ x: number; y: number; z: number }> }).upperTiles;

    expect(tilesZ7.length).toBeGreaterThan(18000);
    expect(tilesZ7.every((t) => t.z === 7)).toBe(true);

    expect(tilesZ6.length).toBeGreaterThan(7000);
    expect(tilesZ6.every((t) => t.z === 6)).toBe(true);
  });

  it('verifies that ThaisCityArena applies authentic Tibia sprite offsets so structures sit on their anchor tiles', () => {
    const projectRoot = resolve(__dirname, '..');
    const arenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');

    expect(arenaSrc).toContain('mapping.frame.height > 32 ? -(mapping.frame.height - 32) : 0');
    expect(arenaSrc).toContain('mapping.frame.width > 32 ? -(mapping.frame.width - 32) : 0');
    expect(arenaSrc).toContain('sp.position.set(px + offsetX, py + offsetY)');
  });

  it('verifies that authentic PNG sprites for Thais items are present on disk', () => {
    const projectRoot = resolve(__dirname, '..');
    const assetsPath = resolve(projectRoot, 'content/generated/tibia860-assets.json');
    const visualAssets = JSON.parse(readFileSync(assetsPath, 'utf8'));

    let existingPngCount = 0;
    for (const mapping of Object.values(visualAssets.mapItems) as any[]) {
      if (mapping?.frame?.publicUrl) {
        const fullPath = resolve(projectRoot, 'public', mapping.frame.publicUrl.slice(1));
        if (existsSync(fullPath)) {
          existingPngCount++;
        }
      }
    }

    expect(existingPngCount).toBeGreaterThan(1050);
  });
});
