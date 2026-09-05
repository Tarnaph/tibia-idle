import { describe, it, expect, vi } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { createAuthToken } from '../packages/auth/src/jwt';

describe('Phase 64: Engine Unification, Relational Persistence & Offline Progress', () => {
  it('rejects character loading onJoin if character accountId does not match token accountId', async () => {
    const { persistenceManager } = await import('../packages/server/src/persistence/PrismaPersistenceManager');
    const room = new ThaisCityRoom();
    room.onCreate({});

    const userToken = createAuthToken({
      accountId: 'acc-user-111',
      email: 'user111@tibia.test',
      role: 'player',
      isPremium: false,
    });

    // Mock loadCharacter to return character belonging to acc-other-999
    const loadSpy = vi.spyOn(persistenceManager, 'loadCharacter').mockResolvedValueOnce({
      id: 'char-other-account',
      accountId: 'acc-other-999',
      name: 'Other Hero',
      vocationId: 4,
      level: 10,
      health: 200,
      maxHealth: 200,
      mana: 50,
      maxMana: 50,
      posX: 32369,
      posY: 32241,
      posZ: 7,
    } as any);

    const mockClient = { sessionId: 'sess-owner-test', send: () => {} } as any;

    // Attempting to join with character belonging to different account 'acc-other-999'
    const joinPromise = room.onJoin(mockClient, {
      token: userToken,
      characterId: 'char-other-account',
    });

    // Expect character loading to throw ownership error if accounts do not match
    await expect(joinPromise).rejects.toThrow('UNAUTHORIZED_CHARACTER_OWNERSHIP');
    loadSpy.mockRestore();
  });

  it('calculates offline progress correctly based on elapsed offline seconds', async () => {
    const { CharacterService } = await import('../packages/auth/src');
    const mockPrisma: any = {
      character: {
        findUnique: async () => ({
          id: 'char-offline-test',
          updatedAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago (3600 seconds)
          skills: [
            { id: 'sk-1', skillId: 2, skillName: 'Sword Fighting', value: 15, tries: BigInt(50) },
          ],
        }),
        update: async () => {},
      },
      characterSkill: {
        update: async () => {},
      },
    };

    const service = new CharacterService(mockPrisma);
    const result = await service.calculateOfflineProgress('char-offline-test');

    expect(result).not.toBeNull();
    expect(result!.offlineSeconds).toBeGreaterThanOrEqual(3500);
    // 3600 seconds / 2 = 1800 tries gained
    expect(result!.triesGained).toBe(1800);
  });
});
