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

export async function GET(request: Request) {
  try {
    const accountId = getAuthAccountId(request);
    const service = new CharacterService(prisma);
    const characters = await service.getCharactersByAccountId(accountId);

    // Format characters ensuring bigints are serialized properly
    const formatted = characters.map((c) => ({
      ...c,
      positionX: c.posX,
      positionY: c.posY,
      positionZ: c.posZ,
      experience: Number(c.experience),
      skills: c.skills.map((s) => ({ ...s, tries: Number(s.tries) })),
    }));

    return NextResponse.json({ success: true, data: formatted }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao listar personagens.' },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const accountId = getAuthAccountId(request);
    const body = (await request.json()) as { name?: string; vocationId?: number | string };
    const service = new CharacterService(prisma);

    const character = await service.createCharacter({
      accountId,
      name: body.name || '',
      vocationId: Number(body.vocationId),
    });

    const formatted = {
      ...character,
      experience: Number(character.experience),
      skills: character.skills.map((s) => ({ ...s, tries: Number(s.tries) })),
    };

    return NextResponse.json({ success: true, data: formatted }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao criar personagem.' },
      { status: 400 }
    );
  }
}
