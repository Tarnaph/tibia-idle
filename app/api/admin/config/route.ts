import { NextResponse } from 'next/server';
import { serverConfigManager, type ServerConfig } from '@/packages/server/src/config/ServerConfigManager';
import { systemLogger } from '@/packages/server/src/logging/SystemLogger';

export async function GET() {
  try {
    const config = serverConfigManager.getConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ServerConfig>;
    const updated = serverConfigManager.updateConfig(body);
    systemLogger.gmAction('ADMIN', 'Atualizou variáveis do servidor', body);
    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
