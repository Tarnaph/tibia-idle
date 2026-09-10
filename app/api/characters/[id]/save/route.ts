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

function safeBigInt(value: any): bigint | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    if (typeof value === 'bigint') return value;
    const num = Number(value);
    if (!isNaN(num)) return BigInt(Math.floor(num));
    return BigInt(value);
  } catch {
    return undefined;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAuthAccountId(request);
    const { id } = await params;
    const body = (await request.json()) as Record<string, any>;

    const service = new CharacterService(prisma);

    // Verify character ownership
    const existing = await service.getCharacterById(id);
    if (!existing || existing.accountId !== accountId) {
      return NextResponse.json({ success: false, error: 'Personagem não encontrado ou sem permissão.' }, { status: 403 });
    }

    const updated = await service.saveCharacterProgress(id, {
      level: body.level,
      experience: safeBigInt(body.experience),
      health: body.health,
      maxHealth: body.maxHealth,
      mana: body.mana,
      maxMana: body.maxMana,
      capacity: body.capacity,
      posX: body.posX,
      posY: body.posY,
      posZ: body.posZ,
      outfitLookType: body.outfitLookType ?? body.lookType,
      outfit: body.outfit,
      outfitHead: body.outfitHead ?? body.outfitColors?.head,
      outfitBody: body.outfitBody ?? body.outfitColors?.primary ?? body.outfitColors?.body,
      outfitLegs: body.outfitLegs ?? body.outfitColors?.secondary ?? body.outfitColors?.legs,
      outfitFeet: body.outfitFeet ?? body.outfitColors?.detail ?? body.outfitColors?.feet,
      outfitAddons: body.outfitAddons !== undefined ? Number(body.outfitAddons) : body.addons !== undefined ? Number(body.addons) : undefined,
      mount: body.mount,
      mountActive: body.mountActive !== undefined ? Boolean(body.mountActive) : body.isMounted !== undefined ? Boolean(body.isMounted) : undefined,
      avatarId: body.avatarId,
      skills: body.skills,
      inventory: body.inventory,
      hotbar: body.hotbar,
      hotbarConfigs: body.hotbarConfigs,
      vocationName: body.vocationName,
      promotion: body.promotion,
    });

    const sanitizedData = JSON.parse(
      JSON.stringify(updated, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      )
    );

    return NextResponse.json({
      success: true,
      data: sanitizedData,
    }, { status: 200 });
  } catch (error: any) {
    try { await request.body?.cancel?.(); } catch {}
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao salvar progresso do personagem.' },
      { status: 400 }
    );
  }
}
