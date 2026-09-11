import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/src';
import { experienceForLevel, levelForExperience } from '../../../domain/src';
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
      const existing = typeof this.db?.character?.findUnique === 'function'
        ? await this.db.character.findUnique({
            where: { id: player.characterId },
            select: { level: true, experience: true },
          })
        : null;

      const existingLevel = existing?.level ?? 1;
      const existingExp = Number(existing?.experience ?? 0);
      const playerExp = typeof player.experience === 'number' && player.experience >= 0 ? player.experience : 0;
      const playerLevel = player.level || 1;

      // Monotonic non-decreasing progress reconciliation
      let effectiveExp = Math.max(playerExp, existingExp);
      if (effectiveExp === 0) {
        effectiveExp = Math.max(experienceForLevel(playerLevel), experienceForLevel(existingLevel));
      }
      const effectiveLevel = Math.max(playerLevel, existingLevel);
      const finalExp = effectiveExp;

      const isHuntMode = Boolean(player.inHunt || (player as any).mode === 'hunt');

      await this.db.character.update({
        where: { id: player.characterId },
        data: {
          level: effectiveLevel,
          experience: BigInt(Math.floor(finalExp)),
          health: player.hp,
          maxHealth: player.maxHp,
          mana: player.mp,
          maxMana: player.maxMp,
          posX: isHuntMode ? 32369 : player.posX,
          posY: isHuntMode ? 32241 : player.posY,
          posZ: isHuntMode ? 7 : player.posZ,
          direction: player.direction,
          outfitLookType: player.outfitLookType,
          outfit: player.outfit,
          outfitHead: player.outfitHead,
          outfitBody: player.outfitBody,
          outfitLegs: player.outfitLegs,
          outfitFeet: player.outfitFeet,
          outfitAddons: player.outfitAddons,
          mount: player.mount,
          mountActive: player.mountActive,
          avatarId: typeof player.avatarId === 'number' ? player.avatarId : undefined,
          capacity: player.capacity,
          staminaMinutes: typeof player.staminaMinutes === 'number' ? Math.floor(player.staminaMinutes) : undefined,
          isAutoIdle: typeof player.isAutoIdle === 'boolean' ? player.isAutoIdle : undefined,
          lastHuntId: typeof player.lastHuntId === 'string' && player.lastHuntId ? player.lastHuntId : undefined,
          hotbarJson: (player as any).hotbarConfigs !== undefined
            ? JSON.stringify({
                hotbar: Array.isArray((player as any).hotbar) ? (player as any).hotbar : [],
                hotbarConfigs: (player as any).hotbarConfigs,
              })
            : Array.isArray((player as any).hotbar)
            ? JSON.stringify((player as any).hotbar)
            : undefined,
          bestiaryKillsJson: (player as any).bestiaryKills !== undefined
            ? (typeof (player as any).bestiaryKills === 'string' ? (player as any).bestiaryKills : JSON.stringify((player as any).bestiaryKills))
            : undefined,
          trackedBestiaryId: typeof (player as any).trackedBestiaryId === 'string' ? (player as any).trackedBestiaryId : undefined,
          bossPoints: typeof (player as any).bossPoints === 'number' ? (player as any).bossPoints : undefined,
          vocationName: typeof (player as any).vocationName === 'string' && (player as any).vocationName ? (player as any).vocationName : undefined,
          promotion: typeof (player as any).promotion === 'string' && (player as any).promotion ? (player as any).promotion : undefined,
          updatedAt: new Date(),
        } as any,
      });

      if (typeof (player as any).magicLevel === 'number') {
        await this.db.characterSkill.upsert({
          where: {
            characterId_skillId: {
              characterId: player.characterId,
              skillId: 7,
            },
          },
          update: { value: (player as any).magicLevel },
          create: {
            characterId: player.characterId,
            skillId: 7,
            skillName: 'Magic Level',
            value: (player as any).magicLevel,
            tries: BigInt(0),
          },
        });
      }

      const skillsData = (player as any).skills;
      if (Array.isArray(skillsData) && skillsData.length > 0) {
        for (const sk of skillsData) {
          if (typeof sk.skillId === 'number' && typeof sk.value === 'number') {
            await this.db.characterSkill.upsert({
              where: {
                characterId_skillId: {
                  characterId: player.characterId,
                  skillId: sk.skillId,
                },
              },
              update: {
                value: sk.value,
                tries: sk.tries !== undefined ? BigInt(sk.tries) : undefined,
              },
              create: {
                characterId: player.characterId,
                skillId: sk.skillId,
                skillName: sk.skillName || 'Skill',
                value: sk.value,
                tries: sk.tries !== undefined ? BigInt(sk.tries) : BigInt(0),
              },
            });
          }
        }
      }

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
        include: { skills: true },
      });
      if (!char) return null;
      let hotbar: number[] = [];
      let hotbarConfigs: any = undefined;
      if (char.hotbarJson) {
        try {
          const parsed = JSON.parse(char.hotbarJson);
          if (Array.isArray(parsed)) {
            hotbar = parsed;
          } else if (parsed && Array.isArray(parsed.hotbar)) {
            hotbar = parsed.hotbar;
            hotbarConfigs = parsed.hotbarConfigs;
          }
        } catch (e) { hotbar = []; }
      }
      let bestiaryKills: Record<string, number> = {};
      if ((char as any).bestiaryKillsJson) {
        try {
          const parsed = JSON.parse((char as any).bestiaryKillsJson);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            bestiaryKills = parsed;
          }
        } catch (e) { bestiaryKills = {}; }
      }
      return {
        ...char,
        hotbar,
        hotbarConfigs,
        bestiaryKills,
        trackedBestiaryId: (char as any).trackedBestiaryId || null,
        bossPoints: (char as any).bossPoints ?? 0,
      };
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
