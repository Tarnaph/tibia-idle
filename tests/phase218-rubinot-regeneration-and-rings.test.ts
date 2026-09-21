import { describe, expect, it } from 'vitest';
import {
  vocationFor,
  startGame,
  createIdleGame,
  advanceCombat,
  equipCharacterItem,
  preferredSlotForItem,
  isCompatibleEquipmentSlot,
  findEquipment,
  type GameContent,
  type CharacterState,
  initialHunts,
} from '../packages/domain/src';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '../packages/content-schema/src';

const content: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: 50,
  rateMagic: 25,
};

describe('Phase 218: RubinOT Vocation & Ring Regeneration System', () => {
  it('1. Verifies exact RubinOT base and promoted vocation regeneration values', () => {
    // Knight
    const knight = vocationFor(content, 'Knight');
    expect(knight.healthGainTicks).toBe(4);
    expect(knight.healthGainAmount).toBe(20);
    expect(knight.manaGainTicks).toBe(4);
    expect(knight.manaGainAmount).toBe(5);

    // Elite Knight (Promoted)
    const eliteKnight = vocationFor(content, 'Elite Knight');
    expect(eliteKnight.healthGainTicks).toBe(3);
    expect(eliteKnight.healthGainAmount).toBe(20);
    expect(eliteKnight.manaGainTicks).toBe(3);
    expect(eliteKnight.manaGainAmount).toBe(5);

    // Paladin
    const paladin = vocationFor(content, 'Paladin');
    expect(paladin.healthGainTicks).toBe(4);
    expect(paladin.healthGainAmount).toBe(10);
    expect(paladin.manaGainTicks).toBe(4);
    expect(paladin.manaGainAmount).toBe(10);

    // Royal Paladin (Promoted)
    const royalPaladin = vocationFor(content, 'Royal Paladin');
    expect(royalPaladin.healthGainTicks).toBe(3);
    expect(royalPaladin.healthGainAmount).toBe(10);
    expect(royalPaladin.manaGainTicks).toBe(3);
    expect(royalPaladin.manaGainAmount).toBe(10);

    // Sorcerer
    const sorcerer = vocationFor(content, 'Sorcerer');
    expect(sorcerer.healthGainTicks).toBe(4);
    expect(sorcerer.healthGainAmount).toBe(5);
    expect(sorcerer.manaGainTicks).toBe(4);
    expect(sorcerer.manaGainAmount).toBe(20);

    // Master Sorcerer (Promoted)
    const masterSorcerer = vocationFor(content, 'Master Sorcerer');
    expect(masterSorcerer.healthGainTicks).toBe(3);
    expect(masterSorcerer.healthGainAmount).toBe(5);
    expect(masterSorcerer.manaGainTicks).toBe(3);
    expect(masterSorcerer.manaGainAmount).toBe(20);

    // Druid
    const druid = vocationFor(content, 'Druid');
    expect(druid.healthGainTicks).toBe(4);
    expect(druid.healthGainAmount).toBe(5);
    expect(druid.manaGainTicks).toBe(4);
    expect(druid.manaGainAmount).toBe(20);

    // Elder Druid (Promoted)
    const elderDruid = vocationFor(content, 'Elder Druid');
    expect(elderDruid.healthGainTicks).toBe(3);
    expect(elderDruid.healthGainAmount).toBe(5);
    expect(elderDruid.manaGainTicks).toBe(3);
    expect(elderDruid.manaGainAmount).toBe(20);
  });

  it('2. Verifies Knight recovers +20 HP and +5 MP every 4 seconds in combat', () => {
    let state = startGame(createIdleGame('test-rubinot-knight', content), content);
    const char = state.session.characters[0];
    char.vocation = 'Knight';
    char.currentHp = 100;
    char.maxHp = 500;
    char.currentMana = 20;
    char.maxMana = 200;

    const actor = state.encounter.partyActors[0];
    actor.hp = 100;
    actor.mana = 20;
    actor.nextHealthRegenAt = state.encounter.elapsedMs;
    actor.nextManaRegenAt = state.encounter.elapsedMs;

    // Advance 120ms tick to trigger regeneration
    state = advanceCombat(state, content, 120);

    expect(state.encounter.partyActors[0].hp).toBe(120); // +20 HP
    expect(state.encounter.partyActors[0].mana).toBe(25); // +5 MP
    // Next interval scheduled in 4000ms
    expect(state.encounter.partyActors[0].nextHealthRegenAt).toBe(4000);
    expect(state.encounter.partyActors[0].nextManaRegenAt).toBe(4000);
  });

  it('3. Verifies Master Sorcerer recovers +5 HP and +20 MP every 3 seconds in combat', () => {
    let state = startGame(createIdleGame('test-rubinot-ms', content), content);
    const char = state.session.characters[0];
    char.vocation = 'Master Sorcerer';
    char.currentHp = 100;
    char.maxHp = 500;
    char.currentMana = 50;
    char.maxMana = 500;

    const actor = state.encounter.partyActors[0];
    actor.hp = 100;
    actor.mana = 50;
    actor.nextHealthRegenAt = state.encounter.elapsedMs;
    actor.nextManaRegenAt = state.encounter.elapsedMs;

    state = advanceCombat(state, content, 120);

    expect(state.encounter.partyActors[0].hp).toBe(105); // +5 HP
    expect(state.encounter.partyActors[0].mana).toBe(70); // +20 MP
    // Next interval scheduled in 3000ms for promoted vocation
    expect(state.encounter.partyActors[0].nextHealthRegenAt).toBe(3000);
    expect(state.encounter.partyActors[0].nextManaRegenAt).toBe(3000);
  });

  it('4. Verifies Life Ring and Ring of Healing can be equipped into ring slot', () => {
    const lifeRingDef = findEquipment(content.equipment, 2168);
    expect(lifeRingDef).toBeDefined();
    expect(lifeRingDef?.slot).toBe('ring');
    expect(preferredSlotForItem(lifeRingDef!)).toBe('ring');
    expect(isCompatibleEquipmentSlot(lifeRingDef!, 'ring')).toBe(true);

    const rohDef = findEquipment(content.equipment, 2214);
    expect(rohDef).toBeDefined();
    expect(rohDef?.slot).toBe('ring');
    expect(preferredSlotForItem(rohDef!)).toBe('ring');
    expect(isCompatibleEquipmentSlot(rohDef!, 'ring')).toBe(true);

    let state = startGame(createIdleGame('test-ring-equip', content), content);
    const char = state.session.characters[0];

    const equipResult = equipCharacterItem(char, lifeRingDef!, 'ring', content.equipment);
    expect(equipResult.ok).toBe(true);
    if (equipResult.ok) {
      expect(equipResult.character.equipment.ring).toBe(2168);
    }
  });

  it('5. Verifies Life Ring grants independent +2 HP and +8 MP every 6 seconds', () => {
    let state = startGame(createIdleGame('test-life-ring-regen', content), content);
    const char = state.session.characters[0];
    char.vocation = 'Knight';
    char.equipment.ring = 2168; // Life Ring equipped
    char.currentHp = 100;
    char.maxHp = 500;
    char.currentMana = 20;
    char.maxMana = 200;

    const actor = state.encounter.partyActors[0];
    actor.hp = 100;
    actor.mana = 20;
    // Set next vocation regen far in the future so only ring regen fires
    actor.nextHealthRegenAt = 999_999;
    actor.nextManaRegenAt = 999_999;
    actor.nextRingRegenAt = state.encounter.elapsedMs;

    state = advanceCombat(state, content, 120);

    // Only ring regen fired (+2 HP, +8 MP)
    expect(state.encounter.partyActors[0].hp).toBe(102);
    expect(state.encounter.partyActors[0].mana).toBe(28);
    expect(state.encounter.partyActors[0].nextRingRegenAt).toBe(6000);
  });

  it('6. Verifies Ring of Healing grants independent +6 HP and +24 MP every 6 seconds', () => {
    let state = startGame(createIdleGame('test-roh-regen', content), content);
    const char = state.session.characters[0];
    char.vocation = 'Knight';
    char.equipment.ring = 2214; // Ring of Healing equipped
    char.currentHp = 100;
    char.maxHp = 500;
    char.currentMana = 20;
    char.maxMana = 200;

    const actor = state.encounter.partyActors[0];
    actor.hp = 100;
    actor.mana = 20;
    actor.nextHealthRegenAt = 999_999;
    actor.nextManaRegenAt = 999_999;
    actor.nextRingRegenAt = state.encounter.elapsedMs;

    state = advanceCombat(state, content, 120);

    // ROH fired (+6 HP, +24 MP)
    expect(state.encounter.partyActors[0].hp).toBe(106);
    expect(state.encounter.partyActors[0].mana).toBe(44);
    expect(state.encounter.partyActors[0].nextRingRegenAt).toBe(6000);
  });

  it('7. Verifies combined vocation and ring regeneration without food requirement', () => {
    let state = startGame(createIdleGame('test-combined-regen', content), content);
    const char = state.session.characters[0];
    char.vocation = 'Elite Knight'; // +20 HP, +5 MP / 3s
    char.equipment.ring = 2214; // ROH: +6 HP, +24 MP / 6s
    char.currentHp = 100;
    char.maxHp = 500;
    char.currentMana = 20;
    char.maxMana = 200;

    const actor = state.encounter.partyActors[0];
    actor.hp = 100;
    actor.mana = 20;
    // Both trigger at elapsedMs 0
    actor.nextHealthRegenAt = state.encounter.elapsedMs;
    actor.nextManaRegenAt = state.encounter.elapsedMs;
    actor.nextRingRegenAt = state.encounter.elapsedMs;

    state = advanceCombat(state, content, 120);

    // Vocation (+20 HP, +5 MP) + ROH (+6 HP, +24 MP) = +26 HP, +29 MP
    expect(state.encounter.partyActors[0].hp).toBe(126);
    expect(state.encounter.partyActors[0].mana).toBe(49);
  });
});
