import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { characterId, displaySkull } = body;

    if (!characterId || typeof displaySkull !== 'boolean') {
      return NextResponse.json({ success: false, error: 'characterId e displaySkull booleano são obrigatórios' }, { status: 400 });
    }

    const updated = await prisma.character.update({
      where: { id: characterId },
      data: {
        displaySkull,
      },
      select: {
        id: true,
        name: true,
        displaySkull: true,
      },
    });

    return NextResponse.json({ success: true, character: updated });
  } catch (error: any) {
    console.error('[PVP TOGGLE SKULL API] Erro:', error);
    return NextResponse.json({ success: false, error: error.message || 'Falha ao alterar exibição de caveira.' }, { status: 500 });
  }
}
