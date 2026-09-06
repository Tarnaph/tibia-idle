import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/src';
import { levelForExperience } from '../../../domain/src';
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
      const expVal = typeof player.experience === 'number' && player.experience >= 0 ? player.experience : 0;
      const validLevel = Math.max(player.level || 1, levelForExperience(expVal));

      await this.db.character.update({
        where: { id: player.characterId },
        data: {
          level: validLevel,
          experience: typeof player.experience === 'number' && player.experience >= 0 ? BigInt(Math.floor(player.experience)) : undefined,
          health: player.hp,
          maxHealth: player.maxHp,
          mana: player.mp,
          maxMana: player.maxMp,
          posX: player.posX,
          posY: player.posY,
          posZ: player.posZ,
          direction: player.direction,
          outfitLookType: player.outfitLookType,
          outfitHead: player.outfitHead,
          outfitBody: player.outfitBody,
          outfitLegs: player.outfitLegs,
          outfitFeet: player.outfitFeet,
          capacity: player.capacity,
          staminaMinutes: typeof player.staminaMinutes === 'number' ? Math.floor(player.staminaMinutes) : undefined,
          isAutoIdle: typeof player.isAutoIdle === 'boolean' ? player.isAutoIdle : undefined,
          lastHuntId: typeof player.lastHuntId === 'string' && player.lastHuntId ? player.lastHuntId : undefined,
          hotbarJson: Array.isArray((player as any).hotbar) ? JSON.stringify((player as any).hotbar) : undefined,
          updatedAt: new Date(),
        },
      });

    } catch (err: any) {
      console.warn(`[PrismaPersistenceManager] Failed to save character ${player.characterId}:`, err.message);
    }
  }

  /**
   * Fetches the highest level of any character belonging to the given account ID.
   */
  async getAccountHighestLevel(accountId: string): Promise<number> {
    if (!accountId || accountId.startsWith('acc-guest')) return 1;
    try {
      const highestChar = await this.db.character.findFirst({
        where: { accountId },
        orderBy: { level: 'desc' },
        select: { level: true },
      });
      return highestChar?.level ?? 1;
    } catch (err: any) {
      return 1;
    }
  }

  /**
   * Fetches character record from database by ID.
   */
  async loadCharacter(characterId: string) {
    if (!characterId || characterId.startsWith('char-guest')) return null;
    try {
      const char = await this.db.character.findUnique({
        where: { id: characterId },
      });
      if (!char) return null;
      let hotbar: number[] = [];
      if (char.hotbarJson) {
        try { hotbar = JSON.parse(char.hotbarJson); } catch (e) { hotbar = []; }
      }
      return { ...char, hotbar };
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
