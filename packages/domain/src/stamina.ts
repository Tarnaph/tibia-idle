export const BASE_MAX_STAMINA_MINUTES = 15; // 15 minutes base stamina
export const STAMINA_BONUS_PER_LEVEL_MINUTES = 1; // +1 minute per level over level 1 of highest char

export type StaminaMode = 'hunting' | 'training' | 'resting';

/**
 * Calculates the maximum stamina capacity in minutes based on the highest level character on the account.
 */
export function calculateMaxStamina(highestLevelOnAccount: number): number {
  const safeLevel = Math.max(1, Math.floor(highestLevelOnAccount || 1));
  return BASE_MAX_STAMINA_MINUTES + (safeLevel - 1) * STAMINA_BONUS_PER_LEVEL_MINUTES;
}

/**
 * Checks if a player can enter a hunt. Requires at least 1 minute (or > 0) stamina.
 */
export function canEnterHunt(staminaMinutes: number): boolean {
  return staminaMinutes > 0;
}

export interface StaminaTickResult {
  staminaMinutes: number;
  evicted: boolean;
  deltaMinutes: number;
}

/**
 * Ticks stamina based on state mode and delta time in seconds.
 * Rates:
 * - 'hunting': Consumes 1 stamina minute per 60 seconds (1 minute real = 1 minute stamina).
 * - 'resting': Regenerates 1 stamina minute per 180 seconds (3 minutes real = 1 minute stamina).
 * - 'training': Regenerates 1 stamina minute per 60 seconds (1 minute real = 1 minute stamina - 3x faster than resting).
 */
export function tickStamina(
  currentStaminaMinutes: number,
  maxStaminaMinutes: number,
  mode: StaminaMode,
  deltaSeconds: number
): StaminaTickResult {
  if (deltaSeconds <= 0) {
    return { staminaMinutes: currentStaminaMinutes, evicted: currentStaminaMinutes <= 0 && mode === 'hunting', deltaMinutes: 0 };
  }

  let deltaMinutes = 0;
  if (mode === 'hunting') {
    // Consume 1 minute per 60 seconds
    deltaMinutes = -(deltaSeconds / 60);
  } else if (mode === 'training') {
    // Regenerate 1 minute per 60 seconds (accelerated 3x over passive resting)
    deltaMinutes = deltaSeconds / 60;
  } else {
    // Passive resting: regenerate 1 minute per 180 seconds (3 minutes real)
    deltaMinutes = deltaSeconds / 180;
  }

  const nextStamina = Math.min(maxStaminaMinutes, Math.max(0, currentStaminaMinutes + deltaMinutes));
  const evicted = mode === 'hunting' && nextStamina <= 0;

  return {
    staminaMinutes: nextStamina,
    evicted,
    deltaMinutes,
  };
}

/**
 * Formats stamina minutes into a readable string: "MM:SS" (e.g. 15 -> "15:00", 0.5 -> "00:30").
 * For values >= 60 minutes, formats as "HH:MM".
 */
export function formatStaminaTime(staminaMinutes: number): string {
  const totalSeconds = Math.max(0, Math.floor(staminaMinutes * 60));
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const seconds = totalSeconds % 60;
  return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Returns stamina percentage (0 to 100).
 */
export function getStaminaPercentage(staminaMinutes: number, maxStaminaMinutes: number): number {
  if (maxStaminaMinutes <= 0) return 0;
  return Math.min(100, Math.max(0, (staminaMinutes / maxStaminaMinutes) * 100));
}
