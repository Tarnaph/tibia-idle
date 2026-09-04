import { Room, Client } from '@colyseus/core';
import { WorldState } from '../schemas/WorldState';
import { PlayerState } from '../schemas/PlayerState';
import { MonsterState } from '../schemas/MonsterState';
import { verifyAuthToken, VOCATION_CONFIGS } from '../../../auth/src';

export interface JoinOptions {
  token?: string;
  characterId?: string;
  // Fallback / Testing character mock
  mockCharacter?: {
    id: string;
    accountId: string;
    name: string;
    vocationId: number;
    level: number;
  };
}

export class ThaisCityRoom extends Room<{ state: WorldState }> {
  maxClients = 100;

  onCreate(options: any) {
    this.setState(new WorldState());
    this.state.regionName = 'thais-city';

    // Set 100ms deterministic server simulation tick (10 ticks / sec)
    this.setSimulationInterval((dt) => this.gameTick(dt), 100);

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
      const player = this.state.players.get(client.sessionId);
      if (player && data.text) {
        this.broadcast('chat', {
          senderId: client.sessionId,
          senderName: player.name,
          text: data.text,
          channel: data.channel || 'say',
          timestamp: Date.now(),
        });
      }
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    let accountId = 'acc-guest';
    let charId = `char-${client.sessionId}`;
    let charName = `Hero ${client.sessionId.slice(0, 4)}`;
    let vocationId = 4;
    let level = 8;

    if (options.token) {
      try {
        const decoded = verifyAuthToken(options.token);
        accountId = decoded.accountId;
      } catch (err) {
        // Fallback for test or unauthenticated preview
      }
    }

    if (options.mockCharacter) {
      charId = options.mockCharacter.id;
      accountId = options.mockCharacter.accountId || accountId;
      charName = options.mockCharacter.name;
      vocationId = options.mockCharacter.vocationId;
      level = options.mockCharacter.level;
    }

    const vocation = VOCATION_CONFIGS[vocationId] || VOCATION_CONFIGS[4];

    const player = new PlayerState();
    player.id = client.sessionId;
    player.characterId = charId;
    player.accountId = accountId;
    player.name = charName;
    player.vocationId = vocationId;
    player.vocationName = vocation.name;
    player.level = level;
    player.hp = vocation.baseHp;
    player.maxHp = vocation.baseHp;
    player.mp = vocation.baseMp;
    player.maxMp = vocation.baseMp;
    player.capacity = vocation.capacity;
    player.posX = 32369;
    player.posY = 32241;
    player.posZ = 7;
    player.direction = 'south';

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, code?: number) {
    this.state.players.delete(client.sessionId);
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
        this.broadcast('combatEvent', {
          type: 'heal',
          targetId: player.id,
          value: heal,
          spellName: spellId,
        });
      }
    } else if (spellId === 'exori') {
      const manaCost = 115;
      if (player.mp >= manaCost) {
        player.mp -= manaCost;
        // Hit all adjacent monsters in 3x3
        this.state.monsters.forEach((monster: MonsterState) => {
          if (!monster.isDead && Math.abs(monster.posX - player.posX) <= 1 && Math.abs(monster.posY - player.posY) <= 1) {
            const damage = 40 + Math.floor(Math.random() * 35);
            monster.hp -= damage;
            this.broadcast('combatEvent', {
              type: 'damage',
              targetId: monster.id,
              value: damage,
              spellName: 'exori',
            });
            if (monster.hp <= 0) {
              this.killMonster(monster, player);
            }
          }
        });
      }
    }
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

    // Experience award
    const xpGain = 40;
    killer.level += 1; // Simplify level advancement test

    this.broadcast('combatEvent', {
      type: 'death',
      targetId: monster.id,
      killerId: killer.id,
      xpGain,
    });
  }

  private gameTick(deltaTimeMs: number) {
    this.state.serverTick += 1;
    const now = Date.now();

    // Player auto-attack & mana regen
    this.state.players.forEach((player: PlayerState) => {
      // Mana regen (1 MP per 3 ticks)
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

            this.broadcast('combatEvent', {
              type: 'damage',
              targetId: monster.id,
              value: damage,
            });

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
