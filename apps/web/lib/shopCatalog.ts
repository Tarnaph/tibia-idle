export type ShopCategoryId =
  | 'all'
  | 'armors'
  | 'helmets'
  | 'legs'
  | 'shields'
  | 'weapons'
  | 'shoes';

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
 * Categorias canônicas da loja da cidade conforme FIX.md, utilizando o design de seleção de treino.
 */
export const SHOP_CATEGORIES: ShopCategoryDef[] = [
  { id: 'all', label: 'Todos', iconItemId: 2463, description: 'Todos os equipamentos disponíveis na loja da cidade' },
  { id: 'armors', label: 'Armors', iconItemId: 2463, description: 'Armaduras corporais para proteção em combate' },
  { id: 'helmets', label: 'Helmets', iconItemId: 2457, description: 'Capacetes e elmos para defesa craniana' },
  { id: 'legs', label: 'Legs', iconItemId: 2647, description: 'Calças e perneiras de combate' },
  { id: 'shields', label: 'Shields', iconItemId: 2510, description: 'Escudos de defesa corporal e livros mágicos' },
  { id: 'weapons', label: 'Weapons', iconItemId: 2376, description: 'Espadas, machados, clavas, arcos, cajados e varinhas' },
  { id: 'shoes', label: 'Shoes', iconItemId: 2643, description: 'Botas e calçados para movimentação' },
];

/**
 * Catálogo canônico da Loja da Cidade contendo estritamente os 45 itens solicitados em FIX.md.
 */
export const SHOP_ITEMS_CATALOG: ShopItemEntry[] = [
  // ==========================================
  // 1. ARMORS (5 ITENS)
  // ==========================================
  {
    id: 2467,
    name: 'Leather Armor',
    category: 'armors',
    price: 35,
    armor: 4,
    weightOz: 60,
    levelReq: 1,
    description: 'Armadura leve de couro curtido para aventureiros iniciantes.',
  },
  {
    id: 2484,
    name: 'Studded Armor',
    category: 'armors',
    price: 90,
    armor: 5,
    weightOz: 71,
    levelReq: 1,
    description: 'Armadura reforçada com tachas de metal para maior resistência.',
  },
  {
    id: 2464,
    name: 'Chain Armor',
    category: 'armors',
    price: 200,
    armor: 6,
    weightOz: 100,
    levelReq: 1,
    description: 'Cota de malha metálica entrelaçada de boa proteção.',
  },
  {
    id: 2465,
    name: 'Brass Armor',
    category: 'armors',
    price: 450,
    armor: 8,
    weightOz: 80,
    levelReq: 1,
    description: 'Armadura completa forjada em latão brilhante.',
  },
  {
    id: 2463,
    name: 'Plate Armor',
    category: 'armors',
    price: 1200,
    armor: 10,
    weightOz: 120,
    levelReq: 1,
    description: 'Armadura sólida de placas de aço, clássica para combate corpo a corpo.',
  },

  // ==========================================
  // 2. LEGS (5 ITENS)
  // ==========================================
  {
    id: 2649,
    name: 'Leather Legs',
    category: 'legs',
    price: 25,
    armor: 1,
    weightOz: 18,
    levelReq: 1,
    description: 'Calças simples confeccionadas em couro leve.',
  },
  {
    id: 2468,
    name: 'Studded Legs',
    category: 'legs',
    price: 50,
    armor: 2,
    weightOz: 26,
    levelReq: 1,
    description: 'Perneiras de couro guarnecidas com rebites metálicos.',
  },
  {
    id: 2648,
    name: 'Chain Legs',
    category: 'legs',
    price: 80,
    armor: 3,
    weightOz: 35,
    levelReq: 1,
    description: 'Perneiras flexíveis de cota de malha de ferro.',
  },
  {
    id: 2478,
    name: 'Brass Legs',
    category: 'legs',
    price: 195,
    armor: 5,
    weightOz: 38,
    levelReq: 1,
    description: 'Calças protetoras de latão com boa cobertura de defesa.',
  },
  {
    id: 2647,
    name: 'Plate Legs',
    category: 'legs',
    price: 500,
    armor: 7,
    weightOz: 50,
    levelReq: 1,
    description: 'Perneiras reforçadas de placas de ferro.',
  },

  // ==========================================
  // 3. SHOES (1 ITEM)
  // ==========================================
  {
    id: 2643,
    name: 'Leather Boots',
    category: 'shoes',
    price: 10,
    armor: 1,
    weightOz: 9,
    levelReq: 1,
    description: 'Botas confortáveis de couro para caminhadas e expedições.',
  },

  // ==========================================
  // 4. HELMETS (5 ITENS)
  // ==========================================
  {
    id: 2461,
    name: 'Leather Helmet',
    category: 'helmets',
    price: 12,
    armor: 1,
    weightOz: 22,
    levelReq: 1,
    description: 'Capacete macio de couro para proteção craniana básica.',
  },
  {
    id: 2482,
    name: 'Studded Helmet',
    category: 'helmets',
    price: 63,
    armor: 2,
    weightOz: 24,
    levelReq: 1,
    description: 'Elmo reforçado com pinos de metal.',
  },
  {
    id: 2460,
    name: 'Brass Helmet',
    category: 'helmets',
    price: 120,
    armor: 3,
    weightOz: 27,
    levelReq: 1,
    description: 'Elmo fundido em latão com visibilidade limpa.',
  },
  {
    id: 2473,
    name: 'Viking Helmet',
    category: 'helmets',
    price: 260,
    armor: 4,
    weightOz: 39,
    levelReq: 1,
    description: 'Elmo guerreiro nórdico de aço resistente.',
  },
  {
    id: 2457,
    name: 'Steel Helmet',
    category: 'helmets',
    price: 580,
    armor: 6,
    weightOz: 46,
    levelReq: 1,
    description: 'Elmo fechado e forjado em aço maciço de alta defesa.',
  },

  // ==========================================
  // 5. SHIELD (4 ITENS)
  // ==========================================
  {
    id: 2526,
    name: 'Studded Shield',
    category: 'shields',
    price: 50,
    defense: 15,
    weightOz: 33,
    levelReq: 1,
    description: 'Escudo leve de madeira revestido de couro com tachas.',
  },
  {
    id: 2511,
    name: 'Brass Shield',
    category: 'shields',
    price: 65,
    defense: 16,
    weightOz: 60,
    levelReq: 1,
    description: 'Escudo arredondado esculpido em latão.',
  },
  {
    id: 2510,
    name: 'Plate Shield',
    category: 'shields',
    price: 125,
    defense: 17,
    weightOz: 65,
    levelReq: 1,
    description: 'Escudo defensivo clássico de placa de metal com brasão.',
  },
  {
    id: 2175,
    name: 'Spellbook',
    category: 'shields',
    price: 150,
    defense: 14,
    weightOz: 18,
    levelReq: 1,
    vocations: ['Sorcerer', 'Druid'],
    description: 'Livro de magias arcano que auxilia na defesa física de conjuradores.',
  },

  // ==========================================
  // 6. WEAPONS (25 ITENS)
  // ==========================================
  {
    id: 2380,
    name: 'Hand Axe',
    category: 'weapons',
    price: 8,
    attack: 10,
    defense: 5,
    weightOz: 18,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Machadinha de mão leve e fácil de manusear.',
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
    description: 'Espada curva de corte rápido e ágil.',
  },
  {
    id: 2389,
    name: 'Spear',
    category: 'weapons',
    price: 10,
    attack: 25,
    range: 3,
    weightOz: 20,
    levelReq: 1,
    vocations: ['Paladin'],
    description: 'Lança de arremesso pontiaguda para combate à distância.',
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
    description: 'Maça sólida com cabeça de impacto pesado.',
  },
  {
    id: 2550,
    name: 'Scythe',
    category: 'weapons',
    price: 50,
    attack: 8,
    defense: 3,
    weightOz: 30,
    levelReq: 1,
    description: 'Foice aguçada usada tanto para corte de vegetação quanto autodefesa.',
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
    description: 'Espada clássica de lâmina reta e guarda dupla.',
  },
  {
    id: 2388,
    name: 'Hatchet',
    category: 'weapons',
    price: 85,
    attack: 15,
    defense: 8,
    weightOz: 35,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Machado rústico com gume bem afiado.',
  },
  {
    id: 2397,
    name: 'Longsword',
    category: 'weapons',
    price: 160,
    attack: 17,
    defense: 14,
    weightOz: 42,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Espada longa com excelente equilíbrio e alcance.',
  },
  {
    id: 2428,
    name: 'Orcish Axe',
    category: 'weapons',
    price: 500,
    attack: 23,
    defense: 12,
    weightOz: 45,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Machado forjado com técnicas orcs de destruição brutal.',
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
    description: 'Clava cravada com espigões de aço perfurantes.',
  },
  {
    id: 2456,
    name: 'Bow',
    category: 'weapons',
    price: 150,
    range: 6,
    weightOz: 31,
    levelReq: 1,
    vocations: ['Paladin'],
    description: 'Arco básico de madeira para disparo de flechas.',
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
    description: 'Besta de tensão mecânica para parafusos e virotes perfurantes.',
  },
  {
    id: 2387,
    name: 'Double Axe',
    category: 'weapons',
    price: 800,
    attack: 35,
    defense: 12,
    weightOz: 70,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Machado poderoso de lâmina dupla para combate contundente.',
  },
  {
    id: 2191,
    name: 'Wand of Dragonbreath',
    category: 'weapons',
    price: 1000,
    range: 3,
    weightOz: 23,
    levelReq: 13,
    vocations: ['Sorcerer'],
    description: 'Varinha elemental que projeta baforadas ardentes de fogo.',
  },
  {
    id: 2186,
    name: 'Moonlight Rod',
    category: 'weapons',
    price: 1000,
    range: 3,
    weightOz: 21,
    levelReq: 13,
    vocations: ['Druid'],
    description: 'Cajado sagrado iluminado pelo brilho da lua (gelo).',
  },
  {
    id: 2413,
    name: 'Broadsword',
    category: 'weapons',
    price: 1500,
    attack: 26,
    defense: 23,
    weightOz: 52,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Espada de folha larga e afiada, com grande capacidade defensiva.',
  },
  {
    id: 2409,
    name: 'Serpent Sword',
    category: 'weapons',
    price: 2500,
    attack: 18,
    defense: 15,
    weightOz: 41,
    levelReq: 1,
    vocations: ['Knight'],
    description: 'Espada com lâmina ondulada em formato de serpente venenosa.',
  },
  {
    id: 2188,
    name: 'Wand of Decay',
    category: 'weapons',
    price: 5000,
    range: 3,
    weightOz: 23,
    levelReq: 19,
    vocations: ['Sorcerer'],
    description: 'Varinha corrompida que canaliza disparos pútridos de morte.',
  },
  {
    id: 2185,
    name: 'Necrotic Rod',
    category: 'weapons',
    price: 5000,
    range: 3,
    weightOz: 23,
    levelReq: 19,
    vocations: ['Druid'],
    description: 'Cajado impregnado de energias necróticas arcanas.',
  },
  {
    id: 8921,
    name: 'Wand of Draconia',
    category: 'weapons',
    price: 7500,
    range: 3,
    weightOz: 27,
    levelReq: 22,
    vocations: ['Sorcerer'],
    description: 'Varinha esculpida em ossos dracônicos de fogo intenso.',
  },
  {
    id: 8911,
    name: 'Northwind Rod',
    category: 'weapons',
    price: 7500,
    range: 3,
    weightOz: 27,
    levelReq: 22,
    vocations: ['Druid'],
    description: 'Cajado invernal que canaliza o sopro dos ventos do norte.',
  },
  {
    id: 2189,
    name: 'Wand of Cosmic Energy',
    category: 'weapons',
    price: 10000,
    range: 3,
    weightOz: 25,
    levelReq: 26,
    vocations: ['Sorcerer'],
    description: 'Varinha que canaliza energias etéreas concentradas.',
  },
  {
    id: 2181,
    name: 'Terra Rod',
    category: 'weapons',
    price: 10000,
    range: 3,
    weightOz: 26,
    levelReq: 26,
    vocations: ['Druid'],
    description: 'Cajado telúrico sintonizado com a força da terra.',
  },
  {
    id: 2187,
    name: 'Wand of Inferno',
    category: 'weapons',
    price: 15000,
    range: 3,
    weightOz: 27,
    levelReq: 33,
    vocations: ['Sorcerer'],
    description: 'Varinha flamejante forjada nas chamas mais profundas do inferno.',
  },
  {
    id: 2183,
    name: 'Hailstorm Rod',
    category: 'weapons',
    price: 15000,
    range: 3,
    weightOz: 27,
    levelReq: 33,
    vocations: ['Druid'],
    description: 'Cajado que desencadeia tempestades de granizo gélido.',
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
