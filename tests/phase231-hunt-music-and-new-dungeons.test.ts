import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  initialHunts,
  getPullSizeMonsterPool,
  getPullSizeCounts,
  createContinuousHuntRoute,
} from '../packages/domain/src';
import { createRoomState } from '../packages/domain/src/spatial/rooms';
import { getTrackForHunt, CYCLOPS_THEME_TRACK, ELFS_THEME_TRACK } from '../apps/web/lib/audioManager';

describe('Phase 231: Hunt Music Links and 4 New RealMap 11 Dungeons', () => {
  describe('1. Hunt Audio Tracks (Cyclops & Elfs)', () => {
    it('correctly maps cyclops hunt to Hammer Below track', () => {
      const track = getTrackForHunt('cyclops-camp');
      expect(track).not.toBeNull();
      expect(track?.title).toBe('Hammer Below');
      expect(track?.url).toBe('/songs/hammer-below-cyclops.mp3');
      expect(track?.id).toBe(CYCLOPS_THEME_TRACK.id);
    });

    it('correctly maps elfs hunt to Whispers Among the Leaves track', () => {
      const track = getTrackForHunt('elf-sanctuary');
      expect(track).not.toBeNull();
      expect(track?.title).toBe('Whispers Among the Leaves');
      expect(track?.url).toBe('/songs/whispers-among-the-leaves-elfs.mp3');
      expect(track?.id).toBe(ELFS_THEME_TRACK.id);
    });

    it('verifies that audio files exist locally in public/songs', () => {
      const cyclopsMp3 = path.resolve('public/songs/hammer-below-cyclops.mp3');
      const elfsMp3 = path.resolve('public/songs/whispers-among-the-leaves-elfs.mp3');
      expect(fs.existsSync(cyclopsMp3)).toBe(true);
      expect(fs.existsSync(elfsMp3)).toBe(true);
    });
  });

  describe('2. Four New Hunts in Domain Catalog', () => {
    it('registers all 4 new hunts in initialHunts', () => {
      const coryms = initialHunts.find((h) => h.id === 'corym-mine');
      const gs = initialHunts.find((h) => h.id === 'giant-spider-lair');
      const hero = initialHunts.find((h) => h.id === 'hero-cave');
      const hydra = initialHunts.find((h) => h.id === 'hydra-lair');

      expect(coryms).toBeDefined();
      expect(gs).toBeDefined();
      expect(hero).toBeDefined();
      expect(hydra).toBeDefined();

      expect(coryms?.status).toBe('available');
      expect(gs?.status).toBe('available');
      expect(hero?.status).toBe('available');
      expect(hydra?.status).toBe('available');
    });

    it('validates pull size difficulty pools for Coryms (D1/D2/D3)', () => {
      expect(getPullSizeMonsterPool('corym-mine', 'cauteloso')).toEqual(['corym-vanguard']);
      expect(getPullSizeMonsterPool('corym-mine', 'ousado')).toEqual(['corym-vanguard', 'corym-skirmisher']);
      expect(getPullSizeMonsterPool('corym-mine', 'agressivo')).toEqual([
        'corym-vanguard',
        'corym-skirmisher',
        'corym-charlatan',
      ]);
    });

    it('validates pull size difficulty pools for Giant Spider (D1/D2/D3)', () => {
      expect(getPullSizeMonsterPool('giant-spider-lair', 'cauteloso')).toEqual(['tarantula', 'giant-spider']);
      expect(getPullSizeMonsterPool('giant-spider-lair', 'ousado')).toEqual(['giant-spider']);
      expect(getPullSizeMonsterPool('giant-spider-lair', 'agressivo')).toEqual(['giant-spider']);
    });

    it('validates pull size difficulty pools for Hero (D1/D2/D3)', () => {
      expect(getPullSizeMonsterPool('hero-cave', 'cauteloso')).toEqual(['hero']);
      expect(getPullSizeMonsterPool('hero-cave', 'ousado')).toEqual(['hero', 'renegade-knight']);
      expect(getPullSizeMonsterPool('hero-cave', 'agressivo')).toEqual(['hero', 'renegade-knight', 'vicious-squire']);
    });

    it('validates pull size difficulty pools for Hydra (D1/D2/D3)', () => {
      expect(getPullSizeMonsterPool('hydra-lair', 'cauteloso')).toEqual(['hydra']);
      expect(getPullSizeMonsterPool('hydra-lair', 'ousado')).toEqual(['hydra', 'bog-raider']);
      expect(getPullSizeMonsterPool('hydra-lair', 'agressivo')).toEqual(['hydra', 'bog-raider']);
    });
  });

  describe('3. Monster Visual Assets and Bestiary Sprites', () => {
    const requiredMonsters = [
      'corym-vanguard',
      'corym-skirmisher',
      'corym-charlatan',
      'giant-spider',
      'tarantula',
      'hero',
      'renegade-knight',
      'vicious-squire',
      'hydra',
      'bog-raider',
    ];

    it('ensures canonical thumbnail exists in public/generated/bestiary/ for all 10 creatures', () => {
      for (const monsterId of requiredMonsters) {
        const bestiaryPath = path.resolve(`public/generated/bestiary/${monsterId}.png`);
        expect(fs.existsSync(bestiaryPath), `Missing bestiary thumbnail for ${monsterId}`).toBe(true);
      }
    });

    it('ensures fallback thumbnail exists in public/generated/tibia1098/ for all 10 creatures', () => {
      for (const monsterId of requiredMonsters) {
        const thumbPath = path.resolve(`public/generated/tibia1098/monster-${monsterId}-thumb.png`);
        expect(fs.existsSync(thumbPath), `Missing tibia1098 thumbnail for ${monsterId}`).toBe(true);
      }
    });
  });

  describe('4. OTBM Region Texture Atlases', () => {
    const newHunts = ['corym-mine', 'giant-spider-lair', 'hero-cave', 'hydra-lair'];

    it('verifies that texture atlases (PNG and JSON) were built for all 4 new hunts', () => {
      for (const huntId of newHunts) {
        const pngPath = path.resolve(`public/generated/atlases/hunt-${huntId}-atlas.png`);
        const jsonPath = path.resolve(`public/generated/atlases/hunt-${huntId}-atlas.json`);
        expect(fs.existsSync(pngPath), `Missing atlas PNG for ${huntId}`).toBe(true);
        expect(fs.existsSync(jsonPath), `Missing atlas JSON for ${huntId}`).toBe(true);

        const atlasJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        expect(atlasJson.frames).toBeDefined();
        expect(Object.keys(atlasJson.frames).length).toBeGreaterThan(50);
      }
    });
  });
});
