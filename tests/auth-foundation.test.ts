import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  authModalReducer,
  canManageUpdates,
  decideAccess,
  performSignOut,
  visiblePublicUpdates,
  type GameUpdateRow,
} from '../packages/auth/src';
import { slugifyUpdateTitle } from '../packages/updates/src/slug';

const update = (overrides: Partial<GameUpdateRow>): GameUpdateRow => ({
  id: crypto.randomUUID(),
  title: 'Atualização',
  slug: 'atualizacao',
  summary: 'Resumo público',
  content: 'Conteúdo completo',
  published_at: '2026-09-01T12:00:00.000Z',
  updated_at: '2026-09-01T12:00:00.000Z',
  published: true,
  ...overrides,
});

describe('protected route authorization', () => {
  it('redirects a signed-out visitor away from /game', () => {
    expect(decideAccess('game', null)).toBe('login-required');
  });

  it('allows an authenticated player into /game', () => {
    expect(decideAccess('game', { role: 'player' })).toBe('allow');
  });

  it('denies /admin to player and allows admin', () => {
    expect(decideAccess('admin', { role: 'player' })).toBe('forbidden');
    expect(decideAccess('admin', { role: 'admin' })).toBe('allow');
    expect(canManageUpdates('player')).toBe(false);
    expect(canManageUpdates('admin')).toBe(true);
  });
});

describe('public updates', () => {
  it('returns only published rows in newest-first order', () => {
    const rows = [
      update({ id: 'draft', published: false, published_at: null }),
      update({ id: 'older', published_at: '2026-08-01T12:00:00.000Z' }),
      update({ id: 'newer', published_at: '2026-09-01T12:00:00.000Z' }),
    ];
    expect(visiblePublicUpdates(rows).map((row) => row.id)).toEqual(['newer', 'older']);
  });

  it('creates deterministic URL-safe slugs', () => {
    expect(slugifyUpdateTitle('Sistema de Caça — Atualizado!')).toBe('sistema-de-caca-atualizado');
  });
});

describe('account UI behavior', () => {
  it('opens login from the Jogar action and can switch to signup', () => {
    const login = authModalReducer({ open: false, mode: 'login' }, { type: 'open-login' });
    expect(login).toEqual({ open: true, mode: 'login' });
    expect(authModalReducer(login, { type: 'switch', mode: 'signup' })).toEqual({ open: true, mode: 'signup' });
  });

  it('logout delegates session removal to the auth provider', async () => {
    let session = 'active';
    const signOut = vi.fn(async () => {
      session = '';
      return { error: null };
    });
    await performSignOut({ signOut });
    expect(signOut).toHaveBeenCalledOnce();
    expect(session).toBe('');
  });
});

describe('security and gameplay regression', () => {
  it('migration enables RLS and never grants role updates to clients', () => {
    const sql = readFileSync(new URL('../supabase/migrations/202609010001_account_auth_foundation.sql', import.meta.url), 'utf8');
    expect(sql).toContain('alter table public.profiles enable row level security');
    expect(sql).toContain('alter table public.game_updates enable row level security');
    expect(sql).toContain('grant update (display_name, avatar_url)');
    expect(sql).not.toMatch(/grant update \(.*role/i);
    expect(sql).toContain('using (published = true)');
    expect(sql).toContain('private.is_admin()');
  });

  it('keeps the existing game client available as the /game content', () => {
    const gameRoute = readFileSync(new URL('../app/game/page.tsx', import.meta.url), 'utf8');
    const gameClient = readFileSync(new URL('../apps/web/components/GamePrototype.tsx', import.meta.url), 'utf8');
    expect(gameRoute).toContain("import { GamePrototype }");
    expect(gameRoute).toContain('return <GamePrototype />');
    expect(gameClient).toContain('export function GamePrototype()');
  });

  it('keeps the unauthenticated preview restricted to development builds', () => {
    const previewRoute = readFileSync(new URL('../app/game-preview/page.tsx', import.meta.url), 'utf8');
    expect(previewRoute).toContain("process.env.NODE_ENV !== 'development'");
    expect(previewRoute).toContain('notFound()');
    expect(previewRoute).toContain('return (');
  });
});
