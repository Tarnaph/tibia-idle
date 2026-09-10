import type { EnemyState, HuntEncounterState, PartyActorState, TargetSelectionStrategy } from '../types';
import { findPath, findMeleeApproachTiles, findRangedApproachTiles, isMeleeRange, meleeDistance, surroundingPositions } from './pathfinding';
import type { CardinalDirection, GridPosition } from './types';
import { buildOccupancyMap, clonePosition, isTileWalkable, positionKey, tileAt } from './tileMap';
import { createSeededRng, rollInteger } from '../rng';

export function directionBetween(from: GridPosition, to: GridPosition): CardinalDirection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
  return dy >= 0 ? 'south' : 'north';
}

function stepDuration(speed: number): number {
  return Math.max(420, Math.min(1_100, Math.round(720 * 220 / Math.max(1, speed))));
}

export function livingOccupants(encounter: HuntEncounterState): Array<{ id: string; position: GridPosition }> {
  return [
    ...encounter.partyActors.filter((actor) => actor.alive).map((actor) => ({ id: actor.characterId, position: actor.position })),
    ...encounter.enemies.filter((enemy) => enemy.alive).map((enemy) => ({ id: enemy.id, position: enemy.position })),
  ];
}

export function synchronizeEncounterOccupancy(encounter: HuntEncounterState): void {
  encounter.room.occupancy = buildOccupancyMap(encounter.room.map, livingOccupants(encounter));
}

export function assertSpatialIntegrity(encounter: HuntEncounterState): void {
  const occupants = livingOccupants(encounter);
  const rebuilt = buildOccupancyMap(encounter.room.map, occupants);
  for (const occupant of occupants) {
    const tile = tileAt(encounter.room.map, occupant.position);
    if (!tile?.walkable) {
      const entity = encounter.partyActors.find((actor) => actor.characterId === occupant.id) ?? encounter.enemies.find((enemy) => enemy.id === occupant.id);
      throw new Error(`Spatial invariant failed: ${occupant.id} occupies blocked tile ${positionKey(occupant.position)} at tick ${encounter.round}; path=${JSON.stringify(entity?.path ?? [])}`);
    }
  }
  if (rebuilt.size !== encounter.room.occupancy.size || [...rebuilt].some(([key, id]) => encounter.room.occupancy.get(key) !== id)) {
    throw new Error(`Spatial invariant failed: occupancy map diverged at tick ${encounter.round}.`);
  }
  if (new Set(encounter.room.reservations.keys()).size !== encounter.room.reservations.size) {
    throw new Error(`Spatial invariant failed: duplicate reservation at tick ${encounter.round}.`);
  }
}

function occupiedKeys(encounter: HuntEncounterState): Set<string> {
  return new Set(encounter.room.occupancy.keys());
}

function reservationKeys(encounter: HuntEncounterState): Set<string> {
  return new Set(encounter.room.reservations.keys());
}

export function isMovementStepLegal(encounter: HuntEncounterState, creatureId: string, from: GridPosition, to: GridPosition): boolean {
  const dx = Math.abs(to.x - from.x); const dy = Math.abs(to.y - from.y);
  if (from.z !== to.z || (dx === 0 && dy === 0) || dx > 1 || dy > 1 || tileAt(encounter.room.map, to)?.walkable !== true) return false;
  if (dx === 1 && dy === 1) {
    if (tileAt(encounter.room.map, { x: to.x, y: from.y, z: from.z })?.walkable !== true) return false;
    if (tileAt(encounter.room.map, { x: from.x, y: to.y, z: from.z })?.walkable !== true) return false;
  }
  const destinationKey = positionKey(to);
  return encounter.room.occupancy.get(positionKey(from)) === creatureId
    && !encounter.room.occupancy.has(destinationKey)
    && !encounter.room.reservations.has(destinationKey);
}

export function commitMovement(encounter: HuntEncounterState, creatureId: string, from: GridPosition, to: GridPosition, occupied: Set<string>, reserved: Set<string>): boolean {
  if (!isMovementStepLegal(encounter, creatureId, from, to)) return false;
  const fromKey = positionKey(from); const destinationKey = positionKey(to);
  encounter.room.reservations.set(destinationKey, creatureId); reserved.add(destinationKey);
  encounter.room.occupancy.delete(fromKey); occupied.delete(fromKey);
  encounter.room.occupancy.set(destinationKey, creatureId); occupied.add(destinationKey);
  encounter.room.reservations.delete(destinationKey); reserved.delete(destinationKey);
  return true;
}

function destinationAvailable(encounter: HuntEncounterState, position: GridPosition, occupied: Set<string>, reserved: Set<string>): boolean {
  return tileAt(encounter.room.map, position)?.walkable === true
    && !occupied.has(positionKey(position))
    && !reserved.has(positionKey(position));
}

function nearestEnemy(
  actor: PartyActorState,
  encounter: HuntEncounterState,
  range: number,
  reserved: ReadonlySet<string>,
  allowedEnemyIds?: Set<string>,
  strategy: TargetSelectionStrategy = 'closest',
  minRange: number = 1
) {
  const occupied = occupiedKeys(encounter);
  const candidates = encounter.enemies.filter((enemy) => enemy.alive && (!allowedEnemyIds || allowedEnemyIds.has(enemy.id)));
  if (candidates.length === 0) return undefined;

  const partyKeys = new Set(encounter.partyActors.filter((a) => a.alive).map((a) => positionKey(a.position)));
  const blocked = new Set([...occupied].filter((k) => !partyKeys.has(k)));
  for (const key of reserved) blocked.add(key);

  const evaluated = candidates.map((enemy) => {
    const directDist = meleeDistance(actor.position, enemy.position);
    const minD = Math.max(1, minRange);
    const maxD = Math.max(minD, range);
    const alreadyInRange = directDist >= minD && directDist <= maxD;
    const goals = range <= 1
      ? findMeleeApproachTiles(encounter.room.map, enemy.position, blocked)
      : findRangedApproachTiles(encounter.room.map, enemy.position, maxD, blocked, minD);
    const fallbackGoals = goals.length === 0 && range <= 1
      ? surroundingPositions(enemy.position).filter((p) => isTileWalkable(encounter.room.map, p))
      : (goals.length === 0 ? findRangedApproachTiles(encounter.room.map, enemy.position, maxD, blocked, 1) : goals);
    const path = alreadyInRange ? [] : findPath(encounter.room.map, actor.position, fallbackGoals, blocked);
    return {
      enemy,
      path,
      alreadyInRange,
      directDist,
      isCurrentTarget: actor.targetId === enemy.id,
    };
  });

  const reachable = evaluated.filter((candidate) => candidate.alreadyInRange || candidate.path.length > 0);
  if (reachable.length === 0) return undefined;

  return reachable.sort((a, b) => {
    if (strategy === 'lowest-hp') {
      if (a.alreadyInRange !== b.alreadyInRange) return a.alreadyInRange ? -1 : 1;
      const hpPctA = a.enemy.hp / a.enemy.maxHp;
      const hpPctB = b.enemy.hp / b.enemy.maxHp;
      if (Math.abs(hpPctA - hpPctB) > 0.001) return hpPctA - hpPctB;
      if (a.enemy.hp !== b.enemy.hp) return a.enemy.hp - b.enemy.hp;
      if (a.isCurrentTarget !== b.isCurrentTarget) return a.isCurrentTarget ? -1 : 1;
      const pathA = a.alreadyInRange ? 0 : a.path.length;
      const pathB = b.alreadyInRange ? 0 : b.path.length;
      if (pathA !== pathB) return pathA - pathB;
      return a.directDist - b.directDist;
    }

    if (strategy === 'highest-hp') {
      if (a.alreadyInRange !== b.alreadyInRange) return a.alreadyInRange ? -1 : 1;
      const hpPctA = a.enemy.hp / a.enemy.maxHp;
      const hpPctB = b.enemy.hp / b.enemy.maxHp;
      if (Math.abs(hpPctA - hpPctB) > 0.001) return hpPctB - hpPctA;
      if (a.enemy.hp !== b.enemy.hp) return b.enemy.hp - a.enemy.hp;
      if (a.isCurrentTarget !== b.isCurrentTarget) return a.isCurrentTarget ? -1 : 1;
      const pathA = a.alreadyInRange ? 0 : a.path.length;
      const pathB = b.alreadyInRange ? 0 : b.path.length;
      if (pathA !== pathB) return pathA - pathB;
      return a.directDist - b.directDist;
    }

    // Default 'closest'
    if (a.alreadyInRange !== b.alreadyInRange) return a.alreadyInRange ? -1 : 1;
    const pathA = a.alreadyInRange ? 0 : a.path.length;
    const pathB = b.alreadyInRange ? 0 : b.path.length;
    if (pathA !== pathB) return pathA - pathB;
    if (a.directDist !== b.directDist) return a.directDist - b.directDist;
    if (a.isCurrentTarget !== b.isCurrentTarget) return a.isCurrentTarget ? -1 : 1;
    return a.enemy.id.localeCompare(b.enemy.id);
  })[0];
}

export function movePartyTowardTargets(
  encounter: HuntEncounterState,
  ranges: Map<string, number>,
  allowedEnemyIds?: Set<string>,
  mainCharacterId?: string,
  targetStrategy: TargetSelectionStrategy = 'closest',
  minRanges?: Map<string, number>
): void {
  const occupied = occupiedKeys(encounter);
  const reserved = reservationKeys(encounter);
  const mainActor = (mainCharacterId ? encounter.partyActors.find((candidate) => candidate.alive && candidate.characterId === mainCharacterId) : undefined)
    ?? encounter.partyActors.find((candidate) => candidate.alive);
  
  let mainTargetId = mainActor?.targetId;
  let mainTargetEnemy = mainTargetId ? encounter.enemies.find((e) => e.id === mainTargetId && e.alive) : undefined;

  const ordered = encounter.partyActors.filter((candidate) => candidate.alive)
    .sort((a, b) => Number(b.characterId === mainActor?.characterId) - Number(a.characterId === mainActor?.characterId) || a.characterId.localeCompare(b.characterId));

  for (const actor of ordered) {
    actor.previousPosition = clonePosition(actor.position);
    if (encounter.elapsedMs < actor.nextMoveAt) continue;
    const range = ranges.get(actor.characterId) ?? 1;
    const minRange = minRanges?.get(actor.characterId) ?? 1;

    const activeStrategy = actor.targetStrategy || targetStrategy;

    let selected;
    const isMain = actor.characterId === mainActor?.characterId;

    if (encounter.isMultiplayerParty && actor.characterId !== mainActor?.characterId) {
      if (mainTargetEnemy) {
        actor.targetId = mainTargetEnemy.id;
        selected = nearestEnemy(actor, encounter, range, reserved, new Set([mainTargetEnemy.id]), activeStrategy, minRange);
      } else {
        // Leader has no active target: secondary actor waits and follows leader
        actor.targetId = null;
        actor.path = [];
        const desiredFollowDist = minRange > 1 ? 3 : 1;
        if (mainActor && meleeDistance(actor.position, mainActor.position) > desiredFollowDist) {
          const blocked = new Set([...occupied, ...reserved]);
          blocked.delete(positionKey(actor.position));
          blocked.delete(positionKey(mainActor.position));
          const path = findPath(encounter.room.map, actor.position, surroundingPositions(mainActor.position).filter((p) => isTileWalkable(encounter.room.map, p) && !blocked.has(positionKey(p))), blocked);
          if (path.length > 0) {
            const next = path[0];
            if (destinationAvailable(encounter, next, occupied, reserved)) {
              const from = clonePosition(actor.position);
              if (commitMovement(encounter, actor.characterId, from, next, occupied, reserved)) {
                actor.direction = directionBetween(actor.position, next);
                actor.position = clonePosition(next);
                actor.nextMoveAt = encounter.elapsedMs + stepDuration(actor.hasteUntil > encounter.elapsedMs ? actor.speed * 1.3 : actor.speed);
              }
            }
          }
        }
        continue;
      }
    } else {
      if (mainTargetEnemy && actor.characterId !== mainActor?.characterId) {
        selected = nearestEnemy(actor, encounter, range, reserved, new Set([mainTargetEnemy.id]), activeStrategy, minRange);
      }
      if (!selected && allowedEnemyIds) {
        selected = nearestEnemy(actor, encounter, range, reserved, allowedEnemyIds, activeStrategy, minRange);
      }
      if (!selected) {
        selected = nearestEnemy(actor, encounter, range, reserved, undefined, activeStrategy, minRange);
      }
      actor.targetId = selected?.enemy.id ?? null;
      if (isMain && selected) {
        mainTargetId = selected.enemy.id;
        mainTargetEnemy = selected.enemy;
      }
    }

    actor.path = selected?.path.map(clonePosition) ?? [];
    if (!selected || selected.alreadyInRange) continue;
    const next = selected.path[0];
    if (!next || !destinationAvailable(encounter, next, occupied, reserved)) { actor.path = []; continue; }
    const from = clonePosition(actor.position);
    if (!commitMovement(encounter, actor.characterId, from, next, occupied, reserved)) { actor.path = []; continue; }
    actor.direction = directionBetween(actor.position, next);
    actor.position = clonePosition(next);
    actor.nextMoveAt = encounter.elapsedMs + stepDuration(actor.hasteUntil > encounter.elapsedMs ? actor.speed * 1.3 : actor.speed);
  }
}

export function movePartyTowardPoint(encounter: HuntEncounterState, target: GridPosition, mainCharacterId?: string): boolean {
  const occupied = occupiedKeys(encounter);
  const reserved = reservationKeys(encounter);
  const living = encounter.partyActors.filter((candidate) => candidate.alive);
  const leader = (mainCharacterId ? living.find((actor) => actor.characterId === mainCharacterId) : undefined)
    ?? living.find((actor) => actor.characterId === encounter.partyActors[0]?.characterId)
    ?? living[0];
  if (!leader) return false;
  for (const actor of living) {
    const isLeader = actor.characterId === leader.characterId;
    actor.previousPosition = clonePosition(actor.position);
    actor.targetId = null;
    if (encounter.elapsedMs < actor.nextMoveAt) continue;
    const followTarget = isLeader ? target : leader.position;
    const desiredDistance = isLeader ? 0 : 1;
    if (meleeDistance(actor.position, followTarget) <= desiredDistance) { actor.path = []; continue; }
    const blocked = new Set([...occupied, ...reserved]); blocked.delete(positionKey(actor.position));
    const targetBlocked = blocked.has(positionKey(followTarget));
    const candidateGoals = desiredDistance === 0
      ? (targetBlocked
          ? surroundingPositions(followTarget).filter((goal) => isTileWalkable(encounter.room.map, goal) && !blocked.has(positionKey(goal)))
          : [followTarget])
      : surroundingPositions(followTarget).filter((goal) => isTileWalkable(encounter.room.map, goal) && !blocked.has(positionKey(goal)));

    const effectiveBlocked = candidateGoals.length === 0 && targetBlocked
      ? new Set([...blocked].filter((k) => k !== positionKey(followTarget)))
      : blocked;
    const goals = candidateGoals.length > 0 ? candidateGoals : [followTarget];
    const path = findPath(encounter.room.map, actor.position, goals, effectiveBlocked);
    actor.path = path.map(clonePosition);
    const next = path[0];
    if (!next || !destinationAvailable(encounter, next, occupied, reserved)) { actor.path = []; continue; }
    const from = clonePosition(actor.position);
    if (!commitMovement(encounter, actor.characterId, from, next, occupied, reserved)) { actor.path = []; continue; }
    actor.direction = directionBetween(actor.position, next); actor.position = clonePosition(next);
    actor.nextMoveAt = encounter.elapsedMs + stepDuration(actor.hasteUntil > encounter.elapsedMs ? actor.speed * 1.3 : actor.speed);
  }
  synchronizeEncounterOccupancy(encounter);
  return meleeDistance(leader.position, target) <= 1;
}

function nearestActor(enemy: EnemyState, encounter: HuntEncounterState): PartyActorState | undefined {
  if (enemy.challengedUntil && enemy.challengedUntil > encounter.elapsedMs && enemy.challengedTargetId) {
    const challenged = encounter.partyActors.find((actor) => actor.characterId === enemy.challengedTargetId && actor.alive);
    if (challenged) return challenged;
  }
  if (enemy.targetId) {
    const current = encounter.partyActors.find((actor) => actor.characterId === enemy.targetId && actor.alive);
    if (current && meleeDistance(enemy.position, current.position) <= Math.max(50, enemy.detectionRange || 50)) {
      return current;
    }
  }
  return encounter.partyActors.filter((actor) => actor.alive)
    .sort((left, right) => meleeDistance(enemy.position, left.position) - meleeDistance(enemy.position, right.position)
      || left.characterId.localeCompare(right.characterId))[0];
}

export function moveEnemiesTowardParty(encounter: HuntEncounterState): void {
  const occupied = occupiedKeys(encounter);
  const reserved = reservationKeys(encounter);
  const reservedGoals = new Set<string>();
  const rng = createSeededRng(encounter.rngState);
  for (const enemy of encounter.enemies.filter((candidate) => candidate.alive).sort((a, b) => a.id.localeCompare(b.id))) {
    enemy.previousPosition = clonePosition(enemy.position);
    if (encounter.elapsedMs < enemy.nextMoveAt) continue;
    const target = nearestActor(enemy, encounter);
    const targetDistance = target ? meleeDistance(enemy.position, target.position) : Number.POSITIVE_INFINITY;
    const maxDetectionRange = Math.max(50, enemy.detectionRange || 50);
    if (!target || targetDistance > maxDetectionRange) {
      enemy.targetId = null;
      enemy.behavior = encounter.elapsedMs >= enemy.nextRoamAt ? 'roam' : 'idle';
      enemy.path = [];
      if (enemy.behavior === 'roam') {
        const options = surroundingPositions(enemy.position).filter((position) => {
          const tile = tileAt(encounter.room.map, position);
          if (!tile?.walkable || occupied.has(positionKey(position)) || reserved.has(positionKey(position))) return false;
          const blocked = new Set([...occupied, ...reserved]); blocked.delete(positionKey(enemy.position));
          return findPath(encounter.room.map, enemy.position, [position], blocked).length === 1;
        }).sort((left, right) => left.y - right.y || left.x - right.x);
        const next = options.length > 0 ? options[rollInteger(rng, 0, options.length - 1)] : undefined;
        enemy.nextRoamAt = encounter.elapsedMs + 1_440;
        if (next) {
          const from = clonePosition(enemy.position);
          if (!commitMovement(encounter, enemy.id, from, next, occupied, reserved)) { enemy.path = []; continue; }
          enemy.direction = directionBetween(enemy.position, next); enemy.position = clonePosition(next);
          enemy.nextMoveAt = encounter.elapsedMs + stepDuration(enemy.speed);
        }
      }
      continue;
    }
    enemy.targetId = target.characterId;
    enemy.behavior = isMeleeRange(enemy.position, target.position) ? 'attack' : targetDistance <= maxDetectionRange ? 'chase' : 'detect';
    if (isMeleeRange(enemy.position, target.position)) { enemy.path = []; continue; }
    const blocked = new Set(occupied);
    for (const key of reserved) blocked.add(key);
    blocked.delete(positionKey(enemy.position));
    for (const key of reservedGoals) blocked.add(key);

    let goals = surroundingPositions(target.position).filter((goal) => isTileWalkable(encounter.room.map, goal) && !blocked.has(positionKey(goal)));
    let effectiveBlocked = blocked;
    if (goals.length === 0) {
      goals = surroundingPositions(target.position).filter((goal) => isTileWalkable(encounter.room.map, goal));
      const goalKeys = new Set(goals.map(positionKey));
      effectiveBlocked = new Set([...blocked].filter((k) => !goalKeys.has(k)));
    }

    const path = findPath(encounter.room.map, enemy.position, goals, effectiveBlocked);
    enemy.path = path.map(clonePosition);
    const goal = path.at(-1);
    if (goal) reservedGoals.add(positionKey(goal));
    const next = path[0];
    if (!next || !destinationAvailable(encounter, next, occupied, reserved)) { enemy.path = []; continue; }
    const from = clonePosition(enemy.position);
    if (!commitMovement(encounter, enemy.id, from, next, occupied, reserved)) { enemy.path = []; continue; }
    enemy.direction = directionBetween(enemy.position, next);
    enemy.position = clonePosition(next);
    enemy.nextMoveAt = encounter.elapsedMs + stepDuration(enemy.speed);
  }
  encounter.rngState = rng.state;
  synchronizeEncounterOccupancy(encounter);
}

export function movePartyToExit(encounter: HuntEncounterState): boolean {
  const occupied = occupiedKeys(encounter);
  const reserved = reservationKeys(encounter);
  const exitGoals = [encounter.room.exit, ...surroundingPositions(encounter.room.exit)];
  for (const actor of encounter.partyActors.filter((candidate) => candidate.alive)) {
    actor.previousPosition = clonePosition(actor.position);
    if (encounter.elapsedMs < actor.nextMoveAt) continue;
    const blocked = new Set([...occupied, ...reserved]);
    blocked.delete(positionKey(actor.position));
    const goals = exitGoals.filter((goal) => !blocked.has(positionKey(goal)) || positionKey(goal) === positionKey(actor.position));
    const path = findPath(encounter.room.map, actor.position, goals, blocked);
    actor.path = path.map(clonePosition);
    actor.targetId = null;
    const next = path[0];
    if (!next || !destinationAvailable(encounter, next, occupied, reserved)) { actor.path = []; continue; }
    const from = clonePosition(actor.position);
    if (!commitMovement(encounter, actor.characterId, from, next, occupied, reserved)) { actor.path = []; continue; }
    actor.direction = directionBetween(actor.position, next); actor.position = clonePosition(next);
    actor.nextMoveAt = encounter.elapsedMs + stepDuration(actor.speed);
  }
  synchronizeEncounterOccupancy(encounter);
  const leader = encounter.partyActors[0];
  return Boolean(leader && meleeDistance(leader.position, encounter.room.exit) <= 1);
}
