/**
 * Mapeamento Canônico Oficial de Assets do Cavebound / TibiaWeb
 * 
 * Este módulo centraliza a resolução de URLs públicas de todos os assets visuais do jogo,
 * garantindo compatibilidade entre os diretórios gerados (public/generated) e a pasta oficial (public/assets).
 */

export const ASSET_BASE_DIRS = {
  items: '/generated/cyclopedia/items',
  itemsTibia1098: '/generated/tibia1098/items',
  itemsOfficial: '/assets/items',
  outfits: '/generated/outfits',
  outfitThumbs: '/generated/outfit-thumbs',
  outfitsOfficial: '/assets/outfits',
  mounts: '/generated/mounts',
  mountsOfficial: '/assets/mounts',
  bestiary: '/generated/bestiary',
  monstersOfficial: '/assets/monsters',
  spells: '/spells',
  spellsCanonical: '/spells/canonical',
  spellsOfficial: '/assets/spells',
  runes: '/runes',
  runesOfficial: '/assets/runes',
  potions: '/potions',
  potionsOfficial: '/assets/potions',
  hunts: '/images/hunts',
  huntsOfficial: '/assets/hunts',
  avatars: '/images/avatars',
  avatarsOfficial: '/assets/avatars',
  loading: '/images/loading',
  loadingOfficial: '/assets/loading',
} as const;

/**
 * Resolve a URL canônica para o sprite de um item a partir do seu Server ID
 */
export function getCanonicalItemUrl(itemId: number | string): string {
  const numId = typeof itemId === 'number' ? itemId : Number(itemId);
  return `/generated/cyclopedia/items/item-${numId}.png`;
}

/**
 * Resolve a URL de um feitiço pelo seu nome normalizado ou ID canônico
 */
export function getCanonicalSpellUrl(nameOrId: string | number): string {
  if (typeof nameOrId === 'number') {
    return `/spells/canonical/spell-${nameOrId}.png`;
  }
  const cleanName = nameOrId.toLowerCase().trim().replace(/\s+/g, '-');
  return `/spells/${cleanName}.png`;
}

/**
 * Resolve a URL de uma runa
 */
export function getCanonicalRuneUrl(runeName: string): string {
  const clean = runeName.toLowerCase().trim().replace(/\s+/g, '-');
  const filename = clean.endsWith('-rune') ? clean : `${clean}-rune`;
  return `/runes/${filename}.png`;
}

/**
 * Resolve a URL de uma poção
 */
export function getCanonicalPotionUrl(potionName: string): string {
  const clean = potionName.toLowerCase().trim().replace(/\s+/g, '-');
  const filename = clean.endsWith('-potion') ? clean : `${clean}-potion`;
  return `/potions/${filename}.png`;
}

/**
 * Resolve a URL de um monstro / criatura do bestiário
 */
export function getCanonicalMonsterUrl(monsterId: string): string {
  const clean = monsterId.toLowerCase().trim().replace(/\s+/g, '-');
  return `/generated/bestiary/${clean}.png`;
}

/**
 * Resolve a URL da imagem de capa de uma caçada
 */
export function getCanonicalHuntUrl(huntId: string): string {
  return `/images/hunts/${huntId}.jpg`;
}

/**
 * Resolve a URL de um avatar de perfil
 */
export function getCanonicalAvatarUrl(avatarId: number = 1): string {
  return `/images/avatars/avatar-${avatarId}.png`;
}

/**
 * Matriz canônica de coordenadas 3x3 para cada uma das 8 direções de projéteis (missiles) no Tibia:
 * x: 0 (West), 1 (Center), 2 (East)
 * y: 0 (North), 1 (Center), 2 (South)
 */
export const MISSILE_DIRECTION_PATTERNS: Record<string, { x: number; y: number }> = {
  'north-west': { x: 0, y: 0 },
  'north':      { x: 1, y: 0 },
  'north-east': { x: 2, y: 0 },
  'west':       { x: 0, y: 1 },
  'east':       { x: 2, y: 1 },
  'south-west': { x: 0, y: 2 },
  'south':      { x: 1, y: 2 },
  'south-east': { x: 2, y: 2 },
};

/**
 * Resolve o frame exato do projétil a partir do mapeamento de assets e da direção do voo.
 * Garante que a ponta da flecha/spear/bolt nunca fique invertida ou de costas para o atirador.
 */
export function resolveMissileFrame<T extends { direction?: string; pattern?: { x: number; y: number }; publicUrl: string }>(
  mapping?: { frames?: T[] } | null,
  direction?: string
): T | undefined {
  if (!mapping || !mapping.frames || mapping.frames.length === 0) return undefined;
  if (direction) {
    const targetPattern = MISSILE_DIRECTION_PATTERNS[direction];
    if (targetPattern) {
      const matched = mapping.frames.find(
        (f) => f.pattern && f.pattern.x === targetPattern.x && f.pattern.y === targetPattern.y
      );
      if (matched) return matched;
    }
    const matchedByDir = mapping.frames.find((f) => f.direction === direction);
    if (matchedByDir) return matchedByDir;
  }
  return mapping.frames[0];
}
