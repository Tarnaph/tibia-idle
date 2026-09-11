import { describe, it, expect, vi } from 'vitest';
import {
  getOutfitCapabilities,
  getOutfitLayerUrls,
  OUTFITS_MAX_FRAMES_3,
} from '@/apps/web/lib/outfitRecolor';
import { persistenceManager } from '@/packages/server/src/persistence/PrismaPersistenceManager';
import { PlayerState } from '@/packages/server/src/schemas/PlayerState';

describe('Phase 138: Walking Animation, Outfits, Avatar Click and Bestiary Persistence', () => {
  describe('1. Outfit Capabilities and Walking Frame Clamping', () => {
    it('defines 3-frame outfits correctly (noble, paladin, sire, sorcerer)', () => {
      expect(OUTFITS_MAX_FRAMES_3.has('noble')).toBe(true);
      expect(OUTFITS_MAX_FRAMES_3.has('paladin')).toBe(true);
      expect(OUTFITS_MAX_FRAMES_3.has('sire')).toBe(true);
      expect(OUTFITS_MAX_FRAMES_3.has('sorcerer')).toBe(true);
      expect(OUTFITS_MAX_FRAMES_3.has('knight')).toBe(false);
      expect(OUTFITS_MAX_FRAMES_3.has('citizen')).toBe(false);
    });

    it('returns maxFrames = 3 for 3-frame outfits (sire) and maxFrames = 9 for 8-walk-step outfits', () => {
      expect(getOutfitCapabilities('sire').maxFrames).toBe(3);

      expect(getOutfitCapabilities('knight').maxFrames).toBe(9);
      expect(getOutfitCapabilities('citizen').maxFrames).toBe(9);
      expect(getOutfitCapabilities('hunter').maxFrames).toBe(9);
      expect(getOutfitCapabilities('mage').maxFrames).toBe(9);
    });

    it('generates valid layer URLs for 8-step walking cycle on 9-frame outfits', () => {
      for (let frame = 1; frame <= 8; frame++) {
        const urls = getOutfitLayerUrls('knight', 'male', 'south', frame);
        expect(urls.base).toBe(`/generated/outfits/knight-male-south-f${frame}-base.png`);
        expect(urls.mask).toBe(`/generated/outfits/knight-male-south-f${frame}-mask.png`);
      }
    });

    it('clamps frames to safe 1 and 2 for 3-frame outfits during 8-step walking cycle', () => {
      const urlsF1 = getOutfitLayerUrls('sire', 'male', 'south', 1);
      const urlsF2 = getOutfitLayerUrls('sire', 'male', 'south', 2);
      const urlsF3 = getOutfitLayerUrls('sire', 'male', 'south', 3);
      const urlsF4 = getOutfitLayerUrls('sire', 'male', 'south', 4);

      expect(urlsF1.base).toBe('/generated/outfits/sire-male-south-f1-base.png');
      expect(urlsF2.base).toBe('/generated/outfits/sire-male-south-f2-base.png');
      expect(urlsF3.base).toBe('/generated/outfits/sire-male-south-f1-base.png');
      expect(urlsF4.base).toBe('/generated/outfits/sire-male-south-f2-base.png');
    });

    it('preserves mount layer URLs when character is mounted', () => {
      const urls = getOutfitLayerUrls('knight', 'male', 'south', 1, 0, 'donkey', true);
      expect(urls.base).toBe('/generated/outfits/knight-male-south-f1-mount-base.png');
      expect(urls.mountUrl).toBe('/generated/mounts/donkey-south-f1.png');
    });
  });

  describe('2. Bestiary MMORPG Persistence', () => {
    it('serializes bestiaryKills object to JSON in PrismaPersistenceManager', async () => {
      const mockDb: any = {
        character: {
          update: vi.fn().mockResolvedValue({ id: 'char-test-1' }),
        },
        characterSkill: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      };

      const testManager = new (persistenceManager.constructor as any)(mockDb);
      const player = new PlayerState();
      player.characterId = 'char-test-1';
      player.name = 'HeroTester';
      (player as any).bestiaryKills = { rotworm: 25, rat: 50 };
      (player as any).trackedBestiaryId = 'rotworm';

      await testManager.saveCharacter(player);

      expect(mockDb.character.update).toHaveBeenCalled();
      const callData = mockDb.character.update.mock.calls[0][0];
      expect(callData.where.id).toBe('char-test-1');
      expect(callData.data.bestiaryKillsJson).toBe(JSON.stringify({ rotworm: 25, rat: 50 }));
      expect(callData.data.trackedBestiaryId).toBe('rotworm');
    });

    it('deserializes bestiaryKillsJson into bestiaryKills object in loadCharacter', async () => {
      const mockDb: any = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-test-2',
            name: 'HeroTester2',
            level: 10,
            bestiaryKillsJson: JSON.stringify({ rotworm: 120, 'cave-rat': 60 }),
            trackedBestiaryId: 'cave-rat',
            skills: [],
          }),
        },
      };

      const testManager = new (persistenceManager.constructor as any)(mockDb);
      const loaded = await testManager.loadCharacter('char-test-2');

      expect(loaded).not.toBeNull();
      expect(loaded.bestiaryKills).toEqual({ rotworm: 120, 'cave-rat': 60 });
      expect(loaded.trackedBestiaryId).toBe('cave-rat');
    });
  });

  describe('3. Avatar Click Target in WindowDockBar', () => {
    it('WindowDockBar file calls onOpenOutfit when avatar card is clicked', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('apps/web/components/window/WindowDockBar.tsx', 'utf-8');

      // Verifies that onClick prioritizes onOpenOutfit before onOpenSkills
      expect(content).toContain('if (onOpenOutfit) onOpenOutfit();');
      const onClickIdx = content.indexOf('if (onOpenOutfit) onOpenOutfit();');
      const onOpenSkillsIdx = content.indexOf('if (onOpenSkills) onOpenSkills();', onClickIdx);
      expect(onClickIdx).toBeGreaterThan(0);
      expect(onOpenSkillsIdx).toBeGreaterThan(onClickIdx);
    });
  });
});
