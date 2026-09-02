export interface ContentSource {
  format: 'styller-monster-xml';
  relativePath: string;
}

export interface MonsterAttackDefinition {
  kind: 'melee';
  intervalMs: number;
  minDamage: number;
  maxDamage: number;
}

export interface LootDefinition {
  itemId?: number;
  name: string;
  chance: number;
  maxCount: number;
}

export interface MonsterDefinition {
  id: string;
  source: ContentSource;
  name: string;
  description: string;
  race: string;
  experience: number;
  speed: number;
  maxHp: number;
  armor: number;
  defense: number;
  lookType?: number;
  corpseId?: number;
  attacks: MonsterAttackDefinition[];
  loot: LootDefinition[];
  elementalPercent: Record<string, number | undefined>;
  immunities: string[];
}

export interface MonsterCatalog {
  importedAtBuildTime: true;
  monsters: MonsterDefinition[];
}

export type EquipmentWeaponType = 'none' | 'sword' | 'axe' | 'club' | 'shield' | 'distance' | 'wand' | 'ammo';
export type EquipmentItemSlot = 'head' | 'armor' | 'legs' | 'boots' | 'hand' | 'ammo';
export type EquipmentSkill = 'fist' | 'club' | 'sword' | 'axe' | 'distance' | 'shielding';

export interface EquipmentRequirements {
  level?: number;
  magicLevel?: number;
  vocations?: string[];
}

export interface EquipmentSource {
  otb: { sourceFile: 'data/items/items.otb'; serverId: number; clientId: number; group: number; flags: number };
  lua: { sourceFile: 'data/items/items.lua'; sourceId: number; line: number };
}

export interface EquipmentDefinition {
  id: number;
  name: string;
  weaponType: EquipmentWeaponType;
  attack: number;
  defense: number;
  extraDefense: number;
  armor: number;
  slot: EquipmentItemSlot;
  twoHanded: boolean;
  range: number;
  weight: { hundredthsOfOunce: number; ounces: number } | null;
  requirements: EquipmentRequirements;
  skillBonuses: Partial<Record<EquipmentSkill, number>>;
  magicLevelBonus: number | null;
  elementalAbsorption: Record<string, number>;
  sourceFile: ['data/items/items.otb', 'data/items/items.lua'];
  sourceId: number;
  source: EquipmentSource;
  importWarnings: string[];
}

export interface EquipmentCatalog {
  importedAtBuildTime: true;
  selectionReason: string;
  items: EquipmentDefinition[];
}

export type BaseVocationName = 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid';
export type PromotedVocationName = 'Elite Knight' | 'Royal Paladin' | 'Master Sorcerer' | 'Elder Druid';
export type VocationName = BaseVocationName | PromotedVocationName;
export type ProgressionSkill = 'fist' | 'club' | 'sword' | 'axe' | 'distance' | 'shielding';

export interface VocationDefinition {
  id: number;
  name: VocationName;
  baseVocation: BaseVocationName;
  promoted: boolean;
  fromVocationId: number;
  gainHp: number;
  gainMana: number;
  gainCap: number;
  healthGainTicks: number;
  healthGainAmount: number;
  manaGainTicks: number;
  manaGainAmount: number;
  manaMultiplier: number;
  attackSpeedMs: number;
  baseSpeed: number;
  meleeDamageMultiplier: number;
  distanceDamageMultiplier: number;
  defenseMultiplier: number;
  armorMultiplier: number;
  skillMultipliers: Record<ProgressionSkill, number>;
  sourceFile: 'data/XML/vocations.xml';
  sourceId: number;
}

export interface VocationCatalog {
  importedAtBuildTime: true;
  rateSkill: number;
  rateMagic: number;
  vocations: VocationDefinition[];
}

export interface StarterLoadoutDefinition {
  vocation: BaseVocationName;
  equipped: { head: number; armor: number; legs: number; boots: number; leftHand: number; rightHand: number | null };
  sourceFile: 'data/creaturescripts/scripts/custom/firstitems.lua';
  sourceVocationId: number;
  warnings: string[];
}

export type SpellGroup = 'attack' | 'healing' | 'support';
export type SpellCombatType = 'physical' | 'energy' | 'fire' | 'ice' | 'earth' | 'holy' | 'healing' | 'support';
export type SpellFormulaKind = 'level-magic' | 'skill-attack' | 'distance-skill' | 'haste';

export interface SpellFormulaDefinition {
  kind: SpellFormulaKind;
  min: { level: number; magicLevel?: number; skillAttack?: number; distanceSkill?: number; constant: number };
  max: { level: number; magicLevel?: number; skillAttack?: number; distanceSkill?: number; constant: number };
  durationMs?: number;
  speedFormula?: [number, number, number, number];
}

export interface SpellVisualDefinition {
  effectId: number | null;
  projectileId: number | 'weapon-type' | null;
  effectConstant: string | null;
  projectileConstant: string | null;
}

export interface SpellDefinition {
  spellId: number;
  name: string;
  words: string;
  vocations: VocationName[];
  requiredLevel: number;
  mana: number;
  cooldownMs: number;
  groupCooldownMs: number;
  group: SpellGroup;
  range: number;
  combatType: SpellCombatType;
  formula: SpellFormulaDefinition;
  area: 'target' | 'self' | 'wave-4' | 'square-1x1';
  aggressive: boolean;
  runeId: number | null;
  visual: SpellVisualDefinition;
  sourceFiles: ['data/spells/spells.xml', string];
  importWarnings: string[];
}

export interface SpellCatalog {
  importedAtBuildTime: true;
  spells: SpellDefinition[];
}

export interface HuntRegionTileDefinition {
  x: number;
  y: number;
  z: number;
  serverItemIds: number[];
  walkable: boolean;
  groundServerId: number | null;
  itemProperties: Array<{ serverId: number; clientId: number | null; group: number; flags: number; blockSolid: boolean; blockPathFind: boolean }>;
}

export interface HuntRegionDefinition {
  huntId: string;
  monsterName: string;
  sourceCenter: { x: number; y: number; z: number; radius: number };
  bounds: { x: number; y: number; z: number; width: number; height: number };
  spawnPositions: Array<{ x: number; y: number; z: number; spawntime?: number }>;
  tiles: HuntRegionTileDefinition[];
  sourceFiles: ['data/world/spawn.xml', 'data/world/styller.otbm'];
  importWarnings: string[];
}

export interface HuntRegionCatalog {
  importedAtBuildTime: true;
  regions: HuntRegionDefinition[];
}

export interface StarterLoadoutCatalog {
  importedAtBuildTime: true;
  loadouts: StarterLoadoutDefinition[];
}

export interface StyllerItemSellOffer {
  price: number;
  sourceType?: 'styller';
  sourceNpc: string;
  sourceFile: string;
  sourceKind: 'npc-xml-shop-sellable' | 'npc-lua-sell-table';
}

export interface WebItemSellOffer {
  price: number;
  sourceType: 'web';
  sourceKind: 'web-reference';
  sourceUrl: string;
  sourceName: string;
  retrievedAt: string;
  tibiaVersionContext: string;
  sourceNpc?: never;
  sourceFile?: never;
}

export type ItemSellOffer = StyllerItemSellOffer | WebItemSellOffer;

export interface ItemEconomyDefinition {
  itemId: number;
  canonicalSellPrice: number | null;
  status: 'sellable' | 'priceUnknown';
  offers: ItemSellOffer[];
  warnings: string[];
}

export interface ItemEconomyCatalog {
  importedAtBuildTime: true;
  canonicalRule: 'highest-proven-npc-sell-price' | 'styller-first-then-web-highest-proven-sell-price';
  items: ItemEconomyDefinition[];
}

export function validateMonsterDefinition(value: MonsterDefinition): MonsterDefinition {
  if (!value.id || !value.name || value.maxHp <= 0 || value.experience < 0) throw new Error('Invalid monster definition.');
  if (value.attacks.length === 0) throw new Error(`Monster ${value.name} has no supported attacks.`);
  for (const loot of value.loot) {
    if (!loot.name || loot.chance < 0 || loot.chance > 100_000 || loot.maxCount < 1) {
      throw new Error(`Invalid loot entry on ${value.name}.`);
    }
  }
  return value;
}

export function validateEquipmentDefinition(value: EquipmentDefinition): EquipmentDefinition {
  if (!Number.isInteger(value.id) || value.id <= 0 || !value.name) throw new Error('Invalid equipment identity.');
  if (value.source.otb.serverId !== value.id || value.source.lua.sourceId !== value.id) {
    throw new Error(`Source identity mismatch for equipment ${value.id}.`);
  }
  if (value.weight && value.weight.hundredthsOfOunce < 0) throw new Error(`Invalid weight for equipment ${value.id}.`);
  return value;
}
