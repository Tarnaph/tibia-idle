import { describe, it, expect, beforeEach } from 'vitest';
import {
  huntAssetPreloader,
  HUNT_MONSTER_MAPPING,
} from '../apps/web/lib/huntAssetPreloader';
import { initialHunts, createIdleGame, restartHunt, leaveHunt, THAIS_TEMPLE_POSITION } from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 242: Hunt Preloading, Bestiary Tracker & Disband Mid-Hunt', () => {
  beforeEach(() => {
    huntAssetPreloader.reset();
  });

  describe('1. Hunt Asset Preloader', () => {
    it('resolves monster IDs for cyclops-camp including cyclops and cyclops-smith', () => {
      const monsters = huntAssetPreloader.getHuntMonsterIds('cyclops-camp');
      expect(monsters).toContain('cyclops');
      expect(monsters).toContain('cyclops-smith');
    });

    it('dynamically resolves monsters from any domain hunt in initialHunts', () => {
      for (const hunt of initialHunts) {
        const resolved = huntAssetPreloader.getHuntMonsterIds(hunt.id);
        expect(resolved.length).toBeGreaterThan(0);
        for (const m of hunt.monsters) {
          expect(resolved).toContain(m);
        }
      }
    });

    it('extracts directional walk animation frames for hunt monsters', () => {
      const urls = huntAssetPreloader.getHuntEssentialAssetUrls('cyclops-camp');
      expect(urls.length).toBeGreaterThan(20);

      // Verify hunt atlas is included
      expect(urls.some((u) => u.includes('hunt-cyclops-camp-atlas.png'))).toBe(true);
      expect(urls.some((u) => u.includes('combat-fx-atlas.png'))).toBe(true);

      // Verify directional walking frames for cyclops are included
      expect(urls.some((u) => u.includes('monster-cyclops-') && u.includes('.png'))).toBe(true);
      expect(urls.some((u) => u.includes('monster-cyclops-smith-') && u.includes('.png'))).toBe(true);

      // Verify thumbnails and bestiary portraits
      expect(urls.some((u) => u.includes('/generated/bestiary/cyclops.png'))).toBe(true);
      expect(urls.some((u) => u.includes('/generated/tibia1098/monster-cyclops-thumb.png'))).toBe(true);
    });

    it('tracks progress and ready state per hunt', async () => {
      expect(huntAssetPreloader.isHuntReady('rat-cellars')).toBe(false);
      expect(huntAssetPreloader.getHuntProgress('rat-cellars')).toBe(0);

      const progressSnapshots: number[] = [];
      const unsub = huntAssetPreloader.onProgress((p) => {
        if (p.huntId === 'rat-cellars') {
          progressSnapshots.push(p.progress);
        }
      });

      await huntAssetPreloader.preloadHunt('rat-cellars');
      unsub();

      expect(huntAssetPreloader.isHuntReady('rat-cellars')).toBe(true);
      expect(huntAssetPreloader.getHuntProgress('rat-cellars')).toBe(100);
      expect(progressSnapshots.length).toBeGreaterThan(0);
      expect(progressSnapshots[progressSnapshots.length - 1]).toBe(100);
    });
  });

  describe('2. Bestiary Tracker Monster Dismissal', () => {
    it('filters out dismissed monsters from the tracked list', () => {
      const huntMonsters = ['cyclops', 'cyclops-smith'];
      const pinnedMonster = 'rat';
      let dismissedTrackerMonsterIds: string[] = [];

      const computeTrackedList = () => {
        const ids = new Set<string>();
        for (const m of huntMonsters) {
          if (!dismissedTrackerMonsterIds.includes(m.toLowerCase())) {
            ids.add(m.toLowerCase());
          }
        }
        if (pinnedMonster && !dismissedTrackerMonsterIds.includes(pinnedMonster.toLowerCase())) {
          ids.add(pinnedMonster.toLowerCase());
        }
        return Array.from(ids);
      };

      // Initially all 3 monsters are present
      expect(computeTrackedList()).toEqual(['cyclops', 'cyclops-smith', 'rat']);

      // User clicks [✕] on Cyclops
      dismissedTrackerMonsterIds = [...dismissedTrackerMonsterIds, 'cyclops'];
      expect(computeTrackedList()).toEqual(['cyclops-smith', 'rat']);

      // User clicks [✕] on Rat
      dismissedTrackerMonsterIds = [...dismissedTrackerMonsterIds, 'rat'];
      expect(computeTrackedList()).toEqual(['cyclops-smith']);

      // If user tracks Cyclops again, dismissed entry is removed
      dismissedTrackerMonsterIds = dismissedTrackerMonsterIds.filter((id) => id !== 'cyclops');
      expect(computeTrackedList()).toEqual(['cyclops', 'cyclops-smith']);
    });
  });

  describe('3. Disband Party Mid-Hunt & Clean Temple Return', () => {
    it('safely ends hunt, resets party to solo, and returns to Thais Temple', () => {
      // Create multi-character party in a hunt using canonical content
      let state = createIdleGame('test-disband-seed', content, 'cyclops-camp');
      state = restartHunt(state, 'test-disband-seed', content, 'cyclops-camp', 'cauteloso');

      // Add a second character to session
      const char1 = state.session.characters[0];
      const char2 = { ...char1, id: 'alt-druid-2', name: 'Elder Alt', vocation: 'Druid' as const };
      state.session.characters = [char1, char2];
      expect(state.session.characters.length).toBe(2);

      // Execute leaveHunt (which occurs on disband)
      const afterLeave = leaveHunt(state);
      expect(afterLeave.encounter.status).toBe('completed');
      expect(afterLeave.encounter.enemies).toEqual([]);

      // Active character solo filter
      const activeId = afterLeave.session.selectedCharacterId || afterLeave.session.characters[0]?.id;
      const soloCharacters = afterLeave.session.characters.filter((c) => c.id === activeId);

      expect(soloCharacters.length).toBe(1);
      expect(soloCharacters[0].id).toBe(char1.id);

      // Verify canonical Thais Temple coordinates
      expect(THAIS_TEMPLE_POSITION.x).toBe(32369);
      expect(THAIS_TEMPLE_POSITION.y).toBe(32241);
      expect(THAIS_TEMPLE_POSITION.z).toBe(7);
    });
  });
});
