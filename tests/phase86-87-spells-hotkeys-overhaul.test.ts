import { describe, expect, it } from 'vitest';
import { resolveActionImagePath } from '../apps/web/components/Tibia11ActionIcon';
import type { SpellDefinition } from '../packages/content-schema/src';
import {
  createCharacter,
  createIdleGame,
  isHotbarActionUnlocked,
  triggerManualHotbarAction,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 86 & Phase 87: Spells, Runes, Hotkeys & Icons Overhaul', () => {
  it('imports the expanded spell catalog (>80 spells total)', () => {
    expect(content.spells.length).toBeGreaterThan(80);
    const sorcererSpells = content.spells.filter((s: SpellDefinition) => s.vocations.includes('Sorcerer') || s.vocations.includes('Master Sorcerer'));
    expect(sorcererSpells.length).toBeGreaterThanOrEqual(23);
    expect(sorcererSpells.some((s: SpellDefinition) => s.name === 'Death Strike')).toBe(true);
    expect(sorcererSpells.some((s: SpellDefinition) => s.name === 'Force Strike')).toBe(false);
    const druidSpells = content.spells.filter((s: SpellDefinition) => s.vocations.includes('Druid'));
    expect(druidSpells.length).toBeGreaterThan(15);
    const knightSpells = content.spells.filter((s: SpellDefinition) => s.vocations.includes('Knight'));
    expect(knightSpells.length).toBeGreaterThan(10);
  });

  it('correctly resolves spell icon paths in Tibia11ActionIcon without prefix collisions', () => {
    expect(resolveActionImagePath(7, 'spell', 'Mass Healing')).toMatch(/^\/spells\/(?:exura-gran-mas-res)\.png$/);
    expect(resolveActionImagePath(undefined, 'spell', 'Ultimate Flame Strike')).toMatch(/^\/spells\/(?:3i|exori-max-flam)\.png$/);
    expect(resolveActionImagePath(undefined, 'spell', 'Strong Flame Strike')).toMatch(/^\/spells\/(?:3h|exori-gran-flam)\.png$/);
    expect(resolveActionImagePath(undefined, 'spell', 'Death Strike')).toBe('/spells/exori-mort.png');
    expect(resolveActionImagePath(undefined, 'spell', 'Energy Beam')).toMatch(/^\/spells\/(?:energy-beam|exevo-vis-lux)\.png$/);
    expect(resolveActionImagePath(undefined, 'spell', 'Great Energy Beam')).toMatch(/^\/spells\/(?:4g|exevo-gran-vis-lux)\.png$/);
    expect(resolveActionImagePath(undefined, 'spell', 'Great Fire Wave')).toMatch(/^\/spells\/(?:3g|exevo-gran-flam-hur)\.png$/);
    expect(resolveActionImagePath(17, 'spell', 'Strong Haste')).toBe('/spells/utani-gran-hur.png');
    expect(resolveActionImagePath(16, 'spell', 'Haste')).toBe('/spells/utani-hur.png');
    expect(resolveActionImagePath(1, 'spell', 'Light Healing')).toBe('/spells/exura.png');
  });

  it('enforces required level restrictions on hotkey actions', () => {
    const knight = createCharacter('c1', 'Hero', 'Knight', content, 'male');
    knight.level = 5;

    const highLevelKnightSpell = content.spells.find(
      (s: SpellDefinition) => s.vocations.includes('Knight') && s.requiredLevel > 20
    );
    expect(highLevelKnightSpell).toBeDefined();

    if (highLevelKnightSpell) {
      const isUnlockedLow = isHotbarActionUnlocked(knight, { kind: 'spell', spell: highLevelKnightSpell });
      expect(isUnlockedLow).toBe(false);

      knight.level = 100;
      const isUnlockedHigh = isHotbarActionUnlocked(knight, { kind: 'spell', spell: highLevelKnightSpell });
      expect(isUnlockedHigh).toBe(true);
    }
  });

  it('triggers manual hotbar actions (healing & haste) in city mode', () => {
    const state = createIdleGame('test-seed', content);
    const char = state.session.characters[0]; // Knight
    char.level = 50;
    char.currentHp = 100;
    char.maxHp = 500;
    char.currentMana = 200;
    char.maxMana = 300;

    const knightHealSpell = content.spells.find(
      (s: SpellDefinition) => s.vocations.includes('Knight') && s.group === 'healing'
    );
    expect(knightHealSpell).toBeDefined();

    if (knightHealSpell) {
      char.hotbar[0] = knightHealSpell.spellId;
      const triggered = triggerManualHotbarAction(state, char.id, knightHealSpell.spellId, content);
      expect(triggered).toBe(true);
      expect(char.currentHp).toBeGreaterThan(100);
    }
  });
});
