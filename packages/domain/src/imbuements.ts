import imbuingSlotsMap from './imbuingSlots.json';

export type ImbuementTier = 'Basic' | 'Intricate' | 'Powerful';

export interface ImbuementTierInfo {
  tier: ImbuementTier;
  value: number;
  label: string;
  cost: number;
  dots: number;
}

export interface ImbuementDefinition {
  id: string;
  name: string;
  category: string;
  stat: string;
  description: string;
  applicableCategories: Array<
    | 'sword'
    | 'axe'
    | 'club'
    | 'distance'
    | 'bow'
    | 'wand'
    | 'rod'
    | 'helmet'
    | 'armor'
    | 'shield'
    | 'boots'
    | 'backpack'
  >;
  icon: string;
  tiers: Record<ImbuementTier, ImbuementTierInfo>;
}

export interface ActiveImbuementSlot {
  slotIndex: number;
  imbuementId: string;
  name?: string;
  imbuementName?: string;
  tier: ImbuementTier;
  stat?: string;
  value: number;
  effectDescription?: string;
  label?: string;
  remainingSeconds: number;
  autoRenew: boolean;
  cost: number;
}

export type ImbuementSlotState = ActiveImbuementSlot;

export interface ItemAttributes {
  imbuements?: ActiveImbuementSlot[];
  [key: string]: any;
}

export interface AggregatedImbuementBonuses {
  skillSword: number;
  skillAxe: number;
  skillClub: number;
  skillDist: number;
  skillShield: number;
  magicLevel: number;
  lifeLeechPercent: number;
  manaLeechPercent: number;
  criticalDamagePercent: number;
  criticalChancePercent: number;
  lifeLeech: number;
  manaLeech: number;
  criticalDamage: number;
  criticalChance: number;
  speed: number;
  capacityPercent: number;
  elementalProtections: {
    earth: number;
    fire: number;
    ice: number;
    energy: number;
    death: number;
    holy: number;
  };
}

export const IMBUEMENT_TIER_COSTS: Record<ImbuementTier, number> = {
  Basic: 7500,
  Intricate: 60000,
  Powerful: 250000,
};

export const IMBUEMENT_TIER_DOTS: Record<ImbuementTier, number> = {
  Basic: 1,
  Intricate: 2,
  Powerful: 3,
};

export const IMBUEMENT_DURATION_SECONDS = 86400; // 24 hours of hunting time

export const ALL_IMBUEMENTS: ImbuementDefinition[] = [
  {
    id: 'slash',
    name: 'Slash',
    category: 'Aumento de Sword',
    stat: 'skillSword',
    description: 'Aumenta a habilidade de combate com espadas.',
    applicableCategories: ['sword', 'helmet'],
    icon: 'sword',
    tiers: {
      Basic: { tier: 'Basic', value: 1, label: 'melee +1', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 2, label: 'melee +2', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 4, label: 'melee +4', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'chop',
    name: 'Chop',
    category: 'Aumento de Axe',
    stat: 'skillAxe',
    description: 'Aumenta a habilidade de combate com machados.',
    applicableCategories: ['axe', 'helmet'],
    icon: 'axe',
    tiers: {
      Basic: { tier: 'Basic', value: 1, label: 'melee +1', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 2, label: 'melee +2', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 4, label: 'melee +4', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'bash',
    name: 'Bash',
    category: 'Aumento de Club',
    stat: 'skillClub',
    description: 'Aumenta a habilidade de combate com clavas.',
    applicableCategories: ['club', 'helmet'],
    icon: 'club',
    tiers: {
      Basic: { tier: 'Basic', value: 1, label: 'melee +1', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 2, label: 'melee +2', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 4, label: 'melee +4', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'precision',
    name: 'Precision',
    category: 'Aumento de Distance',
    stat: 'skillDist',
    description: 'Aumenta a habilidade de combate à distância.',
    applicableCategories: ['bow', 'distance', 'helmet'],
    icon: 'bow',
    tiers: {
      Basic: { tier: 'Basic', value: 1, label: 'distance +1', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 2, label: 'distance +2', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 4, label: 'distance +4', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'blockade',
    name: 'Blockade',
    category: 'Aumento de Shielding',
    stat: 'skillShield',
    description: 'Aumenta a habilidade de escudo (shielding).',
    applicableCategories: ['shield', 'helmet'],
    icon: 'shield',
    tiers: {
      Basic: { tier: 'Basic', value: 1, label: 'shielding +1', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 2, label: 'shielding +2', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 4, label: 'shielding +4', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'epiphany',
    name: 'Epiphany',
    category: 'Aumento de Magic Level',
    stat: 'magicLevel',
    description: 'Aumenta o nível mágico.',
    applicableCategories: ['wand', 'rod', 'helmet'],
    icon: 'epiphany',
    tiers: {
      Basic: { tier: 'Basic', value: 1, label: 'magic level +1', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 2, label: 'magic level +2', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 4, label: 'magic level +4', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'void',
    name: 'Void',
    category: 'Mana Leech',
    stat: 'manaLeech',
    description: 'Converte porcentagem do dano causado em mana.',
    applicableCategories: ['sword', 'axe', 'club', 'bow', 'distance', 'wand', 'rod', 'helmet'],
    icon: 'void',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'mana leech 3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 5, label: 'mana leech 5%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 8, label: 'mana leech 8%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'vampirism',
    name: 'Vampirism',
    category: 'Life Leech',
    stat: 'lifeLeech',
    description: 'Converte porcentagem do dano causado em vida.',
    applicableCategories: ['sword', 'axe', 'club', 'bow', 'distance', 'wand', 'rod', 'armor'],
    icon: 'vampirism',
    tiers: {
      Basic: { tier: 'Basic', value: 5, label: 'life leech 5%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 10, label: 'life leech 10%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 25, label: 'life leech 25%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'strike',
    name: 'Strike',
    category: 'Dano Crítico',
    stat: 'criticalDamage',
    description: 'Aumenta o dano de acerto crítico e concede 10% de chance crítica.',
    applicableCategories: ['sword', 'axe', 'club', 'bow', 'distance'],
    icon: 'strike',
    tiers: {
      Basic: { tier: 'Basic', value: 15, label: 'dano crítico +15%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 25, label: 'dano crítico +25%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 50, label: 'dano crítico +50%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'snakeskin',
    name: 'Snake Skin',
    category: 'Proteção Earth',
    stat: 'absorbEarth',
    description: 'Reduz dano de terra recebido.',
    applicableCategories: ['armor', 'shield'],
    icon: 'snakeskin',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'proteção earth +3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 8, label: 'proteção earth +8%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 15, label: 'proteção earth +15%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'hidedragon',
    name: 'Dragon Hide',
    category: 'Proteção Fire',
    stat: 'absorbFire',
    description: 'Reduz dano de fogo recebido.',
    applicableCategories: ['armor', 'shield'],
    icon: 'hidedragon',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'proteção fire +3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 8, label: 'proteção fire +8%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 15, label: 'proteção fire +15%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'quarascale',
    name: 'Quara Scale',
    category: 'Proteção Ice',
    stat: 'absorbIce',
    description: 'Reduz dano de gelo recebido.',
    applicableCategories: ['armor', 'shield'],
    icon: 'quarascale',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'proteção ice +3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 8, label: 'proteção ice +8%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 15, label: 'proteção ice +15%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'cloudfabric',
    name: 'Cloud Fabric',
    category: 'Proteção Energy',
    stat: 'absorbEnergy',
    description: 'Reduz dano de energia recebido.',
    applicableCategories: ['armor', 'shield'],
    icon: 'cloudfabric',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'proteção energy +3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 8, label: 'proteção energy +8%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 15, label: 'proteção energy +15%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'lichshroud',
    name: 'Lich Shroud',
    category: 'Proteção Death',
    stat: 'absorbDeath',
    description: 'Reduz dano de morte recebido.',
    applicableCategories: ['armor', 'shield'],
    icon: 'lichshroud',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'proteção death +3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 8, label: 'proteção death +8%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 15, label: 'proteção death +15%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'demonpresence',
    name: 'Demon Presence',
    category: 'Proteção Holy',
    stat: 'absorbHoly',
    description: 'Reduz dano sagrado recebido.',
    applicableCategories: ['armor', 'shield'],
    icon: 'demonpresence',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'proteção holy +3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 8, label: 'proteção holy +8%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 15, label: 'proteção holy +15%', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'swiftness',
    name: 'Swiftness',
    category: 'Aumento de Velocidade',
    stat: 'speed',
    description: 'Aumenta a velocidade de movimento.',
    applicableCategories: ['boots'],
    icon: 'swiftness',
    tiers: {
      Basic: { tier: 'Basic', value: 10, label: 'velocidade +10', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 15, label: 'velocidade +15', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 20, label: 'velocidade +20', cost: 250000, dots: 3 },
    },
  },
  {
    id: 'featherweight',
    name: 'Featherweight',
    category: 'Aumento de Capacidade',
    stat: 'capacity',
    description: 'Aumenta a capacidade total da mochila.',
    applicableCategories: ['backpack'],
    icon: 'featherweight',
    tiers: {
      Basic: { tier: 'Basic', value: 3, label: 'capacidade +3%', cost: 7500, dots: 1 },
      Intricate: { tier: 'Intricate', value: 8, label: 'capacidade +8%', cost: 60000, dots: 2 },
      Powerful: { tier: 'Powerful', value: 15, label: 'capacidade +15%', cost: 250000, dots: 3 },
    },
  },
];

export const CANONICAL_IMBUEMENTS = ALL_IMBUEMENTS;

const typedImbuingSlots = imbuingSlotsMap as Record<string, number>;

/**
 * Retorna a quantidade de slots de imbuement que um item possui (0 a 3).
 */
export function getItemImbuingSlots(
  item: { id?: number; serverId?: number; name?: string; slot?: string; weaponType?: string; imbuingSlots?: number } | number,
  catalog?: any[]
): number {
  const itemId = typeof item === 'number' ? item : item.serverId || item.id || 0;

  // 1. Direct property if present on item object
  if (typeof item === 'object' && item && typeof item.imbuingSlots === 'number') {
    return item.imbuingSlots;
  }

  // 2. Catalog definition lookup
  const itemObj = typeof item === 'object' && item
    ? item
    : catalog && Array.isArray(catalog)
      ? catalog.find((c) => c.id === itemId)
      : null;

  if (itemObj && typeof (itemObj as any).imbuingSlots === 'number') {
    return (itemObj as any).imbuingSlots;
  }

  // 3. Realmap items.xml extracted map lookup
  if (itemId && typedImbuingSlots[String(itemId)] !== undefined) {
    return typedImbuingSlots[String(itemId)];
  }

  if (itemObj) {
    const name = (itemObj.name || '').toLowerCase();
    const slot = (itemObj.slot || '').toLowerCase();
    const weaponType = (itemObj.weaponType || '').toLowerCase();

    // Itens conhecidos explicitamente
    if (name.includes('terra helmet') || itemId === 12645) return 1;
    if (name.includes('demon helmet')) return 2;
    if (name.includes('golden helmet')) return 2;
    if (name.includes('warrior helmet')) return 2;
    if (name.includes('crusader helmet')) return 2;
    if (name.includes('royal helmet')) return 2;
    if (name.includes('zaoan helmet')) return 1;
    if (name.includes('magic plate armor') || itemId === 2472) return 2;
    if (name.includes('dragon scale mail') || itemId === 2492) return 2;
    if (name.includes('demon armor') || itemId === 2494) return 2;
    if (name.includes('golden armor') || itemId === 2466) return 2;
    if (name.includes('plate armor') || itemId === 2463) return 1;
    if (name.includes('demon shield') || itemId === 2520) return 1;
    if (name.includes('mastermind shield') || itemId === 2514) return 1;
    if (name.includes('blessed shield') || itemId === 2523) return 2;
    if (name.includes('boots of haste') || itemId === 2195) return 1;
    if (name.includes('soft boots') || itemId === 6132) return 1;
    if (name.includes('giant sword') || itemId === 2393) return 3;
    if (name.includes('magic sword') || itemId === 2400) return 2;

    // Regras gerais por tipo de equipamento
    if (slot === 'head' || slot === 'helmet') return 1;
    if (slot === 'armor') return 1;
    if (slot === 'shield' || weaponType === 'shield') return 1;
    if (slot === 'boots' || slot === 'feet') return 1;
    if (slot === 'backpack') return 1;
    if (slot === 'hand' || slot === 'left' || slot === 'right' || slot === 'lefthand' || slot === 'righthand') {
      if (['sword', 'axe', 'club', 'distance', 'bow', 'wand', 'rod'].includes(weaponType)) {
        return 2;
      }
    }
  }

  return 0;
}

/**
 * Retorna a categoria canônica do equipamento para fins de imbuement.
 */
export function resolveItemImbuementCategory(item: {
  id?: number;
  serverId?: number;
  name?: string;
  slot?: string;
  weaponType?: string;
  twoHanded?: boolean;
}): string {
  const slot = (item.slot || '').toLowerCase();
  const weaponType = (item.weaponType || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (slot === 'head' || slot === 'helmet') return 'helmet';
  if (slot === 'armor') return 'armor';
  if (slot === 'shield' || weaponType === 'shield') return 'shield';
  if (slot === 'boots' || slot === 'feet') return 'boots';
  if (slot === 'backpack' || name.includes('backpack')) return 'backpack';
  if (weaponType === 'sword' || name.includes('sword') || name.includes('sabre') || name.includes('blade')) return 'sword';
  if (weaponType === 'axe' || name.includes('axe') || name.includes('hatchet')) return 'axe';
  if (weaponType === 'club' || name.includes('mace') || name.includes('hammer') || name.includes('staff')) return 'club';
  if (weaponType === 'distance' || weaponType === 'bow' || name.includes('bow') || name.includes('crossbow')) return 'bow';
  if (weaponType === 'wand' || name.includes('wand') || name.includes('rod')) return 'wand';

  return 'unknown';
}

/**
 * Retorna todos os imbuements compatíveis com o item informado.
 */
export function getCompatibleImbuements(item: {
  id?: number;
  serverId?: number;
  name?: string;
  slot?: string;
  weaponType?: string;
  twoHanded?: boolean;
}): ImbuementDefinition[] {
  const cat = resolveItemImbuementCategory(item);
  if (cat === 'unknown') return [];

  return ALL_IMBUEMENTS.filter((imb) => {
    return imb.applicableCategories.some((appCat) => {
      if (appCat === cat) return true;
      if (cat === 'bow' && (appCat === 'distance' || appCat === 'bow')) return true;
      if (cat === 'wand' && (appCat === 'wand' || appCat === 'rod')) return true;
      return false;
    });
  });
}

export const getApplicableImbuements = getCompatibleImbuements;

/**
 * Aplica um imbuement em um slot específico do item.
 */
export function applyImbuementToItem(
  currentImbuements: ActiveImbuementSlot[] | undefined,
  slotIndex: number,
  imbuementId: string,
  tier: ImbuementTier,
  autoRenew: boolean = false
): ActiveImbuementSlot[] {
  const imbDef = ALL_IMBUEMENTS.find((imb) => imb.id === imbuementId);
  if (!imbDef) throw new Error(`Imbuement '${imbuementId}' não encontrado.`);

  const tierInfo = imbDef.tiers[tier];
  if (!tierInfo) throw new Error(`Tier '${tier}' inválido para o imbuement '${imbuementId}'.`);

  const list = Array.isArray(currentImbuements) ? [...currentImbuements] : [];
  const existingIdx = list.findIndex((s) => s.slotIndex === slotIndex);

  const newSlot: ActiveImbuementSlot = {
    slotIndex,
    imbuementId: imbDef.id,
    name: imbDef.name,
    tier,
    stat: imbDef.stat,
    value: tierInfo.value,
    effectDescription: tierInfo.label,
    remainingSeconds: IMBUEMENT_DURATION_SECONDS,
    autoRenew,
    cost: tierInfo.cost,
  };

  if (existingIdx >= 0) {
    list[existingIdx] = newSlot;
  } else {
    list.push(newSlot);
  }

  return list.sort((a, b) => a.slotIndex - b.slotIndex);
}

/**
 * Remove o imbuement de um slot do item (Limpeza Gratuita).
 */
export function clearImbuementSlot(
  currentImbuements: ActiveImbuementSlot[] | undefined,
  slotIndex: number
): ActiveImbuementSlot[] {
  if (!Array.isArray(currentImbuements)) return [];
  return currentImbuements.filter((s) => s.slotIndex !== slotIndex);
}

/**
 * Calcula todos os bônus agregados dos imbuements ativos equipados pelo personagem.
 */
export function calculateImbuementBonuses(
  activeImbuements: ActiveImbuementSlot[]
): AggregatedImbuementBonuses {
  const bonuses: AggregatedImbuementBonuses = {
    skillSword: 0,
    skillAxe: 0,
    skillClub: 0,
    skillDist: 0,
    skillShield: 0,
    magicLevel: 0,
    lifeLeechPercent: 0,
    manaLeechPercent: 0,
    criticalDamagePercent: 0,
    criticalChancePercent: 0,
    lifeLeech: 0,
    manaLeech: 0,
    criticalDamage: 0,
    criticalChance: 0,
    speed: 0,
    capacityPercent: 0,
    elementalProtections: {
      earth: 0,
      fire: 0,
      ice: 0,
      energy: 0,
      death: 0,
      holy: 0,
    },
  };

  if (!Array.isArray(activeImbuements)) return bonuses;

  for (const imb of activeImbuements) {
    if (typeof imb.remainingSeconds === 'number' && imb.remainingSeconds <= 0) {
      continue; // Expirado
    }

    switch (imb.stat) {
      case 'skillSword':
        bonuses.skillSword += imb.value;
        break;
      case 'skillAxe':
        bonuses.skillAxe += imb.value;
        break;
      case 'skillClub':
        bonuses.skillClub += imb.value;
        break;
      case 'skillDist':
        bonuses.skillDist += imb.value;
        break;
      case 'skillShield':
        bonuses.skillShield += imb.value;
        break;
      case 'magicLevel':
        bonuses.magicLevel += imb.value;
        break;
      case 'lifeLeech':
        bonuses.lifeLeechPercent += imb.value;
        break;
      case 'manaLeech':
        bonuses.manaLeechPercent += imb.value;
        break;
      case 'criticalDamage':
      case 'critChance':
        bonuses.criticalDamagePercent += imb.value;
        bonuses.criticalChancePercent = Math.max(bonuses.criticalChancePercent, 10);
        break;
      case 'speed':
        bonuses.speed += imb.value;
        break;
      case 'capacity':
        bonuses.capacityPercent += imb.value;
        break;
      case 'absorbEarth':
        bonuses.elementalProtections.earth += imb.value;
        break;
      case 'absorbFire':
        bonuses.elementalProtections.fire += imb.value;
        break;
      case 'absorbIce':
        bonuses.elementalProtections.ice += imb.value;
        break;
      case 'absorbEnergy':
        bonuses.elementalProtections.energy += imb.value;
        break;
      case 'absorbDeath':
        bonuses.elementalProtections.death += imb.value;
        break;
      case 'absorbHoly':
        bonuses.elementalProtections.holy += imb.value;
        break;
    }
  }

  bonuses.lifeLeech = bonuses.lifeLeechPercent;
  bonuses.manaLeech = bonuses.manaLeechPercent;
  bonuses.criticalDamage = bonuses.criticalDamagePercent;
  bonuses.criticalChance = bonuses.criticalChancePercent;

  return bonuses;
}

/**
 * Decrementa o tempo dos imbuements em caçada e processa renovações automáticas debitando ouro da Party.
 */
export function tickImbuementTime(
  imbuements: ActiveImbuementSlot[],
  elapsedSeconds: number,
  partyGold: number
): {
  updated: ActiveImbuementSlot[];
  goldDeducted: number;
  renewedCount: number;
  expiredCount: number;
} {
  if (!Array.isArray(imbuements) || imbuements.length === 0) {
    return { updated: [], goldDeducted: 0, renewedCount: 0, expiredCount: 0 };
  }

  let goldDeducted = 0;
  let remainingGold = partyGold;
  let renewedCount = 0;
  let expiredCount = 0;

  const updated: ActiveImbuementSlot[] = [];

  for (const slot of imbuements) {
    const nextTime = Math.max(0, slot.remainingSeconds - elapsedSeconds);

    if (nextTime > 0) {
      updated.push({
        ...slot,
        remainingSeconds: nextTime,
      });
    } else {
      // Expirou
      if (slot.autoRenew && remainingGold >= slot.cost) {
        // Renova automaticamente
        remainingGold -= slot.cost;
        goldDeducted += slot.cost;
        renewedCount += 1;
        updated.push({
          ...slot,
          remainingSeconds: IMBUEMENT_DURATION_SECONDS,
        });
      } else {
        // Expira normalmente e remove o slot ativo
        expiredCount += 1;
      }
    }
  }

  return {
    updated,
    goldDeducted,
    renewedCount,
    expiredCount,
  };
}

/**
 * Formata os segundos restantes para o padrão do Tibia (ex: "24h00m", "22h17m", "45m").
 */
export function formatImbuementRemainingTime(seconds: number): string {
  if (seconds <= 0) return 'Expirado';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, '0')}m`;
  }
  return `${Math.max(1, minutes)}m`;
}
