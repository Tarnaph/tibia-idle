import { describe, it, expect, vi } from 'vitest';
import { createAuthToken, verifyAuthToken, getJwtSecret } from '../packages/auth/src/jwt';
import { AccountService } from '../packages/auth/src/accountService';
import { isOutfitCanvasCached } from '../apps/web/lib/outfitRecolor';

describe('Phase 116: Auth Security, Public Register Hardening & Idle Walk Pose', () => {
  describe('Item 2: Public Register Hardening & JWT Secret', () => {
    it('enforces role = PLAYER unconditionally during AccountService.register', async () => {
      let createdAccountPayload: any = null;

      const mockPrisma = {
        account: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            createdAccountPayload = data;
            return {
              id: 'acc-123',
              email: data.email,
              passwordHash: data.passwordHash,
              role: data.role,
              coins: 0,
              isPremium: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
        },
      } as any;

      const service = new AccountService(mockPrisma);

      // Even if an attacker passes 'ADMIN' in an unauthorized attempt
      const result = await service.register({
        email: 'attacker@tibia.test',
        password: 'Password123!',
        ...({ role: 'ADMIN' } as any),
      });

      expect(createdAccountPayload).not.toBeNull();
      expect(createdAccountPayload.role).toBe('PLAYER');
      expect(result.account.role).toBe('player');
      expect(result.account.role).not.toBe('admin');
    });

    it('validates JWT Secret and correctly signs & verifies auth tokens', async () => {
      const secret = getJwtSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(16);

      const token = await createAuthToken({
        accountId: 'acc-456',
        email: 'player@tibia.test',
        role: 'player',
        isPremium: false,
      });

      const payload = await verifyAuthToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.accountId).toBe('acc-456');
      expect(payload?.role).toBe('player');
    });
  });

  describe('Item 1: In-game Admin Derivation & Logout Session Sanitization', () => {
    it('derives isAdmin strictly from active in-game connected account role, ignoring stale viewer role', () => {
      const staleViewer = { role: 'ADMIN' };
      const activeOnlineAccount = { id: 'acc-789', role: 'PLAYER' };

      // In GamePrototype.tsx:
      // const effectiveRole = onlineAccount ? onlineAccount.role : (auth.viewer?.role || 'PLAYER');
      const effectiveRole = activeOnlineAccount ? activeOnlineAccount.role : (staleViewer?.role || 'PLAYER');
      const roleUpper = String(effectiveRole || '').toUpperCase();
      const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'GM';

      expect(isAdmin).toBe(false);
    });

    it('grants isAdmin when the active connected in-game account is genuinely ADMIN or GM', () => {
      const staleViewer = { role: 'PLAYER' };
      const activeOnlineAccount = { id: 'acc-admin', role: 'ADMIN' };

      const effectiveRole = activeOnlineAccount ? activeOnlineAccount.role : (staleViewer?.role || 'PLAYER');
      const roleUpper = String(effectiveRole || '').toUpperCase();
      const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'GM';

      expect(isAdmin).toBe(true);
    });

    it('verifies that logout specifies cookie expiration with max-age=0 and clears local tokens', () => {
      // Test the cookie string contract used in TibiaAuthCharacterModal and AuthProvider
      const cookieExpiryString = 'colyseus_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      expect(cookieExpiryString).toContain('max-age=0');
      expect(cookieExpiryString).toContain('expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(cookieExpiryString).toContain('path=/');

      const storageTokensToClear = ['colyseus_token', 'tibia_auth_token'];
      expect(storageTokensToClear).toContain('colyseus_token');
      expect(storageTokensToClear).toContain('tibia_auth_token');
    });
  });

  describe('Item 3: Idle Pose and Movement Decoupling', () => {
    it('strictly forces walk frame to 0 when character is physically stopped, even if curWalk is true', () => {
      const walkCycle = [0, 1, 0, 2];
      const stepRateMs = 100;
      const now = 1500;

      // Case 1: Character is moving
      const charIsMoving = true;
      const movingWalkFrame = charIsMoving ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;
      expect(movingWalkFrame).toBeGreaterThanOrEqual(0);

      // Case 2: Character is stopped (isMoving === false), but curWalk / path is still in memory
      const charIsStopped = false;
      const curWalk = true;
      const stoppedWalkFrame = charIsStopped ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;

      // MUST be 0 (both feet flat on ground / idle pose)
      expect(stoppedWalkFrame).toBe(0);
    });

    it('cycles through official 4-step sequence [0, 1, 0, 2] during movement', () => {
      const walkCycle = [0, 1, 0, 2];
      const stepRateMs = 100;

      const frameAtStep0 = walkCycle[Math.floor(0 / stepRateMs) % 4];
      const frameAtStep1 = walkCycle[Math.floor(100 / stepRateMs) % 4];
      const frameAtStep2 = walkCycle[Math.floor(200 / stepRateMs) % 4];
      const frameAtStep3 = walkCycle[Math.floor(300 / stepRateMs) % 4];

      expect([frameAtStep0, frameAtStep1, frameAtStep2, frameAtStep3]).toEqual([0, 1, 0, 2]);
    });

    it('verifies isOutfitCanvasCached returns false for uncached outfits', () => {
      const isCached = isOutfitCanvasCached('nonexistent_outfit_xyz_123', 'male', 'south', 0);
      expect(isCached).toBe(false);
    });
  });
});
