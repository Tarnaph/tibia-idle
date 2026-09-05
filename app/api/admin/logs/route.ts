import { NextResponse } from 'next/server';
import { systemLogger, type LogLevel } from '@/packages/server/src/logging/SystemLogger';

export async function GET(request: Request) {
  try {
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    systemLogger.clearLogs();
    return NextResponse.json({ success: true, message: 'Logs limpos com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
