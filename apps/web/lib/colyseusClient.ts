import { Client, Room } from 'colyseus.js';

let colyseusClientInstance: Client | null = null;

export function getColyseusClient(): Client {
  if (!colyseusClientInstance) {
    const serverUrl =
      process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:2567`
        : 'ws://127.0.0.1:2567');

    colyseusClientInstance = new Client(serverUrl);
  }
  return colyseusClientInstance;
}

export async function joinGameRoom(token: string, characterId: string): Promise<Room<any>> {
  const client = getColyseusClient();
  const room = await client.joinOrCreate('thais_city', {
    token,
    characterId,
  });
  return room;
}
