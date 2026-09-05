import { describe, it, expect } from 'vitest';
import { decideAccess, canManageUpdates } from '../packages/auth/src/authorization';

describe('Phase 67: Admin Panel Access Guard & Role Verification', () => {
  it('allows access to /admin ONLY for accounts with ADMIN or GM role', () => {
    expect(decideAccess('admin', { role: 'admin' })).toBe('allow');
    expect(decideAccess('admin', { role: 'ADMIN' as any })).toBe('allow');
    expect(decideAccess('admin', { role: 'gm' as any })).toBe('allow');
    expect(decideAccess('admin', { role: 'GM' as any })).toBe('allow');
  });

  it('denies /admin for regular player accounts or unauthenticated viewers', () => {
    expect(decideAccess('admin', null)).toBe('login-required');
    expect(decideAccess('admin', { role: 'player' })).toBe('forbidden');
    expect(decideAccess('admin', { role: 'PLAYER' as any })).toBe('forbidden');
    expect(decideAccess('admin', { role: 'guest' as any })).toBe('forbidden');
  });

  it('validates canManageUpdates helper for ADMIN and GM roles', () => {
    expect(canManageUpdates('admin')).toBe(true);
    expect(canManageUpdates('ADMIN')).toBe(true);
    expect(canManageUpdates('GM')).toBe(true);
    expect(canManageUpdates('PLAYER')).toBe(false);
    expect(canManageUpdates(null)).toBe(false);
  });
});
