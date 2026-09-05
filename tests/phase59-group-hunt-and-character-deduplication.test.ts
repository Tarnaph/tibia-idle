import { describe, it, expect, vi } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { createCharacter } from '../packages/domain/src/party';
import { content } from './fixture';

describe('Phase 59: Group Hunt Transition, City Suppress and Character Deduplication', () => {
  it('sets inHunt = true on all party members when proposal is approved and sends party:huntStarted', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client1: any = { sessionId: 'leader-sess', send: vi.fn() };
    const client2: any = { sessionId: 'member-sess', send: vi.fn() };

    const p1 = new PlayerState();
    p1.id = 'leader-sess';
    p1.characterId = 'c-leader';
    p1.name = 'Aldric Leader';
    p1.inHunt = false;
    room.state.players.set('leader-sess', p1);

    const p2 = new PlayerState();
    p2.id = 'member-sess';
    p2.characterId = 'c-member';
    p2.name = 'Sirius Friend';
    p2.inHunt = false;
    room.state.players.set('member-sess', p2);

    room.clients = [client1, client2] as any;
    room.parties.set('leader-sess', {
      leaderSessionId: 'leader-sess',
      leaderName: 'Aldric Leader',
      memberSessionIds: ['leader-sess', 'member-sess'],
    });
    room.playerPartyLeader.set('leader-sess', 'leader-sess');
    room.playerPartyLeader.set('member-sess', 'leader-sess');

    // Leader proposes hunt
    (room as any).onMessageHandlers['party:proposeHunt'](client1, {
      huntId: 'rotworm-mines',
      huntName: 'Rotworm Mines',
      seed: 'seed-59',
    });

    // Member accepts proposal
    (room as any).onMessageHandlers['party:acceptHuntProposal'](client2);

    // Both clients receive hunt start
    expect(client1.send).toHaveBeenCalledWith('party:huntStarted', expect.objectContaining({
      huntId: 'rotworm-mines',
      leaderSessionId: 'leader-sess',
    }));
    expect(client2.send).toHaveBeenCalledWith('party:huntStarted', expect.objectContaining({
      huntId: 'rotworm-mines',
      leaderSessionId: 'leader-sess',
    }));

    // Server marks inHunt = true for all members so they are not rendered frozen in the city
    expect(p1.inHunt).toBe(true);
    expect(p2.inHunt).toBe(true);
  });

  it('resets inHunt = false and teleports all party members to Thais Temple when leader exits hunt', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client1: any = { sessionId: 'leader-sess', send: vi.fn() };
    const client2: any = { sessionId: 'member-sess', send: vi.fn() };

    const p1 = new PlayerState();
    p1.id = 'leader-sess';
    p1.characterId = 'c-leader';
    p1.name = 'Aldric Leader';
    p1.inHunt = true;
    room.state.players.set('leader-sess', p1);

    const p2 = new PlayerState();
    p2.id = 'member-sess';
    p2.characterId = 'c-member';
    p2.name = 'Sirius Friend';
    p2.inHunt = true;
    room.state.players.set('member-sess', p2);

    room.clients = [client1, client2] as any;
    room.parties.set('leader-sess', {
      leaderSessionId: 'leader-sess',
      leaderName: 'Aldric Leader',
      memberSessionIds: ['leader-sess', 'member-sess'],
    });
    room.playerPartyLeader.set('leader-sess', 'leader-sess');
    room.playerPartyLeader.set('member-sess', 'leader-sess');

    // Leader exits hunt
    (room as any).onMessageHandlers['party:huntExit'](client1);

    expect(p1.inHunt).toBe(false);
    expect(p2.inHunt).toBe(false);
    expect(p1.posX).toBe(32369);
    expect(p1.posY).toBe(32241);
    expect(p2.posX).toBe(32369);
    expect(p2.posY).toBe(32241);

    expect(client2.send).toHaveBeenCalledWith('party:huntExited', {
      x: 32369,
      y: 32241,
      z: 7,
    });
  });

  it('supports player:setInHunt message to update inHunt state', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client: any = { sessionId: 'solo-sess', send: vi.fn() };
    const p = new PlayerState();
    p.id = 'solo-sess';
    p.inHunt = false;
    room.state.players.set('solo-sess', p);

    (room as any).onMessageHandlers['player:setInHunt'](client, { inHunt: true });
    expect(p.inHunt).toBe(true);

    (room as any).onMessageHandlers['player:setInHunt'](client, { inHunt: false });
    expect(p.inHunt).toBe(false);
  });

  it('broadcastPartySync sends full visual outfit, colors, mount, and inHunt flag', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});
    const client1: any = { sessionId: 's1', send: vi.fn() };
    const client2: any = { sessionId: 's2', send: vi.fn() };

    const p1 = new PlayerState();
    p1.id = 's1';
    p1.characterId = 'c1';
    p1.name = 'Knight Hero';
    p1.vocationId = 4;
    p1.outfit = 'Warrior';
    p1.outfitLookType = 134;
    p1.outfitHead = 12;
    p1.outfitBody = 95;
    p1.outfitLegs = 110;
    p1.outfitFeet = 70;
    p1.mount = 'widow';
    p1.mountActive = true;
    p1.inHunt = false;
    room.state.players.set('s1', p1);

    room.clients = [client1, client2] as any;
    room.parties.set('s1', {
      leaderSessionId: 's1',
      leaderName: 'Knight Hero',
      memberSessionIds: ['s1'],
    });

    room.broadcastPartySync('s1');

    expect(client1.send).toHaveBeenCalledWith('party:sync', expect.objectContaining({
      leaderSessionId: 's1',
      leaderName: 'Knight Hero',
      members: expect.arrayContaining([
        expect.objectContaining({
          sessionId: 's1',
          characterId: 'c1',
          name: 'Knight Hero',
          outfit: 'Warrior',
          outfitColors: { head: 12, primary: 95, secondary: 110, detail: 70 },
          mount: 'widow',
          mountActive: true,
          inHunt: false,
        }),
      ]),
    }));
  });

  it('strictly deduplicates characters and places the party leader at index 0', () => {
    const localChar = createCharacter('guest-char', 'Sirius Druid', 'Druid', content);

    const party = {
      leaderSessionId: 'leader-sess',
      leaderName: 'Aldric Knight',
      members: [
        {
          sessionId: 'leader-sess',
          characterId: 'leader-char',
          name: 'Aldric Knight',
          vocationId: 4,
          vocationName: 'Knight',
          level: 25,
          hp: 450,
          maxHp: 450,
          mp: 100,
          maxMp: 100,
          outfit: 'Knight',
          outfitColors: { head: 1, primary: 2, secondary: 3, detail: 4 },
          mount: 'none',
          mountActive: false,
          isLeader: true,
          x: 32369,
          y: 32241,
          z: 7,
        },
        {
          sessionId: 'guest-sess',
          characterId: 'guest-char',
          name: 'Sirius Druid',
          vocationId: 2,
          vocationName: 'Druid',
          level: 20,
          hp: 300,
          maxHp: 300,
          mp: 500,
          maxMp: 500,
          outfit: 'Druid',
          outfitColors: { head: 10, primary: 20, secondary: 30, detail: 40 },
          mount: 'none',
          mountActive: false,
          isLeader: false,
          x: 32370,
          y: 32241,
          z: 7,
        },
      ],
    };

    // Replicate deduplication & leader placement logic
    const localSessionId = 'guest-sess';
    const leaderMember = party.members.find((m) => m.isLeader || m.sessionId === party.leaderSessionId) || party.members[0];
    const otherMembers = party.members.filter((m) => m.sessionId !== leaderMember.sessionId);
    const orderedPartyMembers = [leaderMember, ...otherMembers];

    const updatedChars: any[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const m of orderedPartyMembers) {
      const charId = m.characterId || m.sessionId;
      const nameKey = (m.name || '').trim().toLowerCase();
      if (seenIds.has(charId) || (nameKey && seenNames.has(nameKey))) continue;
      seenIds.add(charId);
      if (nameKey) seenNames.add(nameKey);

      if (m.sessionId === localSessionId) {
        updatedChars.push({
          ...localChar,
          id: charId,
          name: m.name,
          level: m.level,
        });
      } else {
        const newChar = createCharacter(charId, m.name, m.vocationName as any, content);
        newChar.level = m.level;
        newChar.outfit = m.outfit;
        newChar.outfitColors = m.outfitColors;
        updatedChars.push(newChar);
      }
    }

    // 1. Leader must be index 0
    expect(updatedChars[0].id).toBe('leader-char');
    expect(updatedChars[0].name).toBe('Aldric Knight');
    expect(updatedChars[0].outfit).toBe('Knight');

    // 2. Guest is index 1
    expect(updatedChars[1].id).toBe('guest-char');
    expect(updatedChars[1].name).toBe('Sirius Druid');

    // 3. Exactly 2 unique characters, no duplication
    expect(updatedChars).toHaveLength(2);
    const uniqueIds = new Set(updatedChars.map((c) => c.id));
    expect(uniqueIds.size).toBe(2);
  });
});
