import { NextResponse } from 'next/server';
import { AccountService } from '@/packages/auth/src';
import { prisma } from '@/packages/database/src';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const service = new AccountService(prisma);
    const result = await service.login({
      email: body.email || '',
      password: body.password || '',
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao realizar login.' },
      { status: 401 }
    );
  }
}
