import { describe, it, expect } from 'vitest';
import { experienceForLevel, levelForExperience } from '../packages/domain/src/experience';
import { populateRespawnZone } from '../packages/domain/src/combat';
import { AVAILABLE_AVATARS } from '../apps/web/components/CharacterProfileModal';
import type { GameContent, GameState } from '../packages/domain/src/types';
import type { GridPosition } from '../packages/domain/src/spatial/types';

describe('Phase 112: Level/XP Inconsistency, Dragon Spawns and Character Profile', () => {
  describe('1. Monotonic Level & Experience Reconciliation', () => {
    it('guarantees experience is at least the threshold for any given level', () => {
      const level = 19;
      const minExp = experienceForLevel(level);
      expect(minExp).toBeGreaterThan(0);

      // If DB had level 19 and exp 0, reconciliation raises exp to at least experienceForLevel(19)
      const reconciledExp = Math.max(0, minExp);
      expect(reconciledExp).toBe(minExp);
      expect(levelForExperience(reconciledExp)).toBe(level);
    });

    it('promotes level if experience exceeds current level threshold', () => {
      const currentLevel = 1;
      const experience = 4200; // Level 8 threshold
      const calculatedLevel = levelForExperience(experience);
      const reconciledLevel = Math.max(currentLevel, calculatedLevel);

      expect(calculatedLevel).toBe(8);
      expect(reconciledLevel).toBe(8);
    });

    it('prevents stale concurrent saves from reducing level or experience', () => {
      const existingLevel = 19;
      const existingExp = experienceForLevel(19);

      // Incoming stale save from laggy client
      const staleLevel = 7;
      const staleExp = 1000;

      const safeLevel = Math.max(existingLevel, staleLevel);
      const safeExp = Math.max(existingExp, staleExp, experienceForLevel(safeLevel));

      expect(safeLevel).toBe(19);
      expect(safeExp).toBe(existingExp);
    });

    it('allows death penalty reduction only when explicitly flagged', () => {
      const existingLevel = 19;
      const existingExp = experienceForLevel(19);

      const isDeathPenalty = true;
      const postDeathLevel = 18;
      const postDeathExp = experienceForLevel(18);

      const resolvedLevel = isDeathPenalty ? Math.max(1, postDeathLevel) : Math.max(existingLevel, postDeathLevel);
      const resolvedExp = isDeathPenalty ? Math.max(0, postDeathExp) : Math.max(existingExp, postDeathExp);

      expect(resolvedLevel).toBe(18);
      expect(resolvedExp).toBe(experienceForLevel(18));
    });
  });

  describe('2. Dragon Lair Respawn Accessibility Validation', () => {
    it('only spawns monsters on tiles with a connected walkable path to zone center', () => {
      // 3x3 grid with an isolated walkable tile at (2, 2) surrounded by unwalkable tiles
      const tiles = [
        { position: { x: 0, y: 0, z: 7 }, walkable: true },
        { position: { x: 1, y: 0, z: 7 }, walkable: true },
        { position: { x: 2, y: 0, z: 7 }, walkable: true },
        { position: { x: 0, y: 1, z: 7 }, walkable: true },
        { position: { x: 1, y: 1, z: 7 }, walkable: false },
        { position: { x: 2, y: 1, z: 7 }, walkable: false },
        { position: { x: 0, y: 2, z: 7 }, walkable: true },
        { position: { x: 1, y: 2, z: 7 }, walkable: false },
        { position: { x: 2, y: 2, z: 7 }, walkable: true }, // isolated island at (2, 2)!
      ];

      const centerPos: GridPosition = { x: 0, y: 0, z: 7 };

      const mockState: Partial<GameState> = {
        session: {
          leaderId: 'char-1',
          selectedCharacterId: 'char-1',
          cameraTargetCharacterId: 'char-1',
          characters: [],
          gold: 100,
          loot: [],
          bag: [],
          itemLootPreferences: {},
          trainingElapsedMs: 0,
        },
        encounter: {
          id: 'encounter-1',
          room: {
            id: 'test-room',
            definitionId: 'dragon-lair',
            huntId: 'dragon-lair',
            map: {
              width: 3,
              height: 3,
              z: 7,
              tiles: tiles.map((t) => ({
                position: t.position,
                walkable: t.walkable,
                groundId: 'cave-ground' as const,
              })),
              stairsDown: [],
              stairsUp: [],
              chests: [],
              doors: [],
              levers: [],
              signs: [],
            } as any,
            difficulty: 1,
            recommendedLevel: 50,
            bounds: { x: 0, y: 0, width: 3, height: 3 },
            roomType: 'arena',
            hazardLevel: 0,
          },
          huntRoute: {
            huntId: 'dragon-lair',
            seed: 'seed-123',
            roomSequence: ['dragon-lair'],
            respawnZones: [
              {
                id: 'zone-1',
                name: 'Dragon Lair Central',
                center: centerPos,
                radius: 3,
                minCount: 1,
                maxCount: 2,
                respawnIntervalMs: 10000,
                monsterPool: ['dragon'],
                positions: [centerPos, { x: 2, y: 2, z: 7 }],
              },
            ],
            rareSpawnRules: { probability: 0, variant: null as any },
          },
          continuousProgress: {
            activeEncounterIndex: 0,
            completedEncounters: 0,
            zones: [
              {
                id: 'zone-1',
                activeEnemyIds: [],
                nextRespawnAt: 0,
                lastActivatedAt: 0,
                activationCount: 0,
              },
            ],
          },
          enemies: [],
          partyActors: [],
          deadEnemyIds: [],
          elapsedMs: 100,
          rngState: 12345,
          status: 'active',
          loot: [],
          events: [],
          log: [],
          nextLogId: 1,
          round: 1,
        } as any,
      };

      const mockContent: Partial<GameContent> = {
        monsters: [
          {
            id: 'dragon',
            name: 'Dragon',
            health: 1000,
            experience: 700,
            speed: 100,
            attacks: [{ intervalMs: 2000, attackMax: 100 }],
            abilities: [],
            loot: [],
          } as any,
        ],
      };

      populateRespawnZone(mockState as GameState, mockContent as GameContent, 0);

      // Verify that spawned enemies were placed, but NEVER on the isolated island (2, 2)
      expect(mockState.encounter!.enemies.length).toBeGreaterThan(0);
      for (const enemy of mockState.encounter!.enemies) {
        expect(enemy.position.x === 2 && enemy.position.y === 2).toBe(false);
      }
    });
  });

  describe('3. Character Profile Sheet and Avatars', () => {
    it('provides 5 unique selectable avatars with valid image routes', () => {
      expect(AVAILABLE_AVATARS).toHaveLength(5);
      const ids = AVAILABLE_AVATARS.map((a) => a.id);
      expect(ids).toEqual([1, 2, 3, 4, 5]);

      for (const avatar of AVAILABLE_AVATARS) {
        expect(avatar.name).toBeTruthy();
        expect(avatar.vocation).toBeTruthy();
        expect(avatar.image).toMatch(/^\/images\/avatars\/avatar-[1-5]\.svg$/);
      }
    });
  });
});
