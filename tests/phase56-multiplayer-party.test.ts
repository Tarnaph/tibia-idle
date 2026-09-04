import { describe, it, expect, vi } from 'vitest';
import { ThaisCityRoom, PlayerState } from '../packages/server/src';
import { GameClientNetworkManager } from '../apps/web/lib/GameClientNetworkManager';

describe('Phase 56: Multiplayer Party System (Invites, Follow Leader, Shared Hunt & Collective Target)', () => {
  it('should route party:invite from inviter to recipient and notify inviter that invite was sent', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'client-1', send: vi.fn() };
    const client2: any = { sessionId: 'client-2', send: vi.fn() };

    const player1 = new PlayerState();
    player1.name = 'Knight Leader';
    player1.level = 80;
    player1.vocationId = 4;

    const player2 = new PlayerState();
    player2.name = 'Druid Friend';
    player2.level = 75;
    player2.vocationId = 2;

    room.state.players.set('client-1', player1);
    room.state.players.set('client-2', player2);
    (room as any).clients = [client1, client2];

    // Player 1 invites Player 2 by name
    (room as any).onMessageHandlers['party:invite'](client1, { targetName: 'Druid Friend' });

    // Expect client2 to receive the invitation
    expect(client2.send).toHaveBeenCalledWith('party:invitationReceived', {
      inviterSessionId: 'client-1',
      inviterName: 'Knight Leader',
      inviterLevel: 80,
      inviterVocationId: 4,
    });

    // Expect client1 to receive confirmation
    expect(client1.send).toHaveBeenCalledWith('party:inviteSent', {
      targetName: 'Druid Friend',
    });
  });

  it('should accept party invite, establish leader & member, and broadcast party:sync to both clients', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'client-1', send: vi.fn() };
    const client2: any = { sessionId: 'client-2', send: vi.fn() };

    const player1 = new PlayerState();
    player1.name = 'Knight Leader';
    player1.characterId = 'char-1';
    player1.level = 80;
    player1.vocationId = 4;
    player1.hp = 1200;
    player1.maxHp = 1200;

    const player2 = new PlayerState();
    player2.name = 'Druid Friend';
    player2.characterId = 'char-2';
    player2.level = 75;
    player2.vocationId = 2;
    player2.hp = 600;
    player2.maxHp = 600;

    room.state.players.set('client-1', player1);
    room.state.players.set('client-2', player2);
    (room as any).clients = [client1, client2];

    // Player 2 accepts invite from Player 1
    (room as any).onMessageHandlers['party:acceptInvite'](client2, { inviterSessionId: 'client-1' });

    expect(room.parties.has('client-1')).toBe(true);
    const party = room.parties.get('client-1')!;
    expect(party.leaderSessionId).toBe('client-1');
    expect(party.memberSessionIds).toContain('client-1');
    expect(party.memberSessionIds).toContain('client-2');

    // Both clients receive party:sync
    expect(client1.send).toHaveBeenCalledWith('party:sync', expect.objectContaining({
      leaderSessionId: 'client-1',
      members: expect.arrayContaining([
        expect.objectContaining({ name: 'Knight Leader', isLeader: true }),
        expect.objectContaining({ name: 'Druid Friend', isLeader: false }),
      ]),
    }));
    expect(client2.send).toHaveBeenCalledWith('party:sync', expect.objectContaining({
      leaderSessionId: 'client-1',
      members: expect.arrayContaining([
        expect.objectContaining({ name: 'Knight Leader', isLeader: true }),
        expect.objectContaining({ name: 'Druid Friend', isLeader: false }),
      ]),
    }));
  });

  it('should broadcast party:huntStarted to all members when party leader pulls a hunt', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'client-1', send: vi.fn() };
    const client2: any = { sessionId: 'client-2', send: vi.fn() };

    const player1 = new PlayerState();
    player1.name = 'Knight Leader';
    const player2 = new PlayerState();
    player2.name = 'Druid Friend';

    room.state.players.set('client-1', player1);
    room.state.players.set('client-2', player2);
    (room as any).clients = [client1, client2];

    room.parties.set('client-1', {
      leaderSessionId: 'client-1',
      leaderName: 'Knight Leader',
      memberSessionIds: ['client-1', 'client-2'],
    });
    room.playerPartyLeader.set('client-1', 'client-1');
    room.playerPartyLeader.set('client-2', 'client-1');

    // Leader pulls hunt 'cyclopolis'
    (room as any).onMessageHandlers['party:huntSync'](client1, { huntId: 'cyclopolis' });

    expect(client1.send).toHaveBeenCalledWith('party:huntStarted', {
      huntId: 'cyclopolis',
      leaderName: 'Knight Leader',
      leaderSessionId: 'client-1',
    });
    expect(client2.send).toHaveBeenCalledWith('party:huntStarted', {
      huntId: 'cyclopolis',
      leaderName: 'Knight Leader',
      leaderSessionId: 'client-1',
    });
  });

  it('should synchronize party target (party:targetUpdated) so all members attack the monster selected by the leader', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'client-1', send: vi.fn() };
    const client2: any = { sessionId: 'client-2', send: vi.fn() };

    room.parties.set('client-1', {
      leaderSessionId: 'client-1',
      leaderName: 'Knight Leader',
      memberSessionIds: ['client-1', 'client-2'],
    });
    room.playerPartyLeader.set('client-1', 'client-1');
    room.playerPartyLeader.set('client-2', 'client-1');
    (room as any).clients = [client1, client2];

    // Leader targets a Dragon 'dragon-1'
    (room as any).onMessageHandlers['party:targetSync'](client1, { targetId: 'dragon-1' });

    // Client 2 receives the target sync
    expect(client2.send).toHaveBeenCalledWith('party:targetUpdated', {
      targetId: 'dragon-1',
    });
  });

  it('should broadcast party:leaderMoved when party leader steps in the city for follow mechanic', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'client-1', send: vi.fn() };
    const client2: any = { sessionId: 'client-2', send: vi.fn() };

    const player1 = new PlayerState();
    player1.name = 'Knight Leader';
    player1.posX = 32369;
    player1.posY = 32241;
    player1.posZ = 7;
    player1.lastStepTime = 0;

    room.state.players.set('client-1', player1);
    room.state.players.set('client-2', new PlayerState());
    (room as any).clients = [client1, client2];

    room.parties.set('client-1', {
      leaderSessionId: 'client-1',
      leaderName: 'Knight Leader',
      memberSessionIds: ['client-1', 'client-2'],
    });
    room.playerPartyLeader.set('client-1', 'client-1');
    room.playerPartyLeader.set('client-2', 'client-1');

    // Leader moves south
    (room as any).onMessageHandlers['move'](client1, { direction: 'south', x: 32369, y: 32242, z: 7 });

    expect(client2.send).toHaveBeenCalledWith('party:leaderMoved', {
      leaderSessionId: 'client-1',
      x: 32369,
      y: 32242,
      z: 7,
      direction: 'south',
    });
  });

  it('should handle party leave and disband cleanly when leader leaves or disconnects', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'client-1', send: vi.fn() };
    const client2: any = { sessionId: 'client-2', send: vi.fn() };

    room.parties.set('client-1', {
      leaderSessionId: 'client-1',
      leaderName: 'Knight Leader',
      memberSessionIds: ['client-1', 'client-2'],
    });
    room.playerPartyLeader.set('client-1', 'client-1');
    room.playerPartyLeader.set('client-2', 'client-1');
    (room as any).clients = [client1, client2];

    // Leader leaves party
    (room as any).onMessageHandlers['party:leave'](client1);

    expect(client1.send).toHaveBeenCalledWith('party:left', {});
    expect(client2.send).toHaveBeenCalledWith('party:disbanded', expect.objectContaining({
      reason: expect.any(String),
    }));
    expect(room.parties.has('client-1')).toBe(false);
    expect(room.playerPartyLeader.has('client-2')).toBe(false);
  });
});
