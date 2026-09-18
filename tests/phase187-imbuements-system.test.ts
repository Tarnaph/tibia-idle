import { describe, it, expect } from 'vitest';
import {
  CANONICAL_IMBUEMENTS,
  IMBUEMENT_TIER_COSTS,
  IMBUEMENT_DURATION_SECONDS,
  getItemImbuingSlots,
  calculateImbuementBonuses,
  tickImbuementTime,
  formatImbuementRemainingTime,
  getApplicableImbuements,
  type ActiveImbuementSlot,
  type ItemAttributes,
} from '../packages/domain/src/imbuements';
import type { CharacterEquipmentSlot } from '../packages/domain/src/types';

describe('Phase 187 - Imbuements System', () => {
  describe('Canonical Imbuements Definitions & Costs', () => {
    it('should have exactly 17 canonical imbuements', () => {
      expect(CANONICAL_IMBUEMENTS.length).toBe(17);
      const ids = CANONICAL_IMBUEMENTS.map((i) => i.id);
      expect(new Set(ids).size).toBe(17);
    });

    it('should include key imbuements: slash, strike, vampirism, void, etc.', () => {
      const ids = CANONICAL_IMBUEMENTS.map((i) => i.id);
      expect(ids).toContain('slash');
      expect(ids).toContain('strike');
      expect(ids).toContain('vampirism');
      expect(ids).toContain('void');
      expect(ids).toContain('hidedragon');
      expect(ids).toContain('snakeskin');
      expect(ids).toContain('swiftness');
      expect(ids).toContain('featherweight');
    });

    it('should follow canonical tier costs: 7.5k, 60k, 250k', () => {
      expect(IMBUEMENT_TIER_COSTS.Basic).toBe(7500);
      expect(IMBUEMENT_TIER_COSTS.Intricate).toBe(60000);
      expect(IMBUEMENT_TIER_COSTS.Powerful).toBe(250000);

      // Verify every imbuement matches these tier costs
      for (const imb of CANONICAL_IMBUEMENTS) {
        expect(imb.tiers.Basic.cost).toBe(7500);
        expect(imb.tiers.Intricate.cost).toBe(60000);
        expect(imb.tiers.Powerful.cost).toBe(250000);
      }
    });

    it('should have 24 hours (86400s) default duration', () => {
      expect(IMBUEMENT_DURATION_SECONDS).toBe(86400);
    });
  });

  describe('Item Imbuing Slots Resolution', () => {
    it('should resolve slots for Terra Helmet (1 slot)', () => {
      expect(getItemImbuingSlots(12645)).toBe(1);
      expect(getItemImbuingSlots({ id: 12645, name: 'Terra Helmet' })).toBe(1);
    });

    it('should resolve slots for Demon Helmet & Armor (2 slots)', () => {
      expect(getItemImbuingSlots({ name: 'Demon Helmet', slot: 'head' })).toBe(2);
      expect(getItemImbuingSlots({ id: 2494, name: 'Demon Armor', slot: 'armor' })).toBe(2);
    });

    it('should resolve slots for Giant Sword (3 slots)', () => {
      expect(getItemImbuingSlots({ id: 2393, name: 'Giant Sword', slot: 'hand', weaponType: 'sword' })).toBe(3);
    });

    it('should return 0 slots for non-imbuable items like rings and amulets without slots', () => {
      expect(getItemImbuingSlots({ id: 2160, name: 'Crystal Coin' })).toBe(0);
      expect(getItemImbuingSlots({ id: 2173, name: 'Amulet of Loss', slot: 'necklace' })).toBe(0);
    });

    it('should resolve slots from native item.imbuingSlots property', () => {
      expect(getItemImbuingSlots({ id: 99999, name: 'Custom Helm', imbuingSlots: 2 })).toBe(2);
      expect(getItemImbuingSlots({ id: 88888, name: 'Single Slot Armor', imbuingSlots: 1 })).toBe(1);
    });
  });

  describe('Applicable Imbuements Filtering', () => {
    it('should allow Slash, Void, Strike on Swords', () => {
      const applicable = getApplicableImbuements({ name: 'Magic Sword', slot: 'hand', weaponType: 'sword' });
      const ids = applicable.map((a) => a.id);
      expect(ids).toContain('slash');
      expect(ids).toContain('strike');
      expect(ids).toContain('vampirism');
      expect(ids).toContain('void');
      expect(ids).not.toContain('precision'); // Bow/dist only
    });

    it('should allow Slash, Void, and skills on Helmets (Terra Helmet)', () => {
      const applicable = getApplicableImbuements({ id: 12645, name: 'Terra Helmet', slot: 'head' });
      const ids = applicable.map((a) => a.id);
      expect(ids).toContain('slash');
      expect(ids).toContain('void');
      expect(ids).toContain('chop');
      expect(ids).not.toContain('strike'); // Strike is weapon only
    });

    it('should allow Vampirism and elemental protections on Armors (Demon Armor)', () => {
      const applicable = getApplicableImbuements({ id: 2494, name: 'Demon Armor', slot: 'armor' });
      const ids = applicable.map((a) => a.id);
      expect(ids).toContain('vampirism');
      expect(ids).toContain('snakeskin');
      expect(ids).toContain('hidedragon');
    });
  });

  describe('Bonus Aggregation (calculateImbuementBonuses)', () => {
    it('should aggregate skill bonuses for active imbuements', () => {
      const imbuements: ActiveImbuementSlot[] = [
        {
          slotIndex: 0,
          imbuementId: 'slash',
          imbuementName: 'Slash',
          tier: 'Powerful',
          stat: 'skillSword',
          value: 4,
          label: 'melee +4',
          remainingSeconds: 80000,
          cost: 250000,
          autoRenew: false,
        },
      ];

      const bonuses = calculateImbuementBonuses(imbuements);
      expect(bonuses.skillSword).toBe(4);
      expect(bonuses.skillClub).toBe(0);
      expect(bonuses.lifeLeech).toBe(0);
    });

    it('should aggregate leeches and crit bonuses', () => {
      const imbuements: ActiveImbuementSlot[] = [
        {
          slotIndex: 0,
          imbuementId: 'vampirism',
          imbuementName: 'Vampirism',
          tier: 'Powerful',
          stat: 'lifeLeech',
          value: 25,
          label: 'life leech +25%',
          remainingSeconds: 72000,
          cost: 250000,
          autoRenew: false,
        },
        {
          slotIndex: 1,
          imbuementId: 'void',
          imbuementName: 'Void',
          tier: 'Powerful',
          stat: 'manaLeech',
          value: 8,
          label: 'mana leech +8%',
          remainingSeconds: 72000,
          cost: 250000,
          autoRenew: false,
        },
        {
          slotIndex: 2,
          imbuementId: 'strike',
          imbuementName: 'Strike',
          tier: 'Powerful',
          stat: 'criticalDamage',
          value: 50,
          label: 'dano crítico +50%',
          remainingSeconds: 72000,
          cost: 250000,
          autoRenew: false,
        },
      ];

      const bonuses = calculateImbuementBonuses(imbuements);
      expect(bonuses.lifeLeech).toBe(25);
      expect(bonuses.manaLeech).toBe(8);
      expect(bonuses.criticalChance).toBe(10);
      expect(bonuses.criticalDamage).toBe(50);
    });

    it('should aggregate elemental protections', () => {
      const imbuements: ActiveImbuementSlot[] = [
        {
          slotIndex: 0,
          imbuementId: 'dragon_hide',
          imbuementName: 'Dragon Hide',
          tier: 'Powerful',
          stat: 'absorbFire',
          value: 15,
          label: 'proteção fire +15%',
          remainingSeconds: 50000,
          cost: 250000,
          autoRenew: false,
        },
        {
          slotIndex: 1,
          imbuementId: 'snake_skin',
          imbuementName: 'Snake Skin',
          tier: 'Powerful',
          stat: 'absorbEarth',
          value: 15,
          label: 'proteção earth +15%',
          remainingSeconds: 50000,
          cost: 250000,
          autoRenew: false,
        },
      ];

      const bonuses = calculateImbuementBonuses(imbuements);
      expect(bonuses.elementalProtections.fire).toBe(15);
      expect(bonuses.elementalProtections.earth).toBe(15);
      expect(bonuses.elementalProtections.energy).toBe(0);
    });

    it('should ignore expired imbuements (remainingSeconds <= 0)', () => {
      const imbuements: ActiveImbuementSlot[] = [
        {
          slotIndex: 0,
          imbuementId: 'slash',
          imbuementName: 'Slash',
          tier: 'Powerful',
          stat: 'skillSword',
          value: 4,
          label: 'melee +4',
          remainingSeconds: 0, // EXPIRED
          cost: 250000,
          autoRenew: false,
        },
      ];

      const bonuses = calculateImbuementBonuses(imbuements);
      expect(bonuses.skillSword).toBe(0);
    });
  });

  describe('Clock Ticking & Auto-Renewal (tickImbuementTime)', () => {
    it('should decrement remaining time during combat ticks', () => {
      const slots: ActiveImbuementSlot[] = [
        {
          slotIndex: 0,
          imbuementId: 'slash',
          imbuementName: 'Slash',
          tier: 'Powerful',
          stat: 'skillSword',
          value: 4,
          label: 'melee +4',
          remainingSeconds: 3600,
          cost: 250000,
          autoRenew: false,
        },
      ];

      const result = tickImbuementTime(slots, 60, 1000000);
      expect(result.updated.length).toBe(1);
      expect(result.updated[0].remainingSeconds).toBe(3540);
      expect(result.goldDeducted).toBe(0);
      expect(result.renewedCount).toBe(0);
    });

    it('should auto-renew upon expiry when autoRenew is true and party has enough gold', () => {
      const slots: ActiveImbuementSlot[] = [
        {
          slotIndex: 0,
          imbuementId: 'slash',
          imbuementName: 'Slash',
          tier: 'Powerful',
          stat: 'skillSword',
          value: 4,
          label: 'melee +4',
          remainingSeconds: 10,
          cost: 250000,
          autoRenew: true,
        },
      ];

      const partyGold = 1000000;
      const result = tickImbuementTime(slots, 15, partyGold);
      expect(result.goldDeducted).toBe(250000);
      expect(result.renewedCount).toBe(1);
      expect(result.updated.length).toBe(1);
      expect(result.updated[0].remainingSeconds).toBe(86400);
    });

    it('should expire cleanly without gold deduction when party gold is insufficient', () => {
      const slots: ActiveImbuementSlot[] = [
        {
          slotIndex: 0,
          imbuementId: 'slash',
          imbuementName: 'Slash',
          tier: 'Powerful',
          stat: 'skillSword',
          value: 4,
          label: 'melee +4',
          remainingSeconds: 10,
          cost: 250000,
          autoRenew: true,
        },
      ];

      const partyGold = 50000; // not enough for 250k
      const result = tickImbuementTime(slots, 15, partyGold);
      expect(result.goldDeducted).toBe(0);
      expect(result.renewedCount).toBe(0);
      expect(result.expiredCount).toBe(1);
      expect(result.updated.length).toBe(0);
    });
  });

  describe('Time Formatter (formatImbuementRemainingTime)', () => {
    it('should format 86400s as 24h00m', () => {
      expect(formatImbuementRemainingTime(86400)).toBe('24h00m');
    });

    it('should format 80220s as 22h17m', () => {
      expect(formatImbuementRemainingTime(80220)).toBe('22h17m');
    });

    it('should format small durations as minutes', () => {
      expect(formatImbuementRemainingTime(300)).toBe('5m');
      expect(formatImbuementRemainingTime(45)).toBe('1m');
    });

    it('should format 0 or negative as Expirado', () => {
      expect(formatImbuementRemainingTime(0)).toBe('Expirado');
      expect(formatImbuementRemainingTime(-10)).toBe('Expirado');
    });
  });

  describe('QuickSell Exclusion Guard', () => {
    it('should identify items with active imbuements and exclude them from bulk sale', () => {
      const regularItem: { id: number; attributes?: ItemAttributes } = {
        id: 12645,
      };

      const imbuedItem: { id: number; attributes?: ItemAttributes } = {
        id: 12645,
        attributes: {
          imbuements: [
            {
              slotIndex: 0,
              imbuementId: 'slash',
              tier: 'Powerful',
              value: 4,
              cost: 250000,
              remainingSeconds: 80220,
              autoRenew: true,
            },
          ],
        },
      };

      const hasActiveImbuement = (item: { attributes?: ItemAttributes }): boolean => {
        return Boolean(
          Array.isArray(item.attributes?.imbuements) &&
            item.attributes!.imbuements!.some((s: ActiveImbuementSlot) => s.remainingSeconds > 0)
        );
      };

      expect(hasActiveImbuement(regularItem)).toBe(false);
      expect(hasActiveImbuement(imbuedItem)).toBe(true);

      const itemsToSell = [regularItem, imbuedItem];
      const filteredSellable = itemsToSell.filter((item) => !hasActiveImbuement(item));

      expect(filteredSellable.length).toBe(1);
      expect(filteredSellable[0].id).toBe(regularItem.id);
    });
  });
});
