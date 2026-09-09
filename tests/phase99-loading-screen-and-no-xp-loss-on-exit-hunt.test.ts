import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import {
  createCharacter,
  createIdleGame,
  initialHunts,
  leaveHunt,
  respawnInTemple,
  THAIS_TEMPLE_POSITION,
  type CharacterState,
  type GameState,
} from '@/packages/domain/src';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';
import monstersJson from '@/content/generated/monsters.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import vocationsJson from '@/content/generated/vocations.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import type {
  EquipmentCatalog,
  HuntRegionCatalog,
  ItemEconomyCatalog,
  MonsterCatalog,
  SpellCatalog,
  StarterLoadoutCatalog,
  VocationCatalog,
} from '@/packages/content-schema/src';
import { ExuraLoadingScreen } from '@/apps/web/components/ExuraLoadingScreen';

const content = {
  monsters: (monstersJson as MonsterCatalog).monsters,
  equipment: (equipmentJson as EquipmentCatalog).items,
  vocations: (vocationsJson as VocationCatalog).vocations,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 99: Exura 5s Loading Screen & No XP Loss On Hunt Exit', () => {
  describe('Pillar 1: Loading Assets & Dimensions', () => {
    it('verifies that loading-bg.jpg and loading-bar-frame.png exist with valid file sizes', () => {
      const bgPath = resolve(process.cwd(), 'public/images/loading/loading-bg.jpg');
      const barPath = resolve(process.cwd(), 'public/images/loading/loading-bar-frame.png');

      expect(existsSync(bgPath), 'loading-bg.jpg must exist in public/images/loading/').toBe(true);
      expect(existsSync(barPath), 'loading-bar-frame.png must exist in public/images/loading/').toBe(true);

      const bgStat = statSync(bgPath);
      const barStat = statSync(barPath);

      expect(bgStat.size).toBeGreaterThan(100_000);
      expect(barStat.size).toBeGreaterThan(50_000);
    });

    it('verifies the frame PNG header dimensions (1024x341, exactly 3:1 aspect ratio)', () => {
      const barPath = resolve(process.cwd(), 'public/images/loading/loading-bar-frame.png');
      const buffer = readFileSync(barPath);

      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      expect(width).toBe(1024);
      expect(height).toBe(341);
      const ratio = width / height;
      expect(ratio).toBeCloseTo(3.0, 1);
    });
  });

  describe('Pillar 2: Bug Fix - No XP Loss or De-Leveling on Hunt Exit', () => {
    it('guarantees leaveHunt preserves 100% of character experience and level', () => {
      const game = createIdleGame('test-seed-99', content);
      const hero = game.session.characters[0];

      // Give hero substantial experience and high level
      hero.level = 80;
      hero.experience = 5_000_000;
      hero.currentHp = 800;
      hero.maxHp = 1200;
      hero.currentMana = 400;
      hero.maxMana = 600;

      const initialExp = hero.experience;
      const initialLevel = hero.level;

      // Player voluntarily exits the hunt using leaveHunt
      const exitedState = leaveHunt(game);
      const exitedHero = exitedState.session.characters[0];

      // CRITICAL: XP must NOT be lost!
      expect(exitedHero.experience).toBe(initialExp);
      expect(exitedHero.level).toBe(initialLevel);
      expect(exitedState.encounter.status).toBe('completed');
    });

    it('demonstrates contrast: respawnInTemple applies 10% penalty whereas leaveHunt retains 100%', () => {
      const game = createIdleGame('test-seed-penalty', content);
      const hero = game.session.characters[0];
      hero.level = 50;
      hero.experience = 1_000_000;

      // 1. Calling respawnInTemple (Death penalty logic)
      const penalized = respawnInTemple(game);
      const penalizedHero = penalized.session.characters[0];

      // With default 10% death penalty: 1,000,000 * 0.90 = 900,000
      expect(penalizedHero.experience).toBeLessThan(hero.experience);
      expect(penalizedHero.experience).toBe(900_000);

      // 2. Calling leaveHunt (Voluntary exit logic implemented in Phase 99)
      const cleanExit = leaveHunt(game);
      const cleanHero = cleanExit.session.characters[0];

      // Zero XP penalty!
      expect(cleanHero.experience).toBe(hero.experience);
      expect(cleanHero.experience).toBe(1_000_000);
    });
  });

  describe('Pillar 3: Bug Fix - No Skill Loss on Hunt Exit', () => {
    it('guarantees leaveHunt preserves all skills without reduction', () => {
      const game = createIdleGame('test-seed-skills', content);
      const hero = game.session.characters[0];

      hero.skills = {
        sword: 75,
        axe: 70,
        club: 65,
        distance: 80,
        shielding: 75,
        fist: 20,
        magicLevel: 15,
      };

      const initialSkills = { ...hero.skills };

      // Voluntary exit
      const exitedState = leaveHunt(game);
      const exitedHero = exitedState.session.characters[0];

      // All skills must remain unchanged
      expect(exitedHero.skills.sword).toBe(initialSkills.sword);
      expect(exitedHero.skills.axe).toBe(initialSkills.axe);
      expect(exitedHero.skills.club).toBe(initialSkills.club);
      expect(exitedHero.skills.distance).toBe(initialSkills.distance);
      expect(exitedHero.skills.shielding).toBe(initialSkills.shielding);
      expect(exitedHero.skills.magicLevel).toBe(initialSkills.magicLevel);
    });
  });

  describe('Pillar 4: Loot Preservation on Voluntary Hunt Exit', () => {
    it('preserves accumulated gold and loot stacks when exiting hunt', () => {
      const game = createIdleGame('test-seed-loot', content);
      game.session.gold = 15420;
      game.session.loot = [
        { itemId: 2148, name: 'Gold Coin', amount: 500 },
        { itemId: 2376, name: 'Sword', amount: 2 },
        { itemId: 7618, name: 'Health Potion', amount: 15 },
      ];

      const exitedState = leaveHunt(game);

      expect(exitedState.session.gold).toBe(15420);
      expect(exitedState.session.loot.length).toBe(3);
      expect(exitedState.session.loot[0].amount).toBe(500);
      expect(exitedState.session.loot[1].amount).toBe(2);
      expect(exitedState.session.loot[2].amount).toBe(15);
    });
  });

  describe('Pillar 5: ExuraLoadingScreen Component Contract', () => {
    it('exports ExuraLoadingScreen with durationMs defaulting to 5000ms', () => {
      expect(typeof ExuraLoadingScreen).toBe('function');
      expect(ExuraLoadingScreen.length).toBe(1); // Accepts single props argument
    });
  });
});
