import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameClientNetworkManager, type NetworkCombatEvent, type NetworkChatMessage } from '../apps/web/lib/GameClientNetworkManager';
import { getColyseusClient } from '../apps/web/lib/colyseusClient';

describe('Phase 45: Frontend Thin Client & Auth UI Integration', () => {
  let networkManager: GameClientNetworkManager;

  beforeEach(() => {
    networkManager = new GameClientNetworkManager();
  });

  afterEach(() => {
    networkManager.disconnect();
  });

  it('instantiates Colyseus client SDK correctly', () => {
    const client = getColyseusClient();
    expect(client).toBeDefined();
  });

  it('manages local player state map and listeners', () => {
    let stateChanged = false;
    networkManager.onStateChange(() => {
      stateChanged = true;
    });

    expect(networkManager.Players.size).toBe(0);
    expect(stateChanged).toBe(false);
  });

  it('registers combat event listeners correctly', () => {
    let receivedEvent: NetworkCombatEvent | null = null;
    const unsubscribe = networkManager.onCombatEvent((evt) => {
      receivedEvent = evt;
    });

    // Simulate event callback dispatch
    const mockEvent: NetworkCombatEvent = {
      type: 'damage',
      sourceId: 'player-1',
      targetId: 'monster-2',
      amount: 45,
      x: 32369,
      y: 32241,
      timestamp: Date.now(),
    };

    // Trigger internal set
    (networkManager as any).combatListeners.forEach((fn: any) => fn(mockEvent));

    expect(receivedEvent).not.toBeNull();
    const event: NetworkCombatEvent = receivedEvent!;
    expect(event.amount).toBe(45);
    expect(event.type).toBe('damage');

    unsubscribe();
    expect((networkManager as any).combatListeners.size).toBe(0);
  });

  it('registers chat message listeners and formats correctly', () => {
    let receivedChat: NetworkChatMessage | null = null;
    const unsubscribe = networkManager.onChatMessage((msg) => {
      receivedChat = msg;
    });

    const mockChat: NetworkChatMessage = {
      id: 'msg-101',
      senderId: 'char-7',
      senderName: 'Sir Lancelot',
      channel: 'local',
      text: 'Exura',
      timestamp: Date.now(),
    };

    (networkManager as any).chatListeners.forEach((fn: any) => fn(mockChat));

    expect(receivedChat).not.toBeNull();
    const chat: NetworkChatMessage = receivedChat!;
    expect(chat.senderName).toBe('Sir Lancelot');
    expect(chat.text).toBe('Exura');

    unsubscribe();
    expect((networkManager as any).chatListeners.size).toBe(0);
  });

  it('serializes move, spell, attack and chat intents safely when disconnected', () => {
    // Calling send methods when room is null should be safe and not throw errors
    expect(() => {
      networkManager.sendMove('north');
      networkManager.sendCastSpell('exori');
      networkManager.sendAttack('target-monster');
      networkManager.sendChat('Hello World');
    }).not.toThrow();
  });
});
