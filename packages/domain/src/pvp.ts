/**
 * Ranked PvP Arena & Skull Patentes System
 * Regras canônicas de Pontuação, patentes de caveiras, táticas e recompensas da Arena.
 * Conforme especificado:
 * - Cada vitória concede +20 pontos.
 * - Cada rank avança a cada 250 pontos.
 * - Ao atingir 250 pontos (Rank 1 / Caveira Verde), o jogador pode ligar ou desligar a caveira.
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
  rankLevel: number;
  tier: PvPTier;
  skull: PvPSkull;
  minPoints: number;
  maxPoints: number;
  label: string;
  badgeColor: string;
  skullAsset: string | null;
}

export const PVP_POINTS_PER_WIN = 20;
export const PVP_POINTS_PER_RANK = 250;

export const PVP_TIERS: PvPTierInfo[] = [
  {
    rankLevel: 0,
    tier: 'Iniciante',
    skull: 'none',
    minPoints: 0,
    maxPoints: 249,
    label: 'Iniciante',
    badgeColor: '#a1a1aa', // cinza
    skullAsset: null,
  },
  {
    rankLevel: 1,
    tier: 'Bronze',
    skull: 'green',
    minPoints: 250,
    maxPoints: 499,
    label: 'Bronze',
    badgeColor: '#22c55e', // verde
    skullAsset: '/assets/skulls/skull-green.png',
  },
  {
    rankLevel: 2,
    tier: 'Prata',
    skull: 'yellow',
    minPoints: 500,
    maxPoints: 749,
    label: 'Prata',
    badgeColor: '#eab308', // amarelo dourado
    skullAsset: '/assets/skulls/skull-yellow.png',
  },
  {
    rankLevel: 3,
    tier: 'Ouro',
    skull: 'white',
    minPoints: 750,
    maxPoints: 999,
    label: 'Ouro',
    badgeColor: '#f8fafc', // branco
    skullAsset: '/assets/skulls/skull-white.png',
  },
  {
    rankLevel: 4,
    tier: 'Platina',
    skull: 'red',
    minPoints: 1000,
    maxPoints: 1249,
    label: 'Platina',
    badgeColor: '#ef4444', // vermelho
    skullAsset: '/assets/skulls/skull-red.png',
  },
  {
    rankLevel: 5,
    tier: 'Diamante',
    skull: 'black',
    minPoints: 1250,
    maxPoints: 1499,
    label: 'Diamante',
    badgeColor: '#71717a', // preto / dark
    skullAsset: '/assets/skulls/skull-black.png',
  },
  {
    rankLevel: 6,
    tier: 'Desafiante',
    skull: 'orange',
    minPoints: 1500,
    maxPoints: 99999,
    label: 'Desafiante',
    badgeColor: '#f97316', // laranja
    skullAsset: '/assets/skulls/skull-orange.png',
  },
];

export function getPvPTierInfo(points: number, isTop1: boolean = false): PvPTierInfo {
  if (isTop1 && points >= 1250) {
    return PVP_TIERS.find((t) => t.tier === 'Desafiante') || PVP_TIERS[PVP_TIERS.length - 1];
  }

  const safePoints = Math.max(0, points);
  for (let i = PVP_TIERS.length - 1; i >= 0; i--) {
    if (safePoints >= PVP_TIERS[i].minPoints) {
      return PVP_TIERS[i];
    }
  }

  return PVP_TIERS[0];
}

/**
 * Verifica se o jogador pode ativar a exibição de caveira no outfit (Requer Rank 1 / 250 pontos)
 */
export function canDisplaySkull(points: number): boolean {
  return points >= 250;
}

/**
 * Calcula o progresso para o próximo rank
 */
export function getNextRankProgress(points: number): {
  currentRank: number;
  currentPoints: number;
  nextRankPoints: number;
  pointsNeeded: number;
  isMaxRank: boolean;
} {
  const currentTier = getPvPTierInfo(points);
  if (currentTier.rankLevel >= 6) {
    return {
      currentRank: 6,
      currentPoints: points,
      nextRankPoints: 1500,
      pointsNeeded: 0,
      isMaxRank: true,
    };
  }

  const nextTier = PVP_TIERS[currentTier.rankLevel + 1];
  const nextRankPoints = nextTier.minPoints;
  const pointsNeeded = Math.max(0, nextRankPoints - points);

  return {
    currentRank: currentTier.rankLevel,
    currentPoints: points,
    nextRankPoints,
    pointsNeeded,
    isMaxRank: false,
  };
}

/**
 * Detecta se a partida resultou em avanço de Rank (mudança de caveira)
 */
export function checkRankPromotion(
  oldPoints: number,
  newPoints: number
): { promoted: boolean; oldTier: PvPTierInfo; newTier: PvPTierInfo; nextGoalPoints: number } | null {
  const oldTier = getPvPTierInfo(oldPoints);
  const newTier = getPvPTierInfo(newPoints);

  if (newTier.rankLevel > oldTier.rankLevel) {
    const nextGoal = newTier.rankLevel >= 6 ? 0 : PVP_TIERS[newTier.rankLevel + 1].minPoints;
    return {
      promoted: true,
      oldTier,
      newTier,
      nextGoalPoints: nextGoal,
    };
  }

  return null;
}

/**
 * Cálculo de ajuste de pontos de Arena:
 * Vencedor ganha fixo +20 pontos.
 */
export function calculatePointsDelta(result: 'win' | 'loss' | 'draw'): number {
  if (result === 'win') return PVP_POINTS_PER_WIN;
  if (result === 'draw') return 5;
  return 0; // derrota não subtrai pontos punitivos na liga esportiva
}

/** Alias para compatibilidade com versões anteriores */
export const calculateEloDelta = calculatePointsDelta;

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
  opponentPoints: number;
  result: 'win' | 'loss' | 'draw';
  pointsChange: number;
  eloChange?: number;
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

/** Coordenadas dos Spawns de Duelo da Arena */
export const PVP_ARENA_SPAWNS = [
  { id: 1, x: 33136, y: 32965, z: 8 },
  { id: 2, x: 33136, y: 32973, z: 8 },
] as const;
