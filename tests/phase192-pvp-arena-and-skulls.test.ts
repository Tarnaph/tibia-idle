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
    // 0-249: Iniciante / none
    expect(getPvPTierInfo(200).tier).toBe('Iniciante');
    expect(getPvPTierInfo(200).skull).toBe('none');

    // 250-499: Bronze / green skull
    expect(getPvPTierInfo(250).tier).toBe('Bronze');
    expect(getPvPTierInfo(250).skull).toBe('green');
    expect(getPvPTierInfo(499).tier).toBe('Bronze');

    // 500-749: Prata / yellow skull
    expect(getPvPTierInfo(500).tier).toBe('Prata');
    expect(getPvPTierInfo(500).skull).toBe('yellow');

    // 750-999: Ouro / white skull
    expect(getPvPTierInfo(750).tier).toBe('Ouro');
    expect(getPvPTierInfo(750).skull).toBe('white');

    // 1000-1249: Platina / red skull
    expect(getPvPTierInfo(1000).tier).toBe('Platina');
    expect(getPvPTierInfo(1000).skull).toBe('red');

    // 1250-1499: Diamante / black skull
    expect(getPvPTierInfo(1250).tier).toBe('Diamante');
    expect(getPvPTierInfo(1250).skull).toBe('black');

    // 1500+ ou Top 1: Desafiante / orange skull
    expect(getPvPTierInfo(1500).tier).toBe('Desafiante');
    expect(getPvPTierInfo(1500).skull).toBe('orange');
    expect(getPvPTierInfo(1300, true).tier).toBe('Desafiante');
    expect(getPvPTierInfo(1300, true).skull).toBe('orange');
  });

  it('calculates points adjustments according to FIX.md rules (+20 per win)', () => {
    expect(calculateEloDelta('win')).toBe(20);
    expect(calculateEloDelta('loss')).toBe(0);
    expect(calculateEloDelta('draw')).toBe(5);
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
