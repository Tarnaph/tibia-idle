import { Room, Client } from '@colyseus/core';
import { WorldState } from '../schemas/WorldState';
import { PlayerState } from '../schemas/PlayerState';
import { MonsterState } from '../schemas/MonsterState';
import { CombatEventSchema } from '../schemas/CombatEventSchema';
import { ChatMessageSchema } from '../schemas/ChatMessageSchema';
import { verifyAuthToken, VOCATION_CONFIGS, XpRateLimiter, ServerCharacterContextRegistry } from '../../../auth/src';
import { experienceForLevel, levelForExperience, calculateMaxStamina, tickStamina, canEnterHunt, addTrainingTries, vocationFor, initialHunts, getWave4Tiles, getHuntWorldEntrance, getPvPTierInfo, checkRankPromotion, PVP_ARENA_SPAWNS, type TrainableSkill, type GameContent } from '../../../domain/src';
import vocationsJson from '../../../../content/generated/vocations.json';
import equipmentJson from '../../../../content/generated/equipment.json';
import monstersJson from '../../../../content/generated/monsters.json';
import startersJson from '../../../../content/generated/starter-loadouts.json';
import spellsJson from '../../../../content/generated/spells.json';
import huntRegionsJson from '../../../../content/generated/hunt-regions.json';
import economyJson from '../../../../content/generated/item-economy.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog, VocationName } from '../../../content-schema/src';

const gameContent: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};
import { persistenceManager } from '../persistence/PrismaPersistenceManager';
import { serverConfigManager } from '../config/ServerConfigManager';
import '../config/ServerConfigDatabase';
import { prisma } from '../../../database/src';
import {
  isInViewport,
  isWithinDistance,
  filterEntitiesByViewport,
  LOCAL_CHAT_RADIUS,
  YELL_CHAT_RADIUS,
} from '../utils/spatialGrid';
import { CityMovementHandler } from './handlers/CityMovementHandler';
import { CityCombatHandler } from './handlers/CityCombatHandler';
import { CityChatHandler } from './handlers/CityChatHandler';
import { CityPvPHandler } from './handlers/CityPvPHandler';
import { CityPartyHandler } from './handlers/CityPartyHandler';

export interface JoinOptions {
  token?: string;
  characterId?: string;
  outfit?: string;
  outfitColors?: { head?: number; primary?: number; secondary?: number; detail?: number };
  mount?: string;
  mountActive?: boolean;
  mockCharacter?: {
    id: string;
    accountId: string;
    name: string;
    vocationId: number;
    level: number;
  };
}

export class ThaisCityRoom extends Room<WorldState> {
  public static activeInstance: ThaisCityRoom | null = null;

  public static async flushActiveInstanceSaves(): Promise<void> {
    if (ThaisCityRoom.activeInstance) {
      console.log('[ThaisCityRoom] Executando flush forçado de salvamento de jogadores em Thais City...');
      await ThaisCityRoom.activeInstance.performRoomAutoSave();
    }
  }

  maxClients = 100;
  public gameContent: GameContent = gameContent;
  private autoSaveTimer: any = null;
  private activeSavePromise: Promise<void> | null = null;
  private isDisposed: boolean = false;
  public playerExpSync = new Map<string, { lastSyncTime: number; lastExperience: number }>();

  public movementHandler!: CityMovementHandler;
  public combatHandler!: CityCombatHandler;
  public chatHandler!: CityChatHandler;
  public pvpHandler!: CityPvPHandler;
  public partyHandler!: CityPartyHandler;

  public get pvpQueue() {
    return this.pvpHandler?.pvpQueue;
  }
  public get activeDuels() {
    return this.pvpHandler?.activeDuels;
  }

  public getUniqueOnlineAccountsCount(): number {
    const unique = new Set<string>();
    for (const p of this.state.players.values()) {
      if (p.accountId && p.accountId !== 'acc-guest') {
        unique.add(p.accountId);
      } else if (p.characterId) {
        unique.add(`char:${p.characterId}`);
      } else if (p.id) {
        unique.add(`session:${p.id}`);
      }
    }
    return Math.max(1, unique.size);
  }

  public updateOnlineAccountsCount(): void {
    const count = this.getUniqueOnlineAccountsCount();
    this.state.uniqueAccountsOnline = count;
    try {
      this.broadcast('server:onlineCount', { count });
    } catch {}
  }

  public static isCharacterOnline(nameOrId: string): boolean {
    if (!nameOrId) return false;
    const normalized = nameOrId.trim().toLowerCase();
    if (this.activeInstance && this.activeInstance.state?.players) {
      for (const player of this.activeInstance.state.players.values()) {
        if (
          (player.characterId && player.characterId.toLowerCase() === normalized) ||
          (player.name && player.name.trim().toLowerCase() === normalized) ||
          (player.id && player.id.toLowerCase() === normalized)
        ) {
          return true;
        }
      }
    }
    if (ServerCharacterContextRegistry.isCharacterOnline(nameOrId)) {
      return true;
    }
    return false;
  }

  private setupRoomAutoSave(intervalMs: number) {
    if (this.autoSaveTimer) {
      if (typeof this.autoSaveTimer.clear === 'function') {
        this.autoSaveTimer.clear();
      } else {
        clearInterval(this.autoSaveTimer);
      }
      this.autoSaveTimer = null;
    }

    if (this.clock && typeof this.clock.setInterval === 'function') {
      this.autoSaveTimer = this.clock.setInterval(() => {
        void this.performRoomAutoSave();
      }, intervalMs);
    } else {
      this.autoSaveTimer = setInterval(() => {
        void this.performRoomAutoSave();
      }, intervalMs);
    }
  }

  public async performRoomAutoSave(): Promise<void> {
    if (this.isDisposed) return;
    this.updateOnlineAccountsCount();
    if (this.activeSavePromise) {
      return;
    }

    try {
      const cityPlayers = Array.from(this.state.players.values()).filter(
        (p) => !p.inHunt && !ServerCharacterContextRegistry.isHunting(p.characterId)
      );
      this.activeSavePromise = persistenceManager.saveBatch(cityPlayers);
      await this.activeSavePromise;
    } catch (err: any) {
      console.warn(`[ThaisCityRoom] Auto-save cycle warning:`, err?.message || err);
    } finally {
      this.activeSavePromise = null;
    }
  }

  public updatePlayerHuntContext(player: PlayerState, inHunt: boolean, huntId?: string): void {
    player.inHunt = inHunt;
    if (player.characterId) {
      ServerCharacterContextRegistry.setActivity(player.characterId, {
        isHunting: inHunt,
        huntId: huntId || player.lastHuntId,
        activeSessionId: player.id,
        lastActiveSessionId: player.id,
      });
      void persistenceManager.setPlayerHuntStatus(player.characterId, inHunt, huntId || player.lastHuntId, player.id);
    }
  }

  /**
   * Função permanente autoritativa: restaura estado urbano e visibilidade total do jogador em Thais.
   * Chamada ao sair da Arena PvP, ao concluir caçada, ao logar ou ao transitar para Thais.
   */
  public restorePlayerToThaisCity(player: PlayerState, spawnX = 32369, spawnY = 32241, spawnZ = 7): void {
    player.inHunt = false;
    player.lastHuntId = '';
    player.posX = spawnX;
    player.posY = spawnY;
    player.posZ = spawnZ;
    player.isWalking = false;
    player.lastStepTime = 0;
    this.updatePlayerHuntContext(player, false);
  }

  onCreate(options: any) {
    ThaisCityRoom.activeInstance = this;
    this.setState(new WorldState());
    this.state.regionName = 'thais-city';

    // Set 100ms deterministic server simulation tick (10 ticks / sec)
    this.setSimulationInterval((dt) => this.gameTick(dt), 100);

    // Apply dynamic server config rates and listen for changes in real-time (default 20000ms auto-save)
    const defaultSaveIntervalMs = 20000;
    this.maxClients = serverConfigManager.getConfig().maxClientsPerRoom;
    this.setupRoomAutoSave(serverConfigManager.getConfig().periodicSaveIntervalMs || defaultSaveIntervalMs);

    void serverConfigManager.loadFromDatabase().then((loadedConfig) => {
      this.maxClients = loadedConfig.maxClientsPerRoom;
      this.setupRoomAutoSave(loadedConfig.periodicSaveIntervalMs || defaultSaveIntervalMs);
      try {
        if (this.clients && this.clients.length > 0) {
          this.broadcast('server:config', loadedConfig);
        }
      } catch {}
    });

    serverConfigManager.onChange((newConfig) => {
      this.maxClients = newConfig.maxClientsPerRoom;
      this.setupRoomAutoSave(newConfig.periodicSaveIntervalMs || defaultSaveIntervalMs);
      try {
        if (this.clients && this.clients.length > 0) {
          this.broadcast('server:config', newConfig);
        }
      } catch {}
    });

    // Initial server-side monster spawns
    this.spawnInitialMonsters();
    // Register Modular Domain Handlers (Onda 2 - Refatoração Arquitetural)
    this.movementHandler = new CityMovementHandler(this);
    this.movementHandler.register();

    this.combatHandler = new CityCombatHandler(this);
    this.combatHandler.register();

    this.chatHandler = new CityChatHandler(this);
    this.chatHandler.register();

    this.pvpHandler = new CityPvPHandler(this);
    this.pvpHandler.register();

    this.partyHandler = new CityPartyHandler(this);
    this.partyHandler.register();
  }

  public parties: Map<string, { leaderSessionId: string; leaderName: string; memberSessionIds: string[] }> = new Map();
  public playerPartyLeader: Map<string, string> = new Map();
  public activeHuntProposals: Map<string, { huntId: string; huntName: string; seed: string; leaderSessionId: string; approvals: Set<string> }> = new Map();

  async onJoin(client: Client, options: JoinOptions) {
    let accountId = 'acc-guest';
    let charId = `char-${client.sessionId}`;
    let charName = `Hero ${client.sessionId.slice(0, 4)}`;
    let vocationId = 4;
    let level = 1;
    let hp: number | undefined;
    let maxHp: number | undefined;
    let mp: number | undefined;
    let maxMp: number | undefined;
    let posX: number | undefined;
    let posY: number | undefined;
    let posZ: number | undefined;
    let loadedStaminaMinutes: number | undefined;
    let loadedIsAutoIdle: boolean | undefined;
    let loadedLastHuntId: string | undefined;
    let loadedIsHunting = false;
    let loadedAvatarId = 1;
    let loadedBestiaryKills: Record<string, number> = {};
    let loadedTrackedBestiaryId = '';
    let loadedBossPoints = 0;

    let accountRole = 'PLAYER';
    if (options.token) {
      try {
        const decoded = verifyAuthToken(options.token);
        accountId = decoded.accountId;
        accountRole = (decoded.role || 'PLAYER').toUpperCase();
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('TOKEN_INVALID');
        }
      }
    }

    let outfitName = (options as any).outfit || 'Knight';
    let outfitLookType = (options as any).outfitLookType ?? 128;
    let outfitHead = (options as any).outfitColors?.head ?? 0;
    let outfitBody = (options as any).outfitColors?.primary ?? 86;
    let outfitLegs = (options as any).outfitColors?.secondary ?? 114;
    let outfitFeet = (options as any).outfitColors?.detail ?? 76;
    let outfitAddons = 0;
    const rawOptAddons = (options as any).outfit?.addons ?? (options as any).addons ?? (options as any).outfitAddons;
    if (typeof rawOptAddons === 'number') {
      outfitAddons = rawOptAddons;
    }
    let mount = (options as any).mount || 'none';
    let mountActive = Boolean((options as any).mountActive);
    let gender = (options as any).gender === 'female' ? 'female' : 'male';
    let adminTitle = '';
    let loadedSkills: any[] = [];
    let loadedExperience = experienceForLevel(level);
    let loadedPvpElo = 0;
    let loadedPvpTier = 'Iniciante';
    let loadedDisplaySkull = true;

    if (options.characterId) {
      const dbChar = await persistenceManager.loadCharacter(options.characterId);
      if (dbChar) {
        if (accountId !== 'acc-guest' && dbChar.accountId && dbChar.accountId !== accountId) {
          throw new Error('UNAUTHORIZED_CHARACTER_OWNERSHIP');
        }
        charId = dbChar.id;
        accountId = dbChar.accountId || accountId;
        charName = dbChar.name;
        vocationId = dbChar.vocationId;
        level = dbChar.level;
        hp = dbChar.health;
        maxHp = dbChar.maxHealth;
        mp = dbChar.mana;
        maxMp = dbChar.maxMana;
        posX = dbChar.posX;
        posY = dbChar.posY;
        posZ = dbChar.posZ;
        if (dbChar.gender === 'female' || dbChar.gender === 'male') {
          gender = dbChar.gender;
        }
        const rawRole = String((dbChar as any).account?.role || '').trim().toUpperCase();
        if (rawRole === 'ADMIN') {
          accountRole = 'ADMIN';
        } else if (rawRole === 'GM') {
          accountRole = 'GM';
        }
        if ((accountRole === 'ADMIN' || accountRole === 'GM') && (dbChar as any).adminTitle) {
          const rawTitle = String((dbChar as any).adminTitle).trim().toUpperCase();
          if (rawTitle === 'GOD' || rawTitle === 'GM') {
            adminTitle = rawTitle;
          }
        }
        loadedExperience = dbChar.experience !== undefined && dbChar.experience !== null
          ? Number(dbChar.experience)
          : experienceForLevel(level);
        const minExpForLevel = experienceForLevel(level);
        if (loadedExperience < minExpForLevel) {
          loadedExperience = minExpForLevel;
        }
        loadedStaminaMinutes = dbChar.staminaMinutes ?? 15;
        loadedIsAutoIdle = dbChar.isAutoIdle ?? false;
        loadedLastHuntId = dbChar.lastHuntId ?? '';
        loadedIsHunting = Boolean((dbChar as any).isHunting);
        loadedAvatarId = (dbChar as any).avatarId ?? 1;
        if (typeof (dbChar as any).pvpElo === 'number') {
          loadedPvpElo = (dbChar as any).pvpElo;
        }
        if ((dbChar as any).pvpTier) {
          loadedPvpTier = (dbChar as any).pvpTier;
        }
        // Auto-migração: jogadores novos que receberam 1000 ELO do default antigo sem nenhuma partida
        if (loadedPvpElo === 1000 && ((dbChar as any).pvpWins ?? 0) === 0 && ((dbChar as any).pvpLosses ?? 0) === 0) {
          loadedPvpElo = 0;
          loadedPvpTier = 'Iniciante';
          void (prisma as any).character.update({
            where: { id: dbChar.id },
            data: { pvpElo: 0, pvpTier: 'Iniciante' },
          }).catch(() => {});
        }
        if (typeof (dbChar as any).displaySkull === 'boolean') {
          loadedDisplaySkull = (dbChar as any).displaySkull;
        }
        if ((dbChar as any).bestiaryKills) {
          loadedBestiaryKills = (dbChar as any).bestiaryKills;
        }
        if ((dbChar as any).trackedBestiaryId) {
          loadedTrackedBestiaryId = (dbChar as any).trackedBestiaryId;
        }
        if (typeof (dbChar as any).bossPoints === 'number') {
          loadedBossPoints = (dbChar as any).bossPoints;
        }
        outfitLookType = (options as any).outfitLookType ?? dbChar.outfitLookType ?? 128;
        if ((dbChar as any).outfit) {
          outfitName = (dbChar as any).outfit;
        } else if (dbChar.vocationName && !(options as any).outfit) {
          outfitName = dbChar.vocationName;
        }
        if (typeof (dbChar as any).outfitAddons === 'number') {
          outfitAddons = (dbChar as any).outfitAddons;
        }
        if ((dbChar as any).mount) {
          mount = (dbChar as any).mount;
        }
        if (typeof (dbChar as any).mountActive === 'boolean') {
          mountActive = (dbChar as any).mountActive;
        }
        if (typeof dbChar.outfitBody === 'number' && dbChar.outfitBody >= 0) {
          outfitHead = dbChar.outfitHead ?? 0;
          outfitBody = dbChar.outfitBody;
          outfitLegs = dbChar.outfitLegs ?? 0;
          outfitFeet = dbChar.outfitFeet ?? 0;
        }
         if (Array.isArray((dbChar as any).skills)) {
          loadedSkills = (dbChar as any).skills.map((s: any) => ({
            skillId: s.skillId,
            skillName: s.skillName,
            value: s.value,
            tries: Number(s.tries ?? 0),
          }));
        }
      }
    }
    if (options.mockCharacter && charId.startsWith('char-')) {
      charId = options.mockCharacter.id;
      accountId = options.mockCharacter.accountId || accountId;
      charName = options.mockCharacter.name;
      vocationId = options.mockCharacter.vocationId;
      level = options.mockCharacter.level;
    }

    if ((options as any).outfit) {
      outfitName = (options as any).outfit;
    }
    if ((options as any).outfitColors) {
      outfitHead = (options as any).outfitColors.head ?? outfitHead;
      outfitBody = (options as any).outfitColors.primary ?? outfitBody;
      outfitLegs = (options as any).outfitColors.secondary ?? outfitLegs;
      outfitFeet = (options as any).outfitColors.detail ?? outfitFeet;
    }

    const safeVocationId = Number(vocationId) || 4;
    const vocation = VOCATION_CONFIGS[safeVocationId] || VOCATION_CONFIGS[4] || {
      name: 'Knight',
      baseHp: 150,
      baseMp: 35,
      capacity: 400,
    };

    const player = new PlayerState();
    player.id = client.sessionId;
    player.characterId = charId;
    player.accountId = accountId;
    player.role = accountRole;
    player.adminTitle = adminTitle;
    player.gender = gender;
    player.name = charName || 'Hero';
    player.vocationId = safeVocationId;
    player.vocationName = vocation.name || 'Knight';
    player.level = Math.max(level, levelForExperience(loadedExperience));
    player.experience = loadedExperience;
    player.avatarId = loadedAvatarId;
    player.hp = hp ?? vocation.baseHp;
    player.maxHp = maxHp ?? vocation.baseHp;
    player.mp = mp ?? vocation.baseMp;
    player.maxMp = maxMp ?? vocation.baseMp;
    player.capacity = vocation.capacity;
    player.posX = posX ?? 32369;
    player.posY = posY ?? 32241;
    player.posZ = posZ ?? 7;
    player.direction = 'south';
    (player as any).skills = loadedSkills;

    // Set outfit state
    player.outfit = outfitName;
    player.outfitLookType = outfitLookType;
    player.outfitHead = outfitHead;
    player.outfitBody = outfitBody;
    player.outfitLegs = outfitLegs;
    player.outfitFeet = outfitFeet;
    player.outfitAddons = outfitAddons;
    player.mount = mount;
    player.mountActive = mountActive;

    // Calculate stamina capacity based on highest character level on account
    let accountHighestLevel = level;
    if (options.characterId && accountId !== 'acc-guest') {
      try {
        accountHighestLevel = await persistenceManager.getAccountHighestLevel(accountId);
      } catch {
        accountHighestLevel = level;
      }
    }
    const maxStamina = calculateMaxStamina(Math.max(level, accountHighestLevel));
    player.maxStaminaMinutes = maxStamina;
    player.staminaMinutes = Math.min(maxStamina, Math.max(0, loadedStaminaMinutes ?? 15));

    // Auto-Idle state load
    player.isAutoIdle = loadedIsAutoIdle ?? false;
    player.lastHuntId = loadedLastHuntId || 'rat-cellars';

    // Authoritatively reconstruct active hunt context from persistent server record, dbChar or options
    const activeHuntRecord = await persistenceManager.getActiveHuntSession(charId);
    let isConfirmedHunting = false;
    let confirmedHuntId: string | undefined = undefined;

    if (activeHuntRecord && activeHuntRecord.isHunting) {
      // Confirmed active hunt survived process restart or network disconnection
      isConfirmedHunting = true;
      confirmedHuntId = activeHuntRecord.huntId;
    } else if (loadedIsHunting) {
      isConfirmedHunting = true;
      confirmedHuntId = loadedLastHuntId || 'rat-cellars';
    } else if ((options as any).inHunt) {
      isConfirmedHunting = true;
      confirmedHuntId = (options as any).huntId || loadedLastHuntId || 'rat-cellars';
    }

    if (isConfirmedHunting && confirmedHuntId) {
      player.lastHuntId = confirmedHuntId;
      this.updatePlayerHuntContext(player, true, confirmedHuntId);
      if (confirmedHuntId === 'pvp-arena') {
        player.posX = 33136;
        player.posY = 32969;
        player.posZ = 8;
      } else {
        const entrance = getHuntWorldEntrance(confirmedHuntId, gameContent);
        player.posX = entrance.worldPosition.x;
        player.posY = entrance.worldPosition.y;
        player.posZ = entrance.worldPosition.z;
      }
      player.isWalking = false;
      player.lastStepTime = 0;
      if (typeof client.send === 'function') {
        client.send('server:huntContextReady', { isHunting: true, huntId: confirmedHuntId });
      }
    } else {
      this.updatePlayerHuntContext(player, false);
      if (typeof client.send === 'function') {
        client.send('server:huntContextReady', { isHunting: false });
      }
    }
    (player as any).bestiaryKills = loadedBestiaryKills;
    player.trackedBestiaryId = loadedTrackedBestiaryId;
    (player as any).bossPoints = loadedBossPoints;
    player.pvpElo = loadedPvpElo;
    player.pvpTier = loadedPvpTier;
    player.displaySkull = loadedDisplaySkull;

    if (!this.clients.includes(client)) {
      (this.clients as any).push(client);
    }

    // Strictly enforce 1 session per account AND 1 session per characterId across all clients/tabs/devices
    for (const [existingSessionId, existingPlayer] of this.state.players.entries()) {
      const isSameAccount = accountId && accountId !== 'acc-guest' && existingPlayer.accountId === accountId;
      const isSameCharacter = Boolean(charId && existingPlayer.characterId === charId);

      if (existingSessionId !== client.sessionId && (isSameAccount || isSameCharacter)) {
        const oldClient = this.clients.find((c) => c.sessionId === existingSessionId);
        if (oldClient) {
          try {
            oldClient.send('session:duplicate', {
              message: 'Sua conta foi conectada em outra janela ou dispositivo.',
            });
            oldClient.leave(4000);
          } catch {}
        }
        const existingQueueEntry = this.pvpQueue.get(existingSessionId);
        if (existingQueueEntry) {
          if (existingQueueEntry.timeoutRef) clearTimeout(existingQueueEntry.timeoutRef);
          this.pvpQueue.delete(existingSessionId);
        }
        this.handlePlayerLeaveParty(existingSessionId);
        if (!existingPlayer.inHunt && !ServerCharacterContextRegistry.isHunting(existingPlayer.characterId)) {
          void persistenceManager.saveCharacter(existingPlayer);
        }
        this.playerExpSync.delete(existingSessionId);
        this.state.players.delete(existingSessionId);
      }
    }

    this.state.players.set(client.sessionId, player);
    this.updateOnlineAccountsCount();
    if (charId) {
      ServerCharacterContextRegistry.setActiveSession(charId, client.sessionId);
      void persistenceManager.setPlayerOnlineStatus(charId, true);
    }
    this.playerExpSync.set(client.sessionId, { lastSyncTime: Date.now(), lastExperience: player.experience });
    if (typeof client.send === 'function') {
      client.send('server:onlineCount', { count: this.getUniqueOnlineAccountsCount() });
      client.send('server:config', serverConfigManager.getConfig());
      client.send('bestiary:sync', {
        kills: loadedBestiaryKills,
        trackedMonsterId: loadedTrackedBestiaryId,
        bossPoints: loadedBossPoints,
      });
    }
  }

  async onLeave(client: Client, code?: number | boolean) {
    const player = this.state.players.get(client.sessionId);
    const consented = typeof code === 'boolean' ? code : (code === 1000 || code === 4000);

    if (!consented) {
      try {
        // Allow configurable window for client reconnection upon F5 / connection loss
        const reconnectSec = serverConfigManager.getConfig().allowReconnectionSec ?? 20;
        await this.allowReconnection(client, reconnectSec);
        return;
      } catch (err) {
        // Reconnection window expired
      }
    }

    if (player) {
      // Session Ownership Guard: Only persist/offline if this client is STILL the active registered session
      const activeSession = player.characterId ? ServerCharacterContextRegistry.getActiveSession(player.characterId) : undefined;
      const isStillActiveSession = !activeSession || activeSession === client.sessionId;

      if (isStillActiveSession) {
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          await persistenceManager.saveCharacter(player);
        }
        if (player.characterId) {
          ServerCharacterContextRegistry.setPlayerOffline(player.characterId);
          void persistenceManager.setPlayerOnlineStatus(player.characterId, false);
        }
      }
    }

    const idx = this.clients.indexOf(client);
    if (idx !== -1) {
      this.clients.splice(idx, 1);
    }
    const queueEntry = this.pvpQueue.get(client.sessionId);
    if (queueEntry) {
      if (queueEntry.timeoutRef) clearTimeout(queueEntry.timeoutRef);
      this.pvpQueue.delete(client.sessionId);
    }
    this.handlePlayerLeaveParty(client.sessionId);
    this.playerExpSync.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.updateOnlineAccountsCount();
  }

  async onDispose() {
    this.isDisposed = true;
    if (ThaisCityRoom.activeInstance === this) {
      ThaisCityRoom.activeInstance = null;
    }
    if (this.autoSaveTimer) {
      if (typeof this.autoSaveTimer.clear === 'function') {
        this.autoSaveTimer.clear();
      } else {
        clearInterval(this.autoSaveTimer);
      }
      this.autoSaveTimer = null;
    }

    if (this.activeSavePromise) {
      try {
        await this.activeSavePromise;
      } catch {}
    }

    const cityPlayers = Array.from(this.state.players.values()).filter(
      (p) => !p.inHunt && !ServerCharacterContextRegistry.isHunting(p.characterId)
    );
    await persistenceManager.saveBatch(cityPlayers);
  }

  /**
   * Helper returning all player and monster entities inside the 15x11 viewport of the requested observer.
   */
  public getEntitiesInViewportForPlayer(sessionId: string) {
    const observer = this.state.players.get(sessionId);
    if (!observer) return { players: [], monsters: [] };

    const playersInView = filterEntitiesByViewport(
      Array.from(this.state.players.values()),
      observer.posX,
      observer.posY
    );

    const monstersInView = filterEntitiesByViewport(
      Array.from(this.state.monsters.values()),
      observer.posX,
      observer.posY
    );

    return { players: playersInView, monsters: monstersInView };
  }

  public handlePlayerMove(client: Client, direction: 'north' | 'south' | 'east' | 'west', clientX?: number, clientY?: number, clientZ?: number): void {
    return this.movementHandler.handlePlayerMove(client, direction, clientX, clientY, clientZ);
  }

  public handleCastSpell(client: Client, spellId: string): void {
    return this.combatHandler.handleCastSpell(client, spellId);
  }


  public handleChatMessage(client: Client, rawText: string, channel: string): void {
    return this.chatHandler.handleChatMessage(client, rawText, channel);
  }

  public pushCombatEvent(
    type: string,
    sourceId: string,
    targetId: string,
    value: number,
    posX: number,
    posY: number,
    text: string,
    color: string,
    projectileId?: number | null,
    effectId?: number | null,
    fromX?: number,
    fromY?: number
  ): void {
    return this.combatHandler.pushCombatEvent(type, sourceId, targetId, value, posX, posY, text, color, projectileId, effectId, fromX, fromY);
  }

  private spawnInitialMonsters() {
    const dummy = new MonsterState();
    dummy.id = 'dummy-1';
    dummy.name = 'Target Dummy';
    dummy.monsterTypeId = 'dummy';
    dummy.lookType = 95;
    dummy.hp = 99999;
    dummy.maxHp = 99999;
    dummy.posX = 32349;
    dummy.posY = 32238;
    dummy.posZ = 7;
    this.state.monsters.set(dummy.id, dummy);

    const rotworm = new MonsterState();
    rotworm.id = 'rotworm-1';
    rotworm.name = 'Rotworm';
    rotworm.monsterTypeId = 'rotworm';
    rotworm.lookType = 26;
    rotworm.hp = 65;
    rotworm.maxHp = 65;
    rotworm.posX = 32375;
    rotworm.posY = 32245;
    rotworm.posZ = 7;
    this.state.monsters.set(rotworm.id, rotworm);

    // Spawn monsters from all imported hunt regions (including Dragon Lair at Z=11)
    let monsterIndex = 1;
    const monsterCatalog = (monstersJson as MonsterCatalog).monsters;
    const monsterMap = new Map(monsterCatalog.map((m) => [m.id.toLowerCase(), m]));

    for (const region of (huntRegionsJson as HuntRegionCatalog).regions) {
      const monsterTypeId = region.monsterName.toLowerCase().replace(/\s+/g, '-');
      const monsterDef = monsterMap.get(monsterTypeId) || monsterMap.get(region.monsterName.toLowerCase());

      for (const spawn of region.spawnPositions) {
        const monster = new MonsterState();
        monster.id = `${monsterTypeId}-${monsterIndex++}`;
        monster.name = monsterDef?.name || region.monsterName;
        monster.monsterTypeId = monsterDef?.id || monsterTypeId;
        monster.lookType = monsterDef?.lookType || (monsterTypeId === 'dragon' ? 34 : 26);
        monster.hp = monsterDef?.maxHp || (monsterTypeId === 'dragon' ? 1000 : 65);
        monster.maxHp = monster.hp;
        monster.posX = spawn.x;
        monster.posY = spawn.y;
        monster.posZ = spawn.z;
        this.state.monsters.set(monster.id, monster);
      }
    }
  }

  public killMonster(monster: MonsterState, killer: PlayerState) {
    monster.isDead = true;
    monster.hp = 0;
    monster.respawnTimerMs = 0;

    const baseExperienceMap: Record<string, number> = {
      dummy: 0,
      rat: 5,
      'cave-rat': 10,
      spider: 12,
      bug: 18,
      'poison-spider': 22,
      troll: 20,
      'swamp-troll': 25,
      rotworm: 40,
      skeleton: 35,
      minotaur: 50,
      dwarf: 45,
      'carrion-worm': 70,
    };

    const isDummy = Boolean(
      monster.monsterTypeId.includes('dummy') ||
      monster.id.includes('dummy') ||
      monster.name.toLowerCase().includes('dummy')
    );

    const baseExp = isDummy ? 0 : (baseExperienceMap[monster.monsterTypeId] ?? (monster.monsterTypeId === 'rotworm' ? 40 : 5));
    const expRate = serverConfigManager.getConfig().expRate ?? 1.0;
    const xpGain = baseExp === 0 ? 0 : Math.max(1, Math.round(baseExp * expRate));

    if (xpGain > 0 && killer && killer.hp > 0) {
      if (!killer.experience || killer.experience < experienceForLevel(killer.level)) {
        killer.experience = experienceForLevel(killer.level);
      }
      killer.experience += xpGain;

      while (killer.experience >= experienceForLevel(killer.level + 1)) {
        killer.level += 1;
        const hpGain = killer.vocationId === 1 ? 5 : killer.vocationId === 2 ? 5 : killer.vocationId === 3 ? 10 : 15;
        const mpGain = killer.vocationId === 1 ? 30 : killer.vocationId === 2 ? 30 : killer.vocationId === 3 ? 15 : 5;
        killer.maxHp += hpGain;
        killer.maxMp += mpGain;
        killer.hp = killer.maxHp;
        killer.mp = killer.maxMp;
        this.pushCombatEvent('level_up', killer.id, killer.id, killer.level, killer.posX, killer.posY, `Level ${killer.level}!`, '#ffff00');
      }
    }

    this.pushCombatEvent('death', killer.id, monster.id, xpGain, monster.posX, monster.posY, `+${xpGain} XP`, '#ffffff');

    // Bestiary kill progression & authoritative notification
    if (!isDummy) {
      const monsterKey = (monster.monsterTypeId || monster.name).toLowerCase().replace(/\s+/g, '-');
      const killerObj = killer as any;
      if (!killerObj.bestiaryKills) {
        killerObj.bestiaryKills = {};
      }
      const prevKills = killerObj.bestiaryKills[monsterKey] || 0;
      const newKills = prevKills + 1;
      killerObj.bestiaryKills[monsterKey] = newKills;

      const client = this.clients.find((c) => c.sessionId === killer.id);
      if (client && typeof client.send === 'function') {
        if (prevKills === 0) {
          client.send('bestiary:firstKill', {
            monsterId: monsterKey,
            monsterName: monster.name,
            kills: newKills,
          });
        }
        client.send('bestiary:killUpdate', {
          monsterId: monsterKey,
          monsterName: monster.name,
          kills: newKills,
        });
      }

      // Immediately persist authoritative character state (level, xp, bestiary) to Prisma DB
      void persistenceManager.saveCharacter(killer);
    }
  }

  private gameTick(deltaTimeMs: number) {
    this.state.serverTick += 1;
    const now = Date.now();

    // Player auto-attack & mana regen & movement idle reset & stamina tick
    this.state.players.forEach((player: PlayerState) => {
      if (player.isWalking && now - player.lastStepTime > 350) {
        player.isWalking = false;
      }

      // Stamina update tick
      const isTargetingDummy = Boolean(
        player.targetId &&
        (player.targetId.includes('dummy') || this.state.monsters.get(player.targetId)?.monsterTypeId === 'dummy')
      );
      player.isTraining = !player.inHunt && isTargetingDummy;

      const staminaMode = player.inHunt ? 'hunting' : player.isTraining ? 'training' : 'resting';
      const staminaRes = tickStamina(
        player.staminaMinutes,
        player.maxStaminaMinutes,
        staminaMode,
        deltaTimeMs / 1000
      );
      player.staminaMinutes = staminaRes.staminaMinutes;

      if (staminaRes.evicted) {
        this.updatePlayerHuntContext(player, false);
        player.posX = 32369;
        player.posY = 32241;
        player.posZ = 7;
        player.direction = 'south';
        player.isWalking = false;

        const client = this.clients.find((c) => c.sessionId === player.id);
        if (client) {
          client.send('stamina:depleted', {
            message: 'Sua estamina acabou! Você foi ejetado da caçada para a cidade.',
          });
        }
      }

      // Auto-Idle State Machine Loop
      if (player.isAutoIdle) {
        if (staminaRes.evicted || (player.inHunt && player.staminaMinutes <= 0)) {
          this.updatePlayerHuntContext(player, false);
          player.isTraining = true;
          player.posX = 32369;
          player.posY = 32241;
          player.posZ = 7;

          const client = this.clients.find((c) => c.sessionId === player.id);
          if (client) {
            client.send('autoIdle:event', {
              action: 'switched_to_training',
              message: '🤖 Auto-Idle: Estamina esgotada. Herói direcionado para o treino em Dummies.',
            });
          }
        } else if (!player.inHunt && player.staminaMinutes >= player.maxStaminaMinutes) {
          player.isTraining = false;
          this.updatePlayerHuntContext(player, true, player.lastHuntId || 'rat-cellars');

          const client = this.clients.find((c) => c.sessionId === player.id);
          if (client) {
            client.send('autoIdle:event', {
              action: 'returned_to_hunt',
              huntId: player.lastHuntId || 'rat-cellars',
              message: '🤖 Auto-Idle: Estamina 100% restaurada! Herói retornou automaticamente para a caçada.',
            });
          }
        }
      }


      // Vocation-based HP & MP Regeneration (RubinOT Rates - 10 ticks per second)
      const vocName = (player.vocationName || 'Knight') as VocationName;
      try {
        const vocDef = vocationFor(gameContent, vocName);
        const hpTicks = Math.max(1, (vocDef.healthGainTicks ?? 4) * 10);
        const mpTicks = Math.max(1, (vocDef.manaGainTicks ?? 4) * 10);
        if (this.state.serverTick % hpTicks === 0 && player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + (vocDef.healthGainAmount ?? 20));
        }
        if (this.state.serverTick % mpTicks === 0 && player.mp < player.maxMp) {
          player.mp = Math.min(player.maxMp, player.mp + (vocDef.manaGainAmount ?? 5));
        }
      } catch {
        if (this.state.serverTick % 40 === 0 && player.mp < player.maxMp) {
          player.mp = Math.min(player.maxMp, player.mp + 5);
        }
      }

      // Independent Ring Regeneration (Life Ring: +2 HP / +8 MP / 6s; Ring of Healing: +6 HP / +24 MP / 6s)
      const ring = player.equippedRing;
      if ((ring === 2168 || ring === 2205 || ring === 2214 || ring === 2216) && this.state.serverTick % 60 === 0) {
        const isRoh = ring === 2214 || ring === 2216;
        const ringHp = isRoh ? 6 : 2;
        const ringMp = isRoh ? 24 : 8;
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + ringHp);
        }
        if (player.mp < player.maxMp) {
          player.mp = Math.min(player.maxMp, player.mp + ringMp);
        }
      }

      if (player.targetId && now - player.lastAttackTime >= player.attackCooldownMs) {
        const monster = this.state.monsters.get(player.targetId);
        if (monster && !monster.isDead) {
          const isRanged = player.vocationId === 1 || player.vocationId === 2 || player.vocationId === 3;
          const maxRange = isRanged ? 4 : 1;
          const inRange = Math.max(Math.abs(monster.posX - player.posX), Math.abs(monster.posY - player.posY)) <= maxRange;
          if (inRange) {
            const rawDamage = 20 + Math.floor(Math.random() * 25);
            const damage = Math.max(1, rawDamage - monster.armorPower);
            monster.hp -= damage;
            player.lastAttackTime = now;

            // Advance character skill on attack
            const vocName = (player.vocationName || 'Knight') as VocationName;
            const primarySkill: TrainableSkill = (player.vocationId === 1 || player.vocationId === 2) ? 'magicLevel' : player.vocationId === 3 ? 'distance' : 'sword';
            const vocDef = vocationFor(gameContent, vocName);
            const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
            const rateMult = primarySkill === 'magicLevel' ? gameContent.rateMagic : gameContent.rateSkill;
            const tries = 1 * rateMult * skillRate;

            let charSkills = (player as any).skills;
            if (!Array.isArray(charSkills) || charSkills.length === 0) {
              charSkills = [
                { skillId: 0, skillName: 'Fist Fighting', value: 10, tries: 0 },
                { skillId: 1, skillName: 'Club Fighting', value: 10, tries: 0 },
                { skillId: 2, skillName: 'Sword Fighting', value: 10, tries: 0 },
                { skillId: 3, skillName: 'Axe Fighting', value: 10, tries: 0 },
                { skillId: 4, skillName: 'Distance Fighting', value: 10, tries: 0 },
                { skillId: 5, skillName: 'Shielding', value: 10, tries: 0 },
                { skillId: 7, skillName: 'Magic Level', value: 0, tries: 0 },
              ];
              (player as any).skills = charSkills;
            }
            const primarySkillStr = primarySkill as string;
            const targetSkillId = primarySkillStr === 'magicLevel' ? 7 : primarySkillStr === 'distance' ? 4 : primarySkillStr === 'sword' ? 2 : primarySkillStr === 'axe' ? 3 : 1;
            let targetSkillObj = charSkills.find((s: any) => s.skillId === targetSkillId);
            if (!targetSkillObj) {
              targetSkillObj = { skillId: targetSkillId, skillName: primarySkill, value: 10, tries: 0 };
              charSkills.push(targetSkillObj);
            }
            const skillMap: Record<string, number> = { fist: 10, club: 10, sword: 10, axe: 10, distance: 10, shielding: 10, magicLevel: 0 };
            const skillTriesMap: Record<string, number> = { fist: 0, club: 0, sword: 0, axe: 0, distance: 0, shielding: 0, magicLevel: 0 };
            charSkills.forEach((s: any) => {
              const nameMap: Record<number, string> = { 0: 'fist', 1: 'club', 2: 'sword', 3: 'axe', 4: 'distance', 5: 'shielding', 7: 'magicLevel' };
              const key = nameMap[s.skillId];
              if (key) {
                skillMap[key] = s.value;
                skillTriesMap[key] = s.tries || 0;
              }
            });
            const charState: any = { skills: skillMap, skillTries: skillTriesMap };
            const leveled = addTrainingTries(charState, primarySkill, tries, vocDef);
            targetSkillObj.value = charState.skills[primarySkill];
            targetSkillObj.tries = charState.skillTries[primarySkill];
            if (leveled.length > 0) {
              const client = this.clients.find((c) => c.sessionId === player.id);
              if (client && typeof (client as any).send === 'function') {
                client.send('skill:levelUp', { skill: primarySkill, level: targetSkillObj.value });
              }
            }

            const projectileId = player.vocationId === 1 ? 5 : player.vocationId === 2 ? 29 : player.vocationId === 3 ? 3 : null;
            const effectId = player.vocationId === 1 ? 12 : player.vocationId === 2 ? 43 : 10;

            this.pushCombatEvent(
              'damage',
              player.id,
              monster.id,
              damage,
              monster.posX,
              monster.posY,
              `${damage}`,
              '#ff3333',
              projectileId,
              effectId,
              player.posX,
              player.posY
            );

            if (monster.hp <= 0) {
              this.killMonster(monster, player);
            }
          }
        }
      }
    });

    // Monster respawn & AI
    this.state.monsters.forEach((monster: MonsterState) => {
      if (monster.isDead) {
        monster.respawnTimerMs += deltaTimeMs;
        if (monster.respawnTimerMs >= 10000) {
          monster.isDead = false;
          monster.hp = monster.maxHp;
          monster.respawnTimerMs = 0;
        }
      }
    });
  }

  public broadcastPartySync(leaderId: string): void {
    return this.partyHandler.broadcastPartySync(leaderId);
  }

  public handlePlayerLeaveParty(sessionId: string): void {
    return this.partyHandler.handlePlayerLeaveParty(sessionId);
  }
}
