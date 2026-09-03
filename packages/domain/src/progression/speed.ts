export const TIBIA_BASE_SPEED = 220;
export const TIBIA_SPEED_A = 857.36;
export const TIBIA_SPEED_B = 261.29;
export const TIBIA_SPEED_C = -4795.01;

/**
 * Calculates authentic creature/player speed based on level and base vocation speed.
 * Formula from TFS (realmap11/src/player.h):
 *   baseSpeed = vocation->getBaseSpeed() + (2 * (level - 1));
 */
export function calculatePlayerSpeed(level: number, baseSpeed = TIBIA_BASE_SPEED): number {
  return baseSpeed + 2 * (Math.max(1, level) - 1);
}

/**
 * Calculates authentic step duration in milliseconds based on speed and ground speed.
 * Formula from TFS (realmap11/src/creature.cpp):
 *   calculatedStepSpeed = floor((speedA * log((stepSpeed / 2) + speedB) + speedC) + 0.5);
 *   duration = floor(1000 * groundSpeed / calculatedStepSpeed);
 *   stepDuration = ceil(duration / 50) * 50;
 */
export function calculateStepDurationMs(speed: number, groundSpeed = 150): number {
  let calculatedStepSpeed = 1;
  if (speed > -TIBIA_SPEED_B) {
    calculatedStepSpeed = Math.floor(TIBIA_SPEED_A * Math.log(speed / 2 + TIBIA_SPEED_B) + TIBIA_SPEED_C + 0.5);
    if (calculatedStepSpeed <= 0) calculatedStepSpeed = 1;
  }

  const duration = Math.floor((1000 * groundSpeed) / calculatedStepSpeed);
  const stepDuration = Math.ceil(duration / 50) * 50;
  return Math.max(80, stepDuration);
}
