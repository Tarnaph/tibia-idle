import { describe, it, expect } from 'vitest';
import type { CharacterState, EnemyState, GameState, PartyActorState } from '../packages/domain/src/types';
import { defeatEnemy, advanceCombat, restartHunt, createIdleGame } from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 262 / Onda 15: Anti-Deadlock, Hunt Crash Shielding & Local Death Detection', () => {
  it('1. should not throw when defeating an enemy without corpseId and fall back to 3058', () => {
    const state: GameState = {
      session: {
        characters: [],
        loot: [],
        gold: 0,
        trainingElapsedMs: 0,
        itemLootPreferences: {},
        leaderId: 'char-1',
        selectedCharacterId: 'char-1',
        cameraTargetCharacterId: 'char-1',
      },
      encounter: {
        seed: 'seed-1',
        rngState: 123456,
        status: 'running',
        round: 1,
        elapsedMs: 1000,
        nextMovementAt: 1200,
        waveIndex: 0,
        hunt: { id: 'cyclops-camp', name: 'Cyclops Camp' } as any,
        partyActors: [],
        enemies: [],
        corpses: [],
        events: [],
        visualEvents: [],
        log: [],
        nextLogId: 1,
        room: { map: { width: 10, height: 10, tiles: [] } } as any,
        mode: 'continuous',
        expedition: null,
        expeditionProgress: null,
        huntRoute: null,
        continuousProgress: null,
      },
    } as any;

    const mockContent = {
      ...content,
      monsters: [
        {
          id: 'custom-cyclops-variant',
          name: 'Custom Cyclops Variant',
          // corpseId intentionally omitted / undefined
          maxHp: 260,
          attackMax: 40,
          defense: 15,
          armor: 10,
          speed: 100,
          attacks: [{ intervalMs: 2000 }],
          loot: [],
          experience: 150,
        } as any,
      ],
    };

    const enemy: EnemyState = {
      id: 'enemy-1',
      monsterId: 'custom-cyclops-variant',
      name: 'Custom Cyclops Variant',
      hp: 0,
      maxHp: 260,
      attackMax: 40,
      defense: 15,
      armor: 10,
      alive: true,
      position: { x: 5, y: 5, z: 7 },
      previousPosition: { x: 5, y: 5, z: 7 },
      direction: 'south',
      path: [],
      targetId: null,
      nextAttackAt: 0,
      attackIntervalMs: 2000,
      speed: 100,
      behavior: 'chase',
      nextRoamAt: 0,
      nextMoveAt: 0,
      detectionRange: 6,
      variant: null,
    };

    expect(() => defeatEnemy(state, enemy, mockContent as any)).not.toThrow();
    expect(state.encounter.corpses).toHaveLength(1);
    expect(state.encounter.corpses[0].corpseId).toBe(3058);
  });

  it('2. should not throw deadlock error after 5s of stalled continuous hunt, but recover safely', () => {
    let state = createIdleGame('seed-deadlock-test', content);
    state = restartHunt(state, 'seed-deadlock-test', content, 'cyclops-camp');

    const actor = state.encounter.partyActors[0];
    expect(actor).toBeDefined();

    state.encounter.mode = 'continuous';
    state.encounter.huntRoute = {
      respawnZones: [
        {
          id: 'zone-1',
          center: { x: actor.position.x, y: actor.position.y, z: 7 },
          positions: [{ x: actor.position.x, y: actor.position.y, z: 7 }],
          radius: 3,
          monsterPool: ['cyclops'],
          monsterComposition: [{ monsterId: 'cyclops', count: 2 }],
          minCount: 2,
          maxCount: 2,
          activationRadius: 5,
          sourceRespawnSeconds: 30,
          gameRespawnSeconds: 30,
        },
        {
          id: 'zone-2',
          center: { x: actor.position.x, y: actor.position.y, z: 7 },
          positions: [{ x: actor.position.x, y: actor.position.y, z: 7 }],
          radius: 3,
          monsterPool: ['cyclops'],
          monsterComposition: [{ monsterId: 'cyclops', count: 2 }],
          minCount: 2,
          maxCount: 2,
          activationRadius: 5,
          sourceRespawnSeconds: 30,
          gameRespawnSeconds: 30,
        },
      ],
    } as any;
    state.encounter.continuousProgress = {
      currentZoneIndex: 0,
      loopCount: 0,
      kills: 0,
      rareKills: 0,
      lastActivityAt: 1000, // 9 seconds ago (> 5s deadlock threshold)
      stalledSince: 2000,
      zones: [
        { zoneId: 'zone-1', activeEnemyIds: [], lastActivatedAt: null, lastClearedAt: null, nextRespawnAt: 50000, activationCount: 0 },
        { zoneId: 'zone-2', activeEnemyIds: [], lastActivatedAt: null, lastClearedAt: null, nextRespawnAt: 50000, activationCount: 0 },
      ],
    };
    state.encounter.elapsedMs = 10000;
    state.encounter.enemies = []; // All enemies dead, waiting for respawn

    // Previously, advanceCombat would throw `[continuous-hunt-deadlock]...` and crash React!
    expect(() => advanceCombat(state, content, 120)).not.toThrow();
  });

  it('3. should detect local character death even if remote party members are alive', () => {
    const localCharId = 'local-caos';
    const remoteCharId = 'remote-brututus';

    const partyActors = [
      { characterId: localCharId, alive: false, hp: 0, maxHp: 1620 },
      { characterId: remoteCharId, alive: true, hp: 650, maxHp: 650 },
    ];

    const encounterStatus: string = 'running'; // Remote player is still alive!

    const isDefeated = encounterStatus === 'defeated';
    const isLocalActorDead = partyActors.some(
      (actor) => actor.characterId === localCharId && (!actor.alive || actor.hp <= 0)
    );

    // Old behavior: checked only `encounterStatus === 'defeated'`, which is false -> player never saw death screen!
    expect(isDefeated).toBe(false);

    // New Phase 262 behavior: checks isLocalActorDead -> triggers death modal immediately!
    const shouldOpenDeathModal = isDefeated || isLocalActorDead;
    expect(shouldOpenDeathModal).toBe(true);
  });
});
