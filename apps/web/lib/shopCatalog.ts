export type ShopCategoryId =
  | 'all'
  | 'armors'
  | 'helmets'
  | 'legs'
  | 'shields'
  | 'weapons'
  | 'shoes'
  | 'exercise';

export interface ShopCategoryDef {
  id: ShopCategoryId;
  label: string;
  iconItemId: number; // Item ID used to render the canonical sprite in the category card
  description: string;
}

export interface ShopItemEntry {
  id: number;
  name: string;
  category: Exclude<ShopCategoryId, 'all'>;
  price: number;
  tier?: 'regular' | 'durable' | 'lasting';
  charges?: number;
  attack?: number;
  defense?: number;
  armor?: number;
  range?: number;
  weightOz?: number;
  levelReq?: number;
  vocations?: string[];
  description: string;
}

/**
 * 7 Categorias canônicas solicitadas pelo usuário, usando o design do pátio de treino (Print 1).
 */
export const SHOP_CATEGORIES: ShopCategoryDef[] = [
  { id: 'all', label: 'Todos', iconItemId: 2476, description: 'Todos os equipamentos e armas disponíveis na loja' },
  { id: 'armors', label: 'Armors', iconItemId: 2466, description: 'Armaduras corporais para proteção em combate' },
  { id: 'helmets', label: 'Helmets', iconItemId: 2473, description: 'Capacetes para defesa craniana' },
  { id: 'legs', label: 'Legs', iconItemId: 2470, description: 'Calças e perneiras reforçadas' },
  { id: 'shields', label: 'Shields', iconItemId: 2516, description: 'Escudos de defesa corporal e livros mágicos' },
  { id: 'weapons', label: 'Weapons', iconItemId: 2392, description: 'Espadas, machados, clavas, arcos e varinhas' },
  { id: 'shoes', label: 'Shoes', iconItemId: 2643, description: 'Botas e calçados para mobilidade' },
  { id: 'exercise', label: 'Exercise Weapons', iconItemId: 31821, description: 'Armas de exercício para treino contínuo no dummy' },
];

/**
 * Catálogo canônico completo contendo rigorosamente os 67 equipamentos do Print 2.
 */
export const SHOP_ITEMS_CATALOG: ShopItemEntry[] = [
  // ==========================================
  // ROW 1: WEAPONS (MELEE / DISTANCE)
  // ==========================================
  {
    id: 2456,
    name: 'Bow',
    category: 'weapons',
    price: 150,
    range: 6,
    weightOz: 31,
    levelReq: 1,
    vocations: ['Paladin'],
    description: 'Um arco básico de madeira para combate à distância.',
  },
  {
    id: 2398,
    name: 'Mace',
    category: 'weapons',
    price: 90,
    attack: 16,
    defense: 11,
    weightOz: 38,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Uma clava básica reforçada com pontas de ferro.',
  },
  {
    id: 2385,
    name: 'Sabre',
    category: 'weapons',
    price: 35,
    attack: 12,
    defense: 10,
    weightOz: 25,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Uma lâmina curva leve e ágil.',
  },
  {
    id: 2389,
    name: 'Spear',
    category: 'weapons',
    price: 10,
    attack: 25,
    defense: 0,
    range: 3,
    weightOz: 20,
    levelReq: 1,
    vocations: ['Paladin'],
    description: 'Uma lança arremessável tradicional de paladinos.',
  },
  {
    id: 2394,
    name: 'Morning Star',
    category: 'weapons',
    price: 430,
    attack: 25,
    defense: 11,
    weightOz: 54,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Uma maça pesada com cravos de aço devastadores.',
  },
  {
    id: 2550,
    name: 'Scythe',
    category: 'weapons',
    price: 50,
    attack: 6,
    defense: 4,
    weightOz: 35,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Uma foice afiada utilizada para colheitas e corte.',
  },
  {
    id: 2376,
    name: 'Sword',
    category: 'weapons',
    price: 85,
    attack: 14,
    defense: 12,
    weightOz: 35,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'A clássica espada curta de ferro.',
  },
  {
    id: 2388,
    name: 'Hatchet',
    category: 'weapons',
    price: 80,
    attack: 15,
    defense: 8,
    weightOz: 35,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Um machado compacto de corte rápido.',
  },
  {
    id: 2377,
    name: 'Two-Handed Sword',
    category: 'weapons',
    price: 950,
    attack: 30,
    defense: 20,
    weightOz: 70,
    levelReq: 20,
    vocations: ['Knight'],
    description: 'Uma espada imensa de duas mãos que inflige golpes pesados.',
  },
  {
    id: 2429,
    name: 'Barbarian Axe',
    category: 'weapons',
    price: 580,
    attack: 28,
    defense: 18,
    weightOz: 51,
    levelReq: 20,
    vocations: ['Knight'],
    description: 'Machado forjado nas terras bárbaras do norte.',
  },
  {
    id: 7438,
    name: 'Composite Bow',
    category: 'weapons',
    price: 1200,
    range: 6,
    weightOz: 38,
    levelReq: 50,
    vocations: ['Paladin'],
    description: 'Um arco composto recurvado de grande alcance e precisão.',
  },
  {
    id: 2422,
    name: 'Flail',
    category: 'weapons',
    price: 350,
    attack: 23,
    defense: 15,
    weightOz: 67,
    levelReq: 15,
    vocations: ['Knight'],
    description: 'Uma esfera de espinhos presa a uma corrente articulada.',
  },
  {
    id: 2455,
    name: 'Crossbow',
    category: 'weapons',
    price: 500,
    range: 5,
    weightOz: 40,
    levelReq: 1,
    vocations: ['Paladin'],
    description: 'Uma balestra mecânica de disparos perfurantes com bolts.',
  },
  {
    id: 2378,
    name: 'Battle Axe',
    category: 'weapons',
    price: 280,
    attack: 25,
    defense: 10,
    weightOz: 50,
    levelReq: 15,
    vocations: ['Knight'],
    description: 'Um machado de guerra com duas lâminas curvas.',
  },

  // ==========================================
  // ROW 2: MAGIC WEAPONS, HIGH-TIER & SHIELDS
  // ==========================================
  {
    id: 2191,
    name: 'Wand of Dragonbreath',
    category: 'weapons',
    price: 1000,
    attack: 19,
    weightOz: 23,
    levelReq: 13,
    vocations: ['Sorcerer'],
    description: 'Canaliza chamas ardentes do sopro de um dragão.',
  },
  {
    id: 2190,
    name: 'Wand of Vortex',
    category: 'weapons',
    price: 500,
    attack: 13,
    weightOz: 22,
    levelReq: 8,
    vocations: ['Sorcerer'],
    description: 'A primeira varinha de aprendizes arcanos, emitindo energia pura.',
  },
  {
    id: 2383,
    name: 'Spike Sword',
    category: 'weapons',
    price: 1000,
    attack: 24,
    defense: 21,
    weightOz: 41,
    levelReq: 15,
    vocations: ['Knight'],
    description: 'Uma espada serrilhada temida por sua precisão e defesa.',
  },
  {
    id: 2409,
    name: 'Serpent Sword',
    category: 'weapons',
    price: 900,
    attack: 26,
    defense: 15,
    weightOz: 41,
    levelReq: 20,
    vocations: ['Knight'],
    description: 'Lâmina ondulada forjada à semelhança de uma serpente esmeralda.',
  },
  {
    id: 2188,
    name: 'Wand of Decay',
    category: 'weapons',
    price: 5000,
    attack: 25,
    weightOz: 23,
    levelReq: 19,
    vocations: ['Sorcerer'],
    description: 'Dispara raios de morte corrosiva que decompõem o alvo.',
  },
  {
    id: 2436,
    name: 'Skull Staff',
    category: 'weapons',
    price: 6000,
    attack: 36,
    defense: 12,
    weightOz: 17,
    levelReq: 30,
    vocations: ['Knight', 'Sorcerer', 'Druid'],
    description: 'Um cajado cerimonial leve encimado por um crânio encantado.',
  },
  {
    id: 2187,
    name: 'Wand of Inferno',
    category: 'weapons',
    price: 15000,
    attack: 45,
    weightOz: 27,
    levelReq: 33,
    vocations: ['Sorcerer'],
    description: 'Convocação das labaredas do inferno em rajadas incinerantes.',
  },
  {
    id: 2183,
    name: 'Hailstorm Rod',
    category: 'weapons',
    price: 15000,
    attack: 45,
    weightOz: 27,
    levelReq: 33,
    vocations: ['Druid'],
    description: 'Conjura tempestades gélidas de granizo perfurante.',
  },
  {
    id: 8931,
    name: 'Wand of Starfall',
    category: 'weapons',
    price: 18000,
    attack: 52,
    weightOz: 29,
    levelReq: 37,
    vocations: ['Sorcerer'],
    description: 'Canaliza a fúria das estrelas cadentes em raios de energia.',
  },
  {
    id: 8929,
    name: 'Springsprout Rod',
    category: 'weapons',
    price: 18000,
    attack: 52,
    weightOz: 29,
    levelReq: 37,
    vocations: ['Druid'],
    description: 'Emite a força viva e indomável da primavera florestal.',
  },
  {
    id: 2392,
    name: 'Fire Sword',
    category: 'weapons',
    price: 4000,
    attack: 35,
    defense: 20,
    weightOz: 23,
    levelReq: 30,
    vocations: ['Knight'],
    description: 'Uma lâmina flamejante mágica que queima com fogo eterno.',
  },
  {
    id: 8928,
    name: 'Wand of Voodoo',
    category: 'weapons',
    price: 22000,
    attack: 60,
    weightOz: 30,
    levelReq: 42,
    vocations: ['Sorcerer'],
    description: 'Imbuída com rituais sombrios voodoo para infligir tormento mortal.',
  },
  {
    id: 2525,
    name: 'Dwarven Shield',
    category: 'shields',
    price: 500,
    defense: 26,
    weightOz: 55,
    levelReq: 1,
    vocations: ['all'],
    description: 'Escudo robusto e confiável forjado pelos anões de Kazordoon.',
  },
  {
    id: 2516,
    name: 'Dragon Shield',
    category: 'shields',
    price: 4000,
    defense: 31,
    weightOz: 60,
    levelReq: 25,
    vocations: ['all'],
    description: 'Escudo forjado com escamas e ossos impenetráveis de dragão.',
  },

  // ==========================================
  // ROW 3: SHIELDS, HELMETS & BASIC ARMORS
  // ==========================================
  {
    id: 2528,
    name: 'Tower Shield',
    category: 'shields',
    price: 8000,
    defense: 32,
    weightOz: 85,
    levelReq: 30,
    vocations: ['Knight', 'Paladin'],
    description: 'Um escudo maciço de torre dourado que bloqueia golpes pesados.',
  },
  {
    id: 2175,
    name: 'Spellbook',
    category: 'shields',
    price: 150,
    defense: 14,
    weightOz: 20,
    levelReq: 1,
    vocations: ['Sorcerer', 'Druid'],
    description: 'Grimório de aprendizes arcanos para canalizar feitiços.',
  },
  {
    id: 2461,
    name: 'Leather Helmet',
    category: 'helmets',
    price: 12,
    armor: 1,
    weightOz: 22,
    levelReq: 1,
    vocations: ['all'],
    description: 'Um capuz simples feito de couro curtido.',
  },
  {
    id: 2481,
    name: 'Soldier Helmet',
    category: 'helmets',
    price: 110,
    armor: 5,
    weightOz: 32,
    levelReq: 1,
    vocations: ['all'],
    description: 'Elmo padrão utilizado pela guarda municipal de Thais.',
  },
  {
    id: 2474,
    name: 'Straw Hat',
    category: 'helmets',
    price: 50,
    armor: 1,
    weightOz: 8,
    levelReq: 1,
    vocations: ['all'],
    description: 'Chapéu cônico de palha leve que protege do sol e da chuva.',
  },
  {
    id: 2473,
    name: 'Viking Helmet',
    category: 'helmets',
    price: 150,
    armor: 4,
    weightOz: 39,
    levelReq: 1,
    vocations: ['all'],
    description: 'Capacete nórdico clássico com chifres laterais intimidadores.',
  },
  {
    id: 2457,
    name: 'Steel Helmet',
    category: 'helmets',
    price: 290,
    armor: 6,
    weightOz: 46,
    levelReq: 1,
    vocations: ['all'],
    description: 'Elmo forjado em aço sólido com viseira protetora.',
  },
  {
    id: 2467,
    name: 'Leather Armor',
    category: 'armors',
    price: 35,
    armor: 4,
    weightOz: 60,
    levelReq: 1,
    vocations: ['all'],
    description: 'Armadura peitoral confeccionada em couro maleável.',
  },
  {
    id: 2484,
    name: 'Studded Armor',
    category: 'armors',
    price: 90,
    armor: 5,
    weightOz: 71,
    levelReq: 1,
    vocations: ['all'],
    description: 'Armadura de couro reforçada com rebites de metal.',
  },
  {
    id: 2464,
    name: 'Chain Armor',
    category: 'armors',
    price: 200,
    armor: 6,
    weightOz: 100,
    levelReq: 1,
    vocations: ['all'],
    description: 'Cota de malha metálica trançada que dissipa cortes.',
  },
  {
    id: 2466,
    name: 'Golden Armor',
    category: 'armors',
    price: 20000,
    armor: 14,
    weightOz: 80,
    levelReq: 35,
    vocations: ['Knight', 'Paladin'],
    description: 'Armadura lendária revestida a ouro reluzente de alta nobreza.',
  },
  {
    id: 2476,
    name: 'Knight Armor',
    category: 'armors',
    price: 5000,
    armor: 12,
    weightOz: 120,
    levelReq: 25,
    vocations: ['Knight', 'Paladin'],
    description: 'Couraça de aço polido usada pelos cavaleiros do rei.',
  },
  {
    id: 2649,
    name: 'Leather Legs',
    category: 'legs',
    price: 10,
    armor: 1,
    weightOz: 18,
    levelReq: 1,
    vocations: ['all'],
    description: 'Calças leves de couro simples.',
  },
  {
    id: 2468,
    name: 'Studded Legs',
    category: 'legs',
    price: 50,
    armor: 2,
    weightOz: 26,
    levelReq: 1,
    vocations: ['all'],
    description: 'Calças de couro cravejadas com tachas metálicas.',
  },

  // ==========================================
  // ROW 4: LEGS, SHOES & REGULAR EXERCISE WEAPONS (TIER 1 - PINK AURA)
  // ==========================================
  {
    id: 2648,
    name: 'Chain Legs',
    category: 'legs',
    price: 80,
    armor: 3,
    weightOz: 35,
    levelReq: 1,
    vocations: ['all'],
    description: 'Perneiras de cota de malha articulada.',
  },
  {
    id: 2470,
    name: 'Golden Legs',
    category: 'legs',
    price: 30000,
    armor: 9,
    weightOz: 56,
    levelReq: 35,
    vocations: ['Knight', 'Paladin'],
    description: 'Perneiras douradas majestosas com excepcional proteção.',
  },
  {
    id: 2477,
    name: 'Knight Legs',
    category: 'legs',
    price: 5000,
    armor: 8,
    weightOz: 70,
    levelReq: 25,
    vocations: ['Knight', 'Paladin'],
    description: 'Perneiras maciças de placas de aço temperado.',
  },
  {
    id: 2643,
    name: 'Leather Boots',
    category: 'shoes',
    price: 10,
    armor: 1,
    weightOz: 9,
    levelReq: 1,
    vocations: ['all'],
    description: 'Botas confortáveis de couro para caminhadas prolongadas.',
  },
  // TIER 1 EXERCISE WEAPONS (500 charges)
  {
    id: 31821,
    name: 'Exercise Sword',
    category: 'exercise',
    price: 262500,
    tier: 'regular',
    charges: 500,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Espada de treino básica (500 cargas). Acelera o treino de Sword Fighting no dummy.',
  },
  {
    id: 31822,
    name: 'Exercise Axe',
    category: 'exercise',
    price: 262500,
    tier: 'regular',
    charges: 500,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Machado de treino básico (500 cargas). Acelera o treino de Axe Fighting no dummy.',
  },
  {
    id: 31823,
    name: 'Exercise Club',
    category: 'exercise',
    price: 262500,
    tier: 'regular',
    charges: 500,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Clava de treino básica (500 cargas). Acelera o treino de Club Fighting no dummy.',
  },
  {
    id: 31824,
    name: 'Exercise Bow',
    category: 'exercise',
    price: 262500,
    tier: 'regular',
    charges: 500,
    weightOz: 10,
    vocations: ['Paladin'],
    description: 'Arco de treino básico (500 cargas). Acelera o treino de Distance Fighting no dummy.',
  },
  {
    id: 31825,
    name: 'Exercise Rod',
    category: 'exercise',
    price: 262500,
    tier: 'regular',
    charges: 500,
    weightOz: 10,
    vocations: ['Druid'],
    description: 'Cajado de treino básico (500 cargas). Acelera o treino de Magic Level para druidas.',
  },
  {
    id: 31826,
    name: 'Exercise Wand',
    category: 'exercise',
    price: 262500,
    tier: 'regular',
    charges: 500,
    weightOz: 10,
    vocations: ['Sorcerer'],
    description: 'Varinha de treino básica (500 cargas). Acelera o treino de Magic Level para magos.',
  },
  {
    id: 35279,
    name: 'Exercise Shield',
    category: 'exercise',
    price: 262500,
    tier: 'regular',
    charges: 500,
    weightOz: 10,
    vocations: ['Knight', 'Paladin'],
    description: 'Escudo de treino básico (500 cargas). Acelera o treino de Shielding no dummy.',
  },
  // TIER 2 DURABLE (CYAN AURA - Part 1)
  {
    id: 32384,
    name: 'Durable Exercise Sword',
    category: 'exercise',
    price: 945000,
    tier: 'durable',
    charges: 1800,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Espada de treino durável (1.800 cargas). Proporciona longas sessões de treino ininterrupto.',
  },
  {
    id: 32385,
    name: 'Durable Exercise Axe',
    category: 'exercise',
    price: 945000,
    tier: 'durable',
    charges: 1800,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Machado de treino durável (1.800 cargas). Proporciona longas sessões de treino ininterrupto.',
  },
  {
    id: 32386,
    name: 'Durable Exercise Club',
    category: 'exercise',
    price: 945000,
    tier: 'durable',
    charges: 1800,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Clava de treino durável (1.800 cargas). Proporciona longas sessões de treino ininterrupto.',
  },

  // ==========================================
  // ROW 5: DURABLE (CYAN) & LASTING (GREEN) EXERCISE WEAPONS
  // ==========================================
  {
    id: 32387,
    name: 'Durable Exercise Bow',
    category: 'exercise',
    price: 945000,
    tier: 'durable',
    charges: 1800,
    weightOz: 10,
    vocations: ['Paladin'],
    description: 'Arco de treino durável (1.800 cargas). Treino estendido de arco e flecha.',
  },
  {
    id: 32388,
    name: 'Durable Exercise Rod',
    category: 'exercise',
    price: 945000,
    tier: 'durable',
    charges: 1800,
    weightOz: 10,
    vocations: ['Druid'],
    description: 'Cajado de treino durável (1.800 cargas). Treino estendido de nível mágico para druidas.',
  },
  {
    id: 32389,
    name: 'Durable Exercise Wand',
    category: 'exercise',
    price: 945000,
    tier: 'durable',
    charges: 1800,
    weightOz: 10,
    vocations: ['Sorcerer'],
    description: 'Varinha de treino durável (1.800 cargas). Treino estendido de nível mágico para magos.',
  },
  {
    id: 35285,
    name: 'Durable Exercise Shield',
    category: 'exercise',
    price: 945000,
    tier: 'durable',
    charges: 1800,
    weightOz: 10,
    vocations: ['Knight', 'Paladin'],
    description: 'Escudo de treino durável (1.800 cargas). Treino estendido de defesa com escudo.',
  },
  // TIER 3 LASTING (GREEN/DARK AURA - 14,400 charges)
  {
    id: 32390,
    name: 'Lasting Exercise Sword',
    category: 'exercise',
    price: 7560000,
    tier: 'lasting',
    charges: 14400,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Espada de treino suprema duradoura (14.400 cargas). Treino contínuo e massivo de Sword.',
  },
  {
    id: 32391,
    name: 'Lasting Exercise Axe',
    category: 'exercise',
    price: 7560000,
    tier: 'lasting',
    charges: 14400,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Machado de treino supremo duradouro (14.400 cargas). Treino contínuo e massivo de Axe.',
  },
  {
    id: 32392,
    name: 'Lasting Exercise Club',
    category: 'exercise',
    price: 7560000,
    tier: 'lasting',
    charges: 14400,
    weightOz: 10,
    vocations: ['Knight'],
    description: 'Clava de treino suprema duradoura (14.400 cargas). Treino contínuo e massivo de Club.',
  },
  {
    id: 32393,
    name: 'Lasting Exercise Bow',
    category: 'exercise',
    price: 7560000,
    tier: 'lasting',
    charges: 14400,
    weightOz: 10,
    vocations: ['Paladin'],
    description: 'Arco de treino supremo duradouro (14.400 cargas). Treino contínuo e massivo de Distance.',
  },
  {
    id: 32394,
    name: 'Lasting Exercise Rod',
    category: 'exercise',
    price: 7560000,
    tier: 'lasting',
    charges: 14400,
    weightOz: 10,
    vocations: ['Druid'],
    description: 'Cajado de treino supremo duradouro (14.400 cargas). Treino massivo de Magic Level.',
  },
  {
    id: 32395,
    name: 'Lasting Exercise Wand',
    category: 'exercise',
    price: 7560000,
    tier: 'lasting',
    charges: 14400,
    weightOz: 10,
    vocations: ['Sorcerer'],
    description: 'Varinha de treino suprema duradoura (14.400 cargas). Treino massivo de Magic Level.',
  },
  {
    id: 35286,
    name: 'Lasting Exercise Shield',
    category: 'exercise',
    price: 7560000,
    tier: 'lasting',
    charges: 14400,
    weightOz: 10,
    vocations: ['Knight', 'Paladin'],
    description: 'Escudo de treino supremo duradouro (14.400 cargas). Treino massivo de Shielding.',
  },
];

/**
 * Retorna itens da loja pertencentes à categoria indicada (ou todos se 'all').
 */
export function getShopItemsByCategory(category: ShopCategoryId): ShopItemEntry[] {
  if (category === 'all') {
    return SHOP_ITEMS_CATALOG;
  }
  return SHOP_ITEMS_CATALOG.filter((item) => item.category === category);
}

/**
 * Filtra itens da loja combinando categoria, vocação e busca textual.
 */
export function filterShopItems(options: {
  category?: ShopCategoryId;
  vocation?: string;
  query?: string;
}): ShopItemEntry[] {
  const { category = 'all', vocation = 'all', query = '' } = options;
  const q = query.trim().toLowerCase();

  return SHOP_ITEMS_CATALOG.filter((item) => {
    if (category !== 'all' && item.category !== category) {
      return false;
    }
    if (vocation !== 'all' && item.vocations && item.vocations.length > 0) {
      if (!item.vocations.includes(vocation)) {
        return false;
      }
    }
    if (q !== '') {
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesDesc = item.description.toLowerCase().includes(q);
      if (!matchesName && !matchesDesc) {
        return false;
      }
    }
    return true;
  });
}

