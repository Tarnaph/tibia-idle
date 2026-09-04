import { Room, Client } from '@colyseus/core';
import { WorldState } from '../schemas/WorldState';
import { PlayerState } from '../schemas/PlayerState';
import { MonsterState } from '../schemas/MonsterState';
import { CombatEventSchema } from '../schemas/CombatEventSchema';
import { ChatMessageSchema } from '../schemas/ChatMessageSchema';
import { verifyAuthToken, VOCATION_CONFIGS } from '../../../auth/src';
import { persistenceManager } from '../persistence/PrismaPersistenceManager';
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

    // Start 30-second periodic auto-save to PostgreSQL
    persistenceManager.startPeriodicSave(() => this.state.players.values(), 30000);

    // Initial server-side monster spawns
    this.spawnInitialMonsters();

    // Message handlers
    this.onMessage('move', (client, data: { direction: 'north' | 'south' | 'east' | 'west' }) => {
      this.handlePlayerMove(client, data.direction);
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
  }

  async onJoin(client: Client, options: JoinOptions) {
    let accountId = 'acc-guest';
    let charId = `char-${client.sessionId}`;
    let charName = `Hero ${client.sessionId.slice(0, 4)}`;
    let vocationId = 4;
    let level = 8;
    let hp: number | undefined;
    let maxHp: number | undefined;
    let mp: number | undefined;
    let maxMp: number | undefined;
    let posX: number | undefined;
    let posY: number | undefined;
    let posZ: number | undefined;

    if (options.token) {
      try {
        const decoded = verifyAuthToken(options.token);
        accountId = decoded.accountId;
      } catch (err) {
        // Fallback for test or unauthenticated preview
      }
    }

    if (options.characterId) {
      const dbChar = await persistenceManager.loadCharacter(options.characterId);
      if (dbChar) {
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
      }
    } else if (options.mockCharacter) {
      charId = options.mockCharacter.id;
      accountId = options.mockCharacter.accountId || accountId;
      charName = options.mockCharacter.name;
      vocationId = options.mockCharacter.vocationId;
      level = options.mockCharacter.level;
    }

    const safeVocationId = Number(vocationId) || 4;
    const vocation = VOCATION_CONFIGS[safeVocationId] || VOCATION_CONFIGS[4] || {
      name: 'Knight',
      baseHp: 185,
      baseMp: 35,
      capacity: 470,
    };

    const player = new PlayerState();
    player.id = client.sessionId;
    player.characterId = charId;
    player.accountId = accountId;
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

    if (!this.clients.includes(client)) {
      (this.clients as any).push(client);
    }

    this.state.players.set(client.sessionId, player);
  }

  async onLeave(client: Client, code?: number | boolean) {
    const player = this.state.players.get(client.sessionId);
    const consented = typeof code === 'boolean' ? code : (code === 1000 || code === 4000);

    if (!consented) {
      try {
        // Allow 20s window for client reconnection upon F5 / connection loss
        await this.allowReconnection(client, 20);
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

  private handlePlayerMove(client: Client, direction: 'north' | 'south' | 'east' | 'west') {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const now = Date.now();
    // Validate step cooldown (minimum 150ms between steps)
    if (now - player.lastStepTime < 150) {
      return; // Anti-speedhack
    }

    let dx = 0;
    let dy = 0;
    if (direction === 'north') dy = -1;
    if (direction === 'south') dy = 1;
    if (direction === 'west') dx = -1;
    if (direction === 'east') dx = 1;

    const targetX = player.posX + dx;
    const targetY = player.posY + dy;

    // Boundary & Basic Wall Check for Thais Bounding Box
    if (targetX < 32280 || targetX > 32430 || targetY < 32170 || targetY > 32290) {
      return; // Out of bounds
    }

    player.direction = direction;
    player.posX = targetX;
    player.posY = targetY;
    player.isWalking = true;
    player.lastStepTime = now;
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

    const text = channel === 'yell' ? rawText.trim().toUpperCase() : rawText.trim();
    const timestamp = Date.now();

    const msg = new ChatMessageSchema();
    msg.id = `msg-${timestamp}-${Math.random()}`;
    msg.senderId = client.sessionId;
    msg.senderName = player.name;
    msg.text = text;
    msg.channel = channel;
    msg.timestamp = timestamp;

    this.state.chatMessages.push(msg);

    // Keep chat message history bounded (max 50 recent messages)
    if (this.state.chatMessages.length > 50) {
      this.state.chatMessages.shift();
    }

    // Distance routing for local and yell channels
    this.clients.forEach((c) => {
      const recipient = this.state.players.get(c.sessionId);
      if (!recipient) return;

      let canReceive = false;
      if (channel === 'global') {
        canReceive = true;
      } else if (channel === 'say') {
        canReceive = isWithinDistance(player.posX, player.posY, recipient.posX, recipient.posY, LOCAL_CHAT_RADIUS);
      } else if (channel === 'yell') {
        canReceive = isWithinDistance(player.posX, player.posY, recipient.posX, recipient.posY, YELL_CHAT_RADIUS);
      } else {
        canReceive = true;
      }

      if (canReceive && typeof c.send === 'function') {
        c.send('chat', {
          senderId: client.sessionId,
          senderName: player.name,
          text,
          channel,
          timestamp,
        });
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

    const xpGain = 40;
    killer.level += 1;

    this.pushCombatEvent('death', killer.id, monster.id, xpGain, monster.posX, monster.posY, `+${xpGain} XP`, '#ffffff');
  }

  private gameTick(deltaTimeMs: number) {
    this.state.serverTick += 1;
    const now = Date.now();

    // Player auto-attack & mana regen
    this.state.players.forEach((player: PlayerState) => {
      if (this.state.serverTick % 3 === 0 && player.mp < player.maxMp) {
        player.mp = Math.min(player.maxMp, player.mp + 1);
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
}
