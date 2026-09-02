import economyJson from '../content/generated/item-economy.json';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '../packages/content-schema/src';
import { initialHunts, type GameContent } from '../packages/domain/src';

const equipment = equipmentJson as EquipmentCatalog;
const monsters = monstersJson as MonsterCatalog;
const starters = startersJson as StarterLoadoutCatalog;
const vocations = vocationsJson as VocationCatalog;

export const content: GameContent = {
  equipment: equipment.items,
  monsters: monsters.monsters,
  starterLoadouts: starters.loadouts,
  vocations: vocations.vocations,
  spells: (spellsJson as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: vocations.rateSkill,
  rateMagic: vocations.rateMagic,
};
