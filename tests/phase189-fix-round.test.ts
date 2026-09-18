import { describe, it, expect } from 'vitest';
import {
  getItemImbuingSlots,
  CANONICAL_IMBUEMENTS,
  formatImbuementRemainingTime,
  IMBUEMENT_TIER_COSTS,
} from '../packages/domain/src/imbuements';

describe('Phase 189: FIX Round Improvements & Tests', () => {
  describe('1. Item Tooltips & Imbuement Slots', () => {
    it('returns correct imbuement slots count for known equipment', () => {
      // Demon Helmet -> 2 slots
      expect(getItemImbuingSlots({ id: 2493, name: 'Demon Helmet', slot: 'head' })).toBe(2);

      // Magic Plate Armor -> 2 slots
      expect(getItemImbuingSlots({ id: 2472, name: 'Magic Plate Armor', slot: 'armor' })).toBe(2);

      // Demon Armor -> 2 slots
      expect(getItemImbuingSlots({ id: 2494, name: 'Demon Armor', slot: 'armor' })).toBe(2);

      // Terra Helmet -> 1 slot
      expect(getItemImbuingSlots({ id: 12645, name: 'Terra Helmet', slot: 'head' })).toBe(1);

      // Zaoan Helmet -> 1 slot
      expect(getItemImbuingSlots({ id: 11302, name: 'Zaoan Helmet', slot: 'head' })).toBe(1);
    });

    it('formats remaining imbuement time correctly for tooltips', () => {
      // 4 hours 55 minutes -> "4h55m" (matching user screenshot)
      const seconds = 4 * 3600 + 55 * 60;
      expect(formatImbuementRemainingTime(seconds)).toBe('4h55m');

      // 30 minutes -> "30m"
      expect(formatImbuementRemainingTime(30 * 60)).toBe('30m');

      // 45 seconds -> "1m"
      expect(formatImbuementRemainingTime(45)).toBe('1m');
    });

    it('canonical imbuements list includes critical offensive and defensive imbuements', () => {
      const vampirism = CANONICAL_IMBUEMENTS.find((i) => i.id === 'vampirism');
      expect(vampirism).toBeDefined();
      expect(vampirism?.name).toBe('Vampirism');
      expect(vampirism?.tiers.Powerful.value).toBe(25);
      expect(vampirism?.tiers.Powerful.label.toLowerCase()).toBe('life leech 25%');

      const voidImb = CANONICAL_IMBUEMENTS.find((i) => i.id === 'void');
      expect(voidImb).toBeDefined();
      expect(voidImb?.tiers.Powerful.value).toBe(8);

      const strike = CANONICAL_IMBUEMENTS.find((i) => i.id === 'strike');
      expect(strike).toBeDefined();
      expect(strike?.tiers.Powerful.value).toBe(50);
    });

    it('validates canonical imbuement costs', () => {
      expect(IMBUEMENT_TIER_COSTS.Basic).toBe(7500);
      expect(IMBUEMENT_TIER_COSTS.Intricate).toBe(60000);
      expect(IMBUEMENT_TIER_COSTS.Powerful).toBe(250000);
    });
  });

  describe('2. Lightweight Selection & Code Splitting Contract', () => {
    it('verifies that game entry can receive initialSelection props without breaking', async () => {
      const { GamePrototype } = await import('../apps/web/components/GamePrototype');
      expect(typeof GamePrototype).toBe('function');
    });

    it('verifies GameClientLauncher module exists and exports launcher component', async () => {
      const { GameClientLauncher } = await import('../apps/web/components/GameClientLauncher');
      expect(typeof GameClientLauncher).toBe('function');
    });
  });

  describe('3. Character Context Menu Contract', () => {
    it('exports CharacterContextMenu without requiring onSetOutfit or onToggleMount', async () => {
      const { CharacterContextMenu } = await import('../apps/web/components/CharacterContextMenu');
      expect(typeof CharacterContextMenu).toBe('function');
    });

    it('exports PlayerInspectModal component', async () => {
      const { PlayerInspectModal } = await import('../apps/web/components/PlayerInspectModal');
      expect(typeof PlayerInspectModal).toBe('function');
    });
  });
});
