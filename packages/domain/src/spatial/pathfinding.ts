import type { GridPosition, TileMap } from './types';
import { isTileWalkable, positionKey, samePosition } from './tileMap';

const NEIGHBORS = [
  { x: 0, y: -1, cost: 10 },
  { x: 1, y: 0, cost: 10 },
  { x: 0, y: 1, cost: 10 },
  { x: -1, y: 0, cost: 10 },
  { x: 1, y: -1, cost: 25 },
  { x: 1, y: 1, cost: 25 },
  { x: -1, y: 1, cost: 25 },
  { x: -1, y: -1, cost: 25 },
] as const;

interface OpenNode {
  position: GridPosition;
  g: number;
  h: number;
  f: number;
}

export function meleeDistance(left: GridPosition, right: GridPosition): number {
  if (left.z !== right.z) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

export function isMeleeRange(left: GridPosition, right: GridPosition): boolean {
  return meleeDistance(left, right) === 1;
}

export function surroundingPositions(center: GridPosition): GridPosition[] {
  return NEIGHBORS.map((neighbor) => ({
    x: center.x + neighbor.x,
    y: center.y + neighbor.y,
    z: center.z,
  }));
}

export function findMeleeApproachTiles(map: TileMap, target: GridPosition, blocked: ReadonlySet<string> = new Set()): GridPosition[] {
  return surroundingPositions(target).filter((position) => isTileWalkable(map, position) && !blocked.has(positionKey(position)));
}

export function findRangedApproachTiles(map: TileMap, target: GridPosition, desiredRange: number, blocked: ReadonlySet<string> = new Set()): GridPosition[] {
  const result: GridPosition[] = [];
  const range = Math.max(1, Math.floor(desiredRange));
  for (let y = target.y - range; y <= target.y + range; y += 1) for (let x = target.x - range; x <= target.x + range; x += 1) {
    const position = { x, y, z: target.z };
    const distance = meleeDistance(position, target);
    if (distance >= 1 && distance <= range && isTileWalkable(map, position) && !blocked.has(positionKey(position))) result.push(position);
  }
  return result.sort((left, right) => (
    Math.abs(meleeDistance(left, target) - range) - Math.abs(meleeDistance(right, target) - range)
    || meleeDistance(left, target) - meleeDistance(right, target)
    || left.y - right.y || left.x - right.x
  ));
}

function heuristic(position: GridPosition, goals: GridPosition[]): number {
  return Math.min(...goals.map((goal) => {
    const dx = Math.abs(position.x - goal.x);
    const dy = Math.abs(position.y - goal.y);
    return (dx + dy) * 10;
  }));
}

function reconstructPath(
  cameFrom: Map<string, GridPosition>,
  start: GridPosition,
  goal: GridPosition,
): GridPosition[] {
  const result: GridPosition[] = [];
  let current = goal;
  while (!samePosition(current, start)) {
    result.push(current);
    const previous = cameFrom.get(positionKey(current));
    if (!previous) return [];
    current = previous;
  }
  return result.reverse();
}

export function findPath(
  map: TileMap,
  start: GridPosition,
  goals: GridPosition[],
  blocked: ReadonlySet<string> = new Set(),
): GridPosition[] {
  const validGoals = goals
    .filter((goal) => isTileWalkable(map, goal) && !blocked.has(positionKey(goal)))
    .sort((left, right) => left.y - right.y || left.x - right.x);
  if (validGoals.length === 0) return [];
  if (validGoals.some((goal) => samePosition(goal, start))) return [];

  const startKey = positionKey(start);
  const open = new Map<string, OpenNode>();
  const closed = new Set<string>();
  const cameFrom = new Map<string, GridPosition>();
  const bestG = new Map<string, number>([[startKey, 0]]);
  const startH = heuristic(start, validGoals);
  open.set(startKey, { position: start, g: 0, h: startH, f: startH });

  const canEnter = (position: GridPosition) => (
    isTileWalkable(map, position)
    && (!blocked.has(positionKey(position)) || samePosition(position, start))
  );

  while (open.size > 0) {
    const current = [...open.values()].sort((left, right) => (
      left.f - right.f
      || left.h - right.h
      || left.position.y - right.position.y
      || left.position.x - right.position.x
    ))[0];
    const currentKey = positionKey(current.position);
    open.delete(currentKey);
    if (validGoals.some((goal) => samePosition(goal, current.position))) {
      return reconstructPath(cameFrom, start, current.position);
    }
    closed.add(currentKey);

    for (const neighbor of NEIGHBORS) {
      const next = {
        x: current.position.x + neighbor.x,
        y: current.position.y + neighbor.y,
        z: current.position.z,
      };
      if (!canEnter(next)) continue;
      if (neighbor.x !== 0 && neighbor.y !== 0) {
        const horizontal = { x: current.position.x + neighbor.x, y: current.position.y, z: current.position.z };
        const vertical = { x: current.position.x, y: current.position.y + neighbor.y, z: current.position.z };
        if (!canEnter(horizontal) || !canEnter(vertical)) continue;
      }
      const nextKey = positionKey(next);
      if (closed.has(nextKey)) continue;
      const nextG = current.g + neighbor.cost;
      if (nextG >= (bestG.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      const h = heuristic(next, validGoals);
      bestG.set(nextKey, nextG);
      cameFrom.set(nextKey, current.position);
      open.set(nextKey, { position: next, g: nextG, h, f: nextG + h });
    }
  }
  return [];
}

export function findPathToMeleeRange(
  map: TileMap,
  start: GridPosition,
  target: GridPosition,
  blocked: ReadonlySet<string> = new Set(),
): GridPosition[] {
  return findPath(map, start, findMeleeApproachTiles(map, target, blocked), blocked);
}
