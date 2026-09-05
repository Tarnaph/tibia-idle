import { describe, it, expect, vi } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';

describe('Phase 61: Temporary Disable of Multiplayer Party Invites', () => {
  it('should respond with a friendly disabled message when party:invite is sent', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client = {
      sessionId: 'client-1',
      send: vi.fn(),
    };

    (room as any).onMessageHandlers['party:invite'](client, { targetName: 'OtherPlayer' });

    expect(client.send).toHaveBeenCalledWith('party:error', {
      message: 'O sistema de convites de party entre jogadores reais está temporariamente desativado.',
    });
  });
});
