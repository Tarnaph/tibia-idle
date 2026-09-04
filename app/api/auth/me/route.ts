import { NextResponse } from 'next/server';
import { verifyAuthToken, AccountService } from '@/packages/auth/src';
import { prisma } from '@/packages/database/src';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token de autenticação não fornecido.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyAuthToken(token);
    const service = new AccountService(prisma);
    const account = await service.getAccountById(decoded.accountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Conta não encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: account }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Token inválido ou expirado.' },
      { status: 401 }
    );
  }
}
