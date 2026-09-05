import type { AccountRole, AuthViewer, GameUpdateRow } from './types';
import { verifyAuthToken, TokenPayload } from './jwt';

export type ProtectedArea = 'game' | 'admin';
export type AccessDecision = 'allow' | 'login-required' | 'forbidden';

export function decideAccess(area: ProtectedArea, viewer: { role?: AccountRole | string | null } | null): AccessDecision {
  if (!viewer) return 'login-required';
  const roleUpper = String(viewer.role || '').toUpperCase();
  if (area === 'admin' && roleUpper !== 'ADMIN' && roleUpper !== 'GM') return 'forbidden';
  return 'allow';
}

export function canManageUpdates(role: AccountRole | string | null): boolean {
  const roleUpper = String(role || '').toUpperCase();
  return roleUpper === 'ADMIN' || roleUpper === 'GM';
}

export function visiblePublicUpdates(updates: readonly GameUpdateRow[]): GameUpdateRow[] {
  return updates
    .filter((update) => update.published)
    .sort((left, right) => Date.parse(right.published_at ?? '') - Date.parse(left.published_at ?? ''));
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      cookies[key] = parts.join('=').trim();
    }
  });
  return cookies;
}

export function requireAdminAuth(request: Request): TokenPayload {
  let token: string | null = null;
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  } else {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookiesMap = parseCookies(cookieHeader);
      token = cookiesMap.colyseus_token || null;
    }
  }

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }
  const decoded = verifyAuthToken(token);
  const roleUpper = String(decoded.role || '').toUpperCase();
  if (roleUpper !== 'ADMIN' && roleUpper !== 'GM') {
    throw new Error('FORBIDDEN');
  }
  return decoded;
}
