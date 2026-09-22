import { Room, Client } from '@colyseus/core';
import { WorldState } from '../schemas/WorldState';
import { PlayerState } from '../schemas/PlayerState';
import { MonsterState } from '../schemas/MonsterState';
import { CombatEventSchema } from '../schemas/CombatEventSchema';
import { verifyAuthToken, VOCATION_CONFIGS, ServerCharacterContextRegistry } from '../../../auth/src';
import { experienceForLevel, levelForExperience, calculateStatsForLevel, initialHunts, type GameContent } from '../../../domain/src';
import vocationsJson from '../../../../content/generated/vocations.json';
import equipmentJson from '../../../../content/generated/equipment.json';
import monstersJson from '../../../../content/generated/monsters.json';
import startersJson from '../../../../content/generated/starter-loadouts.json';
import spellsJson from '../../../../content/generated/spells.json';
import huntRegionsJson from '../../../../content/generated/hunt-regions.json';
import economyJson from '../../../../content/generated/item-economy.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '../../../content-schema/src';
import { persistenceManager } from '../persistence/PrismaPersistenceManager';

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

export interface HuntJoinOptions {
  token?: string;
  characterId?: string;
  huntId?: string;
  outfit?: string;
  outfitColors?: { head?: number; primary?: number; secondary?: number; detail?: number };
  mount?: string;
  mountActive?: boolean;
}

export class HuntDungeonRoom extends Room<WorldState> {
  maxClients = 50;
  public huntId: string = 'cyclops-camp';
  private autoSaveTimer: any = null;
  private simulationTimer: any = null;
  private nextEventId: number = 1;

  onCreate(options: any) {
    this.setState(new WorldState());
    this.huntId = options.huntId || 'cyclops-camp';
    this.state.regionName = `hunt:${this.huntId}`;

    // Initialize dungeon monsters for this hunt
    this.spawnDungeonMonsters();

    // Setup authoritative game simulation loop (100ms ticks = 10 ticks/sec)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 100);

    // Setup periodic authoritative database save (every 25 seconds)
    this.autoSaveTimer = setInterval(() => {
      this.saveAllPlayers();
    }, 25000);

    this.registerMessageHandlers();
    console.log(`[HuntDungeonRoom] Masmorra autoritativa '${this.huntId}' iniciada com sucesso.`);
  }

  private registerMessageHandlers() {
    // Attack / Focus target
    this.onMessage('attack', (client, data: { targetId: string | null }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.targetId = data.targetId || '';
      }
    });

    // Move within dungeon
    this.onMessage('move', (client, data: { direction: string; x?: number; y?: number; z?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (data.direction) player.direction = data.direction;
        if (typeof data.x === 'number') player.posX = data.x;
        if (typeof data.y === 'number') player.posY = data.y;
        if (typeof data.z === 'number') player.posZ = data.z;
        player.isWalking = true;
        player.lastStepTime = Date.now();
      }
    });

    // Cast spell or potion
    this.onMessage('castSpell', (client, data: { spellId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && data.spellId) {
        this.handlePlayerSpell(player, data.spellId);
      }
    });

    // Request leave hunt
    this.onMessage('leaveHunt', async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        await persistenceManager.saveCharacter(player, { allowInHunt: true });
        player.inHunt = false;
        ServerCharacterContextRegistry.setActivity(player.characterId, { isHunting: false });
      }
      client.send('server:leaveHuntConfirmed', { success: true });
    });
  }

  async onJoin(client: Client, options: HuntJoinOptions) {
    let accountId = 'acc-guest';
    let charId = options.characterId || `char-${client.sessionId.substring(0, 8)}`;
    let charName = 'Aventureiro';
    let vocationId = 4;
    let level = 1;
    let experience = 0;
    let hp = 150;
    let maxHp = 150;
    let mp = 35;
    let maxMp = 35;

    // Verify JWT if token is provided
    if (options.token) {
      const auth = verifyAuthToken(options.token);
      if (auth) {
        accountId = (auth as any).accountId || (auth as any).sub || accountId;
      }
    }

    // Load authoritative character state from DB
    if (charId && !charId.startsWith('char-guest')) {
      try {
        const dbChar = await persistenceManager.loadCharacter(charId);
        if (dbChar) {
          accountId = dbChar.accountId || accountId;
          charName = dbChar.name;
          vocationId = dbChar.vocationId;
          level = dbChar.level;
          experience = Number(dbChar.experience);
          hp = dbChar.health;
          maxHp = dbChar.maxHealth;
          mp = dbChar.mana;
          maxMp = dbChar.maxMana;
        }
      } catch (err) {
        console.warn(`[HuntDungeonRoom] Aviso ao carregar personagem ${charId}:`, err);
      }
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
    player.name = charName;
    player.vocationId = safeVocationId;
    player.vocationName = vocation.name || 'Knight';
    player.level = Math.max(level, levelForExperience(experience));
    player.experience = experience;
    player.hp = hp > 0 ? hp : maxHp;
    player.maxHp = maxHp;
    player.mp = mp;
    player.maxMp = maxMp;
    player.inHunt = true;
    player.lastHuntId = this.huntId;

    if (options.outfit) player.outfit = options.outfit;
    if (options.outfitColors) {
      player.outfitHead = options.outfitColors.head ?? 0;
      player.outfitBody = options.outfitColors.primary ?? 0;
      player.outfitLegs = options.outfitColors.secondary ?? 0;
      player.outfitFeet = options.outfitColors.detail ?? 0;
    }
    if (options.mount) player.mount = options.mount;
    if (options.mountActive) player.mountActive = options.mountActive;

    // Spawn player in dungeon safe perimeter
    player.posX = 32000;
    player.posY = 32000;
    player.posZ = 8;

    this.state.players.set(client.sessionId, player);

    // Register active hunt session authoritatively
    ServerCharacterContextRegistry.setActivity(charId, {
      isHunting: true,
      huntId: this.huntId,
      activeSessionId: client.sessionId,
      lastActiveSessionId: client.sessionId,
    });

    try {
      await persistenceManager.setPlayerHuntStatus(charId, true, this.huntId, client.sessionId);
    } catch {}

    client.send('server:huntContextReady', { isHunting: true, huntId: this.huntId });
    console.log(`[HuntDungeonRoom] Jogador '${player.name}' (${player.characterId}) entrou na masmorra '${this.huntId}'.`);
  }

  async onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      try {
        await persistenceManager.saveCharacter(player, { allowInHunt: true });
        await persistenceManager.setPlayerHuntStatus(player.characterId, false);
      } catch (err) {
        console.warn(`[HuntDungeonRoom] Erro ao persistir jogador ${player.name} ao sair:`, err);
      }
      ServerCharacterContextRegistry.setActivity(player.characterId, { isHunting: false });
      this.state.players.delete(client.sessionId);
      console.log(`[HuntDungeonRoom] Jogador '${player.name}' saiu da masmorra.`);
    }
  }

  private spawnDungeonMonsters() {
    const monsterTypesByHunt: Record<string, Array<{ typeId: string; name: string; lookType: number; hp: number; atk: number; def: number; count: number }>> = {
      'cyclops-camp': [
        { typeId: 'cyclops', name: 'Cyclops', lookType: 22, hp: 260, atk: 105, def: 30, count: 6 },
        { typeId: 'cyclops_drone', name: 'Cyclops Drone', lookType: 281, hp: 325, atk: 120, def: 35, count: 2 },
        { typeId: 'cyclops_smith', name: 'Cyclops Smith', lookType: 282, hp: 435, atk: 140, def: 40, count: 1 },
      ],
      'dragon-lair': [
        { typeId: 'dragon_hatchling', name: 'Dragon Hatchling', lookType: 283, hp: 380, atk: 130, def: 38, count: 4 },
        { typeId: 'dragon', name: 'Dragon', lookType: 34, hp: 1000, atk: 190, def: 45, count: 4 },
        { typeId: 'dragon_lord', name: 'Dragon Lord', lookType: 39, hp: 1900, atk: 260, def: 55, count: 1 },
      ],
      'rat-cellars': [
        { typeId: 'rat', name: 'Rat', lookType: 21, hp: 20, atk: 8, def: 2, count: 8 },
        { typeId: 'cave_rat', name: 'Cave Rat', lookType: 56, hp: 30, atk: 12, def: 4, count: 4 },
      ],
    };

    const definitions = monsterTypesByHunt[this.huntId] || monsterTypesByHunt['cyclops-camp'];
    let monsterIndex = 1;

    for (const def of definitions) {
      for (let i = 0; i < def.count; i++) {
        const monster = new MonsterState();
        monster.id = `monster_${this.huntId}_${monsterIndex++}`;
        monster.monsterTypeId = def.typeId;
        monster.name = def.name;
        monster.lookType = def.lookType;
        monster.hp = def.hp;
        monster.maxHp = def.hp;
        monster.attackPower = def.atk;
        monster.defensePower = def.def;
        monster.armorPower = Math.round(def.def * 0.5);
        monster.posX = 32000 + (monsterIndex % 5) * 2 - 4;
        monster.posY = 32000 + Math.floor(monsterIndex / 5) * 2 - 4;
        monster.posZ = 8;
        monster.isDead = false;

        this.state.monsters.set(monster.id, monster);
      }
    }
  }

  private update(deltaTime: number) {
    this.state.serverTick += 1;
    const now = Date.now();

    // 1. Update Monster Respawns
    for (const monster of this.state.monsters.values()) {
      if (monster.isDead) {
        if (monster.respawnTimerMs > 0) {
          monster.respawnTimerMs -= deltaTime;
          if (monster.respawnTimerMs <= 0) {
            monster.isDead = false;
            monster.hp = monster.maxHp;
            monster.targetId = '';
            // Spawn teleport visual
            this.emitCombatEvent({
              type: 'spawn-visual',
              effectId: 11, // CONST_ME_TELEPORT
              posX: monster.posX,
              posY: monster.posY,
            });
          }
        }
        continue;
      }

      // 2. Monster Aggro & AI: Find closest player
      if (!monster.targetId) {
        let closestDist = 12;
        let closestPlayer: PlayerState | null = null;
        for (const player of this.state.players.values()) {
          if (player.hp <= 0) continue;
          const dist = Math.hypot(player.posX - monster.posX, player.posY - monster.posY);
          if (dist < closestDist) {
            closestDist = dist;
            closestPlayer = player;
          }
        }
        if (closestPlayer) {
          monster.targetId = closestPlayer.id;
        }
      }

      // 3. Monster Attack Loop
      if (monster.targetId) {
        const targetPlayer = this.state.players.get(monster.targetId);
        if (!targetPlayer || targetPlayer.hp <= 0) {
          monster.targetId = '';
          continue;
        }

        if (now - monster.lastAttackTime >= 2000) {
          monster.lastAttackTime = now;
          const rawDmg = Math.max(1, Math.floor(monster.attackPower * (0.6 + Math.random() * 0.4)));
          const defReduction = Math.floor(targetPlayer.defensePower * 0.5 + targetPlayer.armorPower * 0.3);
          const finalDmg = Math.max(0, rawDmg - defReduction);

          targetPlayer.hp = Math.max(0, targetPlayer.hp - finalDmg);

          this.emitCombatEvent({
            type: finalDmg > 0 ? 'monster-hit' : 'block',
            sourceId: monster.id,
            targetId: targetPlayer.id,
            value: finalDmg,
            effectId: finalDmg > 0 ? 1 : 4,
            posX: targetPlayer.posX,
            posY: targetPlayer.posY,
          });

          if (targetPlayer.hp <= 0) {
            this.emitCombatEvent({
              type: 'creature-died',
              targetId: targetPlayer.id,
              value: 0,
              posX: targetPlayer.posX,
              posY: targetPlayer.posY,
            });
          }
        }
      }
    }

    // 4. Players Auto-Attack Loop
    for (const player of this.state.players.values()) {
      if (player.hp <= 0) continue;

      // Select target if not set
      if (!player.targetId) {
        let nearestMonster: MonsterState | null = null;
        let minDist = 10;
        for (const m of this.state.monsters.values()) {
          if (m.isDead) continue;
          const dist = Math.hypot(m.posX - player.posX, m.posY - player.posY);
          if (dist < minDist) {
            minDist = dist;
            nearestMonster = m;
          }
        }
        if (nearestMonster) {
          player.targetId = nearestMonster.id;
        }
      }

      if (player.targetId) {
        const targetMonster = this.state.monsters.get(player.targetId);
        if (!targetMonster || targetMonster.isDead) {
          player.targetId = '';
          continue;
        }

        if (now - player.lastAttackTime >= 2000) {
          player.lastAttackTime = now;
          const rawDmg = Math.max(5, Math.floor(player.attackPower * (0.7 + Math.random() * 0.5)));
          const finalDmg = Math.max(1, rawDmg - Math.floor(targetMonster.armorPower * 0.4));

          targetMonster.hp = Math.max(0, targetMonster.hp - finalDmg);

          this.emitCombatEvent({
            type: 'player-hit',
            sourceId: player.id,
            targetId: targetMonster.id,
            value: finalDmg,
            effectId: 1, // Melee hit blood
            posX: targetMonster.posX,
            posY: targetMonster.posY,
          });

          // Monster killed authoritatively!
          if (targetMonster.hp <= 0) {
            targetMonster.isDead = true;
            targetMonster.respawnTimerMs = 15000; // 15 seconds respawn
            player.targetId = '';

            // Award authoritative experience
            const baseExp = targetMonster.maxHp * 1.5;
            const awardedExp = Math.round(baseExp);
            player.experience += awardedExp;

            const nextLevel = levelForExperience(player.experience);
            if (nextLevel > player.level) {
              player.level = nextLevel;
              const stats = calculateStatsForLevel(player.vocationName, player.level);
              player.maxHp = stats.maxHp;
              player.maxMp = stats.maxMana;
              player.hp = player.maxHp;
              player.mp = player.maxMp;

              this.emitCombatEvent({
                type: 'level-up',
                sourceId: player.id,
                targetId: player.id,
                effectId: 13, // Fireworks
                posX: player.posX,
                posY: player.posY,
              });
            }

            this.emitCombatEvent({
              type: 'creature-died',
              targetId: targetMonster.id,
              value: 0,
              posX: targetMonster.posX,
              posY: targetMonster.posY,
            });
          }
        }
      }
    }
  }

  private handlePlayerSpell(player: PlayerState, spellId: string) {
    if (spellId === 'exura' || spellId === 'health-potion') {
      const healAmount = spellId === 'health-potion' ? 200 : Math.floor(player.maxHp * 0.25);
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      this.emitCombatEvent({
        type: 'spell-cast',
        sourceId: player.id,
        targetId: player.id,
        effectId: 12, // Magic green
        posX: player.posX,
        posY: player.posY,
      });
    }
  }

  private emitCombatEvent(eventData: Partial<CombatEventSchema>) {
    const event = new CombatEventSchema();
    event.id = `evt_${this.nextEventId++}`;
    event.type = eventData.type || 'damage';
    event.sourceId = eventData.sourceId || '';
    event.targetId = eventData.targetId || '';
    event.value = eventData.value || 0;
    event.effectId = eventData.effectId || 0;
    event.posX = eventData.posX || 0;
    event.posY = eventData.posY || 0;
    event.timestamp = Date.now();

    this.state.combatEvents.push(event);

    // Keep events array bounded
    if (this.state.combatEvents.length > 30) {
      this.state.combatEvents.shift();
    }
  }

  private async saveAllPlayers() {
    for (const player of this.state.players.values()) {
      try {
        await persistenceManager.saveCharacter(player, { allowInHunt: true });
      } catch (err) {
        console.warn(`[HuntDungeonRoom] Erro no auto-save de '${player.name}':`, err);
      }
    }
  }

  onDispose() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    console.log(`[HuntDungeonRoom] Masmorra '${this.huntId}' encerrada.`);
  }
}
