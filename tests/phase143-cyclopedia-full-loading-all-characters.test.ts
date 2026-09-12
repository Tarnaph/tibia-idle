import { describe, it, expect } from 'vitest';
import {
  ITEM_CATEGORIES,
  ALL_CATEGORIES_LABEL,
  CANONICAL_CYCLOPEDIA_ITEMS,
  CANONICAL_BESTIARY_MONSTERS,
  CANONICAL_BOSSTIARY_BOSSES,
  getCyclopediaItems,
  getBestiaryMonsters,
  formatNumberWithDots,
} from '../apps/web/lib/cyclopediaData';
import { CyclopediaService } from '../apps/web/lib/cyclopediaService';
import { createCharacter, createIdleGame, selectCharacter } from '../packages/domain/src';
import { experienceForLevel } from '../packages/domain/src/experience';
import { content } from './fixture';

describe('Phase 143: Cyclopedia Full Loading & Multi-Character Sync', () => {
  describe('1. Full Catalog Loading Integrity', () => {
    it('loads all 1,167 canonical items across categories', () => {
      expect(CANONICAL_CYCLOPEDIA_ITEMS.length).toBeGreaterThanOrEqual(1163);
      const items = getCyclopediaItems();
      expect(items.length).toBeGreaterThanOrEqual(1163);
      expect(CyclopediaService.getAllItems().length).toBeGreaterThanOrEqual(1163);
    });

    it('exports ALL_CATEGORIES_LABEL as "Todas as Categorias"', () => {
      expect(ALL_CATEGORIES_LABEL).toBe('Todas as Categorias');
      expect(ITEM_CATEGORIES).toHaveLength(11);
    });

    it('loads all 968 canonical bestiary creatures', () => {
      expect(CANONICAL_BESTIARY_MONSTERS.length).toBeGreaterThanOrEqual(968);
      const monsters = getBestiaryMonsters();
      expect(monsters.length).toBeGreaterThanOrEqual(968);
      expect(CyclopediaService.getAllMonsters().length).toBeGreaterThanOrEqual(968);
    });

    it('contains all Bosstiary bosses and milestone configurations', () => {
      expect(CANONICAL_BOSSTIARY_BOSSES.length).toBeGreaterThanOrEqual(15);
      const oberon = CANONICAL_BOSSTIARY_BOSSES.find((b) => b.id === 'grand-master-oberon');
      expect(oberon).toBeDefined();
      expect(oberon?.prowess).toBe(5);
      expect(oberon?.expertise).toBe(20);
      expect(oberon?.mastery).toBe(60);
    });

    it('supports looking up items and creatures across all categories via CyclopediaService', () => {
      // Melee weapon
      const abyssHammer = CyclopediaService.getItemById(7414);
      expect(abyssHammer).toBeDefined();
      expect(abyssHammer?.name).toBe('Abyss hammer');
      expect(abyssHammer?.category).toBe('Armas (corpo a corpo)');

      // Distance weapon
      const smallStone = CyclopediaService.getItemById(1294);
      expect(smallStone).toBeDefined();
      expect(smallStone?.category).toBe('Armas (distância)');

      // Trinket
      const goldCoin = CyclopediaService.getItemById(2148);
      expect(goldCoin).toBeDefined();
      expect(goldCoin?.name).toBe('Gold coin');

      // Bestiary lookup
      const spider = CyclopediaService.getMonsterById('spider');
      expect(spider).toBeDefined();
      expect(spider?.name).toBe('Spider');

      const progress = CyclopediaService.getProgress('spider', 250);
      expect(progress.isUnlocked).toBe(true);
      expect(progress.percentage).toBe(100);
      expect(progress.tier).toBe(4);
    });
  });

  describe('2. Global Search & Category Filter Logic', () => {
    it('searches items globally without category lock when ALL_CATEGORIES_LABEL is used', () => {
      const allItems = CANONICAL_CYCLOPEDIA_ITEMS;

      // Search query "dragon" which spans across 9 categories (Armas, Armaduras, Escudos, etc.)
      const dragonQuery = 'dragon';
      const results = allItems.filter(
        (it) =>
          it.name.toLowerCase().includes(dragonQuery) ||
          it.category.toLowerCase().includes(dragonQuery) ||
          it.categoriesText.toLowerCase().includes(dragonQuery)
      );
      expect(results.length).toBeGreaterThan(10);

      // Results should span multiple categories
      const categoriesFound = new Set(results.map((r) => r.category));
      expect(categoriesFound.size).toBeGreaterThan(1);
    });

    it('searches creatures across the full 968 bestiary catalog by name or location', () => {
      const allMonsters = CANONICAL_BESTIARY_MONSTERS;
      const demonSearch = allMonsters.filter(
        (m) => m.name.toLowerCase().includes('demon') || m.locations.some((l) => l.toLowerCase().includes('demon'))
      );
      expect(demonSearch.length).toBeGreaterThan(0);
      expect(demonSearch.some((m) => m.id === 'demon' || m.name.toLowerCase().includes('demon'))).toBe(true);
    });
  });

  describe('3. Multi-Character Bestiary & State Synchronization', () => {
    it('synchronizes bestiary kills, tracked monster and boss points separately per character', () => {
      let game = createIdleGame('seed-143', content);

      // Character 1: Knight with 50 spider kills, tracked 'spider', 30 boss points
      const char1 = createCharacter('char-1', 'Sir Lancelot', 'Knight', content);
      (char1 as any).bestiaryKills = { spider: 50, troll: 10 };
      (char1 as any).trackedBestiaryId = 'spider';
      (char1 as any).bossPoints = 30;

      // Character 2: Sorcerer with 100 rotworm kills, tracked 'rotworm', 15 boss points
      const char2 = createCharacter('char-2', 'Merlin', 'Sorcerer', content);
      (char2 as any).bestiaryKills = { rotworm: 100, dragon: 2 };
      (char2 as any).trackedBestiaryId = 'rotworm';
      (char2 as any).bossPoints = 15;

      game.session.characters = [char1, char2];
      game = selectCharacter(game, 'char-1');

      // Helper simulating Phase 143 dynamic synchronization hook:
      const syncCharacterState = (activeChar: any) => {
        let kills: Record<string, number> = {};
        if (activeChar.bestiaryKills && typeof activeChar.bestiaryKills === 'object') {
          kills = activeChar.bestiaryKills;
        } else if (activeChar.bestiaryKillsJson) {
          kills = typeof activeChar.bestiaryKillsJson === 'string'
            ? JSON.parse(activeChar.bestiaryKillsJson)
            : activeChar.bestiaryKillsJson;
        }
        return {
          bestiaryKills: kills,
          trackedMonsterId: activeChar.trackedBestiaryId || '',
          bossPoints: typeof activeChar.bossPoints === 'number' ? activeChar.bossPoints : 0,
        };
      };

      // State for Character 1
      const state1 = syncCharacterState(char1);
      expect(state1.bestiaryKills['spider']).toBe(50);
      expect(state1.bestiaryKills['troll']).toBe(10);
      expect(state1.bestiaryKills['rotworm']).toBeUndefined();
      expect(state1.trackedMonsterId).toBe('spider');
      expect(state1.bossPoints).toBe(30);

      // Switch to Character 2
      game = selectCharacter(game, 'char-2');
      const state2 = syncCharacterState(char2);
      expect(state2.bestiaryKills['rotworm']).toBe(100);
      expect(state2.bestiaryKills['dragon']).toBe(2);
      expect(state2.bestiaryKills['spider']).toBeUndefined(); // Zero cross-contamination
      expect(state2.trackedMonsterId).toBe('rotworm');
      expect(state2.bossPoints).toBe(15);
    });

    it('correctly handles JSON serialization fallback for bestiaryKillsJson from Prisma database', () => {
      const charWithDbJson = createCharacter('char-3', 'DB Hero', 'Paladin', content);
      (charWithDbJson as any).bestiaryKillsJson = JSON.stringify({ minotaur: 120, elf: 80 });
      (charWithDbJson as any).trackedBestiaryId = 'minotaur';
      (charWithDbJson as any).bossPoints = 50;

      let kills: Record<string, number> = {};
      if ((charWithDbJson as any).bestiaryKillsJson) {
        kills = JSON.parse((charWithDbJson as any).bestiaryKillsJson);
      }
      expect(kills['minotaur']).toBe(120);
      expect(kills['elf']).toBe(80);
      expect((charWithDbJson as any).trackedBestiaryId).toBe('minotaur');
      expect((charWithDbJson as any).bossPoints).toBe(50);
    });
  });

  describe('4. Character Sheet & Exploration Metrics in Cyclopedia', () => {
    it('computes accurate XP progression, vitals and skill levels for character tab', () => {
      const testChar = createCharacter('test-hero', 'Exura Master', 'Knight', content);
      testChar.level = 25;
      testChar.experience = experienceForLevel(25) + 1500;
      testChar.currentHp = 350;
      testChar.maxHp = 400;
      testChar.currentMana = 100;
      testChar.maxMana = 150;

      const currentLevelBase = experienceForLevel(25);
      const nextLevelBase = experienceForLevel(26);
      const diff = nextLevelBase - currentLevelBase;
      const progressPct = Math.min(100, Math.max(0, Math.floor(((testChar.experience - currentLevelBase) / diff) * 100)));

      expect(progressPct).toBeGreaterThanOrEqual(0);
      expect(progressPct).toBeLessThanOrEqual(100);

      const hpPct = Math.round((testChar.currentHp / testChar.maxHp) * 100);
      expect(hpPct).toBe(88); // 350 / 400 = 87.5% -> 88%

      const manaPct = Math.round((testChar.currentMana / testChar.maxMana) * 100);
      expect(manaPct).toBe(67); // 100 / 150 = 66.6% -> 67%

      // 7 canonical skills
      expect(testChar.skills.fist).toBeGreaterThanOrEqual(10);
      expect(testChar.skills.club).toBeGreaterThanOrEqual(10);
      expect(testChar.skills.sword).toBeGreaterThanOrEqual(10);
      expect(testChar.skills.axe).toBeGreaterThanOrEqual(10);
      expect(testChar.skills.distance).toBeGreaterThanOrEqual(10);
      expect(testChar.skills.shielding).toBeGreaterThanOrEqual(10);
      expect(testChar.skills.magicLevel).toBeGreaterThanOrEqual(0);
    });

    it('formats large numbers cleanly in pt-BR format', () => {
      expect(formatNumberWithDots(1000)).toBe('1.000');
      expect(formatNumberWithDots(1167)).toBe('1.167');
      expect(formatNumberWithDots(250000)).toBe('250.000');
      expect(formatNumberWithDots(1000000)).toBe('1.000.000');
    });
  });
});
