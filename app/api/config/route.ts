import { NextResponse } from 'next/server';
import { serverConfigManager } from '@/packages/server/src/config/ServerConfigManager';

export async function GET() {
  try {
    const config = serverConfigManager.getConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
