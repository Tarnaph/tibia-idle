import { NextResponse } from 'next/server';
import { systemLogger, type LogLevel } from '@/packages/server/src/logging/SystemLogger';
import { requireAdminAuth } from '@/packages/auth/src';

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as LogLevel | null;
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('query') || undefined;

    const logs = systemLogger.getLogs({
      level: level || undefined,
      category,
      query,
    });

    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdminAuth(request);
    systemLogger.clearLogs();
    return NextResponse.json({ success: true, message: 'Logs limpos com sucesso.' });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
