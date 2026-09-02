import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { isSupabaseConfigured, supabaseConfig } from './config';
import type { AuthViewer, ProfileRow } from './types';

export async function createServerSupabase() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();

  return createServerClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. proxy.ts performs refreshes.
        }
      },
    },
  });
}

function viewerFrom(user: User, profile: ProfileRow | null): AuthViewer {
  const metadataName = typeof user.user_metadata.display_name === 'string'
    ? user.user_metadata.display_name
    : typeof user.user_metadata.full_name === 'string'
      ? user.user_metadata.full_name
      : null;
  const metadataAvatar = typeof user.user_metadata.avatar_url === 'string'
    ? user.user_metadata.avatar_url
    : null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name || metadataName || user.email?.split('@')[0] || 'Aventureiro',
    avatarUrl: profile?.avatar_url || metadataAvatar,
    role: profile?.role === 'admin' ? 'admin' : 'player',
  };
}

export async function getCurrentViewer(): Promise<AuthViewer | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();

  return viewerFrom(user, data as ProfileRow | null);
}
