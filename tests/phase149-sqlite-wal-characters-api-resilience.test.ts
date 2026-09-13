import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/characters/route';
import { createAuthToken } from '@/packages/auth/src/jwt';

describe('Phase 149: SQLite WAL & Characters API Resilience', () => {
  it('returns 401 when Authorization header is completely absent', async () => {
    const request = new Request('http://localhost:3000/api/characters', {
      method: 'GET',
    });

    const res = await GET(request);
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Autenticação necessária');
  });

  it('returns 401 when Authorization token is invalid or malformed', async () => {
    const request = new Request('http://localhost:3000/api/characters', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid.token.structure',
      },
    });

    const res = await GET(request);
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid or expired authentication token');
  });

  it('generates a valid token and successfully queries characters API', async () => {
    const token = createAuthToken({
      accountId: 'test-account-resilience-149',
      email: 'resilience@test.com',
      role: 'player',
      isPremium: true,
    });

    const request = new Request('http://localhost:3000/api/characters', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await GET(request);
    // Even if test account has 0 characters in the db, it returns 200 with empty array (not 401!)
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
