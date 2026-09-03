import { describe, expect, it } from 'vitest';
import {
  findHuntTravelRoute,
  resolveStairsTransition,
  THAIS_DOCK_TRAVEL,
  THAIS_STAIRS_TRANSITIONS,
} from '../packages/domain/src';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 36: Restauração Visual da Cidade (Isolamento de Andares Z:7 e Z:6) e Sistema Canônico de Escadas TFS', () => {
  it('verifies strict isolation between Floor 7 and Floor 6 datasets', () => {
    const tilesZ7 = thaisCityJson.tiles;
    const tilesZ6 = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];

    expect(tilesZ7.length).toBeGreaterThan(15000);
    expect(tilesZ6.length).toBeGreaterThan(5000);

    // Floor 7 must ONLY contain Z:7 tiles (clean ground level)
    expect(tilesZ7.every((t) => t.z === 7)).toBe(true);

    // Floor 6 must ONLY contain Z:6 tiles (upper level, pier, boat)
    expect(tilesZ6.every((t) => t.z === 6)).toBe(true);
  });

  it('verifies canonical TFS stairs transition from foot (Z:7) to top (Z:6)', () => {
    const footPos = { x: 32321, y: 32211, z: 7 };

    // Stepping North (up the stairs)
    const resultNorth = resolveStairsTransition(footPos, 0, -1);
    expect(resultNorth).toEqual({ x: 32321, y: 32210, z: 6 });

    // Stepping South (away from stairs) does not trigger stairs transition
    const resultSouth = resolveStairsTransition(footPos, 0, 1);
    expect(resultSouth).toBeNull();
  });

  it('verifies canonical TFS stairs transition from top (Z:6) down to foot (Z:7)', () => {
    const topPos = { x: 32321, y: 32210, z: 6 };

    // Stepping South (down the stairs)
    const resultSouth = resolveStairsTransition(topPos, 0, 1);
    expect(resultSouth).toEqual({ x: 32321, y: 32211, z: 7 });

    // Stepping North (further along the wooden walkway on Z:6) does not trigger stairs down
    const resultNorth = resolveStairsTransition(topPos, 0, -1);
    expect(resultNorth).toBeNull();
  });

  it('validates multi-floor travel from Depot front (32345, 32224, 7) through the stairs to the boat pier', () => {
    const tileMapZ7 = new Map<string, { walkable: boolean }>();
    const tileMapZ6 = new Map<string, { walkable: boolean }>();
    for (const t of thaisCityJson.tiles) {
      tileMapZ7.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }
    const tilesZ6 = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
    for (const t of tilesZ6) {
      tileMapZ6.set(`${t.x},${t.y}`, { walkable: t.walkable });
    }

    const startPos = { x: 32345, y: 32224, z: 7 };
    const route = findHuntTravelRoute(tileMapZ7, tileMapZ6, startPos);

    expect(route.length).toBeGreaterThan(0);

    // Initial portion is on Floor 7
    expect(route[0].z).toBe(7);

    // Reaches stairs foot at (32321, 32211, 7)
    const footIndex = route.findIndex((p) => p.x === 32321 && p.y === 32211 && p.z === 7);
    expect(footIndex).toBeGreaterThan(-1);

    // Climbs up stairs to (32321, 32210, 6)
    const topIndex = route.findIndex((p) => p.x === 32321 && p.y === 32210 && p.z === 6);
    expect(topIndex).toBe(footIndex + 1);

    // Traverses the pier on Floor 6 all the way to boat teleporter
    const lastStep = route[route.length - 1];
    expect(lastStep).toEqual(THAIS_DOCK_TRAVEL.dockTeleport);
    expect(lastStep).toEqual({ x: 32310, y: 32210, z: 6 });
  });
});
