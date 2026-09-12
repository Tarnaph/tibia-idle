import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import {
  isCharacterMounted,
  canOutfitHaveMount,
  getSafeWalkFrame,
  formatMountStatusLabel,
} from '@/apps/web/lib/appearanceService';
import { CyclopediaService } from '@/apps/web/lib/cyclopediaService';

describe('Phase 140: Decoupled Modals, Appearance SSOT Service, and Cyclopedia Isolation', () => {
  describe('1. Appearance SSOT Service (Mount & Outfit Validation)', () => {
    it('isCharacterMounted strictly enforces mountActive, mount ID, and outfit capabilities', () => {
      // 1. mountActive false -> false, even with donkey
      expect(isCharacterMounted({ outfit: 'knight', mount: 'donkey', mountActive: false })).toBe(false);

      // 2. mount: 'none' -> false, even with mountActive true
      expect(isCharacterMounted({ outfit: 'knight', mount: 'none', mountActive: true })).toBe(false);
      expect(isCharacterMounted({ outfit: 'knight', mount: '', mountActive: true })).toBe(false);
      expect(isCharacterMounted(null)).toBe(false);

      // 3. Outfit lacking mount support (Sire) -> always false
      expect(isCharacterMounted({ outfit: 'sire', mount: 'donkey', mountActive: true })).toBe(false);
      expect(isCharacterMounted({ outfit: 'Sire', mount: 'dromedary', mountActive: true })).toBe(false);

      // 4. Compatible outfit with valid mount and mountActive true -> true
      expect(isCharacterMounted({ outfit: 'knight', mount: 'donkey', mountActive: true })).toBe(true);
      expect(isCharacterMounted({ outfit: 'citizen', mount: 'widow-queen', mountActive: true })).toBe(true);
    });

    it('canOutfitHaveMount correctly discriminates mount capabilities', () => {
      expect(canOutfitHaveMount('knight')).toBe(true);
      expect(canOutfitHaveMount('citizen')).toBe(true);
      expect(canOutfitHaveMount('hunter')).toBe(true);
      expect(canOutfitHaveMount('sire')).toBe(false);
      expect(canOutfitHaveMount('Sire')).toBe(false);
    });

    it('getSafeWalkFrame safely clamps 3-frame outfits and preserves 8-walk frames for 9-frame outfits', () => {
      // 3-frame outfits (Sire, Noble, Paladin, Sorcerer)
      expect(getSafeWalkFrame('sire', 0)).toBe(0);
      expect(getSafeWalkFrame('sire', 1)).toBe(1);
      expect(getSafeWalkFrame('sire', 2)).toBe(2);
      expect(getSafeWalkFrame('sire', 3)).toBe(1);
      expect(getSafeWalkFrame('sire', 4)).toBe(2);
      expect(getSafeWalkFrame('sire', 8)).toBe(2);

      // 9-frame outfits (Knight, Citizen, Hunter)
      for (let f = 0; f <= 8; f++) {
        expect(getSafeWalkFrame('knight', f)).toBe(f);
      }
    });

    it('formatMountStatusLabel provides clear status feedback without confusing defaults', () => {
      expect(formatMountStatusLabel('sire', 'Donkey', true)).toBe('Montaria (Sem suporte neste traje)');
      expect(formatMountStatusLabel('knight', 'Sem Montaria', true)).toBe('Montaria (Desativada)');
      expect(formatMountStatusLabel('knight', 'Donkey', false)).toBe('Montaria (Desativada)');
      expect(formatMountStatusLabel('knight', 'Donkey', true)).toBe('Montaria: Donkey');
    });
  });

  describe('2. Cyclopedia Domain Service (Decoupled Data Access)', () => {
    it('CyclopediaService loads and caches items and monsters catalogs', () => {
      const items = CyclopediaService.getAllItems();
      const monsters = CyclopediaService.getAllMonsters();

      expect(items.length).toBeGreaterThanOrEqual(1160);
      expect(monsters.length).toBeGreaterThanOrEqual(960);
    });

    it('getItemById retrieves items by number or string ID', () => {
      const sword = CyclopediaService.getItemById(2400); // Magic Sword
      expect(sword).toBeDefined();
      expect(sword?.name.toLowerCase()).toContain('sword');

      const swordStr = CyclopediaService.getItemById('2400');
      expect(swordStr?.id).toBe(2400);
    });

    it('getMonsterById retrieves monsters by ID or name case-insensitively', () => {
      const dragon = CyclopediaService.getMonsterById('Dragon');
      expect(dragon).toBeDefined();
      expect(dragon?.hp).toBe(1000);
      expect(dragon?.exp).toBe(700);

      const demon = CyclopediaService.getMonsterById('demon');
      expect(demon).toBeDefined();
      expect(demon?.hp).toBe(8200);
    });

    it('getProgress accurately calculates tier and progress percentage', () => {
      // Dragon needs 1000 kills
      const p1 = CyclopediaService.getProgress('dragon', 50);
      expect(p1.tier).toBe(1);
      expect(p1.isUnlocked).toBe(false);

      const p2 = CyclopediaService.getProgress('dragon', 150);
      expect(p2.tier).toBe(2);

      const p3 = CyclopediaService.getProgress('dragon', 600);
      expect(p3.tier).toBe(3);

      const p4 = CyclopediaService.getProgress('dragon', 1000);
      expect(p4.tier).toBe(4);
      expect(p4.isUnlocked).toBe(true);
      expect(p4.percentage).toBe(100);
    });
  });

  describe('3. Architectural Decoupling: GameModalContext & GameModalHost', () => {
    it('GameModalContext file exports GameModalProvider and useGameModal', () => {
      const content = fs.readFileSync('apps/web/contexts/GameModalContext.tsx', 'utf-8');

      expect(content).toContain('export function GameModalProvider');
      expect(content).toContain('export function useGameModal');
      expect(content).toContain('openOutfit');
      expect(content).toContain('openCyclopedia');
      expect(content).toContain('openProfile');
    });

    it('GameModalHost file encapsulates OutfitModal, CyclopediaModal, and CharacterProfileModal', () => {
      const content = fs.readFileSync('apps/web/components/modals/GameModalHost.tsx', 'utf-8');

      expect(content).toContain('export function GameModalHost');
      expect(content).toContain('<OutfitModal');
      expect(content).toContain('<CyclopediaModal');
      expect(content).toContain('<CharacterProfileModal');
    });

    it('GamePrototype wraps layout with GameModalProvider and renders GameModalHost', () => {
      const content = fs.readFileSync('apps/web/components/GamePrototype.tsx', 'utf-8');

      expect(content).toContain('<GameModalProvider>');
      expect(content).toContain('</GameModalProvider>');
      expect(content).toContain('<GameModalHost');
      expect(content).toContain('isCharacterMounted(activeCharacter)');
    });

    it('WindowDockBar integrates useGameModal for decoupled triggers', () => {
      const content = fs.readFileSync('apps/web/components/window/WindowDockBar.tsx', 'utf-8');

      expect(content).toContain('useGameModal');
      expect(content).toContain('gameModal.openProfile()');
    });
  });
});
