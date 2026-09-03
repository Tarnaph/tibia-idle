import { describe, expect, it } from 'vitest';
import { calculatePlayerSpeed, calculateStepDurationMs, findCityPath } from '../packages/domain/src';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 33: Thais Completa - Fonte Nítida, Velocidade Oficial por Nível e Pathfinding por Clique com Hover de Tile', () => {
  it('calculates player speed using official TFS formula: baseSpeed + 2 * (level - 1)', () => {
    // Level 1: 220 + 0 = 220
    expect(calculatePlayerSpeed(1)).toBe(220);
    // Level 8: 220 + 14 = 234
    expect(calculatePlayerSpeed(8)).toBe(234);
    // Level 20: 220 + 38 = 258
    expect(calculatePlayerSpeed(20)).toBe(258);
    // Level 50: 220 + 98 = 318
    expect(calculatePlayerSpeed(50)).toBe(318);
    // Level 100: 220 + 198 = 418
    expect(calculatePlayerSpeed(100)).toBe(418);
    // Level 200: 220 + 398 = 618
    expect(calculatePlayerSpeed(200)).toBe(618);
  });

  it('calculates step duration using official TFS logarithmic formula, accelerating as level increases', () => {
    const durLvl1 = calculateStepDurationMs(calculatePlayerSpeed(1));
    const durLvl20 = calculateStepDurationMs(calculatePlayerSpeed(20));
    const durLvl50 = calculateStepDurationMs(calculatePlayerSpeed(50));
    const durLvl100 = calculateStepDurationMs(calculatePlayerSpeed(100));
    const durLvl200 = calculateStepDurationMs(calculatePlayerSpeed(200));

    expect(durLvl1).toBe(550);
    expect(durLvl20).toBe(500);
    expect(durLvl50).toBe(400);
    expect(durLvl100).toBe(350);
    expect(durLvl200).toBe(250);

    // Verify monotonic speedup (duration strictly decreases with level)
    expect(durLvl20).toBeLessThanOrEqual(durLvl1);
    expect(durLvl50).toBeLessThan(durLvl20);
    expect(durLvl100).toBeLessThan(durLvl50);
    expect(durLvl200).toBeLessThan(durLvl100);
  });

  it('verifies that Thais map is expanded covering the entire city without black voids', () => {
    const thais = thaisCityJson;
    expect(thais.tiles.length).toBeGreaterThan(15000);
    expect(thais.bounds.minX).toBeLessThanOrEqual(32280);
    expect(thais.bounds.maxX).toBeGreaterThanOrEqual(32430);
    expect(thais.bounds.minY).toBeLessThanOrEqual(32170);
    expect(thais.bounds.maxY).toBeGreaterThanOrEqual(32290);
  });

  it('finds valid walkable path in Thais using A* pathfinding', () => {
    const tileMap = new Map<string, { walkable: boolean }>();
    for (const t of thaisCityJson.tiles) {
      tileMap.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }

    // Path inside Thais temple from 32369, 32241 to 32368, 32230
    const start = { x: 32369, y: 32241, z: 7 };
    const goal = { x: 32368, y: 32230, z: 7 };
    const path = findCityPath(tileMap, start, goal);

    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual(goal);

    // Every step in path must be walkable
    for (const step of path) {
      const tile = tileMap.get(`${step.x},${step.y}`);
      expect(tile?.walkable).toBe(true);
    }
  });

  it('returns empty path if target tile is not walkable (e.g. wall/pillar)', () => {
    const tileMap = new Map<string, { walkable: boolean }>();
    for (const t of thaisCityJson.tiles) {
      tileMap.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }

    // Find an unwalkable tile in Thais
    const unwalkableTile = thaisCityJson.tiles.find((t) => !t.walkable);
    expect(unwalkableTile).toBeDefined();

    if (unwalkableTile) {
      const start = { x: 32369, y: 32241, z: 7 };
      const goal = { x: unwalkableTile.x, y: unwalkableTile.y, z: 7 };
      const path = findCityPath(tileMap, start, goal);
      expect(path).toEqual([]);
    }
  });
});
