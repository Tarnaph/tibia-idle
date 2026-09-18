import { describe, it, expect } from 'vitest';
import fs from 'node:path';
import path from 'node:path';
import fsSync from 'node:fs';
import {
  PVP_TIERS,
  getPvPTierInfo,
  calculateEloDelta,
  calculateArenaRewards,
  DEFAULT_PVP_TACTICS,
} from '../packages/domain/src/pvp';

describe('Phase 192 - Skull Sprites & Visual Assets', () => {
  it('has all 6 official skull sprite files generated in public/assets/skulls', () => {
    const skullTypes = ['green', 'yellow', 'white', 'red', 'black', 'orange'];
    const skullsDir = path.resolve(process.cwd(), 'public/assets/skulls');

    for (const type of skullTypes) {
      const p1x = path.join(skullsDir, `skull-${type}.png`);
      const p2x = path.join(skullsDir, `skull-${type}-2x.png`);
      expect(fsSync.existsSync(p1x), `skull-${type}.png must exist`).toBe(true);
      expect(fsSync.existsSync(p2x), `skull-${type}-2x.png must exist`).toBe(true);
    }
  });
});

describe('Phase 192 - PvP Tiers, Elo & Skulls Domain Engine', () => {
  it('correctly maps Elo ranges to ranks and skull colors', () => {
    // 0-999: Iniciante / none
    expect(getPvPTierInfo(800).tier).toBe('Iniciante');
    expect(getPvPTierInfo(800).skull).toBe('none');

    // 1000-1249: Bronze / green skull
    expect(getPvPTierInfo(1000).tier).toBe('Bronze');
    expect(getPvPTierInfo(1000).skull).toBe('green');
    expect(getPvPTierInfo(1249).tier).toBe('Bronze');

    // 1250-1499: Prata / yellow skull
    expect(getPvPTierInfo(1250).tier).toBe('Prata');
    expect(getPvPTierInfo(1250).skull).toBe('yellow');

    // 1500-1749: Ouro / white skull
    expect(getPvPTierInfo(1500).tier).toBe('Ouro');
    expect(getPvPTierInfo(1500).skull).toBe('white');

    // 1750-1999: Platina / red skull
    expect(getPvPTierInfo(1750).tier).toBe('Platina');
    expect(getPvPTierInfo(1750).skull).toBe('red');

    // 2000-2499: Diamante / black skull
    expect(getPvPTierInfo(2000).tier).toBe('Diamante');
    expect(getPvPTierInfo(2000).skull).toBe('black');

    // 2500+ ou Top 1: Desafiante / orange skull
    expect(getPvPTierInfo(2500).tier).toBe('Desafiante');
    expect(getPvPTierInfo(2500).skull).toBe('orange');
    expect(getPvPTierInfo(2100, true).tier).toBe('Desafiante');
    expect(getPvPTierInfo(2100, true).skull).toBe('orange');
  });

  it('calculates Elo adjustments fairly using FIDE rating system', () => {
    // Vitória contra oponente com mesmo Elo
    const winDelta = calculateEloDelta(1200, 1200, 'win');
    expect(winDelta).toBeGreaterThanOrEqual(10);
    expect(winDelta).toBe(16);

    // Derrota contra oponente com mesmo Elo
    const lossDelta = calculateEloDelta(1200, 1200, 'loss');
    expect(lossDelta).toBeLessThanOrEqual(-8);
    expect(lossDelta).toBe(-16);

    // Empate contra mesmo Elo
    const drawDelta = calculateEloDelta(1200, 1200, 'draw');
    expect(drawDelta).toBe(0);

    // Vitória improvável (jogador 1000 ganha de 1400) dá mais pontos
    const underdogWin = calculateEloDelta(1000, 1400, 'win');
    expect(underdogWin).toBeGreaterThan(winDelta);

    // Derrota esperada (jogador 1000 perde de 1400) perde menos pontos
    const expectedLoss = calculateEloDelta(1000, 1400, 'loss');
    expect(Math.abs(expectedLoss)).toBeLessThan(Math.abs(lossDelta));
  });

  it('rewards Arena Coins based on sportsmanship and match outcome', () => {
    expect(calculateArenaRewards('win').arenaCoins).toBe(15);
    expect(calculateArenaRewards('draw').arenaCoins).toBe(8);
    expect(calculateArenaRewards('loss').arenaCoins).toBe(5);
  });

  it('includes 3 default tactical boards matching the reference UI', () => {
    expect(DEFAULT_PVP_TACTICS.length).toBe(3);
    expect(DEFAULT_PVP_TACTICS[0].id).toBe(1);
    expect(DEFAULT_PVP_TACTICS[0].title).toContain('Contra EK · ED · RP');
    expect(DEFAULT_PVP_TACTICS[0].formation).toBe('formação linha');
    expect(DEFAULT_PVP_TACTICS[1].id).toBe(2);
    expect(DEFAULT_PVP_TACTICS[2].id).toBe(3);
  });
});
