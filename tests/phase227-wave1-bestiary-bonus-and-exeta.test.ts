import { describe, expect, it } from 'vitest';
import {
  getBestiaryKillsNeeded,
  getCompletedBestiaryCount,
  getBestiaryExpBonusPercent,
  getEffectiveExpMultiplier,
  createIdleGame,
  castAutomaticSpells,
  EnemyState,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 227 - Wave 1: Bestiary EXP Bonus & Exeta Res Hotbar Gate', () => {
  it('Calcula corretamente killsNeeded de criaturas canônicas', () => {
    expect(getBestiaryKillsNeeded('rat')).toBe(250);
    expect(getBestiaryKillsNeeded('cave-rat')).toBe(250);
    expect(getBestiaryKillsNeeded('cyclops')).toBe(500);
    expect(getBestiaryKillsNeeded('cyclops-smith')).toBe(500);
    expect(getBestiaryKillsNeeded('dragon')).toBe(1000);
    expect(getBestiaryKillsNeeded('demon')).toBe(2500);
    // Uncataloged fallback
    expect(getBestiaryKillsNeeded('unknown-creature')).toBe(250);
  });

  it('Calcula bônus perpétuo de +1% de EXP por monstro concluído no Bestiário', () => {
    const kills: Record<string, number> = {
      'rat': 250, // Completo (+1%)
      'cave-rat': 249, // Incompleto (+0%)
      'cyclops': 500, // Completo (+1%)
      'dragon': 999, // Incompleto (+0%)
      'demon': 2500, // Completo (+1%)
    };

    const completed = getCompletedBestiaryCount(kills);
    expect(completed).toBe(3);

    const bonus = getBestiaryExpBonusPercent(kills);
    expect(bonus).toBeCloseTo(0.03, 5); // +3%

    // Multiplicador base no level 1 com stamina normal é 50
    const baseMult = getEffectiveExpMultiplier(1, 2000, 1.0, 0);
    expect(baseMult).toBe(50);

    // Com 3 bestiários completos (+3% de EXP): 50 * 1.03 = 51.5
    const boostedMult = getEffectiveExpMultiplier(1, 2000, 1.0, bonus);
    expect(boostedMult).toBeCloseTo(51.5, 2);
  });

  it('Knight NÃO conjura Exeta Res se a magia 93 não estiver na hotbar ou se estiver desativada', () => {
    const game = createIdleGame('p227-exeta-hotbar-gate', content);
    const knightChar = game.session.characters[0];
    knightChar.vocation = 'Elite Knight';
    knightChar.baseVocation = 'Knight';
    knightChar.level = 45;
    knightChar.currentMana = 100;
    knightChar.maxMana = 100;

    const knightActor = game.encounter.partyActors.find((a) => a.characterId === knightChar.id)!;
    knightActor.mana = 100;
    knightActor.position = { x: 50, y: 50, z: 7 };

    const enemy: EnemyState = {
      id: 'e1',
      monsterId: 'cyclops',
      name: 'Cyclops',
      hp: 260,
      maxHp: 260,
      attackMax: 40,
      defense: 20,
      armor: 12,
      alive: true,
      previousPosition: { x: 51, y: 50, z: 7 },
      direction: 'west',
      path: [],
      targetId: null,
      nextAttackAt: 0,
      attackIntervalMs: 2000,
      speed: 100,
      behavior: 'idle',
      nextRoamAt: 0,
      nextMoveAt: 0,
      detectionRange: 50,
      variant: null,
      position: { x: 51, y: 50, z: 7 },
    };
    game.encounter.enemies = [enemy];

    // Caso 1: Hotbar vazia -> Não conjura
    knightChar.hotbar = [];
    castAutomaticSpells(game, content);
    expect(knightActor.mana).toBe(100);

    // Caso 2: Outras magias na hotbar (Exura 1, Exori 89) sem 93 -> Não conjura
    knightChar.hotbar = [1, 89];
    castAutomaticSpells(game, content);
    expect(knightActor.mana).toBe(100);

    // Caso 3: Magia 93 presente mas desativada via hotbarConfigs -> Não conjura
    knightChar.hotbar = [93];
    knightChar.hotbarConfigs = { 0: { enabled: false } };
    castAutomaticSpells(game, content);
    expect(knightActor.mana).toBe(100);

    // Caso 4: Magia 93 presente e habilitada -> Conjura Exeta Res!
    knightChar.hotbarConfigs = { 0: { enabled: true } };
    castAutomaticSpells(game, content);
    expect(knightActor.mana).toBe(70);
    expect(knightActor.spellCooldowns['93']).toBeGreaterThan(game.encounter.elapsedMs);
  });
});
