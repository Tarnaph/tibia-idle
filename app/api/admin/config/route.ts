import { NextResponse } from 'next/server';
import { serverConfigManager, type ServerConfig } from '@/packages/server/src/config/ServerConfigManager';
import { systemLogger } from '@/packages/server/src/logging/SystemLogger';
import { requireAdminAuth } from '@/packages/auth/src';

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
    const config = serverConfigManager.getConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    requireAdminAuth(request);
    const body = (await request.json()) as Partial<ServerConfig>;
    const updated = serverConfigManager.updateConfig(body);
    systemLogger.gmAction('ADMIN', 'Atualizou variáveis do servidor', body);
    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
