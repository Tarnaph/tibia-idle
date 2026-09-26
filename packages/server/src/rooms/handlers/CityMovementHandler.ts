import { Client } from '@colyseus/core';
import type { ThaisCityRoom } from '../ThaisCityRoom';

export class CityMovementHandler {
  constructor(private room: ThaisCityRoom) {}

  public register(): void {
    this.room.onMessage('move', (client, data: { direction?: 'north' | 'south' | 'east' | 'west'; dir?: 'north' | 'south' | 'east' | 'west'; x?: number; y?: number; z?: number }) => {
      const dir = data?.direction || data?.dir;
      if (dir) {
        this.handlePlayerMove(client, dir, data.x, data.y, data.z);
      }
    });

    this.room.onMessage('turn', (client, data: { direction?: 'north' | 'south' | 'east' | 'west'; dir?: 'north' | 'south' | 'east' | 'west' }) => {
      const dir = data?.direction || data?.dir;
      const player = this.room.state.players.get(client.sessionId);
      if (player && dir) {
        player.direction = dir;
      }
    });

    this.room.onMessage('changeOutfit', (client, data: {
      outfit?: string;
      lookType?: number;
      outfitColors?: { head: number; primary: number; secondary: number; detail: number };
      head?: number;
      body?: number;
      legs?: number;
      feet?: number;
      addons?: number;
      mount?: string;
      mountActive?: boolean;
      gender?: 'male' | 'female';
    }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;
      if (data.outfit) player.outfit = data.outfit;
      if (data.gender === 'male' || data.gender === 'female') player.gender = data.gender;
      if (data.lookType !== undefined) player.outfitLookType = data.lookType;
      if (data.outfitColors) {
        player.outfitHead = data.outfitColors.head;
        player.outfitBody = data.outfitColors.primary;
        player.outfitLegs = data.outfitColors.secondary;
        player.outfitFeet = data.outfitColors.detail;
      } else {
        if (data.head !== undefined) player.outfitHead = data.head;
        if (data.body !== undefined) player.outfitBody = data.body;
        if (data.legs !== undefined) player.outfitLegs = data.legs;
        if (data.feet !== undefined) player.outfitFeet = data.feet;
      }
      if (data.addons !== undefined) player.outfitAddons = data.addons;
      if (data.mount !== undefined) player.mount = data.mount;
      if (data.mountActive !== undefined) player.mountActive = data.mountActive;
    });

    this.room.onMessage('player:teleport', (client, data: { x: number; y: number; z?: number }) => {
      const player = this.room.state.players.get(client.sessionId);
      if (!player) return;
      const isAdmin = player.role === 'ADMIN' || player.adminTitle === 'GOD' || player.adminTitle === 'GM';
      const isThaisReturn = (data.x === 32369 && data.y === 32241) || (data.z === 7 && typeof data.x === 'number' && typeof data.y === 'number');
      if ((isAdmin || isThaisReturn) && typeof data.x === 'number' && typeof data.y === 'number') {
        player.posX = data.x;
        player.posY = data.y;
        player.posZ = data.z ?? 7;
        player.isWalking = false;
        player.lastStepTime = 0;
        if (player.posZ === 7) {
          player.inHunt = false;
          this.room.updatePlayerHuntContext(player, false);
        }
      }
    });
  }

  public handlePlayerMove(
    client: Client,
    direction: 'north' | 'south' | 'east' | 'west',
    clientX?: number,
    clientY?: number,
    clientZ?: number
  ): void {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    const now = Date.now();
    // Validate step cooldown (minimum 75ms between steps for city speed 500)
    if (now - player.lastStepTime < 75) {
      return; // Anti-speedhack
    }

    let dx = 0;
    let dy = 0;
    if (direction === 'north') dy = -1;
    if (direction === 'south') dy = 1;
    if (direction === 'west') dx = -1;
    if (direction === 'east') dx = 1;

    let targetX = player.posX + dx;
    let targetY = player.posY + dy;
    let targetZ = player.posZ;

    // If client provided matching nearby single-step coordinates, reconcile directly
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const dist = Math.hypot(clientX - player.posX, clientY - player.posY);
      if (dist <= 1.5) {
        targetX = clientX;
        targetY = clientY;
        if (typeof clientZ === 'number') targetZ = clientZ;
      }
    }

    // Boundary & Basic Wall Check for Thais Bounding Box
    if (targetX < 32280 || targetX > 32430 || targetY < 32170 || targetY > 32290) {
      return; // Out of bounds
    }

    player.direction = direction;
    player.posX = targetX;
    player.posY = targetY;
    player.posZ = targetZ;
    player.isWalking = true;
    player.lastStepTime = now;

    // If this player is a party leader, broadcast position to party members for follow mechanic
    const partyLeaderId = this.room.playerPartyLeader.get(client.sessionId);
    if (partyLeaderId === client.sessionId) {
      const party = this.room.parties.get(partyLeaderId);
      if (party) {
        for (const memberId of party.memberSessionIds) {
          if (memberId !== client.sessionId) {
            const memberClient = this.room.clients.find((c) => c.sessionId === memberId);
            if (memberClient) {
              memberClient.send('party:leaderMoved', {
                leaderSessionId: client.sessionId,
                x: targetX,
                y: targetY,
                z: targetZ,
                direction,
              });
            }
          }
        }
      }
    }
  }
}
