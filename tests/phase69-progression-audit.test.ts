import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  startGame,
  experienceForLevel,
  experienceProgress,
  levelForExperience,
  requiredSkillTries,
  requiredMagicTries,
  addTrainingTries,
  vocationFor,
  advanceCombat,
  triggerManualHotbarAction,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 69: Comprehensive Character Progression Audit and Integration', () => {
  describe('1. Level and Experience Progression (TFS Official Formula)', () => {
    it('accurately matches canonical TFS experience thresholds', () => {
      expect(experienceForLevel(1)).toBe(0);
      expect(experienceForLevel(2)).toBe(100);
      expect(experienceForLevel(3)).toBe(200);
      expect(experienceForLevel(4)).toBe(400);
      expect(experienceForLevel(5)).toBe(800);
      expect(experienceForLevel(6)).toBe(1500);
      expect(experienceForLevel(10)).toBe(9300);

      // Percentage progress calculation
      expect(experienceProgress(1, 0)).toBe(0);
      expect(experienceProgress(1, 50)).toBe(0.5);
      expect(experienceProgress(1, 100)).toBe(1);

      // Level for experience inverse lookup
      expect(levelForExperience(0)).toBe(1);
      expect(levelForExperience(99)).toBe(1);
      expect(levelForExperience(100)).toBe(2);
      expect(levelForExperience(799)).toBe(4);
      expect(levelForExperience(800)).toBe(5);
      expect(levelForExperience(9300)).toBe(10);
    });

    it('awards correct HP and Mana gains per vocation upon leveling up', () => {
      const knightVoc = vocationFor(content, 'Knight');
      const paladinVoc = vocationFor(content, 'Paladin');
      const sorcererVoc = vocationFor(content, 'Sorcerer');
      const druidVoc = vocationFor(content, 'Druid');

      // Knight: +15 HP, +5 Mana per level
      expect(knightVoc.gainHp).toBe(15);
      expect(knightVoc.gainMana).toBe(5);

      // Paladin: +10 HP, +15 Mana per level
      expect(paladinVoc.gainHp).toBe(10);
      expect(paladinVoc.gainMana).toBe(15);

      // Sorcerer & Druid: +5 HP, +30 Mana per level
      expect(sorcererVoc.gainHp).toBe(5);
      expect(sorcererVoc.gainMana).toBe(30);
      expect(druidVoc.gainHp).toBe(5);
      expect(druidVoc.gainMana).toBe(30);
    });
  });

  describe('2. Combat Skill Progression & Vocation Multipliers', () => {
    it('applies correct vocation skill curves (Knight melee vs Mage melee)', () => {
      const knightVoc = vocationFor(content, 'Knight');
      const sorcererVoc = vocationFor(content, 'Sorcerer');

      // Knight sword multiplier is 1.1, Sorcerer is 2.0
      expect(knightVoc.skillMultipliers.sword).toBe(1.1);
      expect(sorcererVoc.skillMultipliers.sword).toBe(2.0);

      // Knight requires far fewer tries to reach high sword skill
      const knightTriesLv20 = requiredSkillTries(knightVoc, 'sword', 20);
      const sorcererTriesLv20 = requiredSkillTries(sorcererVoc, 'sword', 20);
      expect(knightTriesLv20).toBeLessThan(sorcererTriesLv20);
    });

    it('advances skills and levels up skill when threshold is reached', () => {
      const knightVoc = vocationFor(content, 'Knight');
      let game = createIdleGame('test-skill-advance', content);
      game = startGame(game, content);

      const char = game.session.characters[0];
      char.skills.sword = 10;
      char.skillTries.sword = 0;

      const reqFor11 = requiredSkillTries(knightVoc, 'sword', 11); // 50 * 1.1^0 = 50
      expect(reqFor11).toBe(50);

      // Add 25 tries -> skill remains 10, tries = 25
      const res1 = addTrainingTries(char, 'sword', 25, knightVoc);
      expect(res1.length).toBe(0);
      expect(char.skills.sword).toBe(10);
      expect(char.skillTries.sword).toBe(25);

      // Add 25 more tries -> reaches 50 -> advances to 11!
      const res2 = addTrainingTries(char, 'sword', 25, knightVoc);
      expect(res2).toEqual(['sword']);
      expect(char.skills.sword).toBe(11);
      expect(char.skillTries.sword).toBe(0);
    });
  });

  describe('3. Magic Level Progression & Mana Multipliers', () => {
    it('applies correct mana curves (Mage manaMultiplier 1.1 vs Knight 3.0)', () => {
      const sorcererVoc = vocationFor(content, 'Sorcerer');
      const knightVoc = vocationFor(content, 'Knight');

      expect(sorcererVoc.manaMultiplier).toBe(1.1);
      expect(knightVoc.manaMultiplier).toBe(3.0);

      const sorcererReqML1 = requiredMagicTries(sorcererVoc, 1);
      const knightReqML1 = requiredMagicTries(knightVoc, 1);
      expect(sorcererReqML1).toBe(1600);
      expect(knightReqML1).toBe(1600);

      // ML 5 requires far less mana for Sorcerer than Knight
      const sorcererReqML5 = requiredMagicTries(sorcererVoc, 5);
      const knightReqML5 = requiredMagicTries(knightVoc, 5);
      expect(sorcererReqML5).toBeLessThan(knightReqML5);
    });

    it('advances magic level when mana spent threshold is reached', () => {
      const sorcererVoc = vocationFor(content, 'Sorcerer');
      let game = createIdleGame('test-ml-advance', content);
      game = startGame(game, content);

      const char = game.session.characters[0];
      char.skills.magicLevel = 0;
      char.skillTries.magicLevel = 0;

      // Add 1600 mana spent -> advances from ML 0 to ML 1
      const leveled = addTrainingTries(char, 'magicLevel', 1600, sorcererVoc);
      expect(leveled).toEqual(['magicLevel']);
      expect(char.skills.magicLevel).toBe(1);
    });
  });

  describe('4. Active Combat Progression Integration', () => {
    it('advances weapon skill tries when dealing physical attacks in combat', () => {
      let game = createIdleGame('test-combat-skill-prog', content);
      game = startGame(game, content);

      const char = game.session.characters[0];
      // Starter Knight has steel axe equipped (item 8601), so active skill is axe
      char.skills.axe = 10;
      char.skillTries.axe = 0;

      // Position player next to enemy
      const actor = game.encounter.partyActors[0];
      const enemy = game.encounter.enemies[0];
      actor.position = { ...enemy.position, x: enemy.position.x + 1 };
      actor.nextAttackAt = 0;
      actor.groupCooldowns['attack'] = 0;
      actor.targetId = enemy.id;

      // Advance combat by 1 tick (120ms)
      game = advanceCombat(game, content, 120);

      // Advance through pending attack impact (180ms)
      game = advanceCombat(game, content, 200);

      const updatedChar = game.session.characters[0];
      // Should have gained tries in axe fighting
      expect(updatedChar.skillTries.axe).toBeGreaterThan(0);
    });

    it('advances magic level tries when casting mana-spending spells in combat', () => {
      let game = createIdleGame('test-combat-ml-prog', content);
      game = startGame(game, content);

      const char = game.session.characters[0];
      // Find Exura spell (or first available healing/offensive spell)
      const exura = content.spells.find((s) => s.words.includes('exura')) ?? content.spells[0];
      expect(exura).toBeDefined();

      // Configure character to meet vocation and level requirements of the spell
      char.vocation = exura.vocations[0] as any;
      char.level = exura.requiredLevel + 5;
      char.skills.magicLevel = 0;
      char.skillTries.magicLevel = 0;
      char.maxMana = 200;
      char.currentMana = 200;

      const actor = game.encounter.partyActors[0];
      actor.mana = 200;
      actor.hp = 50; // injured to trigger healing spell

      // Trigger manual spell action
      const actionId = exura.spellId;
      const castSuccess = triggerManualHotbarAction(game, char.id, actionId, content);
      expect(castSuccess).toBe(true);

      const updatedChar = game.session.characters[0];
      // Spent mana should be added as magic tries (mana * rateMagic)
      expect(updatedChar.skillTries.magicLevel).toBeGreaterThan(0);
    });
  });
});
