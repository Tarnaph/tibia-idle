if (typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile();
  } catch {}
}

import { createGameServer } from './server.ts';
import { ThaisCityRoom } from './rooms/ThaisCityRoom.ts';
import { HuntDungeonRoom } from './rooms/HuntDungeonRoom.ts';

const port = Number(process.env.PORT) || 2567;
const instance = createGameServer();

void instance.listen(port).then((actualPort) => {
  console.log(`[Cavebound Colyseus Server] Running on http://localhost:${actualPort} (ws://localhost:${actualPort})`);
});

let isShuttingDown = false;
async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Cavebound Colyseus Server] Sinal ${signal} recebido. Iniciando encerramento gracioso e persistência...`);
  try {
    await ThaisCityRoom.flushActiveInstanceSaves();
    await HuntDungeonRoom.flushAllActiveRooms();
    await instance.close();
    console.log('[Cavebound Colyseus Server] Todos os jogadores persistidos com sucesso. Servidor encerrado.');
  } catch (err) {
    console.error('[Cavebound Colyseus Server] Erro ao persistir durante shutdown:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void handleShutdown('SIGTERM'));
process.on('SIGINT', () => void handleShutdown('SIGINT'));

