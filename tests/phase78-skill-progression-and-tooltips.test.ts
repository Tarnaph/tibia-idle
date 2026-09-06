import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  deriveStats,
  getSkillTooltipInfo,
  initialHunts,
  type GameContent,
} from '../packages/domain/src';
import equipmentJson from '../content/generated/equipment.json';
import itemEconomyJson from '../content/generated/item-economy.json';
import monstersJson from '../content/generated/monsters.json';
import starterLoadoutsJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';

const content: GameContent = {
  monsters: (monstersJson as any).monsters,
  equipment: (equipmentJson as any).items,
  vocations: (vocationsJson as any).vocations,
  starterLoadouts: (starterLoadoutsJson as any).loadouts,
  spells: (spellsJson as any).spells,
  huntRegions: (huntRegionsJson as any).regions,
  economy: itemEconomyJson as any,
  hunts: initialHunts,
  rateSkill: (vocationsJson as any).rateSkill,
  rateMagic: (vocationsJson as any).rateMagic,
};

describe('Phase 78: Auditoria de Progressão de Skills, Bônus por Atributo & Tooltips UI', () => {
  it('calcula corretamente o bônus de velocidade de ataque e intervalo reduzido para skills físicas', () => {
    const state = createIdleGame('test-seed', content);
    const char = state.session.characters[0];
    const vocation = content.vocations.find((v) => v.name === char.vocation)!;

    // Set Sword skill to 50
    char.skills.sword = 50;
    const stats = deriveStats(char, content.equipment, vocation);

    // 50 * 0.4% = 20% attack speed bonus
    expect(stats.attackSpeedBonusPercent).toBe(20);
    // Base 1500ms attack speed - 20% = 1200ms
    expect(stats.attackIntervalMs).toBe(1200);
  });

  it('calcula o bônus de velocidade de movimento concedido por skills corporais', () => {
    const state = createIdleGame('test-seed', content);
    const char = state.session.characters[0];
    const vocation = content.vocations.find((v) => v.name === char.vocation)!;

    char.skills.sword = 60;
    const stats = deriveStats(char, content.equipment, vocation);

    // Math.floor(60 * 0.8) = 48 speed bonus
    expect(stats.movementSpeedBonus).toBe(48);
  });

  it('calcula resistência mágica por Magic Level e mitigação por Shielding', () => {
    const state = createIdleGame('test-seed', content);
    const char = state.session.characters[0];
    const vocation = content.vocations.find((v) => v.name === char.vocation)!;

    char.skills.magicLevel = 25;
    char.skills.shielding = 40;
    const stats = deriveStats(char, content.equipment, vocation);

    // Magic Level 25 * 0.4% = 10% Magic Resistance
    expect(stats.magicDamageResistancePercent).toBe(10);
    // Shielding 40 * 0.3% = 12% Physical Mitigation
    expect(stats.physicalDamageMitigationPercent).toBe(12);
  });

  it('retorna informações completas de tooltip e bônus para a interface', () => {
    const skills = {
      fist: 10,
      club: 10,
      sword: 45,
      axe: 10,
      distance: 10,
      shielding: 35,
      magicLevel: 15,
      fishing: 10,
    };

    const swordInfo = getSkillTooltipInfo(skills, 'sword', 1);
    expect(swordInfo.name).toBe('Sword Fighting');
    expect(swordInfo.level).toBe(45);
    expect(swordInfo.currentPerks.length).toBeGreaterThan(0);
    expect(swordInfo.nextLevelPerks.length).toBeGreaterThan(0);

    const mlInfo = getSkillTooltipInfo(skills, 'magicLevel', 1);
    expect(mlInfo.name).toBe('Magic Level');
    expect(mlInfo.level).toBe(15);
    expect(mlInfo.currentPerks.some((p) => p.includes('Resistência Mágica'))).toBe(true);

    const shieldInfo = getSkillTooltipInfo(skills, 'shielding', 1);
    expect(shieldInfo.name).toBe('Shielding');
    expect(shieldInfo.level).toBe(35);
    expect(shieldInfo.currentPerks.some((p) => p.includes('Mitigação'))).toBe(true);
  });
});
