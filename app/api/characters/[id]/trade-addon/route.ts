import { NextResponse } from 'next/server';
import { verifyAuthToken, CharacterService } from '@/packages/auth/src';
import { prisma } from '@/packages/database/src';

function getAuthAccountId(request: Request): string {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Autenticação necessária.');
  }
  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyAuthToken(token);
  return decoded.accountId;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthAccountId(request);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const questId = body.questId || 'citizen-addon-1';

    const service = new CharacterService(prisma);
    const result = await service.tradeAddonQuest(id, questId, accountId);

    return NextResponse.json(
      {
        success: true,
        message: `Parabéns! ${result.rewardName} desbloqueado com sucesso!`,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao realizar troca da missão de addon.',
      },
      { status: 400 }
    );
  }
}
