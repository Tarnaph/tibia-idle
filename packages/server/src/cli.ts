import { createGameServer } from './server.ts';

const port = Number(process.env.PORT) || 2567;
const instance = createGameServer();

void instance.listen(port).then((actualPort) => {
  console.log(`[Cavebound Colyseus Server] Running on http://localhost:${actualPort} (ws://localhost:${actualPort})`);
});
