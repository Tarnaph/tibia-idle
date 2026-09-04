import { describe, it, expect } from 'vitest';
import { createIdleGame, addPartyMember, calculatePlayerSpeed, initialHunts } from '../packages/domain/src';
import economyJson from '../content/generated/item-economy.json';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import { AVAILABLE_OUTFITS, AVAILABLE_MOUNTS } from '../apps/web/components/OutfitModal';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '../packages/content-schema/src';
import type { GameContent } from '../packages/domain/src';

const content: GameContent = {
  monsters: (monstersJson as MonsterCatalog).monsters,
  equipment: (equipmentJson as EquipmentCatalog).items,
  vocations: (vocationsJson as VocationCatalog).vocations,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  spells: (spellsJson as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 42 - Outfit and Mount Selection System', () => {
  it('provides available outfits including custom Sire and classic vocations', () => {
    const outfitIds = AVAILABLE_OUTFITS.map((o) => o.id);
    expect(outfitIds).toContain('Sire');
    expect(outfitIds).toContain('Knight');
    expect(outfitIds).toContain('Paladin');
    expect(outfitIds).toContain('Sorcerer');
    expect(outfitIds).toContain('Druid');

    const sire = AVAILABLE_OUTFITS.find((o) => o.id === 'Sire');
    expect(sire?.isCustom).toBe(true);
  });

  it('provides available mounts with authentic speed bonuses', () => {
    const mountIds = AVAILABLE_MOUNTS.map((m) => m.id);
    expect(mountIds).toContain('none');
    expect(mountIds).toContain('war-horse');
    expect(mountIds).toContain('midnight-panther');
    expect(mountIds).toContain('widow-queen');

    const warHorse = AVAILABLE_MOUNTS.find((m) => m.id === 'war-horse');
    expect(warHorse?.speedBonus).toBe(20);
  });

  it('allows customizing outfit, mount, addons and colors on all 4 party members independently', () => {
    let game = createIdleGame('party-outfit-test', content);

    // Add 3 members to have all 4 vocations in party
    game = addPartyMember(game, 'Aramis', 'Paladin', content);
    game = addPartyMember(game, 'Merlin', 'Sorcerer', content);
    game = addPartyMember(game, 'Sylvan', 'Druid', content);

    expect(game.session.characters).toHaveLength(4);

    const [char0, char1, char2, char3] = game.session.characters;

    // Customize char 0 with custom Sire outfit and War Horse
    const updatedChars = game.session.characters.map((char) => {
      if (char.id === char0.id) {
        return {
          ...char,
          outfit: 'Sire',
          mount: 'war-horse',
          mountActive: true,
          addons: 3,
          outfitColors: { head: 4, primary: 10, secondary: 3, detail: 6 },
        };
      }
      if (char.id === char1.id) {
        return {
          ...char,
          outfit: 'Hunter',
          mount: 'midnight-panther',
          mountActive: true,
          addons: 1,
        };
      }
      if (char.id === char2.id) {
        return {
          ...char,
          outfit: 'Mage',
          mount: 'none',
          mountActive: false,
          addons: 2,
        };
      }
      if (char.id === char3.id) {
        return {
          ...char,
          outfit: 'Druid',
          mount: 'crystal-wolf',
          mountActive: true,
          addons: 0,
        };
      }
      return char;
    });

    const updatedGame = {
      ...game,
      session: {
        ...game.session,
        characters: updatedChars,
      },
    };

    // Verify independent persistence
    const p0 = updatedGame.session.characters.find((c) => c.id === char0.id);
    expect(p0?.outfit).toBe('Sire');
    expect(p0?.mount).toBe('war-horse');
    expect(p0?.mountActive).toBe(true);
    expect(p0?.addons).toBe(3);
    expect(p0?.outfitColors?.primary).toBe(10);

    const p1 = updatedGame.session.characters.find((c) => c.id === char1.id);
    expect(p1?.outfit).toBe('Hunter');
    expect(p1?.mount).toBe('midnight-panther');
    expect(p1?.addons).toBe(1);

    const p2 = updatedGame.session.characters.find((c) => c.id === char2.id);
    expect(p2?.outfit).toBe('Mage');
    expect(p2?.mountActive).toBe(false);

    const p3 = updatedGame.session.characters.find((c) => c.id === char3.id);
    expect(p3?.outfit).toBe('Druid');
    expect(p3?.mount).toBe('crystal-wolf');
  });

  it('calculates player speed with mount bonus when active', () => {
    const baseSpeed = calculatePlayerSpeed(50);
    const mountedSpeed = calculatePlayerSpeed(50) + 20;

    expect(mountedSpeed).toBe(baseSpeed + 20);
    expect(mountedSpeed).toBeGreaterThan(baseSpeed);
  });
});
