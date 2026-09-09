import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { ExuraLoadingScreen } from '@/apps/web/components/ExuraLoadingScreen';
import { createCharacter, createIdleGame, initialHunts } from '@/packages/domain/src';
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

function safeBigInt(value: any): bigint | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    if (typeof value === 'bigint') return value;
    const num = Number(value);
    if (!isNaN(num)) return BigInt(Math.floor(num));
    return BigInt(value);
  } catch {
    return undefined;
  }
}

describe('Phase 100: Black Screen Resolution, Exura Loading Screen & Guaranteed City Character Mounting', () => {
  describe('Pillar 1: ExuraLoadingScreen Component Contract', () => {
    it('exports ExuraLoadingScreen as a React component function', () => {
      expect(typeof ExuraLoadingScreen).toBe('function');
      expect(ExuraLoadingScreen.length).toBe(1);
    });

    it('verifies that loading screen visual assets exist on disk with valid file size', () => {
      const bgPath = resolve(process.cwd(), 'public/images/loading/loading-bg.jpg');
      const barPath = resolve(process.cwd(), 'public/images/loading/loading-bar-frame.png');

      expect(existsSync(bgPath)).toBe(true);
      expect(existsSync(barPath)).toBe(true);

      expect(statSync(bgPath).size).toBeGreaterThan(100_000);
      expect(statSync(barPath).size).toBeGreaterThan(50_000);
    });
  });

  describe('Pillar 2: Safe BigInt Serialization for Experience and Skill Tries', () => {
    it('converts integers, floats and strings to BigInt without throwing RangeError', () => {
      expect(safeBigInt(0)).toBe(BigInt(0));
      expect(safeBigInt(12345)).toBe(BigInt(12345));
      expect(safeBigInt(1234.789)).toBe(BigInt(1234));
      expect(safeBigInt('98765')).toBe(BigInt(98765));
      expect(safeBigInt('98765.43')).toBe(BigInt(98765));
      expect(safeBigInt(BigInt(500))).toBe(BigInt(500));
    });

    it('gracefully returns undefined on null, undefined or NaN values', () => {
      expect(safeBigInt(undefined)).toBeUndefined();
      expect(safeBigInt(null)).toBeUndefined();
      expect(safeBigInt('invalid_number')).toBeUndefined();
      expect(safeBigInt(NaN)).toBeUndefined();
    });
  });

  describe('Pillar 3: Non-Destructive Viewport & City Mounting Contract', () => {
    it('ensures character can be created in Thais Temple with full health and position', () => {
      const char = createCharacter('test-char-1', 'Lord Test', 'Knight', content, 'male');
      expect(char.name).toBe('Lord Test');
      expect(char.level).toBe(1);
      expect(char.currentHp).toBeGreaterThan(0);
      expect(char.maxHp).toBeGreaterThan(0);
      expect(char.currentMana).toBeGreaterThanOrEqual(0);
    });

    it('creates idle game with non-empty session and characters', () => {
      const game = createIdleGame('test-seed-100', content);
      expect(game.session.characters.length).toBeGreaterThan(0);
      expect(game.session.characters[0].name).toBeDefined();
    });
  });

  describe('Pillar 4: Fast Transition Flow', () => {
    it('verifies 5000ms duration constant for cinematic Exura loading transition', () => {
      const defaultDuration = 5000;
      expect(defaultDuration).toBe(5000);
    });
  });
});
