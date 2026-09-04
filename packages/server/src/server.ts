import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import cors from 'cors';
import { Server } from '@colyseus/core';
import { monitor } from '@colyseus/monitor';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ThaisCityRoom } from './rooms/ThaisCityRoom.ts';

export interface CreateGameServerOptions {
  port?: number;
  expressApp?: express.Application;
}

export function createGameServer(options: CreateGameServerOptions = {}) {
  const app = options.expressApp || express();
  app.use(cors());
  app.use(express.json());

  app.use('/colyseus', monitor());

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
