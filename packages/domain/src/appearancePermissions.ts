/**
 * Regras e Matriz de Permissões de Aparência (Outfits, Addons e Montarias)
 * Baseado nas diretrizes canônicas de FIX.md:
 * - Free: Citizen, Hunter, Mage, Knight (Montarias: Rented Horse, Donkey)
 * - Premium: Os 4 Free + 17 Premium Outfits (Todas as montarias provisoriamente)
 * - Loja: Todos os demais outfits (com badge visual "Loja")
 * - GOD / GM: Acesso irrestrito a todos os trajes, addons e montarias
 */

export type OutfitTier = 'free' | 'premium' | 'store';
export type MountTier = 'free' | 'premium';

export interface UserAppearanceContext {
  isPremium?: boolean;
  role?: string;
  adminTitle?: string | null;
  premiumUntil?: Date | string | null;
}

export function isAccountPremiumActive(acc?: { isPremium?: boolean; role?: string; premiumUntil?: Date | string | null } | null): boolean {
  if (!acc) return false;
  if (acc.role === 'ADMIN') return true;
  if (acc.premiumUntil) {
    const until = typeof acc.premiumUntil === 'string' ? new Date(acc.premiumUntil) : acc.premiumUntil;
    return until.getTime() > Date.now();
  }
  return Boolean(acc.isPremium);
}

export const FREE_OUTFIT_KEYS = new Set<string>([
  'citizen',
  'hunter',
  'mage',
  'knight',
]);

export const PREMIUM_OUTFIT_KEYS = new Set<string>([
  'noble',
  'nobleman',
  'noblewoman',
  'summoner',
  'warrior',
  'barbarian',
  'druid',
  'oriental',
  'pirate',
  'assassin',
  'beggar',
  'wizard',
  'shaman',
  'norseman',
  'norsewoman',
  'nightmare',
  'jester',
  'brotherhood',
  'demon hunter',
  'demonhunter',
  'yalaharian',
]);

export const FREE_MOUNT_KEYS = new Set<string>([
  'none',
  'rented horse',
  'rented-horse',
  'rented_horse',
  '132',
  'donkey',
  'donkey_rider_south',
  '133',
]);

export function normalizeKey(str: string): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[-_]+/g, ' ');
}

export function isStaff(ctx?: UserAppearanceContext): boolean {
  if (!ctx) return false;
  if (ctx.role === 'ADMIN' || ctx.role === 'GOD' || ctx.role === 'GM') return true;
  if (ctx.adminTitle === 'GOD' || ctx.adminTitle === 'GM') return true;
  return false;
}

export function getOutfitTier(outfitNameOrId: string): OutfitTier {
  const norm = normalizeKey(outfitNameOrId);
  if (FREE_OUTFIT_KEYS.has(norm)) return 'free';
  if (PREMIUM_OUTFIT_KEYS.has(norm)) return 'premium';
  // Also check without spaces
  const noSpace = norm.replace(/\s+/g, '');
  if (FREE_OUTFIT_KEYS.has(noSpace)) return 'free';
  if (PREMIUM_OUTFIT_KEYS.has(noSpace)) return 'premium';
  return 'store';
}

export function isOutfitUnlockedFor(outfitNameOrId: string, ctx?: UserAppearanceContext): boolean {
  if (isStaff(ctx)) return true;
  const tier = getOutfitTier(outfitNameOrId);
  if (tier === 'free') return true;
  if (tier === 'premium') return !!ctx?.isPremium;
  return false; // 'store' outfits are locked until purchased
}

export function getMountTier(mountNameOrId: string): MountTier {
  const norm = normalizeKey(mountNameOrId);
  if (FREE_MOUNT_KEYS.has(norm) || FREE_MOUNT_KEYS.has(mountNameOrId.toLowerCase().trim())) {
    return 'free';
  }
  return 'premium';
}

export function isMountUnlockedFor(mountNameOrId: string, ctx?: UserAppearanceContext): boolean {
  if (isStaff(ctx)) return true;
  const tier = getMountTier(mountNameOrId);
  if (tier === 'free') return true;
  return !!ctx?.isPremium;
}

export function parseUnlockedAddons(unlockedAddonsJson?: string | null): Record<string, number[]> {
  if (!unlockedAddonsJson) return {};
  try {
    const parsed = JSON.parse(unlockedAddonsJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}
  return {};
}

export function parseCompletedQuests(completedQuestsJson?: string | null): string[] {
  if (!completedQuestsJson) return [];
  try {
    const parsed = JSON.parse(completedQuestsJson);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {}
  return [];
}

export function isAddonUnlockedFor(
  outfitNameOrId: string,
  addonNumber: 1 | 2,
  unlockedAddonsJson?: string | null,
  ctx?: UserAppearanceContext
): boolean {
  if (isStaff(ctx)) return true;
  const norm = normalizeKey(outfitNameOrId);
  const unlockedMap = parseUnlockedAddons(unlockedAddonsJson);
  const list = unlockedMap[norm] || unlockedMap[norm.replace(/\s+/g, '')];
  if (Array.isArray(list) && list.includes(addonNumber)) {
    return true;
  }
  return false;
}

export interface AddonQuestMaterial {
  itemId: number;
  name: string;
  count: number;
  monster: string;
  hunt: string;
}

export interface AddonQuestDefinition {
  id: string;
  name: string;
  outfit: string;
  addon: 1 | 2;
  rewardName: string;
  description: string;
  materials: AddonQuestMaterial[];
}

export const CITIZEN_ADDON_1_QUEST: AddonQuestDefinition = {
  id: 'citizen-addon-1',
  name: 'Primeiros Passos de um Cidadão',
  outfit: 'citizen',
  addon: 1,
  rewardName: 'Citizen — Addon 1 (Mochila)',
  description: 'Reúna materiais de diferentes criaturas pelo continente para confeccionar sua própria mochila de aventureiro.',
  materials: [
    { itemId: 10606, name: 'Bunch of Troll Hair', count: 5, monster: 'Troll', hunt: 'Troll Camp' },
    { itemId: 8859, name: 'Spider Fangs', count: 3, monster: 'Spider', hunt: 'Spider Burrow' },
    { itemId: 2230, name: 'Bone', count: 50, monster: 'Skeleton', hunt: 'Old Crypt' },
    { itemId: 10609, name: 'Lump of Dirt', count: 20, monster: 'Rotworm', hunt: 'Rotworm Cave' },
  ],
};

export const ADDON_QUESTS: AddonQuestDefinition[] = [
  CITIZEN_ADDON_1_QUEST,
];

export function getAddonQuestFor(outfitNameOrId: string, addonNumber: 1 | 2): AddonQuestDefinition | undefined {
  const norm = normalizeKey(outfitNameOrId);
  const normNoSpace = norm.replace(/\s+/g, '');
  return ADDON_QUESTS.find((q) => {
    const qNorm = normalizeKey(q.outfit);
    return (qNorm === norm || qNorm.replace(/\s+/g, '') === normNoSpace) && q.addon === addonNumber;
  });
}
