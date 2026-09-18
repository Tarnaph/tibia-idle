import { describe, it, expect } from 'vitest';
import {
  isDirectionalSpell,
  calculateDeathProtection,
  calculateMissingBlessingsCost,
  getMissingBlessingIds,
  buyBlessing,
  buyAllMissingBlessings,
  calculateDeathPenaltyReport,
  respawnInTemple,
  createIdleGame,
  DEFAULT_BLESSING_COST,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 190 - Spell Classification & Directional Wave Check', () => {
  it('correctly classifies exori hur (Whirlwind Throw) as NOT directional', () => {
    expect(isDirectionalSpell('exori hur')).toBe(false);
    expect(isDirectionalSpell('Whirlwind Throw')).toBe(false);
    expect(isDirectionalSpell('whirlwind throw')).toBe(false);
    expect(isDirectionalSpell('utani hur')).toBe(false);
    expect(isDirectionalSpell('exori')).toBe(false);
    expect(isDirectionalSpell('exori gran')).toBe(false);
    expect(isDirectionalSpell('exori min')).toBe(false);
  });

  it('correctly identifies actual directional waves and beams', () => {
    expect(isDirectionalSpell('exevo flam hur')).toBe(true);
    expect(isDirectionalSpell('exevo frigo hur')).toBe(true);
    expect(isDirectionalSpell('exevo tera hur')).toBe(true);
    expect(isDirectionalSpell('exevo vis hur')).toBe(true);
    expect(isDirectionalSpell('Energy Wave')).toBe(true);
    expect(isDirectionalSpell('Energy Beam')).toBe(true);
    expect(isDirectionalSpell('Great Energy Beam')).toBe(true);
    expect(isDirectionalSpell('Fire Wave')).toBe(true);
    expect(isDirectionalSpell('Ice Wave')).toBe(true);
    expect(isDirectionalSpell('Terra Wave')).toBe(true);
  });
});

describe('Phase 190 - Blessings Domain & Protection Mechanics', () => {
  it('calculates death protection correctly for 0 blessings', () => {
    const report = calculateDeathProtection([]);
    expect(report.blessingsCount).toBe(0);
    expect(report.lossReductionPercent).toBe(0);
    expect(report.effectiveLossRatio).toBe(1.0);
    expect(report.equipLossChancePercent).toBe(10);
    expect(report.summaryText).toBe('Você não tem nenhuma blessing.');
  });

  it('calculates death protection correctly for 5 blessings', () => {
    const report = calculateDeathProtection([1, 2, 3, 4, 5]);
    expect(report.blessingsCount).toBe(5);
    expect(report.lossReductionPercent).toBe(40);
    expect(report.effectiveLossRatio).toBe(0.60);
    expect(report.equipLossChancePercent).toBe(0);
    expect(report.summaryText).toBe('Você está totalmente abençoado.');
  });

  it('calculates partial death protection for 1 to 4 blessings', () => {
    const r1 = calculateDeathProtection([1]);
    expect(r1.blessingsCount).toBe(1);
    expect(r1.lossReductionPercent).toBe(8);
    expect(r1.effectiveLossRatio).toBe(0.92);
    expect(r1.equipLossChancePercent).toBe(8);

    const r3 = calculateDeathProtection([1, 2, 3]);
    expect(r3.blessingsCount).toBe(3);
    expect(r3.lossReductionPercent).toBe(24);
    expect(r3.effectiveLossRatio).toBe(0.76);
    expect(r3.equipLossChancePercent).toBe(4);
  });

  it('calculates missing blessings and costs', () => {
    expect(getMissingBlessingIds([])).toEqual([1, 2, 3, 4, 5]);
    expect(calculateMissingBlessingsCost([])).toBe(5 * DEFAULT_BLESSING_COST);
    expect(calculateMissingBlessingsCost([])).toBe(259_000);

    expect(getMissingBlessingIds([1, 3, 5])).toEqual([2, 4]);
    expect(calculateMissingBlessingsCost([1, 3, 5])).toBe(2 * DEFAULT_BLESSING_COST);
    expect(calculateMissingBlessingsCost([1, 3, 5])).toBe(103_600);

    expect(getMissingBlessingIds([1, 2, 3, 4, 5])).toEqual([]);
    expect(calculateMissingBlessingsCost([1, 2, 3, 4, 5])).toBe(0);
  });
});

describe('Phase 190 - Blessings Transactions & Purchasing', () => {
  it('allows purchasing individual blessings with sufficient gold', () => {
    const state = createIdleGame('test-seed-1', content);
    state.session.gold = 100_000;
    const char = state.session.characters[0];
    char.blessings = [];

    const res = buyBlessing(state, char.id, 1, DEFAULT_BLESSING_COST);
    expect(res.ok).toBe(true);
    expect(res.costPaid).toBe(51_800);
    expect(res.state.session.gold).toBe(100_000 - 51_800);

    const updatedChar = res.state.session.characters.find((c) => c.id === char.id);
    expect(updatedChar?.blessings).toEqual([1]);
  });

  it('rejects purchasing an already owned blessing', () => {
    const state = createIdleGame('test-seed-2', content);
    state.session.gold = 100_000;
    const char = state.session.characters[0];
    char.blessings = [1];

    const res = buyBlessing(state, char.id, 1);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('já possui');
  });

  it('rejects purchasing without enough gold', () => {
    const state = createIdleGame('test-seed-3', content);
    state.session.gold = 1_000;
    const char = state.session.characters[0];
    char.blessings = [];

    const res = buyBlessing(state, char.id, 1);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Gold insuficiente');
  });

  it('allows bulk purchasing all missing blessings', () => {
    const state = createIdleGame('test-seed-4', content);
    state.session.gold = 300_000;
    const char = state.session.characters[0];
    char.blessings = [1]; // Has 1, missing 4

    const res = buyAllMissingBlessings(state, char.id);
    expect(res.ok).toBe(true);
    expect(res.costPaid).toBe(4 * 51_800); // 207_200
    expect(res.state.session.gold).toBe(300_000 - 207_200);

    const updatedChar = res.state.session.characters.find((c) => c.id === char.id);
    expect(updatedChar?.blessings).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Phase 190 - Death Penalties & Consumption of Blessings', () => {
  it('applies 40% reduction to death penalties when fully blessed', () => {
    const state = createIdleGame('test-seed-5', content);
    const char = state.session.characters[0];
    char.level = 100;
    char.experience = 10_000_000;
    char.promotion = null;
    char.vocation = 'Knight';

    // Sem blessings: 10% perda de 10.000.000 = 1.000.000
    char.blessings = [];
    const unblessedReport = calculateDeathPenaltyReport(char, [], { expLossPercent: 10 });
    expect(unblessedReport.expPercent).toBe(10);
    expect(unblessedReport.lostExp).toBe(1_000_000);
    expect(unblessedReport.consumedBlessingsCount).toBe(0);

    // Com 5 blessings: 40% de redução -> 60% da perda normal -> 6% perda = 600.000
    char.blessings = [1, 2, 3, 4, 5];
    const blessedReport = calculateDeathPenaltyReport(char, [], { expLossPercent: 10 });
    expect(blessedReport.expPercent).toBe(6);
    expect(blessedReport.lostExp).toBe(600_000);
    expect(blessedReport.consumedBlessingsCount).toBe(5);
  });

  it('respawnInTemple consumes all blessings upon death', () => {
    const state = createIdleGame('test-seed-6', content);
    const char = state.session.characters[0];
    char.blessings = [1, 2, 3, 4, 5];

    const respawned = respawnInTemple(state, { expLossPercent: 10, skillLossPercent: 10, loseLoot: true }, content);
    const respawnedChar = respawned.session.characters.find((c) => c.id === char.id);

    expect(respawnedChar?.blessings).toEqual([]);
  });
});
