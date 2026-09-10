import type { SpellCombatType, SpellDefinition, VocationName } from '../../content-schema/src';
import type { CharacterState, GameContent, GameState, PartyActorState, EnemyState, HotbarCondition, HotbarSlotConfig } from './types';

export type HotbarActionKind = 'spell' | 'rune' | 'potion';

export const RUNE_PROJECTILE_FLIGHT_MS = 240;

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
  area: 'target' | 'square-1x1' | 'cross-1x1' | 'circle-3x3';
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
  category: 'healing' | 'mana' | 'support';
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

const ALL_VOCATIONS: VocationName[] = [
  'Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid',
  'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'
];

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
    effectId: 18, // CONST_ME_MORTAREA (realmap11 attack/sudden death.lua)
    projectileId: 32, // CONST_ANI_SUDDENDEATH (realmap11 attack/sudden death.lua)
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
    effectId: 38, // CONST_ME_ENERGYAREA (realmap11 attack/heavy magic missile.lua)
    projectileId: 5, // CONST_ANI_ENERGY (realmap11 attack/heavy magic missile.lua)
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
    area: 'circle-3x3', // AREA_CIRCLE3X3 (realmap11 attack/great fireball.lua)
    combatType: 'fire',
    cooldownMs: 2000,
    effectId: 7, // CONST_ME_FIREAREA (realmap11 attack/great fireball.lua)
    projectileId: 4, // CONST_ANI_FIRE (realmap11 attack/great fireball.lua)
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
    area: 'circle-3x3', // AREA_CIRCLE3X3 (realmap11 attack/avalanche.lua)
    combatType: 'ice',
    cooldownMs: 2000,
    effectId: 42, // CONST_ME_ICEAREA (realmap11 attack/avalanche.lua)
    projectileId: 29, // CONST_ANI_ICE (realmap11 attack/avalanche.lua)
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
    area: 'cross-1x1', // AREA_CROSS1X1 (realmap11 attack/explosion.lua)
    combatType: 'physical',
    cooldownMs: 2000,
    effectId: 5, // CONST_ME_EXPLOSIONAREA (realmap11 attack/explosion.lua)
    projectileId: 41, // CONST_ANI_EXPLOSION (realmap11 attack/explosion.lua)
    description: 'Detonação de impacto cinético que estilhaça inimigos em área.',
  },
  {
    id: 2273,
    name: 'Ultimate Healing Rune',
    words: 'adura vita',
    kind: 'rune',
    category: 'healing',
    requiredLevel: 24,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'],
    range: 4,
    area: 'target',
    combatType: 'healing',
    cooldownMs: 2000,
    effectId: 13, // CONST_ME_MAGIC_BLUE (realmap11 healing/ultimate healing rune.lua)
    projectileId: 0,
    description: 'Runa de cura — lançada em você ou em um aliado por perto.',
  },
  {
    id: 2302,
    name: 'Fireball Rune',
    words: 'adori flam',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 27,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin'],
    range: 4,
    area: 'target',
    combatType: 'fire',
    cooldownMs: 2000,
    effectId: 37, // CONST_ME_FIREATTACK (realmap11 attack/fireball.lua)
    projectileId: 4, // CONST_ANI_FIRE (realmap11 attack/fireball.lua)
    description: 'Bola de fogo de alvo único.',
  },
  {
    id: 2271,
    name: 'Icicle Rune',
    words: 'adori frigo',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 28,
    requiredMagicLevel: 4,
    vocations: ['Druid', 'Elder Druid', 'Sorcerer', 'Master Sorcerer'],
    range: 4,
    area: 'target',
    combatType: 'ice',
    cooldownMs: 2000,
    effectId: 42, // CONST_ME_ICEAREA (realmap11 attack/icicle.lua)
    projectileId: 29, // CONST_ANI_ICE (realmap11 attack/icicle.lua)
    description: 'Projétil gélido de gelo.',
  },
  {
    id: 2288,
    name: 'Stone Shower Rune',
    words: 'adori mas tera',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 28,
    requiredMagicLevel: 4,
    vocations: ['Druid', 'Elder Druid', 'Sorcerer', 'Master Sorcerer'],
    range: 4,
    area: 'circle-3x3', // AREA_CIRCLE3X3 (realmap11 attack/stone shower.lua)
    combatType: 'earth',
    cooldownMs: 2000,
    effectId: 45, // CONST_ME_STONES (realmap11 attack/stone shower.lua)
    projectileId: 30, // CONST_ANI_EARTH (realmap11 attack/stone shower.lua)
    description: 'Chuva de pedras e terra em área.',
  },
  {
    id: 2315,
    name: 'Thunderstorm Rune',
    words: 'adori mas vis',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 28,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'circle-3x3', // AREA_CIRCLE3X3 (realmap11 attack/thunderstorm.lua)
    combatType: 'energy',
    cooldownMs: 2000,
    effectId: 12, // CONST_ME_ENERGYHIT (realmap11 attack/thunderstorm.lua)
    projectileId: 36, // CONST_ANI_ENERGYBALL (realmap11 attack/thunderstorm.lua)
    description: 'Tempestade elétrica em área.',
  },
  {
    id: 2287,
    name: 'Light Magic Missile Rune',
    words: 'adori min vis',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 15,
    requiredMagicLevel: 0,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'],
    range: 4,
    area: 'target',
    combatType: 'energy',
    cooldownMs: 2000,
    effectId: 38, // CONST_ME_ENERGYAREA (realmap11 attack/light magic missile.lua)
    projectileId: 5, // CONST_ANI_ENERGY (realmap11 attack/light magic missile.lua)
    description: 'Míssil mágico leve de energia.',
  },
  {
    id: 2292,
    name: 'Stalagmite Rune',
    words: 'adori tera',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 24,
    requiredMagicLevel: 3,
    vocations: ['Druid', 'Elder Druid', 'Sorcerer', 'Master Sorcerer'],
    range: 4,
    area: 'target',
    combatType: 'earth',
    cooldownMs: 2000,
    effectId: 45, // CONST_ME_STONES (realmap11 attack/stalagmite.lua)
    projectileId: 30, // CONST_ANI_EARTH (realmap11 attack/stalagmite.lua)
    description: 'Espinho de rocha que perfura o alvo com dano de terra.',
  },
  {
    id: 2295,
    name: 'Holy Missile Rune',
    words: 'adori san',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 27,
    requiredMagicLevel: 4,
    vocations: ['Paladin', 'Royal Paladin'],
    range: 4,
    area: 'target',
    combatType: 'holy',
    cooldownMs: 2000,
    effectId: 40, // CONST_ME_HOLYDAMAGE (realmap11 attack/holy missile.lua)
    projectileId: 31, // CONST_ANI_HOLY (realmap11 attack/holy missile.lua)
    description: 'Projétil de luz sagrada divino exclusivo de paladinos.',
  },
  {
    id: 2293,
    name: 'Magic Wall Rune',
    words: 'adevo grav tera',
    kind: 'rune',
    category: 'support',
    requiredLevel: 32,
    requiredMagicLevel: 9,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 0, // In realmap11 it creates ITEM_MAGICWALL without impact effect
    projectileId: 5, // CONST_ANI_ENERGY (realmap11 support/magic wall rune.lua)
    description: 'Cria uma muralha de energia intransponível por tempo limitado.',
  },
  {
    id: 2269,
    name: 'Wild Growth Rune',
    words: 'adevo grav vita',
    kind: 'rune',
    category: 'support',
    requiredLevel: 27,
    requiredMagicLevel: 8,
    vocations: ['Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 0, // In realmap11 it creates ITEM_WILDGROWTH without impact effect
    projectileId: 30, // CONST_ANI_EARTH (realmap11 support/wild growth rune.lua)
    description: 'Cria um arbusto vivo que bloqueia a passagem.',
  },
  {
    id: 2278,
    name: 'Paralyze Rune',
    words: 'adana ani',
    kind: 'rune',
    category: 'support',
    requiredLevel: 54,
    requiredMagicLevel: 18,
    vocations: ['Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 14, // CONST_ME_MAGIC_RED (realmap11 support/paralyze rune.lua)
    projectileId: 0,
    description: 'Reduz severamente a velocidade de movimento do alvo.',
  },
  {
    id: 2261,
    name: 'Destroy Field Rune',
    words: 'adito grav',
    kind: 'rune',
    category: 'support',
    requiredLevel: 17,
    requiredMagicLevel: 3,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'],
    range: 4,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 3, // CONST_ME_POFF (realmap11 support/destroy field rune.lua)
    projectileId: 0,
    description: 'Remove campos de fogo, veneno ou energia do chão.',
  },
  {
    id: 2310,
    name: 'Desintegrate Rune',
    words: 'adito tera',
    kind: 'rune',
    category: 'support',
    requiredLevel: 21,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'],
    range: 1,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 3, // CONST_ME_POFF (realmap11 support/desintegrate rune.lua)
    projectileId: 0,
    description: 'Desintegra itens ou corpos do chão adjacente.',
  },
  {
    id: 2291,
    name: 'Chameleon Rune',
    words: 'adevo ina',
    kind: 'rune',
    category: 'support',
    requiredLevel: 27,
    requiredMagicLevel: 4,
    vocations: ['Druid', 'Elder Druid', 'Sorcerer', 'Master Sorcerer'],
    range: 1,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 14, // CONST_ME_MAGIC_RED (realmap11 support/chameleon.lua)
    projectileId: 0,
    description: 'Assume a aparência de um item no chão.',
  },
  {
    id: 2290,
    name: 'Convince Creature Rune',
    words: 'adeta sio',
    kind: 'rune',
    category: 'support',
    requiredLevel: 16,
    requiredMagicLevel: 5,
    vocations: ['Druid', 'Elder Druid', 'Sorcerer', 'Master Sorcerer'],
    range: 1,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 13, // CONST_ME_MAGIC_BLUE (realmap11 support/convince_creature.lua)
    projectileId: 0,
    description: 'Convença uma criatura a lutar ao seu lado.',
  },
  {
    id: 2266,
    name: 'Cure Poison Rune',
    words: 'adana pox',
    kind: 'rune',
    category: 'healing',
    requiredLevel: 15,
    requiredMagicLevel: 0,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'],
    range: 4,
    area: 'target',
    combatType: 'healing',
    cooldownMs: 2000,
    effectId: 13, // CONST_ME_MAGIC_BLUE (realmap11 healing/antidote rune.lua)
    projectileId: 0,
    description: 'Cura envenenamento em você ou em um aliado.',
  },
  {
    id: 2265,
    name: 'Intense Healing Rune',
    words: 'adura gran',
    kind: 'rune',
    category: 'healing',
    requiredLevel: 15,
    requiredMagicLevel: 1,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin', 'Knight', 'Elite Knight'],
    range: 4,
    area: 'target',
    combatType: 'healing',
    cooldownMs: 2000,
    effectId: 13, // CONST_ME_MAGIC_BLUE (realmap11 healing/intense healing rune.lua)
    projectileId: 0,
    description: 'Cura intermediária para você ou um aliado.',
  },
  {
    id: 2316,
    name: 'Animate Dead Rune',
    words: 'adana mort',
    kind: 'rune',
    category: 'support',
    requiredLevel: 27,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 1,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 13, // CONST_ME_MAGIC_BLUE (realmap11 support/animate dead rune.lua)
    projectileId: 0,
    description: 'Ergue esqueletos a partir de corpos de criaturas.',
  },
  {
    id: 2308,
    name: 'Soulfire Rune',
    words: 'adevo res flam',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 27,
    requiredMagicLevel: 7,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'fire',
    cooldownMs: 2000,
    effectId: 16, // CONST_ME_HITBYFIRE (realmap11 attack/soul fire.lua)
    projectileId: 4, // CONST_ANI_FIRE (realmap11 attack/soul fire.lua)
    description: 'Queima a alma do alvo causando dano contínuo.',
  },
  {
    id: 2301,
    name: 'Fire Field Rune',
    words: 'adevo grav flam',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 15,
    requiredMagicLevel: 1,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'fire',
    cooldownMs: 2000,
    effectId: 16, // CONST_ME_HITBYFIRE (realmap11 attack/fire field.lua)
    projectileId: 4, // CONST_ANI_FIRE (realmap11 attack/fire field.lua)
    description: 'Cria um campo de chamas ardentes.',
  },
  {
    id: 2303,
    name: 'Fire Wall Rune',
    words: 'adevo mas grav flam',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 33,
    requiredMagicLevel: 9,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'fire',
    cooldownMs: 2000,
    effectId: 16, // CONST_ME_HITBYFIRE (realmap11 attack/fire wall.lua)
    projectileId: 4, // CONST_ANI_FIRE (realmap11 attack/fire wall.lua)
    description: 'Cria uma parede de fogo contínua.',
  },
  {
    id: 2305,
    name: 'Fire Bomb Rune',
    words: 'adevo mas flam',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 27,
    requiredMagicLevel: 5,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'square-1x1', // AREA_SQUARE1X1 (realmap11 attack/fire bomb.lua)
    combatType: 'fire',
    cooldownMs: 2000,
    effectId: 16, // CONST_ME_HITBYFIRE (realmap11 attack/fire bomb.lua)
    projectileId: 4, // CONST_ANI_FIRE (realmap11 attack/fire bomb.lua)
    description: 'Explosão de fogo que incendeia 9 quadrantes.',
  },
  {
    id: 2277,
    name: 'Energy Field Rune',
    words: 'adevo grav vis',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 18,
    requiredMagicLevel: 3,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'energy',
    cooldownMs: 2000,
    effectId: 12, // CONST_ME_ENERGYHIT (realmap11 attack/energy field.lua)
    projectileId: 36, // CONST_ANI_ENERGYBALL (realmap11 attack/energy field.lua)
    description: 'Cria um campo de energia elétrica.',
  },
  {
    id: 2279,
    name: 'Energy Wall Rune',
    words: 'adevo mas grav vis',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 41,
    requiredMagicLevel: 9,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'energy',
    cooldownMs: 2000,
    effectId: 12, // CONST_ME_ENERGYHIT (realmap11 attack/energy wall.lua)
    projectileId: 36, // CONST_ANI_ENERGYBALL (realmap11 attack/energy wall.lua)
    description: 'Cria uma parede de raios elétricos.',
  },
  {
    id: 2262,
    name: 'Energy Bomb Rune',
    words: 'adevo mas vis',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 37,
    requiredMagicLevel: 10,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'square-1x1', // AREA_SQUARE1X1 (realmap11 attack/energy bomb.lua)
    combatType: 'energy',
    cooldownMs: 2000,
    effectId: 12, // CONST_ME_ENERGYHIT (realmap11 attack/energy bomb.lua)
    projectileId: 36, // CONST_ANI_ENERGYBALL (realmap11 attack/energy bomb.lua)
    description: 'Bomba de energia elétrica que eletrifica 9 quadrantes.',
  },
  {
    id: 2285,
    name: 'Poison Field Rune',
    words: 'adevo grav pox',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 14,
    requiredMagicLevel: 0,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'earth',
    cooldownMs: 2000,
    effectId: 9, // CONST_ME_GREEN_RINGS (realmap11 attack/poison field.lua)
    projectileId: 15, // CONST_ANI_POISON (realmap11 attack/poison field.lua)
    description: 'Cria um campo de poça de veneno.',
  },
  {
    id: 2289,
    name: 'Poison Wall Rune',
    words: 'adevo mas grav pox',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 29,
    requiredMagicLevel: 5,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'target',
    combatType: 'earth',
    cooldownMs: 2000,
    effectId: 9, // CONST_ME_GREEN_RINGS (realmap11 attack/poison wall.lua)
    projectileId: 15, // CONST_ANI_POISON (realmap11 attack/poison wall.lua)
    description: 'Cria uma barreira de gás venenoso.',
  },
  {
    id: 2286,
    name: 'Poison Bomb Rune',
    words: 'adevo mas pox',
    kind: 'rune',
    category: 'attack',
    requiredLevel: 25,
    requiredMagicLevel: 4,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    range: 4,
    area: 'square-1x1', // AREA_SQUARE1X1 (realmap11 attack/poison bomb.lua)
    combatType: 'earth',
    cooldownMs: 2000,
    effectId: 9, // CONST_ME_GREEN_RINGS (realmap11 attack/poison bomb.lua)
    projectileId: 15, // CONST_ANI_POISON (realmap11 attack/poison bomb.lua)
    description: 'Detonação de veneno tóxico em área.',
  },
  {
    id: 2260,
    name: 'Blank Rune',
    words: 'adori blank',
    kind: 'rune',
    category: 'support',
    requiredLevel: 20,
    requiredMagicLevel: 0,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid', 'Paladin', 'Royal Paladin'],
    range: 1,
    area: 'target',
    combatType: 'support',
    cooldownMs: 2000,
    effectId: 13, // CONST_ME_MAGIC_BLUE
    projectileId: 0,
    description: 'Pedra mística em branco usada para conjuração de runas.',
  },
];

export const HOTBAR_POTIONS: HotbarPotionDefinition[] = [
  {
    id: 8704,
    name: 'Lesser Health Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 1,
    vocations: ALL_VOCATIONS,
    cooldownMs: 1000,
    effectId: 13,
    healMin: 63,
    healMax: 88,
    description: 'Bebe sozinha quando a regra dela passa.',
  },
  {
    id: 7618,
    name: 'Health Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 1,
    vocations: ALL_VOCATIONS,
    cooldownMs: 1000,
    effectId: 13,
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
    effectId: 13,
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
    effectId: 13,
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
    effectId: 13,
    healMin: 800,
    healMax: 1000,
    description: 'Elixir supremo que recupera 800 a 1000 HP instantaneamente.',
  },
  {
    id: 7620,
    name: 'Mana Potion',
    kind: 'potion',
    category: 'mana',
    requiredLevel: 1,
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
    effectId: 13,
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
    effectId: 13,
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
    effectId: 13,
    healMin: 400,
    healMax: 500,
    manaMin: 350,
    manaMax: 450,
    description: 'Poção mística suprema do Tibia 11 para paladinos, recupera HP e MP simultaneamente.',
  },
  {
    id: 8474,
    name: 'Antidote Potion',
    kind: 'potion',
    category: 'healing',
    requiredLevel: 1,
    vocations: ALL_VOCATIONS,
    cooldownMs: 1000,
    effectId: 15,
    description: 'Cura envenenamento e restaura o organismo.',
  },
  {
    id: 7439,
    name: 'Berserk Potion',
    kind: 'potion',
    category: 'support',
    requiredLevel: 1,
    vocations: ['Knight', 'Elite Knight', 'Paladin', 'Royal Paladin'],
    cooldownMs: 2000,
    effectId: 15,
    description: 'Aumenta habilidades corpo a corpo temporariamente.',
  },
  {
    id: 7440,
    name: 'Mastermind Potion',
    kind: 'potion',
    category: 'support',
    requiredLevel: 1,
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    cooldownMs: 2000,
    effectId: 13,
    description: 'Aumenta temporariamente o Magic Level.',
  },
  {
    id: 7443,
    name: 'Bullseye Potion',
    kind: 'potion',
    category: 'support',
    requiredLevel: 1,
    vocations: ['Paladin', 'Royal Paladin'],
    cooldownMs: 2000,
    effectId: 15,
    description: 'Aumenta a precisão de combate à distância.',
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

export function getBestHealthPotionForCharacter(character: CharacterState): HotbarPotionDefinition | undefined {
  const eligible = HOTBAR_POTIONS.filter((potion) => {
    if (potion.category !== 'healing' || typeof potion.healMin !== 'number') return false;
    return isHotbarActionUnlocked(character, { kind: 'potion', potion });
  });

  if (eligible.length === 0) {
    return HOTBAR_POTIONS.find((p) => p.id === 7618) ?? HOTBAR_POTIONS[0];
  }
  eligible.sort((a, b) => b.requiredLevel - a.requiredLevel || (b.healMax ?? 0) - (a.healMax ?? 0));
  return eligible[0];
}

export function ensureHealthPotionInHotbar(character: CharacterState, content: GameContent): number | undefined {
  if (!character.hotbar) character.hotbar = [];

  const existingPotionId = character.hotbar.find((id) => {
    if (typeof id !== 'number' || id === 0) return false;
    const action = findHotbarAction(id, content);
    return action?.kind === 'potion' && action.potion.category === 'healing';
  });

  if (existingPotionId) return existingPotionId;

  const bestPotion = getBestHealthPotionForCharacter(character);
  if (!bestPotion) return undefined;

  let assignedIndex = -1;
  const emptyIndex = character.hotbar.findIndex((id) => typeof id !== 'number' || id === 0);
  if (emptyIndex !== -1) {
    character.hotbar[emptyIndex] = bestPotion.id;
    assignedIndex = emptyIndex;
  } else if (character.hotbar.length < 20) {
    assignedIndex = character.hotbar.length;
    character.hotbar.push(bestPotion.id);
  } else {
    // If player has customized all 20 hotbar slots, do not destructively overwrite slot 0
    return undefined;
  }

  if (assignedIndex >= 0) {
    if (!character.hotbarConfigs) character.hotbarConfigs = {};
    if (!character.hotbarConfigs[assignedIndex]) {
      character.hotbarConfigs[assignedIndex] = {
        enabled: true,
        healingTarget: 'self',
        conditions: [{ id: '1', target: 'self', metric: 'hp', operator: 'lte', value: 75, isPercent: true }],
      };
    }
  }

  return bestPotion.id;
}

export interface ConditionEvaluationContext {
  actor: PartyActorState;
  character: CharacterState;
  state?: GameState;
  primaryTarget?: EnemyState | null;
  eligibleEnemies?: EnemyState[];
}

export function evaluateHotbarCondition(
  condition: HotbarCondition,
  context: ConditionEvaluationContext
): boolean {
  const { actor, character, state, primaryTarget, eligibleEnemies } = context;

  // 1. Resolve current metric value
  let currentValue = 0;

  if (condition.metric === 'monsters') {
    const aliveMonsters = eligibleEnemies
      ? eligibleEnemies.filter((e) => e.alive).length
      : (state?.encounter?.enemies.filter((e) => e.alive).length ?? 0);
    currentValue = aliveMonsters;
  } else if (condition.target === 'target') {
    if (!primaryTarget || !primaryTarget.alive) {
      return false;
    }
    if (condition.metric === 'hp') {
      currentValue = condition.isPercent
        ? (primaryTarget.maxHp > 0 ? (primaryTarget.hp / primaryTarget.maxHp) * 100 : 0)
        : primaryTarget.hp;
    } else if (condition.metric === 'mana') {
      currentValue = 0;
    }
  } else if (condition.target === 'leader' || condition.target === 'party_leader') {
    const leaderActor = state?.encounter?.partyActors.find(
      (a) => a.alive && (a.characterId === state?.session?.leaderId || a.characterId === state?.session?.selectedCharacterId)
    ) ?? actor;
    const leaderChar = state?.session?.characters.find((c) => c.id === leaderActor.characterId) ?? character;

    if (condition.metric === 'hp') {
      currentValue = condition.isPercent
        ? (leaderChar.maxHp > 0 ? (leaderActor.hp / leaderChar.maxHp) * 100 : 0)
        : leaderActor.hp;
    } else if (condition.metric === 'mana') {
      currentValue = condition.isPercent
        ? (leaderChar.maxMana > 0 ? (leaderActor.mana / leaderChar.maxMana) * 100 : 0)
        : leaderActor.mana;
    }
  } else if (condition.target === 'lowest_hp') {
    let lowestRatio = 1.0;
    let lowestActor = actor;
    let lowestChar = character;

    if (state?.encounter?.partyActors && state.session?.characters) {
      for (const a of state.encounter.partyActors) {
        if (!a.alive) continue;
        const c = state.session.characters.find((ch) => ch.id === a.characterId);
        if (c && c.maxHp > 0) {
          const ratio = a.hp / c.maxHp;
          if (ratio < lowestRatio) {
            lowestRatio = ratio;
            lowestActor = a;
            lowestChar = c;
          }
        }
      }
    }

    if (condition.metric === 'hp') {
      currentValue = condition.isPercent
        ? (lowestChar.maxHp > 0 ? (lowestActor.hp / lowestChar.maxHp) * 100 : 0)
        : lowestActor.hp;
    } else if (condition.metric === 'mana') {
      currentValue = condition.isPercent
        ? (lowestChar.maxMana > 0 ? (lowestActor.mana / lowestChar.maxMana) * 100 : 0)
        : lowestActor.mana;
    }
  } else {
    // Default / 'self'
    if (condition.metric === 'hp') {
      currentValue = condition.isPercent
        ? (character.maxHp > 0 ? (actor.hp / character.maxHp) * 100 : 0)
        : actor.hp;
    } else if (condition.metric === 'mana') {
      currentValue = condition.isPercent
        ? (character.maxMana > 0 ? (actor.mana / character.maxMana) * 100 : 0)
        : actor.mana;
    }
  }

  // 2. Evaluate operator
  const targetVal = condition.value;
  const EPSILON = 0.0001;

  switch (condition.operator) {
    case 'lte':
      return currentValue <= targetVal + EPSILON;
    case 'gte':
      return currentValue >= targetVal - EPSILON;
    case 'lt':
      return currentValue < targetVal - EPSILON;
    case 'gt':
      return currentValue > targetVal + EPSILON;
    case 'eq':
      return Math.abs(currentValue - targetVal) < 0.01 || Math.round(currentValue) === Math.round(targetVal);
    default:
      return true;
  }
}

export function isHotbarSlotConditionsMet(
  config: HotbarSlotConfig | undefined,
  context: ConditionEvaluationContext
): boolean {
  if (!config) {
    return true;
  }
  if (config.enabled === false) {
    return false;
  }
  if (!config.conditions || config.conditions.length === 0) {
    return true;
  }
  for (const condition of config.conditions) {
    if (!evaluateHotbarCondition(condition, context)) {
      return false;
    }
  }
  return true;
}


