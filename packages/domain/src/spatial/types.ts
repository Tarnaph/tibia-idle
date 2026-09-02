export interface GridPosition {
  x: number;
  y: number;
  z: number;
}

export type CardinalDirection = 'north' | 'east' | 'south' | 'west';

export type GroundId = 'cave-ground' | 'grass-ground' | 'training-ground' | 'otbm-ground';
export type ObstacleId = 'cave-wall' | 'stalagmite' | 'entrance' | 'exit' | 'otbm-obstacle';

export interface TileState {
  position: GridPosition;
  walkable: boolean;
  groundId: GroundId;
  obstacleId?: ObstacleId;
  serverItemIds?: number[];
  groundServerId?: number | null;
  itemProperties?: Array<{ serverId: number; clientId: number | null; group: number; flags: number; blockSolid: boolean; blockPathFind: boolean }>;
  worldPosition?: GridPosition;
}

export interface TileMap {
  width: number;
  height: number;
  z: number;
  tiles: TileState[];
}

export interface RoomDefinition {
  id: string;
  number: number;
  name: string;
  map: TileMap;
  entrance: GridPosition;
  exit: GridPosition;
  enemySpawns: GridPosition[];
  partySpawns: GridPosition[];
}

export type RoomPhase = 'entering' | 'combat' | 'room-cleared' | 'exiting' | 'transitioning';

export interface RoomState {
  definitionId: string;
  number: number;
  name: string;
  map: TileMap;
  entrance: GridPosition;
  exit: GridPosition;
  phase: RoomPhase;
  phaseTicks: number;
  exitUnlocked: boolean;
  occupancy: Map<string, string>;
  reservations: Map<string, string>;
}
