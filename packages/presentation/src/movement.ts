import type { CardinalDirection, GridPosition } from '../../domain/src';

export const LOGICAL_TICK_MS = 720;

export interface VisualMovementConfig {
  tileTravelMs: number;
  queueLeadInMs: number;
  walkingFrameMs: number;
}

export const visualMovementConfig: VisualMovementConfig = {
  tileTravelMs: LOGICAL_TICK_MS,
  queueLeadInMs: 0,
  walkingFrameMs: 180,
};

export const creatureVisualLayout = {
  spriteAnchorX: 1,
  spriteAnchorY: 1,
  spriteOffsetX: 16,
  spriteOffsetY: 12,
  nameplateY: -32,
  hpBarY: -24,
  hpBarWidth: 28,
  footprintSize: 32,
} as const;

export function snapWorldCoordinate(value: number, zoom = 2): number {
  return Math.round(value * zoom) / zoom;
}

export interface RenderPosition {
  x: number;
  y: number;
  z: number;
}

export interface MotionSample {
  renderPosition: RenderPosition;
  direction: CardinalDirection;
  moving: boolean;
  queuedSegments: number;
}

interface MotionSegment {
  from: GridPosition;
  to: GridPosition;
  startsAt: number;
  endsAt: number;
}

function samePosition(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

export function directionBetween(from: GridPosition, to: GridPosition): CardinalDirection {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX > 0 ? 'east' : 'west';
  if (deltaY !== 0) return deltaY > 0 ? 'south' : 'north';
  return 'south';
}

/**
 * Presentation-only queue. It samples committed logical tile steps without
 * writing to the domain or touching its seeded RNG.
 */
export class VisualMotionTrack {
  private anchor: GridPosition;
  private segments: MotionSegment[] = [];
  private lastDirection: CardinalDirection;
  private readonly config: VisualMovementConfig;

  constructor(
    initialPosition: GridPosition,
    initialDirection: CardinalDirection = 'south',
    config: VisualMovementConfig = visualMovementConfig,
  ) {
    this.anchor = { ...initialPosition };
    this.lastDirection = initialDirection;
    this.config = config;
  }

  reset(position: GridPosition, direction: CardinalDirection = this.lastDirection): void {
    this.anchor = { ...position };
    this.lastDirection = direction;
    this.segments = [];
  }

  reconcileCommitted(position: GridPosition, direction: CardinalDirection = this.lastDirection): void {
    const target = this.segments.at(-1)?.to ?? this.anchor;
    if (!samePosition(target, position)) this.reset(position, direction);
  }

  commit(from: GridPosition, to: GridPosition, receivedAt: number, durationMs = this.config.tileTravelMs): void {
    if (samePosition(from, to)) return;
    const current = this.segments[0];
    if (current && samePosition(current.from, from) && samePosition(current.to, to)) return;
    this.anchor = { ...from };
    this.lastDirection = directionBetween(from, to);
    this.segments = [{ from: { ...from }, to: { ...to }, startsAt: receivedAt, endsAt: receivedAt + Math.max(1, durationMs) }];
  }

  enqueue(from: GridPosition, to: GridPosition, receivedAt: number, durationMs = this.config.tileTravelMs): void {
    this.commit(from, to, receivedAt + this.config.queueLeadInMs, durationMs);
  }

  sample(now: number): MotionSample {
    while (this.segments.length > 0 && now >= this.segments[0].endsAt) {
      const completed = this.segments.shift()!;
      this.anchor = { ...completed.to };
      this.lastDirection = directionBetween(completed.from, completed.to);
    }
    const active = this.segments[0];
    if (!active || now < active.startsAt) {
      return {
        renderPosition: { ...this.anchor },
        direction: this.lastDirection,
        moving: false,
        queuedSegments: this.segments.length,
      };
    }
    const progress = Math.min(1, Math.max(0, (now - active.startsAt) / Math.max(1, active.endsAt - active.startsAt)));
    const direction = directionBetween(active.from, active.to);
    this.lastDirection = direction;
    return {
      renderPosition: {
        x: active.from.x + (active.to.x - active.from.x) * progress,
        y: active.from.y + (active.to.y - active.from.y) * progress,
        z: active.from.z + (active.to.z - active.from.z) * progress,
      },
      direction,
      moving: true,
      queuedSegments: this.segments.length,
    };
  }
}
