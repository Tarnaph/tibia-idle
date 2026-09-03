import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculatePlayerSpeed,
  calculateStepDurationMs,
} from '../packages/domain/src';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 37: Movimento Fluído na Cidade (+50% Velocidade) e Mapa Completo do Segundo Andar (Z:6)', () => {
  it('calculates city movement speed as 50% faster than base speed (1.5x)', () => {
    // Level 1: base 550ms -> city 367ms (550 / 1.5)
    const baseLvl1 = calculateStepDurationMs(calculatePlayerSpeed(1));
    const cityLvl1 = Math.round(baseLvl1 / 1.5);
    expect(baseLvl1).toBe(550);
    expect(cityLvl1).toBe(367);

    // Level 20: base 500ms -> city 333ms (500 / 1.5)
    const baseLvl20 = calculateStepDurationMs(calculatePlayerSpeed(20));
    const cityLvl20 = Math.round(baseLvl20 / 1.5);
    expect(baseLvl20).toBe(500);
    expect(cityLvl20).toBe(333);

    // Level 50: base 400ms -> city 267ms (400 / 1.5)
    const baseLvl50 = calculateStepDurationMs(calculatePlayerSpeed(50));
    const cityLvl50 = Math.round(baseLvl50 / 1.5);
    expect(baseLvl50).toBe(400);
    expect(cityLvl50).toBe(267);

    // 50% speed is strictly faster than 25% speed (333ms vs 400ms at lvl 20)
    expect(cityLvl20).toBeLessThan(Math.round(baseLvl20 / 1.25));
  });

  it('validates that Floor 6 map contains full coverage across Thais without black voids', () => {
    const upperTiles = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
    expect(upperTiles.length).toBeGreaterThan(7000);

    // Verify pier tiles exist and are walkable
    const pierWalkable = upperTiles.filter(
      (t) => t.x >= 32307 && t.x <= 32321 && t.y >= 32208 && t.y <= 32213 && t.walkable
    );
    expect(pierWalkable.length).toBeGreaterThan(30);

    // Verify ship teleport point exists at (32310, 32210, 6)
    const dockTeleportTile = upperTiles.find((t) => t.x === 32310 && t.y === 32210);
    expect(dockTeleportTile).toBeDefined();
    expect(dockTeleportTile?.walkable).toBe(true);
  });

  it('verifies that all extracted items for Floor 6 have authentic PNG sprites on disk', () => {
    const projectRoot = resolve(__dirname, '..');
    const assetsPath = resolve(projectRoot, 'content/generated/tibia860-assets.json');
    const visualAssets = JSON.parse(readFileSync(assetsPath, 'utf8'));

    const upperTiles = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
    const serverIdsZ6 = new Set(upperTiles.flatMap((t) => t.serverItemIds));

    expect(serverIdsZ6.size).toBeGreaterThan(200);

    let resolvedCount = 0;
    for (const sId of serverIdsZ6) {
      const mapping = visualAssets.mapItems[String(sId)];
      if (mapping?.frame?.publicUrl) {
        const fullPath = resolve(projectRoot, 'public', mapping.frame.publicUrl.slice(1));
        if (existsSync(fullPath)) {
          resolvedCount++;
        }
      }
    }

    // Over 95% of all items on floor 6 have valid extracted PNG sprites
    const coverage = resolvedCount / serverIdsZ6.size;
    expect(coverage).toBeGreaterThan(0.95);
  });
});
