import { describe, expect, it } from 'vitest';
import {
  findPath,
  isMeleeRange,
  meleeDistance,
} from '../packages/domain/src/spatial/pathfinding';
import { createTileMapFromRows, positionKey } from '../packages/domain/src/spatial/tileMap';
import {
  moveEnemiesTowardParty,
  synchronizeEncounterOccupancy,
  assertSpatialIntegrity,
} from '../packages/domain/src/spatial/movement';
import type { HuntEncounterState, PartyActorState, EnemyState } from '../packages/domain/src/types';

function createTestEncounter(mapRows: string[]): HuntEncounterState {
  const { map } = createTileMapFromRows(mapRows);
  return {
    round: 1,
    elapsedMs: 0,
    status: 'active',
    waveIndex: 0,
    room: {
      number: 1,
      name: 'Test Room',
      map,
      entrance: { x: 5, y: 5, z: 7 },
      exit: { x: 8, y: 8, z: 7 },
      exitUnlocked: false,
      phase: 'combat',
      phaseTicks: 10,
      occupancy: new Map(),
      reservations: new Map(),
    },
    hunt: {
      id: 'test-hunt',
      name: 'Test Hunt',
      waves: [],
      entryCost: 0,
      levelRecommendation: 10,
    },
    partyActors: [],
    enemies: [],
    events: [],
    visualEvents: [],
    rngState: 12345,
  } as unknown as HuntEncounterState;
}

function makeActor(id: string, x: number, y: number): PartyActorState {
  return {
    characterId: id,
    position: { x, y, z: 7 },
    previousPosition: { x, y, z: 7 },
    direction: 'south',
    path: [],
    alive: true,
    hp: 1000,
    mana: 500,
    speed: 250,
    nextMoveAt: 0,
    hasteUntil: 0,
  } as unknown as PartyActorState;
}

function makeEnemy(id: string, x: number, y: number): EnemyState {
  return {
    id,
    name: 'Cyclops',
    monsterId: 'cyclops',
    position: { x, y, z: 7 },
    previousPosition: { x, y, z: 7 },
    direction: 'north',
    path: [],
    alive: true,
    hp: 260,
    maxHp: 260,
    speed: 220,
    nextMoveAt: 0,
    detectionRange: 15,
    behavior: 'chase',
    targetId: null,
  } as unknown as EnemyState;
}

describe('Phase 211: Monster Movement AI & 8-SQM Box Formation System', () => {
  describe('1. Diagonal Pathfinding Past Creatures (No Corner-Sticking)', () => {
    it('allows diagonal pathing past another creature without treating it as a solid wall', () => {
      // Map: Open 5x5 room with E and X
      const { map } = createTileMapFromRows([
        '#####',
        '#E..#',
        '#...#',
        '#..X#',
        '#####',
      ]);

      const start = { x: 1, y: 1, z: 7 };
      const goal = { x: 2, y: 2, z: 7 };
      // Another creature stands at (2, 1) [East of start, North of goal]
      const blocked = new Set([positionKey({ x: 2, y: 1, z: 7 })]);

      // In the old code, diagonal from (1,1) to (2,2) was rejected because (2,1) was blocked.
      // Now, (2,1) has a creature but is walkable terrain, so diagonal to (2,2) is legal!
      const path = findPath(map, start, [goal], blocked);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual(goal);
    });

    it('still rejects diagonal pathing through solid wall corners', () => {
      // Map: Wall at (2, 1) and (1, 2)
      const { map } = createTileMapFromRows([
        '#####',
        '#E###',
        '###X#',
        '#####',
      ]);

      const start = { x: 1, y: 1, z: 7 };
      const goal = { x: 2, y: 2, z: 7 };
      const path = findPath(map, start, [goal], new Set());
      // Cannot cut between two walls diagonally
      expect(path.length).toBe(0);
    });
  });

  describe('2. 8-SQM Box Formation Around Player (Knight Exori Ready)', () => {
    it('successfully closes the full 8-sqm box around the player when 8 enemies approach', () => {
      // 11x11 open arena with E and X in opposite corners
      const encounter = createTestEncounter([
        '###########',
        '#E........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#........X#',
        '###########',
      ]);

      // Player in center at (5, 5)
      const knight = makeActor('char-knight', 5, 5);
      encounter.partyActors = [knight];

      // 8 enemies distributed 2 to 3 tiles away in all directions
      encounter.enemies = [
        makeEnemy('enemy-n', 5, 2),  // North
        makeEnemy('enemy-s', 5, 8),  // South
        makeEnemy('enemy-e', 8, 5),  // East
        makeEnemy('enemy-w', 2, 5),  // West
        makeEnemy('enemy-ne', 8, 2), // NE
        makeEnemy('enemy-nw', 2, 2), // NW
        makeEnemy('enemy-se', 8, 8), // SE
        makeEnemy('enemy-sw', 2, 8), // SW
      ];

      synchronizeEncounterOccupancy(encounter);

      // Simulate movement ticks until all enemies reach the player
      for (let tick = 0; tick < 12; tick++) {
        encounter.elapsedMs += 750;
        moveEnemiesTowardParty(encounter);
        assertSpatialIntegrity(encounter);
      }

      // Check that all 8 enemies are in melee range of the knight (forming the complete 8-sqm box)
      const meleeEnemies = encounter.enemies.filter((e) => isMeleeRange(e.position, knight.position));
      expect(meleeEnemies).toHaveLength(8);

      // Check that every enemy occupies a unique tile
      const enemyPositions = encounter.enemies.map((e) => positionKey(e.position));
      expect(new Set(enemyPositions).size).toBe(8);

      // Verify the 8 occupied tiles are exactly the 8 surrounding tiles
      const expectedTiles = new Set([
        '4,4,7', '5,4,7', '6,4,7',
        '4,5,7',         '6,5,7',
        '4,6,7', '5,6,7', '6,6,7',
      ]);

      for (const posKey of enemyPositions) {
        expect(expectedTiles.has(posKey)).toBe(true);
      }
    });

    it('queues a 9th enemy cleanly in outer perimeter without blocking or stacking', () => {
      const encounter = createTestEncounter([
        '###########',
        '#E........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#........X#',
        '###########',
      ]);

      const knight = makeActor('char-knight', 5, 5);
      encounter.partyActors = [knight];

      // 9 enemies
      encounter.enemies = [
        makeEnemy('enemy-1', 5, 2),
        makeEnemy('enemy-2', 5, 8),
        makeEnemy('enemy-3', 8, 5),
        makeEnemy('enemy-4', 2, 5),
        makeEnemy('enemy-5', 8, 2),
        makeEnemy('enemy-6', 2, 2),
        makeEnemy('enemy-7', 8, 8),
        makeEnemy('enemy-8', 2, 8),
        makeEnemy('enemy-9', 5, 1), // 9th enemy
      ];

      synchronizeEncounterOccupancy(encounter);

      for (let tick = 0; tick < 15; tick++) {
        encounter.elapsedMs += 750;
        moveEnemiesTowardParty(encounter);
        assertSpatialIntegrity(encounter);
      }

      // Exactly 8 in melee box
      const meleeEnemies = encounter.enemies.filter((e) => isMeleeRange(e.position, knight.position));
      expect(meleeEnemies).toHaveLength(8);

      // 9th enemy is within distance 2 of knight
      const ninth = encounter.enemies.find((e) => !isMeleeRange(e.position, knight.position));
      expect(ninth).toBeDefined();
      expect(meleeDistance(ninth!.position, knight.position)).toBe(2);

      // All 9 positions are completely unique
      const positions = encounter.enemies.map((e) => positionKey(e.position));
      expect(new Set(positions).size).toBe(9);
    });
  });
});
