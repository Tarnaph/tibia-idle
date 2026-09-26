import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { CityMovementHandler } from '../packages/server/src/rooms/handlers/CityMovementHandler';
import { CityCombatHandler } from '../packages/server/src/rooms/handlers/CityCombatHandler';
import { CityChatHandler } from '../packages/server/src/rooms/handlers/CityChatHandler';
import { CityPvPHandler } from '../packages/server/src/rooms/handlers/CityPvPHandler';
import { CityPartyHandler } from '../packages/server/src/rooms/handlers/CityPartyHandler';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';

describe('Phase 246: Onda 2 - Modularização Arquitetural do Servidor Colyseus (Domain Handlers)', () => {
  let room: ThaisCityRoom;

  beforeEach(() => {
    room = new ThaisCityRoom();
    room.onCreate({});
  });

  afterEach(async () => {
    await room.onDispose();
  });

  it('1. Deve instanciar e anexar os 5 Domain Handlers no onCreate', () => {
    expect(room.movementHandler).toBeInstanceOf(CityMovementHandler);
    expect(room.combatHandler).toBeInstanceOf(CityCombatHandler);
    expect(room.chatHandler).toBeInstanceOf(CityChatHandler);
    expect(room.pvpHandler).toBeInstanceOf(CityPvPHandler);
    expect(room.partyHandler).toBeInstanceOf(CityPartyHandler);
  });

  it('2. CityMovementHandler: deve movimentar e atualizar coordenadas do jogador', () => {
    const mockClient: any = { sessionId: 'sess-move-1', send: () => {} };
    const player = new PlayerState();
    player.id = 'sess-move-1';
    player.name = 'Walker';
    player.posX = 32369;
    player.posY = 32241;
    player.posZ = 7;
    player.lastStepTime = 0;
    room.state.players.set(mockClient.sessionId, player);

    room.handlePlayerMove(mockClient, 'north');
    expect(player.posY).toBe(32240);
    expect(player.direction).toBe('north');
    expect(player.isWalking).toBe(true);

    room.handlePlayerMove(mockClient, 'east');
    // Cooldown check (minimum 75ms)
    player.lastStepTime = 0;
    room.handlePlayerMove(mockClient, 'east');
    expect(player.posX).toBe(32370);
    expect(player.direction).toBe('east');
  });

  it('3. CityChatHandler: deve rotear mensagens para o canal local e histórico', () => {
    const mockClient: any = { sessionId: 'sess-chat-1', send: () => {} };
    const player = new PlayerState();
    player.id = 'sess-chat-1';
    player.name = 'Speaker';
    player.posX = 32369;
    player.posY = 32241;
    player.posZ = 7;
    room.state.players.set(mockClient.sessionId, player);

    room.handleChatMessage(mockClient, 'Olá Thais!', 'local');

    expect(room.state.chatMessages.length).toBeGreaterThan(0);
    const lastMsg = room.state.chatMessages[room.state.chatMessages.length - 1];
    expect(lastMsg.text).toBe('Olá Thais!');
    expect(lastMsg.senderName).toBe('Speaker');
    expect(lastMsg.channel).toBe('local');
  });

  it('4. CityCombatHandler: deve processar conjuração de cura (Exura) e pushCombatEvent', () => {
    const mockClient: any = { sessionId: 'sess-combat-1', send: () => {} };
    const player = new PlayerState();
    player.id = 'sess-combat-1';
    player.name = 'Mage';
    player.posX = 32369;
    player.posY = 32241;
    player.posZ = 7;
    player.hp = 50;
    player.maxHp = 150;
    player.mp = 100;
    player.maxMp = 100;
    room.state.players.set(mockClient.sessionId, player);

    room.handleCastSpell(mockClient, 'exura');

    expect(player.mp).toBe(80); // 100 - 20 mana
    expect(player.hp).toBeGreaterThan(50); // Curou
    expect(room.state.combatEvents.length).toBeGreaterThan(0);
    const lastEvent = room.state.combatEvents[room.state.combatEvents.length - 1];
    expect(lastEvent.text).toBe('Exura');
  });

  it('5. CityPvPHandler: deve expor pvpQueue e activeDuels sem quebrar retrocompatibilidade', () => {
    expect(room.pvpQueue).toBeDefined();
    expect(room.activeDuels).toBeDefined();
    expect(room.pvpQueue.size).toBe(0);

    room.pvpHandler.pvpQueue.set('test-sess', {
      sessionId: 'test-sess',
      characterId: 'char-pvp',
      name: 'Gladiator',
      level: 100,
      vocation: 'Knight',
      elo: 1000,
      joinedAt: Date.now(),
      timeoutRef: null,
    });

    expect(room.pvpQueue.has('test-sess')).toBe(true);
    expect(room.pvpHandler.pvpQueue.size).toBe(1);
  });

  it('6. CityPartyHandler: deve gerenciar liderança e broadcast de party sem erros', () => {
    const player1 = new PlayerState();
    player1.id = 'sess-leader';
    player1.name = 'PartyLeader';
    player1.posX = 32369;
    player1.posY = 32241;
    player1.posZ = 7;
    room.state.players.set('sess-leader', player1);

    room.parties.set('sess-leader', {
      leaderSessionId: 'sess-leader',
      leaderName: 'PartyLeader',
      memberSessionIds: ['sess-leader'],
    });
    room.playerPartyLeader.set('sess-leader', 'sess-leader');

    room.broadcastPartySync('sess-leader');
    room.handlePlayerLeaveParty('sess-leader');

    expect(room.parties.has('sess-leader')).toBe(false);
  });
});
