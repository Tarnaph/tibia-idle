export const VIEWPORT_RADIUS_X = 15;
export const VIEWPORT_RADIUS_Y = 11;
export const LOCAL_CHAT_RADIUS = 8;
export const YELL_CHAT_RADIUS = 30;

export function isInViewport(
  entityX: number,
  entityY: number,
  observerX: number,
  observerY: number,
  radiusX: number = VIEWPORT_RADIUS_X,
  radiusY: number = VIEWPORT_RADIUS_Y
): boolean {
  return (
    Math.abs(entityX - observerX) <= radiusX &&
    Math.abs(entityY - observerY) <= radiusY
  );
}

export function isWithinDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  maxDistance: number
): boolean {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return Math.max(dx, dy) <= maxDistance;
}

export function filterEntitiesByViewport<T extends { posX: number; posY: number }>(
  entities: Iterable<T>,
  observerX: number,
  observerY: number
): T[] {
  const result: T[] = [];
  for (const entity of entities) {
    if (isInViewport(entity.posX, entity.posY, observerX, observerY)) {
      result.push(entity);
    }
  }
  return result;
}
