import { describe, expect, it } from 'vitest';
import {
  addPartyMember, advanceCombat, createIdleGame, createTileMapFromRows, findPath, isMeleeRange,
  moveEnemiesTowardParty, movePartyTowardTargets, positionKey, restartHunt, startGame, synchronizeEncounterOccupancy,
} from '../packages/domain/src';
import { content } from './fixture';

describe('spatial party combat', () => {
  it('does not path through a continuous wall', () => {
    const { map, entrance, exit } = createTileMapFromRows(['#####', '#E#X#', '#.#.#', '#####']);
    expect(findPath(map, entrance, [exit])).toEqual([]);
  });

  it('keeps every living party member and monster on a unique tile', () => {
    let state = createIdleGame('occupancy', content);
    state = addPartyMember(state, 'Lyra', 'Paladin', content);
    state = addPartyMember(state, 'Mira', 'Sorcerer', content);
    state = addPartyMember(state, 'Eira', 'Druid', content);
    state = restartHunt(state, 'occupancy', content);
    for (let tick = 0; tick < 300 && state.encounter.status === 'running'; tick += 1) {
      const positions = [
        ...state.encounter.partyActors.filter((actor) => actor.alive).map((actor) => positionKey(actor.position)),
        ...state.encounter.enemies.filter((enemy) => enemy.alive).map((enemy) => positionKey(enemy.position)),
      ];
      expect(new Set(positions).size).toBe(positions.length);
      state = advanceCombat(state, content, 120);
    }
  });

  it('moves the leader toward a distant enemy', () => {
    const entering = startGame(createIdleGame('path', content), content);
    const leader = entering.encounter.partyActors[0];
    const distant = entering.encounter.room.map.tiles.filter((tile) => tile.walkable)
      .sort((a, b) => Math.abs(b.position.x - leader.position.x) + Math.abs(b.position.y - leader.position.y) - Math.abs(a.position.x - leader.position.x) - Math.abs(a.position.y - leader.position.y))
      .find((tile) => findPath(entering.encounter.room.map, leader.position, [tile.position]).length > 8)!;
    const target = entering.encounter.enemies[0];
    entering.encounter.enemies.forEach((enemy, index) => { enemy.alive = index === 0; });
    target.position = { ...distant.position }; target.previousPosition = { ...distant.position }; target.path = [];
    entering.encounter.continuousProgress!.zones.forEach((zone, index) => { zone.activeEnemyIds = index === 0 ? [target.id] : []; });
    entering.encounter.continuousProgress!.currentZoneIndex = 0;
    synchronizeEncounterOccupancy(entering.encounter);
    const before = { ...entering.encounter.partyActors[0].position };
    entering.encounter.elapsedMs = 1_000;
    movePartyTowardTargets(entering.encounter, new Map([[leader.characterId, 1]]), new Set([target.id]));
    expect(entering.encounter.partyActors[0].position).not.toEqual(before);
  });

  it('replays party positions identically for the same seed', () => {
    let first = startGame(createIdleGame('positions', content), content);
    let second = startGame(createIdleGame('positions', content), content);
    for (let tick = 0; tick < 100; tick += 1) { first = advanceCombat(first, content, 120); second = advanceCombat(second, content, 120); }
    expect(second).toEqual(first);
  });

  it('prevents diagonal corner clipping through solid orthogonal tiles', () => {
    const { map, entrance, exit } = createTileMapFromRows(['#####', '#E#.#', '##.X#', '#####']);
    expect(findPath(map, entrance, [exit])).toEqual([]);
  });

  it('does not treat a corpse as creature occupancy or path blockage', () => {
    const { map, entrance, exit } = createTileMapFromRows(['#####', '#E.X#', '#####']);
    const before = findPath(map, entrance, [exit]);
    const corpse = { id: 'corpse-1', monsterId: 'rat', corpseId: 2813, position: { x: 2, y: 1, z: 7 }, createdAt: 0 };
    expect(corpse.position).toEqual({ x: 2, y: 1, z: 7 });
    expect(findPath(map, entrance, [exit])).toEqual(before);
  });

  it('keeps the ninth melee monster outside eight occupied adjacent tiles', () => {
    const state = startGame(createIdleGame('melee-ring', content), content);
    const { map } = createTileMapFromRows(['#########', '#E......#', '#.......#', '#.......#', '#.......#', '#.......#', '#......X#', '#########']);
    state.encounter.room.map = map;
    const actor = state.encounter.partyActors[0]; actor.position = { x: 4, y: 4, z: 7 }; actor.previousPosition = { ...actor.position };
    const template = state.encounter.enemies[0];
    const ring = [
      [3, 3], [4, 3], [5, 3], [3, 4], [5, 4], [3, 5], [4, 5], [5, 5], [4, 1],
    ];
    state.encounter.enemies = ring.map(([x, y], index) => ({ ...template, id: `rat-${index}`, position: { x, y, z: 7 }, previousPosition: { x, y, z: 7 }, path: [], alive: true, nextMoveAt: 0, detectionRange: 20 }));
    state.encounter.elapsedMs = 1_000; state.encounter.room.reservations = new Map();
    synchronizeEncounterOccupancy(state.encounter); moveEnemiesTowardParty(state.encounter);
    const positions = state.encounter.enemies.map((enemy) => positionKey(enemy.position));
    expect(new Set(positions).size).toBe(positions.length);
    expect(state.encounter.enemies.filter((enemy) => isMeleeRange(enemy.position, actor.position))).toHaveLength(8);
    expect(isMeleeRange(state.encounter.enemies[8].position, actor.position)).toBe(false);
  });

  it('creates unique reservations and never stacks party members', () => {
    let state = createIdleGame('reservation-party', content);
    state = addPartyMember(state, 'Lyra', 'Paladin', content);
    state = addPartyMember(state, 'Mira', 'Sorcerer', content);
    state = addPartyMember(state, 'Eira', 'Druid', content);
    state = startGame(state, content);
    for (let tick = 0; tick < 20; tick += 1) {
      state = advanceCombat(state, content, 120);
      const reserved = [...state.encounter.room.reservations.keys()];
      const party = state.encounter.partyActors.filter((actor) => actor.alive).map((actor) => positionKey(actor.position));
      expect(new Set(reserved).size).toBe(reserved.length);
      expect(new Set(party).size).toBe(party.length);
    }
  });

  it('routes around the same kind of solid spike obstacle used by Rat and Rotworm maps', () => {
    const { map, entrance, exit } = createTileMapFromRows(['#######', '#E.O.X#', '#.....#', '#######']);
    const path = findPath(map, entrance, [exit]);
    expect(path.length).toBeGreaterThan(0);
    expect(path).not.toContainEqual({ x: 3, y: 1, z: 7 });
  });

  it('survives thousands of deterministic Rat Cellars ticks with two characters', () => {
    let first = addPartyMember(createIdleGame('rat-stress', content), 'Lyra', 'Paladin', content);
    let second = addPartyMember(createIdleGame('rat-stress', content), 'Lyra', 'Paladin', content);
    first = startGame(first, content); second = startGame(second, content);
    for (let tick = 0; tick < 2_500; tick += 1) {
      first = advanceCombat(first, content, 120); second = advanceCombat(second, content, 120);
      for (const state of [first, second]) {
        const living = [...state.encounter.partyActors.filter((actor) => actor.alive), ...state.encounter.enemies.filter((enemy) => enemy.alive)];
        const keys = living.map((entity) => positionKey(entity.position));
        expect(new Set(keys).size).toBe(keys.length);
        expect(living.every((entity) => state.encounter.room.map.tiles[entity.position.y * state.encounter.room.map.width + entity.position.x]?.walkable)).toBe(true);
      }
    }
    expect(second).toEqual(first);
  }, 90_000);
});
