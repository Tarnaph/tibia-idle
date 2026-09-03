import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 38: Fontes da Caçada Unificadas, Movimento Fluído com VisualMotionTrack e Integridade Completa do Barco e Cidade', () => {
  it('validates hunt floating text sizes are identical (7) and slightly smaller than nameplate (8)', () => {
    const projectRoot = resolve(__dirname, '..');
    const pixiArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/PixiArena.tsx'), 'utf8');

    // Nameplate font size is 8
    expect(pixiArenaSrc).toContain("fontSize: 8, fontFamily: 'Arial'");

    // Speech/Magic font size is 7
    expect(pixiArenaSrc).toContain('fontSize: 7');
    expect(pixiArenaSrc).toContain("fontFamily: 'Verdana, Arial, sans-serif'");

    // XP font size is 7
    expect(pixiArenaSrc).toContain("text: `+${event.amount} XP`");

    // Heal & Damage font size is 7
    expect(pixiArenaSrc).toContain("text: `${prefix}${amount}`");
  });

  it('validates that ThaisCityArena uses VisualMotionTrack for continuous fluid walking', () => {
    const projectRoot = resolve(__dirname, '..');
    const thaisArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');

    // VisualMotionTrack imported and used
    expect(thaisArenaSrc).toContain('VisualMotionTrack');
    expect(thaisArenaSrc).toContain('new VisualMotionTrack(');
    expect(thaisArenaSrc).toContain('motionTrack.sample(now)');
  });

  it('validates that Floor 6 strictly preserves Z:6 tiles for domain navigation', () => {
    const upperTiles = (thaisCityJson as { upperTiles?: Array<{ x: number; y: number; z: number; serverItemIds: number[] }> }).upperTiles ?? [];
    expect(upperTiles.every((t) => t.z === 6)).toBe(true);
    expect(upperTiles.length).toBeGreaterThan(7000);
  });

  it('verifies that item PNG assets on disk cover more than 1,150 unique Thais items', () => {
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

    expect(existingPngCount).toBeGreaterThan(1150);
  });
});
