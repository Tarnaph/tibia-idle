import { Room, Client } from '@colyseus/core';
import { WorldState } from '../schemas/WorldState';
import { PlayerState } from '../schemas/PlayerState';
import { MonsterState } from '../schemas/MonsterState';
import { CombatEventSchema } from '../schemas/CombatEventSchema';
import { verifyAuthToken, VOCATION_CONFIGS, ServerCharacterContextRegistry } from '../../../auth/src';
import { experienceForLevel, levelForExperience, calculateStatsForLevel, initialHunts, getHuntWorldEntrance, roomDefinitionAt, type GameContent } from '../../../domain/src';
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
  partyId?: string;
  outfit?: string;
  outfitColors?: { head?: number; primary?: number; secondary?: number; detail?: number };
  mount?: string;
  mountActive?: boolean;
}

export class HuntDungeonRoom extends Room<WorldState> {
  public static activeRooms: Set<HuntDungeonRoom> = new Set();


  public static async flushAllActiveRooms(): Promise<void> {
    console.log(`[HuntDungeonRoom] Executando flush forçado em ${HuntDungeonRoom.activeRooms.size} masmorras ativas...`);
    for (const room of HuntDungeonRoom.activeRooms) {
      await room.saveAllPlayers();
    }
  }

  maxClients = 50;
  public huntId: string = 'cyclops-camp';
  public partyId: string = '';
  public roomDefinition: any = null;
  public walkableTileKeys: Set<string> = new Set();
  private autoSaveTimer: any = null;
  private simulationTimer: any = null;
  private nextEventId: number = 1;

  public isTileWalkable(x: number, y: number): boolean {
    if (this.walkableTileKeys.size === 0) return true;
    return this.walkableTileKeys.has(`${x},${y}`);
  }

  public findShortestPath(
    start: { x: number; y: number },
    goal: { x: number; y: number },
    stopAdjacent = false,
    maxDepth = 25
  ): Array<{ x: number; y: number; dir: string }> {
    if (start.x === goal.x && start.y === goal.y) return [];
    if (stopAdjacent && Math.hypot(start.x - goal.x, start.y - goal.y) <= 1.5) return [];

    const queue: Array<{ x: number; y: number; path: Array<{ x: number; y: number; dir: string }> }> = [];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);
    queue.push({ x: start.x, y: start.y, path: [] });

    const directions = [
      { dx: 0, dy: -1, dir: 'north' },
      { dx: 1, dy: 0, dir: 'east' },
      { dx: 0, dy: 1, dir: 'south' },
      { dx: -1, dy: 0, dir: 'west' },
    ].sort((a, b) => {
      const distA = Math.hypot(start.x + a.dx - goal.x, start.y + a.dy - goal.y);
      const distB = Math.hypot(start.x + b.dx - goal.x, start.y + b.dy - goal.y);
      return distA - distB;
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.path.length >= maxDepth) continue;

      for (const { dx, dy, dir } of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;

        if (stopAdjacent && Math.hypot(nx - goal.x, ny - goal.y) <= 1.2) {
          return [...current.path, { x: nx, y: ny, dir }];
        }

        if (nx === goal.x && ny === goal.y) {
          return [...current.path, { x: nx, y: ny, dir }];
        }

        if (!visited.has(key) && this.isTileWalkable(nx, ny)) {
          visited.add(key);
          queue.push({
            x: nx,
            y: ny,
            path: [...current.path, { x: nx, y: ny, dir }],
          });
        }
      }
    }

    return [];
  }

  public getPlayerByIdOrSession(idOrSession: string): PlayerState | undefined {
    if (!idOrSession) return undefined;
    const direct = this.state.players.get(idOrSession);
    if (direct) return direct;
    for (const p of this.state.players.values()) {
      if (p.id === idOrSession || p.characterId === idOrSession) {
        return p;
      }
    }
    return undefined;
  }

  onCreate(options: any) {
    HuntDungeonRoom.activeRooms.add(this);
    this.setState(new WorldState());
    this.huntId = options.huntId || 'cyclops-camp';
    this.partyId = options.partyId || '';
    this.state.regionName = `hunt:${this.huntId}`;

    const hunt = gameContent.hunts.find((h) => h.id === this.huntId) || initialHunts.find((h) => h.id === this.huntId) || initialHunts[0];
    const region = gameContent.huntRegions.find((r) => r.huntId === this.huntId);
    try {
      this.roomDefinition = roomDefinitionAt(hunt, 0, region);
      if (this.roomDefinition?.map?.tiles) {
        for (const t of this.roomDefinition.map.tiles) {
          if (t.walkable) {
            this.walkableTileKeys.add(`${t.position.x},${t.position.y}`);
          }
        }
      }
    } catch (e) {
      console.warn(`[HuntDungeonRoom] Erro ao carregar roomDefinition para '${this.huntId}':`, e);
    }

    // Initialize dungeon monsters for this hunt
    this.spawnDungeonMonsters();

    // Setup authoritative game simulation loop (100ms ticks = 10 ticks/sec)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 100);

    // Setup periodic authoritative database save (every 25 seconds)
    this.autoSaveTimer = setInterval(() => {
      this.saveAllPlayers();
    }, 25000);

    this.registerMessageHandlers();
    console.log(`[HuntDungeonRoom] Masmorra autoritativa '${this.huntId}' (Party: ${this.partyId || 'Solo'}) iniciada com sucesso. Tiles andáveis: ${this.walkableTileKeys.size}`);
  }

  private registerMessageHandlers() {
    // Attack / Focus target
    const handleAttack = (client: Client, data: { targetId: string | null }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.targetId = data.targetId || '';
      }
    };
    this.onMessage('attack', handleAttack);
    this.onMessage('player:attack', handleAttack);

    // Move within dungeon
    const handleMove = (client: Client, data: { direction: string; x?: number; y?: number; z?: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (data.direction) player.direction = data.direction;
        if (typeof data.x === 'number' && typeof data.y === 'number') {
          if (this.isTileWalkable(data.x, data.y)) {
            player.posX = data.x;
            player.posY = data.y;
          }
        }
        if (typeof data.z === 'number') player.posZ = data.z;
        player.isWalking = true;
        player.lastStepTime = Date.now();
      }
    };
    this.onMessage('move', handleMove);
    this.onMessage('player:move', handleMove);

    // Cast spell or potion
    const handleSpell = (client: Client, data: { spellId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player && data.spellId) {
        this.handlePlayerSpell(player, data.spellId);
      }
    };
    this.onMessage('castSpell', handleSpell);
    this.onMessage('player:spell', handleSpell);

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

    // Spawn player in dungeon entrance perimeter using guaranteed clean open-ground coordinates
    const pIdx = this.state.players.size;
    const entrance = getHuntWorldEntrance(this.huntId, gameContent);
    const baseX = this.roomDefinition?.entrance?.x ?? entrance.localPosition?.x ?? 25;
    const baseY = this.roomDefinition?.entrance?.y ?? entrance.localPosition?.y ?? 25;
    const baseZ = this.roomDefinition?.entrance?.z ?? entrance.localPosition?.z ?? 7;

    // Guaranteed clear walkable candidates immediately adjacent to dungeon entrance
    const candidatePartySpawns = [
      { x: baseX, y: baseY, z: baseZ },
      { x: baseX, y: baseY + 1, z: baseZ },
      { x: baseX - 1, y: baseY, z: baseZ },
      { x: baseX + 1, y: baseY, z: baseZ },
    ];
    const candidate = candidatePartySpawns[pIdx % candidatePartySpawns.length];
    if (this.isTileWalkable(candidate.x, candidate.y)) {
      player.posX = candidate.x;
      player.posY = candidate.y;
      player.posZ = candidate.z;
    } else {
      player.posX = baseX;
      player.posY = baseY;
      player.posZ = baseZ;
    }

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

    client.send('server:huntContextReady', { isHunting: true, huntId: this.huntId, partyId: this.partyId });
    console.log(`[HuntDungeonRoom] Jogador '${player.name}' (${player.characterId}) entrou na masmorra '${this.huntId}' em (${player.posX}, ${player.posY}).`);
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
    const enemySpawns = this.roomDefinition?.enemySpawns || [];
    const entrance = getHuntWorldEntrance(this.huntId, gameContent);
    const baseX = entrance.localPosition?.x ?? 25;
    const baseY = entrance.localPosition?.y ?? 25;
    const baseZ = entrance.localPosition?.z ?? 7;

    const monsterTypesByHunt: Record<string, Array<{ typeId: string; name: string; lookType: number; hp: number; atk: number; def: number; count: number }>> = {
      'cyclops-camp': [
        { typeId: 'cyclops', name: 'Cyclops', lookType: 22, hp: 260, atk: 105, def: 30, count: 6 },
        { typeId: 'cyclops-drone', name: 'Cyclops Drone', lookType: 281, hp: 325, atk: 120, def: 35, count: 2 },
        { typeId: 'cyclops-smith', name: 'Cyclops Smith', lookType: 282, hp: 435, atk: 140, def: 40, count: 2 },
      ],
      'dragon-lair': [
        { typeId: 'dragon-hatchling', name: 'Dragon Hatchling', lookType: 283, hp: 380, atk: 130, def: 38, count: 4 },
        { typeId: 'dragon', name: 'Dragon', lookType: 34, hp: 1000, atk: 190, def: 45, count: 4 },
        { typeId: 'dragon-lord', name: 'Dragon Lord', lookType: 39, hp: 1900, atk: 260, def: 55, count: 1 },
      ],
      'rat-cellars': [
        { typeId: 'rat', name: 'Rat', lookType: 21, hp: 20, atk: 8, def: 2, count: 8 },
        { typeId: 'cave-rat', name: 'Cave Rat', lookType: 56, hp: 30, atk: 12, def: 4, count: 4 },
      ],
      'rotworm-cave': [
        { typeId: 'rotworm', name: 'Rotworm', lookType: 26, hp: 65, atk: 40, def: 8, count: 8 },
        { typeId: 'carrion-worm', name: 'Carrion Worm', lookType: 27, hp: 145, atk: 70, def: 14, count: 3 },
      ],
      'troll-camp': [
        { typeId: 'troll', name: 'Troll', lookType: 15, hp: 50, atk: 25, def: 6, count: 8 },
        { typeId: 'swamp-troll', name: 'Swamp Troll', lookType: 16, hp: 55, atk: 30, def: 7, count: 4 },
      ],
      'spider-burrow': [
        { typeId: 'spider', name: 'Spider', lookType: 30, hp: 20, atk: 10, def: 2, count: 6 },
        { typeId: 'poison-spider', name: 'Poison Spider', lookType: 31, hp: 26, atk: 18, def: 4, count: 4 },
        { typeId: 'bug', name: 'Bug', lookType: 45, hp: 29, atk: 18, def: 4, count: 4 },
      ],
      'elf-sanctuary': [
        { typeId: 'elf', name: 'Elf', lookType: 62, hp: 100, atk: 45, def: 12, count: 6 },
        { typeId: 'elf-scout', name: 'Elf Scout', lookType: 63, hp: 160, atk: 75, def: 16, count: 4 },
      ],
    };

    // Filter clean walkable tiles free from roofs (6470..6500), walls (1000..1200), mountain rock (8133), or obstacles
    const cleanWalkableSpawns: Array<{ x: number; y: number; z: number; dist: number }> = [];
    if (this.roomDefinition?.map?.tiles) {
      for (const t of this.roomDefinition.map.tiles) {
        if (!t.walkable) continue;
        const serverIds: number[] = t.serverItemIds || [];
        const isBlocked = serverIds.some(
          (id: number) =>
            (id >= 6470 && id <= 6500) ||
            (id >= 1000 && id <= 1200) ||
            (id >= 3600 && id <= 3650) ||
            id === 8133
        );
        if (!isBlocked) {
          const dist = Math.hypot(t.position.x - baseX, t.position.y - baseY);
          cleanWalkableSpawns.push({
            x: t.position.x,
            y: t.position.y,
            z: t.position.z ?? baseZ,
            dist,
          });
        }
      }
    }

    // Sort clean spawns: prioritize immediate engagement perimeter (5 to 16 SQMs from entrance)
    cleanWalkableSpawns.sort((a, b) => a.dist - b.dist);
    const combatSpawns = cleanWalkableSpawns.filter((s) => s.dist >= 4.5);
    const chosenSpawns = combatSpawns.length >= 6 ? combatSpawns : cleanWalkableSpawns;

    const definitions = monsterTypesByHunt[this.huntId] || monsterTypesByHunt['cyclops-camp'];
    let monsterIndex = 0;

    for (const def of definitions) {
      for (let i = 0; i < def.count; i++) {
        const monster = new MonsterState();
        monster.id = `monster_${this.huntId}_${monsterIndex + 1}`;
        monster.monsterTypeId = def.typeId;
        monster.name = def.name;
        monster.lookType = def.lookType;
        monster.hp = def.hp;
        monster.maxHp = def.hp;
        monster.attackPower = def.atk;
        monster.defensePower = def.def;
        monster.armorPower = Math.round(def.def * 0.5);

        if (chosenSpawns.length > 0) {
          const spawn = chosenSpawns[monsterIndex % chosenSpawns.length];
          monster.posX = spawn.x;
          monster.posY = spawn.y;
          monster.posZ = spawn.z ?? baseZ;
        } else if (enemySpawns.length > 0) {
          const spawn = enemySpawns[monsterIndex % enemySpawns.length];
          monster.posX = spawn.x;
          monster.posY = spawn.y;
          monster.posZ = spawn.z ?? baseZ;
        } else {
          const angle = (monsterIndex * 0.8) + (i * 0.5);
          const radius = 5 + (monsterIndex % 6);
          monster.posX = Math.round(baseX + Math.cos(angle) * radius);
          monster.posY = Math.round(baseY + Math.sin(angle) * radius);
          monster.posZ = baseZ;
        }

        monster.isDead = false;
        this.state.monsters.set(monster.id, monster);
        monsterIndex++;
      }
    }
  }


  public awardMonsterKill(targetMonster: MonsterState): void {
    targetMonster.isDead = true;
    targetMonster.respawnTimerMs = 15000;

    const baseExp = targetMonster.maxHp * 1.5;
    const awardedExp = Math.round(baseExp);
    const activePlayers = Array.from(this.state.players.values()).filter((p) => p.hp > 0);
    const partyBonus = activePlayers.length > 1 ? 1.2 : 1.0;
    const expPerMember = Math.max(1, Math.round((awardedExp * partyBonus) / Math.max(1, activePlayers.length)));

    for (const p of activePlayers) {
      p.experience += expPerMember;
      const nextLevel = levelForExperience(p.experience);
      if (nextLevel > p.level) {
        p.level = nextLevel;
        const stats = calculateStatsForLevel(p.vocationName || 'Knight', p.level);
        p.maxHp = stats.maxHp;
        p.maxMp = stats.maxMana;
        p.hp = p.maxHp;
        p.mp = p.maxMp;

        this.emitCombatEvent({
          type: 'level-up',
          sourceId: p.id,
          targetId: p.id,
          effectId: 13, // Fireworks
          posX: p.posX,
          posY: p.posY,
        });
      }
    }

    this.emitCombatEvent({
      type: 'creature-died',
      targetId: targetMonster.id,
      value: 0,
      posX: targetMonster.posX,
      posY: targetMonster.posY,
    });

    const droppedGold = Math.max(10, Math.floor((targetMonster.maxHp * 0.8 + Math.random() * 25) * 5));
    this.broadcast('monster:died', { monsterId: targetMonster.id, exp: expPerMember });
    this.broadcast('hunt:loot', {
      monsterId: targetMonster.id,
      monsterName: targetMonster.name,
      gold: droppedGold,
      posX: targetMonster.posX,
      posY: targetMonster.posY,
    });
  }

  public update(deltaTime: number) {
    this.state.serverTick += 1;
    const now = Date.now();

    // 0. Check for any monsters killed that need EXP distribution
    for (const monster of this.state.monsters.values()) {
      if (!monster.isDead && monster.hp <= 0) {
        this.awardMonsterKill(monster);
      }
    }

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
        let closestDist = 14;
        let closestSessionId = '';
        for (const [sessionId, player] of this.state.players.entries()) {
          if (player.hp <= 0) continue;
          const dist = Math.hypot(player.posX - monster.posX, player.posY - monster.posY);
          if (dist < closestDist) {
            closestDist = dist;
            closestSessionId = sessionId;
          }
        }
        if (closestSessionId) {
          monster.targetId = closestSessionId;
        }
      }

      // 3. Monster Movement & Attack Loop
      if (monster.targetId) {
        const targetPlayer = this.getPlayerByIdOrSession(monster.targetId);
        if (!targetPlayer || targetPlayer.hp <= 0) {
          monster.targetId = '';
          continue;
        }

        const dist = Math.hypot(targetPlayer.posX - monster.posX, targetPlayer.posY - monster.posY);

        // Step towards player using BFS pathfinding if not in melee reach
        if (dist > 1.2 && now - monster.lastStepTime >= 950) {
          monster.lastStepTime = now;
          const path = this.findShortestPath(
            { x: monster.posX, y: monster.posY },
            { x: targetPlayer.posX, y: targetPlayer.posY },
            true
          );

          if (path.length > 0) {
            const nextStep = path[0];
            monster.posX = nextStep.x;
            monster.posY = nextStep.y;
            monster.direction = nextStep.dir;

            this.emitCombatEvent({
              type: 'movement',
              sourceId: monster.id,
              targetId: monster.id,
              posX: monster.posX,
              posY: monster.posY,
            });
          }
        }

        // Attack if in range
        if (dist <= 1.8 && now - monster.lastAttackTime >= 2000) {
          monster.lastAttackTime = now;
          const rawDmg = Math.max(1, Math.floor(monster.attackPower * (0.6 + Math.random() * 0.4)));
          const defReduction = Math.floor(targetPlayer.defensePower * 0.5 + targetPlayer.armorPower * 0.3);
          const finalDmg = Math.max(0, rawDmg - defReduction);

          targetPlayer.hp = Math.max(0, targetPlayer.hp - finalDmg);

          this.emitCombatEvent({
            type: finalDmg > 0 ? 'enemy-attack' : 'block',
            sourceId: monster.id,
            targetId: targetPlayer.characterId || targetPlayer.id,
            value: finalDmg,
            effectId: finalDmg > 0 ? 1 : 4,
            posX: targetPlayer.posX,
            posY: targetPlayer.posY,
          });

          if (targetPlayer.hp <= 0) {
            this.emitCombatEvent({
              type: 'creature-died',
              sourceId: monster.id,
              targetId: targetPlayer.characterId || targetPlayer.id,
              value: 0,
              posX: targetPlayer.posX,
              posY: targetPlayer.posY,
            });
          }
        }
      }
    }

    // 4. Players Auto-Attack & Auto-Advance Loop
    for (const player of this.state.players.values()) {
      if (player.hp <= 0) continue;

      // Select target if not set
      if (!player.targetId) {
        let nearestMonster: MonsterState | null = null;
        let minDist = 14;
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

        const dist = Math.hypot(targetMonster.posX - player.posX, targetMonster.posY - player.posY);
        const isRanged = player.vocationId === 1 || player.vocationId === 2 || player.vocationId === 3; // Sorcerer, Paladin, Druid
        const maxRange = isRanged ? 5.5 : 1.8;

        // Auto-step towards monster if melee and outside reach using BFS pathfinding
        if (!isRanged && dist > 1.5 && now - player.lastStepTime >= 750) {
          player.lastStepTime = now;
          const path = this.findShortestPath(
            { x: player.posX, y: player.posY },
            { x: targetMonster.posX, y: targetMonster.posY },
            true
          );

          if (path.length > 0) {
            const nextStep = path[0];
            player.posX = nextStep.x;
            player.posY = nextStep.y;
            player.direction = nextStep.dir;
            player.isWalking = true;

            this.emitCombatEvent({
              type: 'movement',
              sourceId: player.characterId || player.id,
              targetId: player.characterId || player.id,
              posX: player.posX,
              posY: player.posY,
            });
          }
        }

        // Auto-heal if HP < 75%
        if (player.hp < player.maxHp * 0.75 && player.mp >= 20 && now - player.lastAttackTime >= 400) {
          const healSpell = player.vocationId === 4 ? 'exura-ico' : 'exura';
          this.handlePlayerSpell(player, healSpell);
        }

        // Auto-spells for Knight
        if (player.vocationId === 4 && player.mp >= 115) {
          const adjacentMonsters = Array.from(this.state.monsters.values()).filter(
            (m) => !m.isDead && Math.hypot(m.posX - player.posX, m.posY - player.posY) <= 1.5
          );
          if (adjacentMonsters.length >= 2) {
            this.handlePlayerSpell(player, 'exori');
          }
        }

        // Standard Attack
        if (dist <= maxRange && now - player.lastAttackTime >= player.attackCooldownMs) {
          player.lastAttackTime = now;
          const rawDmg = Math.max(5, Math.floor(player.attackPower * (0.7 + Math.random() * 0.5)));
          const finalDmg = Math.max(1, rawDmg - Math.floor(targetMonster.armorPower * 0.4));

          targetMonster.hp = Math.max(0, targetMonster.hp - finalDmg);

          // Projétil / efeito visual baseado na vocação
          const effectId = player.vocationId === 2 ? 1 // Paladin Arrow
            : player.vocationId === 1 ? 3 // Sorcerer Fire
            : player.vocationId === 3 ? 28 // Druid Ice
            : 1; // Knight Melee Hit

          this.emitCombatEvent({
            type: isRanged ? 'projectile-launched' : 'player-attack',
            sourceId: player.characterId || player.id,
            targetId: targetMonster.id,
            value: finalDmg,
            effectId,
            posX: targetMonster.posX,
            posY: targetMonster.posY,
          });

          // Chance to trigger Exori Ico on attack if Knight has mana
          if (player.vocationId === 4 && player.mp >= 30 && dist <= 1.5 && Math.random() < 0.3) {
            this.handlePlayerSpell(player, 'exori-ico');
          }

          // Monster killed authoritatively!
          if (targetMonster.hp <= 0) {
            player.targetId = '';
            this.awardMonsterKill(targetMonster);
          }
        }
      }
    }
  }

  private handlePlayerSpell(player: PlayerState, rawSpellId: string) {
    if (!player || player.hp <= 0) return;
    const spell = rawSpellId.toLowerCase().trim().replace(/[\s_]+/g, '-');
    const casterId = player.characterId || player.id;

    // 1. Curas e Suporte
    if (spell === 'exura') {
      if (player.mp < 20) return;
      player.mp -= 20;
      const heal = Math.round(player.level * 0.25 + 25 + Math.random() * 20);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      this.emitCombatEvent({ type: 'spell-cast', sourceId: casterId, targetId: casterId, value: heal, effectId: 12, text: 'exura', posX: player.posX, posY: player.posY });
      return;
    }
    if (spell === 'exura-ico') {
      if (player.mp < 40) return;
      player.mp -= 40;
      const heal = Math.round(player.level * 0.4 + 65 + Math.random() * 35);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      this.emitCombatEvent({ type: 'spell-cast', sourceId: casterId, targetId: casterId, value: heal, effectId: 12, text: 'exura ico', posX: player.posX, posY: player.posY });
      return;
    }
    if (spell === 'exura-gran') {
      if (player.mp < 70) return;
      player.mp -= 70;
      const heal = Math.round(player.level * 0.6 + 120 + Math.random() * 60);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      this.emitCombatEvent({ type: 'spell-cast', sourceId: casterId, targetId: casterId, value: heal, effectId: 12, text: 'exura gran', posX: player.posX, posY: player.posY });
      return;
    }
    if (spell === 'exura-vita') {
      if (player.mp < 160) return;
      player.mp -= 160;
      const heal = Math.round(player.level * 1.5 + 350 + Math.random() * 150);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      this.emitCombatEvent({ type: 'spell-cast', sourceId: casterId, targetId: casterId, value: heal, effectId: 12, text: 'exura vita', posX: player.posX, posY: player.posY });
      return;
    }

    // 2. Poções de Vida e Mana
    if (spell.includes('health-potion') || spell === 'potion-health') {
      const heal = spell.includes('ultimate') ? 800 : spell.includes('great') ? 500 : spell.includes('strong') ? 300 : 150;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      this.emitCombatEvent({ type: 'spell-cast', sourceId: casterId, targetId: casterId, value: heal, effectId: 12, text: 'Aaaah...', posX: player.posX, posY: player.posY });
      return;
    }
    if (spell.includes('mana-potion') || spell === 'potion-mana') {
      const manaGain = spell.includes('ultimate') ? 500 : spell.includes('great') ? 350 : spell.includes('strong') ? 200 : 100;
      player.mp = Math.min(player.maxMp, player.mp + manaGain);
      this.emitCombatEvent({ type: 'spell-cast', sourceId: casterId, targetId: casterId, value: manaGain, effectId: 13, text: 'Aaaah...', posX: player.posX, posY: player.posY });
      return;
    }

    // 3. Magias Ofensivas de Área: Exori (Berserk)
    if (spell === 'exori') {
      if (player.mp < 115) return;
      player.mp -= 115;
      const baseDmg = Math.round(player.level * 0.2 + player.attackPower * 1.25);

      // Efeito central de Berserk e speech
      this.emitCombatEvent({ type: 'spell-cast', sourceId: casterId, targetId: casterId, effectId: 10, text: 'exori', posX: player.posX, posY: player.posY });

      // Acerta todos os monstros no quadrado 3x3 ao redor do jogador
      for (const monster of this.state.monsters.values()) {
        if (monster.isDead) continue;
        if (Math.abs(monster.posX - player.posX) <= 1 && Math.abs(monster.posY - player.posY) <= 1) {
          const dmg = Math.max(1, Math.round(baseDmg * (0.8 + Math.random() * 0.4)) - Math.floor(monster.armorPower * 0.3));
          monster.hp = Math.max(0, monster.hp - dmg);

          this.emitCombatEvent({
            type: 'player-attack',
            sourceId: casterId,
            targetId: monster.id,
            value: dmg,
            effectId: 1,
            posX: monster.posX,
            posY: monster.posY,
          });

          if (monster.hp <= 0) {
            this.awardMonsterKill(monster);
          }
        }
      }
      return;
    }

    // 4. Magias Ofensivas Direcionadas
    let targetMonster = player.targetId ? this.state.monsters.get(player.targetId) : null;
    if (!targetMonster || targetMonster.isDead) {
      let minDist = 6;
      for (const m of this.state.monsters.values()) {
        if (m.isDead) continue;
        const d = Math.hypot(m.posX - player.posX, m.posY - player.posY);
        if (d < minDist) {
          minDist = d;
          targetMonster = m;
        }
      }
    }

    if (!targetMonster || targetMonster.isDead) return;
    const dist = Math.hypot(targetMonster.posX - player.posX, targetMonster.posY - player.posY);

    // Exori Ico (Melee Strike)
    if (spell === 'exori-ico') {
      if (player.mp < 30 || dist > 1.8) return;
      player.mp -= 30;
      const dmg = Math.max(5, Math.round(player.level * 0.2 + player.attackPower * 0.95 + Math.random() * 20));
      targetMonster.hp = Math.max(0, targetMonster.hp - dmg);
      this.emitCombatEvent({ type: 'player-attack', sourceId: casterId, targetId: targetMonster.id, value: dmg, effectId: 1, text: 'exori ico', posX: targetMonster.posX, posY: targetMonster.posY });
      if (targetMonster.hp <= 0) this.awardMonsterKill(targetMonster);
      return;
    }

    // Exori Hur (Whirlwind Throw)
    if (spell === 'exori-hur') {
      if (player.mp < 40 || dist > 5.5) return;
      player.mp -= 40;
      const dmg = Math.max(5, Math.round(player.level * 0.2 + player.attackPower * 0.8 + Math.random() * 15));
      targetMonster.hp = Math.max(0, targetMonster.hp - dmg);
      this.emitCombatEvent({ type: 'player-attack', sourceId: casterId, targetId: targetMonster.id, value: dmg, effectId: 44, text: 'exori hur', posX: targetMonster.posX, posY: targetMonster.posY });
      if (targetMonster.hp <= 0) this.awardMonsterKill(targetMonster);
      return;
    }

    // Elementais (Exori Flam, Vis, Frigo, Tera, San, Con)
    if (spell.startsWith('exori-') || spell === 'flam' || spell === 'vis') {
      const manaCost = 20;
      if (player.mp < manaCost || dist > 4.5) return;
      player.mp -= manaCost;

      const effectId = spell.includes('flam') ? 5 // Fire
        : spell.includes('vis') ? 11 // Energy
        : spell.includes('frigo') ? 43 // Ice
        : spell.includes('tera') ? 45 // Earth
        : spell.includes('san') ? 40 // Holy
        : 1; // Physical

      const dmg = Math.max(5, Math.round(player.level * 0.5 + 40 + Math.random() * 40));
      targetMonster.hp = Math.max(0, targetMonster.hp - dmg);
      this.emitCombatEvent({ type: 'player-attack', sourceId: casterId, targetId: targetMonster.id, value: dmg, effectId, text: spell.replace('-', ' '), posX: targetMonster.posX, posY: targetMonster.posY });
      if (targetMonster.hp <= 0) this.awardMonsterKill(targetMonster);
      return;
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
    event.projectileId = eventData.projectileId || 0;
    event.text = eventData.text || '';
    event.posX = eventData.posX || 0;
    event.posY = eventData.posY || 0;
    event.timestamp = Date.now();

    this.state.combatEvents.push(event);

    // Broadcast for instantaneous reactive audio-visual triggers on web client
    this.broadcast('hunt:combatEvent', {
      id: event.id,
      type: event.type,
      sourceId: event.sourceId,
      targetId: event.targetId,
      value: event.value,
      effectId: event.effectId,
      projectileId: event.projectileId,
      text: event.text,
      posX: event.posX,
      posY: event.posY,
      timestamp: event.timestamp,
    });

    // Keep events array bounded
    if (this.state.combatEvents.length > 30) {
      this.state.combatEvents.shift();
    }
  }

  public async saveAllPlayers() {
    for (const player of this.state.players.values()) {
      try {
        await persistenceManager.saveCharacter(player, { allowInHunt: true });
      } catch (err) {
        console.warn(`[HuntDungeonRoom] Erro no auto-save de '${player.name}':`, err);
      }
    }
  }

  async onDispose() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    try {
      await this.saveAllPlayers();
    } catch (err) {
      console.warn(`[HuntDungeonRoom] Erro no flush final de '${this.huntId}':`, err);
    }
    HuntDungeonRoom.activeRooms.delete(this);
    console.log(`[HuntDungeonRoom] Masmorra '${this.huntId}' encerrada com persistência concluída.`);
  }
}
