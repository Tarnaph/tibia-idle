import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';
import {
  getPvPTierInfo,
  calculateEloDelta,
  calculateArenaRewards,
  type PvPMatchRecord,
} from '@/packages/domain/src/pvp';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { characterId, selectedTacticId } = body;

    if (!characterId) {
      return NextResponse.json({ success: false, error: 'characterId é obrigatório' }, { status: 400 });
    }

    const player = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        skills: true,
      },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: 'Personagem não encontrado' }, { status: 404 });
    }

    const playerElo = (player as any).pvpElo ?? 1000;
    const playerTierInfo = getPvPTierInfo(playerElo);

    // 1. MATCHMAKING: Buscar adversário no banco de dados com a mesma patente/caveira
    const potentialOpponents = await prisma.character.findMany({
      where: {
        id: { not: player.id },
        pvpElo: {
          gte: playerTierInfo.minElo - 150,
          lte: playerTierInfo.maxElo + 150,
        },
      },
      include: {
        skills: true,
      },
      take: 10,
    });

    let opponent: {
      name: string;
      vocation: string;
      level: number;
      elo: number;
    };

    if (potentialOpponents.length > 0) {
      // Escolhe um adversário aleatório do mesmo rank
      const randOpp = potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];
      opponent = {
        name: randOpp.name,
        vocation: randOpp.vocationName || 'Knight',
        level: randOpp.level,
        elo: (randOpp as any).pvpElo ?? 1000,
      };
    } else {
      // Gladiador de Arena do mesmo tier caso não haja outro jogador no exato intervalo
      const mockNames = ['Gladiador Valdor', 'Arquimago Zephyr', 'Sombra Venator', 'Guardião Kaelen', 'Duelista Brann'];
      const randName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const vocs = ['Elite Knight', 'Master Sorcerer', 'Royal Paladin', 'Elder Druid'];
      const randVoc = vocs[Math.floor(Math.random() * vocs.length)];
      const variance = Math.floor(Math.random() * 80) - 40;
      opponent = {
        name: randName,
        vocation: randVoc,
        level: Math.max(1, player.level + Math.floor(Math.random() * 6) - 3),
        elo: Math.max(1000, playerElo + variance),
      };
    }

    // 2. SIMULAÇÃO DE COMBATE DE ARENA (Baseado no nível, skills e sorte tática)
    // Sem perda destrutiva de XP ou itens!
    const playerPower = player.level * 10 + player.skills.reduce((acc, s) => acc + s.value, 0) * 2;
    const opponentPower = opponent.level * 10 + (opponent.level * 1.5) * 2;
    const rollPlayer = Math.random() * 40 + 80; // 80 - 120%
    const rollOpponent = Math.random() * 40 + 80;

    const finalPlayerScore = playerPower * (rollPlayer / 100);
    const finalOpponentScore = opponentPower * (rollOpponent / 100);

    let result: 'win' | 'loss' | 'draw' = 'win';
    if (Math.abs(finalPlayerScore - finalOpponentScore) < 5) {
      result = 'draw';
    } else if (finalPlayerScore < finalOpponentScore) {
      result = 'loss';
    }

    // 3. CÁLCULO DE ELO E MOEDAS
    const eloDelta = calculateEloDelta(playerElo, opponent.elo, result);
    const newElo = Math.max(0, playerElo + eloDelta);
    const newTierInfo = getPvPTierInfo(newElo);
    const rewards = calculateArenaRewards(result);

    const currentWins = (player as any).pvpWins ?? 0;
    const currentLosses = (player as any).pvpLosses ?? 0;
    const currentDraws = (player as any).pvpDraws ?? 0;
    const currentCoins = (player as any).arenaCoins ?? 0;

    const newWins = result === 'win' ? currentWins + 1 : currentWins;
    const newLosses = result === 'loss' ? currentLosses + 1 : currentLosses;
    const newDraws = result === 'draw' ? currentDraws + 1 : currentDraws;
    const newCoins = currentCoins + rewards.arenaCoins;

    // 4. ATUALIZAR HISTÓRICO DE PARTIDAS
    let history: PvPMatchRecord[] = [];
    if ((player as any).pvpMatchHistoryJson) {
      try {
        const parsed = JSON.parse((player as any).pvpMatchHistoryJson);
        if (Array.isArray(parsed)) history = parsed;
      } catch {}
    }

    const matchRecord: PvPMatchRecord = {
      id: `match-${Date.now()}`,
      opponentName: opponent.name,
      opponentVocation: opponent.vocation,
      opponentLevel: opponent.level,
      opponentElo: opponent.elo,
      result,
      eloChange: eloDelta,
      timestamp: Date.now(),
    };

    history.unshift(matchRecord);
    if (history.length > 20) history = history.slice(0, 20);

    // 5. PERSISTIR NO BANCO DE DADOS PRISMA
    await prisma.character.update({
      where: { id: player.id },
      data: {
        pvpElo: newElo,
        pvpTier: newTierInfo.tier,
        pvpWins: newWins,
        pvpLosses: newLosses,
        pvpDraws: newDraws,
        arenaCoins: newCoins,
        pvpMatchHistoryJson: JSON.stringify(history),
      },
    });

    return NextResponse.json({
      success: true,
      result,
      opponent,
      eloDelta,
      newElo,
      newTier: newTierInfo.tier,
      newSkull: newTierInfo.skull,
      skullAsset: newTierInfo.skullAsset,
      arenaCoinsDelta: rewards.arenaCoins,
      newCoins,
      matchRecord,
    });
  } catch (error: any) {
    console.error('[PVP QUEUE API] Erro ao processar duelo:', error);
    return NextResponse.json({ success: false, error: error.message || 'Falha ao processar partida.' }, { status: 500 });
  }
}
