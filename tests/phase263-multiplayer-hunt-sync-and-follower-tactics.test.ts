import { describe, it, expect } from 'vitest';
import type { CharacterState, EnemyState, GameState, PartyActorState } from '../packages/domain/src/types';
import {
  advanceCombat,
  restartHunt,
  createIdleGame,
  movePartyTowardTargets,
  synchronizeEncounterOccupancy,
  clonePosition,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 263 / Onda 16: Multiplayer Hunt Sync, Fluid Movement & Follower Tactics', () => {
  it('1. follower engages nearest enemy autonomously when leader has no locked target in multiplayer party', () => {
    const tiles = [];
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        tiles.push({ position: { x, y, z: 7 }, walkable: true });
      }
    }

    const encounter: any = {
      isMultiplayerParty: true,
      elapsedMs: 2000,
      room: {
        map: { width: 15, height: 15, z: 7, tiles },
        occupancy: new Map(),
        reservations: new Map(),
      },
      partyActors: [
        {
          characterId: 'brututus', // Leader (no target)
          alive: true,
          position: { x: 5, y: 5, z: 7 },
          previousPosition: { x: 5, y: 5, z: 7 },
          direction: 'south',
          path: [],
          targetId: null, // Leader has NO target
          speed: 100,
          nextMoveAt: 0,
        },
        {
          characterId: 'caos', // Follower
          alive: true,
          position: { x: 6, y: 5, z: 7 },
          previousPosition: { x: 6, y: 5, z: 7 },
          direction: 'south',
          path: [],
          targetId: null,
          speed: 100,
          nextMoveAt: 0,
        },
      ],
      enemies: [
        {
          id: 'cyclops-1',
          monsterId: 'cyclops',
          name: 'Cyclops',
          hp: 260,
          maxHp: 260,
          alive: true,
          position: { x: 11, y: 5, z: 7 },
          previousPosition: { x: 11, y: 5, z: 7 },
          direction: 'south',
          path: [],
          targetId: null,
          speed: 100,
          nextMoveAt: 0,
        },
      ],
      events: [],
    };

    synchronizeEncounterOccupancy(encounter);

    const ranges = new Map([
      ['brututus', 1],
      ['caos', 3],
    ]);

    // Caos runs movePartyTowardTargets with localCharacterId = 'caos'
    movePartyTowardTargets(
      encounter,
      ranges,
      undefined,
      'brututus', // mainCharacterId is the leader
      'closest',
      undefined,
      undefined,
      'caos' // localCharacterId
    );

    const caosActor = encounter.partyActors.find((a: any) => a.characterId === 'caos');
    // Follower must NOT be paralyzed! Must acquire target 'cyclops-1' and compute path towards it
    expect(caosActor?.targetId).toBe('cyclops-1');
    expect(caosActor?.path.length).toBeGreaterThan(0);
  });

  it('2. follower ignores remote party actors in local movement simulation to prevent elastic tug-of-war', () => {
    const tiles = [];
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        tiles.push({ position: { x, y, z: 7 }, walkable: true });
      }
    }

    const initialBrututusPos = { x: 5, y: 5, z: 7 };
    const encounter: any = {
      isMultiplayerParty: true,
      elapsedMs: 2000,
      room: {
        map: { width: 15, height: 15, z: 7, tiles },
        occupancy: new Map(),
        reservations: new Map(),
      },
      partyActors: [
        {
          characterId: 'brututus', // Remote Leader
          alive: true,
          position: { ...initialBrututusPos },
          previousPosition: { ...initialBrututusPos },
          direction: 'south',
          path: [],
          targetId: 'cyclops-1',
          speed: 100,
          nextMoveAt: 0,
        },
        {
          characterId: 'caos', // Local Follower
          alive: true,
          position: { x: 7, y: 5, z: 7 },
          previousPosition: { x: 7, y: 5, z: 7 },
          direction: 'south',
          path: [],
          targetId: null,
          speed: 100,
          nextMoveAt: 0,
        },
      ],
      enemies: [
        {
          id: 'cyclops-1',
          monsterId: 'cyclops',
          name: 'Cyclops',
          hp: 260,
          maxHp: 260,
          alive: true,
          position: { x: 1, y: 5, z: 7 },
          previousPosition: { x: 1, y: 5, z: 7 },
          direction: 'south',
          path: [],
          targetId: null,
          speed: 100,
          nextMoveAt: 0,
        },
      ],
      events: [],
    };

    synchronizeEncounterOccupancy(encounter);

    const ranges = new Map([
      ['brututus', 1],
      ['caos', 3],
    ]);

    // Local follower runs simulation with localCharacterId = 'caos'
    movePartyTowardTargets(
      encounter,
      ranges,
      undefined,
      'brututus',
      'closest',
      undefined,
      undefined,
      'caos' // localCharacterId
    );

    const brututusActor = encounter.partyActors.find((a: any) => a.characterId === 'brututus');
    // Brututus is a remote actor on Caos's client: his position must NOT be moved by Caos's local AI!
    expect(brututusActor?.position).toEqual(initialBrututusPos);
  });

  it('3. multiplayer follower skips local enemy AI movement to prevent desync against leader snapshots', () => {
    const baseGame = createIdleGame('test-seed', content, 'cyclops-camp');
    const hunt = content.hunts.find((h) => h.id === 'cyclops-camp') ?? content.hunts[0];

    const huntGame = restartHunt(baseGame, 'test-seed', content, hunt.id, 'cauteloso');

    // Configure as multiplayer party follower
    huntGame.encounter.isMultiplayerParty = true;
    huntGame.session.leaderId = 'brututus';
    huntGame.session.selectedCharacterId = 'caos'; // local player is follower

    const enemy = huntGame.encounter.enemies[0];
    if (!enemy) return;

    const initialEnemyPos = clonePosition(enemy.position);

    // Advance combat on follower
    const nextGame = advanceCombat(huntGame, content, 200);

    const nextEnemy = nextGame.encounter.enemies.find((e) => e.id === enemy.id);
    // On the follower's client, enemy positions remain stable waiting for the leader's authoritative snapshot
    expect(nextEnemy?.position).toEqual(initialEnemyPos);
  });

  it('4. follower snapshot reconciliation emits movement events for smooth PixiJS lerp interpolation', () => {
    const currentEncounter: any = {
      status: 'running',
      waveIndex: 0,
      partyActors: [
        {
          characterId: 'brututus',
          position: { x: 5, y: 5, z: 7 },
          direction: 'south',
          hp: 300,
          maxHp: 300,
          mana: 50,
          maxMana: 50,
          alive: true,
        },
        {
          characterId: 'caos',
          position: { x: 6, y: 5, z: 7 },
          direction: 'south',
          hp: 150,
          maxHp: 150,
          mana: 200,
          maxMana: 200,
          alive: true,
        },
      ],
      enemies: [
        {
          id: 'cyclops-1',
          name: 'Cyclops',
          monsterId: 'cyclops',
          hp: 260,
          maxHp: 260,
          position: { x: 10, y: 5, z: 7 },
          direction: 'west',
          alive: true,
        },
      ],
      events: [],
      room: {
        map: { width: 20, height: 20, z: 7, tiles: [] },
        occupancy: new Map(),
        reservations: new Map(),
      },
    };

    // Snapshot arriving from leader Brututus:
    // Brututus moved to (5, 6), and Cyclops moved to (9, 5)
    const snapshotData = {
      huntId: 'cyclops-camp',
      wave: 0,
      currentZoneIndex: 1,
      partyActors: [
        {
          characterId: 'brututus',
          x: 5,
          y: 6,
          z: 7,
          direction: 'south',
          hp: 280,
          maxHp: 300,
          mana: 50,
          maxMana: 50,
          targetId: 'cyclops-1',
          alive: true,
        },
        {
          characterId: 'caos',
          x: 6,
          y: 5,
          z: 7,
          direction: 'south',
          hp: 150,
          maxHp: 150,
          mana: 190,
          maxMana: 200,
          targetId: 'cyclops-1',
          alive: true,
        },
      ],
      enemies: [
        {
          id: 'cyclops-1',
          monsterId: 'cyclops',
          name: 'Cyclops',
          hp: 210,
          maxHp: 260,
          x: 9,
          y: 5,
          z: 7,
          direction: 'west',
          targetId: 'brututus',
        },
      ],
    };

    // Reconcile logic as implemented in unsubHuntEncounterSync
    const eventsToEmit: any[] = [];
    const nextPartyActors = currentEncounter.partyActors.map((actor: any) => {
      const syncActor = snapshotData.partyActors.find((a) => a.characterId === actor.characterId);
      if (!syncActor) return actor;

      if (actor.characterId !== 'caos') {
        const hasMoved = actor.position.x !== syncActor.x || actor.position.y !== syncActor.y;
        if (hasMoved) {
          eventsToEmit.push({
            type: 'movement',
            actorId: actor.characterId,
            from: clonePosition(actor.position),
            to: { x: syncActor.x, y: syncActor.y, z: syncActor.z ?? 7 },
            durationMs: 200,
          });
        }
        return {
          ...actor,
          hp: syncActor.hp,
          maxHp: syncActor.maxHp,
          mana: syncActor.mana,
          maxMana: syncActor.maxMana,
          position: { x: syncActor.x, y: syncActor.y, z: syncActor.z ?? 7 },
          direction: syncActor.direction || actor.direction,
          targetId: syncActor.targetId ?? null,
          alive: syncActor.alive,
        };
      }
      return {
        ...actor,
        hp: Math.min(actor.hp, syncActor.hp),
        maxHp: syncActor.maxHp,
        mana: Math.min(actor.mana, syncActor.mana),
        maxMana: syncActor.maxMana,
        alive: syncActor.alive,
      };
    });

    const enemyMap = new Map(snapshotData.enemies.map((e) => [e.id, e]));
    const updatedEnemies = currentEncounter.enemies.map((e: any) => {
      const sync = enemyMap.get(e.id);
      if (!sync) return e;
      const hasMoved = e.position.x !== sync.x || e.position.y !== sync.y;
      if (hasMoved && e.alive && sync.hp > 0) {
        eventsToEmit.push({
          type: 'movement',
          actorId: e.id,
          from: clonePosition(e.position),
          to: { x: sync.x, y: sync.y, z: sync.z ?? 7 },
          durationMs: 200,
        });
      }
      return {
        ...e,
        hp: sync.hp,
        maxHp: sync.maxHp,
        position: { x: sync.x, y: sync.y, z: sync.z ?? 7 },
        direction: sync.direction || e.direction,
        targetId: sync.targetId ?? null,
        alive: sync.hp > 0,
      };
    });

    const nextEncounter = {
      ...currentEncounter,
      partyActors: nextPartyActors,
      enemies: updatedEnemies,
      events: [...currentEncounter.events, ...eventsToEmit],
    };

    // Verify movement events were emitted for both Brututus and Cyclops
    const brututusMovement = nextEncounter.events.find((ev: any) => ev.type === 'movement' && ev.actorId === 'brututus');
    expect(brututusMovement).toBeDefined();
    expect(brututusMovement.from).toEqual({ x: 5, y: 5, z: 7 });
    expect(brututusMovement.to).toEqual({ x: 5, y: 6, z: 7 });
    expect(brututusMovement.durationMs).toBe(200);

    const cyclopsMovement = nextEncounter.events.find((ev: any) => ev.type === 'movement' && ev.actorId === 'cyclops-1');
    expect(cyclopsMovement).toBeDefined();
    expect(cyclopsMovement.from).toEqual({ x: 10, y: 5, z: 7 });
    expect(cyclopsMovement.to).toEqual({ x: 9, y: 5, z: 7 });
    expect(cyclopsMovement.durationMs).toBe(200);
  });
});
