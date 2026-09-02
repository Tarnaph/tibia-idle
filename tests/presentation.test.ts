import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../packages/domain/src';
import {
  calculateSessionRates,
  creatureVisualLayout,
  formatSessionDuration,
  resolveViewportMode,
  snapWorldCoordinate,
  VisualMotionTrack,
  type VisualMovementConfig,
} from '../packages/presentation/src';

const config: VisualMovementConfig = {
  tileTravelMs: 100,
  queueLeadInMs: 10,
  walkingFrameMs: 25,
};

const A = { x: 1, y: 1, z: 7 };
const B = { x: 2, y: 1, z: 7 };
const C = { x: 3, y: 1, z: 7 };

describe('visual movement presentation', () => {
  it('interpolates render position without changing authoritative logical tiles', () => {
    const logicalPosition = { ...B };
    const track = new VisualMotionTrack(A, 'east', config);
    track.enqueue(A, logicalPosition, 0);
    const halfway = track.sample(60);

    expect(halfway.renderPosition).toEqual({ x: 1.5, y: 1, z: 7 });
    expect(halfway.moving).toBe(true);
    expect(logicalPosition).toEqual(B);
  });

  it('renders only the latest committed segment instead of retaining an A-B-C queue', () => {
    const track = new VisualMotionTrack(A, 'east', config);
    track.enqueue(A, B, 0);
    track.enqueue(B, C, 80);

    const replacement = track.sample(100);
    expect(replacement.renderPosition.x).toBeCloseTo(2.1);
    expect(replacement.queuedSegments).toBe(1);
    expect(track.sample(191)).toMatchObject({ renderPosition: C, moving: false, queuedSegments: 0 });
  });

  it('does not consume or mutate deterministic combat RNG', () => {
    const rng = createSeededRng('presentation-is-not-simulation');
    const stateBefore = rng.state;
    const track = new VisualMotionTrack(A, 'east', config);
    track.enqueue(A, B, 0);
    track.enqueue(B, C, 80);
    track.sample(60);
    track.sample(130);

    expect(rng.state).toBe(stateBefore);
  });

  it('returns to idle after the last queued segment arrives', () => {
    const track = new VisualMotionTrack(A, 'east', config);
    track.enqueue(A, B, 0);
    expect(track.sample(109).moving).toBe(true);
    expect(track.sample(111)).toMatchObject({ renderPosition: B, moving: false, direction: 'east' });
  });

  it('uses a stable feet anchor and centered nameplate geometry', () => {
    expect(creatureVisualLayout).toEqual({ spriteAnchorX: 1, spriteAnchorY: 1, spriteOffsetX: 16, spriteOffsetY: 16, nameplateY: -28, hpBarY: -20, hpBarWidth: 28, footprintSize: 32 });
    expect(creatureVisualLayout.nameplateY).toBeLessThan(creatureVisualLayout.hpBarY);
  });

  it('keeps nameplate offsets stable and screen coordinates pixel-aligned during movement', () => {
    const track = new VisualMotionTrack(A, 'east', config); track.commit(A, B, 0);
    for (const now of [0, 17, 49, 83, 100]) {
      const sample = track.sample(now); const rootY = snapWorldCoordinate(sample.renderPosition.y * 32 + 16, 2);
      const nameY = rootY + creatureVisualLayout.nameplateY; const hpY = rootY + creatureVisualLayout.hpBarY;
      expect(hpY - nameY).toBe(8);
      expect(Number.isInteger(nameY * 2)).toBe(true);
      expect(Number.isInteger(hpY * 2)).toBe(true);
    }
  });
});

describe('session presentation metrics', () => {
  it('derives rates from real session counters without mutating them', () => {
    const counters = { kills: 7, damageDealt: 360, damageTaken: 90 };
    const metrics = calculateSessionRates(counters, {
      elapsedMs: 30_000,
      xpGained: 125,
      lootGained: 14,
      roomsReached: 3,
    });

    expect(metrics).toEqual({
      ...counters,
      elapsedMs: 30_000,
      xpGained: 125,
      lootGained: 14,
      roomsReached: 3,
      xpPerHour: 15_000,
      approximateDps: 12,
    });
    expect(counters).toEqual({ kills: 7, damageDealt: 360, damageTaken: 90 });
  });

  it('keeps idle rates finite and formats long sessions compactly', () => {
    expect(calculateSessionRates(
      { kills: 0, damageDealt: 0, damageTaken: 0 },
      { elapsedMs: 0, xpGained: 0, lootGained: 0, roomsReached: 0 },
    )).toMatchObject({ xpPerHour: 0, approximateDps: 0 });
    expect(formatSessionDuration(3_723_999)).toBe('01:02:03');
    expect(formatSessionDuration(-1)).toBe('00:00:00');
  });
});

describe('viewport activity mode', () => {
  it('shows the combat room only while a hunt is actively running', () => {
    expect(resolveViewportMode('running')).toBe('hunt');
    expect(resolveViewportMode('ready')).toBe('training');
    expect(resolveViewportMode('completed')).toBe('training');
    expect(resolveViewportMode('defeated')).toBe('training');
  });
});
