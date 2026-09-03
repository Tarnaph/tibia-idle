import type { SpellCombatType, SpellDefinition, VocationName } from '../../content-schema/src';
import type { CharacterState, GameContent } from './types';

export type HotbarActionKind = 'spell' | 'rune' | 'potion';

export interface HotbarRuneDefinition {
  id: number;
  name: string;
  words: string;
  kind: 'rune';
  category: 'attack' | 'healing' | 'support';
  requiredLevel: number;
  requiredMagicLevel: number;
  vocations: VocationName[];
  range: number;
  area: 'target' | 'square-1x1';
  combatType: SpellCombatType;
  cooldownMs: number;
  effectId: number;
  projectileId: number;
  description: string;
}

export interface HotbarPotionDefinition {
  id: number;
  name: string;
  kind: 'potion';
  category: 'healing' | 'mana';
  requiredLevel: number;
  vocations: VocationName[];
  cooldownMs: number;
  effectId: number;
  healMin?: number;
  healMax?: number;
  manaMin?: number;
  manaMax?: number;
  description: string;
}

export type HotbarActionItem =
  | { kind: 'spell'; spell: SpellDefinition }
  | { kind: 'rune'; rune: HotbarRuneDefinition }
  | { kind: 'potion'; potion: HotbarPotionDefinition };

export const HOTBAR_RUNES: HotbarRuneDefinition[] = [
  {
    id: 2268,
    name: 'Sudden Death',
    words: 'adori gran mort',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 45,
    requiredMagicLevel: 15,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'physical',
    cooldownMs: 2000,
    effectId: 16,
    projectileId: 5,
    description: 'Dispara uma descarga massiva de energia da morte em alvo único.',
  },
  {
    id: 2311,
    name: 'Heavy Magic Missile',
    words: 'adori vis',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 25,
    requiredMagicLevel: 3,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin'],
    range: 4,
    area: 'target',
    combatType: 'energy',
    cooldownMs: 2000,
    effectId: 38,
    projectileId: 5,
    description: 'Dispara um projétil concentrado de energia arcana no alvo.',
  },
  {
    id: 2304,
    name: 'Great Fireball',
    words: 'adori mas flam',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 30,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'square-1x1',
    combatType: 'fire',
    cooldownMs: 2000,
    effectId: 37,
    projectileId: 4,
    description: 'Bola de fogo explosiva que queima todos os monstros em área.',
  },
  {
    id: 2274,
    name: 'Avalanche',
    words: 'adori mas frigo',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 30,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'square-1x1',
    combatType: 'ice',
    cooldownMs: 2000,
    effectId: 42,
    projectileId: 37,
    description: 'Tempestade glacial congelante que causa dano de gelo em área.',
  },
  {
    id: 2313,
    name: 'Explosion',
    words: 'adori mas mort',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 31,
    requiredMagicLevel: 6,
    vocations: [
      'Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid',
      'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'
    ],
    range: 4,
    area: 'square-1x1',
    combatType: 'physical',
    cooldownMs: 2000,
    effectId: 10,
    projectileId: 5,
    description: 'Detonação de impacto cinético que estilhaça inimigos em área.',
  },
];

const ALL_VOCATIONS: VocationName[] = [
  'Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid',
  'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'
];

export const HOTBAR_POTIONS: HotbarPotionDefinition[] = [
  {
    id: 7618,
    name: 'Health Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 8,
    vocations: ALL_VOCATIONS,
    cooldownMs: 1000,
    effectId: 15,
    healMin: 150,
    healMax: 200,
    description: 'Poção básica que recupera entre 150 e 200 de vida (HP).',
  },
  {
    id: 7588,
    name: 'Strong Health Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 50,
    vocations: ['Knight', 'Elite Knight', 'Paladin', 'Royal Paladin'],
    cooldownMs: 1000,
    effectId: 15,
    healMin: 300,
    healMax: 400,
    description: 'Poção aprimorada que recupera entre 300 e 400 de vida (HP).',
  },
  {
    id: 7591,
    name: 'Great Health Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 80,
    vocations: ['Knight', 'Elite Knight'],
    cooldownMs: 1000,
    effectId: 15,
    healMin: 500,
    healMax: 700,
    description: 'Poção robusta exclusiva para cavaleiros que recupera 500 a 700 HP.',
  },
  {
    id: 8473,
    name: 'Ultimate Health Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 130,
    vocations: ['Knight', 'Elite Knight'],
    cooldownMs: 1000,
    effectId: 15,
    healMin: 800,
    healMax: 1000,
    description: 'Elixir supremo que recupera 800 a 1000 HP instantaneamente.',
  },
  {
    id: 7620,
    name: 'Mana Potion',
    kind: 'potion',
    category: 'mana',
    requiredLevel: 8,
    vocations: ALL_VOCATIONS,
    cooldownMs: 1000,
    effectId: 13,
    manaMin: 75,
    manaMax: 125,
    description: 'Infusão arcana que restaura entre 75 e 125 de mana (MP).',
  },
  {
    id: 7589,
    name: 'Strong Mana Potion',
    kind: 'potion',
    category: 'mana',
    requiredLevel: 50,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin'],
    cooldownMs: 1000,
    effectId: 13,
    manaMin: 115,
    manaMax: 185,
    description: 'Infusão mágica potente que restaura entre 115 e 185 de mana.',
  },
  {
    id: 7590,
    name: 'Great Mana Potion',
    kind: 'potion',
    category: 'mana',
    requiredLevel: 80,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    cooldownMs: 1000,
    effectId: 13,
    manaMin: 150,
    manaMax: 250,
    description: 'Elixir místico de alta graduação que recupera 150 a 250 de mana.',
  },
  {
    id: 8472,
    name: 'Great Spirit Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 80,
    vocations: ['Paladin', 'Royal Paladin'],
    cooldownMs: 1000,
    effectId: 15,
    healMin: 200,
    healMax: 400,
    manaMin: 100,
    manaMax: 200,
    description: 'Tônico espiritual sagrado que recupera vida e mana ao mesmo tempo.',
  },
  {
    id: 26031,
    name: 'Supreme Health Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 200,
    vocations: ['Knight', 'Elite Knight'],
    cooldownMs: 1000,
    effectId: 15,
    healMin: 900,
    healMax: 1200,
    description: 'A poção de cura mais poderosa do Tibia 11, recupera 900 a 1200 HP.',
  },
  {
    id: 26029,
    name: 'Ultimate Mana Potion',
    kind: 'potion',
    category: 'mana',
    requiredLevel: 130,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    cooldownMs: 1000,
    effectId: 13,
    manaMin: 400,
    manaMax: 550,
    description: 'Poção de mana de alta classe introduzida no Tibia 11, recupera 400 a 550 MP.',
  },
  {
    id: 26030,
    name: 'Ultimate Spirit Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 130,
    vocations: ['Paladin', 'Royal Paladin'],
    cooldownMs: 1000,
    effectId: 15,
    healMin: 400,
    healMax: 500,
    manaMin: 350,
    manaMax: 450,
    description: 'Poção mística suprema do Tibia 11 para paladinos, recupera HP e MP simultaneamente.',
  },
];

export function findHotbarAction(id: number, content: GameContent): HotbarActionItem | undefined {
  const potion = HOTBAR_POTIONS.find((p) => p.id === id);
  if (potion) return { kind: 'potion', potion };

  const rune = HOTBAR_RUNES.find((r) => r.id === id);
  if (rune) return { kind: 'rune', rune };

  const spell = content.spells.find((s) => s.spellId === id);
  if (spell) return { kind: 'spell', spell };

  return undefined;
}

export function isHotbarActionUnlocked(character: CharacterState, action: HotbarActionItem): boolean {
  if (action.kind === 'potion') {
    return character.level >= action.potion.requiredLevel && action.potion.vocations.includes(character.vocation);
  }
  if (action.kind === 'rune') {
    return (
      character.level >= action.rune.requiredLevel &&
      character.skills.magicLevel >= action.rune.requiredMagicLevel &&
      action.rune.vocations.includes(character.vocation)
    );
  }
  return character.level >= action.spell.requiredLevel && action.spell.vocations.includes(character.vocation);
}
