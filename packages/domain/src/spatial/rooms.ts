import type { HuntRegionDefinition } from '../../../content-schema/src';
import type { HuntDefinition } from '../types';
import type { GridPosition, GroundId, RoomDefinition, RoomState } from './types';
import { clonePosition, cloneTileMap, createTileMapFromRows } from './tileMap';

const layouts = [
  [
    '#####################', '#...................#', '#....O.........O....#', '#...................#',
    '#........O..........#', '#E.................X#', '#..........O........#', '#...................#',
    '#....O.........O....#', '#...................#', '#####################',
  ],
  [
    '#####################', '#...................#', '#..O.....O......O...#', '#...................#',
    '#......O............#', '#E.................X#', '#............O......#', '#...................#',
    '#...O......O.....O..#', '#...................#', '#####################',
  ],
  [
    '#####################', '#...................#', '#....O...O...O......#', '#...................#',
    '#..O.............O..#', '#E.................X#', '#..O.............O..#', '#...................#',
    '#......O...O...O....#', '#...................#', '#####################',
  ],
] as const;

const enemySpawnSets: GridPosition[][] = [
  [{ x: 14, y: 2, z: 7 }, { x: 17, y: 8, z: 7 }, { x: 13, y: 5, z: 7 }, { x: 17, y: 5, z: 7 }, { x: 15, y: 7, z: 7 }, { x: 11, y: 3, z: 7 }],
  [{ x: 15, y: 2, z: 7 }, { x: 16, y: 8, z: 7 }, { x: 13, y: 4, z: 7 }, { x: 18, y: 6, z: 7 }, { x: 12, y: 7, z: 7 }, { x: 17, y: 3, z: 7 }],
  [{ x: 16, y: 2, z: 7 }, { x: 16, y: 8, z: 7 }, { x: 12, y: 5, z: 7 }, { x: 18, y: 5, z: 7 }, { x: 13, y: 3, z: 7 }, { x: 13, y: 7, z: 7 }],
];
const partySpawns: GridPosition[] = [
  { x: 1, y: 5, z: 7 }, { x: 2, y: 4, z: 7 }, { x: 2, y: 6, z: 7 }, { x: 3, y: 5, z: 7 },
];

function groundForHunt(huntId: string): GroundId {
  if (huntId === 'spider-burrow' || huntId === 'troll-camp') return 'grass-ground';
  if (huntId === 'rat-cellars') return 'training-ground';
  return 'cave-ground';
}

export function roomDefinitionAt(hunt: HuntDefinition, index: number, region?: HuntRegionDefinition): RoomDefinition {
  if (region) {
    const { bounds } = region;
    const byPosition = new Map(region.tiles.map((tile) => [`${tile.x},${tile.y}`, tile]));
    const tiles = Array.from({ length: bounds.width * bounds.height }, (_, positionIndex) => {
      const x = positionIndex % bounds.width;
      const y = Math.floor(positionIndex / bounds.width);
      const source = byPosition.get(`${bounds.x + x},${bounds.y + y}`);
      return {
        position: { x, y, z: bounds.z }, walkable: source?.walkable === true,
        groundId: 'otbm-ground' as const,
        obstacleId: source?.walkable === true ? undefined : 'otbm-obstacle' as const,
        serverItemIds: source ? [...source.serverItemIds] : [],
        groundServerId: source?.groundServerId ?? null,
        itemProperties: source?.itemProperties.map((item) => ({ ...item })) ?? [],
        worldPosition: source ? { x: source.x, y: source.y, z: source.z } : undefined,
      };
    });
    const walkable = tiles.filter((tile) => tile.walkable);
    if (walkable.length < 8) throw new Error(`${hunt.name} OTBM region has too few walkable tiles.`);
    const nearestWalkable = (position: GridPosition): GridPosition => ({ ...walkable.reduce((best, tile) => {
      const distance = Math.abs(tile.position.x - position.x) + Math.abs(tile.position.y - position.y);
      const bestDistance = Math.abs(best.x - position.x) + Math.abs(best.y - position.y);
      return distance < bestDistance ? tile.position : best;
    }, walkable[0].position) });
    const sourceSpawns = region.spawnPositions.map((spawn) => nearestWalkable({ x: spawn.x - bounds.x, y: spawn.y - bounds.y, z: bounds.z }));
    const walkableKeys = new Set(walkable.map((tile) => `${tile.position.x},${tile.position.y}`));
    const componentKeys = new Set<string>();
    const queue = [sourceSpawns[0] ?? walkable[0].position];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      if (componentKeys.has(key) || !walkableKeys.has(key)) continue;
      componentKeys.add(key);
      queue.push(
        { x: current.x + 1, y: current.y, z: bounds.z }, { x: current.x - 1, y: current.y, z: bounds.z },
        { x: current.x, y: current.y + 1, z: bounds.z }, { x: current.x, y: current.y - 1, z: bounds.z },
      );
    }
    const component = walkable.filter((tile) => componentKeys.has(`${tile.position.x},${tile.position.y}`));
    if (component.length < 8) throw new Error(`${hunt.name} selected spawn is in an unusable OTBM component.`);
    const spawnAnchor = sourceSpawns[0] ?? component[0].position;
    const entrance = { ...component.reduce((best, tile) => (
      Math.abs(tile.position.x - spawnAnchor.x) + Math.abs(tile.position.y - spawnAnchor.y)
        > Math.abs(best.x - spawnAnchor.x) + Math.abs(best.y - spawnAnchor.y) ? tile.position : best
    ), component[0].position) };
    const exit = { ...component.reduce((best, tile) => (
      Math.abs(tile.position.x - entrance.x) + Math.abs(tile.position.y - entrance.y)
        > Math.abs(best.x - entrance.x) + Math.abs(best.y - entrance.y) ? tile.position : best
    ), component[0].position) };
    const enemySpawns = [...sourceSpawns.filter((position) => componentKeys.has(`${position.x},${position.y}`)), ...component.map((tile) => tile.position)]
      .filter((position) => Math.abs(position.x - entrance.x) + Math.abs(position.y - entrance.y) >= 5)
      .filter((position, positionIndex, all) => all.findIndex((candidate) => candidate.x === position.x && candidate.y === position.y) === positionIndex)
      .map(clonePosition);
    const partySpawns = [entrance, ...component.filter((tile) => Math.abs(tile.position.x - entrance.x) + Math.abs(tile.position.y - entrance.y) <= 3).map((tile) => tile.position)]
      .filter((position, positionIndex, all) => all.findIndex((candidate) => candidate.x === position.x && candidate.y === position.y) === positionIndex)
      .slice(0, 4).map(clonePosition);
    return {
      id: hunt.roomDefinitions[index] ?? `${hunt.id}-wave-${index + 1}`, number: index + 1,
      name: `${hunt.name} · ${hunt.environment.label}`, map: { width: bounds.width, height: bounds.height, z: bounds.z, tiles },
      entrance, exit, enemySpawns: enemySpawns.length > 0 ? enemySpawns : [exit], partySpawns,
    };
  }
  const templateIndex = index % layouts.length;
  const built = createTileMapFromRows([...layouts[templateIndex]], 7, groundForHunt(hunt.id));
  return {
    id: hunt.roomDefinitions[index] ?? `${hunt.id}-room-${index + 1}`,
    number: index + 1,
    name: `${hunt.name} · Câmara ${index + 1}`,
    map: built.map,
    entrance: built.entrance,
    exit: built.exit,
    enemySpawns: enemySpawnSets[templateIndex].map(clonePosition),
    partySpawns: partySpawns.map(clonePosition),
  };
}

export function createRoomState(hunt: HuntDefinition, index: number, region?: HuntRegionDefinition): RoomState {
  const definition = roomDefinitionAt(hunt, index, region);
  return {
    definitionId: definition.id, number: definition.number, name: definition.name,
    map: cloneTileMap(definition.map), entrance: clonePosition(definition.entrance), exit: clonePosition(definition.exit),
    phase: 'entering', phaseTicks: 1, exitUnlocked: false, occupancy: new Map(), reservations: new Map(),
  };
}
