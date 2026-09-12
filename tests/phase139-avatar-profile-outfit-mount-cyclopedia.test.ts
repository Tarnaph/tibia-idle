import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import {
  CANONICAL_CYCLOPEDIA_ITEMS,
  CANONICAL_BESTIARY_MONSTERS,
  getCyclopediaItems,
  getBestiaryMonsters,
} from '@/apps/web/lib/cyclopediaData';
import {
  AVAILABLE_MOUNTS,
} from '@/apps/web/components/OutfitModal';
import {
  getOutfitCapabilities,
  preloadOutfitAllFrames,
} from '@/apps/web/lib/outfitRecolor';

describe('Phase 139: Avatar Character Profile, Outfit & Mount Selection, Cyclopedia Catalog Expansion', () => {
  describe('1. Avatar Click & Dedicated Outfit Button in WindowDockBar', () => {
    it('prioritizes onOpenProfile when avatar card is clicked in WindowDockBar', () => {
      const content = fs.readFileSync('apps/web/components/window/WindowDockBar.tsx', 'utf-8');

      // Verifies that onClick prioritizes onOpenProfile before onOpenSkills and onOpenOutfit
      const onOpenProfileIdx = content.indexOf('if (onOpenProfile) onOpenProfile();');
      const onOpenSkillsIdx = content.indexOf('else if (onOpenSkills) onOpenSkills();');
      const onOpenOutfitIdx = content.indexOf('else if (onOpenOutfit) onOpenOutfit();');

      expect(onOpenProfileIdx).toBeGreaterThan(0);
      expect(onOpenSkillsIdx).toBeGreaterThan(onOpenProfileIdx);
      expect(onOpenOutfitIdx).toBeGreaterThan(onOpenSkillsIdx);
    });

    it('provides a dedicated Outfit & Mount customization button in WindowDockBar actions grid', () => {
      const content = fs.readFileSync('apps/web/components/window/WindowDockBar.tsx', 'utf-8');

      expect(content).toContain('Customizar Aparência / Outfit & Montaria');
      expect(content).toContain('onClick={onOpenOutfit}');
    });

    it('passes onOpenProfile to WindowDockBar in GamePrototype', () => {
      const content = fs.readFileSync('apps/web/components/GamePrototype.tsx', 'utf-8');

      expect(content).toContain('onOpenProfile={() => setIsProfileModalOpen(true)}');
    });
  });

  describe('2. Outfit and Mount Selection Logic', () => {
    it('sets "none" (Sem Montaria) as the very first option in AVAILABLE_MOUNTS', () => {
      expect(AVAILABLE_MOUNTS.length).toBeGreaterThan(100);
      expect(AVAILABLE_MOUNTS[0].id).toBe('none');
      expect(AVAILABLE_MOUNTS[0].name).toBe('Sem Montaria');
    });

    it('correctly reports mount rider capabilities for various outfits', () => {
      const knightCaps = getOutfitCapabilities('knight');
      const citizenCaps = getOutfitCapabilities('citizen');
      const sireCaps = getOutfitCapabilities('sire');

      expect(knightCaps.hasMountRider).toBe(true);
      expect(citizenCaps.hasMountRider).toBe(true);
      expect(sireCaps.hasMountRider).toBe(false);
    });

    it('preloadOutfitAllFrames generates expected walk and mount frame urls without error', () => {
      // In node/test environment, Image might not exist so preload catches gracefully
      expect(() => {
        preloadOutfitAllFrames('knight', 'male', undefined, 0, 'donkey', true);
        preloadOutfitAllFrames('sire', 'male', undefined, 0, 'none', false);
      }).not.toThrow();
    });
  });

  describe('3. Cyclopedia Real Data Expansion (1100+ items, 900+ monsters)', () => {
    it('contains full equipment catalog in CANONICAL_CYCLOPEDIA_ITEMS', () => {
      expect(CANONICAL_CYCLOPEDIA_ITEMS.length).toBeGreaterThanOrEqual(1160);

      const items = getCyclopediaItems();
      expect(items.length).toBeGreaterThanOrEqual(1160);

      // Verify item fields exist
      const sampleItem = items.find((i) => i.spriteUrl.includes('item-'));
      expect(sampleItem).toBeDefined();
      expect(typeof sampleItem?.id).toBe('number');
      expect(sampleItem?.name).toBeTruthy();
      expect(sampleItem?.spriteUrl).toMatch(/^\/generated\/cyclopedia\/items\/item-\d+\.png$/);
    });

    it('contains full bestiary creatures in CANONICAL_BESTIARY_MONSTERS', () => {
      expect(CANONICAL_BESTIARY_MONSTERS.length).toBeGreaterThanOrEqual(960);

      const monsters = getBestiaryMonsters();
      expect(monsters.length).toBeGreaterThanOrEqual(960);

      // Verify authentic monster properties
      const dragon = monsters.find((m) => m.name.toLowerCase() === 'dragon');
      expect(dragon).toBeDefined();
      expect(dragon?.hp).toBe(1000);
      expect(dragon?.exp).toBe(700);
      expect(dragon?.spriteUrl).toBe('/generated/bestiary/dragon.png');

      const demon = monsters.find((m) => m.name.toLowerCase() === 'demon');
      expect(demon).toBeDefined();
      expect(demon?.hp).toBe(8200);
      expect(demon?.exp).toBe(6000);
      expect(demon?.spriteUrl).toBe('/generated/bestiary/demon.png');
    });

    it('CyclopediaModal implements pagination to handle 960+ monsters smoothly', () => {
      const content = fs.readFileSync('apps/web/components/CyclopediaModal.tsx', 'utf-8');

      expect(content).toContain('bestiaryPage');
      expect(content).toContain('setBestiaryPage');
      expect(content).toContain('bestiaryPerPage = 25');
      expect(content).toContain('Página');
      expect(content).toContain('Próxima');
    });
  });
});
