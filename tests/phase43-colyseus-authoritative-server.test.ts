import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createGameServer, ThaisCityRoom, WorldState, PlayerState } from '../packages/server/src';
import { createAuthToken } from '../packages/auth/src';

describe('Phase 43: Servidor de Jogo Autoritativo com Colyseus.js & Game Loop em Ticks', () => {
  let gameServerInstance: ReturnType<typeof createGameServer>;

  beforeEach(() => {
    gameServerInstance = createGameServer();
  });

  afterEach(async () => {
    if (gameServerInstance) {
      await gameServerInstance.close();
    }
  });

  it('initializes Express & Colyseus game server with health endpoint', async () => {
    const port = await gameServerInstance.listen(0);
    expect(port).toBeGreaterThan(0);

    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('ok');
  });

  it('initializes ThaisCityRoom state with server ticks and monster spawns', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    expect(room.state).toBeDefined();
    expect(room.state.regionName).toBe('thais-city');
    expect(room.state.serverTick).toBe(0);

    // Initial spawns: Target Dummy and Rotworm
    expect(room.state.monsters.size).toBe(2);
    const dummy = room.state.monsters.get('dummy-1');
    expect(dummy).toBeDefined();
    expect(dummy?.name).toBe('Target Dummy');

    const rotworm = room.state.monsters.get('rotworm-1');
    expect(rotworm).toBeDefined();
    expect(rotworm?.name).toBe('Rotworm');
    expect(rotworm?.lookType).toBe(26);
  });

  it('handles player join, token decoding and canonical Thais Temple spawn (32369, 32241, 7)', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const token = createAuthToken({
      accountId: 'acc-hero-100',
      email: 'knight@tibia.test',
      role: 'player',
      isPremium: true,
    });

    const mockClient: any = { sessionId: 'session-client-1' };
    room.onJoin(mockClient, {
      token,
      mockCharacter: {
        id: 'char-knight-1',
        accountId: 'acc-hero-100',
        name: 'Knight Hero',
        vocationId: 4,
        level: 20,
      },
    });

    expect(room.state.players.size).toBe(1);
    const player = room.state.players.get('session-client-1');
    expect(player).toBeDefined();
    expect(player?.name).toBe('Knight Hero');
    expect(player?.vocationName).toBe('Knight');
    expect(player?.level).toBe(20);

    // Canonical Thais spawn position
    expect(player?.posX).toBe(32369);
    expect(player?.posY).toBe(32241);
    expect(player?.posZ).toBe(7);
  });

  it('validates server-side player movement and enforces step cooldown (anti-speedhack)', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const mockClient: any = { sessionId: 'session-client-2' };
    room.onJoin(mockClient, {
      mockCharacter: {
        id: 'char-paladin-1',
        accountId: 'acc-1',
        name: 'Legolas',
        vocationId: 3,
        level: 15,
      },
    });

    const player = room.state.players.get('session-client-2')!;
    const initialX = player.posX;
    const initialY = player.posY;

    // Simulate move message: North
    (room as any).handlePlayerMove(mockClient, 'north');
    expect(player.posY).toBe(initialY - 1);
    expect(player.direction).toBe('north');

    // Immediate second move within 150ms should be rejected (anti-speedhack)
    (room as any).handlePlayerMove(mockClient, 'east');
    expect(player.posX).toBe(initialX); // Position unchanged because step cooldown was active
  });

  it('processes spell casting (exura heal & exori AoE damage) on server', () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const mockClient: any = { sessionId: 'session-client-3' };
    room.onJoin(mockClient, {
      mockCharacter: {
        id: 'char-sorcerer-1',
        accountId: 'acc-1',
        name: 'Vimago',
        vocationId: 1,
        level: 40,
      },
    });

    const player = room.state.players.get('session-client-3')!;
    player.hp = 50; // Damaged HP
    player.mp = 100;

    // Cast Exura
    (room as any).handleCastSpell(mockClient, 'exura');
    expect(player.hp).toBeGreaterThan(50);
    expect(player.mp).toBe(80);

    // Move player adjacent to rotworm and cast Exori
    const rotworm = room.state.monsters.get('rotworm-1')!;
    player.posX = rotworm.posX + 1;
    player.posY = rotworm.posY;
    player.mp = 150;
    const rotwormInitialHp = rotworm.hp;

    (room as any).handleCastSpell(mockClient, 'exori');
    expect(rotworm.hp).toBeLessThan(rotwormInitialHp);
    expect(player.mp).toBe(35);
  });

  it('executes server simulation ticks, auto-attacks and monster respawns', async () => {
    const room = new ThaisCityRoom();
    room.onCreate({});

    const mockClient: any = { sessionId: 'session-client-4' };
    room.onJoin(mockClient, {
      mockCharacter: {
        id: 'char-knight-2',
        accountId: 'acc-1',
        name: 'Warrior',
        vocationId: 4,
        level: 30,
      },
    });

    const player = room.state.players.get('session-client-4')!;
    const rotworm = room.state.monsters.get('rotworm-1')!;

    // Position player next to rotworm and set target
    player.posX = rotworm.posX;
    player.posY = rotworm.posY + 1;
    player.targetId = rotworm.id;
    player.lastAttackTime = 0; // Ready to attack

    const initialMonsterHp = rotworm.hp;

    // Run single server tick (100ms)
    (room as any).gameTick(100);

    expect(room.state.serverTick).toBe(1);
    expect(rotworm.hp).toBeLessThan(initialMonsterHp);

    // Test player leave (consented logout code 1000)
    await room.onLeave(mockClient, 1000);
    expect(room.state.players.size).toBe(0);
  });
});
