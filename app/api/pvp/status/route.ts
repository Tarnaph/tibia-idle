import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';
import { getPvPTierInfo, DEFAULT_PVP_TACTICS, type PvPMatchRecord, type PvPTacticBoard } from '@/packages/domain/src/pvp';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return NextResponse.json({ success: false, error: 'characterId é obrigatório' }, { status: 400 });
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        account: {
          include: {
            characters: {
              select: {
                id: true,
                name: true,
                vocationName: true,
                level: true,
              },
              orderBy: { level: 'desc' },
            },
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ success: false, error: 'Personagem não encontrado' }, { status: 404 });
    }

    const elo = (character as any).pvpElo ?? 1000;
    const tierInfo = getPvPTierInfo(elo);

    // Parsing do histórico de partidas
    let matchHistory: PvPMatchRecord[] = [];
    if ((character as any).pvpMatchHistoryJson) {
      try {
        const parsed = JSON.parse((character as any).pvpMatchHistoryJson);
        if (Array.isArray(parsed)) matchHistory = parsed.slice(0, 10);
      } catch {}
    }

    // Parsing das táticas da arena (3 pranchas)
    let tactics: PvPTacticBoard[] = DEFAULT_PVP_TACTICS;
    if ((character as any).pvpTacticsJson) {
      try {
        const parsed = JSON.parse((character as any).pvpTacticsJson);
        if (Array.isArray(parsed) && parsed.length > 0) tactics = parsed;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      characterId: character.id,
      characterName: character.name,
      elo,
      tier: tierInfo.tier,
      tierLabel: tierInfo.label,
      skull: tierInfo.skull,
      skullAsset: tierInfo.skullAsset,
      badgeColor: tierInfo.badgeColor,
      wins: (character as any).pvpWins ?? 0,
      losses: (character as any).pvpLosses ?? 0,
      draws: (character as any).pvpDraws ?? 0,
      arenaCoins: (character as any).arenaCoins ?? 0,
      seasonRemaining: '2d',
      displaySkull: typeof (character as any).displaySkull === 'boolean' ? (character as any).displaySkull : true,
      matchHistory,
      tactics,
      accountCharacters: character.account.characters || [],
    });
  } catch (error: any) {
    console.error('[PVP STATUS API] Erro:', error);
    return NextResponse.json({ success: false, error: error.message || 'Falha ao buscar status do PvP.' }, { status: 500 });
  }
}
