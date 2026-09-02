import type { AccountRole, AuthViewer, GameUpdateRow } from './types';

export type ProtectedArea = 'game' | 'admin';
export type AccessDecision = 'allow' | 'login-required' | 'forbidden';

export function decideAccess(area: ProtectedArea, viewer: Pick<AuthViewer, 'role'> | null): AccessDecision {
  if (!viewer) return 'login-required';
  if (area === 'admin' && viewer.role !== 'admin') return 'forbidden';
  return 'allow';
}

export function canManageUpdates(role: AccountRole | null): boolean {
  return role === 'admin';
}

export function visiblePublicUpdates(updates: readonly GameUpdateRow[]): GameUpdateRow[] {
  return updates
    .filter((update) => update.published)
    .sort((left, right) => Date.parse(right.published_at ?? '') - Date.parse(left.published_at ?? ''));
}
