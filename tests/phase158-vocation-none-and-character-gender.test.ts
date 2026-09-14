import { describe, it, expect } from 'vitest';
import {
  vocationFor,
  calculateStatsForLevel,
  changeCharacterVocation,
  createCharacter,
  NONE_VOCATION_DEFINITION,
} from '../packages/domain/src/party';
import { deriveStats } from '../packages/domain/src/derivedStats';
import { getStarterLookType } from '../packages/auth/src/characterService';
import type { GameContent, GameState } from '../packages/domain/src';

const mockContent = {
  monsters: [],
  equipment: [],
  vocations: [
    {
      id: 1,
      name: 'Sorcerer',
      gainHp: 5,
      gainMana: 30,
      gainCap: 10,
    },
    {
      id: 2,
      name: 'Druid',
      gainHp: 5,
      gainMana: 30,
      gainCap: 10,
    },
    {
      id: 3,
      name: 'Paladin',
      gainHp: 10,
      gainMana: 15,
      gainCap: 20,
    },
    {
      id: 4,
      name: 'Knight',
      gainHp: 15,
      gainMana: 5,
      gainCap: 25,
    },
  ],
  starterLoadouts: [],
  spells: [],
  huntRegions: [],
  economy: { itemSalePrices: {}, items: [] },
  hunts: [],
  rateSkill: 1,
  rateMagic: 1,
} as unknown as GameContent;

describe('Phase 158: None Vocation & Character Gender', () => {
  describe('Vocation None Support', () => {
    it('returns NONE_VOCATION_DEFINITION for vocation "None" without throwing', () => {
      const def = vocationFor(mockContent, 'None');
      expect(def).toBeDefined();
      expect(def.id).toBe(0);
      expect(def.name).toBe('None');
      expect(def.gainHp).toBe(5);
      expect(def.gainMana).toBe(5);
      expect(def.gainCap).toBe(10);
    });

    it('returns NONE_VOCATION_DEFINITION when vocation is empty or undefined', () => {
      const def = vocationFor(mockContent, '' as any);
      expect(def).toEqual(NONE_VOCATION_DEFINITION);
    });

    it('calculates level 1 stats for "None" correctly', () => {
      const stats = calculateStatsForLevel('None', 1);
      expect(stats.maxHp).toBe(150);
      expect(stats.maxMana).toBe(35);
      expect(stats.maxCap).toBe(400);
    });

    it('derives stats for a character with vocation "None" without errors', () => {
      const char = createCharacter('test-char-1', 'Rookgardian', 'None', mockContent, 'female');
      expect(char.vocation).toBe('None');
      expect(char.gender).toBe('female');
      expect(char.maxHp).toBe(150);
      expect(char.maxMana).toBe(10);

      const stats = deriveStats(char, [], vocationFor(mockContent, char.vocation));
      expect(stats.attack).toBeGreaterThanOrEqual(0);
      expect(stats.defense).toBeGreaterThanOrEqual(0);
      expect(stats.armor).toBeGreaterThanOrEqual(0);
    });

    it('allows a level 1 character with "None" to choose any main vocation', () => {
      const char = createCharacter('test-char-1', 'Aventureira', 'None', mockContent, 'female');
      char.level = 1;
      const state: GameState = {
        session: {
          id: 'test-session',
          leaderId: char.id,
          selectedCharacterId: char.id,
          characters: [char],
          gold: 0,
          inventory: [],
          loot: [],
          bag: [],
          unlockedRegions: ['thais'],
          activeRegionId: 'thais',
          targetDungeonId: null,
          isAutoHunting: false,
          offlineProgress: null,
          party: { members: [char.id], sharedXp: false },
          hunts: [],
          staminaMinutes: 15,
        },
        encounter: null,
        world: { lastTickTime: Date.now() },
      } as any;

      const result = changeCharacterVocation(state, char.id, 'Knight', mockContent);
      expect(result.ok).toBe(true);
      expect(result.state.session.characters[0].vocation).toBe('Knight');
      expect(result.state.session.characters[0].gender).toBe('female');
      expect(result.state.session.characters[0].maxHp).toBe(150);
    });

    it('allows a level 8 character with "None" to choose any main vocation', () => {
      const char = createCharacter('test-char-2', 'Aventureira', 'None', mockContent, 'female');
      char.level = 8;
      const state: GameState = {
        session: {
          id: 'test-session',
          leaderId: char.id,
          selectedCharacterId: char.id,
          characters: [char],
          gold: 0,
          inventory: [],
          loot: [],
          bag: [],
          unlockedRegions: ['thais'],
          activeRegionId: 'thais',
          targetDungeonId: null,
          isAutoHunting: false,
          offlineProgress: null,
          party: { members: [char.id], sharedXp: false },
          hunts: [],
          staminaMinutes: 15,
        },
        encounter: null,
        world: { lastTickTime: Date.now() },
      } as any;

      const result = changeCharacterVocation(state, char.id, 'Knight', mockContent);
      expect(result.ok).toBe(true);
      expect(result.state.session.characters[0].vocation).toBe('Knight');
      expect(result.state.session.characters[0].gender).toBe('female');
      expect(result.state.session.characters[0].maxHp).toBe(255);
    });

    it('prevents a level 7 character with an existing vocation from changing vocation', () => {
      const char = createCharacter('test-char-3', 'Mago', 'Sorcerer', mockContent, 'male');
      char.level = 7;
      const state: GameState = {
        session: {
          id: 'test-session',
          leaderId: char.id,
          selectedCharacterId: char.id,
          characters: [char],
          gold: 0,
          inventory: [],
          loot: [],
          bag: [],
          unlockedRegions: ['thais'],
          activeRegionId: 'thais',
          targetDungeonId: null,
          isAutoHunting: false,
          offlineProgress: null,
          party: { members: [char.id], sharedXp: false },
          hunts: [],
          staminaMinutes: 15,
        },
        encounter: null,
        world: { lastTickTime: Date.now() },
      } as any;

      const result = changeCharacterVocation(state, char.id, 'Knight', mockContent);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('É necessário atingir o Nível 8 para trocar de vocação.');
    });
  });

  describe('Gender LookType & Starter Configuration', () => {
    it('maps male starter lookTypes correctly', () => {
      expect(getStarterLookType(0, 'male')).toBe(128); // Citizen Male
      expect(getStarterLookType(1, 'male')).toBe(130); // Mage/Sorcerer Male
      expect(getStarterLookType(2, 'male')).toBe(130); // Mage/Druid Male
      expect(getStarterLookType(3, 'male')).toBe(129); // Hunter/Paladin Male
      expect(getStarterLookType(4, 'male')).toBe(131); // Knight Male
    });

    it('maps female starter lookTypes correctly', () => {
      expect(getStarterLookType(0, 'female')).toBe(136); // Citizen Female
      expect(getStarterLookType(1, 'female')).toBe(138); // Mage/Sorcerer Female
      expect(getStarterLookType(2, 'female')).toBe(138); // Mage/Druid Female
      expect(getStarterLookType(3, 'female')).toBe(137); // Hunter/Paladin Female
      expect(getStarterLookType(4, 'female')).toBe(139); // Knight Female
    });

    it('defaults to male if gender is not provided', () => {
      expect(getStarterLookType(0)).toBe(128);
      expect(getStarterLookType(4)).toBe(131);
    });
  });
});
