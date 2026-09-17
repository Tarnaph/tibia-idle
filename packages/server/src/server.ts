import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import cors from 'cors';
import { Server } from '@colyseus/core';
import { monitor } from '@colyseus/monitor';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ThaisCityRoom } from './rooms/ThaisCityRoom.ts';
import { ServerCharacterContextRegistry } from '../../auth/src';
import { persistenceManager } from './persistence/PrismaPersistenceManager.ts';

// Ensure .env is loaded in server process if running standalone
if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
}

export interface CreateGameServerOptions {
  port?: number;
  expressApp?: express.Application;
}

export function colyseusMonitorAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isExplicitlyDisabled = process.env.ENABLE_COLYSEUS_MONITOR === 'false';
  const configuredUser = process.env.COLYSEUS_MONITOR_USER;
  const configuredPass = process.env.COLYSEUS_MONITOR_PASS;

  if (isExplicitlyDisabled || !configuredUser || !configuredPass) {
    return res.status(404).send('Not Found');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
    return res.status(401).send('Authentication required to access Colyseus Monitor.');
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) {
      res.set('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
      return res.status(401).send('Invalid authorization format.');
    }
    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    if (username === configuredUser && password === configuredPass) {
      return next();
    }
  } catch {}

  res.set('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
  return res.status(401).send('Unauthorized');
}

export function createGameServer(options: CreateGameServerOptions = {}) {
  ServerCharacterContextRegistry.setAuthoritativeSource(true);
  const app = options.expressApp || express();
  app.use(cors());
  app.use(express.json());

  app.use('/colyseus', colyseusMonitorAuthMiddleware, monitor());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/online-count', (req, res) => {
    const count = ThaisCityRoom.activeInstance
      ? ThaisCityRoom.activeInstance.getUniqueOnlineAccountsCount()
      : 1;
    res.json({ success: true, count });
  });

  app.get('/api/character-context/:id', async (req, res) => {
    const clientIp = req.socket?.remoteAddress || (req as any).ip || '';
    const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp.endsWith('127.0.0.1');
    const secret = process.env.INTERNAL_SERVICE_KEY || 'cavebound_internal_core_secret_v1';
    const reqSecret = req.headers['x-internal-secret'];

    if (!isLoopback && reqSecret !== secret) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Acesso restrito ao barramento interno do servidor.' });
    }

    const charId = req.params.id;
    const ctx = ServerCharacterContextRegistry.getActivity(charId);
    if (ctx) {
      return res.json({
        isHunting: ctx.isHunting,
        huntId: ctx.huntId,
        activeSessionId: ctx.activeSessionId ?? null,
        lastActiveSessionId: ctx.lastActiveSessionId ?? null,
        isContextKnown: true,
      });
    }

    // Context not cached in memory (e.g. server rebooted or client reconnecting).
    // Authoritatively consult the persistent database for confirmed hunt session.
    try {
      const persistedHunt = await persistenceManager.getActiveHuntSession(charId);
      if (persistedHunt && persistedHunt.isHunting) {
        ServerCharacterContextRegistry.setActivity(charId, {
          isHunting: true,
          huntId: persistedHunt.huntId,
          activeSessionId: persistedHunt.sessionId,
          lastActiveSessionId: persistedHunt.sessionId,
        });
        return res.json({
          isHunting: true,
          huntId: persistedHunt.huntId,
          activeSessionId: persistedHunt.sessionId ?? null,
          lastActiveSessionId: persistedHunt.sessionId ?? null,
          isContextKnown: true,
        });
      }

      // Check if character exists in database
      const dbChar = await persistenceManager.loadCharacter(charId);
      if (dbChar) {
        ServerCharacterContextRegistry.setActivity(charId, {
          isHunting: false,
          huntId: undefined,
        });
        return res.json({
          isHunting: false,
          huntId: undefined,
          activeSessionId: null,
          lastActiveSessionId: null,
          isContextKnown: true,
        });
      }
    } catch (err: any) {
      console.warn(`[server.ts] Error resolving character context from DB for ${charId}:`, err?.message || err);
      return res.status(503).json({
        isHunting: false,
        isContextKnown: false,
        error: 'CONTEXT_PENDING',
        message: 'Contexto do personagem em sincronização com o banco de dados.',
      });
    }

    return res.status(404).json({
      isHunting: false,
      isContextKnown: false,
      error: 'CHARACTER_NOT_FOUND',
      message: 'Personagem não encontrado.',
    });
  });

  const server = http.createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server,
    }),
  });

  // Register Colyseus Rooms
  gameServer.define('thais-city', ThaisCityRoom as any);
  gameServer.define('thais_city', ThaisCityRoom as any);

  return {
    app,
    server,
    gameServer,
    listen: async (port: number = options.port || 2567) => {
      await gameServer.listen(port);
      const addr = server.address() as AddressInfo;
      return addr?.port || port;
    },
    close: async () => {
      try {
        await gameServer.gracefullyShutdown(false);
      } catch (err) {
        // Ignore shutdown errors during test cleanup
      }
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}
