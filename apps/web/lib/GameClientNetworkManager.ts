import type { Room } from 'colyseus.js';
import { joinGameRoom } from './colyseusClient';

export interface RemotePlayerSnapshot {
  id: string;
  characterId?: string;
  name: string;
  vocationId: number;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  x: number;
  y: number;
  z: number;
  direction: 'north' | 'south' | 'east' | 'west';
  isMoving: boolean;
  outfit: {
    lookType: number;
    lookHead: number;
    lookBody: number;
    lookLegs: number;
    lookFeet: number;
  };
}

export interface NetworkCombatEvent {
  type: 'damage' | 'heal' | 'spell' | 'miss';
  sourceId: string;
  targetId: string;
  amount?: number;
  spellId?: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface NetworkChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  channel: string;
  text: string;
  timestamp: number;
}

type CombatEventListener = (event: NetworkCombatEvent) => void;
type ChatMessageListener = (msg: NetworkChatMessage) => void;
type StateChangeListener = (players: Map<string, RemotePlayerSnapshot>) => void;

export class GameClientNetworkManager {
  private room: Room<any> | null = null;
  private combatListeners: Set<CombatEventListener> = new Set();
  private chatListeners: Set<ChatMessageListener> = new Set();
  private stateListeners: Set<StateChangeListener> = new Set();
  private playersMap: Map<string, RemotePlayerSnapshot> = new Map();
  private localPlayerId: string | null = null;
  private reconnectionToken: string | null = null;

  async connect(token: string, characterId: string): Promise<Room<any>> {
    this.room = await joinGameRoom(token, characterId);
    this.localPlayerId = this.room.sessionId;
    this.reconnectionToken = this.room.reconnectionToken || null;

    if (typeof window !== 'undefined' && this.reconnectionToken) {
      sessionStorage.setItem('colyseus_reconnect_token', this.reconnectionToken);
    }

    this.setupRoomListeners();
    return this.room;
  }

  async tryReconnect(reconnectToken?: string): Promise<Room<any> | null> {
    const targetToken =
      reconnectToken ||
      this.reconnectionToken ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('colyseus_reconnect_token') : null);

    if (!targetToken) return null;

    try {
      const { reconnectGameRoom } = await import('./colyseusClient');
      this.room = await reconnectGameRoom(targetToken);
      this.localPlayerId = this.room.sessionId;
      this.reconnectionToken = this.room.reconnectionToken || targetToken;
      this.setupRoomListeners();
      return this.room;
    } catch (err) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('colyseus_reconnect_token');
      }
      return null;
    }
  }

  private setupRoomListeners(): void {
    if (!this.room) return;

    // Listen to players collection
    if (this.room.state && this.room.state.players) {
      this.room.state.players.onAdd = (player: any, key: string) => {
        if (!player) return;
        this.updatePlayerSnapshot(key, player);
        if (typeof player.onChange === 'function') {
          player.onChange(() => {
            this.updatePlayerSnapshot(key, player);
            this.notifyStateChange();
          });
        }
        this.notifyStateChange();
      };

      this.room.state.players.onRemove = (_player: any, key: string) => {
        this.playersMap.delete(key);
        this.notifyStateChange();
      };
    }

    // Listen to messages from server
    this.room.onMessage('combat_event', (event: NetworkCombatEvent) => {
      this.combatListeners.forEach((fn) => fn(event));
    });

    this.room.onMessage('chat_message', (msg: NetworkChatMessage) => {
      this.chatListeners.forEach((fn) => fn(msg));
    });

    this.room.onMessage('chat', (msg: NetworkChatMessage) => {
      this.chatListeners.forEach((fn) => fn(msg));
    });
  }

  disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.playersMap.clear();
    this.localPlayerId = null;
  }

  private updatePlayerSnapshot(key: string, player: any): void {
    if (!player) return;
    this.playersMap.set(key, {
      id: key,
      characterId: player.characterId || player.id || key,
      name: player.name || 'Aventureiro',
      vocationId: player.vocationId || 1,
      level: player.level || 1,
      hp: player.hp || 100,
      maxHp: player.maxHp || 100,
      mp: player.mp || 35,
      maxMp: player.maxMp || 35,
      x: player.posX ?? player.x ?? 32369,
      y: player.posY ?? player.y ?? 32241,
      z: player.posZ ?? player.z ?? 7,
      direction: player.direction || 'south',
      isMoving: Boolean(player.isWalking ?? player.isMoving),
      outfit: {
        lookType: player.lookType || 128,
        lookHead: player.lookHead || 0,
        lookBody: player.lookBody || 0,
        lookLegs: player.lookLegs || 0,
        lookFeet: player.lookFeet || 0,
      },
    });
  }

  private notifyStateChange(): void {
    this.stateListeners.forEach((fn) => fn(new Map(this.playersMap)));
  }

  sendMove(direction: 'north' | 'south' | 'east' | 'west'): void {
    if (!this.room) return;
    this.room.send('move', { dir: direction });
  }

  sendCastSpell(spellId: string, targetId?: string): void {
    if (!this.room) return;
    this.room.send('castSpell', { spellId, targetId });
  }

  sendAttack(targetId: string | null): void {
    if (!this.room) return;
    this.room.send('attack', { targetId });
  }

  sendChat(text: string, channel: string = 'local'): void {
    if (!this.room) return;
    this.room.send('chat', { text, channel });
  }

  onCombatEvent(listener: CombatEventListener): () => void {
    this.combatListeners.add(listener);
    return () => this.combatListeners.delete(listener);
  }

  onChatMessage(listener: ChatMessageListener): () => void {
    this.chatListeners.add(listener);
    return () => this.chatListeners.delete(listener);
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  get Players(): Map<string, RemotePlayerSnapshot> {
    return new Map(this.playersMap);
  }

  get LocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  get Room(): Room<any> | null {
    return this.room;
  }
}

export const gameNetwork = new GameClientNetworkManager();
