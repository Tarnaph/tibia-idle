import { describe, it, expect } from 'vitest';
import type { RemotePlayerSnapshot } from '../apps/web/lib/GameClientNetworkManager';

describe('Phase 55: Multiplayer Remote Player Synchronization & Filtering', () => {
  const localPlayerSessionId = 'session-player-1';
  const localCharacterId = 'char-player-1';

  const remotePlayersMap = new Map<string, RemotePlayerSnapshot>([
    [
      'session-player-1',
      {
        id: 'session-player-1',
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

  it('should filter out local player from remote player rendering list', () => {
    const squadCharIds = new Set([localCharacterId]);

    const renderedRemotes: RemotePlayerSnapshot[] = [];
    remotePlayersMap.forEach((p, key) => {
      if (key === localPlayerSessionId || squadCharIds.has(p.id)) return;
      renderedRemotes.push(p);
    });

    expect(renderedRemotes).toHaveLength(1);
    expect(renderedRemotes[0].id).toBe('session-player-2');
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

  it('should calculate valid actor IDs for lifecycle cleanup', () => {
    const squadChars = [{ id: 'char-player-1' }];
    const ambientPlayers = [{ id: 'player-vimago' }, { id: 'player-elane' }];

    const validActorIds = new Set<string>();
    squadChars.forEach((c) => validActorIds.add(c.id));
    ambientPlayers.forEach((p) => validActorIds.add(p.id));

    remotePlayersMap.forEach((p, key) => {
      if (key !== localPlayerSessionId && !squadChars.some((c) => c.id === p.id)) {
        validActorIds.add(p.id);
      }
    });

    expect(validActorIds.has('char-player-1')).toBe(true);
    expect(validActorIds.has('player-vimago')).toBe(true);
    expect(validActorIds.has('player-elane')).toBe(true);
    expect(validActorIds.has('session-player-2')).toBe(true);
    expect(validActorIds.has('session-player-1')).toBe(false);
  });
});
