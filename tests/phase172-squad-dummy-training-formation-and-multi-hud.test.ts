import { describe, it, expect } from 'vitest';
import {
  advanceTraining,
  calculatePartyTrainingPositions,
  calculateTrainingTimeEstimate,
  trainingSkillFor,
  THAIS_TRAINING_DUMMIES,
  type CharacterState,
  type GameContent,
  type GameState,
} from '../packages/domain/src';

function makeMockCharacter(
  id: string,
  name: string,
  vocation: 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid',
  skills: Partial<CharacterState['skills']> = {}
): CharacterState {
  return {
    id,
    name,
    vocation,
    baseVocation: vocation,
    level: 50,
    experience: 100000,
    currentHp: 1000,
    maxHp: 1000,
    currentMana: 500,
    maxMana: 500,
    staminaMinutes: 2520,
    maxStaminaMinutes: 2520,
    equipment: {
      head: null,
      armor: null,
      legs: null,
      boots: null,
      leftHand: null,
      rightHand: null,
    },
    skills: {
      fist: 10,
      club: 10,
      sword: 50,
      axe: 10,
      distance: 50,
      shielding: 50,
      magicLevel: 10,
      ...skills,
    },
    skillTries: {
      fist: 0,
      club: 0,
      sword: 0,
      axe: 0,
      distance: 0,
      shielding: 0,
      magicLevel: 0,
    },
    inventory: [],
    backpack: [],
    depot: [],
    trainingState: {
      manaSimulationRemainderMs: 0,
      skillRemainderMs: 0,
      shieldingRemainderMs: 0,
      manaSpent: 0,
    },
  } as unknown as CharacterState;
}

const mockContent: GameContent = {
  monsters: [],
  equipment: [],
  vocations: [
    {
      id: 'Knight',
      name: 'Knight',
      hpGain: 15,
      manaGain: 5,
      capGain: 25,
      manaGainTicks: 6,
      manaGainAmount: 2,
      manaMultiplier: 3.0,
      skillMultipliers: { fist: 1.1, club: 1.1, sword: 1.1, axe: 1.1, distance: 1.4, shielding: 1.1 },
    },
    {
      id: 'Paladin',
      name: 'Paladin',
      hpGain: 10,
      manaGain: 15,
      capGain: 20,
      manaGainTicks: 4,
      manaGainAmount: 2,
      manaMultiplier: 1.4,
      skillMultipliers: { fist: 1.2, club: 1.2, sword: 1.2, axe: 1.2, distance: 1.1, shielding: 1.1 },
    },
    {
      id: 'Sorcerer',
      name: 'Sorcerer',
      hpGain: 5,
      manaGain: 30,
      capGain: 10,
      manaGainTicks: 3,
      manaGainAmount: 2,
      manaMultiplier: 1.1,
      skillMultipliers: { fist: 1.5, club: 1.5, sword: 1.5, axe: 1.5, distance: 1.5, shielding: 1.5 },
    },
    {
      id: 'Druid',
      name: 'Druid',
      hpGain: 5,
      manaGain: 30,
      capGain: 10,
      manaGainTicks: 3,
      manaGainAmount: 2,
      manaMultiplier: 1.1,
      skillMultipliers: { fist: 1.5, club: 1.5, sword: 1.5, axe: 1.5, distance: 1.5, shielding: 1.5 },
    },
  ],
  starterLoadouts: [],
  spells: [],
  huntRegions: [],
  economy: { sellMultiplier: 1, items: [] },
  rateMagic: 1.0,
  rateSkill: 1.0,
} as unknown as GameContent;

describe('Phase 172: Formação de Treino da Party ao Redor do Dummy & HUD Superior Multi-Personagem', () => {
  it('1. Garante que trainingSkillFor deriva a skill autêntica de cada vocação', () => {
    const knight = makeMockCharacter('1', 'Knight Guy', 'Knight', { sword: 60, axe: 20, club: 10 });
    const paladin = makeMockCharacter('2', 'Pally Guy', 'Paladin');
    const sorcerer = makeMockCharacter('3', 'Sorc Guy', 'Sorcerer');
    const druid = makeMockCharacter('4', 'Druid Guy', 'Druid');

    expect(trainingSkillFor(knight, mockContent)).toBe('sword');
    expect(trainingSkillFor(paladin, mockContent)).toBe('distance');
    expect(trainingSkillFor(sorcerer, mockContent)).toBe('magicLevel');
    expect(trainingSkillFor(druid, mockContent)).toBe('magicLevel');

    // Knight com Axe maior deve treinar Axe
    const axeKnight = makeMockCharacter('5', 'Axe Guy', 'Knight', { sword: 20, axe: 70, club: 10 });
    expect(trainingSkillFor(axeKnight, mockContent)).toBe('axe');
  });

  it('2. Garante que advanceTraining avança simultaneamente cada membro do squad em sua respectiva skill', () => {
    const knight = makeMockCharacter('k1', 'Knight Leader', 'Knight');
    const paladin = makeMockCharacter('p1', 'Pally Alt', 'Paladin');
    const sorcerer = makeMockCharacter('s1', 'Sorc Alt', 'Sorcerer');
    const druid = makeMockCharacter('d1', 'Druid Alt', 'Druid');

    const state: GameState = {
      session: {
        activeCharacterId: 'k1',
        characters: [knight, paladin, sorcerer, druid],
        trainingElapsedMs: 0,
      },
      encounter: {
        events: [],
        visualEvents: [],
      },
    } as unknown as GameState;

    // Treina durante 6000ms (6 segundos = 3 pulsos melee/distance e múltiplos pulsos de mana)
    // O líder (Knight) treina explicitamente 'sword'
    const next = advanceTraining(state, mockContent, 6000, 'sword');

    const nextKnight = next.session.characters.find((c) => c.id === 'k1')!;
    const nextPaladin = next.session.characters.find((c) => c.id === 'p1')!;
    const nextSorcerer = next.session.characters.find((c) => c.id === 's1')!;
    const nextDruid = next.session.characters.find((c) => c.id === 'd1')!;

    // Knight ganhou tentativas de sword
    expect(nextKnight.skillTries.sword).toBeGreaterThan(0);
    // Paladin treinou distance (sua vocação)
    expect(nextPaladin.skillTries.distance).toBeGreaterThan(0);
    // Sorcerer e Druid treinaram magicLevel
    expect(nextSorcerer.skillTries.magicLevel).toBeGreaterThan(0);
    expect(nextDruid.skillTries.magicLevel).toBeGreaterThan(0);

    // Verifica emissão de visualEvents com os IDs de todos os membros que agiram
    const actions = next.encounter.visualEvents?.filter((v: any) => v.type === 'training-action');
    expect(actions).toBeDefined();
    expect(actions!.length).toBeGreaterThanOrEqual(3);

    const sourceIds = new Set(actions!.map((a: any) => a.sourceId));
    expect(sourceIds.has('k1')).toBe(true);
    expect(sourceIds.has('p1')).toBe(true);
    expect(sourceIds.has('s1') || sourceIds.has('d1')).toBe(true);
  });

  it('3. Garante que calculatePartyTrainingPositions distribui a party ao redor do training dummy', () => {
    const dummyPos = THAIS_TRAINING_DUMMIES[0].position; // { x: 32349, y: 32219, z: 7 }
    const leaderPos = { x: 32348, y: 32219, z: 7 }; // Líder a Oeste do Dummy
    const followers = ['paladin-alt', 'sorcerer-alt', 'druid-alt'];

    const isWalkable = (_pos: { x: number; y: number; z: number }) => true;

    const slots = calculatePartyTrainingPositions(dummyPos, leaderPos, followers, isWalkable);

    expect(slots.size).toBe(3);

    const posSet = new Set<string>();
    for (const [id, slot] of slots.entries()) {
      expect(followers).toContain(id);

      const key = `${slot.position.x},${slot.position.y},${slot.position.z}`;
      expect(posSet.has(key)).toBe(false); // Cada um em uma coordenada única
      posSet.add(key);

      // Não pode sobrepor o líder nem o próprio dummy
      expect(key).not.toBe(`${leaderPos.x},${leaderPos.y},${leaderPos.z}`);
      expect(key).not.toBe(`${dummyPos.x},${dummyPos.y},${dummyPos.z}`);

      // Distância de Chebyshev deve ser <= 2 (ao redor do boneco)
      const distX = Math.abs(slot.position.x - dummyPos.x);
      const distY = Math.abs(slot.position.y - dummyPos.y);
      expect(Math.max(distX, distY)).toBeLessThanOrEqual(2);

      // A orientação (facingDirection) deve apontar em direção ao dummy
      if (slot.position.x > dummyPos.x) expect(slot.facingDirection).toBe('west');
      if (slot.position.x < dummyPos.x) expect(slot.facingDirection).toBe('east');
      if (slot.position.y > dummyPos.y && slot.position.x === dummyPos.x) expect(slot.facingDirection).toBe('north');
      if (slot.position.y < dummyPos.y && slot.position.x === dummyPos.x) expect(slot.facingDirection).toBe('south');
    }
  });

  it('4. Garante cálculo de tempo estimado e progresso para todos os 4 membros da party', () => {
    const chars = [
      makeMockCharacter('1', 'Knight Leader', 'Knight'),
      makeMockCharacter('2', 'Pally Alt', 'Paladin'),
      makeMockCharacter('3', 'Sorc Alt', 'Sorcerer'),
      makeMockCharacter('4', 'Druid Alt', 'Druid'),
    ];

    for (const char of chars) {
      const skill = trainingSkillFor(char, mockContent);
      const est = calculateTrainingTimeEstimate(char, skill, mockContent, 1.0);

      expect(est.currentLevel).toBeGreaterThanOrEqual(10);
      expect(est.targetLevel).toBe(est.currentLevel + 1);
      expect(est.requiredTries).toBeGreaterThan(0);
      expect(est.progressPercent).toBeGreaterThanOrEqual(0);
      expect(est.progressPercent).toBeLessThanOrEqual(100);
      expect(typeof est.formattedTime).toBe('string');
      expect(est.formattedTime.length).toBeGreaterThan(0);
    }
  });
});
