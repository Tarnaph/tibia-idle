import type { HuntRegionDefinition } from '../../content-schema/src';
import type { HuntDefinition, HuntRoute, RespawnZone } from './types';
import type { GridPosition, RoomState } from './spatial/types';
import { findPath } from './spatial/pathfinding';
import { clonePosition } from './spatial/tileMap';

const counts: Record<string, Array<[number, number]>> = {
  'rat-cellars': [[2, 3], [3, 3], [2, 4], [3, 4], [4, 4], [3, 5]],
  'spider-burrow': [[2, 3], [2, 4], [3, 4], [3, 5], [4, 5], [4, 6]],
  'troll-camp': [[1, 2], [2, 3], [2, 3], [3, 4], [3, 4], [3, 5]],
  'old-crypt': [[1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]],
  'rotworm-cave': [[1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 6]],
};

function routeThroughMap(room: RoomState): GridPosition[] {
  const reachableCandidates = room.map.tiles
    .filter((tile) => tile.walkable)
    .sort((a, b) => (Math.abs(b.position.x - room.entrance.x) + Math.abs(b.position.y - room.entrance.y))
      - (Math.abs(a.position.x - room.entrance.x) + Math.abs(a.position.y - room.entrance.y)));
  let farthest: GridPosition = room.entrance;
  let outward: GridPosition[] = [];
  for (const candidate of reachableCandidates) {
    const path = findPath(room.map, room.entrance, [candidate.position], new Set());
    if (path.length > 0) {
      farthest = candidate.position;
      outward = path;
      break;
    }
  }
  const homeward = outward.length > 0 ? findPath(room.map, farthest, [room.entrance], new Set()) : [];
  return [clonePosition(room.entrance), ...outward.map(clonePosition), ...homeward.slice(1).map(clonePosition)];
}

export function createContinuousHuntRoute(hunt: HuntDefinition, room: RoomState, region?: HuntRegionDefinition): HuntRoute {
  const path = routeThroughMap(room);
  const outwardLength = Math.max(2, Math.ceil(path.length / 2));
  const profile = counts[hunt.id] ?? Array.from({ length: 6 }, () => [2, 4] as [number, number]);
  const monsterPool = hunt.monsters && hunt.monsters.length > 0 ? hunt.monsters : [hunt.waves[0].monsterId];
  const monsterId = monsterPool[0];
  const importedSpawns = (region?.spawnPositions ?? []).map((spawn) => ({
    position: { x: spawn.x - (region?.bounds.x ?? 0), y: spawn.y - (region?.bounds.y ?? 0), z: spawn.z }, spawntime: spawn.spawntime ?? 60,
  })).filter(({ position }) => room.map.tiles[position.y * room.map.width + position.x]?.walkable
    && findPath(room.map, room.entrance, [position], new Set()).length > 0);
  const usedSourcePositions = new Set<string>();
  const respawnZones: RespawnZone[] = profile.map(([minCount, maxCount], index) => {
    const pathCenter = clonePosition(path[Math.min(outwardLength - 1, Math.max(1, Math.round(((index + 1) / 6) * (outwardLength - 1))))]);
    const source = [...importedSpawns].filter((candidate) => !usedSourcePositions.has(`${candidate.position.x},${candidate.position.y}`))
      .sort((a, b) => Math.abs(a.position.x - pathCenter.x) + Math.abs(a.position.y - pathCenter.y) - Math.abs(b.position.x - pathCenter.x) - Math.abs(b.position.y - pathCenter.y))[0];
    if (source) usedSourcePositions.add(`${source.position.x},${source.position.y}`);
    const center = clonePosition(source?.position ?? pathCenter);
    const positions = importedSpawns.filter((candidate) => Math.abs(candidate.position.x - center.x) + Math.abs(candidate.position.y - center.y) <= 5)
      .slice(0, maxCount).map((candidate) => clonePosition(candidate.position));
    if (positions.length === 0) positions.push(center);
    return ({
    id: `${hunt.id}-respawn-${index + 1}`,
    center, positions, radius: 3, monsterPool, monsterComposition: monsterPool.map((id) => ({ monsterId: id, count: Math.ceil(Math.min(maxCount, Math.max(minCount, positions.length)) / monsterPool.length) })), minCount, maxCount, activationRadius: 4,
    sourceRespawnSeconds: source?.spawntime ?? null, gameRespawnSeconds: 20,
  }); });
  return {
    huntId: hunt.id, mapRegion: hunt.environment.regionId, entryPoint: clonePosition(room.entrance), path,
    respawnZones,
    rareSpawnRules: {
      probability: 0.04,
      variant: { baseMonsterId: monsterId, name: `Enraged ${monsterId.replaceAll('-', ' ')}`, hpMultiplier: 2, damageMultiplier: 1.25, defenseMultiplier: 1.15, xpMultiplier: 2, lootMultiplier: 1.5, scale: 1.12, visualModifier: 'rare-aura' },
    },
    exitPoint: clonePosition(room.entrance), loopMode: true,
  };
}
