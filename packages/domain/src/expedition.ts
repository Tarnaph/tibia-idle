import type { ExpeditionEncounterDefinition, HuntDefinition, HuntExpedition } from './types';
import type { GridPosition, RoomState } from './spatial/types';
import { findPath } from './spatial/pathfinding';
import { clonePosition, positionKey } from './spatial/tileMap';

function nearestFree(path: GridPosition[], index: number, used: Set<string>): GridPosition {
  for (let offset = 0; offset < path.length; offset += 1) {
    for (const candidateIndex of [index + offset, index - offset]) {
      const candidate = path[candidateIndex];
      if (candidate && !used.has(positionKey(candidate))) return clonePosition(candidate);
    }
  }
  return clonePosition(path[Math.max(0, Math.min(path.length - 1, index))]);
}

/** Adapts the existing wave recipe to stable positions in one imported OTBM region. */
export function adaptWaveHuntToExpedition(hunt: HuntDefinition, room: RoomState): HuntExpedition {
  const walkable = room.map.tiles.filter((tile) => tile.walkable)
    .sort((left, right) => (Math.abs(left.position.x - room.entrance.x) + Math.abs(left.position.y - room.entrance.y))
      - (Math.abs(right.position.x - room.entrance.x) + Math.abs(right.position.y - room.entrance.y)));
  const farthest = walkable.at(-1)?.position ?? room.exit;
  const direct = findPath(room.map, room.entrance, [farthest], new Set());
  const path = [clonePosition(room.entrance), ...direct.map(clonePosition)];
  const usablePath = path.length > 1 ? path : [clonePosition(room.entrance), clonePosition(room.exit)];
  const used = new Set<string>([positionKey(room.entrance)]);
  const encounters = hunt.waves.map((wave, index): ExpeditionEncounterDefinition => {
    const ratio = (index + 1) / hunt.waves.length;
    const pathIndex = Math.min(usablePath.length - 1, Math.max(1, Math.round(ratio * (usablePath.length - 1))));
    const anchor = nearestFree(usablePath, pathIndex, used);
    used.add(positionKey(anchor));
    return { id: `${hunt.id}-encounter-${index + 1}`, sourceWaveIndex: index, anchor, monsterId: wave.monsterId, count: wave.count, boss: wave.boss };
  });
  return {
    huntId: hunt.id,
    mapRegion: hunt.environment.regionId,
    entryPoint: clonePosition(room.entrance), encounters,
    roamingSpawns: encounters.filter((_, index) => index % 3 === 1).map((entry) => clonePosition(entry.anchor)),
    bossEncounter: encounters.find((entry) => entry.boss) ?? null,
    exitPoint: clonePosition(room.exit), explorationPath: usablePath,
  };
}
