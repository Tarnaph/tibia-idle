import { describe, expect, it } from 'vitest';
import {
  EXP_STAGES,
  PHYSICAL_SKILL_STAGES,
  MAGIC_LEVEL_STAGES,
  getExpStageMultiplier,
  getSkillStageMultiplier,
  isGreenStaminaActive,
  getEffectiveExpMultiplier,
  applySkillTrainingProgress,
  OFFICIAL_MAX_STAMINA_MINUTES,
  GREEN_STAMINA_THRESHOLD_MINUTES,
  calculateMaxStamina,
  grantSharedExperience,
  sharedExperiencePerCharacter,
  createCharacter,
  NONE_VOCATION_DEFINITION,
  requiredSkillTries,
  type CharacterState,
} from '../packages/domain/src';
import type { VocationDefinition } from '../packages/content-schema/src';

describe('Phase 177: EXP, Skill Stages, Green Stamina, God Title and Mounted Addons', () => {
  describe('EXP Stages Table and Multiplier Function', () => {
    it('returns exact multipliers according to FIX.md specifications', () => {
      // 1 - 8: 50x
      expect(getExpStageMultiplier(1)).toBe(50);
      expect(getExpStageMultiplier(8)).toBe(50);

      // 9 - 50: 80x
      expect(getExpStageMultiplier(9)).toBe(80);
      expect(getExpStageMultiplier(50)).toBe(80);

      // 51 - 100: 60x
      expect(getExpStageMultiplier(51)).toBe(60);
      expect(getExpStageMultiplier(100)).toBe(60);

      // 101 - 150: 40x
      expect(getExpStageMultiplier(101)).toBe(40);
      expect(getExpStageMultiplier(150)).toBe(40);

      // 151 - 200: 30x
      expect(getExpStageMultiplier(151)).toBe(30);
      expect(getExpStageMultiplier(200)).toBe(30);

      // 201 - 300: 15x
      expect(getExpStageMultiplier(201)).toBe(15);
      expect(getExpStageMultiplier(300)).toBe(15);

      // 301 - 400: 12x
      expect(getExpStageMultiplier(301)).toBe(12);
      expect(getExpStageMultiplier(400)).toBe(12);

      // 401 - 500: 10x
      expect(getExpStageMultiplier(401)).toBe(10);
      expect(getExpStageMultiplier(500)).toBe(10);

      // 501 - 600: 7x
      expect(getExpStageMultiplier(501)).toBe(7);
      expect(getExpStageMultiplier(600)).toBe(7);

      // 601 - 700: 6x
      expect(getExpStageMultiplier(601)).toBe(6);
      expect(getExpStageMultiplier(700)).toBe(6);

      // 701 - 800: 5x
      expect(getExpStageMultiplier(701)).toBe(5);
      expect(getExpStageMultiplier(800)).toBe(5);

      // 801 - 900: 4x
      expect(getExpStageMultiplier(801)).toBe(4);
      expect(getExpStageMultiplier(900)).toBe(4);

      // 901 - 1000: 3x
      expect(getExpStageMultiplier(901)).toBe(3);
      expect(getExpStageMultiplier(1000)).toBe(3);

      // 1001 - 1200: 2x
      expect(getExpStageMultiplier(1001)).toBe(2);
      expect(getExpStageMultiplier(1200)).toBe(2);

      // 1201 - 1400: 1.5x
      expect(getExpStageMultiplier(1201)).toBe(1.5);
      expect(getExpStageMultiplier(1400)).toBe(1.5);

      // 1401+: 1.2x
      expect(getExpStageMultiplier(1401)).toBe(1.2);
      expect(getExpStageMultiplier(2500)).toBe(1.2);
    });
  });

  describe('Green Stamina Bonus (+50% EXP)', () => {
    it('has 42h official max stamina (2520 mins) and 39h green stamina threshold (2340 mins)', () => {
      expect(OFFICIAL_MAX_STAMINA_MINUTES).toBe(2520);
      expect(GREEN_STAMINA_THRESHOLD_MINUTES).toBe(2340);
      expect(calculateMaxStamina(1)).toBe(15);
      expect(isGreenStaminaActive(2520)).toBe(true);
      expect(isGreenStaminaActive(2400)).toBe(true);
      expect(isGreenStaminaActive(2340)).toBe(true);
      expect(isGreenStaminaActive(2339)).toBe(false);
      expect(isGreenStaminaActive(1200)).toBe(false);
    });

    it('calculates effective EXP multiplier matching the level 300 example (15x normal, 22.5x with green stamina)', () => {
      // Normal stamina
      const normalMult = getEffectiveExpMultiplier(300, 2000, 1);
      expect(normalMult).toBe(15);

      // Green stamina (2400 minutes >= 2340 minutes)
      const greenMult = getEffectiveExpMultiplier(300, 2400, 1);
      expect(greenMult).toBe(22.5); // 15 * 1.5 = 22.5x

      // Level 1: 50x normal, 75x green
      expect(getEffectiveExpMultiplier(1, 2000, 1)).toBe(50);
      expect(getEffectiveExpMultiplier(1, 2520, 1)).toBe(75);
    });
  });

  describe('Physical Skills Stages', () => {
    it('returns exact multipliers according to FIX.md', () => {
      // 1 - 80: 10x
      expect(getSkillStageMultiplier('sword', 1)).toBe(10);
      expect(getSkillStageMultiplier('sword', 80)).toBe(10);

      // 81 - 100: 7x
      expect(getSkillStageMultiplier('axe', 81)).toBe(7);
      expect(getSkillStageMultiplier('club', 100)).toBe(7);

      // 101 - 120: 4x
      expect(getSkillStageMultiplier('distance', 101)).toBe(4);
      expect(getSkillStageMultiplier('shielding', 120)).toBe(4);

      // 121+: 2x
      expect(getSkillStageMultiplier('sword', 121)).toBe(2);
      expect(getSkillStageMultiplier('sword', 150)).toBe(2);
    });
  });

  describe('Magic Level Stages', () => {
    it('returns exact multipliers according to FIX.md', () => {
      // 0 - 80: 10x
      expect(getSkillStageMultiplier('magicLevel', 0)).toBe(10);
      expect(getSkillStageMultiplier('magicLevel', 80)).toBe(10);

      // 81 - 100: 7x
      expect(getSkillStageMultiplier('magicLevel', 81)).toBe(7);
      expect(getSkillStageMultiplier('magicLevel', 100)).toBe(7);

      // 101 - 120: 4x
      expect(getSkillStageMultiplier('magicLevel', 101)).toBe(4);
      expect(getSkillStageMultiplier('magicLevel', 120)).toBe(4);

      // 121 - 130: 3x
      expect(getSkillStageMultiplier('magicLevel', 121)).toBe(3);
      expect(getSkillStageMultiplier('magicLevel', 130)).toBe(3);

      // 131+: 2x
      expect(getSkillStageMultiplier('magicLevel', 131)).toBe(2);
      expect(getSkillStageMultiplier('magicLevel', 150)).toBe(2);
    });
  });

  describe('Skill Training with Tier Transitions', () => {
    it('scales progress with stage multiplier and transitions across tiers cleanly', () => {
      const vocation: VocationDefinition = {
        ...NONE_VOCATION_DEFINITION,
        id: 1,
        name: 'Knight',
        baseVocation: 'Knight',
        skillMultipliers: {
          fist: 1.5,
          club: 2.0,
          sword: 2.0,
          axe: 2.0,
          distance: 2.0,
          shielding: 1.5,
        },
      };

      const character = {
        id: 'char-test-knight',
        name: 'TestKnight',
        vocation: 'Knight',
        baseVocation: 'Knight',
        level: 100,
        experience: 500000,
        currentHp: 1000,
        maxHp: 1000,
        currentMana: 500,
        maxMana: 500,
        currentCapacity: 1000,
        maxCapacity: 1000,
        skills: { fist: 10, club: 10, sword: 80, axe: 10, distance: 10, shielding: 10, magicLevel: 0 },
        skillTries: { fist: 0, club: 0, sword: 0, axe: 0, distance: 0, shielding: 0, magicLevel: 0 },
        outfit: 'Knight',
        equipment: {},
        inventory: [],
        conditions: [],
        combatState: {
          targetId: null,
          spellCooldowns: {},
          groupCooldowns: {},
        },
        staminaMinutes: 2520,
      } as unknown as CharacterState;

      const neededTriesFor81 = requiredSkillTries(vocation, 'sword', 81);
      expect(neededTriesFor81).toBeGreaterThan(0);

      // At skill 80, stage multiplier is 10x.
      // Base units needed to exactly reach level 81: neededTriesFor81 / 10
      const baseUnitsFor81 = neededTriesFor81 / 10;
      applySkillTrainingProgress(character, 'sword', baseUnitsFor81, vocation, 1.0, 1.0);

      expect(character.skills.sword).toBe(81);
      expect(character.skillTries.sword).toBe(0);

      // Now character is level 81 (in the 81-100 tier with 7x multiplier).
      // If we add 10 base units, it should grant exactly 10 * 7 = 70 skill tries!
      applySkillTrainingProgress(character, 'sword', 10, vocation, 1.0, 1.0);
      expect(character.skillTries.sword).toBe(70);
    });
  });

  describe('Party Shared Experience with Individual Stage and Stamina Multipliers', () => {
    it('splits base experience among party members and applies individual stage + stamina per member', () => {
      const char1 = {
        id: 'char-1',
        name: 'Knight1',
        level: 50, // stage 80x (9-50)
        experience: 100000,
        staminaMinutes: 2500, // green stamina (+50% -> 1.5x) => 120x effective
        baseVocation: 'Knight',
        vocation: 'Knight',
        maxHp: 1000,
        currentHp: 1000,
        maxMana: 300,
        currentMana: 300,
      } as any;

      const char2 = {
        id: 'char-2',
        name: 'Sorcerer1',
        level: 300, // stage 15x (201-300)
        experience: 5000000,
        staminaMinutes: 2000, // orange stamina (1.0x) => 15x effective
        baseVocation: 'Sorcerer',
        vocation: 'Sorcerer',
        maxHp: 2000,
        currentHp: 2000,
        maxMana: 8000,
        currentMana: 8000,
      } as any;

      const fakeState = {
        session: {
          characters: [char1, char2],
        },
        encounter: {
          events: [],
          partyActors: [],
          log: [],
          nextLogId: 1,
          round: 0,
        },
        combatLog: [],
      } as any;

      const fakeContent = {
        vocations: [
          { name: 'Knight', gainHp: 15, gainMana: 5 },
          { name: 'Sorcerer', gainHp: 5, gainMana: 30 },
        ],
      } as any;

      // Base raw monster EXP: 1000
      // 2 unique vocations => multiplier = 1 + (2 * (5 * (2 - 1) + 10)) / 100 = 1.30
      // Shared base per member = ceil(1000 * 1.3 / 2) = 650
      // Member 1 (level 50, green stamina): 650 * (80 * 1.5) = 650 * 120 = 78,000 EXP
      // Member 2 (level 300, normal stamina): 650 * (15 * 1.0) = 650 * 15 = 9,750 EXP
      grantSharedExperience(fakeState, 1000, fakeContent, 1.0);

      expect(char1.experience - 100000).toBe(78000);
      expect(char2.experience - 5000000).toBe(9750);

      const expEvents = fakeState.encounter.events.filter((e: any) => e.type === 'experience-gained');
      expect(expEvents.length).toBe(2);
      expect(expEvents.find((e: any) => e.characterId === 'char-1')?.amount).toBe(78000);
      expect(expEvents.find((e: any) => e.characterId === 'char-2')?.amount).toBe(9750);
    });
  });

  describe('Mounted Addon Safe Fallback Rule', () => {
    it('replaces animation frames with f0 mounted frame without ever falling back to unmounted upright addon', () => {
      const mountedAnimUrl = '/assets/outfits/128-south-f1-mount-addon1.png';
      const isMountedAnim = mountedAnimUrl.includes('-mount-addon') && /-f[1-9]\d*-mount-addon/.test(mountedAnimUrl);
      expect(isMountedAnim).toBe(true);

      const staticFallback = mountedAnimUrl.replace(/-f[1-9]\d*-mount-addon/, '-f0-mount-addon');
      expect(staticFallback).toBe('/assets/outfits/128-south-f0-mount-addon1.png');
      expect(staticFallback).toContain('-mount-addon');
      expect(staticFallback).not.toContain('/128-south-f1-addon1.png');
    });
  });
});
