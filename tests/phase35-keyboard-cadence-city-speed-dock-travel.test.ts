import { describe, expect, it } from 'vitest';
import {
  calculatePlayerSpeed,
  calculateStepDurationMs,
  findHuntTravelRoute,
  THAIS_DOCK_TRAVEL,
} from '../packages/domain/src';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 35: Cadência de Teclado, Velocidade Urbana (+25%) e Viagem para Caçada via Cais de Thais', () => {
  it('calculates city movement speed as 25% faster than base speed', () => {
    // Level 1: base 550ms -> city 440ms (550 / 1.25)
    const baseLvl1 = calculateStepDurationMs(calculatePlayerSpeed(1));
    const cityLvl1 = Math.round(baseLvl1 / 1.25);
    expect(baseLvl1).toBe(550);
    expect(cityLvl1).toBe(440);

    // Level 20: base 500ms -> city 400ms (500 / 1.25)
    const baseLvl20 = calculateStepDurationMs(calculatePlayerSpeed(20));
    const cityLvl20 = Math.round(baseLvl20 / 1.25);
    expect(baseLvl20).toBe(500);
    expect(cityLvl20).toBe(400);

    // Level 50: base 400ms -> city 320ms (400 / 1.25)
    const baseLvl50 = calculateStepDurationMs(calculatePlayerSpeed(50));
    const cityLvl50 = Math.round(baseLvl50 / 1.25);
    expect(baseLvl50).toBe(400);
    expect(cityLvl50).toBe(320);

    // City step duration is strictly faster than base step duration
    expect(cityLvl20).toBeLessThan(baseLvl20);
    expect(cityLvl1).toBeLessThan(baseLvl1);
  });

  it('verifies that thais-city.json contains authentic tiles for both Z:7 and Z:6', () => {
    const z7Tiles = thaisCityJson.tiles;
    const z6Tiles = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];

    expect(z7Tiles.length).toBeGreaterThan(15000);
    expect(z6Tiles.length).toBeGreaterThan(5000);
  });

  it('calculates hunt travel route from Thais Temple through the stairs and along the dock to boat teleporter', () => {
    const tileMapZ7 = new Map<string, { walkable: boolean }>();
    const tileMapZ6 = new Map<string, { walkable: boolean }>();
    for (const t of thaisCityJson.tiles) {
      tileMapZ7.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }
    const z6Tiles = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
    for (const t of z6Tiles) {
      tileMapZ6.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }

    const templePos = { x: 32369, y: 32241, z: 7 };
    const route = findHuntTravelRoute(tileMapZ7, tileMapZ6, templePos);

    expect(route.length).toBeGreaterThan(0);

    // Final destination must be the boat teleporter at the dock
    const finalStep = route[route.length - 1];
    expect(finalStep).toEqual(THAIS_DOCK_TRAVEL.dockTeleport);
    expect(finalStep).toEqual({ x: 32310, y: 32210, z: 6 });

    // Route must transition via stairs from z:7 (32321, 32211) to z:6 (32321, 32210)
    const stairsFootIdx = route.findIndex((p) => p.x === 32321 && p.y === 32211 && p.z === 7);
    const stairsTopIdx = route.findIndex((p) => p.x === 32321 && p.y === 32210 && p.z === 6);

    expect(stairsFootIdx).toBeGreaterThan(-1);
    expect(stairsTopIdx).toBe(stairsFootIdx + 1);

    // Every step on z:7 must be walkable on z:7
    for (let i = 0; i <= stairsFootIdx; i++) {
      const step = route[i];
      const tile = tileMapZ7.get(`${step.x},${step.y}`);
      expect(tile?.walkable).toBe(true);
    }

    // Every step on z:6 must be walkable on z:6
    for (let i = stairsTopIdx; i < route.length; i++) {
      const step = route[i];
      const tile = tileMapZ6.get(`${step.x},${step.y}`);
      expect(tile?.walkable).toBe(true);
    }
  });

  it('calculates hunt travel route starting from Depot front (32345, 32224, 7)', () => {
    const tileMapZ7 = new Map<string, { walkable: boolean }>();
    const tileMapZ6 = new Map<string, { walkable: boolean }>();
    for (const t of thaisCityJson.tiles) {
      tileMapZ7.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }
    const z6Tiles = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
    for (const t of z6Tiles) {
      tileMapZ6.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }

    const depotFront = { x: 32345, y: 32224, z: 7 };
    const route = findHuntTravelRoute(tileMapZ7, tileMapZ6, depotFront);

    expect(route.length).toBeGreaterThan(0);
    expect(route[route.length - 1]).toEqual({ x: 32310, y: 32210, z: 6 });
  });

  it('calculates hunt travel route if already on floor 6 (e.g. stairs top)', () => {
    const tileMapZ7 = new Map<string, { walkable: boolean }>();
    const tileMapZ6 = new Map<string, { walkable: boolean }>();
    for (const t of thaisCityJson.tiles) {
      tileMapZ7.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }
    const z6Tiles = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
    for (const t of z6Tiles) {
      tileMapZ6.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }

    const stairsTop = { x: 32321, y: 32210, z: 6 };
    const route = findHuntTravelRoute(tileMapZ7, tileMapZ6, stairsTop);

    expect(route.length).toBeGreaterThan(0);
    expect(route[route.length - 1]).toEqual({ x: 32310, y: 32210, z: 6 });
    expect(route.every((p) => p.z === 6)).toBe(true);
  });
});
