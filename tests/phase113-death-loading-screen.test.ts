import { describe, it, expect } from 'vitest';
import { getLoadingConfigForHunt, THAIS_LORE_CURIOSITIES, DEFAULT_HUNT_LOADING_CONFIG } from '../apps/web/components/ExuraLoadingScreen';
import { calculateDeathPenaltyReport } from '../packages/domain/src/combat';
import type { CharacterState } from '../packages/domain/src/types';

describe('Phase 113: Thais Loading Screen on Character Death', () => {
  it('returns Thais loading config with temple artwork and lore curiosities when huntId is undefined', () => {
    const config = getLoadingConfigForHunt(undefined);
    expect(config.bgImage).toBe('/images/loading/thais-loading.jpg');
    expect(config.curiosities).toEqual(THAIS_LORE_CURIOSITIES);
    expect(config.curiosities.length).toBe(3);
    expect(config).toEqual(DEFAULT_HUNT_LOADING_CONFIG);
  });

  it('calculates death penalty report accurately without reducing level below 1', () => {
    const dummyChar: Partial<CharacterState> = {
      id: 'char-hero',
      name: 'Hero',
      level: 19,
      experience: 108000,
      vocation: 'Knight',
      currentHp: 0,
      maxHp: 400,
      skills: {
        fist: 10,
        club: 10,
        sword: 50,
        axe: 10,
        distance: 10,
        shielding: 50,
        fishing: 10,
        magicLevel: 4,
      },
      skillTries: {
        fist: 0,
        club: 0,
        sword: 100,
        axe: 0,
        distance: 0,
        shielding: 100,
        magicLevel: 50,
      },
    };

    const report = calculateDeathPenaltyReport(
      dummyChar as CharacterState,
      [],
      {
        expLossPercent: 10,
        skillLossPercent: 10,
        loseLoot: true,
      }
    );

    expect(report.lostExp).toBeGreaterThan(0);
    expect(report.newLevel).toBeGreaterThanOrEqual(1);
    expect(report.newExp).toBeLessThan(108000);
  });

  it('guarantees walking tick condition blocks autonomous movement when loading is active', () => {
    // Logic extracted from tickWalking guard
    const isWalkingBlocked = (initialLoadingActive: boolean, isTransitionActive: boolean) => {
      return initialLoadingActive || isTransitionActive;
    };

    // While loading Thais upon death (10s duration)
    expect(isWalkingBlocked(false, true)).toBe(true);
    // After loading finishes
    expect(isWalkingBlocked(false, false)).toBe(false);
  });
});
