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
      adminTitle: c.adminTitle ?? null,
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
    const caller = requireAdminAuth(request);
    const body = (await request.json()) as any;
    const { action, characterId, accountId, value, x, y, z } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Ação é obrigatória.' }, { status: 400 });
    }

    const callerRole = String(caller.role || '').toUpperCase();

    // GM Promotion and Demotion (Restricted strictly to GOD / ADMIN)
    if (action === 'promote_gm' || action === 'demote_gm') {
      if (callerRole !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Apenas o GOD/Administrador pode promover ou remover Game Masters (GM).' },
          { status: 403 }
        );
      }

      if (!characterId && !accountId) {
        return NextResponse.json(
          { success: false, error: 'characterId ou accountId é obrigatório para esta ação.' },
          { status: 400 }
        );
      }

      let targetChar = characterId
        ? await prisma.character.findUnique({ where: { id: characterId }, include: { account: true } })
        : null;
      let targetAcc = accountId
        ? await prisma.account.findUnique({ where: { id: accountId } })
        : targetChar?.account;

      if (!targetChar && targetAcc) {
        targetChar = await prisma.character.findFirst({ where: { accountId: targetAcc.id }, include: { account: true } });
      }

      if (!targetAcc) {
        return NextResponse.json({ success: false, error: 'Conta de jogador não encontrada.' }, { status: 404 });
      }

      const targetRoleUpper = String(targetAcc.role || '').toUpperCase();
      const targetTitleUpper = String(targetChar?.adminTitle || '').toUpperCase();

      // Inviolability of GOD: Never downgrade or alter an existing GOD
      if (targetRoleUpper === 'ADMIN' || targetTitleUpper === 'GOD') {
        return NextResponse.json(
          { success: false, error: 'Não é permitido alterar ou rebaixar um GOD existente.' },
          { status: 400 }
        );
      }

      if (action === 'promote_gm') {
        await prisma.account.update({
          where: { id: targetAcc.id },
          data: { role: 'GM' },
        });

        if (targetChar) {
          await prisma.character.update({
            where: { id: targetChar.id },
            data: { adminTitle: 'GM' },
          });
        }

        systemLogger.gmAction(caller.email, `Promoveu jogador a GM: ${targetChar?.name || targetAcc.email}`, {
          promotedBy: caller.email,
          promoterAccountId: caller.accountId,
          targetAccountId: targetAcc.id,
          targetAccountEmail: targetAcc.email,
          targetCharacterId: targetChar?.id,
          targetCharacterName: targetChar?.name,
          promotedAt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: `Jogador ${targetChar?.name || targetAcc.email} promovido a GM com sucesso!`,
        });
      }

      if (action === 'demote_gm') {
        await prisma.account.update({
          where: { id: targetAcc.id },
          data: { role: 'PLAYER' },
        });

        if (targetChar) {
          await prisma.character.update({
            where: { id: targetChar.id },
            data: { adminTitle: null },
          });
        }

        systemLogger.gmAction(caller.email, `Removeu cargo de GM de: ${targetChar?.name || targetAcc.email}`, {
          demotedBy: caller.email,
          demoterAccountId: caller.accountId,
          targetAccountId: targetAcc.id,
          targetAccountEmail: targetAcc.email,
          targetCharacterId: targetChar?.id,
          targetCharacterName: targetChar?.name,
          demotedAt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: `Privilégios de GM de ${targetChar?.name || targetAcc.email} removidos com sucesso.`,
        });
      }
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
