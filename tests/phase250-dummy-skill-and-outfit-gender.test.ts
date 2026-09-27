import { describe, expect, it } from 'vitest';
import { getDefaultTrainingSkill } from '../packages/domain/src/training';
import type { CharacterState, GameContent } from '../packages/domain/src/types';
import rawOutfitsJson from '../content/generated/outfits.json';
import { normalizeOutfitId } from '../apps/web/lib/outfitRecolor';

describe('Phase 250: Default Training Dummy Skills & Outfit Gender Resolution', () => {
  const dummyContent: GameContent = {
    equipment: [
      { id: 'club-weapon', name: 'Mace', slot: 'weapon', weaponType: 'club', attack: 16, defense: 11, minLevel: 1 },
      { id: 'sword-weapon', name: 'Sword', slot: 'weapon', weaponType: 'sword', attack: 14, defense: 12, minLevel: 1 },
      { id: 'axe-weapon', name: 'Hatchet', slot: 'weapon', weaponType: 'axe', attack: 15, defense: 10, minLevel: 1 },
      { id: 'distance-weapon', name: 'Bow', slot: 'weapon', weaponType: 'distance', attack: 0, defense: 0, minLevel: 1 },
    ],
  } as unknown as GameContent;

  const baseChar: CharacterState = {
    id: 'char-1',
    name: 'TibiaTester',
    vocation: 'Knight',
    level: 20,
    experience: 10000,
    currentHp: 200,
    maxHp: 200,
    currentMana: 50,
    maxMana: 50,
    position: { x: 32349, y: 32238, z: 7 },
    skills: {
      fist: 10,
      club: 10,
      sword: 10,
      axe: 10,
      distance: 10,
      shielding: 10,
      fishing: 10,
      magicLevel: 0,
    },
    skillTries: {
      fist: 0,
      club: 0,
      sword: 0,
      axe: 0,
      distance: 0,
      shielding: 0,
      fishing: 0,
      magicLevel: 0,
    },
    equipment: {},
    inventory: [],
  };

  describe('1. Default Training Skill per Vocation & Progression', () => {
    it('selects magicLevel for Sorcerer and Master Sorcerer', () => {
      const sorc: CharacterState = { ...baseChar, vocation: 'Sorcerer' };
      const ms: CharacterState = { ...baseChar, vocation: 'Master Sorcerer' };
      expect(getDefaultTrainingSkill(sorc, dummyContent)).toBe('magicLevel');
      expect(getDefaultTrainingSkill(ms, dummyContent)).toBe('magicLevel');
    });

    it('selects magicLevel for Druid and Elder Druid', () => {
      const druid: CharacterState = { ...baseChar, vocation: 'Druid' };
      const ed: CharacterState = { ...baseChar, vocation: 'Elder Druid' };
      expect(getDefaultTrainingSkill(druid, dummyContent)).toBe('magicLevel');
      expect(getDefaultTrainingSkill(ed, dummyContent)).toBe('magicLevel');
    });

    it('selects distance for Paladin and Royal Paladin', () => {
      const paladin: CharacterState = { ...baseChar, vocation: 'Paladin' };
      const rp: CharacterState = { ...baseChar, vocation: 'Royal Paladin' };
      expect(getDefaultTrainingSkill(paladin, dummyContent)).toBe('distance');
      expect(getDefaultTrainingSkill(rp, dummyContent)).toBe('distance');
    });

    it('selects highest weapon skill for Knight (Axe > Sword, Club)', () => {
      const knightAxe: CharacterState = {
        ...baseChar,
        vocation: 'Knight',
        skills: { ...baseChar.skills, axe: 50, sword: 30, club: 20 },
      };
      expect(getDefaultTrainingSkill(knightAxe, dummyContent)).toBe('axe');
    });

    it('selects highest weapon skill for Knight (Club > Sword, Axe)', () => {
      const knightClub: CharacterState = {
        ...baseChar,
        vocation: 'Knight',
        skills: { ...baseChar.skills, club: 65, sword: 60, axe: 10 },
      };
      expect(getDefaultTrainingSkill(knightClub, dummyContent)).toBe('club');
    });

    it('breaks ties using skill tries when levels are identical', () => {
      const knightTies: CharacterState = {
        ...baseChar,
        vocation: 'Elite Knight',
        skills: { ...baseChar.skills, sword: 40, axe: 40, club: 20 },
        skillTries: { ...baseChar.skillTries, sword: 150, axe: 300, club: 0 },
      };
      expect(getDefaultTrainingSkill(knightTies, dummyContent)).toBe('axe');
    });

    it('uses equipped melee weapon when levels and tries are tied', () => {
      const knightEquipped: CharacterState = {
        ...baseChar,
        vocation: 'Knight',
        equipment: { weapon: 'club-weapon' },
      };
      expect(getDefaultTrainingSkill(knightEquipped, dummyContent)).toBe('club');
    });

    it('falls back to sword for Knight if fresh and no weapon equipped', () => {
      const freshKnight: CharacterState = {
        ...baseChar,
        vocation: 'Knight',
        equipment: {},
      };
      expect(getDefaultTrainingSkill(freshKnight, dummyContent)).toBe('sword');
    });
  });

  describe('2. Outfit Gender Resolution & Sprites', () => {
    const getOutfitDisplayName = (outfitId: string, gender: 'male' | 'female'): string => {
      let norm = normalizeOutfitId(outfitId);
      if (norm === 'noble') norm = 'nobleman';
      const found = (rawOutfitsJson as any[]).find((o) => normalizeOutfitId(o.id) === norm || normalizeOutfitId(o.name) === norm);
      if (found) {
        if (gender === 'female' && found.femaleName) return found.femaleName;
        if (gender === 'male' && found.maleName) return found.maleName;
        if (found.name) return found.name;
      }
      return outfitId;
    };

    const getOutfitThumbUrl = (outfitId: string, gender: 'male' | 'female'): string => {
      const idLower = normalizeOutfitId(outfitId);
      if (gender === 'female') {
        return `/generated/outfits/${idLower}-female-south-f0-base.png`;
      }
      return `/generated/outfit-thumbs/${idLower}.png`;
    };

    it('resolves correct gendered names for Nobleman / Noblewoman', () => {
      expect(getOutfitDisplayName('Nobleman', 'male')).toBe('Nobleman');
      expect(getOutfitDisplayName('Nobleman', 'female')).toBe('Noblewoman');
      expect(getOutfitDisplayName('noble', 'female')).toBe('Noblewoman');
    });

    it('resolves correct thumbnail URLs based on gender', () => {
      expect(getOutfitThumbUrl('Citizen', 'male')).toBe('/generated/outfit-thumbs/citizen.png');
      expect(getOutfitThumbUrl('Citizen', 'female')).toBe('/generated/outfits/citizen-female-south-f0-base.png');
      expect(getOutfitThumbUrl('Hunter', 'female')).toBe('/generated/outfits/hunter-female-south-f0-base.png');
    });
  });
});
