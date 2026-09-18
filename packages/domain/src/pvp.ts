/**
 * Ranked PvP Arena & Skull Patentes System
 * Regras canônicas de Elo, patentes de caveiras, táticas e recompensas da Arena.
 */

export type PvPSkull = 'none' | 'green' | 'yellow' | 'white' | 'red' | 'black' | 'orange';

export type PvPTier =
  | 'Iniciante'
  | 'Bronze'
  | 'Prata'
  | 'Ouro'
  | 'Platina'
  | 'Diamante'
  | 'Desafiante';

export interface PvPTierInfo {
  tier: PvPTier;
  skull: PvPSkull;
  minElo: number;
  maxElo: number;
  label: string;
  badgeColor: string;
  skullAsset: string | null;
}

export const PVP_TIERS: PvPTierInfo[] = [
  {
    tier: 'Iniciante',
    skull: 'none',
    minElo: 0,
    maxElo: 999,
    label: 'Iniciante',
    badgeColor: '#a1a1aa', // cinza
    skullAsset: null,
  },
  {
    tier: 'Bronze',
    skull: 'green',
    minElo: 1000,
    maxElo: 1249,
    label: 'Bronze',
    badgeColor: '#cd7f32', // bronze
    skullAsset: '/assets/skulls/skull-green.png',
  },
  {
    tier: 'Prata',
    skull: 'yellow',
    minElo: 1250,
    maxElo: 1499,
    label: 'Prata',
    badgeColor: '#e2e8f0', // prata
    skullAsset: '/assets/skulls/skull-yellow.png',
  },
  {
    tier: 'Ouro',
    skull: 'white',
    minElo: 1500,
    maxElo: 1749,
    label: 'Ouro',
    badgeColor: '#facc15', // ouro
    skullAsset: '/assets/skulls/skull-white.png',
  },
  {
    tier: 'Platina',
    skull: 'red',
    minElo: 1750,
    maxElo: 1999,
    label: 'Platina',
    badgeColor: '#38bdf8', // platina ciano
    skullAsset: '/assets/skulls/skull-red.png',
  },
  {
    tier: 'Diamante',
    skull: 'black',
    minElo: 2000,
    maxElo: 2499,
    label: 'Diamante',
    badgeColor: '#c084fc', // diamante roxo / black
    skullAsset: '/assets/skulls/skull-black.png',
  },
  {
    tier: 'Desafiante',
    skull: 'orange',
    minElo: 2500,
    maxElo: 99999,
    label: 'Desafiante',
    badgeColor: '#fb923c', // laranja fogo / challenger
    skullAsset: '/assets/skulls/skull-orange.png',
  },
];

export function getPvPTierInfo(elo: number, isTop1: boolean = false): PvPTierInfo {
  if (isTop1 && elo >= 2000) {
    return PVP_TIERS.find((t) => t.tier === 'Desafiante') || PVP_TIERS[PVP_TIERS.length - 1];
  }

  const safeElo = Math.max(0, elo);
  for (let i = PVP_TIERS.length - 1; i >= 0; i--) {
    if (safeElo >= PVP_TIERS[i].minElo) {
      return PVP_TIERS[i];
    }
  }

  return PVP_TIERS[0];
}

/**
 * Cálculo de ajuste de Elo FIDE (K-Factor 32)
 */
export function calculateEloDelta(
  playerElo: number,
  opponentElo: number,
  result: 'win' | 'loss' | 'draw',
  kFactor: number = 32
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  let actualScore = 0.5;
  if (result === 'win') actualScore = 1.0;
  if (result === 'loss') actualScore = 0.0;

  const rawDelta = Math.round(kFactor * (actualScore - expectedScore));
  
  // Garantir limites mínimos de ganho/perda esportiva
  if (result === 'win') return Math.max(10, rawDelta);
  if (result === 'loss') return Math.min(-8, rawDelta);
  return rawDelta;
}

export interface ArenaRewards {
  arenaCoins: number;
}

export function calculateArenaRewards(result: 'win' | 'loss' | 'draw'): ArenaRewards {
  switch (result) {
    case 'win':
      return { arenaCoins: 15 };
    case 'draw':
      return { arenaCoins: 8 };
    case 'loss':
    default:
      return { arenaCoins: 5 };
  }
}

export interface PvPMatchRecord {
  id: string;
  opponentName: string;
  opponentVocation: string;
  opponentLevel: number;
  opponentElo: number;
  result: 'win' | 'loss' | 'draw';
  eloChange: number;
  timestamp: number;
}

export interface PvPTacticBoard {
  id: number;
  title: string;
  formation: string;
  focusTarget: 'lowest-hp' | 'healer' | 'damage-dealer' | 'closest';
  description: string;
}

export const DEFAULT_PVP_TACTICS: PvPTacticBoard[] = [
  {
    id: 1,
    title: 'Contra EK · ED · RP',
    formation: 'formação linha',
    focusTarget: 'healer',
    description: 'Foco inicial em abater o Druid adversário antes da cura em massa.',
  },
  {
    id: 2,
    title: 'Contra Composição Burst',
    formation: 'formação defensiva',
    focusTarget: 'lowest-hp',
    description: 'Postura defensiva com foco no alvo com menor vida para virada rápida.',
  },
  {
    id: 3,
    title: 'Guerra de Atrito',
    formation: 'formação espalhada',
    focusTarget: 'closest',
    description: 'Evita combos de área de runas como Avalanche e Great Fireball.',
  },
];
