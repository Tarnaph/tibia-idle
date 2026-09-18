/**
 * blessings.ts
 *
 * Sistema canônico de Blessings (Bênçãos dos Deuses) do Tibia 11 / RealMap 11.
 *
 * Regras:
 * - 5 Bênçãos Canônicas:
 *   1. The Wisdom of Solitude
 *   2. The Spark of the Phoenix
 *   3. The Fire of the Suns
 *   4. The Spiritual Shielding
 *   5. The Embrace of Tibia
 *
 * Penalidades e Proteção:
 * - Sem blessings: 0% redução da perda na morte, 10% de chance de perder cada item equipado.
 * - Com 5 blessings: 40% de redução da perda de XP/skills/ML (sofre 60%), 0% de chance de perder itens equipados.
 * - Cada morte consome todas as blessings que o personagem possuir.
 */

import type { GameState } from './types';

export interface BlessingDefinition {
  id: number;
  name: string;
  description: string;
  defaultCost: number;
  themeColor: string;
}

export const DEFAULT_BLESSING_COST = 51_800;
export const TOTAL_BLESSINGS_COUNT = 5;

export const BLESSINGS_CATALOG: BlessingDefinition[] = [
  {
    id: 1,
    name: 'The Wisdom of Solitude',
    description: 'A visão do eremita guarda o que você aprendeu.',
    defaultCost: DEFAULT_BLESSING_COST,
    themeColor: '#84cc16', // Verde folha / eremita
  },
  {
    id: 2,
    name: 'The Spark of the Phoenix',
    description: 'Levante das cinzas com a sua força intacta.',
    defaultCost: DEFAULT_BLESSING_COST,
    themeColor: '#f97316', // Laranja fogo / fênix
  },
  {
    id: 3,
    name: 'The Fire of the Suns',
    description: 'Os sóis gêmeos queimam a cobrança da morte.',
    defaultCost: DEFAULT_BLESSING_COST,
    themeColor: '#eab308', // Dourado sol / fogo solar
  },
  {
    id: 4,
    name: 'The Spiritual Shielding',
    description: 'Uma barreira entre a sua alma e o vazio.',
    defaultCost: DEFAULT_BLESSING_COST,
    themeColor: '#38bdf8', // Azul etéreo / escudo espiritual
  },
  {
    id: 5,
    name: 'The Embrace of Tibia',
    description: 'O próprio mundo se recusa a deixar você ir.',
    defaultCost: DEFAULT_BLESSING_COST,
    themeColor: '#a855f7', // Roxo místico / abraço da terra
  },
];

export interface DeathProtectionReport {
  blessingsCount: number;
  lossReductionPercent: number; // Ex: 40 (com 5), 0 (com 0)
  effectiveLossRatio: number;   // Ex: 0.60 (com 5), 1.00 (com 0)
  equipLossChancePercent: number; // Ex: 0 (com 5), 10 (com 0)
  summaryText: string;
  detailsText: string;
}

/**
 * Calcula a taxa de proteção e redução de penalidades da morte.
 */
export function calculateDeathProtection(blessings: number[] = []): DeathProtectionReport {
  const activeIds = new Set(blessings.filter((id) => id >= 1 && id <= 5));
  const count = activeIds.size;

  if (count === 0) {
    return {
      blessingsCount: 0,
      lossReductionPercent: 0,
      effectiveLossRatio: 1.0,
      equipLossChancePercent: 10,
      summaryText: 'Você não tem nenhuma blessing.',
      detailsText: '0% da perda da morte perdoada · 10% de chance de perder cada item equipado',
    };
  }

  if (count >= TOTAL_BLESSINGS_COUNT) {
    return {
      blessingsCount: 5,
      lossReductionPercent: 40,
      effectiveLossRatio: 0.60,
      equipLossChancePercent: 0,
      summaryText: 'Você está totalmente abençoado.',
      detailsText: '40% da perda da morte perdoada · 0% de chance de perder cada item equipado',
    };
  }

  // 1 a 4 blessings: proporcional (8% de redução e -2% chance de perda por blessing)
  const lossReductionPercent = count * 8;
  const effectiveLossRatio = Math.max(0.60, (100 - lossReductionPercent) / 100);
  const equipLossChancePercent = Math.max(0, 10 - count * 2);

  return {
    blessingsCount: count,
    lossReductionPercent,
    effectiveLossRatio,
    equipLossChancePercent,
    summaryText: `Você tem ${count} de 5 blessings.`,
    detailsText: `${lossReductionPercent}% da perda da morte perdoada · ${equipLossChancePercent}% de chance de perder cada item equipado`,
  };
}

/**
 * Retorna os IDs das blessings que faltam para o herói.
 */
export function getMissingBlessingIds(currentBlessings: number[] = []): number[] {
  const activeSet = new Set(currentBlessings);
  return [1, 2, 3, 4, 5].filter((id) => !activeSet.has(id));
}

/**
 * Calcula o custo total para comprar todas as blessings faltantes.
 */
export function calculateMissingBlessingsCost(
  currentBlessings: number[] = [],
  costPerBlessing: number = DEFAULT_BLESSING_COST
): number {
  const missing = getMissingBlessingIds(currentBlessings);
  return missing.length * costPerBlessing;
}

export interface BuyBlessingResult {
  ok: boolean;
  state: GameState;
  blessingId?: number;
  costPaid?: number;
  error?: string;
}

export function buyBlessing(
  state: GameState,
  characterId: string,
  blessingId: number,
  cost: number = DEFAULT_BLESSING_COST
): BuyBlessingResult {
  const char = state.session.characters.find((c) => c.id === characterId);
  if (!char) {
    return { ok: false, state, error: 'Personagem não encontrado.' };
  }

  const blessingDef = BLESSINGS_CATALOG.find((b) => b.id === blessingId);
  if (!blessingDef) {
    return { ok: false, state, error: 'Blessing inválida.' };
  }

  const currentBlessings = char.blessings || [];
  if (currentBlessings.includes(blessingId)) {
    return { ok: false, state, error: 'Você já possui esta bênção.' };
  }

  const actualCost = cost;
  if (state.session.gold < actualCost) {
    return {
      ok: false,
      state,
      error: `Gold insuficiente. Você precisa de ${actualCost.toLocaleString('pt-BR')} gp.`,
    };
  }

  const nextBlessings = [...currentBlessings, blessingId].sort((a, b) => a - b);
  const updatedCharacters = state.session.characters.map((c) =>
    c.id === characterId ? { ...c, blessings: nextBlessings } : c
  );

  const nextState: GameState = {
    ...state,
    session: {
      ...state.session,
      gold: Math.max(0, state.session.gold - actualCost),
      characters: updatedCharacters,
    },
  };

  return {
    ok: true,
    state: nextState,
    blessingId,
    costPaid: actualCost,
  };
}

export function buyAllMissingBlessings(
  state: GameState,
  characterId: string,
  costPerBlessing: number = DEFAULT_BLESSING_COST
): BuyBlessingResult {
  const char = state.session.characters.find((c) => c.id === characterId);
  if (!char) {
    return { ok: false, state, error: 'Personagem não encontrado.' };
  }

  const missingIds = getMissingBlessingIds(char.blessings || []);
  if (missingIds.length === 0) {
    return { ok: false, state, error: 'Você já possui todas as 5 bênçãos!' };
  }

  const totalCost = missingIds.length * costPerBlessing;
  if (state.session.gold < totalCost) {
    return {
      ok: false,
      state,
      error: `Gold insuficiente. Você precisa de ${totalCost.toLocaleString('pt-BR')} gp para todas as bênçãos.`,
    };
  }

  const nextBlessings = [1, 2, 3, 4, 5];
  const updatedCharacters = state.session.characters.map((c) =>
    c.id === characterId ? { ...c, blessings: nextBlessings } : c
  );

  const nextState: GameState = {
    ...state,
    session: {
      ...state.session,
      gold: Math.max(0, state.session.gold - totalCost),
      characters: updatedCharacters,
    },
  };

  return {
    ok: true,
    state: nextState,
    costPaid: totalCost,
  };
}

