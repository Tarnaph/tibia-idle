import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const colyseusPort = process.env.COLYSEUS_PORT || 2567;
    // 1. Tenta consultar diretamente o Colyseus local via HTTP rápido (timeout 1.5s)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`http://127.0.0.1:${colyseusPort}/api/online-count`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (typeof data.count === 'number') {
          return NextResponse.json({ success: true, count: Math.max(1, data.count) }, { status: 200 });
        }
      }
    } catch {}

    // 2. Fallback: conta personagens marcados como isOnline no banco Prisma
    try {
      const count = await prisma.character.count({
        where: { isOnline: true },
      });
      return NextResponse.json({ success: true, count: Math.max(1, count) }, { status: 200 });
    } catch {
      return NextResponse.json({ success: true, count: 1 }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, count: 1, error: error?.message }, { status: 500 });
  }
}
