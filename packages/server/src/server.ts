import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import cors from 'cors';
import { Server } from '@colyseus/core';
import { monitor } from '@colyseus/monitor';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ThaisCityRoom } from './rooms/ThaisCityRoom.ts';
import { ServerCharacterContextRegistry } from '../../auth/src';

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
  const app = options.expressApp || express();
  app.use(cors());
  app.use(express.json());

  app.use('/colyseus', colyseusMonitorAuthMiddleware, monitor());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/character-context/:id', (req, res) => {
    const charId = req.params.id;
    const ctx = ServerCharacterContextRegistry.getActivity(charId);
    if (ctx) {
      return res.json({ isHunting: ctx.isHunting, huntId: ctx.huntId });
    }
    return res.json({ isHunting: false });
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
