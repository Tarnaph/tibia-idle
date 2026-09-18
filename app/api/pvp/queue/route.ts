import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';
import {
  getPvPTierInfo,
  calculatePointsDelta,
  calculateArenaRewards,
  checkRankPromotion,
  canDisplaySkull,
  PVP_ARENA_SPAWNS,
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

    const playerPoints = (player as any).pvpElo ?? 0;
    const playerTierInfo = getPvPTierInfo(playerPoints);

    // 1. MATCHMAKING: Buscar adversário no banco de dados com rank parecido
    const potentialOpponents = await prisma.character.findMany({
      where: {
        id: { not: player.id },
        pvpElo: {
          gte: Math.max(0, playerTierInfo.minPoints - 100),
          lte: playerTierInfo.maxPoints + 100,
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
      points: number;
    };

    if (potentialOpponents.length > 0) {
      const randOpp = potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];
      opponent = {
        name: randOpp.name,
        vocation: randOpp.vocationName || 'Knight',
        level: randOpp.level,
        points: (randOpp as any).pvpElo ?? 0,
      };
    } else {
      const mockNames = ['Gladiador Valdor', 'Arquimago Zephyr', 'Sombra Venator', 'Guardião Kaelen', 'Duelista Brann'];
      const randName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const vocs = ['Elite Knight', 'Master Sorcerer', 'Royal Paladin', 'Elder Druid'];
      const randVoc = vocs[Math.floor(Math.random() * vocs.length)];
      opponent = {
        name: randName,
        vocation: randVoc,
        level: Math.max(1, player.level + Math.floor(Math.random() * 4) - 2),
        points: Math.max(0, playerPoints + Math.floor(Math.random() * 40) - 20),
      };
    }

    // 2. CONFIGURAÇÃO DE SPAWNS DA ARENA
    // Spawn 1: (33136, 32965, 8) | Spawn 2: (33136, 32973, 8)
    const isPlayerSpawn1 = Math.random() < 0.5;
    const playerSpawn = isPlayerSpawn1 ? PVP_ARENA_SPAWNS[0] : PVP_ARENA_SPAWNS[1];
    const opponentSpawn = isPlayerSpawn1 ? PVP_ARENA_SPAWNS[1] : PVP_ARENA_SPAWNS[0];

    // 3. COMBATE AUTOMÁTICO NA ARENA COM 100 HEALTH E 100 MANA POTIONS
    let playerHp = player.maxHealth || player.health || 150;
    const playerMaxHp = playerHp;
    let playerMana = player.maxMana || player.mana || 35;
    const playerMaxMana = playerMana;
    let playerHealthPotions = 100;
    let playerManaPotions = 100;

    let oppHp = opponent.level * 15 + 100;
    const oppMaxHp = oppHp;
    let oppMana = opponent.level * 15 + 50;
    const oppMaxMana = oppMana;
    let oppHealthPotions = 100;
    let oppManaPotions = 100;

    const combatLog: string[] = [];
    combatLog.push(`Arena iniciada! ${player.name} no spawn (${playerSpawn.x}, ${playerSpawn.y}) vs ${opponent.name} no spawn (${opponentSpawn.x}, ${opponentSpawn.y}).`);
    combatLog.push(`Ambos combatentes se aproximam e utilizam suas 100 Health e 100 Mana Potions automaticamente!`);

    // Simulação determinística de rounds de combate
    let rounds = 0;
    let playerUsedHealthPots = 0;
    let playerUsedManaPots = 0;
    let oppUsedHealthPots = 0;
    let oppUsedManaPots = 0;

    while (playerHp > 0 && oppHp > 0 && rounds < 50) {
      rounds++;

      // Dano do Jogador no Oponente
      const playerAttack = Math.floor(player.level * 2.5 + Math.random() * 40 + 20);
      oppHp -= playerAttack;

      // Dano do Oponente no Jogador
      const oppAttack = Math.floor(opponent.level * 2.4 + Math.random() * 38 + 18);
      playerHp -= oppAttack;

      // Auto Potion do Jogador
      if (playerHp < playerMaxHp * 0.65 && playerHealthPotions > 0) {
        playerHealthPotions--;
        playerUsedHealthPots++;
        playerHp = Math.min(playerMaxHp, playerHp + Math.floor(playerMaxHp * 0.35));
      }
      if (playerMana < playerMaxMana * 0.5 && playerManaPotions > 0) {
        playerManaPotions--;
        playerUsedManaPots++;
        playerMana = Math.min(playerMaxMana, playerMana + Math.floor(playerMaxMana * 0.4));
      }

      // Auto Potion do Oponente
      if (oppHp < oppMaxHp * 0.65 && oppHealthPotions > 0) {
        oppHealthPotions--;
        oppUsedHealthPots++;
        oppHp = Math.min(oppMaxHp, oppHp + Math.floor(oppMaxHp * 0.35));
      }
      if (oppMana < oppMaxMana * 0.5 && oppManaPotions > 0) {
        oppManaPotions--;
        oppUsedManaPots++;
        oppMana = Math.min(oppMaxMana, oppMana + Math.floor(oppMaxMana * 0.4));
      }
    }

    let result: 'win' | 'loss' | 'draw' = 'win';
    if (playerHp <= 0 && oppHp <= 0) {
      result = 'draw';
    } else if (playerHp <= 0) {
      result = 'loss';
    } else {
      result = 'win';
    }

    // 4. SISTEMA DE PONTOS E RANKS (+20 pontos por vitória, 250 por rank)
    const pointsDelta = calculatePointsDelta(result);
    const newPoints = playerPoints + pointsDelta;
    const newTierInfo = getPvPTierInfo(newPoints);
    const promotion = checkRankPromotion(playerPoints, newPoints);
    const rewards = calculateArenaRewards(result);

    const currentWins = (player as any).pvpWins ?? 0;
    const currentLosses = (player as any).pvpLosses ?? 0;
    const currentDraws = (player as any).pvpDraws ?? 0;
    const currentCoins = (player as any).arenaCoins ?? 0;

    const newWins = result === 'win' ? currentWins + 1 : currentWins;
    const newLosses = result === 'loss' ? currentLosses + 1 : currentLosses;
    const newDraws = result === 'draw' ? currentDraws + 1 : currentDraws;
    const newCoins = currentCoins + rewards.arenaCoins;

    // Se alcançou 250 pontos pela primeira vez, habilita displaySkull
    let autoDisplaySkull = (player as any).displaySkull;
    if (newPoints >= 250 && typeof autoDisplaySkull !== 'boolean') {
      autoDisplaySkull = true;
    }

    // 5. HISTÓRICO DE PARTIDA
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
      opponentPoints: opponent.points,
      result,
      pointsChange: pointsDelta,
      eloChange: pointsDelta,
      timestamp: Date.now(),
    };

    history.unshift(matchRecord);
    if (history.length > 20) history = history.slice(0, 20);

    // 6. PERSISTÊNCIA NO PRISMA
    await prisma.character.update({
      where: { id: player.id },
      data: {
        pvpElo: newPoints,
        pvpTier: newTierInfo.tier,
        pvpWins: newWins,
        pvpLosses: newLosses,
        pvpDraws: newDraws,
        arenaCoins: newCoins,
        displaySkull: autoDisplaySkull ?? true,
        pvpMatchHistoryJson: JSON.stringify(history),
      },
    });

    return NextResponse.json({
      success: true,
      result,
      opponent,
      playerSpawn,
      opponentSpawn,
      potionsUsed: {
        health: playerUsedHealthPots,
        mana: playerUsedManaPots,
      },
      pointsDelta,
      newPoints,
      newTier: newTierInfo.tier,
      newSkull: newTierInfo.skull,
      skullAsset: newTierInfo.skullAsset,
      arenaCoinsDelta: rewards.arenaCoins,
      newCoins,
      promotion,
      unlockedSkullToggle: canDisplaySkull(newPoints),
      matchRecord,
    });
  } catch (error: any) {
    console.error('[PVP QUEUE API] Erro ao processar duelo:', error);
    return NextResponse.json({ success: false, error: error.message || 'Falha ao processar partida.' }, { status: 500 });
  }
}
