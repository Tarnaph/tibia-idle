import type { EnemyState, HuntEncounterState, PartyActorState } from '../types';
import { findPath, findMeleeApproachTiles, findRangedApproachTiles, isMeleeRange, meleeDistance, surroundingPositions } from './pathfinding';
import type { CardinalDirection, GridPosition } from './types';
import { buildOccupancyMap, clonePosition, positionKey, tileAt } from './tileMap';
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

function nearestEnemy(actor: PartyActorState, encounter: HuntEncounterState, range: number, reserved: ReadonlySet<string>, allowedEnemyIds?: Set<string>) {
  const occupied = occupiedKeys(encounter);
  const existingTarget = actor.targetId ? encounter.enemies.find((enemy) => enemy.id === actor.targetId && enemy.alive && (!allowedEnemyIds || allowedEnemyIds.has(enemy.id))) : undefined;
  const pool = existingTarget ? [existingTarget] : encounter.enemies.filter((enemy) => enemy.alive && (!allowedEnemyIds || allowedEnemyIds.has(enemy.id)));
  return pool.map((enemy) => {
    const blocked = new Set(occupied);
    for (const key of reserved) blocked.add(key);
    blocked.delete(positionKey(actor.position));
    const alreadyInRange = meleeDistance(actor.position, enemy.position) <= range;
    const goals = range <= 1
      ? findMeleeApproachTiles(encounter.room.map, enemy.position, blocked)
      : findRangedApproachTiles(encounter.room.map, enemy.position, range, blocked);
    const path = alreadyInRange ? [] : findPath(encounter.room.map, actor.position, goals, blocked);
    return { enemy, path, alreadyInRange };
  }).filter((candidate) => candidate.alreadyInRange || candidate.path.length > 0)
    .sort((left, right) => left.path.length - right.path.length || left.enemy.id.localeCompare(right.enemy.id))[0];
}

export function movePartyTowardTargets(encounter: HuntEncounterState, ranges: Map<string, number>, allowedEnemyIds?: Set<string>): void {
  const occupied = occupiedKeys(encounter);
  const reserved = reservationKeys(encounter);
  const leader = encounter.partyActors.find((candidate) => candidate.alive);
  const ordered = encounter.partyActors.filter((candidate) => candidate.alive)
    .sort((a, b) => Number(b.characterId === leader?.characterId) - Number(a.characterId === leader?.characterId) || a.characterId.localeCompare(b.characterId));
  for (const actor of ordered) {
    actor.previousPosition = clonePosition(actor.position);
    if (encounter.elapsedMs < actor.nextMoveAt) continue;
    const range = ranges.get(actor.characterId) ?? 1;
    const selected = nearestEnemy(actor, encounter, range, reserved, allowedEnemyIds);
    actor.targetId = selected?.enemy.id ?? null;
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

export function movePartyTowardPoint(encounter: HuntEncounterState, target: GridPosition): boolean {
  const occupied = occupiedKeys(encounter);
  const reserved = reservationKeys(encounter);
  const living = encounter.partyActors.filter((candidate) => candidate.alive);
  const leader = living.find((actor) => actor.characterId === encounter.partyActors[0]?.characterId) ?? living[0];
  if (!leader) return false;
  for (const [index, actor] of living.entries()) {
    actor.previousPosition = clonePosition(actor.position);
    actor.targetId = null;
    if (encounter.elapsedMs < actor.nextMoveAt) continue;
    const followTarget = index === 0 ? target : leader.position;
    const desiredDistance = index === 0 ? 0 : Math.min(2, index);
    if (meleeDistance(actor.position, followTarget) <= desiredDistance) { actor.path = []; continue; }
    const blocked = new Set([...occupied, ...reserved]); blocked.delete(positionKey(actor.position));
    const goals = desiredDistance === 0
      ? [followTarget]
      : surroundingPositions(followTarget).filter((goal) => !blocked.has(positionKey(goal)));
    const path = findPath(encounter.room.map, actor.position, goals, blocked);
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
    if (!target || targetDistance > enemy.detectionRange) {
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
    enemy.behavior = isMeleeRange(enemy.position, target.position) ? 'attack' : targetDistance <= enemy.detectionRange ? 'chase' : 'detect';
    if (isMeleeRange(enemy.position, target.position)) { enemy.path = []; continue; }
    const blocked = new Set(occupied);
    for (const key of reserved) blocked.add(key);
    blocked.delete(positionKey(enemy.position));
    for (const key of reservedGoals) blocked.add(key);
    const goals = surroundingPositions(target.position).filter((goal) => !blocked.has(positionKey(goal)));
    const path = findPath(encounter.room.map, enemy.position, goals, blocked);
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
