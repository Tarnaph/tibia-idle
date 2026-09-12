import {
  getOutfitCapabilities,
  normalizeOutfitId,
  normalizeMountId,
  OUTFITS_MAX_FRAMES_3,
} from './outfitRecolor';

export interface CharacterAppearanceDescriptor {
  outfit?: string;
  mount?: string;
  mountActive?: boolean;
}

/**
 * Deterministic calculation of whether a character is effectively mounted.
 * Requirements:
 * 1. mountActive must be true.
 * 2. mount must be defined, not empty, and not 'none'.
 * 3. The character's outfit must support a mount rider (e.g. Sire does not).
 */
export function isCharacterMounted(char?: CharacterAppearanceDescriptor | null): boolean {
  if (!char) return false;
  const isMntActive = Boolean(char.mountActive);
  if (!isMntActive) return false;

  const mountId = normalizeMountId(char.mount || 'none');
  if (mountId === 'none' || mountId === '') return false;

  const caps = getOutfitCapabilities(char.outfit || 'knight');
  return Boolean(caps.hasMountRider);
}

/**
 * Checks if a given outfit supports riding a mount.
 */
export function canOutfitHaveMount(outfitId: string): boolean {
  const caps = getOutfitCapabilities(outfitId || 'knight');
  return Boolean(caps.hasMountRider);
}

/**
 * Calculates the safe frame for rendering walk cycles.
 * 3-frame outfits (noble, paladin, sire, sorcerer) clamp to 1..2.
 * 9-frame outfits (citizen, knight, hunter, mage, etc.) support 1..8.
 */
export function getSafeWalkFrame(outfitId: string, frame: number): number {
  const norm = normalizeOutfitId(outfitId);
  const is3Frame = OUTFITS_MAX_FRAMES_3.has(norm);
  if (is3Frame) {
    if (frame === 0) return 0;
    return ((Math.abs(frame) - 1) % 2) + 1;
  }
  return Math.max(0, Math.min(8, frame));
}

/**
 * Provides a user-friendly status label for the mount checkbox/badge.
 */
export function formatMountStatusLabel(
  outfitId: string,
  mountName: string,
  isMounted: boolean
): string {
  if (!canOutfitHaveMount(outfitId)) {
    return 'Montaria (Sem suporte neste traje)';
  }
  if (!isMounted || !mountName || mountName === 'Sem Montaria') {
    return 'Montaria (Desativada)';
  }
  return `Montaria: ${mountName}`;
}
