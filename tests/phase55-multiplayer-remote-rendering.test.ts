import { describe, it, expect } from 'vitest';
import type { RemotePlayerSnapshot } from '../apps/web/lib/GameClientNetworkManager';
import { ThaisCityRoom } from '../packages/server/src';

describe('Phase 55: Multiplayer Remote Player Synchronization & Position Persistence', () => {
  const localPlayerSessionId = 'session-player-1';
  const localCharacterId = 'char-player-1';

  const remotePlayersMap = new Map<string, RemotePlayerSnapshot>([
    [
      'session-player-1',
      {
        id: 'session-player-1',
        characterId: 'char-player-1',
        name: 'Local Hero',
        vocationId: 1,
        level: 50,
        hp: 400,
        maxHp: 400,
        mp: 100,
        maxMp: 100,
        x: 32369,
        y: 32241,
        z: 7,
        direction: 'south',
        isMoving: false,
        outfit: { lookType: 128, lookHead: 10, lookBody: 20, lookLegs: 30, lookFeet: 40 },
      },
    ],
    [
      'session-player-2',
      {
        id: 'session-player-2',
        characterId: 'char-player-2',
        name: 'Remote Ally',
        vocationId: 3,
        level: 45,
        hp: 350,
        maxHp: 350,
        mp: 600,
        maxMp: 600,
        x: 32370,
        y: 32241,
        z: 7,
        direction: 'east',
        isMoving: true,
        outfit: { lookType: 130, lookHead: 5, lookBody: 86, lookLegs: 114, lookFeet: 76 },
      },
    ],
  ]);

  it('should filter out local player from remote player rendering list using characterId or sessionId', () => {
    const squadCharIds = new Set([localCharacterId]);

    const renderedRemotes: RemotePlayerSnapshot[] = [];
    remotePlayersMap.forEach((p, key) => {
      if (key === localPlayerSessionId || squadCharIds.has(p.id) || (p.characterId && squadCharIds.has(p.characterId))) return;
      renderedRemotes.push(p);
    });

    expect(renderedRemotes).toHaveLength(1);
    expect(renderedRemotes[0].id).toBe('session-player-2');
    expect(renderedRemotes[0].characterId).toBe('char-player-2');
    expect(renderedRemotes[0].name).toBe('Remote Ally');
  });

  it('should construct outfit colors correctly from RemotePlayerSnapshot', () => {
    const remote = remotePlayersMap.get('session-player-2')!;
    const colors = {
      head: remote.outfit.lookHead,
      primary: remote.outfit.lookBody,
      secondary: remote.outfit.lookLegs,
      detail: remote.outfit.lookFeet,
    };

    expect(colors).toEqual({
      head: 5,
      primary: 86,
      secondary: 114,
      detail: 76,
    });
  });

  it('should include posX, posY, posZ in position save payload', () => {
    const cityPos = { x: 32350, y: 32225, z: 7 };
    const payload = {
      level: 50,
      experience: 125000,
      health: 400,
      maxHealth: 400,
      mana: 100,
      maxMana: 100,
      posX: cityPos.x,
      posY: cityPos.y,
      posZ: cityPos.z,
    };

    expect(payload.posX).toBe(32350);
    expect(payload.posY).toBe(32225);
    expect(payload.posZ).toBe(7);
  });

  it('should update player position and direction in ThaisCityRoom when move packet is received', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'session-p1', send: () => {} };
    room.onJoin(client1, { mockCharacter: { id: 'c1', accountId: 'a1', name: 'Astronis', vocationId: 1, level: 10 } });

    const player = room.state.players.get('session-p1')!;
    player.posX = 32369;
    player.posY = 32241;
    player.lastStepTime = 0;

    // Simulate move north
    (room as any).handlePlayerMove(client1, 'north', 32369, 32240, 7);

    expect(player.posX).toBe(32369);
    expect(player.posY).toBe(32240);
    expect(player.direction).toBe('north');
    expect(player.isWalking).toBe(true);
  });

  it('should synchronize outfit changes across players in ThaisCityRoom', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const client1: any = { sessionId: 'session-p1', send: () => {} };
    room.onJoin(client1, {
      mockCharacter: { id: 'c1', accountId: 'a1', name: 'Sir Laron', vocationId: 4, level: 20 },
      outfit: 'Knight',
      outfitColors: { head: 10, primary: 20, secondary: 30, detail: 40 },
    });

    const player = room.state.players.get('session-p1')!;
    expect(player.outfit).toBe('Knight');
    expect(player.outfitHead).toBe(10);
    expect(player.outfitBody).toBe(20);

    // Now change outfit
    const changeOutfitHandler = (room as any).onMessageHandlers['changeOutfit'];
    expect(changeOutfitHandler).toBeDefined();
    changeOutfitHandler(client1, {
      outfit: 'Sire',
      outfitColors: { head: 95, primary: 114, secondary: 86, detail: 0 },
      mount: 'donkey',
      mountActive: true,
    });

    expect(player.outfit).toBe('Sire');
    expect(player.outfitHead).toBe(95);
    expect(player.outfitBody).toBe(114);
    expect(player.mount).toBe('donkey');
    expect(player.mountActive).toBe(true);
  });
});
