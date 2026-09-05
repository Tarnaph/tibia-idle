import { describe, it, expect, vi } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';

describe('Phase 65: Thais City Arena Remote Players Visibility & Persistence', () => {
  it('does NOT evict online players sharing similar or default character names', async () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'sess-1', leave: vi.fn(), send: vi.fn() };
    const client2: any = { sessionId: 'sess-2', leave: vi.fn(), send: vi.fn() };

    // Player 1 joins with character name "Hero"
    await room.onJoin(client1, {
      characterId: 'char-111',
      mockCharacter: { id: 'char-111', accountId: 'acc-1', name: 'Hero', vocationId: 1, level: 10 },
    });

    expect(room.state.players.has('sess-1')).toBe(true);
    expect(client1.leave).not.toHaveBeenCalled();

    // Player 2 joins with character name "Hero" (mock/guest or distinct account)
    await room.onJoin(client2, {
      characterId: 'char-222',
      mockCharacter: { id: 'char-222', accountId: 'acc-2', name: 'Hero', vocationId: 2, level: 10 },
    });

    // Both players MUST remain in the room without sess-1 being evicted
    expect(room.state.players.has('sess-1')).toBe(true);
    expect(room.state.players.has('sess-2')).toBe(true);
    expect(client1.leave).not.toHaveBeenCalled();
    expect(client2.leave).not.toHaveBeenCalled();
  });

  it('evicts stale duplicate sessions ONLY if persistent DB characterId matches', async () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'sess-old', leave: vi.fn(), send: vi.fn() };
    const client2: any = { sessionId: 'sess-new', leave: vi.fn(), send: vi.fn() };

    // Player 1 joins with DB characterId "db-char-999"
    await room.onJoin(client1, {
      characterId: 'db-char-999',
      mockCharacter: { id: 'db-char-999', accountId: 'acc-1', name: 'KnightKing', vocationId: 4, level: 50 },
    });

    expect(room.state.players.has('sess-old')).toBe(true);

    // Same character connects from new session
    await room.onJoin(client2, {
      characterId: 'db-char-999',
      mockCharacter: { id: 'db-char-999', accountId: 'acc-1', name: 'KnightKing', vocationId: 4, level: 50 },
    });

    // Old session evicted, new session retained
    expect(client1.leave).toHaveBeenCalledWith(4000);
    expect(room.state.players.has('sess-old')).toBe(false);
    expect(room.state.players.has('sess-2')).toBe(false);
    expect(room.state.players.has('sess-new')).toBe(true);
  });

  it('initializes inHunt = false for newly joining characters in ThaisCityRoom', async () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client: any = { sessionId: 'sess-city', leave: vi.fn(), send: vi.fn() };

    await room.onJoin(client, {
      characterId: 'char-city-1',
      mockCharacter: { id: 'char-city-1', accountId: 'acc-c', name: 'CityWalker', vocationId: 3, level: 20 },
    });

    const player = room.state.players.get('sess-city');
    expect(player).toBeDefined();
    expect(player?.inHunt).toBe(false);
  });
});
