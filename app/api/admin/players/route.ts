import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';
import { systemLogger } from '@/packages/server/src/logging/SystemLogger';
import { requireAdminAuth } from '@/packages/auth/src';

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
    const characters = await prisma.character.findMany({
      include: {
        account: {
          select: {
            id: true,
            email: true,
            role: true,
            isBanned: true,
          },
        },
      },
      orderBy: { level: 'desc' },
      take: 100,
    });

    const formatted = characters.map((c) => ({
      id: c.id,
      name: c.name,
      vocationId: c.vocationId,
      vocationName: c.vocationName,
      level: c.level,
      health: c.health,
      maxHealth: c.maxHealth,
      mana: c.mana,
      maxMana: c.maxMana,
      posX: c.posX,
      posY: c.posY,
      posZ: c.posZ,
      accountId: c.accountId,
      accountEmail: c.account?.email || 'N/A',
      isBanned: c.account?.isBanned ?? false,
      role: c.account?.role || 'PLAYER',
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, count: formatted.length, players: formatted });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    requireAdminAuth(request);
    const body = (await request.json()) as any;
    const { action, characterId, accountId, value, x, y, z } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Ação é obrigatória.' }, { status: 400 });
    }

    if (action === 'ban' && accountId) {
      await prisma.account.update({
        where: { id: accountId },
        data: { isBanned: true },
      });
      systemLogger.gmAction('ADMIN', `Banitou a conta ${accountId}`, { accountId, characterId });
      return NextResponse.json({ success: true, message: 'Conta banida com sucesso.' });
    }

    if (action === 'unban' && accountId) {
      await prisma.account.update({
        where: { id: accountId },
        data: { isBanned: false },
      });
      systemLogger.gmAction('ADMIN', `Desbanitou a conta ${accountId}`, { accountId, characterId });
      return NextResponse.json({ success: true, message: 'Conta desbanida com sucesso.' });
    }

    if (action === 'give_exp' && characterId && typeof value === 'number') {
      const char = await prisma.character.findUnique({ where: { id: characterId } });
      if (char) {
        const newLevel = Math.max(1, char.level + Math.floor(value / 100));
        await prisma.character.update({
          where: { id: characterId },
          data: { level: newLevel, experience: char.experience + BigInt(value) },
        });
        systemLogger.gmAction('ADMIN', `Concedeu ${value} EXP ao personagem ${char.name}`, { characterId, newLevel });
      }
      return NextResponse.json({ success: true, message: 'Experiência concedida com sucesso.' });
    }

    if (action === 'teleport' && characterId && typeof x === 'number' && typeof y === 'number') {
      await prisma.character.update({
        where: { id: characterId },
        data: { posX: x, posY: y, posZ: typeof z === 'number' ? z : 7 },
      });
      systemLogger.gmAction('ADMIN', `Teleportou ${characterId} para (${x}, ${y}, ${z ?? 7})`, { characterId, x, y, z });
      return NextResponse.json({ success: true, message: 'Teleporte realizado com sucesso.' });
    }

    systemLogger.gmAction('ADMIN', `Executou ação customizada ${action}`, body);
    return NextResponse.json({ success: true, message: `Ação ${action} executada.` });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
