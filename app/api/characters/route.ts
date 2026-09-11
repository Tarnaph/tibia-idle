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

    const formatCharacter = (c: any) => {
      let parsedBestiaryKills: Record<string, number> = {};
      if (c.bestiaryKillsJson) {
        try {
          parsedBestiaryKills = typeof c.bestiaryKillsJson === 'string'
            ? JSON.parse(c.bestiaryKillsJson)
            : c.bestiaryKillsJson;
        } catch {}
      }
      return {
        ...c,
        addons: c.outfitAddons ?? 0,
        outfitAddons: c.outfitAddons ?? 0,
        outfitColors: {
          head: c.outfitHead ?? 0,
          primary: c.outfitBody ?? 86,
          secondary: c.outfitLegs ?? 114,
          detail: c.outfitFeet ?? 76,
        },
        positionX: c.posX,
        positionY: c.posY,
        positionZ: c.posZ,
        experience: Number(c.experience),
        skills: c.skills ? c.skills.map((s: any) => ({ ...s, tries: Number(s.tries) })) : [],
        bestiaryKills: parsedBestiaryKills,
      };
    };

    const formatted = characters.map(formatCharacter);

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

    let parsedBestiaryKills: Record<string, number> = {};
    if ((character as any).bestiaryKillsJson) {
      try {
        parsedBestiaryKills = typeof (character as any).bestiaryKillsJson === 'string'
          ? JSON.parse((character as any).bestiaryKillsJson)
          : (character as any).bestiaryKillsJson;
      } catch {}
    }

    const formatted = {
      ...character,
      addons: character.outfitAddons ?? 0,
      outfitAddons: character.outfitAddons ?? 0,
      outfitColors: {
        head: character.outfitHead ?? 0,
        primary: character.outfitBody ?? 86,
        secondary: character.outfitLegs ?? 114,
        detail: character.outfitFeet ?? 76,
      },
      experience: Number(character.experience),
      skills: character.skills.map((s) => ({ ...s, tries: Number(s.tries) })),
      bestiaryKills: parsedBestiaryKills,
    };

    return NextResponse.json({ success: true, data: formatted }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao criar personagem.' },
      { status: 400 }
    );
  }
}
