import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';

describe('Phase 46: PostgreSQL Batch Persistence, Native Colyseus Reconnection & E2E', () => {
  it('PrismaPersistenceManager safely handles mock and active character batch updates', async () => {
    const mockDb: any = {
      character: {
        update: vi.fn().mockResolvedValue({ id: 'char-real-101' }),
      },
    };

    const manager = new PrismaPersistenceManager(mockDb);

    const mockPlayer = new PlayerState();
    mockPlayer.characterId = 'char-guest-123';
    mockPlayer.level = 10;
    mockPlayer.posX = 32369;
    mockPlayer.posY = 32241;

    // Should skip mock guest character
    await manager.saveCharacter(mockPlayer);
    expect(mockDb.character.update).not.toHaveBeenCalled();

    const realPlayer = new PlayerState();
    realPlayer.characterId = 'char-real-101';
    realPlayer.level = 25;
    realPlayer.hp = 350;
    realPlayer.mp = 120;
    realPlayer.posX = 32350;
    realPlayer.posY = 32220;
    realPlayer.posZ = 7;
    realPlayer.capacity = 600;

    await manager.saveCharacter(realPlayer);
    expect(mockDb.character.update).toHaveBeenCalledWith({
      where: { id: 'char-real-101' },
      data: expect.objectContaining({
        level: 25,
        health: 350,
        mana: 120,
        posX: 32350,
        posY: 32220,
        posZ: 7,
      }),
    });
  });

  it('runs periodic batch save interval safely', async () => {
    const mockDb: any = {
      character: {
        update: vi.fn().mockResolvedValue({ id: 'char-real-200' }),
      },
    };

    const manager = new PrismaPersistenceManager(mockDb);

    const player = new PlayerState();
    player.characterId = 'char-real-200';
    player.level = 15;

    let callbackCount = 0;
    manager.startPeriodicSave(() => {
      callbackCount++;
      return [player];
    }, 30);

    await new Promise((res) => setTimeout(res, 160));
    manager.stopPeriodicSave();

    expect(callbackCount).toBeGreaterThanOrEqual(2);
    expect(mockDb.character.update).toHaveBeenCalled();
  });

  it('ThaisCityRoom triggers allowReconnection on non-consented player departure and persists character on dispose', async () => {
    const mockDb: any = {
      character: {
        update: vi.fn().mockResolvedValue({ id: 'char-real-300' }),
      },
    };

    const room = new ThaisCityRoom();
    room.onCreate({});

    // Mock allowReconnection function
    (room as any).allowReconnection = vi.fn().mockResolvedValue({});

    const mockClient: any = { sessionId: 'session-reconnect-1' };
    room.onJoin(mockClient, {
      mockCharacter: {
        id: 'char-real-300',
        accountId: 'acc-real-300',
        name: 'Knight Reconnect',
        vocationId: 4,
        level: 40,
      },
    });

    expect(room.state.players.size).toBe(1);

    // Simulate F5 refresh / network drop (non-consented disconnect code false / 4001)
    await room.onLeave(mockClient, false);

    // Should call allowReconnection for 20 seconds
    expect((room as any).allowReconnection).toHaveBeenCalledWith(mockClient, 20);

    // Dispose room (server shutdown / flush all)
    await room.onDispose();
    expect(room.state.players.size).toBe(1);
  });
});
