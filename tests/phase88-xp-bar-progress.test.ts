import { describe, expect, it } from 'vitest';
import { experienceForLevel, experienceProgress } from '../packages/domain/src';

describe('Phase 88: XP Progress Bar Tracking', () => {
  it('calculates 0% progress at exact level base experience', () => {
    const lvl10Base = experienceForLevel(10);
    const progress = experienceProgress(10, lvl10Base);
    expect(progress).toBe(0);
  });

  it('calculates exact mid-level progress as experience increases', () => {
    const lvl10Base = experienceForLevel(10);
    const lvl11Base = experienceForLevel(11);
    const midXp = lvl10Base + (lvl11Base - lvl10Base) / 2;

    const progress = experienceProgress(10, midXp);
    expect(progress).toBeCloseTo(0.5, 5);
    expect(Math.round(progress * 100)).toBe(50);
  });

  it('clamps progress correctly between 0 and 100%', () => {
    const lvl20Base = experienceForLevel(20);
    const lvl21Base = experienceForLevel(21);
    const nearNext = lvl21Base - 1;

    const progressPct = experienceProgress(20, nearNext) * 100;
    expect(progressPct).toBeGreaterThan(99);
    expect(progressPct).toBeLessThan(100);
  });
});
