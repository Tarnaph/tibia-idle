import type { PrismaClient } from '@prisma/client';
import { experienceForLevel, levelForExperience } from '../../domain/src/experience';
import { calculateStatsForLevel } from '../../domain/src/party';
import { CharacterSaveLockManager } from './characterSaveLock';
import { XpRateLimiter } from './xpRateLimiter';
import { SkillRateLimiter, calculateSkillTriesCost } from './skillRateLimiter';
import { ServerCharacterContextRegistry } from './characterContextRegistry';

export class VersionConflictError extends Error {
  public readonly code = 'VERSION_CONFLICT';
  public readonly currentVersion: number;
  public readonly character: any;

  constructor(message: string, currentVersion: number, character?: any) {
    super(message);
    this.name = 'VersionConflictError';
    this.currentVersion = currentVersion;
    this.character = character;
  }
}

export class SessionSupersededError extends Error {
  public readonly code = 'SESSION_SUPERSEDED';
  public readonly activeSessionId?: string;

  constructor(message: string, activeSessionId?: string) {
    super(message);
    this.name = 'SessionSupersededError';
    this.activeSessionId = activeSessionId;
  }
}

export class ContextServiceUnavailableError extends Error {
  public readonly code = 'CONTEXT_SERVICE_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'ContextServiceUnavailableError';
  }
}

export class ContextPendingError extends Error {
  public readonly code = 'CONTEXT_PENDING';

  constructor(message: string = 'Sessão do personagem em recuperação. Aguardando contexto autoritativo do servidor...') {
    super(message);
    this.name = 'ContextPendingError';
  }
}

export interface ItemCatalogMeta {
  id: number;
  slot: string;
  weaponType?: string;
}

let cachedCatalogMeta: Map<number, ItemCatalogMeta> | null = null;

export function getItemCatalog(): Map<number, ItemCatalogMeta> {
  if (!cachedCatalogMeta) {
    try {
      // Dynamic require so browser/edge environments don't bundle huge JSON unless needed
      const equip = require('../../../content/generated/equipment.json');
      cachedCatalogMeta = new Map<number, ItemCatalogMeta>();
      for (const it of (equip?.items || [])) {
        if (typeof it.id === 'number') {
          cachedCatalogMeta.set(it.id, {
            id: it.id,
            slot: it.slot || 'other',
            weaponType: it.weaponType,
          });
        }
      }
    } catch {
      cachedCatalogMeta = new Map<number, ItemCatalogMeta>();
    }
  }
  return cachedCatalogMeta;
}

export function getValidItemCatalogIds(): Set<number> {
  return new Set(getItemCatalog().keys());
}

export interface CreateCharacterInput {
  accountId: string;
  name: string;
  vocationId: number; // 0: None, 1: Sorcerer, 2: Druid, 3: Paladin, 4: Knight
  gender?: 'male' | 'female';
}

export function getStarterLookType(vocationId: number, gender: 'male' | 'female' = 'male'): number {
  const isFemale = gender === 'female';
  switch (vocationId) {
    case 1: // Sorcerer
    case 2: // Druid
      return isFemale ? 138 : 130;
    case 3: // Paladin
      return isFemale ? 137 : 129;
    case 4: // Knight
      return isFemale ? 139 : 131;
    case 0: // None
    default:
      return isFemale ? 136 : 128;
  }
}

export interface VocationStarterConfig {
  vocationId: number;
  name: string;
  baseHp: number;
  baseMp: number;
  capacity: number;
  outfitLookType: number;
  spells: string[];
  skills: Array<{ skillId: number; skillName: string; value: number }>;
  equipment: Array<{ slot: string; serverId: number; name: string; count: number }>;
}

export const VOCATION_CONFIGS: Record<number, VocationStarterConfig> = {
  0: {
    vocationId: 0,
    name: 'None',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 128,
    spells: ['exura'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 10 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 0 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2382, name: 'Dagger', count: 1 },
      { slot: 'leftHand', serverId: 2512, name: 'Wooden Shield', count: 1 },
      { slot: 'armor', serverId: 2651, name: 'Jacket', count: 1 },
      { slot: 'legs', serverId: 2649, name: 'Leather Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  1: {
    vocationId: 1,
    name: 'Sorcerer',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 130,
    spells: ['exura', 'exevo-vis-hur'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 10 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 5 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2190, name: 'Wand of Vortex', count: 1 },
      { slot: 'leftHand', serverId: 2175, name: 'Spellbook', count: 1 },
      { slot: 'head', serverId: 8820, name: "Mage's Cap", count: 1 },
      { slot: 'armor', serverId: 8819, name: "Magician's Robe", count: 1 },
      { slot: 'legs', serverId: 2468, name: 'Studded Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  2: {
    vocationId: 2,
    name: 'Druid',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 130,
    spells: ['exura', 'exura-gran', 'exevo-tera-hur'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 10 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 5 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2182, name: 'Snakebite Rod', count: 1 },
      { slot: 'leftHand', serverId: 2175, name: 'Spellbook', count: 1 },
      { slot: 'head', serverId: 8820, name: "Mage's Cap", count: 1 },
      { slot: 'armor', serverId: 8819, name: "Magician's Robe", count: 1 },
      { slot: 'legs', serverId: 2468, name: 'Studded Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  3: {
    vocationId: 3,
    name: 'Paladin',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 129,
    spells: ['exura', 'exori-san'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 15 },
      { skillId: 5, skillName: 'Shielding', value: 12 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 1 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2456, name: 'Bow', count: 1 },
      { slot: 'leftHand', serverId: 2544, name: 'Arrow', count: 100 },
      { slot: 'head', serverId: 2461, name: 'Leather Helmet', count: 1 },
      { slot: 'armor', serverId: 2467, name: 'Leather Armor', count: 1 },
      { slot: 'legs', serverId: 2649, name: 'Leather Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  4: {
    vocationId: 4,
    name: 'Knight',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 131,
    spells: ['exura-ico', 'exori', 'exori-ico'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 15 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 15 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 1 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 8602, name: 'Jagged Sword', count: 1 },
      { slot: 'leftHand', serverId: 2509, name: 'Steel Shield', count: 1 },
      { slot: 'head', serverId: 2481, name: 'Soldier Helmet', count: 1 },
      { slot: 'armor', serverId: 2465, name: 'Brass Armor', count: 1 },
      { slot: 'legs', serverId: 2478, name: 'Brass Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
};

export const THAIS_TEMPLE_SPAWN = {
  posX: 32369,
  posY: 32241,
  posZ: 7,
  townId: 1,
};

export function validateCharacterName(name: string): boolean {
  if (!name || name.trim().length < 3 || name.trim().length > 20) {
    return false;
  }
  // Letters and single spaces between words only
  return /^[a-zA-Z]+( [a-zA-Z]+)*$/.test(name.trim());
}

export class CharacterService {
  constructor(private prisma: PrismaClient) {}

  async createCharacter(input: CreateCharacterInput) {
    const trimmedName = input.name.trim();
    if (!validateCharacterName(trimmedName)) {
      throw new Error('O nome do personagem deve ter entre 3 e 20 caracteres e conter apenas letras.');
    }

    const config = VOCATION_CONFIGS[input.vocationId];
    if (!config) {
      throw new Error('Vocação selecionada inválida.');
    }

    // Check account existence and character limit
    const account = await this.prisma.account.findUnique({
      where: { id: input.accountId },
      include: { characters: true },
    });

    if (!account) {
      throw new Error('Conta não encontrada.');
    }

    if (account.characters.length >= 6) {
      throw new Error('Limite máximo de 6 personagens por conta atingido.');
    }

    const existingChar = await this.prisma.character.findFirst({
      where: { name: { equals: trimmedName } },
    });

    let isDuplicate = !!existingChar;
    if (!isDuplicate && typeof this.prisma.character.findMany === 'function') {
      const allChars = await this.prisma.character.findMany({ select: { name: true } });
      isDuplicate = allChars.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
    }

    if (isDuplicate) {
      throw new Error(`O nome "${trimmedName}" já está em uso por outro aventureiro. Escolha outro nome.`);
    }

    const gender = input.gender === 'female' ? 'female' : 'male';
    const outfitLookType = getStarterLookType(config.vocationId, gender);

    try {
      // Create character with relational starter kit
      return await this.prisma.character.create({
        data: {
          accountId: input.accountId,
          name: trimmedName,
          gender,
          vocationId: config.vocationId,
          vocationName: config.name,
          level: 1,
          experience: BigInt(0),
          health: config.baseHp,
          maxHealth: config.baseHp,
          mana: config.baseMp,
          maxMana: config.baseMp,
          capacity: config.capacity,
          outfitLookType,
          outfit: config.vocationId === 0 ? 'Citizen' : config.name,
          posX: THAIS_TEMPLE_SPAWN.posX,
          posY: THAIS_TEMPLE_SPAWN.posY,
          posZ: THAIS_TEMPLE_SPAWN.posZ,
          townId: THAIS_TEMPLE_SPAWN.townId,
          skills: {
            create: config.skills.map((s) => ({
              skillId: s.skillId,
              skillName: s.skillName,
              value: s.value,
              tries: BigInt(0),
            })),
          },
          inventory: {
            create: config.equipment.map((eq) => ({
              slot: eq.slot,
              serverId: eq.serverId,
              name: eq.name,
              count: eq.count,
              tier: 0,
            })),
          },
          spells: {
            create: config.spells.map((spellId) => ({
              spellId,
            })),
          },
        },
        include: {
          skills: true,
          inventory: true,
          spells: true,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'))) {
        throw new Error(`O nome "${trimmedName}" já está em uso por outro aventureiro. Escolha outro nome.`);
      }
      throw err;
    }
  }

  async getCharactersByAccountId(accountId: string) {
    return this.prisma.character.findMany({
      where: { accountId },
      orderBy: { level: 'desc' },
      include: {
        skills: true,
        inventory: true,
        spells: true,
      },
    });
  }

  async getCharacterById(characterId: string) {
    return this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        account: { select: { id: true, email: true, role: true, isPremium: true } },
        skills: true,
        inventory: true,
        depot: true,
        spells: true,
      },
    });
  }

  async deleteCharacter(accountId: string, characterId: string) {
    const char = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!char || char.accountId !== accountId) {
      throw new Error('Personagem não encontrado ou você não tem permissão para deletá-lo.');
    }

    return this.prisma.character.delete({
      where: { id: characterId },
    });
  }

  async saveCharacterProgress(
    characterId: string,
    data: {
      level?: number;
      experience?: bigint;
      health?: number;
      maxHealth?: number;
      mana?: number;
      maxMana?: number;
      capacity?: number;
      posX?: number;
      posY?: number;
      posZ?: number;
      outfitLookType?: number;
      outfit?: string;
      outfitHead?: number;
      outfitBody?: number;
      outfitLegs?: number;
      outfitFeet?: number;
      outfitAddons?: number;
      mount?: string;
      mountActive?: boolean;
      skills?: Array<{ skillId: number; skillName: string; value: number; tries?: bigint }> | Record<string, any>;
      inventory?: Array<{ slot: string; serverId: number; name: string; count: number; tier?: number; attributesJson?: string | null; attributes?: any }>;
      replaceFullInventory?: boolean;
      hotbar?: any;
      hotbarConfigs?: any;
      bestiaryKills?: any;
      trackedBestiaryId?: string | null;
      bossPoints?: number;
      vocationName?: string;
      promotion?: string;
      blessings?: number[] | string;
      blessingsJson?: string | null;
      avatarId?: number;
      direction?: string;
      saveVersion?: number;
      isDeathPenalty?: boolean;
      sessionId?: string;
      isHunting?: boolean;
    },
    options?: { isInternal?: boolean; isHunting?: boolean }
  ) {
    return CharacterSaveLockManager.withLock(characterId, async () => {
      // Strictly require integer saveVersion >= 1 in public API
      if (!options?.isInternal && (typeof data.saveVersion !== 'number' || !Number.isInteger(data.saveVersion) || data.saveVersion < 1)) {
        throw new Error('saveVersion é obrigatório e deve ser um número inteiro >= 1.');
      }

      const existing = await this.prisma.character.findUnique({
        where: { id: characterId },
        include: {
          skills: true,
          inventory: true,
          spells: true,
        },
      });

      if (!existing) {
        throw new Error(`Personagem ${characterId} não encontrado.`);
      }

      // Authoritative Session Ownership Check:
      // Verify that the calling session still holds the exclusive write lease.
      // A superseded session cannot save, preventing overwrite of purchases, consumable usage, or death penalties.
      const isProgressionSave =
        data.experience !== undefined ||
        data.level !== undefined ||
        data.inventory !== undefined ||
        data.skills !== undefined ||
        (data as any).gold !== undefined;

      if (!options?.isInternal && (isProgressionSave || data.sessionId)) {
        const context = await ServerCharacterContextRegistry.getContextAsync(characterId);
        const activeSession = context.activeSessionId;
        const lastSession = context.lastActiveSessionId;

        // Quando o serviço de contexto estiver indisponível:
        // Informação desatualizada de cache NÃO pode autorizar a gravação!
        if (!context.isServiceAvailable) {
          if (lastSession && data.sessionId !== lastSession) {
            throw new SessionSupersededError(
              `Sessão ${data.sessionId || 'UNKNOWN'} é anterior à última sessão confirmada (${lastSession}) para o personagem ${characterId}. Gravação rejeitada.`,
              lastSession
            );
          }
          throw new ContextServiceUnavailableError(
            `Serviço de contexto de jogo indisponível para validar titularidade da sessão para o personagem ${characterId}. Informação desatualizada de cache não pode autorizar a gravação.`
          );
        }

        if (activeSession) {
          if (!data.sessionId || data.sessionId !== activeSession) {
            throw new SessionSupersededError(
              `Sessão ${data.sessionId || 'UNKNOWN'} foi sobreposta pela sessão ativa ${activeSession} para o personagem ${characterId}. Gravação rejeitada para preservar compras, perdas e progresso legítimo.`,
              activeSession
            );
          }
        } else if (data.sessionId) {
          // No active socket session currently registered on server (player offline, between sessions, or post-restart).
          // As the authenticated character owner is actively saving progress, adopt the incoming session as the new confirmed
          // session lease in the context registry so legitimate progression and hunt exits are never rejected.
          ServerCharacterContextRegistry.setActivity(characterId, {
            isHunting: Boolean(data.isHunting ?? context.isHunting),
            huntId: data.isHunting ? (data as any).huntId || context.huntId : undefined,
            activeSessionId: data.sessionId,
            lastActiveSessionId: data.sessionId,
          });
        }
      }

      // Optimistic Concurrency Control (OCC): Verify saveVersion
      const currentVersion = (existing as any)?.saveVersion ?? 1;
      if (typeof data.saveVersion === 'number' && data.saveVersion !== currentVersion) {
        throw new VersionConflictError(
          `Conflito de versão ao salvar personagem ${characterId}. Versão recebida: ${data.saveVersion}, versão atual: ${currentVersion}.`,
          currentVersion,
          existing
        );
      }

      const updateData: any = {};
      if (data.avatarId !== undefined) updateData.avatarId = data.avatarId;
      if (data.outfit !== undefined) updateData.outfit = data.outfit;
      if (data.outfitHead !== undefined) updateData.outfitHead = data.outfitHead;
      if (data.outfitBody !== undefined) updateData.outfitBody = data.outfitBody;
      if (data.outfitLegs !== undefined) updateData.outfitLegs = data.outfitLegs;
      if (data.outfitFeet !== undefined) updateData.outfitFeet = data.outfitFeet;
      if (data.outfitAddons !== undefined) updateData.outfitAddons = data.outfitAddons;
      if (data.mount !== undefined) updateData.mount = data.mount;
      if (data.mountActive !== undefined) updateData.mountActive = data.mountActive;

      if (data.bestiaryKills !== undefined) {
        let existingBestiary: Record<string, number> = {};
        if (existing?.bestiaryKillsJson) {
          try {
            existingBestiary = typeof existing.bestiaryKillsJson === 'string'
              ? JSON.parse(existing.bestiaryKillsJson)
              : existing.bestiaryKillsJson;
          } catch {}
        }
        let incomingBestiary: Record<string, number> = {};
        try {
          incomingBestiary = typeof data.bestiaryKills === 'string'
            ? JSON.parse(data.bestiaryKills)
            : (data.bestiaryKills || {});
        } catch {}
        const mergedBestiary: Record<string, number> = { ...existingBestiary };
        for (const [k, v] of Object.entries(incomingBestiary)) {
          if (typeof v === 'number') {
            mergedBestiary[k] = Math.max(Number(existingBestiary[k] || 0), v);
          }
        }
        updateData.bestiaryKillsJson = JSON.stringify(mergedBestiary);
      }
      if (data.trackedBestiaryId !== undefined) {
        updateData.trackedBestiaryId = data.trackedBestiaryId;
      }
      if (data.bossPoints !== undefined) {
        updateData.bossPoints = Math.max(Number(existing?.bossPoints || 0), Number(data.bossPoints || 0));
      }
      if (data.isHunting !== undefined) {
        updateData.isHunting = Boolean(data.isHunting);
      }
      if ((data as any).lastHuntId) {
        updateData.lastHuntId = (data as any).lastHuntId;
      }

      // Authoritative Level and Experience reconciliation
      const existingLevel = existing?.level ?? 1;
      const existingExp = Number(existing?.experience ?? 0);
      const incomingExp = data.experience !== undefined ? Number(data.experience) : existingExp;

      const isDeath = (data as any).isDeathPenalty === true;
      let targetExp = incomingExp;
      let consumedDelta = 0;
      let consumedSkillTries = 0;

      if (!isDeath) {
        targetExp = Math.max(incomingExp, existingExp);
        if (targetExp === 0 && existingLevel > 1) {
          targetExp = experienceForLevel(existingLevel);
        }

        // Sanity Check: Continuous XP budget (Token Bucket) without static minimum floor
        // Deduplicação e contexto autoritativo de caçada registrado no servidor
        const authorizedExp = XpRateLimiter.getAuthorizedExp(characterId);
        const unvalidatedBaseline = Math.max(existingExp, authorizedExp);
        const deltaExp = targetExp - unvalidatedBaseline;

        if (deltaExp > 0 && !options?.isInternal && !(data as any).isManualAdminGrant) {
          const contextResult = await ServerCharacterContextRegistry.getContextAsync(characterId);
          if (!contextResult.isServiceAvailable || contextResult.isContextKnown === false) {
            throw new ContextPendingError(
              `Contexto do personagem ${characterId} em sincronização ou serviço reiniciando. Salvamento postergado até restabelecimento da sessão.`
            );
          }

          const hasHuntEvidence = Boolean(
            (existing as any)?.lastHuntId ||
            (data as any)?.lastHuntId ||
            (existing as any)?.isHunting ||
            contextResult.isHunting
          );

          const isHunting = options?.isInternal
            ? Boolean(options?.isHunting)
            : Boolean(
                contextResult.isHunting ||
                (existing as any)?.isHunting ||
                (data.isHunting && hasHuntEvidence)
              );

          const lastSavedAtMs = existing.lastSavedAt instanceof Date
            ? existing.lastSavedAt.getTime()
            : typeof existing.lastSavedAt === 'number' || typeof existing.lastSavedAt === 'bigint'
            ? Number(existing.lastSavedAt)
            : 0;

          const check = XpRateLimiter.consume(characterId, deltaExp, Date.now(), {
            isHunting,
            baselineTime: lastSavedAtMs > 0 ? lastSavedAtMs : undefined,
          });
          if (!check.allowed) {
            throw new Error(`Suspicious XP gain: +${deltaExp} XP exceeds continuous time budget (max allowed: +${check.maxAllowed}).`);
          }
          consumedDelta = deltaExp;
        }
      }

      // Authoritatively derive level from calculated XP
      const derivedLevel = levelForExperience(targetExp);
      const targetLevel = isDeath ? Math.max(1, derivedLevel) : Math.max(existingLevel, derivedLevel);

      updateData.level = targetLevel;
      updateData.experience = BigInt(Math.floor(targetExp));

      // Authoritatively recalculate derived attributes
      const targetVoc = data.vocationName || existing?.vocationName || 'Knight';
      const derivedStats = calculateStatsForLevel(targetVoc, targetLevel);

      updateData.maxHealth = derivedStats.maxHp;
      updateData.maxMana = derivedStats.maxMana;
      updateData.capacity = derivedStats.maxCap;

      if (data.health !== undefined) {
        updateData.health = Math.max(0, Math.min(data.health, derivedStats.maxHp));
      }
      if (data.mana !== undefined) {
        updateData.mana = Math.max(0, Math.min(data.mana, derivedStats.maxMana));
      }

      if (data.posX !== undefined) updateData.posX = data.posX;
      if (data.posY !== undefined) updateData.posY = data.posY;
      if (data.posZ !== undefined) updateData.posZ = data.posZ;
      if (data.outfitLookType !== undefined) updateData.outfitLookType = data.outfitLookType;
      if (data.direction !== undefined) updateData.direction = data.direction;
      if (data.hotbar !== undefined || data.hotbarConfigs !== undefined) {
        if (data.hotbarConfigs !== undefined) {
          updateData.hotbarJson = JSON.stringify({
            hotbar: Array.isArray(data.hotbar) ? data.hotbar : [],
            hotbarConfigs: data.hotbarConfigs,
          });
        } else {
          updateData.hotbarJson = typeof data.hotbar === 'string' ? data.hotbar : JSON.stringify(data.hotbar);
        }
      }
      if (data.blessings !== undefined) {
        updateData.blessingsJson = typeof data.blessings === 'string' ? data.blessings : JSON.stringify(data.blessings);
      } else if (data.blessingsJson !== undefined) {
        updateData.blessingsJson = data.blessingsJson;
      }
      if (data.vocationName !== undefined) {
        if (existing?.vocationName && existing.vocationName.toLowerCase() !== 'none' && existing.vocationName.toLowerCase() !== 'no vocation') {
          const normExisting = existing.vocationName.toLowerCase().replace('elite ', '').replace('master ', '').replace('elder ', '').replace('royal ', '');
          const normIncoming = data.vocationName.toLowerCase().replace('elite ', '').replace('master ', '').replace('elder ', '').replace('royal ', '');
          if (normExisting !== normIncoming && !options?.isInternal && !(data as any).isManualAdminGrant) {
            throw new Error(`Transição de vocação não permitida: não é possível alterar de ${existing.vocationName} para ${data.vocationName}.`);
          }
        }
        updateData.vocationName = data.vocationName;
        const VOC_ID_MAP: Record<string, number> = { sorcerer: 1, 'master sorcerer': 1, druid: 2, 'elder druid': 2, paladin: 3, 'royal paladin': 3, knight: 4, 'elite knight': 4 };
        const vocId = VOC_ID_MAP[data.vocationName.toLowerCase()];
        if (vocId) updateData.vocationId = vocId;
      }
      if (data.promotion !== undefined) {
        const isAlreadyPromoted = Boolean(
          existing.promotion ||
          (existing.vocationName && (
            existing.vocationName.toLowerCase().startsWith('master ') ||
            existing.vocationName.toLowerCase().startsWith('elder ') ||
            existing.vocationName.toLowerCase().startsWith('royal ') ||
            existing.vocationName.toLowerCase().startsWith('elite ')
          ))
        );
        if (data.promotion && !isAlreadyPromoted && targetLevel < 20 && !options?.isInternal && !(data as any).isManualAdminGrant) {
          throw new Error('Promoção de vocação exige nível 20 ou superior.');
        }
        updateData.promotion = data.promotion;
      }

      // Monotonic Versioning and Server Timestamp
      (updateData as any).saveVersion = currentVersion + 1;
      (updateData as any).lastSavedAt = new Date();

      // Update skills if provided
      let skillList: Array<{ skillId: number; skillName: string; value: number; tries?: bigint }> = [];
      if (Array.isArray(data.skills)) {
        skillList = data.skills;
      } else if (data.skills && typeof data.skills === 'object') {
        const SKILL_MAP: Record<string, { skillId: number; skillName: string }> = {
          fist: { skillId: 0, skillName: 'Fist Fighting' },
          club: { skillId: 1, skillName: 'Club Fighting' },
          sword: { skillId: 2, skillName: 'Sword Fighting' },
          axe: { skillId: 3, skillName: 'Axe Fighting' },
          distance: { skillId: 4, skillName: 'Distance Fighting' },
          shielding: { skillId: 5, skillName: 'Shielding' },
          fishing: { skillId: 6, skillName: 'Fishing' },
          magiclevel: { skillId: 7, skillName: 'Magic Level' },
          magic: { skillId: 7, skillName: 'Magic Level' },
        };
        for (const [key, rawVal] of Object.entries(data.skills)) {
          const meta = SKILL_MAP[key.toLowerCase()];
          if (meta) {
            const val = typeof rawVal === 'number' ? rawVal : typeof (rawVal as any)?.value === 'number' ? (rawVal as any).value : 10;
            const tries = typeof (rawVal as any)?.tries === 'number' || typeof (rawVal as any)?.tries === 'bigint' ? BigInt((rawVal as any).tries) : undefined;
            skillList.push({ skillId: meta.skillId, skillName: meta.skillName, value: val, tries });
          }
        }
      }

      // Sanity Check: Continuous Skill & Training Tries budget (Token Bucket)
      if (existing?.skills && Array.isArray(existing.skills) && !options?.isInternal && !(data as any).isManualAdminGrant) {
        let isHunting = false;
        if (options?.isInternal) {
          isHunting = Boolean(options?.isHunting);
        } else {
          const contextResult = await ServerCharacterContextRegistry.getContextAsync(characterId);
          if (!contextResult.isServiceAvailable || contextResult.isContextKnown === false) {
            throw new ContextPendingError(
              `Contexto do personagem ${characterId} em sincronização ou serviço reiniciando. Salvamento postergado até restabelecimento da sessão.`
            );
          }
          const hasHuntEvidence = Boolean(
            (existing as any)?.lastHuntId ||
            (data as any)?.lastHuntId ||
            (existing as any)?.isHunting ||
            contextResult.isHunting
          );
          isHunting = Boolean(
            contextResult.isHunting ||
            (existing as any)?.isHunting ||
            (data.isHunting && hasHuntEvidence)
          );
        }

        const targetVoc = data.vocationName || existing?.vocationName || 'Knight';
        let totalTriesDelta = 0;

        for (const incomingSkill of skillList) {
          const prev = existing.skills.find((s: any) => s.skillId === incomingSkill.skillId);
          if (prev) {
            const prevVal = Number(prev.value ?? 10);
            const prevTries = Number(prev.tries ?? 0);
            const incomingVal = Number(incomingSkill.value ?? 10);
            const incomingTries = Number(incomingSkill.tries ?? 0);

            const cost = calculateSkillTriesCost(
              targetVoc,
              incomingSkill.skillName || incomingSkill.skillId,
              prevVal,
              prevTries,
              incomingVal,
              incomingTries
            );
            totalTriesDelta += cost;
          }
        }

        if (totalTriesDelta > 0) {
          const lastSavedAtMs = existing.lastSavedAt instanceof Date
            ? existing.lastSavedAt.getTime()
            : typeof existing.lastSavedAt === 'number' || typeof existing.lastSavedAt === 'bigint'
            ? Number(existing.lastSavedAt)
            : 0;

          const check = SkillRateLimiter.consume(characterId, totalTriesDelta, Date.now(), {
            isHunting,
            baselineTime: lastSavedAtMs > 0 ? lastSavedAtMs : undefined,
          });
          if (!check.allowed) {
            throw new Error(
              `Salto anômalo de habilidade não permitido: ganho de ${totalTriesDelta} tentativas de treino excede o orçamento contínuo no tempo (máximo permitido: ${check.maxAllowed} tentativas).`
            );
          }
          consumedSkillTries = totalTriesDelta;
        }
      }
      if (Array.isArray(data.inventory)) {
        const catalog = getItemCatalog();
        const VALID_SLOTS = new Set(['head', 'armor', 'legs', 'boots', 'feet', 'lefthand', 'righthand', 'left', 'right', 'backpack', 'necklace', 'ring', 'ammo', 'gold']);
        const NON_WEAPON_BODY_SLOTS = new Set(['head', 'armor', 'legs', 'boots', 'feet', 'necklace', 'ring']);

        for (const eq of data.inventory) {
          if (typeof eq.serverId !== 'number' || eq.serverId <= 0 || (catalog.size > 0 && !catalog.has(eq.serverId))) {
            throw new Error(`Item inválido no inventário: serverId ${eq.serverId} não existe no catálogo.`);
          }
          const normalizedSlot = typeof eq.slot === 'string' ? eq.slot.toLowerCase() : '';
          const isContainerSlot = normalizedSlot.startsWith('backpack') || normalizedSlot.startsWith('bag') || normalizedSlot.startsWith('loot');
          const isGoldSlot = normalizedSlot === 'gold' || eq.serverId === 2148 || eq.serverId === 2152 || eq.serverId === 2160;

          if (!VALID_SLOTS.has(normalizedSlot) && !isContainerSlot && !isGoldSlot) {
            throw new Error(`Slot de equipamento inválido: ${eq.slot}.`);
          }

          const count = Number(eq.count ?? 1);
          const maxCount = isGoldSlot ? 1_000_000_000 : 100;
          if (!options?.isInternal && (count > maxCount || count < 1)) {
            throw new Error(`Quantidade ${count} do item ${eq.name || eq.serverId} fora dos limites permitidos (1-${maxCount}).`);
          }

          const meta = catalog.get(eq.serverId);
          const isAmmo = meta?.weaponType === 'ammo' || meta?.slot === 'ammo';

          // Slots de armadura pura nunca empilham
          if (NON_WEAPON_BODY_SLOTS.has(normalizedSlot) && count > 1) {
            throw new Error(`Item de equipamento no slot ${eq.slot} não pode ter quantidade maior que 1 (recebido: ${count}).`);
          }

          // Nas mãos, itens que não sejam munição/ammo nunca podem ter quantidade > 1
          if (['lefthand', 'righthand', 'left', 'right'].includes(normalizedSlot) && !isAmmo && count > 1) {
            throw new Error(`Equipamento na mão ${eq.slot} não pode ter quantidade maior que 1 (recebido: ${count}).`);
          }
        }
      }

      const executeMutations = async (tx: any) => {
        // Enforce OCC conditional write on character. If another process saved first, count === 0 and transaction aborts
        let updateResult: any;
        if (typeof tx.character.updateMany === 'function') {
          updateResult = await tx.character.updateMany({
            where: {
              id: characterId,
              saveVersion: currentVersion,
            },
            data: updateData,
          });

          if (updateResult && typeof updateResult.count === 'number' && updateResult.count === 0) {
            throw new VersionConflictError(
              `Conflito de concorrência: o personagem ${characterId} foi modificado por outro processo.`,
              currentVersion,
              null
            );
          }
        } else if (typeof tx.character.update === 'function') {
          updateResult = await tx.character.update({
            where: { id: characterId },
            data: updateData,
          });
        }

        // Update skills if provided
        for (const sk of skillList) {
          const safeTries = typeof sk.tries === 'number' || typeof sk.tries === 'bigint' ? BigInt(sk.tries) : undefined;
          if (typeof sk.value === 'number') {
            await tx.characterSkill.upsert({
              where: {
                characterId_skillId: {
                  characterId,
                  skillId: sk.skillId,
                },
              },
              update: {
                value: sk.value,
                tries: safeTries !== undefined ? safeTries : undefined,
              },
              create: {
                characterId,
                skillId: sk.skillId,
                skillName: sk.skillName,
                value: sk.value,
                tries: safeTries !== undefined ? safeTries : BigInt(0),
              },
            });
          }
        }

        // Update inventory items if provided with validated catalog items
        if (Array.isArray(data.inventory)) {
          if (data.replaceFullInventory !== false) {
            // Full replacement (used for session leader / titular): replaces all items
            await tx.inventoryItem.deleteMany({
              where: { characterId },
            });
          } else {
            // Selective / differential update (used for companions / alts):
            // Only replaces the specific slots supplied in data.inventory (e.g. equipment slots),
            // preserving all other items (personal backpacks, saved items, consumables, previous gold)
            const incomingSlots = data.inventory
              .map((eq) => (typeof eq.slot === 'string' ? eq.slot.toLowerCase() : ''))
              .filter(Boolean);
            if (incomingSlots.length > 0) {
              await tx.inventoryItem.deleteMany({
                where: {
                  characterId,
                  slot: { in: incomingSlots },
                },
              });
            }
          }

          const catalog = getItemCatalog();
          const sanitizedItems = data.inventory.map((eq) => {
            const slot = typeof eq.slot === 'string' ? eq.slot.toLowerCase() : 'backpack';
            const meta = catalog.get(eq.serverId);
            const isAmmo = meta?.weaponType === 'ammo' || meta?.slot === 'ammo';
            const isCurrency = slot === 'gold' || eq.serverId === 2148 || eq.serverId === 2152 || eq.serverId === 2160;
            const isNonAmmoEquip = ['head', 'armor', 'legs', 'boots', 'feet', 'necklace', 'ring', 'left', 'right', 'lefthand', 'righthand'].includes(slot) && !isAmmo;
            const maxCount = isNonAmmoEquip ? 1 : isCurrency || options?.isInternal ? 1_000_000_000 : 100;
            return {
              characterId,
              slot: eq.slot || 'backpack',
              serverId: eq.serverId,
              name: eq.name || 'Item',
              count: Math.max(1, Math.min(maxCount, Number(eq.count || 1))),
              tier: typeof (eq as any).tier === 'number' ? (eq as any).tier : 0,
              attributesJson: typeof (eq as any).attributesJson === 'string'
                ? (eq as any).attributesJson
                : (eq as any).attributes
                  ? JSON.stringify((eq as any).attributes)
                  : null,
            };
          });

          if (sanitizedItems.length > 0) {
            await tx.inventoryItem.createMany({
              data: sanitizedItems,
            });
          }
        }

        return tx.character.findUnique({
          where: { id: characterId },
          include: {
            skills: true,
            inventory: true,
            spells: true,
          },
        });
      };

      if (typeof (this.prisma as any).$transaction === 'function') {
        try {
          const result = await (this.prisma as any).$transaction(executeMutations, {
            maxWait: 10000,
            timeout: 20000,
          });
          XpRateLimiter.recordAuthorizedExp(characterId, Math.floor(targetExp));
          if (data.sessionId) {
            ServerCharacterContextRegistry.setActiveSession(characterId, data.sessionId);
          }
          return result;
        } catch (err: any) {
          if (consumedDelta > 0) {
            XpRateLimiter.refund(characterId, consumedDelta);
          }
          if (consumedSkillTries > 0) {
            SkillRateLimiter.refund(characterId, consumedSkillTries);
          }
          if (err instanceof VersionConflictError) {
            // Após rollback da transação com colisão, buscar o estado mais recente do banco!
            const fresh = await this.prisma.character.findUnique({
              where: { id: characterId },
              include: { skills: true, inventory: true, spells: true },
            });
            throw new VersionConflictError(
              err.message,
              (fresh as any)?.saveVersion ?? err.currentVersion,
              fresh || err.character
            );
          }
          throw err;
        }
      }

      try {
        const result = await executeMutations(this.prisma);
        XpRateLimiter.recordAuthorizedExp(characterId, Math.floor(targetExp));
        if (data.sessionId) {
          ServerCharacterContextRegistry.setActiveSession(characterId, data.sessionId);
        }
        return result;
      } catch (err: any) {
        if (consumedDelta > 0) {
          XpRateLimiter.refund(characterId, consumedDelta);
        }
        if (consumedSkillTries > 0) {
          SkillRateLimiter.refund(characterId, consumedSkillTries);
        }
        if (err instanceof VersionConflictError && !err.character) {
          const fresh = await this.prisma.character.findUnique({
            where: { id: characterId },
            include: { skills: true, inventory: true, spells: true },
          });
          throw new VersionConflictError(
            err.message,
            (fresh as any)?.saveVersion ?? err.currentVersion,
            fresh || existing
          );
        }
        throw err;
      }
    });
  }

  async calculateOfflineProgress(characterId: string): Promise<{ offlineSeconds: number; triesGained: number } | null> {
    const char = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { skills: true },
    });
    if (!char) return null;

    const now = Date.now();
    const lastSaved = new Date(char.updatedAt).getTime();
    const offlineSeconds = Math.floor((now - lastSaved) / 1000);

    if (offlineSeconds < 60) return { offlineSeconds, triesGained: 0 };

    // Max 12 hours cap of offline progress (43,200 seconds)
    const cappedSeconds = Math.min(offlineSeconds, 43200);
    // Offline training rate: 1 try every 2 seconds
    const triesGained = Math.floor(cappedSeconds / 2);

    if (triesGained > 0 && char.skills.length > 0) {
      const primarySkill = char.skills.find((s) => s.skillId === 2 || s.skillId === 7) || char.skills[0];
      if (primarySkill) {
        const newTries = primarySkill.tries + BigInt(triesGained);
        let newValue = primarySkill.value;
        if (newTries >= BigInt(100)) {
          newValue += Math.floor(Number(newTries) / 100);
        }
        await this.prisma.characterSkill.update({
          where: { id: primarySkill.id },
          data: { tries: newTries, value: newValue },
        });
      }
    }

    await this.prisma.character.update({
      where: { id: characterId },
      data: { updatedAt: new Date() },
    });

    return { offlineSeconds, triesGained };
  }
}
