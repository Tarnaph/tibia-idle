import { describe, expect, it, beforeEach } from 'vitest';
import {
  ThaisCityRoom,
  isInViewport,
  isWithinDistance,
  filterEntitiesByViewport,
  LOCAL_CHAT_RADIUS,
  YELL_CHAT_RADIUS,
} from '../packages/server/src';

describe('Phase 44: Sincronização de Estado com Colyseus Schema, Interest Management e Chat', () => {
  describe('Spatial Grid & Viewport Utility Functions', () => {
    it('determines entity visibility inside 15x11 SQM viewport', () => {
      const observer = { x: 32369, y: 32241 };

      // Inside viewport
      expect(isInViewport(observer.x + 5, observer.y + 5, observer.x, observer.y)).toBe(true);
      expect(isInViewport(observer.x - 15, observer.y + 11, observer.x, observer.y)).toBe(true);

      // Outside viewport
      expect(isInViewport(observer.x + 16, observer.y, observer.x, observer.y)).toBe(false);
      expect(isInViewport(observer.x, observer.y + 12, observer.x, observer.y)).toBe(false);
      expect(isInViewport(observer.x + 100, observer.y + 100, observer.x, observer.y)).toBe(false);
    });

    it('filters entity collections based on viewport proximity', () => {
      const observer = { posX: 32369, posY: 32241 };
      const entities = [
        { id: '1', posX: 32369, posY: 32241 }, // At observer
        { id: '2', posX: 32375, posY: 32245 }, // Nearby (in view)
        { id: '3', posX: 32900, posY: 32900 }, // Far away (out of view)
      ];

      const visible = filterEntitiesByViewport(entities, observer.posX, observer.posY);
      expect(visible.length).toBe(2);
      expect(visible.map((e) => e.id)).toEqual(['1', '2']);
    });

    it('validates chat distance limits (8 SQMs for local say, 30 SQMs for yell)', () => {
      const sender = { x: 32369, y: 32241 };

      // Local Say (8 SQMs)
      expect(isWithinDistance(sender.x, sender.y, sender.x + 5, sender.y + 5, LOCAL_CHAT_RADIUS)).toBe(true);
      expect(isWithinDistance(sender.x, sender.y, sender.x + 10, sender.y, LOCAL_CHAT_RADIUS)).toBe(false);

      // Yell (30 SQMs)
      expect(isWithinDistance(sender.x, sender.y, sender.x + 25, sender.y + 20, YELL_CHAT_RADIUS)).toBe(true);
      expect(isWithinDistance(sender.x, sender.y, sender.x + 35, sender.y, YELL_CHAT_RADIUS)).toBe(false);
    });
  });

  describe('ThaisCityRoom Spatial Interest Management & Chat', () => {
    let room: ThaisCityRoom;

    beforeEach(() => {
      room = new ThaisCityRoom();
      room.onCreate({});
    });

    it('returns only entities inside observer viewport via getEntitiesInViewportForPlayer', () => {
      const client1: any = { sessionId: 'player-1', send: () => {} };
      const client2: any = { sessionId: 'player-2', send: () => {} };

      room.onJoin(client1, {
        mockCharacter: { id: 'c1', accountId: 'a1', name: 'Knight', vocationId: 4, level: 10 },
      });
      room.onJoin(client2, {
        mockCharacter: { id: 'c2', accountId: 'a2', name: 'Mage', vocationId: 1, level: 10 },
      });

      const p1 = room.state.players.get('player-1')!;
      const p2 = room.state.players.get('player-2')!;

      // Position p2 far away from p1
      p1.posX = 32369;
      p1.posY = 32241;
      p2.posX = 32900;
      p2.posY = 32900;

      const p1View = room.getEntitiesInViewportForPlayer('player-1');
      expect(p1View.players.map((p) => p.id)).toContain('player-1');
      expect(p1View.players.map((p) => p.id)).not.toContain('player-2');

      // Move p2 back into viewport
      p2.posX = 32372;
      p2.posY = 32244;

      const p1ViewUpdated = room.getEntitiesInViewportForPlayer('player-1');
      expect(p1ViewUpdated.players.map((p) => p.id)).toContain('player-2');
    });

    it('routes chat messages based on channel rules and distance', () => {
      const messagesP1: any[] = [];
      const messagesP2: any[] = [];
      const messagesP3: any[] = [];

      const client1: any = { sessionId: 'p1', send: (type: string, data: any) => messagesP1.push({ type, data }) };
      const client2: any = { sessionId: 'p2', send: (type: string, data: any) => messagesP2.push({ type, data }) };
      const client3: any = { sessionId: 'p3', send: (type: string, data: any) => messagesP3.push({ type, data }) };

      room.onJoin(client1, { mockCharacter: { id: 'c1', accountId: 'a1', name: 'Alice', vocationId: 4, level: 10 } });
      room.onJoin(client2, { mockCharacter: { id: 'c2', accountId: 'a2', name: 'Bob', vocationId: 3, level: 10 } });
      room.onJoin(client3, { mockCharacter: { id: 'c3', accountId: 'a3', name: 'Charlie', vocationId: 1, level: 10 } });

      const player1 = room.state.players.get('p1')!;
      const player2 = room.state.players.get('p2')!;
      const player3 = room.state.players.get('p3')!;

      player1.posX = 32369; player1.posY = 32241;
      player2.posX = 32373; player2.posY = 32241; // 4 SQMs away (receives say)
      player3.posX = 32400; player3.posY = 32241; // 31 SQMs away (ignores say and yell)

      // Test Local Say
      (room as any).handleChatMessage(client1, 'Hello world', 'say');

      const p1Say = messagesP1.find((m) => m.type === 'chat');
      const p2Say = messagesP2.find((m) => m.type === 'chat');
      const p3Say = messagesP3.find((m) => m.type === 'chat');

      expect(p1Say).toBeDefined();
      expect(p1Say.data.text).toBe('Hello world');
      expect(p2Say).toBeDefined();
      expect(p3Say).toBeUndefined(); // Out of distance

      // Test Yell (uppercase transformation)
      (room as any).handleChatMessage(client1, 'monster incoming!', 'yell');
      const p1Yell = messagesP1.filter((m) => m.type === 'chat')[1];
      expect(p1Yell.data.text).toBe('MONSTER INCOMING!');
      expect(p1Yell.data.channel).toBe('yell');
    });

    it('records and filters combat events inside room state', () => {
      const client1: any = { sessionId: 'p1', send: () => {} };
      room.onJoin(client1, { mockCharacter: { id: 'c1', accountId: 'a1', name: 'Knight', vocationId: 4, level: 10 } });

      const player = room.state.players.get('p1')!;
      player.hp = 10;
      player.mp = 100;

      (room as any).handleCastSpell(client1, 'exura');

      expect(room.state.combatEvents.length).toBeGreaterThan(0);
      const lastEvent = room.state.combatEvents[room.state.combatEvents.length - 1];
      expect(lastEvent.type).toBe('heal');
      expect(lastEvent.sourceId).toBe('p1');
      expect(lastEvent.color).toBe('#33ff33');
    });
  });
});
