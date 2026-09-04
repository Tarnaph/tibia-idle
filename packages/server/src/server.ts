import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ThaisCityRoom } from './rooms/ThaisCityRoom';

export interface CreateGameServerOptions {
  port?: number;
  expressApp?: express.Application;
}

export function createGameServer(options: CreateGameServerOptions = {}) {
  const app = options.expressApp || express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  const server = http.createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({
      server,
    }),
  });

  // Register Colyseus Rooms
  gameServer.define('thais-city', ThaisCityRoom as any);

  return {
    app,
    server,
    gameServer,
    listen: (port: number = options.port || 2567) => {
      return new Promise<number>((resolve) => {
        server.listen(port, () => {
          const addr = server.address() as AddressInfo;
          resolve(addr?.port || port);
        });
      });
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
