import { Client, Room } from 'colyseus.js';
import { WorldState } from '../../../packages/server/src/schemas/WorldState';

let colyseusClientInstance: Client | null = null;

export function getColyseusClient(): Client {
  if (!colyseusClientInstance) {
    const serverUrl =
      process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:2567`
        : 'ws://127.0.0.1:2567');

    colyseusClientInstance = new Client(serverUrl);

    // Compatibility patch for Colyseus 0.18 server seat reservation response format
    const originalConsume = (colyseusClientInstance as any).consumeSeatReservation?.bind(colyseusClientInstance);
    if (originalConsume) {
      (colyseusClientInstance as any).consumeSeatReservation = function (response: any, rootSchema?: any, reuseRoomInstance?: any) {
        if (response && !response.room && response.name && response.roomId) {
          response.room = {
            name: response.name,
            roomId: response.roomId,
            processId: response.processId,
            publicAddress: response.publicAddress,
          };
        }
        return originalConsume(response, rootSchema, reuseRoomInstance);
      };
    }
  }
  return colyseusClientInstance;
}

export async function joinGameRoom(
  token: string,
  characterId: string,
  options?: Record<string, any>
): Promise<Room<WorldState>> {
  const client = getColyseusClient();
  const room = await client.joinOrCreate<WorldState>(
    'thais_city',
    {
      token,
      characterId,
      ...options,
    },
    WorldState
  );
  return room;
}

export async function reconnectGameRoom(reconnectionToken: string): Promise<Room<WorldState>> {
  const client = getColyseusClient();
  const room = await client.reconnect<WorldState>(reconnectionToken, WorldState);
  return room;
}
