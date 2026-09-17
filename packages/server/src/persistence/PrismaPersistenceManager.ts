import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../database/src';
import { experienceForLevel, levelForExperience, calculateStatsForLevel } from '../../../domain/src';
import { CharacterSaveLockManager, XpRateLimiter, ServerCharacterContextRegistry } from '../../../auth/src';
import type { PlayerState } from '../schemas/PlayerState';

export class PrismaPersistenceManager {
  private db: PrismaClient;

  constructor(customPrisma?: PrismaClient) {
    this.db = customPrisma || defaultPrisma;
  }

  /**
   * Persists a single player's current runtime state to PostgreSQL via Prisma.
   * Uses CharacterSaveLockManager to serialize writes and prevents dirty/concurrent saves.
   */
  async saveCharacter(player: PlayerState): Promise<void> {
    if (!player.characterId || player.characterId.startsWith('char-guest')) {
      // Skip mock / guest IDs not in database
      return;
    }

    // Defensive Authority Guard: During an active hunt, the hunt session / client
    // is the sole authority for character progression, inventory, skills, and state.
    // Colyseus must NEVER write stale city stats or bump saveVersion during hunts.
    if (Boolean(player.inHunt) || ServerCharacterContextRegistry.isHunting(player.characterId)) {
      return;
    }

    return CharacterSaveLockManager.withLock(player.characterId, async () => {
      let consumedDelta = 0;
      try {
        const existing = typeof this.db?.character?.findUnique === 'function'
          ? await this.db.character.findUnique({
              where: { id: player.characterId },
              select: {
                id: true,
                level: true,
                experience: true,
                vocationName: true,
                bestiaryKillsJson: true,
                trackedBestiaryId: true,
                bossPoints: true,
                saveVersion: true,
                lastSavedAt: true,
              },
            })
          : null;

        const existingLevel = existing?.level ?? 1;
        const existingExp = Number(existing?.experience ?? 0);
        const playerExp = typeof player.experience === 'number' && player.experience >= 0 ? player.experience : 0;
        const playerLevel = player.level || 1;

        // Monotonic non-decreasing progress reconciliation
        let effectiveExp = Math.max(playerExp, existingExp);
        if (effectiveExp === 0) {
          if (existingLevel > 1) {
            effectiveExp = experienceForLevel(existingLevel);
          } else if (!existing && playerLevel > 1) {
            // Fallback only when character does not exist in DB (e.g. partial test mocks)
            effectiveExp = experienceForLevel(playerLevel);
          }
        }

        // Sanity check delta XP on persistence via continuous rate limiter
        // Deduplicação: se o XP já foi autorizado na sessão ativa (ex: WebSocket), não debitar novamente
        const authorizedExp = XpRateLimiter.getAuthorizedExp(player.characterId);
        const unvalidatedBaseline = Math.max(existingExp, authorizedExp);
        const unvalidatedDelta = effectiveExp - unvalidatedBaseline;

        if (unvalidatedDelta > 0 && existing) {
          const now = Date.now();
          const isHunting = Boolean(player.inHunt || (player as any).mode === 'hunt');
          const check = XpRateLimiter.consume(player.characterId, unvalidatedDelta, now, {
            isHunting,
          });
          if (!check.allowed) {
            console.warn(`[PrismaPersistenceManager] Suspicious XP delta for ${player.characterId}: +${unvalidatedDelta} XP exceeds continuous budget (capping to +${check.maxAllowed}).`);
            effectiveExp = unvalidatedBaseline + check.maxAllowed;
            consumedDelta = check.maxAllowed;
          } else {
            consumedDelta = unvalidatedDelta;
          }
        }

        // Authoritative level and stats derived strictly on the server from experience
        const derivedLevel = Math.max(1, levelForExperience(effectiveExp));
        const targetVoc = (player as any).vocationName || existing?.vocationName || 'Knight';
        const derivedStats = calculateStatsForLevel(targetVoc, derivedLevel);

        // Monotonic non-decreasing Bestiary Kills reconciliation
        let existingBestiary: Record<string, number> = {};
        if (existing?.bestiaryKillsJson) {
          try {
            existingBestiary = typeof existing.bestiaryKillsJson === 'string'
              ? JSON.parse(existing.bestiaryKillsJson)
              : existing.bestiaryKillsJson;
          } catch {}
        }
        let playerBestiary: Record<string, number> = {};
        const rawPlayerBestiary = (player as any).bestiaryKills;
        if (rawPlayerBestiary) {
          try {
            playerBestiary = typeof rawPlayerBestiary === 'string'
              ? JSON.parse(rawPlayerBestiary)
              : rawPlayerBestiary;
          } catch {}
        }
        const mergedBestiary: Record<string, number> = { ...existingBestiary };
        for (const [k, v] of Object.entries(playerBestiary)) {
          if (typeof v === 'number') {
            mergedBestiary[k] = Math.max(Number(existingBestiary[k] || 0), v);
          }
        }
        const finalBestiaryKillsJson = Object.keys(mergedBestiary).length > 0
          ? JSON.stringify(mergedBestiary)
          : existing?.bestiaryKillsJson ?? undefined;

        const isHuntMode = Boolean(player.inHunt || (player as any).mode === 'hunt');
        const currentVersion = typeof (player as any).saveVersion === 'number'
          ? (player as any).saveVersion
          : ((existing as any)?.saveVersion ?? 1);

        const characterUpdateData: any = {
          level: derivedLevel,
          experience: BigInt(Math.floor(effectiveExp)),
          health: Math.max(0, Math.min(player.hp, derivedStats.maxHp)),
          maxHealth: derivedStats.maxHp,
          mana: Math.max(0, Math.min(player.mp, derivedStats.maxMana)),
          maxMana: derivedStats.maxMana,
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
          gender: typeof (player as any).gender === 'string' && ((player as any).gender === 'male' || (player as any).gender === 'female') ? (player as any).gender : undefined,
          avatarId: typeof player.avatarId === 'number' ? player.avatarId : undefined,
          capacity: derivedStats.maxCap,
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
          bestiaryKillsJson: finalBestiaryKillsJson,
          trackedBestiaryId: typeof (player as any).trackedBestiaryId === 'string' && (player as any).trackedBestiaryId
            ? (player as any).trackedBestiaryId
            : existing?.trackedBestiaryId ?? undefined,
          bossPoints: Math.max(Number(existing?.bossPoints || 0), Number((player as any).bossPoints || 0)),
          vocationName: typeof (player as any).vocationName === 'string' && (player as any).vocationName ? (player as any).vocationName : undefined,
          promotion: typeof (player as any).promotion === 'string' && (player as any).promotion ? (player as any).promotion : undefined,
          saveVersion: currentVersion + 1,
          lastSavedAt: new Date(),
          updatedAt: new Date(),
        };

        const executePersistenceTx = async (tx: any) => {
          let updateResult: any;
          if (typeof tx.character?.updateMany === 'function') {
            updateResult = await tx.character.updateMany({
              where: {
                id: player.characterId,
                saveVersion: currentVersion,
              },
              data: characterUpdateData,
            });

            if (updateResult.count === 0) {
              console.warn(`[PrismaPersistenceManager] OCC Conflict for character ${player.characterId}. Version ${currentVersion} outdated. Aborting transaction.`);
              throw new Error(`[OCC_CONFLICT] Personagem ${player.characterId} versão ${currentVersion} desatualizada.`);
            }
          } else if (typeof tx.character?.update === 'function') {
            await tx.character.update({
              where: { id: player.characterId },
              data: characterUpdateData,
            });
          }

          if (typeof (player as any).magicLevel === 'number') {
            await tx.characterSkill.upsert({
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
                await tx.characterSkill.upsert({
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
                    skillName: sk.skillName || `Skill ${sk.skillId}`,
                    value: sk.value,
                    tries: sk.tries !== undefined ? BigInt(sk.tries) : BigInt(0),
                  },
                });
              }
            }
          }
        };

        if (typeof this.db.$transaction === 'function') {
          await this.db.$transaction(executePersistenceTx);
        } else {
          await executePersistenceTx(this.db);
        }

        XpRateLimiter.recordAuthorizedExp(player.characterId, Number(characterUpdateData.experience));
        (player as any).saveVersion = currentVersion + 1;
      } catch (err: any) {
        if (consumedDelta > 0) {
          XpRateLimiter.refund(player.characterId, consumedDelta);
        }
        console.warn(`[PrismaPersistenceManager] Failed to save character ${player.characterId}:`, err.message);
      }
    });
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
   * Persistently records or clears a character's confirmed active hunt session.
   * Survives Colyseus server reboots and process restarts.
   */
  async setPlayerHuntStatus(characterId: string, inHunt: boolean, huntId?: string, sessionId?: string): Promise<void> {
    if (!characterId || characterId.startsWith('char-guest')) return;
    try {
      if (typeof this.db?.character?.update === 'function') {
        await this.db.character.update({
          where: { id: characterId },
          data: {
            isHunting: inHunt,
            ...(huntId ? { lastHuntId: huntId } : {}),
          },
        });
      }
      if (inHunt) {
        if (typeof (this.db as any)?.activeHuntSession?.upsert === 'function') {
          await (this.db as any).activeHuntSession.upsert({
            where: { characterId },
            create: {
              characterId,
              sessionId: sessionId || 'session-unknown',
              huntId: huntId || 'hunt-generic',
              isHunting: true,
            },
            update: {
              sessionId: sessionId || undefined,
              huntId: huntId || undefined,
              isHunting: true,
            },
          });
        }
      } else {
        if (typeof (this.db as any)?.activeHuntSession?.deleteMany === 'function') {
          await (this.db as any).activeHuntSession.deleteMany({
            where: { characterId },
          });
        }
      }
    } catch (err: any) {
      console.warn(`[PrismaPersistenceManager] Failed to set hunt status for ${characterId}:`, err?.message || err);
    }
  }

  /**
   * Checks whether a character has an active confirmed hunt session in the database.
   */
  async getActiveHuntSession(characterId: string): Promise<{ characterId: string; sessionId: string; huntId: string; isHunting: boolean } | null> {
    if (!characterId || characterId.startsWith('char-guest')) return null;
    try {
      if (typeof (this.db as any)?.activeHuntSession?.findUnique === 'function') {
        const session = await (this.db as any).activeHuntSession.findUnique({
          where: { characterId },
        });
        if (session && session.isHunting) {
          return {
            characterId: session.characterId,
            sessionId: session.sessionId,
            huntId: session.huntId,
            isHunting: true,
          };
        }
      }
      // Fallback: check Character.isHunting
      const char = await this.db.character.findUnique({
        where: { id: characterId },
        select: { id: true, isHunting: true, lastHuntId: true },
      });
      if (char && (char as any).isHunting) {
        return {
          characterId: char.id,
          huntId: (char as any).lastHuntId || 'hunt-generic',
          isHunting: true,
          sessionId: 'session-persisted',
        };
      }
      return null;
    } catch (err: any) {
      return null;
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
        include: {
          skills: true,
          account: {
            select: { role: true },
          },
        },
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

  private instanceTimer: NodeJS.Timeout | null = null;

  /**
   * Starts an instance-level periodic save loop (mainly used in testing / standalone mode).
   * In production, ThaisCityRoom manages its own auto-save lifecycle via Colyseus room clock.
   */
  startPeriodicSave(playersProvider: () => Iterable<PlayerState>, intervalMs: number = 30000): void {
    this.stopPeriodicSave();
    this.instanceTimer = setInterval(() => {
      void this.saveBatch(playersProvider());
    }, intervalMs);
  }

  /**
   * Stops the instance-level periodic save timer.
   */
  stopPeriodicSave(): void {
    if (this.instanceTimer) {
      clearInterval(this.instanceTimer);
      this.instanceTimer = null;
    }
  }
}

export const persistenceManager = new PrismaPersistenceManager();
