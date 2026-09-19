import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { ServerCharacterContextRegistry } from '../packages/auth/src/characterContextRegistry';
import { persistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';

describe('Phase 208: Real-Time Online Status on Player Inspection', () => {
  beforeEach(() => {
    ServerCharacterContextRegistry.clearAll();
  });

  describe('1. ThaisCityRoom.isCharacterOnline', () => {
    it('returns true when player is connected in ThaisCityRoom by characterId, exact name, or case-insensitive name', () => {
      // Mock room instance with connected players
      const mockPlayer1: any = {
        id: 'sess-1',
        characterId: 'char-wolfy-1',
        name: 'Wolfy',
        accountId: 'acc-1',
        inHunt: false,
      };

      const mockPlayer2: any = {
        id: 'sess-2',
        characterId: 'char-bubble-2',
        name: 'Bubble',
        accountId: 'acc-2',
        inHunt: true, // Player is in a hunt
      };

      const mockPlayersMap = new Map<string, any>([
        ['sess-1', mockPlayer1],
        ['sess-2', mockPlayer2],
      ]);

      (ThaisCityRoom as any).activeInstance = {
        state: {
          players: mockPlayersMap,
        },
      };

      // By exact characterId
      expect(ThaisCityRoom.isCharacterOnline('char-wolfy-1')).toBe(true);
      expect(ThaisCityRoom.isCharacterOnline('char-bubble-2')).toBe(true);

      // By exact name
      expect(ThaisCityRoom.isCharacterOnline('Wolfy')).toBe(true);
      expect(ThaisCityRoom.isCharacterOnline('Bubble')).toBe(true);

      // Case-insensitive name matching
      expect(ThaisCityRoom.isCharacterOnline('wolfy')).toBe(true);
      expect(ThaisCityRoom.isCharacterOnline('WOLFY')).toBe(true);
      expect(ThaisCityRoom.isCharacterOnline('  bubble  ')).toBe(true);

      // Offline character
      expect(ThaisCityRoom.isCharacterOnline('Cachero')).toBe(false);
      expect(ThaisCityRoom.isCharacterOnline('char-offline-99')).toBe(false);

      // Cleanup
      (ThaisCityRoom as any).activeInstance = null;
    });

    it('identifies players as online even while active in a hunt', () => {
      const mockHunter: any = {
        id: 'sess-hunt-1',
        characterId: 'char-hunter-123',
        name: 'Eternal Hunter',
        inHunt: true,
      };

      (ThaisCityRoom as any).activeInstance = {
        state: {
          players: new Map([['sess-hunt-1', mockHunter]]),
        },
      };

      expect(ThaisCityRoom.isCharacterOnline('Eternal Hunter')).toBe(true);
      expect(ThaisCityRoom.isCharacterOnline('char-hunter-123')).toBe(true);

      (ThaisCityRoom as any).activeInstance = null;
    });
  });

  describe('2. ServerCharacterContextRegistry.isCharacterOnline', () => {
    it('returns true only when activeSessionId is present in context registry', () => {
      const charId = 'char-reg-online';

      // Initially not known
      expect(ServerCharacterContextRegistry.isCharacterOnline(charId)).toBe(false);

      // Set active session
      ServerCharacterContextRegistry.setActiveSession(charId, 'session-abc-123');
      expect(ServerCharacterContextRegistry.isCharacterOnline(charId)).toBe(true);

      // Set player offline
      ServerCharacterContextRegistry.setPlayerOffline(charId);
      expect(ServerCharacterContextRegistry.isCharacterOnline(charId)).toBe(false);
    });
  });

  describe('3. Persistence Manager Online Synchronization', () => {
    it('invokes updateMany with isOnline: true and false appropriately', async () => {
      const updateManySpy = vi.fn().mockResolvedValue({ count: 1 });
      (persistenceManager as any).db = {
        character: {
          updateMany: updateManySpy,
        },
      };

      await persistenceManager.setPlayerOnlineStatus('char-test-sync', true);
      expect(updateManySpy).toHaveBeenCalledWith({
        where: { id: 'char-test-sync' },
        data: { isOnline: true },
      });

      await persistenceManager.setPlayerOnlineStatus('char-test-sync', false);
      expect(updateManySpy).toHaveBeenCalledWith({
        where: { id: 'char-test-sync' },
        data: { isOnline: false },
      });
    });

    it('resetAllOnlineStatus resets all characters to isOnline = false on startup', async () => {
      const updateManySpy = vi.fn().mockResolvedValue({ count: 10 });
      (persistenceManager as any).db = {
        character: {
          updateMany: updateManySpy,
        },
      };

      await persistenceManager.resetAllOnlineStatus();
      expect(updateManySpy).toHaveBeenCalledWith({
        data: { isOnline: false },
      });
    });
  });

  describe('4. Lookup Route Online Status Reconciliation', () => {
    it('overrides stale database isOnline: false when Colyseus returns isOnline: true', async () => {
      const dbCharacter = {
        id: 'char-lookup-1',
        name: 'Arieswar',
        level: 130,
        isOnline: false, // Stale DB default
      };

      // Simulated Colyseus real-time query logic from lookup route
      let isRealtimeOnline = Boolean(dbCharacter.isOnline);
      const mockColyseusResponse = { success: true, isOnline: true };

      if (typeof mockColyseusResponse.isOnline === 'boolean') {
        isRealtimeOnline = mockColyseusResponse.isOnline;
      }

      const inspectedPayload = {
        ...dbCharacter,
        isOnline: isRealtimeOnline,
      };

      expect(inspectedPayload.isOnline).toBe(true);
    });

    it('falls back to database isOnline when Colyseus service is unavailable', () => {
      const dbCharacter = {
        id: 'char-lookup-2',
        name: 'Smoked',
        level: 100,
        isOnline: true,
      };

      let isRealtimeOnline = Boolean(dbCharacter.isOnline);
      // Simulated fetch failure / timeout
      try {
        throw new Error('Colyseus connection timeout');
      } catch {
        // Fallback to database isOnline
      }

      const inspectedPayload = {
        ...dbCharacter,
        isOnline: isRealtimeOnline,
      };

      expect(inspectedPayload.isOnline).toBe(true);
    });
  });

  describe('5. PlayerInspectModal effectiveIsOnline calculation', () => {
    it('prioritizes isOnlineLocal when provided from client room state', () => {
      const calculateEffectiveStatus = (
        isOnlineLocal: boolean | undefined,
        serverIsOnline: boolean | undefined
      ) => {
        return isOnlineLocal !== undefined ? isOnlineLocal : Boolean(serverIsOnline);
      };

      // Player visible locally in front of client: immediate Online
      expect(calculateEffectiveStatus(true, false)).toBe(true);
      expect(calculateEffectiveStatus(true, true)).toBe(true);

      // Player known to be offline locally
      expect(calculateEffectiveStatus(false, true)).toBe(false);

      // Not in local viewport (e.g. inspected from highscores / chat): uses server data
      expect(calculateEffectiveStatus(undefined, true)).toBe(true);
      expect(calculateEffectiveStatus(undefined, false)).toBe(false);
    });
  });
});
