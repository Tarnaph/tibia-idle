import { describe, expect, it } from 'vitest';
import visualAssetsJson from '../content/generated/tibia860-assets.json';
import type { ItemEconomyDefinition } from '../packages/content-schema/src';
import {
  PROMOTION_COST,
  addPartyMember,
  advanceCombat,
  advanceTraining,
  createIdleGame,
  deriveMonsterVariantStats,
  deriveStats,
  initialHunts,
  isSpellUnlocked,
  preferredSellPrice,
  promoteCharacter,
  reorderHotbar,
  restartHunt,
  selectCharacter,
  selectedCharacterOf,
  spellFormulaRange,
  trainingSkillFor,
  vocationFor,
} from '../packages/domain/src';
import type { Tibia860AssetManifest } from '../packages/tibia860-assets/src/types';
import { content } from './fixture';

function fourMemberParty(seed = 'phase8-party') {
  let state = createIdleGame(seed, content);
  state = addPartyMember(state, 'Bobik', 'Paladin', content);
  state = addPartyMember(state, 'Mira', 'Sorcerer', content);
  state = addPartyMember(state, 'Durink', 'Druid', content);
  return state;
}

describe('Phase 8 multi-character state', () => {
  it('selects a party member without sharing skills, equipment, inventory or hotbar', () => {
    const initial = fourMemberParty();
    const aldricBefore = structuredClone(initial.session.characters[0]);
    const bobik = initial.session.characters[1];
    const selected = selectCharacter(initial, bobik.id);
    selected.session.characters[1].skills.distance += 7;
    selected.session.characters[1].equipment.leftHand = 2376;
    selected.session.characters[1].hotbar = [1, 2];
    selected.session.characters[1] = reorderHotbar(selected.session.characters[1], 0, 1);

    expect(selectedCharacterOf(selected).id).toBe(bobik.id);
    expect(selected.session.characters[0]).toEqual(aldricBefore);
    expect(selected.session.characters[1].hotbar).not.toEqual(aldricBefore.hotbar);
  });

  it('derives selected character stats without mutating another loadout', () => {
    const state = fourMemberParty('individual-derived');
    const aldric = state.session.characters[0];
    const bobik = state.session.characters[1];
    const aldricStats = deriveStats(aldric, content.equipment, vocationFor(content, aldric.vocation));
    bobik.skills.distance += 20;
    const bobikStats = deriveStats(bobik, content.equipment, vocationFor(content, bobik.vocation));
    expect(bobikStats.activeSkill).toBe('distance');
    expect(deriveStats(aldric, content.equipment, vocationFor(content, aldric.vocation))).toEqual(aldricStats);
  });
});

describe('Phase 8 clocks and spells', () => {
  it('imports the TFS player and monster attack intervals as clocks independent from movement', () => {
    const state = restartHunt(createIdleGame('clock-separation', content), 'clock-separation', content, 'rotworm-cave');
    expect(state.encounter.partyActors[0].attackIntervalMs).toBeGreaterThan(0);
    expect(state.encounter.partyActors[0].speed).toBeGreaterThan(0);
    expect(state.encounter.enemies[0]).toMatchObject({ attackIntervalMs: 2000, speed: 116 });
    expect(state.encounter.nextMovementAt).toBe(120);
  });

  it('enforces vocation, level, mana and cooldown while preserving spell visual mapping', () => {
    let state = fourMemberParty('spell-clock');
    const sorcerer = state.session.characters.find((character) => character.baseVocation === 'Sorcerer')!;
    sorcerer.level = 20;
    sorcerer.hotbar = [88];
    sorcerer.currentMana = sorcerer.maxMana;
    state = restartHunt(state, 'spell-clock', content, 'rat-cellars');
    for (const actor of state.encounter.partyActors) actor.nextAttackAt = 999_999;
    for (const enemy of state.encounter.enemies) { enemy.hp = 9_999; enemy.maxHp = 9_999; }
    let castState = state;
    for (let tick = 0; tick < 200; tick += 1) {
      castState = advanceCombat(castState, content, 120);
      if (castState.encounter.events.some((event) => event.type === 'spell-cast' && event.sourceId === sorcerer.id)) break;
    }
    const cast = castState.encounter.events.find((event) => event.type === 'spell-cast' && event.sourceId === sorcerer.id);
    const visual = castState.encounter.events.find((event) => event.type === 'spell-visual' && event.sourceId === sorcerer.id);
    const actor = castState.encounter.partyActors.find((candidate) => candidate.characterId === sorcerer.id)!;
    expect(cast).toMatchObject({ spellId: 88, healing: false });
    expect(visual).toMatchObject({ spellId: 88, effectId: 38, projectileId: 5 });
    expect(actor.mana).toBe(sorcerer.maxMana - 20);
    expect(actor.spellCooldowns['88']).toBe(castState.encounter.elapsedMs + 2000);
    const beforeNext = advanceCombat(castState, content, 120);
    expect(beforeNext.encounter.events.some((event) => event.type === 'spell-cast' && event.sourceId === sorcerer.id && event.spellId === 88)).toBe(false);

    const energy = content.spells.find((spell) => spell.spellId === 88)!;
    const knight = state.session.characters[0];
    knight.level = 100;
    expect(isSpellUnlocked(knight, energy)).toBe(false);
  });

  it('scales imported magic formulas with magic level', () => {
    const sorcerer = fourMemberParty('magic-scale').session.characters.find((character) => character.baseVocation === 'Sorcerer')!;
    sorcerer.level = 20;
    const spell = content.spells.find((candidate) => candidate.spellId === 88)!;
    const low = spellFormulaRange(spell, sorcerer, 0, 0);
    sorcerer.skills.magicLevel += 10;
    const high = spellFormulaRange(spell, sorcerer, 0, 0);
    expect(high.min).toBeGreaterThan(low.min);
    expect(high.max).toBeGreaterThan(low.max);
  });

  it('has extracted DAT/SPR assets for every numeric effect and projectile in the selected catalog', () => {
    const assets = visualAssetsJson as Tibia860AssetManifest;
    for (const spell of content.spells) {
      if (spell.visual.effectId !== null) expect(assets.effects[String(spell.visual.effectId)]?.frames.length).toBeGreaterThan(0);
      if (typeof spell.visual.projectileId === 'number') expect(assets.missiles[String(spell.visual.projectileId)]?.frames.length).toBeGreaterThan(0);
    }
  });
});

describe('Phase 8 training and promotion', () => {
  it('trains the vocation-specific skill and keeps progress individual', () => {
    const state = fourMemberParty('all-training');
    const before = state.session.characters.map((character) => structuredClone(character.skillTries));
    const trained = advanceTraining(state, content, 12_000);
    const expected = ['axe', 'distance', 'magicLevel', 'magicLevel'];
    trained.session.characters.forEach((character, index) => {
      const skill = trainingSkillFor(character, content);
      expect(skill).toBe(expected[index]);
      expect(character.skillTries[skill]).toBeGreaterThan(before[index][skill]);
    });
    expect(state.session.characters.map((character) => character.skillTries)).toEqual(before);
  });

  it('requires level 20 and 20k gold, deducts once and promotes only one character', () => {
    const base = fourMemberParty('promotion');
    const aldric = base.session.characters[0];
    base.session.gold = PROMOTION_COST;
    aldric.level = 19;
    expect(promoteCharacter(base, aldric.id, content).ok).toBe(false);
    aldric.level = 20;
    base.session.gold = PROMOTION_COST - 1;
    expect(promoteCharacter(base, aldric.id, content).ok).toBe(false);
    base.session.gold = PROMOTION_COST;
    const promoted = promoteCharacter(base, aldric.id, content);
    expect(promoted.ok).toBe(true);
    expect(promoted.state.session.gold).toBe(0);
    expect(promoted.state.session.characters[0]).toMatchObject({ vocation: 'Elite Knight', promotion: 'Elite Knight', baseVocation: 'Knight' });
    expect(promoted.state.session.characters[1].vocation).toBe('Paladin');
    expect(vocationFor(content, 'Elite Knight')).toMatchObject({ sourceId: 8, fromVocationId: 4, healthGainTicks: 2, manaGainTicks: 4 });
    expect(promoteCharacter(promoted.state, aldric.id, content).ok).toBe(false);

    const mageState = fourMemberParty('mage-promotion');
    const mage = mageState.session.characters.find((character) => character.baseVocation === 'Sorcerer')!;
    mage.vocation = 'Master Sorcerer'; mage.promotion = 'Master Sorcerer'; mage.equipment.leftHand = null;
    expect(deriveStats(mage, content.equipment, vocationFor(content, mage.vocation)).activeSkill).toBe('magicLevel');
  });
});

describe('Phase 8 hunts and economy', () => {
  it('models five ten-wave OTBM hunts and derives each final boss from its real base monster', () => {
    expect(initialHunts).toHaveLength(5);
    for (const hunt of initialHunts) {
      expect(hunt.waves).toHaveLength(10);
      expect(hunt.waves.slice(0, 9).every((wave) => !wave.boss)).toBe(true);
      const final = hunt.waves[9];
      expect(final.boss).toMatchObject({ baseMonsterId: final.monsterId, hpMultiplier: 4, damageMultiplier: 1.5, defenseMultiplier: 1.25, xpMultiplier: 3, lootMultiplier: 2 });
      const base = content.monsters.find((monster) => monster.id === final.monsterId)!;
      const variant = deriveMonsterVariantStats(base, final.boss!);
      expect(variant).toMatchObject({ maxHp: base.maxHp * 4, experience: base.experience * 3, lootMultiplier: 2 });
      expect(base.corpseId).toBeTypeOf('number');
      expect(content.huntRegions.some((region) => region.huntId === hunt.id && region.sourceFiles.includes('data/world/styller.otbm'))).toBe(true);
    }
  });

  it('keeps identical seeded spatial snapshots deterministic', () => {
    let first = restartHunt(fourMemberParty('hunt-snapshot'), 'hunt-snapshot', content, 'spider-burrow');
    let second = restartHunt(fourMemberParty('hunt-snapshot'), 'hunt-snapshot', content, 'spider-burrow');
    for (let tick = 0; tick < 80; tick += 1) { first = advanceCombat(first, content, 120); second = advanceCombat(second, content, 120); }
    expect(second.encounter).toEqual(first.encounter);
  });

  it('prioritizes internal STYLLER prices, marks web fallback and never invents unknown prices', () => {
    const webOffer = { price: 100, sourceType: 'web', sourceKind: 'web-reference', sourceUrl: 'https://example.test/item', sourceName: 'Historical fixture', retrievedAt: '2026-09-02', tibiaVersionContext: '8.60 fixture' } as const;
    const internalOffer = { price: 25, sourceType: 'styller', sourceKind: 'npc-xml-shop-sellable', sourceNpc: 'Mad', sourceFile: 'data/npc/Mad.xml' } as const;
    const internalFirst: ItemEconomyDefinition = { itemId: 2376, canonicalSellPrice: 25, status: 'sellable', offers: [webOffer, internalOffer], warnings: [] };
    const fallback: ItemEconomyDefinition = { itemId: 9998, canonicalSellPrice: 100, status: 'sellable', offers: [webOffer], warnings: [] };
    const unknown: ItemEconomyDefinition = { itemId: 9999, canonicalSellPrice: null, status: 'priceUnknown', offers: [], warnings: ['No proven price.'] };
    expect(preferredSellPrice(internalFirst)).toMatchObject({ price: 25, sourceType: 'styller' });
    expect(preferredSellPrice(fallback)).toMatchObject({ price: 100, sourceType: 'web', offer: { sourceUrl: 'https://example.test/item', tibiaVersionContext: '8.60 fixture' } });
    expect(preferredSellPrice(unknown)).toBeNull();
  });
});
