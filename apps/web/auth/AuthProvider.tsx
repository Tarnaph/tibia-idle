'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/packages/auth/src/browser';
import { isSupabaseConfigured, publicSiteUrl } from '@/packages/auth/src/config';
import { performSignOut } from '@/packages/auth/src/authActions';
import type { AuthStatus, AuthViewer, ProfileRow } from '@/packages/auth/src/types';

interface AuthResult {
  message?: string;
  requiresEmailConfirmation?: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  viewer: AuthViewer | null;
  configured: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(displayName: string, email: string, password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function browserViewer(user: User): Promise<AuthViewer> {
  const supabase = getBrowserSupabase();
  let profile: ProfileRow | null = null;
  if (supabase) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();
    profile = data as ProfileRow | null;
  }

  const metadataName = typeof user.user_metadata.display_name === 'string'
    ? user.user_metadata.display_name
    : typeof user.user_metadata.full_name === 'string'
      ? user.user_metadata.full_name
      : null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name || metadataName || user.email?.split('@')[0] || 'Aventureiro',
    avatarUrl: profile?.avatar_url || (typeof user.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : null),
    role: profile?.role === 'admin' ? 'admin' : 'player',
  };
}

export function AuthProvider({ initialViewer, children }: { initialViewer: AuthViewer | null; children: ReactNode }) {
  const router = useRouter();
  const [viewer, setViewer] = useState<AuthViewer | null>(initialViewer);
  const [status, setStatus] = useState<AuthStatus>(initialViewer ? 'authenticated' : isSupabaseConfigured ? 'loading' : 'unauthenticated');

  const applyUser = useCallback(async (user: User | null) => {
    if (!user) {
      setViewer(null);
      setStatus('unauthenticated');
      return;
    }
    const nextViewer = await browserViewer(user);
    setViewer(nextViewer);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) void applyUser(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void applyUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [applyUser]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    viewer,
    configured: isSupabaseConfigured,
    async signIn(email, password) {
      const supabase = getBrowserSupabase();
      if (!supabase) throw new Error('A autenticação ainda não foi configurada neste ambiente.');
      setStatus('loading');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('unauthenticated');
        throw error;
      }
      await applyUser(data.user);
      router.push('/game');
      router.refresh();
      return {};
    },
    async signUp(displayName, email, password) {
      const supabase = getBrowserSupabase();
      if (!supabase) throw new Error('A autenticação ainda não foi configurada neste ambiente.');
      setStatus('loading');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${publicSiteUrl()}/auth/callback?next=/game`,
        },
      });
      if (error) {
        setStatus('unauthenticated');
        throw error;
      }
      if (!data.session) {
        setStatus('unauthenticated');
        return {
          requiresEmailConfirmation: true,
          message: 'Conta criada. Confirme o link enviado ao seu e-mail para entrar.',
        };
      }
      await applyUser(data.user);
      router.push('/game');
      router.refresh();
      return {};
    },
    async signInWithGoogle() {
      const supabase = getBrowserSupabase();
      if (!supabase) throw new Error('A autenticação ainda não foi configurada neste ambiente.');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/game` },
      });
      if (error) throw error;
    },
    async signOut() {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      setStatus('loading');
      await performSignOut(supabase.auth);
      setViewer(null);
      setStatus('unauthenticated');
      router.push('/');
      router.refresh();
    },
  }), [applyUser, router, status, viewer]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
