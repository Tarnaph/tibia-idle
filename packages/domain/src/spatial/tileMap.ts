import type {
  GridPosition,
  GroundId,
  ObstacleId,
  RoomDefinition,
  TileMap,
  TileState,
} from './types';

export function positionKey(position: GridPosition): string {
  return `${position.x},${position.y},${position.z}`;
}

export function samePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

export function clonePosition(position: GridPosition): GridPosition {
  return { ...position };
}

export function tileAt(map: TileMap, position: GridPosition): TileState | undefined {
  if (
    position.z !== map.z
    || position.x < 0
    || position.y < 0
    || position.x >= map.width
    || position.y >= map.height
  ) return undefined;
  return map.tiles[position.y * map.width + position.x];
}

export function isTileWalkable(map: TileMap, position: GridPosition): boolean {
  return tileAt(map, position)?.walkable === true;
}

export function cloneTileMap(map: TileMap): TileMap {
  return {
    ...map,
    tiles: map.tiles.map((tile) => ({ ...tile, position: clonePosition(tile.position), worldPosition: tile.worldPosition ? clonePosition(tile.worldPosition) : undefined, serverItemIds: tile.serverItemIds ? [...tile.serverItemIds] : undefined, itemProperties: tile.itemProperties?.map((item) => ({ ...item })) })),
  };
}

export function buildOccupancyMap(map: TileMap, occupants: Array<{ id: string; position: GridPosition }>): Map<string, string> {
  const occupancy = new Map<string, string>();
  for (const occupant of occupants) {
    const tile = tileAt(map, occupant.position);
    if (!tile) throw new Error(`Occupant ${occupant.id} is outside the tile map.`);
    const key = positionKey(tile.position);
    const existing = occupancy.get(key);
    if (existing) throw new Error(`Tile ${key} is occupied by ${existing} and ${occupant.id}.`);
    occupancy.set(key, occupant.id);
  }
  return occupancy;
}

export function createTileMapFromRows(rows: string[], z = 7, groundId: GroundId = 'cave-ground'): {
  map: TileMap;
  entrance: GridPosition;
  exit: GridPosition;
} {
  if (rows.length === 0 || rows.some((row) => row.length !== rows[0].length)) {
    throw new Error('Room rows must form a non-empty rectangle.');
  }
  let entrance: GridPosition | undefined;
  let exit: GridPosition | undefined;
  const tiles: TileState[] = [];
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const symbol = rows[y][x];
      const position = { x, y, z };
      let walkable = true;
      let obstacleId: ObstacleId | undefined;
      if (symbol === '#') {
        walkable = false;
        obstacleId = 'cave-wall';
      } else if (symbol === 'O') {
        walkable = false;
        obstacleId = 'stalagmite';
      } else if (symbol === 'E') {
        entrance = position;
        obstacleId = 'entrance';
      } else if (symbol === 'X') {
        exit = position;
        obstacleId = 'exit';
      } else if (symbol !== '.') {
        throw new Error(`Unknown room symbol ${symbol}.`);
      }
      tiles.push({ position, walkable, groundId, obstacleId });
    }
  }
  if (!entrance || !exit) throw new Error('Room requires one entrance and one exit.');
  return {
    map: { width: rows[0].length, height: rows.length, z, tiles },
    entrance,
    exit,
  };
}

export function cloneRoomDefinition(room: RoomDefinition): RoomDefinition {
  return {
    ...room,
    map: cloneTileMap(room.map),
    entrance: clonePosition(room.entrance),
    exit: clonePosition(room.exit),
    enemySpawns: room.enemySpawns.map(clonePosition),
    partySpawns: room.partySpawns.map(clonePosition),
  };
}
