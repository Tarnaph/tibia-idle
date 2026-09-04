import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/src';
import type { PlayerState } from '../schemas/PlayerState';

export class PrismaPersistenceManager {
  private db: PrismaClient;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor(customPrisma?: PrismaClient) {
    this.db = customPrisma || defaultPrisma;
  }

  /**
   * Persists a single player's current runtime state to PostgreSQL via Prisma.
   */
  async saveCharacter(player: PlayerState): Promise<void> {
    if (!player.characterId || player.characterId.startsWith('char-guest')) {
      // Skip mock / guest IDs not in database
      return;
    }

    try {
      await this.db.character.update({
        where: { id: player.characterId },
        data: {
          level: player.level,
          health: player.hp,
          mana: player.mp,
          posX: player.posX,
          posY: player.posY,
          posZ: player.posZ,
          capacity: player.capacity,
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      console.warn(`[PrismaPersistenceManager] Failed to save character ${player.characterId}:`, err.message);
    }
  }

  /**
   * Fetches character record from database by ID.
   */
  async loadCharacter(characterId: string) {
    if (!characterId || characterId.startsWith('char-guest')) return null;
    try {
      return await this.db.character.findUnique({
        where: { id: characterId },
      });
    } catch (err: any) {
      console.warn(`[PrismaPersistenceManager] Failed to load character ${characterId}:`, err.message);
      return null;
    }
  }

  /**
   * Persists a batch of online players to database in parallel.
   */
  async saveBatch(players: Iterable<PlayerState>): Promise<void> {
    const activePlayers = Array.from(players).filter(
      (p) => p.characterId && !p.characterId.startsWith('char-guest')
    );

    if (activePlayers.length === 0) return;

    await Promise.allSettled(activePlayers.map((player) => this.saveCharacter(player)));
  }

  /**
   * Starts a background periodic auto-save loop (defaults to 30,000 ms).
   */
  startPeriodicSave(playersProvider: () => Iterable<PlayerState>, intervalMs: number = 30000): void {
    this.stopPeriodicSave();
    this.intervalTimer = setInterval(() => {
      void this.saveBatch(playersProvider());
    }, intervalMs);
  }

  /**
   * Stops the periodic auto-save timer.
   */
  stopPeriodicSave(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

export const persistenceManager = new PrismaPersistenceManager();
