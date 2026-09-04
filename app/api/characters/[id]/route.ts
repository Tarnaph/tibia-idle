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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = new CharacterService(prisma);
    const character = await service.getCharacterById(id);

    if (!character) {
      return NextResponse.json(
        { success: false, error: 'Personagem não encontrado.' },
        { status: 404 }
      );
    }

    const formatted = {
      ...character,
      experience: Number(character.experience),
      skills: character.skills.map((s) => ({ ...s, tries: Number(s.tries) })),
    };

    return NextResponse.json({ success: true, data: formatted }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar personagem.' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthAccountId(request);
    const { id } = await params;
    const service = new CharacterService(prisma);
    await service.deleteCharacter(accountId, id);

    return NextResponse.json({ success: true, message: 'Personagem deletado com sucesso.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao deletar personagem.' },
      { status: 400 }
    );
  }
}
