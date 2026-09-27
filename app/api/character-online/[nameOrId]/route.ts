import { NextResponse } from 'next/server';
import { prisma } from '@/packages/database/src';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nameOrId: string }> }
) {
  try {
    const { nameOrId } = await params;
    const target = decodeURIComponent(nameOrId || '').trim();
    if (!target) {
      return NextResponse.json({ success: false, error: 'Identificador ausente.' }, { status: 400 });
    }

    const colyseusPort = process.env.COLYSEUS_PORT || 2567;

    // 1. Tenta consultar diretamente o Colyseus local via HTTP rápido (timeout 1.5s)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`http://127.0.0.1:${colyseusPort}/api/character-online/${encodeURIComponent(target)}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (typeof data.isOnline === 'boolean') {
          return NextResponse.json({ success: true, target, isOnline: data.isOnline }, { status: 200 });
        }
      }
    } catch {}

    // 2. Fallback: consulta status isOnline no Prisma
    try {
      const char = await prisma.character.findFirst({
        where: {
          OR: [
            { id: target },
            { name: { equals: target } },
          ],
        },
        select: { id: true, name: true, isOnline: true },
      });
      return NextResponse.json({
        success: true,
        target,
        isOnline: Boolean(char?.isOnline),
      }, { status: 200 });
    } catch {
      return NextResponse.json({ success: true, target, isOnline: false }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
