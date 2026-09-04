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
    outfit?: string;
    lookType: number;
    lookHead: number;
    lookBody: number;
    lookLegs: number;
    lookFeet: number;
    addons?: number;
  };
  mount?: string;
  mountActive?: boolean;
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

export interface PartyMemberSnapshot {
  sessionId: string;
  characterId: string;
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
  isLeader: boolean;
}

export interface PartySnapshot {
  leaderSessionId: string;
  leaderName: string;
  members: PartyMemberSnapshot[];
}

export interface PartyInvitation {
  inviterSessionId: string;
  inviterName: string;
  inviterLevel?: number;
  inviterVocationId?: number;
}

type CombatEventListener = (event: NetworkCombatEvent) => void;
type ChatMessageListener = (msg: NetworkChatMessage) => void;
type StateChangeListener = (players: Map<string, RemotePlayerSnapshot>) => void;
type PartyInvitationListener = (invitation: PartyInvitation) => void;
type PartySyncListener = (party: PartySnapshot | null) => void;
type PartyHuntStartListener = (data: { huntId: string; leaderName: string; leaderSessionId: string }) => void;
type PartyTargetSyncListener = (targetId: string | null) => void;
type PartyLeaderMovedListener = (data: { leaderSessionId: string; x: number; y: number; z: number; direction: string }) => void;
type PartyNotificationListener = (data: { type: 'error' | 'rejected' | 'disbanded' | 'sent'; message: string }) => void;

export class GameClientNetworkManager {
  private room: Room<any> | null = null;
  private combatListeners: Set<CombatEventListener> = new Set();
  private chatListeners: Set<ChatMessageListener> = new Set();
  private stateListeners: Set<StateChangeListener> = new Set();
  private partyInvitationListeners: Set<PartyInvitationListener> = new Set();
  private partySyncListeners: Set<PartySyncListener> = new Set();
  private partyHuntStartListeners: Set<PartyHuntStartListener> = new Set();
  private partyTargetSyncListeners: Set<PartyTargetSyncListener> = new Set();
  private partyLeaderMovedListeners: Set<PartyLeaderMovedListener> = new Set();
  private partyNotificationListeners: Set<PartyNotificationListener> = new Set();

  private playersMap: Map<string, RemotePlayerSnapshot> = new Map();
  private localPlayerId: string | null = null;
  private reconnectionToken: string | null = null;
  private currentParty: PartySnapshot | null = null;

  get IsConnected(): boolean {
    return this.room !== null;
  }

  async connect(token: string, characterId: string, options?: Record<string, any>): Promise<Room<any>> {
    this.room = await joinGameRoom(token, characterId, options);
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

    const monitoredPlayers = new Set<string>();

    const bindPlayer = (player: any, key: string) => {
      if (!player) return;
      this.updatePlayerSnapshot(key, player);

      if (!monitoredPlayers.has(key) && typeof player.onChange === 'function') {
        monitoredPlayers.add(key);
        player.onChange(() => {
          this.updatePlayerSnapshot(key, player);
          this.notifyStateChange();
        });
      }
    };

    // 1. Synchronize all players ALREADY in the room state when connecting
    if (this.room.state && this.room.state.players) {
      this.room.state.players.forEach((player: any, key: string) => {
        bindPlayer(player, key);
      });
      this.notifyStateChange();

      // Listen to new players added or removed dynamically via Schema callbacks
      if (typeof this.room.state.players.onAdd === 'function') {
        this.room.state.players.onAdd((player: any, key: string) => {
          bindPlayer(player, key);
          this.notifyStateChange();
        });
      }

      if (typeof this.room.state.players.onRemove === 'function') {
        this.room.state.players.onRemove((_player: any, key: string) => {
          monitoredPlayers.delete(key);
          this.playersMap.delete(key);
          this.notifyStateChange();
        });
      }
    }

    // 2. Room-wide state updates for real-time player updates without duplicate listeners
    this.room.onStateChange((state: any) => {
      if (state && state.players) {
        let hasChanges = false;
        state.players.forEach((player: any, key: string) => {
          if (!monitoredPlayers.has(key)) {
            bindPlayer(player, key);
            hasChanges = true;
          } else {
            this.updatePlayerSnapshot(key, player);
            hasChanges = true;
          }
        });
        if (hasChanges) {
          this.notifyStateChange();
        }
      }
    });

    // 3. Handle room disconnection cleanly
    this.room.onLeave((code) => {
      console.warn('[GameClientNetworkManager] Room connection left, code:', code);
      this.room = null;
      monitoredPlayers.clear();
      this.playersMap.clear();
      this.notifyStateChange();
    });

    // 4. Listen to messages from server
    this.room.onMessage('combat_event', (event: NetworkCombatEvent) => {
      this.combatListeners.forEach((fn) => fn(event));
    });

    const onChat = (msg: NetworkChatMessage) => {
      this.chatListeners.forEach((fn) => fn(msg));
    };
    this.room.onMessage('chat', onChat);
    this.room.onMessage('chat_message', onChat);

    // Party multiplayer event listeners
    this.room.onMessage('party:invitationReceived', (data: PartyInvitation) => {
      this.partyInvitationListeners.forEach((fn) => fn(data));
    });

    this.room.onMessage('party:sync', (data: PartySnapshot) => {
      this.currentParty = data;
      this.partySyncListeners.forEach((fn) => fn(data));
    });

    this.room.onMessage('party:left', () => {
      this.currentParty = null;
      this.partySyncListeners.forEach((fn) => fn(null));
    });

    this.room.onMessage('party:disbanded', (data: { reason: string }) => {
      this.currentParty = null;
      this.partySyncListeners.forEach((fn) => fn(null));
      this.partyNotificationListeners.forEach((fn) => fn({ type: 'disbanded', message: data.reason }));
    });

    this.room.onMessage('party:inviteSent', (data: { targetName: string }) => {
      this.partyNotificationListeners.forEach((fn) => fn({ type: 'sent', message: `Convite de party enviado para ${data.targetName}!` }));
    });

    this.room.onMessage('party:inviteRejected', (data: { memberName: string }) => {
      this.partyNotificationListeners.forEach((fn) => fn({ type: 'rejected', message: `${data.memberName} recusou o convite de party.` }));
    });

    this.room.onMessage('party:error', (data: { message: string }) => {
      this.partyNotificationListeners.forEach((fn) => fn({ type: 'error', message: data.message }));
    });

    this.room.onMessage('party:huntStarted', (data: { huntId: string; leaderName: string; leaderSessionId: string }) => {
      this.partyHuntStartListeners.forEach((fn) => fn(data));
    });

    this.room.onMessage('party:targetUpdated', (data: { targetId: string | null }) => {
      this.partyTargetSyncListeners.forEach((fn) => fn(data.targetId));
    });

    this.room.onMessage('party:leaderMoved', (data: { leaderSessionId: string; x: number; y: number; z: number; direction: string }) => {
      this.partyLeaderMovedListeners.forEach((fn) => fn(data));
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
    const outfit = player.outfit || undefined;
    const lookType = Number(player.outfitLookType ?? player.lookType ?? 128);
    const head = Number(player.outfitHead ?? player.lookHead ?? 0);
    const body = Number(player.outfitBody ?? player.lookBody ?? 0);
    const legs = Number(player.outfitLegs ?? player.lookLegs ?? 0);
    const feet = Number(player.outfitFeet ?? player.lookFeet ?? 0);
    const addons = Number(player.outfitAddons ?? player.addons ?? 0);
    const mount = player.mount || 'none';
    const mountActive = Boolean(player.mountActive);

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
        outfit,
        lookType,
        lookHead: head,
        lookBody: body,
        lookLegs: legs,
        lookFeet: feet,
        addons,
      },
      mount,
      mountActive,
    });
  }

  private notifyStateChange(): void {
    this.stateListeners.forEach((fn) => fn(new Map(this.playersMap)));
  }

  sendMove(direction: 'north' | 'south' | 'east' | 'west', coords?: { x: number; y: number; z?: number }): void {
    if (!this.room) return;
    this.room.send('move', {
      direction,
      dir: direction,
      x: coords?.x,
      y: coords?.y,
      z: coords?.z,
    });
  }

  sendChangeOutfit(customization: {
    outfit?: string;
    lookType?: number;
    outfitColors?: { head: number; primary: number; secondary: number; detail: number };
    addons?: number;
    mount?: string;
    mountActive?: boolean;
  }): void {
    if (!this.room) return;
    this.room.send('changeOutfit', customization);
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

  // Party multiplayer actions
  sendPartyInvite(targetName: string): void {
    if (!this.room) return;
    this.room.send('party:invite', { targetName });
  }

  sendPartyAccept(inviterSessionId: string): void {
    if (!this.room) return;
    this.room.send('party:acceptInvite', { inviterSessionId });
  }

  sendPartyReject(inviterSessionId: string): void {
    if (!this.room) return;
    this.room.send('party:rejectInvite', { inviterSessionId });
  }

  sendPartyLeave(): void {
    if (!this.room) return;
    this.room.send('party:leave', {});
  }

  sendPartyHuntSync(huntId: string): void {
    if (!this.room) return;
    this.room.send('party:huntSync', { huntId });
  }

  sendPartyTargetSync(targetId: string | null): void {
    if (!this.room) return;
    this.room.send('party:targetSync', { targetId });
  }

  onPartyInvitation(listener: PartyInvitationListener): () => void {
    this.partyInvitationListeners.add(listener);
    return () => this.partyInvitationListeners.delete(listener);
  }

  onPartySync(listener: PartySyncListener): () => void {
    this.partySyncListeners.add(listener);
    return () => this.partySyncListeners.delete(listener);
  }

  onPartyHuntStart(listener: PartyHuntStartListener): () => void {
    this.partyHuntStartListeners.add(listener);
    return () => this.partyHuntStartListeners.delete(listener);
  }

  onPartyTargetSync(listener: PartyTargetSyncListener): () => void {
    this.partyTargetSyncListeners.add(listener);
    return () => this.partyTargetSyncListeners.delete(listener);
  }

  onPartyLeaderMoved(listener: PartyLeaderMovedListener): () => void {
    this.partyLeaderMovedListeners.add(listener);
    return () => this.partyLeaderMovedListeners.delete(listener);
  }

  onPartyNotification(listener: PartyNotificationListener): () => void {
    this.partyNotificationListeners.add(listener);
    return () => this.partyNotificationListeners.delete(listener);
  }

  get CurrentParty(): PartySnapshot | null {
    return this.currentParty;
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
