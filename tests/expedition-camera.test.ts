import { describe, expect, it } from 'vitest';
import {
  addPartyMember, advanceCombat, createIdleGame, positionKey, restartHunt, runCurrentHuntToEnd, selectCharacter, startGame,
  synchronizePartyWithEncounter, transferOwnedEquipment,
} from '../packages/domain/src';
import { desiredWorldCamera, smoothWorldCamera, worldToViewport } from '../packages/presentation/src';
import { content } from './fixture';

describe('world camera', () => {
  it('puts the followed leader inside the viewport on the first frame', () => {
    const game = startGame(createIdleGame('camera-first', content), content);
    const actor = game.encounter.partyActors[0];
    const target = { x: actor.position.x * 32 + 16, y: actor.position.y * 32 + 16 };
    const camera = desiredWorldCamera({ viewportWidth: 900, viewportHeight: 600, worldWidth: game.encounter.room.map.width * 32, worldHeight: game.encounter.room.map.height * 32, targetX: target.x, targetY: target.y });
    const visible = worldToViewport(target, camera, { width: 900, height: 600 });
    expect(visible.x).toBeGreaterThanOrEqual(0); expect(visible.x).toBeLessThanOrEqual(900);
    expect(visible.y).toBeGreaterThanOrEqual(0); expect(visible.y).toBeLessThanOrEqual(600);
  });

  it('smooths and clamps camera without mutating game logic', () => {
    const game = createIdleGame('camera-pure', content); const snapshot = structuredClone(game);
    const desired = desiredWorldCamera({ viewportWidth: 640, viewportHeight: 480, worldWidth: 320, worldHeight: 240, targetX: -999, targetY: 999 });
    expect(desired).toMatchObject({ x: 0, y: 240, zoom: 2 });
    expect(smoothWorldCamera({ x: 0, y: 0, zoom: 1 }, desired, 16).y).toBeGreaterThan(0);
    expect(game).toEqual(snapshot);
  });

  it('keeps UI selection separate from the explicit follow target and transforms projectile endpoints together', () => {
    let game = addPartyMember(createIdleGame('follow-separate', content), 'Lyra', 'Paladin', content);
    game = selectCharacter(game, game.session.characters[1].id);
    expect(game.session.cameraTargetCharacterId).toBe(game.session.characters[1].id);
    const camera = { x: 100, y: 80, zoom: 2 };
    const from = worldToViewport({ x: 120, y: 90 }, camera, { width: 640, height: 480 });
    const to = worldToViewport({ x: 152, y: 90 }, camera, { width: 640, height: 480 });
    expect(to.x - from.x).toBe(64); expect(to.y).toBe(from.y);
  });
});

describe('live expedition commands', () => {
  it('allows equipment transfer during a running hunt and preserves an initiated attack snapshot', () => {
    let game = restartHunt(createIdleGame('hot-swap', content), 'hot-swap', content);
    const actor = game.encounter.partyActors[0]; const enemy = game.encounter.enemies[0];
    const adjacent = game.encounter.room.map.tiles.find((tile) => tile.walkable && Math.abs(tile.position.x - actor.position.x) + Math.abs(tile.position.y - actor.position.y) === 1)!;
    enemy.position = { ...adjacent.position }; enemy.previousPosition = { ...enemy.position };
    game = advanceCombat(game, content, 120);
    const pending = game.encounter.partyActors[0].pendingAttack;
    expect(pending).not.toBeNull();
    const result = transferOwnedEquipment(game, { kind: 'inventory', itemId: 2388 }, { kind: 'slot', slot: 'leftHand' }, content);
    expect(result.ok).toBe(true);
    expect(result.state.encounter.partyActors[0].pendingAttack).toEqual(pending);
    expect(result.state.session.characters[0].equipment.leftHand).toBe(2388);
  });

  it('adds a member to an active hunt without restarting clocks or overlapping occupancy', () => {
    let game = restartHunt(createIdleGame('join-live', content), 'join-live', content);
    game = advanceCombat(game, content, 600); const elapsed = game.encounter.elapsedMs;
    game = synchronizePartyWithEncounter(addPartyMember(game, 'Lyra', 'Paladin', content), content);
    expect(game.encounter.elapsedMs).toBe(elapsed); expect(game.encounter.partyActors).toHaveLength(2);
    const positions = game.encounter.partyActors.map((actor) => positionKey(actor.position));
    expect(new Set(positions).size).toBe(positions.length);
  });
});

describe('expedition compatibility', () => {
  it('adapts waves to anchors and reserves the boss for the final encounter', () => {
    const game = restartHunt(createIdleGame('expedition', content, 'rotworm-cave', 'expedition'), 'expedition', content, 'rotworm-cave');
    expect(game.encounter.expedition?.encounters).toHaveLength(game.encounter.hunt.waves.length);
    expect(game.encounter.enemies.some((enemy) => enemy.variant)).toBe(false);
    const bossIndex = game.encounter.expedition?.encounters.findIndex((entry) => entry.boss);
    expect(bossIndex).toBe(game.encounter.hunt.waves.length - 1);
    expect(game.encounter.expeditionProgress).toMatchObject({ activeEncounterIndex: 0, activeEncounterSpawned: true, bossState: 'ahead' });
  });

  it('keeps the legacy wave mode available as fallback', () => {
    const game = startGame(createIdleGame('wave-fallback', content, 'rat-cellars', 'waves'), content);
    expect(game.encounter.mode).toBe('legacyWaveMode'); expect(game.encounter.expedition).toBeNull(); expect(game.encounter.enemies.length).toBeGreaterThan(0);
  });

  it('advances exploration, unlocks the boss last and completes at the exit', () => {
    const started = restartHunt(createIdleGame('expedition-end', content, 'rat-cellars', 'expedition'), 'expedition-end', content, 'rat-cellars');
    const completed = runCurrentHuntToEnd(started, content, 10_000);
    expect(completed.encounter.status).toBe('completed');
    expect(completed.encounter.expeditionProgress).toMatchObject({ explorationPercent: 100, bossState: 'defeated', reachedExit: true });
  });
});
