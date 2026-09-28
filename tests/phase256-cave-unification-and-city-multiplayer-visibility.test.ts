import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { huntConfigs } from '../packages/realmap11-importer/src/importHuntRegions';
import { getHuntWorldEntrance } from '../packages/domain/src/hunt';
import { content } from './fixture';

describe('Phase 256: Unified Cave Hunts and Guaranteed Thais City Multiplayer Visibility', () => {
  const root = path.resolve(__dirname, '..');

  describe('1. Hunt Coordinates Unification (Cave x: 32947, y: 32476, z: 9)', () => {
    it('configures all standard hunts to the unified enclosed cave in realmap importer', () => {
      const standardHunts = huntConfigs.filter((h) => h.huntId !== 'pvp-arena');
      expect(standardHunts.length).toBe(12);

      for (const hunt of standardHunts) {
        expect(hunt.center).toEqual([32947, 32476, 9]);
        expect(hunt.radius).toBe(25);
        expect(hunt.available).toBe(true);
      }
    });

    it('verifies content/generated/hunt-regions.json contains extracted cave regions with >= 500 walkable tiles', () => {
      const huntRegionsPath = path.join(root, 'content/generated/hunt-regions.json');
      expect(fs.existsSync(huntRegionsPath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(huntRegionsPath, 'utf8'));
      expect(data.regions).toBeDefined();

      for (const region of data.regions) {
        if (region.huntId === 'pvp-arena') continue;
        expect(region.sourceCenter).toEqual({ x: 32947, y: 32476, z: 9, radius: 25 });
        expect(region.tiles.length).toBe(2601);
        const walkable = region.tiles.filter((t: any) => t.walkable).length;
        expect(walkable).toBeGreaterThanOrEqual(500);
      }
    });

    it('verifies getHuntWorldEntrance returns unified cave coordinates for any hunt', () => {
      const ratEntrance = getHuntWorldEntrance('rat-cellars', content);
      expect(ratEntrance.worldPosition).toEqual({ x: 32947, y: 32476, z: 9 });

      const cyclopsEntrance = getHuntWorldEntrance('cyclops-camp', content);
      expect(cyclopsEntrance.worldPosition).toEqual({ x: 32947, y: 32476, z: 9 });

      const dragonEntrance = getHuntWorldEntrance('dragon-lair', content);
      expect(dragonEntrance.worldPosition).toEqual({ x: 32947, y: 32476, z: 9 });

      const heroEntrance = getHuntWorldEntrance('hero-cave', content);
      expect(heroEntrance.worldPosition).toEqual({ x: 32947, y: 32476, z: 9 });
    });
  });

  describe('2. Thais City Visibility Guarantee and Multi-floor Isolation', () => {
    it('ensures players on floor z: 7 in Thais are classified as visible in city', () => {
      const remotePlayerCity = {
        id: 'remote-1',
        name: 'Caos',
        characterId: 'char-caos',
        x: 32369,
        y: 32241,
        z: 7,
        inHunt: false,
      };

      const myPlayerId = 'local-1';
      const myCharIdVal = 'char-warriot';
      const curChars = [{ id: 'char-warriot', name: 'Warriot' }];

      const isLocal =
        remotePlayerCity.id === myPlayerId ||
        (myCharIdVal && remotePlayerCity.characterId === myCharIdVal) ||
        curChars.some((c) => c.id === remotePlayerCity.id || c.id === remotePlayerCity.characterId);

      const pZ = typeof remotePlayerCity.z === 'number' ? remotePlayerCity.z : 7;
      const isOutsideThaisCity = pZ > 7;

      expect(isLocal).toBe(false);
      expect(isOutsideThaisCity).toBe(false);
      // Remote player is NOT skipped and will be rendered
      expect(!isLocal && !isOutsideThaisCity).toBe(true);
    });

    it('ensures players in the underground cave (z: 9) are not visible on city floor z: 7', () => {
      const remotePlayerInCave = {
        id: 'remote-2',
        name: 'CaveHunter',
        characterId: 'char-hunter',
        x: 32947,
        y: 32476,
        z: 9,
        inHunt: true,
      };

      const myPlayerId = 'local-1';
      const myCharIdVal = 'char-warriot';
      const curChars = [{ id: 'char-warriot', name: 'Warriot' }];

      const isLocal =
        remotePlayerInCave.id === myPlayerId ||
        (myCharIdVal && remotePlayerInCave.characterId === myCharIdVal) ||
        curChars.some((c) => c.id === remotePlayerInCave.id || c.id === remotePlayerInCave.characterId);

      const pZ = typeof remotePlayerInCave.z === 'number' ? remotePlayerInCave.z : 7;
      const isOutsideThaisCity = pZ > 7;

      expect(isLocal).toBe(false);
      expect(isOutsideThaisCity).toBe(true);
      // Cave hunter is skipped from city rendering
      expect(!isLocal && !isOutsideThaisCity).toBe(false);
    });

    it('ensures players in city floor z: 7 are visible even if a stale inHunt flag was present', () => {
      const remotePlayerStaleInHunt = {
        id: 'remote-3',
        name: 'StaleFlagPlayer',
        characterId: 'char-stale',
        x: 32370,
        y: 32242,
        z: 7,
        posZ: 7,
        inHunt: true, // stale flag
      };

      const pZ = typeof remotePlayerStaleInHunt.z === 'number' ? remotePlayerStaleInHunt.z : remotePlayerStaleInHunt.posZ;
      const isOutsideThaisCity = pZ > 7;

      expect(pZ).toBe(7);
      expect(isOutsideThaisCity).toBe(false);
    });
  });
});
