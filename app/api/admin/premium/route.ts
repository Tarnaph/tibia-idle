import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';
import { systemLogger } from '@/packages/server/src/logging/SystemLogger';
import { requireAdminAuth } from '@/packages/auth/src';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const caller = requireAdminAuth(request);
    const callerRole = String(caller.role || '').toUpperCase();

    // Somente GOD/ADMIN pode alterar Premium, com verificação estrita no servidor
    if (callerRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Apenas Administradores (GOD) podem gerenciar dias de Premium Account.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as any;
    const { accountId, action, days: rawDays } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'ID da conta (accountId) é obrigatório.' },
        { status: 400 }
      );
    }

    const validActions = ['add_days', 'remove_days', 'add_30_days', 'set_free'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Ação inválida. Ações permitidas: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    let days = 0;
    if (action === 'add_30_days') {
      days = 30;
    } else if (action === 'add_days' || action === 'remove_days') {
      const parsed = Number(rawDays);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          { success: false, error: 'A quantidade de dias deve ser um número inteiro positivo maior que zero.' },
          { status: 400 }
        );
      }
      days = parsed;
    }

    // Atomic transaction for safe concurrency and audit logging
    const result = await prisma.$transaction(async (tx) => {
      const targetAccount = await tx.account.findUnique({
        where: { id: accountId },
        include: {
          characters: {
            select: { id: true, name: true, level: true },
          },
        },
      });

      if (!targetAccount) {
        throw new Error('Conta não encontrada.');
      }

      const serverNow = new Date();
      const previousUntil = targetAccount.premiumUntil;
      const isCurrentlyActive = Boolean(
        targetAccount.isPremium && previousUntil && previousUntil.getTime() > serverNow.getTime()
      );

      let newUntil: Date | null = null;
      let newIsPremium = false;
      let actionSummary = '';

      if (action === 'add_days' || action === 'add_30_days') {
        const baseTime = isCurrentlyActive && previousUntil ? previousUntil.getTime() : serverNow.getTime();
        newUntil = new Date(baseTime + days * ONE_DAY_MS);
        newIsPremium = true;
        actionSummary = `Adicionados ${days} dias de Premium. Vencimento: ${newUntil.toISOString()}`;
      } else if (action === 'remove_days') {
        if (!isCurrentlyActive || !previousUntil) {
          // Já é Free ou já expirou
          newUntil = null;
          newIsPremium = false;
          actionSummary = `Conta já era Free Account. Nenhum dia removido.`;
        } else {
          const remainingMs = previousUntil.getTime() - days * ONE_DAY_MS;
          if (remainingMs <= serverNow.getTime()) {
            newUntil = null;
            newIsPremium = false;
            actionSummary = `Removidos ${days} dias. Prazo esgotado, conta retornada para Free Account imediatamente.`;
          } else {
            newUntil = new Date(remainingMs);
            newIsPremium = true;
            actionSummary = `Removidos ${days} dias de Premium. Novo vencimento: ${newUntil.toISOString()}`;
          }
        }
      } else if (action === 'set_free') {
        newUntil = null;
        newIsPremium = false;
        actionSummary = `Assinatura Premium encerrada imediatamente. Conta convertida para Free Account.`;
      }

      // Atualiza a conta
      const updatedAccount = await tx.account.update({
        where: { id: targetAccount.id },
        data: {
          isPremium: newIsPremium,
          premiumUntil: newUntil,
        },
      });

      // Registra trilha de auditoria
      await tx.adminAuditLog.create({
        data: {
          adminId: caller.accountId,
          adminEmail: caller.email,
          targetAccId: targetAccount.id,
          targetEmail: targetAccount.email,
          action: action.toUpperCase(),
          days,
          previousUntil,
          newUntil,
          details: `Admin ${caller.email} executou [${action}] para conta ${targetAccount.email} (${days} dias). ${actionSummary}`,
        },
      });

      return {
        updatedAccount,
        targetAccount,
        previousUntil,
        newUntil,
        newIsPremium,
        actionSummary,
      };
    });

    systemLogger.gmAction(caller.email, `Gerenciamento de Premium: ${result.actionSummary}`, {
      adminEmail: caller.email,
      targetEmail: result.targetAccount.email,
      targetAccountId: result.targetAccount.id,
      action,
      days,
      previousUntil: result.previousUntil?.toISOString() || null,
      newUntil: result.newUntil?.toISOString() || null,
      serverTime: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: result.actionSummary,
      account: {
        id: result.updatedAccount.id,
        email: result.updatedAccount.email,
        isPremium: result.newIsPremium,
        premiumUntil: result.newUntil ? result.newUntil.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error('[API /api/admin/premium Error]', error);
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao processar Premium.' },
      { status }
    );
  }
}
