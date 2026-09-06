import { Room, Client } from '@colyseus/core';
import { WorldState } from '../schemas/WorldState';
import { PlayerState } from '../schemas/PlayerState';
import { MonsterState } from '../schemas/MonsterState';
import { CombatEventSchema } from '../schemas/CombatEventSchema';
import { ChatMessageSchema } from '../schemas/ChatMessageSchema';
import { verifyAuthToken, VOCATION_CONFIGS } from '../../../auth/src';
import { experienceForLevel, calculateMaxStamina, tickStamina, canEnterHunt, addTrainingTries, vocationFor, initialHunts, type TrainableSkill, type GameContent } from '../../../domain/src';
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
  spells: (spellsJson as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};
import { persistenceManager } from '../persistence/PrismaPersistenceManager';
import { serverConfigManager } from '../config/ServerConfigManager';
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
  maxClients = 100;

  onCreate(options: any) {
    this.setState(new WorldState());
    this.state.regionName = 'thais-city';

    // Set 100ms deterministic server simulation tick (10 ticks / sec)
    this.setSimulationInterval((dt) => this.gameTick(dt), 100);

    // Apply dynamic server config rates and listen for changes in real-time (default 20000ms auto-save)
    const defaultSaveIntervalMs = 20000;
    this.maxClients = serverConfigManager.getConfig().maxClientsPerRoom;
    persistenceManager.startPeriodicSave(() => this.state.players.values(), serverConfigManager.getConfig().periodicSaveIntervalMs || defaultSaveIntervalMs);

    serverConfigManager.onChange((newConfig) => {
      this.maxClients = newConfig.maxClientsPerRoom;
      persistenceManager.startPeriodicSave(() => this.state.players.values(), newConfig.periodicSaveIntervalMs || defaultSaveIntervalMs);
      this.broadcast('server:config', newConfig);
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
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (data.outfit) player.outfit = data.outfit;
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
      if (player && (player.role === 'ADMIN' || player.role === 'admin') && typeof data.x === 'number' && typeof data.y === 'number') {
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
          memberPlayer.inHunt = true;
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
            memberPlayer.inHunt = true;
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
          memberPlayer.inHunt = false;
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

    this.onMessage('player:setInHunt', (client, data: { inHunt: boolean; huntId?: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const wantsHunt = Boolean(data.inHunt);
        if (data.huntId) {
          player.lastHuntId = data.huntId;
        }
        if (wantsHunt && !canEnterHunt(player.staminaMinutes)) {
          player.inHunt = false;
          client.send('stamina:empty', {
            message: 'Sua estamina acabou! Treine na zona de treinamento ou descanse para recuperar.',
          });
          return;
        }
        player.inHunt = wantsHunt;
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
        void persistenceManager.saveCharacter(player);
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
        void persistenceManager.saveCharacter(player);
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
    let mount = (options as any).mount || 'none';
    let mountActive = Boolean((options as any).mountActive);
    let loadedSkills: any[] = [];

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
        let loadedExperience = dbChar.experience !== undefined && dbChar.experience !== null
          ? Number(dbChar.experience)
          : experienceForLevel(level);
        loadedStaminaMinutes = dbChar.staminaMinutes ?? 15;
        loadedIsAutoIdle = dbChar.isAutoIdle ?? false;
        loadedLastHuntId = dbChar.lastHuntId ?? '';
        outfitLookType = (options as any).outfitLookType ?? dbChar.outfitLookType ?? 128;
        if (dbChar.vocationName && !(options as any).outfit) {
          outfitName = dbChar.vocationName;
        }
        if (typeof dbChar.outfitBody === 'number' && (dbChar.outfitBody > 0 || dbChar.outfitLegs > 0)) {
          outfitHead = dbChar.outfitHead;
          outfitBody = dbChar.outfitBody;
          outfitLegs = dbChar.outfitLegs;
          outfitFeet = dbChar.outfitFeet;
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
    player.name = charName || 'Hero';
    player.vocationId = safeVocationId;
    player.vocationName = vocation.name || 'Knight';
    player.level = level;
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

    player.inHunt = false;



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
        void persistenceManager.saveCharacter(existingPlayer);
        this.state.players.delete(existingSessionId);
      }
    }

    this.state.players.set(client.sessionId, player);
    if (typeof client.send === 'function') {
      client.send('server:config', serverConfigManager.getConfig());
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
      await persistenceManager.saveCharacter(player);
    }

    const idx = this.clients.indexOf(client);
    if (idx !== -1) {
      this.clients.splice(idx, 1);
    }
    this.handlePlayerLeaveParty(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  async onDispose() {
    persistenceManager.stopPeriodicSave();
    await persistenceManager.saveBatch(this.state.players.values());
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
    // Validate step cooldown (minimum 100ms between steps for city speed bonus)
    if (now - player.lastStepTime < 100) {
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

    if (spellId === 'exura' || spellId === 'exura-ico') {
      const manaCost = 20;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        const heal = 30 + Math.floor(Math.random() * 20);
        player.hp = Math.min(player.maxHp, player.hp + heal);

        this.pushCombatEvent('heal', player.id, player.id, heal, player.posX, player.posY, `+${heal}`, '#33ff33');
      }
    } else if (spellId === 'exori') {
      const manaCost = 115;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;

        this.pushCombatEvent('spell', player.id, '', 0, player.posX, player.posY, 'Exori!', '#ffff33');

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
    color: string
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

    const baseExp = baseExperienceMap[monster.monsterTypeId] ?? (monster.monsterTypeId === 'rotworm' ? 40 : 5);
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
        player.inHunt = false;
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
          player.inHunt = false;
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
          player.inHunt = true;

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


      if (this.state.serverTick % 3 === 0 && player.mp < player.maxMp) {
        const regenRate = serverConfigManager.getConfig().regenRate ?? 1.0;
        const regenAmount = Math.max(1, Math.round(1 * regenRate));
        player.mp = Math.min(player.maxMp, player.mp + regenAmount);
      }

      if (player.targetId && now - player.lastAttackTime >= player.attackCooldownMs) {
        const monster = this.state.monsters.get(player.targetId);
        if (monster && !monster.isDead) {
          const isAdjacent = Math.abs(monster.posX - player.posX) <= 1 && Math.abs(monster.posY - player.posY) <= 1;
          if (isAdjacent || player.vocationId === 3) {
            const rawDamage = 20 + Math.floor(Math.random() * 25);
            const damage = Math.max(1, rawDamage - monster.armorPower);
            monster.hp -= damage;
            player.lastAttackTime = now;

            // Advance character skill on attack
            const vocName = (player.vocationName || 'Knight') as VocationName;
            const primarySkill: TrainableSkill = player.vocationId === 2 ? 'magicLevel' : player.vocationId === 3 ? 'distance' : player.vocationId === 1 ? 'sword' : 'club';
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
              if (client) {
                client.send('skill:levelUp', { skill: primarySkill, level: targetSkillObj.value });
              }
            }

            this.pushCombatEvent('damage', player.id, monster.id, damage, monster.posX, monster.posY, `${damage}`, '#ff3333');

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
