import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/packages/auth/src/server';

function safeNext(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/game';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));
  const supabase = await createServerSupabase();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', url.origin));
}
