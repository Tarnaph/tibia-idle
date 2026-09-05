import { describe, it, expect } from 'vitest';
import { createAuthToken } from '../packages/auth/src/jwt';
import { GET as getAdminConfig, POST as postAdminConfig } from '../app/api/admin/config/route';
import { GET as getAdminPlayers, POST as postAdminPlayers } from '../app/api/admin/players/route';
import { GET as getAdminLogs, DELETE as deleteAdminLogs } from '../app/api/admin/logs/route';
import { ThaisCityRoom, PlayerState } from '../packages/server/src';

describe('Phase 63: Security & Anti-Cheat Backend Hardening', () => {
  const playerToken = createAuthToken({
    accountId: 'acc-player-1',
    email: 'player@tibia.test',
    role: 'player',
    isPremium: false,
  });

  const adminToken = createAuthToken({
    accountId: 'acc-admin-1',
    email: 'admin@tibia.test',
    role: 'admin',
    isPremium: true,
  });

  describe('1. Admin REST API Protection (/api/admin/*)', () => {
    it('rejects unauthenticated requests to /api/admin/config with 401', async () => {
      const req = new Request('http://localhost/api/admin/config', { method: 'GET' });
      const res = await getAdminConfig(req);
      expect(res.status).toBe(401);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
    });

    it('rejects non-admin player tokens to /api/admin/config with 403', async () => {
      const req = new Request('http://localhost/api/admin/config', {
        method: 'GET',
        headers: { Authorization: `Bearer ${playerToken}` },
      });
      const res = await getAdminConfig(req);
      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.success).toBe(false);
    });

    it('allows valid admin tokens to access /api/admin/config with 200', async () => {
      const req = new Request('http://localhost/api/admin/config', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const res = await getAdminConfig(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.success).toBe(true);
    });

    it('rejects unauthenticated requests to /api/admin/players POST with 401', async () => {
      const req = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        body: JSON.stringify({ action: 'give_exp', characterId: 'char-test', value: 5000 }),
      });
      const res = await postAdminPlayers(req);
      expect(res.status).toBe(401);
    });

    it('rejects player token requests to /api/admin/players POST with 403', async () => {
      const req = new Request('http://localhost/api/admin/players', {
        method: 'POST',
        headers: { Authorization: `Bearer ${playerToken}` },
        body: JSON.stringify({ action: 'give_exp', characterId: 'char-test', value: 5000 }),
      });
      const res = await postAdminPlayers(req);
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests to /api/admin/logs DELETE with 401', async () => {
      const req = new Request('http://localhost/api/admin/logs', { method: 'DELETE' });
      const res = await deleteAdminLogs(req);
      expect(res.status).toBe(401);
    });
  });

  describe('2. WebSocket Teleport Anti-Cheat (player:teleport)', () => {
    it('prevents regular players (role: PLAYER) from teleporting arbitrarily via WebSocket', () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const client = { sessionId: 'regular-client-1', send: () => {} };
      const player = new PlayerState();
      player.id = 'regular-client-1';
      player.role = 'PLAYER';
      player.posX = 32369;
      player.posY = 32241;
      player.posZ = 7;

      room.state.players.set('regular-client-1', player);

      // Regular player tries to send teleport message to (32000, 32000)
      (room as any).onMessageHandlers['player:teleport'](client, { x: 32000, y: 32000, z: 7 });

      // Expect position to remain unchanged (32369, 32241)
      expect(player.posX).toBe(32369);
      expect(player.posY).toBe(32241);
    });

    it('allows admin players (role: ADMIN) to execute player:teleport', () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const client = { sessionId: 'admin-client-1', send: () => {} };
      const player = new PlayerState();
      player.id = 'admin-client-1';
      player.role = 'ADMIN';
      player.posX = 32369;
      player.posY = 32241;
      player.posZ = 7;

      room.state.players.set('admin-client-1', player);

      // Admin executes teleport to Depot (32342, 32231)
      (room as any).onMessageHandlers['player:teleport'](client, { x: 32342, y: 32231, z: 7 });

      // Expect position to update
      expect(player.posX).toBe(32342);
      expect(player.posY).toBe(32231);
    });
  });

  describe('3. Movement Noclip / Wallhack Prevention (handlePlayerMove)', () => {
    it('constrains movement steps and ignores client attempts to jump 8 tiles away', () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const client = { sessionId: 'client-move-1', send: () => {} };
      const player = new PlayerState();
      player.id = 'client-move-1';
      player.posX = 32369;
      player.posY = 32241;
      player.lastStepTime = 0;

      room.state.players.set('client-move-1', player);

      // Client sends a move step with clientX 8 tiles away (attempted noclip warp)
      (room as any).handlePlayerMove(client, 'south', 32369, 32249, 7);

      // Expect server to move 1 step south (32242), ignoring clientX jump to 32249
      expect(player.posY).toBe(32242);
    });
  });
});
