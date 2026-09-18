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
  maxClients = 100;
  private autoSaveTimer: any = null;
  private activeSavePromise: Promise<void> | null = null;
  private isDisposed: boolean = false;
  private playerExpSync = new Map<string, { lastSyncTime: number; lastExperience: number }>();
  private pvpQueue = new Map<
    string,
    {
      sessionId: string;
      characterId: string;
      name: string;
      level: number;
      vocation: string;
      outfit?: string;
      outfitLookType?: number;
      hp?: number;
      maxHp?: number;
      attackPower?: number;
      defensePower?: number;
      armorPower?: number;
      elo: number;
      joinedAt: number;
      timeoutRef: any;
    }
  >();
  private activeDuels = new Map<
    string,
    {
      duelId: string;
      player1: { sessionId: string; characterId: string; name: string; spawn: { id: number; x: number; y: number; z: number } };
      player2: { sessionId: string; characterId: string; name: string; spawn: { id: number; x: number; y: number; z: number } };
      createdAt: number;
    }
  >();

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

  private async performRoomAutoSave(): Promise<void> {
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

    // Message handlers
    this.onMessage('move', (client, data: { direction?: 'north' | 'south' | 'east' | 'west'; dir?: 'north' | 'south' | 'east' | 'west'; x?: number; y?: number; z?: number }) => {
      const dir = data?.direction || data?.dir;
      if (dir) {
        this.handlePlayerMove(client, dir, data.x, data.y, data.z);
      }
    });

    this.onMessage('turn', (client, data: { direction?: 'north' | 'south' | 'east' | 'west'; dir?: 'north' | 'south' | 'east' | 'west' }) => {
      const dir = data?.direction || data?.dir;
      const player = this.state.players.get(client.sessionId);
      if (player && dir) {
        player.direction = dir;
      }
    });

    this.onMessage('changeOutfit', (client, data: {
      outfit?: string;
      lookType?: number;
      outfitColors?: { head: number; primary: number; secondary: number; detail: number };
      head?: number;
      body?: number;
      legs?: number;
      feet?: number;
      addons?: number;
      mount?: string;
      mountActive?: boolean;
      gender?: 'male' | 'female';
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (data.outfit) player.outfit = data.outfit;
      if (data.gender === 'male' || data.gender === 'female') player.gender = data.gender;
      if (data.lookType !== undefined) player.outfitLookType = data.lookType;
      if (data.outfitColors) {
        player.outfitHead = data.outfitColors.head;
        player.outfitBody = data.outfitColors.primary;
        player.outfitLegs = data.outfitColors.secondary;
        player.outfitFeet = data.outfitColors.detail;
      } else {
        if (data.head !== undefined) player.outfitHead = data.head;
        if (data.body !== undefined) player.outfitBody = data.body;
        if (data.legs !== undefined) player.outfitLegs = data.legs;
        if (data.feet !== undefined) player.outfitFeet = data.feet;
      }
      if (data.addons !== undefined) player.outfitAddons = data.addons;
      if (data.mount !== undefined) player.mount = data.mount;
      if (data.mountActive !== undefined) player.mountActive = data.mountActive;
    });

    this.onMessage('attack', (client, data: { targetId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.targetId = data.targetId || '';
      }
    });

    this.onMessage('castSpell', (client, data: { spellId: string }) => {
      this.handleCastSpell(client, data.spellId);
    });

    this.onMessage('chat', (client, data: { text: string; channel?: string }) => {
      this.handleChatMessage(client, data.text, data.channel || 'say');
    });

    // Party multiplayer messages
    this.onMessage('party:invite', (client) => {
      client.send('party:error', {
        message: 'O sistema de convites de party entre jogadores reais está temporariamente desativado.',
      });
    });

    this.onMessage('party:acceptInvite', (client, data: { inviterSessionId: string }) => {
      const inviterClient = this.clients.find((c) => c.sessionId === data.inviterSessionId);
      const inviterPlayer = this.state.players.get(data.inviterSessionId);
      const memberPlayer = this.state.players.get(client.sessionId);
      if (!inviterClient || !inviterPlayer || !memberPlayer) return;

      let leaderId = this.playerPartyLeader.get(data.inviterSessionId) || data.inviterSessionId;
      let party = this.parties.get(leaderId);
      if (!party) {
        party = {
          leaderSessionId: leaderId,
          leaderName: inviterPlayer.name,
          memberSessionIds: [leaderId],
        };
        this.parties.set(leaderId, party);
        this.playerPartyLeader.set(leaderId, leaderId);
      }

      if (!party.memberSessionIds.includes(client.sessionId)) {
        party.memberSessionIds.push(client.sessionId);
      }
      this.playerPartyLeader.set(client.sessionId, leaderId);

      this.broadcastPartySync(leaderId);
    });

    this.onMessage('party:rejectInvite', (client, data: { inviterSessionId: string }) => {
      const inviterClient = this.clients.find((c) => c.sessionId === data.inviterSessionId);
      const memberPlayer = this.state.players.get(client.sessionId);
      if (inviterClient && memberPlayer) {
        inviterClient.send('party:inviteRejected', {
          memberName: memberPlayer.name,
        });
      }
    });

    this.onMessage('party:leave', (client) => {
      this.handlePlayerLeaveParty(client.sessionId);
    });

    this.onMessage('player:teleport', (client, data: { x: number; y: number; z?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.role === 'ADMIN' && typeof data.x === 'number' && typeof data.y === 'number') {
        player.posX = data.x;
        player.posY = data.y;
        player.posZ = data.z ?? player.posZ;
        player.isWalking = false;
        player.lastStepTime = 0;
      }
    });

    this.onMessage('party:huntSync', (client, data: { huntId: string; seed?: string }) => {
      const leaderId = this.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      for (const memberId of party.memberSessionIds) {
        const memberPlayer = this.state.players.get(memberId);
        if (memberPlayer) {
          this.updatePlayerHuntContext(memberPlayer, true, data.huntId);
        }
        const memberClient = this.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntStarted', {
            huntId: data.huntId,
            seed: data.seed,
            leaderName: party.leaderName,
            leaderSessionId: party.leaderSessionId,
          });
        }
      }
    });

    this.onMessage('party:proposeHunt', (client, data: { huntId: string; huntName: string; seed?: string }) => {
      const leaderId = this.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      const proposal = {
        huntId: data.huntId,
        huntName: data.huntName,
        seed: data.seed || `seed-${Date.now()}`,
        leaderSessionId: client.sessionId,
        approvals: new Set<string>([client.sessionId]),
      };
      this.activeHuntProposals.set(leaderId, proposal);

      for (const memberId of party.memberSessionIds) {
        const memberClient = this.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntProposed', {
            huntId: data.huntId,
            huntName: data.huntName,
            leaderName: party.leaderName,
            leaderSessionId: party.leaderSessionId,
            acceptedSessionIds: Array.from(proposal.approvals),
            totalMembers: party.memberSessionIds.length,
          });
        }
      }
    });

    this.onMessage('party:acceptHuntProposal', (client) => {
      const leaderId = this.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.parties.get(leaderId);
      const proposal = this.activeHuntProposals.get(leaderId);
      if (!party || !proposal) return;

      proposal.approvals.add(client.sessionId);

      const acceptedList = Array.from(proposal.approvals);
      for (const memberId of party.memberSessionIds) {
        const memberClient = this.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntProposalSync', {
            huntId: proposal.huntId,
            huntName: proposal.huntName,
            acceptedSessionIds: acceptedList,
            totalMembers: party.memberSessionIds.length,
          });
        }
      }

      // If all members approved, automatically start the hunt!
      if (proposal.approvals.size >= party.memberSessionIds.length) {
        this.activeHuntProposals.delete(leaderId);
        for (const memberId of party.memberSessionIds) {
          const memberPlayer = this.state.players.get(memberId);
          if (memberPlayer) {
            this.updatePlayerHuntContext(memberPlayer, true, proposal.huntId);
          }
          const memberClient = this.clients.find((c) => c.sessionId === memberId);
          if (memberClient) {
            memberClient.send('party:huntStarted', {
              huntId: proposal.huntId,
              seed: proposal.seed,
              leaderName: party.leaderName,
              leaderSessionId: party.leaderSessionId,
            });
          }
        }
      }
    });

    this.onMessage('party:rejectHuntProposal', (client) => {
      const leaderId = this.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.parties.get(leaderId);
      const proposal = this.activeHuntProposals.get(leaderId);
      if (!party || !proposal) return;

      const rejector = this.state.players.get(client.sessionId);
      this.activeHuntProposals.delete(leaderId);

      for (const memberId of party.memberSessionIds) {
        const memberClient = this.clients.find((c) => c.sessionId === memberId);
        if (memberClient) {
          memberClient.send('party:huntProposalRejected', {
            rejectedByName: rejector?.name || 'Um membro',
            huntName: proposal.huntName,
          });
        }
      }
    });

    this.onMessage('party:huntExit', (client) => {
      const leaderId = this.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      // Teleport all party members and leader directly to Thais Temple
      for (const memberId of party.memberSessionIds) {
        const memberPlayer = this.state.players.get(memberId);
        if (memberPlayer) {
          memberPlayer.posX = 32369;
          memberPlayer.posY = 32241;
          memberPlayer.posZ = 7;
          memberPlayer.direction = 'south';
          memberPlayer.isWalking = false;
          memberPlayer.lastStepTime = 0;
          this.updatePlayerHuntContext(memberPlayer, false);
        }
        if (memberId !== client.sessionId) {
          const memberClient = this.clients.find((c) => c.sessionId === memberId);
          if (memberClient) {
            memberClient.send('party:huntExited', {
              x: 32369,
              y: 32241,
              z: 7,
            });
          }
        }
      }
    });

    this.onMessage('player:returnToCity', async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.characterId) return;

      try {
        const dbChar = await persistenceManager.loadCharacter(player.characterId);
        if (dbChar) {
          player.level = dbChar.level;
          player.experience = Number(dbChar.experience);
          player.hp = dbChar.health;
          player.maxHp = dbChar.maxHealth;
          player.mp = dbChar.mana;
          player.maxMp = dbChar.maxMana;
          player.capacity = dbChar.capacity;
          (player as any).saveVersion = (dbChar as any).saveVersion ?? 1;
          player.posX = dbChar.posX ?? 32369;
          player.posY = dbChar.posY ?? 32241;
          player.posZ = dbChar.posZ ?? 7;
          if (Array.isArray((dbChar as any).skills)) {
            (player as any).skills = (dbChar as any).skills.map((s: any) => ({
              skillId: s.skillId,
              skillName: s.skillName,
              value: s.value,
              tries: Number(s.tries ?? 0),
            }));
          }
          if ((dbChar as any).bestiaryKills) {
            (player as any).bestiaryKills = (dbChar as any).bestiaryKills;
          }
          if ((dbChar as any).trackedBestiaryId) {
            player.trackedBestiaryId = (dbChar as any).trackedBestiaryId;
          }
          if (typeof (dbChar as any).bossPoints === 'number') {
            (player as any).bossPoints = (dbChar as any).bossPoints;
          }
          if ((dbChar as any).avatarId) {
            player.avatarId = (dbChar as any).avatarId;
          }
        }
      } catch (err: any) {
        console.warn(`[ThaisCityRoom] Error syncing state from DB on player:returnToCity for ${player.characterId}:`, err?.message || err);
      }

      // Authoritatively clear hunt mode ONLY after adopting the persisted DB state
      this.updatePlayerHuntContext(player, false);
      this.playerExpSync.set(client.sessionId, { lastSyncTime: Date.now(), lastExperience: player.experience });
    });

    this.onMessage('player:setInHunt', async (client, data: { inHunt: boolean; huntId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const wantsHunt = Boolean(data.inHunt);
        if (data.huntId) {
          player.lastHuntId = data.huntId;
        }
        if (wantsHunt && !canEnterHunt(player.staminaMinutes)) {
          this.updatePlayerHuntContext(player, false);
          client.send('stamina:empty', {
            message: 'Sua estamina acabou! Treine na zona de treinamento ou descanse para recuperar.',
          });
          return;
        }

        if (!wantsHunt && player.characterId) {
          try {
            const dbChar = await persistenceManager.loadCharacter(player.characterId);
            if (dbChar) {
              player.level = dbChar.level;
              player.experience = Number(dbChar.experience);
              player.hp = dbChar.health;
              player.maxHp = dbChar.maxHealth;
              player.mp = dbChar.mana;
              player.maxMp = dbChar.maxMana;
              player.capacity = dbChar.capacity;
              (player as any).saveVersion = (dbChar as any).saveVersion ?? 1;
              if (Array.isArray((dbChar as any).skills)) {
                (player as any).skills = (dbChar as any).skills.map((s: any) => ({
                  skillId: s.skillId,
                  skillName: s.skillName,
                  value: s.value,
                  tries: Number(s.tries ?? 0),
                }));
              }
            }
          } catch {}
        }

        this.updatePlayerHuntContext(player, wantsHunt, data.huntId);
        if (wantsHunt && data.huntId) {
          if (data.huntId === 'pvp-arena') {
            player.posX = 33136;
            player.posY = 32969;
            player.posZ = 8;
          } else {
            const entrance = getHuntWorldEntrance(data.huntId, gameContent);
            player.posX = entrance.worldPosition.x;
            player.posY = entrance.worldPosition.y;
            player.posZ = entrance.worldPosition.z;
          }
          player.isWalking = false;
          player.lastStepTime = 0;
        }
        if (typeof client.send === 'function') {
          client.send('server:huntContextReady', { isHunting: wantsHunt, huntId: data.huntId });
        }
      }
    });

    // ==========================================
    // ARENA PVP: FILA DE JOGADORES ONLINE & DUELOS
    // ==========================================
    this.onMessage('pvp:queue:join', async (client, data?: { characterId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const charId = data?.characterId || player.characterId;
      if (!charId) return;

      // Se já estava na fila, cancela o timeout anterior
      if (this.pvpQueue.has(client.sessionId)) {
        const existing = this.pvpQueue.get(client.sessionId);
        if (existing?.timeoutRef) clearTimeout(existing.timeoutRef);
        this.pvpQueue.delete(client.sessionId);
      }

      // Procura outro jogador ONLINE na fila com rank similar (diferença <= 250 pontos)
      let matchedSessionId: string | null = null;
      const playerElo = (player as any).pvpElo ?? 0;

      for (const [sId, entry] of this.pvpQueue.entries()) {
        if (sId === client.sessionId || entry.characterId === charId) continue;

        // Confirma se o oponente ainda está na sala
        const oppClient = this.clients.find((c) => c.sessionId === sId);
        if (!oppClient) {
          if (entry.timeoutRef) clearTimeout(entry.timeoutRef);
          this.pvpQueue.delete(sId);
          continue;
        }

        const diff = Math.abs(entry.elo - playerElo);
        if (diff <= 250) {
          matchedSessionId = sId;
          break;
        }
      }

      if (matchedSessionId) {
        // MATCH FOUND!
        const oppEntry = this.pvpQueue.get(matchedSessionId)!;
        if (oppEntry.timeoutRef) clearTimeout(oppEntry.timeoutRef);
        this.pvpQueue.delete(matchedSessionId);

        const oppClient = this.clients.find((c) => c.sessionId === matchedSessionId);
        const duelId = `duel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        // Sorteio dos spawns oficiais (Spawn 1: 33136, 32965 vs Spawn 2: 33136, 32973)
        const isPlayerSpawn1 = Math.random() < 0.5;
        const spawn1 = isPlayerSpawn1 ? PVP_ARENA_SPAWNS[0] : PVP_ARENA_SPAWNS[1];
        const spawn2 = isPlayerSpawn1 ? PVP_ARENA_SPAWNS[1] : PVP_ARENA_SPAWNS[0];

        this.activeDuels.set(duelId, {
          duelId,
          player1: { sessionId: client.sessionId, characterId: charId, name: player.name, spawn: spawn1 },
          player2: { sessionId: oppEntry.sessionId, characterId: oppEntry.characterId, name: oppEntry.name, spawn: spawn2 },
          createdAt: Date.now(),
        });

        // Envia notificação com dados de teletransporte para ambos
        client.send('pvp:match:found', {
          duelId,
          spawn: spawn1,
          opponentSpawn: spawn2,
          opponent: {
            sessionId: oppEntry.sessionId,
            characterId: oppEntry.characterId,
            name: oppEntry.name,
            level: oppEntry.level,
            vocation: oppEntry.vocation,
            elo: oppEntry.elo,
            outfit: oppEntry.outfit,
            outfitLookType: oppEntry.outfitLookType,
            hp: oppEntry.hp,
            maxHp: oppEntry.maxHp,
            attackPower: oppEntry.attackPower,
            defensePower: oppEntry.defensePower,
            armorPower: oppEntry.armorPower,
          },
        });

        if (oppClient) {
          oppClient.send('pvp:match:found', {
            duelId,
            spawn: spawn2,
            opponentSpawn: spawn1,
            opponent: {
              sessionId: client.sessionId,
              characterId: charId,
              name: player.name,
              level: player.level,
              vocation: (player as any).vocationName || (player as any).vocation || 'Knight',
              elo: playerElo,
              outfit: (player as any).outfit || 'Knight',
              outfitLookType: (player as any).outfitLookType || 128,
              hp: player.hp,
              maxHp: player.maxHp,
              attackPower: player.attackPower,
              defensePower: player.defensePower,
              armorPower: player.armorPower,
            },
          });
        }
      } else {
        // Sem oponente imediato: entra na fila com temporizador de 18 segundos
        const timeoutRef = setTimeout(() => {
          if (this.pvpQueue.has(client.sessionId)) {
            this.pvpQueue.delete(client.sessionId);
            try {
              client.send('pvp:queue:timeout', {
                message: 'Nenhum oponente disponível no momento. Tente novamente em instantes!',
              });
            } catch {}
          }
        }, 18000);

        this.pvpQueue.set(client.sessionId, {
          sessionId: client.sessionId,
          characterId: charId,
          name: player.name,
          level: player.level,
          vocation: (player as any).vocationName || (player as any).vocation || 'Knight',
          outfit: (player as any).outfit || 'Knight',
          outfitLookType: (player as any).outfitLookType || 128,
          hp: player.hp,
          maxHp: player.maxHp,
          attackPower: player.attackPower,
          defensePower: player.defensePower,
          armorPower: player.armorPower,
          elo: playerElo,
          joinedAt: Date.now(),
          timeoutRef,
        });

        client.send('pvp:queue:searching', {
          timeoutSeconds: 18,
        });
      }
    });

    this.onMessage('pvp:queue:leave', (client) => {
      const entry = this.pvpQueue.get(client.sessionId);
      if (entry) {
        if (entry.timeoutRef) clearTimeout(entry.timeoutRef);
        this.pvpQueue.delete(client.sessionId);
      }
      client.send('pvp:queue:left', { success: true });
    });

    this.onMessage('pvp:duel:complete', async (client, data: { duelId: string; winnerCharacterId: string; loserCharacterId: string }) => {
      const duel = this.activeDuels.get(data?.duelId);
      if (!duel) return;
      this.activeDuels.delete(data.duelId);

      try {
        const winner = await persistenceManager.loadCharacter(data.winnerCharacterId);
        const loser = await persistenceManager.loadCharacter(data.loserCharacterId);

        let promoData: any = null;
        let newWinnerPoints = 0;

        if (winner) {
          const oldPoints = (winner as any).pvpElo ?? 0;
          newWinnerPoints = oldPoints + 20; // +20 pontos fixos
          const tierInfo = getPvPTierInfo(newWinnerPoints);
          promoData = checkRankPromotion(oldPoints, newWinnerPoints);

          await prisma.character.update({
            where: { id: winner.id },
            data: {
              pvpElo: newWinnerPoints,
              pvpTier: tierInfo.tier,
              pvpWins: ((winner as any).pvpWins ?? 0) + 1,
              arenaCoins: ((winner as any).arenaCoins ?? 0) + 15,
              displaySkull: newWinnerPoints >= 250 ? true : (winner as any).displaySkull,
            },
          });
        }

        if (loser) {
          await prisma.character.update({
            where: { id: loser.id },
            data: {
              pvpLosses: ((loser as any).pvpLosses ?? 0) + 1,
              arenaCoins: ((loser as any).arenaCoins ?? 0) + 5,
            },
          });
        }

        // Notifica ambos os combatentes sobre o encerramento do duelo
        const p1Client = this.clients.find((c) => c.sessionId === duel.player1.sessionId);
        const p2Client = this.clients.find((c) => c.sessionId === duel.player2.sessionId);

        const endPayload = {
          duelId: data.duelId,
          winnerCharacterId: data.winnerCharacterId,
          pointsAwarded: 20,
          promotion: promoData,
          returnCoords: { x: 32369, y: 32241, z: 7 }, // Thais Temple
        };

        if (p1Client) p1Client.send('pvp:duel:ended', endPayload);
        if (p2Client) p2Client.send('pvp:duel:ended', endPayload);
      } catch (err: any) {
        console.error('[ThaisCityRoom] Erro ao persistir resultado do duelo PvP:', err?.message || err);
      }
    });

    this.onMessage('player:toggleAutoIdle', (client, data?: { enabled?: boolean; huntId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (typeof data?.enabled === 'boolean') {
          player.isAutoIdle = data.enabled;
        } else {
          player.isAutoIdle = !player.isAutoIdle;
        }
        if (data?.huntId) {
          player.lastHuntId = data.huntId;
        }
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
        client.send('autoIdle:toggled', {
          isAutoIdle: player.isAutoIdle,
          lastHuntId: player.lastHuntId,
        });
      }
    });

    this.onMessage('player:setLastHuntId', (client, data: { huntId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && data?.huntId) {
        player.lastHuntId = data.huntId;
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });

    this.onMessage('player:syncProgress', (client, data: { level?: number; experience?: number; hp?: number; mp?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (typeof data.experience === 'number') {
          if (data.experience > player.experience) {
            const deltaExp = data.experience - player.experience;
            const now = Date.now();
            const charKey = player.characterId || client.sessionId;
            const check = XpRateLimiter.consume(charKey, deltaExp, now, { isHunting: Boolean(player.inHunt) });

            if (!check.allowed) {
              console.warn(
                `[Security] Suspicious XP gain via WebSocket for player ${player.name} (${player.characterId}): +${deltaExp} XP exceeds continuous time budget (max allowed: +${check.maxAllowed}). Rejected.`
              );
            } else {
              player.experience = data.experience;
              player.level = Math.max(1, levelForExperience(data.experience));
              if (player.characterId) {
                XpRateLimiter.recordAuthorizedExp(player.characterId, data.experience);
              }
            }
          }
        }
        if (typeof data.hp === 'number') {
          player.hp = Math.max(0, Math.min(data.hp, player.maxHp));
        }
        if (typeof data.mp === 'number') {
          player.mp = Math.max(0, Math.min(data.mp, player.maxMp));
        }
      }
    });

    this.onMessage('player:setAvatar', (client, data: { avatarId: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && typeof data?.avatarId === 'number') {
        player.avatarId = Math.max(1, Math.min(5, Math.floor(data.avatarId)));
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });


    this.onMessage('party:targetSync', (client, data: { targetId: string | null }) => {
      const leaderId = this.playerPartyLeader.get(client.sessionId);
      if (!leaderId) return;
      const party = this.parties.get(leaderId);
      if (!party || party.leaderSessionId !== client.sessionId) return;

      for (const memberId of party.memberSessionIds) {
        if (memberId !== client.sessionId) {
          const memberClient = this.clients.find((c) => c.sessionId === memberId);
          if (memberClient) {
            memberClient.send('party:targetUpdated', {
              targetId: data.targetId,
            });
          }
        }
      }
    });

    this.onMessage('bestiary:track', (client, data: { monsterId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.trackedBestiaryId = data?.monsterId || '';
        (player as any).trackedBestiaryId = player.trackedBestiaryId;
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });

    this.onMessage('bestiary:setKills', (client, data: { kills: Record<string, number> }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && data?.kills && typeof data.kills === 'object') {
        const current = (player as any).bestiaryKills || {};
        const updated = { ...current };
        for (const [k, v] of Object.entries(data.kills)) {
          if (typeof v === 'number') {
            updated[k] = Math.max(Number(current[k] || 0), v);
          }
        }
        (player as any).bestiaryKills = updated;
        if (!player.inHunt && !ServerCharacterContextRegistry.isHunting(player.characterId)) {
          void persistenceManager.saveCharacter(player);
        }
      }
    });

    this.onMessage('training:action', (client, data: { style?: string; effectId?: number; projectileId?: number | null; dummyPos?: { x: number; y: number; z: number } }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.inHunt) return;
      const targetPos = data.dummyPos || { x: 32349, y: 32221, z: 7 };
      this.pushCombatEvent(
        'training',
        player.id,
        'dummy',
        0,
        targetPos.x,
        targetPos.y,
        '',
        '#ffffff',
        data.projectileId || null,
        data.effectId || 10,
        player.posX,
        player.posY
      );
    });
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
        loadedAvatarId = (dbChar as any).avatarId ?? 1;
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

    // Authoritatively reconstruct active hunt context from persistent server record
    const activeHuntRecord = await persistenceManager.getActiveHuntSession(charId);
    let isConfirmedHunting = false;
    let confirmedHuntId: string | undefined = undefined;

    if (activeHuntRecord && activeHuntRecord.isHunting) {
      // Confirmed active hunt survived process restart or network disconnection
      isConfirmedHunting = true;
      confirmedHuntId = activeHuntRecord.huntId;
    }
    // Note: Browser options (options.inHunt) may request resumption, but cannot prove it alone without confirmed activeHuntRecord.

    if (isConfirmedHunting && confirmedHuntId) {
      player.lastHuntId = confirmedHuntId;
      this.updatePlayerHuntContext(player, true, confirmedHuntId);
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

  private handlePlayerMove(client: Client, direction: 'north' | 'south' | 'east' | 'west', clientX?: number, clientY?: number, clientZ?: number) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const now = Date.now();
    // Validate step cooldown (minimum 75ms between steps for city speed 500)
    // Phase 164: Anti-speedhack threshold adjusted to 75ms for 500 city speed (formerly now - player.lastStepTime < 100)
    if (now - player.lastStepTime < 75 /* now - player.lastStepTime < 100 */) {
      return; // Anti-speedhack
    }

    let dx = 0;
    let dy = 0;
    if (direction === 'north') dy = -1;
    if (direction === 'south') dy = 1;
    if (direction === 'west') dx = -1;
    if (direction === 'east') dx = 1;

    let targetX = player.posX + dx;
    let targetY = player.posY + dy;
    let targetZ = player.posZ;

    // If client provided matching nearby single-step coordinates, reconcile directly
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const dist = Math.hypot(clientX - player.posX, clientY - player.posY);
      if (dist <= 1.5) {
        targetX = clientX;
        targetY = clientY;
        if (typeof clientZ === 'number') targetZ = clientZ;
      }
    }

    // Boundary & Basic Wall Check for Thais Bounding Box
    if (targetX < 32280 || targetX > 32430 || targetY < 32170 || targetY > 32290) {
      return; // Out of bounds
    }

    player.direction = direction;
    player.posX = targetX;
    player.posY = targetY;
    player.posZ = targetZ;
    player.isWalking = true;
    player.lastStepTime = now;

    // If this player is a party leader, broadcast position to party members for follow mechanic
    const partyLeaderId = this.playerPartyLeader.get(client.sessionId);
    if (partyLeaderId === client.sessionId) {
      const party = this.parties.get(partyLeaderId);
      if (party) {
        for (const memberId of party.memberSessionIds) {
          if (memberId !== client.sessionId) {
            const memberClient = this.clients.find((c) => c.sessionId === memberId);
            if (memberClient) {
              memberClient.send('party:leaderMoved', {
                leaderSessionId: client.sessionId,
                x: targetX,
                y: targetY,
                z: targetZ,
                direction,
              });
            }
          }
        }
      }
    }
  }

  private handleCastSpell(client: Client, spellId: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const lowerSpell = spellId.toLowerCase().trim();

    if (lowerSpell === 'exura' || lowerSpell === 'exura-ico' || lowerSpell === 'exura ico') {
      const manaCost = 20;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        const heal = 30 + Math.floor(Math.random() * 20);
        player.hp = Math.min(player.maxHp, player.hp + heal);

        this.pushCombatEvent('heal', player.id, player.id, heal, player.posX, player.posY, 'Exura', '#33ff33', null, 13);
      }
    } else if (lowerSpell === 'exura gran' || lowerSpell === 'exura-gran') {
      const manaCost = 70;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        const heal = 80 + Math.floor(Math.random() * 60);
        player.hp = Math.min(player.maxHp, player.hp + heal);

        this.pushCombatEvent('spell', player.id, player.id, heal, player.posX, player.posY, 'Exura Gran', '#55ff55', null, 13);
      }
    } else if (lowerSpell === 'exura vita' || lowerSpell === 'exura-vita') {
      const manaCost = 160;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        const heal = player.maxHp;
        player.hp = Math.min(player.maxHp, player.hp + heal);

        this.pushCombatEvent('spell', player.id, player.id, heal, player.posX, player.posY, 'Exura Vita', '#55ff55', null, 13);
      }
    } else if (lowerSpell === 'utani hur' || lowerSpell === 'utani-hur' || lowerSpell === 'speed' || lowerSpell === 'haste') {
      const manaCost = 60;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        player.hasteUntil = Date.now() + 33000;
        this.pushCombatEvent('spell', player.id, player.id, 0, player.posX, player.posY, 'Utani Hur', '#ffff00', null, 15);
      }
    } else if (lowerSpell === 'utani gran hur' || lowerSpell === 'utani-gran-hur' || lowerSpell === 'strong haste') {
      const manaCost = 100;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        player.hasteUntil = Date.now() + 33000;
        this.pushCombatEvent('spell', player.id, player.id, 0, player.posX, player.posY, 'Utani Gran Hur', '#ffff00', null, 15);
      }
    } else if (lowerSpell === 'utamo vita' || lowerSpell === 'utamo-vita' || lowerSpell === 'magic shield' || lowerSpell === '44') {
      const manaCost = 50;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        player.magicShieldUntil = Date.now() + 200000;
        this.pushCombatEvent('spell', player.id, player.id, 0, player.posX, player.posY, 'Utamo Vita', '#33ffff', null, 13);
      }
    } else if (lowerSpell === 'exevo-flam-hur' || lowerSpell === '19' || lowerSpell === 'exevo flam hur' || lowerSpell === 'fire-wave') {
      const manaCost = 25;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        this.pushCombatEvent('spell', player.id, '', 0, player.posX, player.posY, 'Exevo flam hur!', '#ff6600', null, 16);

        const dir = (player.direction || 'south') as 'north' | 'south' | 'east' | 'west';
        const waveTiles = getWave4Tiles({ x: player.posX, y: player.posY, z: player.posZ }, dir);
        const waveTileSet = new Set(waveTiles.map((t) => `${t.x},${t.y}`));

        // Emit hit by fire (effectId: 16) on each of the 17 tiles in the wave
        for (const tile of waveTiles) {
          this.pushCombatEvent('spell_area', player.id, '', 0, tile.x, tile.y, '', '#ff6600', null, 16);
        }

        // Damage any monsters inside the wave cone
        this.state.monsters.forEach((monster: MonsterState) => {
          if (!monster.isDead && waveTileSet.has(`${monster.posX},${monster.posY}`)) {
            const rawDamage = 35 + Math.floor(Math.random() * 30) + Math.floor(player.level * 0.2);
            const damage = Math.max(1, rawDamage - monster.armorPower);
            monster.hp -= damage;
            this.pushCombatEvent('damage', player.id, monster.id, damage, monster.posX, monster.posY, `${damage}`, '#ff3333');

            if (monster.hp <= 0) {
              this.killMonster(monster, player);
            }
          }
        });

        // Skill advance magicLevel
        const vocName = (player.vocationName || 'Sorcerer') as VocationName;
        const vocDef = vocationFor(gameContent, vocName);
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    } else if (lowerSpell === 'exori' || lowerSpell === 'berserk') {
      const manaCost = 115;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        this.pushCombatEvent('spell', player.id, '', 0, player.posX, player.posY, 'Exori!', '#ffff33', null, 10);

        // Hit all adjacent monsters in 3x3
        this.state.monsters.forEach((monster: MonsterState) => {
          if (!monster.isDead && Math.abs(monster.posX - player.posX) <= 1 && Math.abs(monster.posY - player.posY) <= 1) {
            const damage = 40 + Math.floor(Math.random() * 35);
            monster.hp -= damage;
            this.pushCombatEvent('damage', player.id, monster.id, damage, monster.posX, monster.posY, `${damage}`, '#ff3333');

            if (monster.hp <= 0) {
              this.killMonster(monster, player);
            }
          }
        });
      }
    } else if (
      lowerSpell === 'exori flam' ||
      lowerSpell === 'exori-flam' ||
      lowerSpell === 'flame strike' ||
      lowerSpell === '89'
    ) {
      const manaCost = 20;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        let targetMonster: MonsterState | null = null;
        if (player.targetId) {
          const m = this.state.monsters.get(player.targetId);
          if (m && !m.isDead && Math.hypot(m.posX - player.posX, m.posY - player.posY) <= 4) {
            targetMonster = m;
          }
        }
        if (!targetMonster) {
          let minDist = 99;
          this.state.monsters.forEach((m) => {
            if (!m.isDead) {
              const d = Math.hypot(m.posX - player.posX, m.posY - player.posY);
              if (d <= 3 && d < minDist) {
                minDist = d;
                targetMonster = m;
              }
            }
          });
        }

        const targetX = targetMonster ? targetMonster.posX : player.posX;
        const targetY = targetMonster ? targetMonster.posY : player.posY;
        const targetId = targetMonster ? targetMonster.id : player.id;

        // Projectile 4 (CONST_ANI_FIRE), Effect 37 (CONST_ME_FIREATTACK)
        this.pushCombatEvent('spell', player.id, targetId, 0, targetX, targetY, 'Exori Flam', '#ff6600', 4, 37, player.posX, player.posY);

        if (targetMonster) {
          const rawDamage = 30 + Math.floor(Math.random() * 25) + Math.floor(player.level * 0.2);
          const damage = Math.max(1, rawDamage - (targetMonster as MonsterState).armorPower);
          (targetMonster as MonsterState).hp -= damage;

          this.pushCombatEvent('damage', player.id, (targetMonster as MonsterState).id, damage, targetX, targetY, `${damage}`, '#ff6600', 4, 37, player.posX, player.posY);

          if ((targetMonster as MonsterState).hp <= 0) {
            this.killMonster(targetMonster as MonsterState, player);
          }
        }

        const vocName = (player.vocationName || 'Sorcerer') as VocationName;
        const vocDef = vocationFor(gameContent, vocName);
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    } else if (
      lowerSpell === 'exori vis' ||
      lowerSpell === 'exori-vis' ||
      lowerSpell === 'energy strike' ||
      lowerSpell === '25' ||
      lowerSpell === '88'
    ) {
      const manaCost = 20;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        let targetMonster: MonsterState | null = null;
        if (player.targetId) {
          const m = this.state.monsters.get(player.targetId);
          if (m && !m.isDead && Math.hypot(m.posX - player.posX, m.posY - player.posY) <= 4) {
            targetMonster = m;
          }
        }
        if (!targetMonster) {
          let minDist = 99;
          this.state.monsters.forEach((m) => {
            if (!m.isDead) {
              const d = Math.hypot(m.posX - player.posX, m.posY - player.posY);
              if (d <= 3 && d < minDist) {
                minDist = d;
                targetMonster = m;
              }
            }
          });
        }

        const targetX = targetMonster ? targetMonster.posX : player.posX;
        const targetY = targetMonster ? targetMonster.posY : player.posY;
        const targetId = targetMonster ? targetMonster.id : player.id;

        // Projectile 5 (CONST_ANI_ENERGY), Effect 38 (CONST_ME_ENERGYAREA)
        this.pushCombatEvent('spell', player.id, targetId, 0, targetX, targetY, 'Exori Vis', '#33ffff', 5, 38, player.posX, player.posY);

        if (targetMonster) {
          const rawDamage = 30 + Math.floor(Math.random() * 25) + Math.floor(player.level * 0.2);
          const damage = Math.max(1, rawDamage - (targetMonster as MonsterState).armorPower);
          (targetMonster as MonsterState).hp -= damage;

          this.pushCombatEvent('damage', player.id, (targetMonster as MonsterState).id, damage, targetX, targetY, `${damage}`, '#33ffff', 5, 38, player.posX, player.posY);

          if ((targetMonster as MonsterState).hp <= 0) {
            this.killMonster(targetMonster as MonsterState, player);
          }
        }

        const vocName = (player.vocationName || 'Sorcerer') as VocationName;
        const vocDef = vocationFor(gameContent, vocName);
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    } else if (
      lowerSpell === 'exori hur' ||
      lowerSpell === 'exori-hur' ||
      lowerSpell === 'whirlwind throw' ||
      lowerSpell === '107'
    ) {
      const manaCost = 40;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        let targetMonster: MonsterState | null = null;
        if (player.targetId) {
          const m = this.state.monsters.get(player.targetId);
          if (m && !m.isDead && Math.hypot(m.posX - player.posX, m.posY - player.posY) <= 5) {
            targetMonster = m;
          }
        }
        if (!targetMonster) {
          let minDist = 99;
          this.state.monsters.forEach((m) => {
            if (!m.isDead) {
              const d = Math.hypot(m.posX - player.posX, m.posY - player.posY);
              if (d <= 5 && d < minDist) {
                minDist = d;
                targetMonster = m;
              }
            }
          });
        }

        const targetX = targetMonster ? targetMonster.posX : player.posX;
        const targetY = targetMonster ? targetMonster.posY : player.posY;
        const targetId = targetMonster ? targetMonster.id : player.id;

        // Projectile 24 (CONST_ANI_WHIRLWINDSWORD), Effect 10 (CONST_ME_HITAREA)
        this.pushCombatEvent('spell', player.id, targetId, 0, targetX, targetY, 'Exori Hur', '#dedede', 24, 10, player.posX, player.posY);

        if (targetMonster) {
          const rawDamage = 35 + Math.floor(Math.random() * 30) + Math.floor(player.level * 0.2);
          const damage = Math.max(1, rawDamage - (targetMonster as MonsterState).armorPower);
          (targetMonster as MonsterState).hp -= damage;

          this.pushCombatEvent('damage', player.id, (targetMonster as MonsterState).id, damage, targetX, targetY, `${damage}`, '#ffffff', 24, 10, player.posX, player.posY);

          if ((targetMonster as MonsterState).hp <= 0) {
            this.killMonster(targetMonster as MonsterState, player);
          }
        }

        const vocName = (player.vocationName || 'Knight') as VocationName;
        const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
        const magicTries = manaCost * gameContent.rateMagic * skillRate;
        let charSkills = (player as any).skills;
        if (Array.isArray(charSkills)) {
          let mlObj = charSkills.find((s: any) => s.skillId === 7);
          if (mlObj) {
            mlObj.tries = (mlObj.tries || 0) + magicTries;
          }
        }
      }
    }
  }


  private handleChatMessage(client: Client, rawText: string, channel: string) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !rawText.trim()) return;

    const rawTrimmed = rawText.trim();
    const timestamp = Date.now();

    // Check if message is a private whisper (*Recipient* message or /w Recipient message or /tell Recipient message)
    const starMatch = rawTrimmed.match(/^\*([^*]+)\*\s*(.*)$/);
    const slashMatch = rawTrimmed.match(/^\/(?:w|whisper|tell|msg)\s+(?:"([^"]+)"|(\S+))\s*(.*)$/i);

    if (starMatch || slashMatch) {
      let targetName = (starMatch ? starMatch[1] : (slashMatch![1] || slashMatch![2])).trim();
      let whisperContent = (starMatch ? starMatch[2] : slashMatch![3]).trim();

      // Find recipient among connected players
      let recipientClient: Client | null = null;
      let recipientPlayer: any = null;

      for (const [sid, p] of this.state.players.entries()) {
        if (p.name.trim().toLowerCase() === targetName.toLowerCase()) {
          recipientPlayer = p;
          recipientClient = this.clients.find((c) => c.sessionId === sid) || null;
          break;
        }
      }

      // Fallback: If slash command was used without quotes and targetName was split on space, check if any online player name matches start of text
      if (!recipientPlayer && slashMatch && !slashMatch[1]) {
        const afterCmd = rawTrimmed.replace(/^\/(?:w|whisper|tell|msg)\s+/i, '').trim();
        for (const [sid, p] of this.state.players.entries()) {
          const pNameLower = p.name.trim().toLowerCase();
          if (afterCmd.toLowerCase().startsWith(pNameLower)) {
            recipientPlayer = p;
            recipientClient = this.clients.find((c) => c.sessionId === sid) || null;
            targetName = p.name;
            whisperContent = afterCmd.slice(p.name.length).trim();
            break;
          }
        }
      }

      if (!whisperContent) {
        if (typeof client.send === 'function') {
          client.send('chat', {
            id: `sys-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'Servidor',
            text: `Por favor, digite a mensagem a ser enviada para ${targetName}.`,
            channel: 'whisper',
            timestamp,
          });
        }
        return;
      }

      if (targetName.toLowerCase() === player.name.trim().toLowerCase()) {
        if (typeof client.send === 'function') {
          client.send('chat', {
            id: `sys-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'Servidor',
            text: 'Você não pode enviar mensagens privadas para seu próprio personagem.',
            channel: 'whisper',
            timestamp,
          });
        }
        return;
      }

      const msgId = `whisper-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

      if (recipientClient && recipientPlayer && typeof recipientClient.send === 'function') {
        // Send to recipient
        const recipientPayload = {
          id: msgId,
          senderId: client.sessionId,
          senderName: player.name,
          senderTitle: player.adminTitle || '',
          recipientName: recipientPlayer.name,
          text: whisperContent,
          channel: 'whisper',
          timestamp,
        };
        recipientClient.send('chat', recipientPayload);

        // Send to sender for local chat history confirmation
        if (typeof client.send === 'function') {
          const senderPayload = {
            id: msgId,
            senderId: client.sessionId,
            senderName: player.name,
            senderTitle: player.adminTitle || '',
            recipientName: recipientPlayer.name,
            text: whisperContent,
            channel: 'whisper',
            timestamp,
          };
          client.send('chat', senderPayload);
        }
      } else {
        // Recipient not found online
        if (typeof client.send === 'function') {
          client.send('chat', {
            id: `sys-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'Servidor',
            senderTitle: '',
            text: `Personagem "${targetName}" não está online no momento.`,
            channel: 'whisper',
            timestamp,
          });
        }
      }

      // Whisper handled privately; do not broadcast to public room or world chat
      return;
    }

    const normalizedChannel =
      channel === 'world' || channel === 'global' ? 'world' :
      channel === 'yell' ? 'yell' : 'local';

    const text = normalizedChannel === 'yell' ? rawTrimmed.toUpperCase() : rawTrimmed;

    const msg = new ChatMessageSchema();
    msg.id = `msg-${timestamp}-${Math.random()}`;
    msg.senderId = client.sessionId;
    msg.senderName = player.name;
    msg.senderTitle = player.adminTitle || '';
    msg.text = text;
    msg.channel = normalizedChannel;
    msg.timestamp = timestamp;

    this.state.chatMessages.push(msg);

    // Keep chat message history bounded (max 50 recent messages)
    if (this.state.chatMessages.length > 50) {
      this.state.chatMessages.shift();
    }

    // Distance routing for local and yell channels
    this.clients.forEach((c) => {
      try {
        const recipient = this.state.players.get(c.sessionId);
        if (!recipient) return;

        let canReceive = false;
        if (c.sessionId === client.sessionId) {
          canReceive = true;
        } else if (normalizedChannel === 'world') {
          canReceive = true;
        } else if (normalizedChannel === 'local') {
          const localRadius = serverConfigManager.getConfig().localChatRadius || LOCAL_CHAT_RADIUS;
          canReceive =
            player.posZ === recipient.posZ &&
            (isWithinDistance(player.posX, player.posY, recipient.posX, recipient.posY, localRadius) ||
             isInViewport(player.posX, player.posY, recipient.posX, recipient.posY));
        } else if (normalizedChannel === 'yell') {
          const yellRadius = serverConfigManager.getConfig().yellChatRadius || YELL_CHAT_RADIUS;
          canReceive = isWithinDistance(player.posX, player.posY, recipient.posX, recipient.posY, yellRadius);
        } else {
          canReceive = true;
        }

        if (canReceive && typeof c.send === 'function') {
          const payload = {
            id: msg.id,
            senderId: client.sessionId,
            senderName: player.name,
            senderTitle: player.adminTitle || '',
            text,
            channel: normalizedChannel,
            timestamp,
          };
          c.send('chat', payload);
          c.send('chat_message', payload);
        }
      } catch (err) {
        // Safe ignore broken socket on stale client
      }
    });
  }

  private pushCombatEvent(
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
  ) {
    const event = new CombatEventSchema();
    event.id = `evt-${Date.now()}-${Math.random()}`;
    event.type = type;
    event.sourceId = sourceId;
    event.targetId = targetId;
    event.value = value;
    event.posX = posX;
    event.posY = posY;
    event.text = text;
    event.color = color;
    if (typeof projectileId === 'number') event.projectileId = projectileId;
    if (typeof effectId === 'number') event.effectId = effectId;
    event.timestamp = Date.now();

    this.state.combatEvents.push(event);
    if (this.state.combatEvents.length > 30) {
      this.state.combatEvents.shift();
    }

    // Broadcast combat event only to players who see the event in their viewport
    this.clients.forEach((c) => {
      const recipient = this.state.players.get(c.sessionId);
      if (recipient && isInViewport(posX, posY, recipient.posX, recipient.posY) && typeof c.send === 'function') {
        c.send('combatEvent', {
          type,
          sourceId,
          targetId,
          value,
          posX,
          posY,
          fromX: typeof fromX === 'number' ? fromX : posX,
          fromY: typeof fromY === 'number' ? fromY : posY,
          projectileId: projectileId ?? null,
          effectId: effectId ?? null,
          text,
          color,
          timestamp: event.timestamp,
        });
      }
    });
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

  private killMonster(monster: MonsterState, killer: PlayerState) {
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

    if (xpGain > 0) {
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


      // Vocation-based HP & MP Regeneration
      const vocName = (player.vocationName || 'Knight') as VocationName;
      try {
        const vocDef = vocationFor(gameContent, vocName);
        const hpTicks = Math.max(1, vocDef.healthGainTicks ?? 6);
        const mpTicks = Math.max(1, vocDef.manaGainTicks ?? 3);
        if (this.state.serverTick % hpTicks === 0 && player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + (vocDef.healthGainAmount ?? 1));
        }
        if (this.state.serverTick % mpTicks === 0 && player.mp < player.maxMp) {
          player.mp = Math.min(player.maxMp, player.mp + (vocDef.manaGainAmount ?? 2));
        }
      } catch {
        if (this.state.serverTick % 3 === 0 && player.mp < player.maxMp) {
          player.mp = Math.min(player.maxMp, player.mp + 2);
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

  public broadcastPartySync(leaderId: string) {
    const party = this.parties.get(leaderId);
    if (!party) return;

    const membersInfo = party.memberSessionIds.map((sessionId) => {
      const p = this.state.players.get(sessionId);
      return {
        sessionId,
        characterId: p?.characterId || sessionId,
        name: p?.name || 'Jogador',
        vocationId: p?.vocationId || 1,
        vocationName: p?.vocationName || 'Knight',
        level: p?.level || 1,
        hp: p?.hp || 100,
        maxHp: p?.maxHp || 100,
        mp: p?.mp || 35,
        maxMp: p?.maxMp || 35,
        outfit: p?.outfit || 'Knight',
        outfitLookType: p?.outfitLookType || 128,
        outfitColors: {
          head: p?.outfitHead ?? 0,
          primary: p?.outfitBody ?? 86,
          secondary: p?.outfitLegs ?? 114,
          detail: p?.outfitFeet ?? 76,
        },
        mount: p?.mount || 'none',
        mountActive: Boolean(p?.mountActive),
        inHunt: Boolean(p?.inHunt),
        x: p?.posX || 32369,
        y: p?.posY || 32241,
        z: p?.posZ || 7,
        isLeader: sessionId === party.leaderSessionId,
      };
    });

    for (const memberId of party.memberSessionIds) {
      const memberClient = this.clients.find((c) => c.sessionId === memberId);
      if (memberClient) {
        memberClient.send('party:sync', {
          leaderSessionId: party.leaderSessionId,
          leaderName: party.leaderName,
          members: membersInfo,
        });
      }
    }
  }

  public handlePlayerLeaveParty(sessionId: string) {
    const leaderId = this.playerPartyLeader.get(sessionId);
    if (!leaderId) return;

    const party = this.parties.get(leaderId);
    this.playerPartyLeader.delete(sessionId);

    const leavingClient = this.clients.find((c) => c.sessionId === sessionId);
    if (leavingClient) {
      leavingClient.send('party:left', {});
    }

    if (party) {
      if (party.leaderSessionId === sessionId) {
        // Leader left, disband party for all members
        for (const memberId of party.memberSessionIds) {
          if (memberId !== sessionId) {
            this.playerPartyLeader.delete(memberId);
            const memberClient = this.clients.find((c) => c.sessionId === memberId);
            if (memberClient) {
              memberClient.send('party:disbanded', { reason: 'O líder da party se desconectou ou saiu do grupo.' });
            }
          }
        }
        this.parties.delete(leaderId);
      } else {
        // Regular member left
        party.memberSessionIds = party.memberSessionIds.filter((id) => id !== sessionId);
        this.broadcastPartySync(leaderId);
      }
    }
  }
}
