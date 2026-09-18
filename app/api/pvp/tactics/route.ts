import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { characterId, tactics } = body;

    if (!characterId || !Array.isArray(tactics)) {
      return NextResponse.json({ success: false, error: 'characterId e array de tactics são obrigatórios' }, { status: 400 });
    }

    await prisma.character.update({
      where: { id: characterId },
      data: {
        pvpTacticsJson: JSON.stringify(tactics),
      },
    });

    return NextResponse.json({ success: true, tactics });
  } catch (error: any) {
    console.error('[PVP TACTICS API] Erro ao salvar táticas:', error);
    return NextResponse.json({ success: false, error: error.message || 'Falha ao salvar táticas.' }, { status: 500 });
  }
}
