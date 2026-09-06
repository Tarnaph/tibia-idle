import { deriveStats, getEquippedItems } from './derivedStats';
import { adaptWaveHuntToExpedition } from './expedition';
import { experienceForLevel, levelForExperience } from './experience';
import { huntById } from './hunt';
import { createContinuousHuntRoute } from './huntRoute';
import { createCharacter, leaderOf, sharedExperiencePerCharacter, vocationFor } from './party';
import { createSeededRng, rollInteger } from './rng';
import { spellFormulaRange } from './spells';
import { addTrainingTries } from './training';
import { calculateMaxStamina, tickStamina } from './stamina';
import { HOTBAR_POTIONS, ensureHealthPotionInHotbar, findHotbarAction, getBestHealthPotionForCharacter, isHotbarActionUnlocked } from './hotbarActions';
import { assertSpatialIntegrity, moveEnemiesTowardParty, movePartyToExit, movePartyTowardPoint, movePartyTowardTargets, synchronizeEncounterOccupancy } from './spatial/movement';
import { isMeleeRange, meleeDistance } from './spatial/pathfinding';
import { createRoomState, roomDefinitionAt } from './spatial/rooms';
import { clonePosition, samePosition } from './spatial/tileMap';
import type { GridPosition } from './spatial/types';
import type {
  CharacterState, CombatEvent, CombatLogEntry, CombatStance, CorpseState, EnemyState, GameContent, GameState, HuntEncounterState,
  LootStack, MonsterVariantDefinition, PartyActorState, SessionState,
} from './types';
import type { MonsterDefinition } from '../../content-schema/src';
import { serverConfigManager } from '../../server/src/config/ServerConfigManager';

export const MOVEMENT_TICK_MS = 120;
export const BASE_TILE_TRAVEL_MS = 720;
const MAX_LOG_ENTRIES = 100;

const monsterFor = (content: GameContent, id: string) => {
  const monster = content.monsters.find((candidate) => candidate.id === id);
  if (!monster) throw new Error(`Missing monster ${id}.`);
  return monster;
};
const regionFor = (content: GameContent, huntId: string) => {
  const region = content.huntRegions.find((candidate) => candidate.huntId === huntId);
  if (!region) throw new Error(`Missing OTBM region for ${huntId}.`);
  return region;
};

export function deriveMonsterVariantStats(monster: MonsterDefinition, variant: MonsterVariantDefinition | null) {
  return {
    maxHp: Math.ceil(monster.maxHp * (variant?.hpMultiplier ?? 1)),
    attackMax: Math.ceil(monster.attacks[0].maxDamage * (variant?.damageMultiplier ?? 1)),
    defense: Math.ceil(monster.defense * (variant?.defenseMultiplier ?? 1)),
    armor: Math.ceil(monster.armor * (variant?.defenseMultiplier ?? 1)),
    experience: Math.ceil(monster.experience * (variant?.xpMultiplier ?? 1)),
    lootMultiplier: variant?.lootMultiplier ?? 1,
  };
}

function addLog(state: GameState, message: string): void {
  const encounter = state.encounter;
  const entry: CombatLogEntry = { id: encounter.nextLogId++, round: encounter.round, message };
  encounter.log = [entry, ...encounter.log].slice(0, MAX_LOG_ENTRIES);
}

function cloneState(state: GameState): GameState {
  const next = structuredClone(state) as GameState;
  next.encounter.events = [];
  next.encounter.visualEvents = [];
  return next;
}

function makeActor(character: SessionState['characters'][number], spawn: PartyActorState['position'], content: GameContent): PartyActorState {
  const vocation = vocationFor(content, character.vocation);
  const stats = deriveStats(character, content.equipment, vocation);
  return {
    characterId: character.id, hp: character.currentHp, mana: character.currentMana, alive: character.currentHp > 0,
    position: clonePosition(spawn), previousPosition: clonePosition(spawn), direction: 'east', path: [], targetId: null,
    nextAttackAt: 0, attackIntervalMs: stats.attackIntervalMs, speed: vocation.baseSpeed + (character.level - 1) * 2 + stats.movementSpeedBonus, nextMoveAt: 0, nextSpellAt: 0,
    spellCooldowns: { ...character.combatState.spellCooldowns }, groupCooldowns: { ...character.combatState.groupCooldowns }, hasteUntil: 0,
    magicShieldUntil: 0, bloodRageUntil: 0, lastHitTakenAt: 0,
    nextManaRegenAt: vocation.manaGainTicks * 2_000, nextHealthRegenAt: vocation.healthGainTicks * 2_000, pendingAttack: null,
    stance: character.stance ?? 'offensive', targetDistance: character.targetDistance ?? 1,
  };
}

function createEncounter(seed: string, session: SessionState, content: GameContent, huntId: string, requestedMode: 'continuous' | 'expedition' | 'legacyWaveMode' | 'waves' = 'continuous'): HuntEncounterState {
  const hunt = huntById(content.hunts, huntId);
  const region = regionFor(content, hunt.id);
  const room = createRoomState(hunt, 0, region);
  const definition = roomDefinitionAt(hunt, 0, region);
  const mode = requestedMode === 'waves' ? 'legacyWaveMode' : requestedMode;
  const expedition = mode === 'expedition' ? adaptWaveHuntToExpedition(hunt, room) : null;
  const huntRoute = mode === 'continuous' ? createContinuousHuntRoute(hunt, room, region) : null;
  return {
    seed, rngState: createSeededRng(seed).state, status: 'ready', round: 0, elapsedMs: 0,
    nextMovementAt: MOVEMENT_TICK_MS, waveIndex: 0, hunt,
    partyActors: session.characters.map((character, index) => makeActor(character, definition.partySpawns[index] ?? definition.entrance, content)),
    enemies: [], corpses: [], events: [], visualEvents: [], log: [], nextLogId: 1, room, mode, expedition,
    expeditionProgress: expedition ? {
      activeEncounterIndex: 0, activeEncounterSpawned: false, completedEncounterIds: [], kills: 0,
      totalEnemies: hunt.waves.reduce((total, wave) => total + wave.count + (wave.boss ? 1 : 0), 0),
      explorationPercent: 0, bossState: 'ahead', reachedExit: false,
    } : null, huntRoute,
    continuousProgress: huntRoute ? {
      currentZoneIndex: 0, loopCount: 0, kills: 0, rareKills: 0,
      lastActivityAt: 0, stalledSince: null,
      zones: huntRoute.respawnZones.map((zone) => ({ zoneId: zone.id, activeEnemyIds: [], lastActivatedAt: null, lastClearedAt: null, nextRespawnAt: 0, activationCount: 0 })),
    } : null,
    isMultiplayerParty: Boolean(session.isMultiplayerParty),
  };
}

function spawnRoom(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  const wave = encounter.hunt.waves[encounter.waveIndex];
  const monster = monsterFor(content, wave.monsterId);
  const region = regionFor(content, encounter.hunt.id);
  const definition = roomDefinitionAt(encounter.hunt, encounter.waveIndex, region);
  encounter.room = createRoomState(encounter.hunt, encounter.waveIndex, region);
  encounter.corpses = [];
  encounter.partyActors = state.session.characters.map((character, index) => {
    return makeActor(character, definition.partySpawns[index] ?? definition.entrance, content);
  });
  const totalEnemies = wave.count + (wave.boss ? 1 : 0);
  if (definition.enemySpawns.length < totalEnemies) throw new Error(`Room ${definition.number} lacks enemy spawns.`);
  encounter.enemies = definition.enemySpawns.slice(0, totalEnemies).map((spawn, index): EnemyState => {
    const variant = wave.boss && index === 0 ? wave.boss : null;
    const resolved = deriveMonsterVariantStats(monster, variant);
    return ({
    id: `room-${definition.number}-${monster.id}-${index + 1}`, monsterId: monster.id, name: variant?.name ?? monster.name,
    hp: resolved.maxHp, maxHp: resolved.maxHp, attackMax: resolved.attackMax,
    defense: resolved.defense, armor: resolved.armor, alive: true,
    position: clonePosition(spawn), previousPosition: clonePosition(spawn), direction: 'west', path: [], targetId: null,
    nextAttackAt: 0, attackIntervalMs: monster.attacks[0].intervalMs, speed: monster.speed,
    behavior: 'idle', nextRoamAt: encounter.elapsedMs + 720 + index * 240, nextMoveAt: 0, detectionRange: 5, variant,
  }); });
  synchronizeEncounterOccupancy(encounter);
  addLog(state, `Wave ${wave.number}: ${wave.count} ${monster.name}(s)${wave.boss ? ` + ${wave.boss.name}` : ''}.`);
}

function spawnExpeditionEncounter(state: GameState, content: GameContent): void {
  const encounter = state.encounter; const expedition = encounter.expedition; const progress = encounter.expeditionProgress;
  if (!expedition || !progress || encounter.enemies.some((enemy) => enemy.alive)) return;
  const definition = expedition.encounters[progress.activeEncounterIndex];
  if (!definition) return;
  const monster = monsterFor(content, definition.monsterId);
  const occupied = new Set(encounter.partyActors.filter((actor) => actor.alive).map((actor) => `${actor.position.x},${actor.position.y}`));
  const candidates = encounter.room.map.tiles.filter((tile) => tile.walkable && !occupied.has(`${tile.position.x},${tile.position.y}`))
    .sort((left, right) => meleeDistance(left.position, definition.anchor) - meleeDistance(right.position, definition.anchor)
      || left.position.y - right.position.y || left.position.x - right.position.x);
  const total = definition.count + (definition.boss ? 1 : 0);
  if (candidates.length < total) throw new Error(`Expedition encounter ${definition.id} lacks spawn tiles.`);
  encounter.waveIndex = definition.sourceWaveIndex;
  progress.activeEncounterSpawned = true;
  encounter.enemies = candidates.slice(0, total).map((tile, index): EnemyState => {
    const variant = definition.boss && index === 0 ? definition.boss : null;
    const resolved = deriveMonsterVariantStats(monster, variant);
    return {
      id: `${definition.id}-${index + 1}`, monsterId: monster.id, name: variant?.name ?? monster.name,
      hp: resolved.maxHp, maxHp: resolved.maxHp, attackMax: resolved.attackMax, defense: resolved.defense, armor: resolved.armor,
      alive: true, position: clonePosition(tile.position), previousPosition: clonePosition(tile.position), direction: 'west', path: [], targetId: null,
      nextAttackAt: 0, attackIntervalMs: monster.attacks[0].intervalMs, speed: monster.speed, behavior: 'idle',
      nextRoamAt: encounter.elapsedMs + 720 + index * 240, nextMoveAt: 0, detectionRange: 5, variant,
    };
  });
  if (definition.boss) progress.bossState = 'active';
  synchronizeEncounterOccupancy(encounter);
  addLog(state, `Encontro ${progress.activeEncounterIndex + 1}: ${definition.count} ${monster.name}(s)${definition.boss ? ` + ${definition.boss.name}` : ''}.`);
}

function populateRespawnZone(state: GameState, content: GameContent, zoneIndex: number): void {
  const encounter = state.encounter; const route = encounter.huntRoute; const progress = encounter.continuousProgress;
  if (!route || !progress) return;
  const zone = route.respawnZones[zoneIndex]; const zoneState = progress.zones[zoneIndex];
  if (!zone || !zoneState || zoneState.activeEnemyIds.length > 0 || encounter.elapsedMs < zoneState.nextRespawnAt) return;
  const rng = createSeededRng(encounter.rngState);
  const count = rollInteger(rng, zone.minCount, zone.maxCount);
  const partyPositions = encounter.partyActors.filter((actor) => actor.alive).map((actor) => actor.position);
  const occupiedEnemyPositions = encounter.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.position);
  const preferredKeys = new Set(zone.positions.map((position) => `${position.x},${position.y}`));
  const valid = encounter.room.map.tiles.filter((tile) => tile.walkable
    && (preferredKeys.has(`${tile.position.x},${tile.position.y}`) || meleeDistance(tile.position, zone.center) <= zone.radius)
    && partyPositions.every((position) => meleeDistance(tile.position, position) >= 3)
    && occupiedEnemyPositions.every((position) => meleeDistance(tile.position, position) >= 1))
    .sort((a, b) => b.position.y - a.position.y || b.position.x - a.position.x);
  const fallback = encounter.room.map.tiles.filter((tile) => tile.walkable && partyPositions.every((position) => meleeDistance(tile.position, position) >= 2)
    && occupiedEnemyPositions.every((position) => meleeDistance(tile.position, position) >= 1))
    .sort((a, b) => meleeDistance(a.position, zone.center) - meleeDistance(b.position, zone.center));
  const candidates = valid.length >= count ? valid : fallback;
  const spawned: EnemyState[] = [];
  const used = new Set<string>();
  for (let index = 0; index < count && candidates.length > used.size; index += 1) {
    let candidateIndex = rollInteger(rng, 0, candidates.length - 1);
    while (used.has(`${candidates[candidateIndex].position.x},${candidates[candidateIndex].position.y}`)) candidateIndex = (candidateIndex + 1) % candidates.length;
    const tile = candidates[candidateIndex]; used.add(`${tile.position.x},${tile.position.y}`);
    const monsterId = zone.monsterPool[rollInteger(rng, 0, zone.monsterPool.length - 1)]; const monster = monsterFor(content, monsterId);
    const rare = rollInteger(rng, 1, 10_000) <= Math.round(route.rareSpawnRules.probability * 10_000);
    const variant = rare ? { ...route.rareSpawnRules.variant, baseMonsterId: monster.id, name: `Enraged ${monster.name}` } : null;
    const resolved = deriveMonsterVariantStats(monster, variant);
    spawned.push({
      id: `${zone.id}-${zoneState.activationCount + 1}-${index + 1}`, monsterId: monster.id, name: variant?.name ?? monster.name,
      hp: resolved.maxHp, maxHp: resolved.maxHp, attackMax: resolved.attackMax, defense: resolved.defense, armor: resolved.armor,
      alive: true, position: clonePosition(tile.position), previousPosition: clonePosition(tile.position), direction: 'west', path: [], targetId: null,
      nextAttackAt: 0, attackIntervalMs: monster.attacks[0].intervalMs, speed: monster.speed, behavior: 'idle',
      nextRoamAt: encounter.elapsedMs + 720 + index * 240, nextMoveAt: 0, detectionRange: 5, variant, respawnZoneId: zone.id,
    });
  }
  encounter.rngState = rng.state; encounter.enemies.push(...spawned);
  zoneState.activeEnemyIds = spawned.map((enemy) => enemy.id); zoneState.lastActivatedAt = encounter.elapsedMs; zoneState.activationCount += 1;
  synchronizeEncounterOccupancy(encounter);
  addLog(state, `${zone.id}: ${spawned.length} criatura(s) despertaram${spawned.some((enemy) => enemy.variant) ? ' · presença rara detectada' : ''}.`);
}

function populateReadyRespawns(state: GameState, content: GameContent, initial = false): void {
  const encounter = state.encounter; const route = encounter.huntRoute; const progress = encounter.continuousProgress;
  if (!route || !progress) return;
  for (let index = 0; index < route.respawnZones.length; index += 1) {
    const zone = route.respawnZones[index]; const zoneState = progress.zones[index];
    if (zoneState.activeEnemyIds.length > 0 || encounter.elapsedMs < zoneState.nextRespawnAt) continue;
    const safe = encounter.partyActors.filter((actor) => actor.alive).every((actor) => meleeDistance(actor.position, zone.center) >= 7);
    if (initial || safe) populateRespawnZone(state, content, index);
  }
}

function addLoot(inventory: LootStack[], loot: LootStack): void {
  const existing = inventory.find((item) => item.itemId === loot.itemId && item.name === loot.name);
  if (existing) existing.amount += loot.amount;
  else inventory.push({ ...loot });
}

function levelUpCharacter(state: GameState, characterId: string, content: GameContent): void {
  const character = state.session.characters.find((candidate) => candidate.id === characterId)!;
  const vocation = vocationFor(content, character.vocation);
  while (character.experience >= experienceForLevel(character.level + 1)) {
    const previousLevel = character.level;
    character.level += 1;
    character.maxHp += vocation.gainHp;
    character.maxMana += vocation.gainMana;
    character.currentHp = character.maxHp;
    character.currentMana = character.maxMana;
    const actor = state.encounter.partyActors.find((candidate) => candidate.characterId === character.id);
    if (actor) {
      actor.hp = character.maxHp;
      actor.mana = character.maxMana;
    }
    const message = `You advanced from Level ${previousLevel} to Level ${character.level}.`;
    state.encounter.events.push({
      type: 'level-up',
      characterId,
      level: character.level,
      previousLevel,
      message,
    });
    addLog(state, message);
  }
}

function grantSharedExperience(state: GameState, rawExperience: number, content: GameContent): void {
  const share = sharedExperiencePerCharacter(rawExperience, state.session.characters);
  for (const character of state.session.characters) {
    character.experience += share;
    levelUpCharacter(state, character.id, content);
    if (share > 0) {
      state.encounter.events.push({ type: 'experience-gained', characterId: character.id, amount: share });
    }
  }
  addLog(state, `XP compartilhada: ${share} para cada membro.`);
}

function rollLoot(state: GameState, monsterId: string, content: GameContent, multiplier = 1): void {
  const monster = monsterFor(content, monsterId);
  const rng = createSeededRng(state.encounter.rngState);
  const partyMembers = state.session.characters;

  for (let roll = 0; roll < Math.max(1, Math.floor(multiplier)); roll += 1) {
    for (const loot of monster.loot) {
      if (rollInteger(rng, 0, 99_999) >= loot.chance) continue;
      const amount = rollInteger(rng, 1, Math.max(1, loot.maxCount));

      // Party mode: allocate loot to a party member according to rarity roll
      if (partyMembers.length > 1) {
        const memberIdx = rollInteger(rng, 0, partyMembers.length - 1);
        const luckyMember = partyMembers[memberIdx];

        if (loot.itemId === 2148) {
          state.session.gold += amount;
          const goldShare = Math.max(1, Math.floor(amount / partyMembers.length));
          addLog(state, `Loot (Gold): ${amount} gold divididos na party (${goldShare} para cada).`);
        } else {
          if (loot.itemId === undefined || (state.session.itemLootPreferences[String(loot.itemId)]?.autoLoot ?? true)) {
            addLoot(state.session.loot, { itemId: loot.itemId, name: loot.name, amount });
          }
          state.encounter.events.push({ type: 'loot', itemName: loot.name, amount });
          addLog(state, `Loot (${loot.name}): ${luckyMember.name} recebeu ${amount}x ${loot.name}!`);
        }
      } else {
        // Solo mode
        if (loot.itemId === 2148) {
          state.session.gold += amount;
        } else if (loot.itemId === undefined || (state.session.itemLootPreferences[String(loot.itemId)]?.autoLoot ?? true)) {
          addLoot(state.session.loot, { itemId: loot.itemId, name: loot.name, amount });
        }
        state.encounter.events.push({ type: 'loot', itemName: loot.name, amount });
        addLog(state, `Loot: ${amount}x ${loot.name}.`);
      }
    }
  }
  state.encounter.rngState = rng.state;
}

function defeatEnemy(state: GameState, target: EnemyState, content: GameContent): void {
  if (!target.alive) return;
  const encounter = state.encounter;
  target.alive = false; target.path = []; target.targetId = null;
  const monster = monsterFor(content, target.monsterId);
  const corpseId = monster.corpseId;
  if (corpseId === undefined) throw new Error(`${monster.name} has no corpseId.`);
  const corpse: CorpseState = { id: `corpse-${target.id}`, monsterId: target.monsterId, corpseId, position: clonePosition(target.position), createdAt: encounter.elapsedMs };
  encounter.corpses.push(corpse);
  encounter.events.push({ type: 'enemy-death', enemyId: target.id, corpseId });
  encounter.visualEvents.push({ type: 'creature-died', creatureId: target.id, corpseId });
  addLog(state, `${target.name} morreu.`);
  const expRate = serverConfigManager.getConfig().expRate ?? 1.0;
  const lootRate = serverConfigManager.getConfig().lootRate ?? 1.0;
  grantSharedExperience(state, Math.ceil(monster.experience * (target.variant?.xpMultiplier ?? 1) * expRate), content);
  rollLoot(state, monster.id, content, (target.variant?.lootMultiplier ?? 1) * lootRate);
  if (encounter.expeditionProgress) encounter.expeditionProgress.kills += 1;
  if (encounter.continuousProgress) {
    encounter.continuousProgress.kills += 1;
    if (target.variant?.visualModifier === 'rare-aura') encounter.continuousProgress.rareKills += 1;
  }
  // Clear target for all party actors and session characters targeting this enemy
  for (const actor of encounter.partyActors) {
    if (actor.targetId === target.id) {
      actor.targetId = null;
      actor.path = [];
      if (actor.pendingAttack?.targetId === target.id) actor.pendingAttack = null;
    }
  }
  for (const char of state.session.characters) {
    if (char.combatState.targetId === target.id) {
      char.combatState.targetId = null;
    }
  }
  synchronizeEncounterOccupancy(encounter);
}

function attackRange(characterId: string, state: GameState, content: GameContent): number {
  const character = state.session.characters.find((candidate) => candidate.id === characterId);
  if (!character) return 1;
  if (typeof character.targetDistance === 'number' && character.targetDistance >= 1) {
    return character.targetDistance;
  }
  const weapon = getEquippedItems(character, content.equipment).find((item) => item.weaponType === 'distance' || item.weaponType === 'wand');
  return weapon ? Math.max(2, weapon.range) : 1;
}

function syncCharacterResources(state: GameState, actor: PartyActorState): void {
  const character = state.session.characters.find((candidate) => candidate.id === actor.characterId);
  if (!character) return;
  character.currentHp = actor.hp; character.currentMana = actor.mana;
  character.combatState.targetId = actor.targetId;
  character.combatState.spellCooldowns = { ...actor.spellCooldowns };
  character.combatState.groupCooldowns = { ...actor.groupCooldowns };
  if (actor.stance) character.stance = actor.stance;
  if (typeof actor.targetDistance === 'number') character.targetDistance = actor.targetDistance;
}

function regenerateParty(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  for (const actor of encounter.partyActors.filter((candidate) => candidate.alive)) {
    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
    const vocation = vocationFor(content, character.vocation);
    const manaInterval = Math.max(1, vocation.manaGainTicks * 2_000);
    const healthInterval = Math.max(1, vocation.healthGainTicks * 2_000);
    while (encounter.elapsedMs >= actor.nextManaRegenAt) {
      actor.mana = Math.min(character.maxMana, actor.mana + vocation.manaGainAmount);
      actor.nextManaRegenAt += manaInterval;
    }
    while (encounter.elapsedMs >= actor.nextHealthRegenAt) {
      actor.hp = Math.min(character.maxHp, actor.hp + vocation.healthGainAmount);
      actor.nextHealthRegenAt += healthInterval;
    }
    syncCharacterResources(state, actor);
  }
}

function resistedDamage(rawDamage: number, enemy: EnemyState, combatType: string, content: GameContent): number {
  const monster = monsterFor(content, enemy.monsterId);
  if (monster.immunities.includes(combatType)) return 0;
  const resistance = monster.elementalPercent[combatType] ?? 0;
  return Math.max(0, Math.round(rawDamage * (1 - resistance / 100)));
}

function resolveWeaponProjectile(character: CharacterState, content: GameContent): number {
  const equipped = getEquippedItems(character, content.equipment);
  const weapon = equipped.find((item) => ['sword', 'axe', 'club'].includes(item.weaponType));
  if (weapon?.weaponType === 'axe') return 25; // CONST_ANI_WHIRLWINDAXE
  if (weapon?.weaponType === 'club') return 26; // CONST_ANI_WHIRLWINDCLUB
  return 24; // CONST_ANI_WHIRLWINDSWORD / default
}

function formatSpellWords(words: string): string {
  if (!words) return '';
  return words
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function consumePotionFromInventory(state: GameState, potionId: number): boolean {
  const potionDef = HOTBAR_POTIONS.find((p) => p.id === potionId);
  if (!potionDef) return false;

  const containers = [
    state.session.bag ?? [],
    state.session.loot ?? [],
  ];

  for (const container of containers) {
    const stack = container.find(
      (item) => item.itemId === potionId || (item.name && item.name.toLowerCase().includes(potionDef.name.toLowerCase()))
    );
    if (stack && stack.amount > 0) {
      stack.amount -= 1;
      if (stack.amount <= 0) {
        const idx = container.indexOf(stack);
        if (idx !== -1) container.splice(idx, 1);
      }
      return true;
    }
  }

  const leader = state.session.characters.find((c) => c.id === state.session.leaderId || c.id === state.session.selectedCharacterId);
  if (leader && (leader as any).isAutoIdle) {
    const cost = 50;
    if (state.session.gold >= cost) {
      state.session.gold -= cost;
      return true;
    }
  }

  if ((state.session.bag ?? []).length === 0 && (state.session.loot ?? []).length === 0) {
    return true;
  }

  return false;
}

function castAutomaticSpells(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  const leaderActor = encounter.partyActors.find((a) => a.alive && (a.characterId === state.session.leaderId || a.characterId === state.session.selectedCharacterId)) ?? encounter.partyActors.find((a) => a.alive);

  for (const actor of encounter.partyActors.filter((candidate) => candidate.alive)) {
    const isLeader = actor.characterId === leaderActor?.characterId;
    const leaderTarget = leaderActor?.targetId ? encounter.enemies.find((e) => e.id === leaderActor.targetId && e.alive) : null;
    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
    const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
    const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));

    let usedPotionThisTick = false;
    let usedSpellThisTick = false;
    let usedOffensiveActionThisTick = false;

    ensureHealthPotionInHotbar(character, content);

    for (const actionId of character.hotbar) {
      if (typeof actionId !== 'number' || actionId === 0) continue;
      const action = findHotbarAction(actionId, content);
      if (!action || !isHotbarActionUnlocked(character, action)) continue;

      // 1. POTIONS AUTO-TRIGGER
      if (action.kind === 'potion' && !usedPotionThisTick) {
        const potion = action.potion;
        if ((actor.groupCooldowns['potion'] ?? 0) <= encounter.elapsedMs) {
          const needsHp = typeof potion.healMin === 'number' && (actor.hp / character.maxHp <= 0.50);
          const needsMana = typeof potion.manaMin === 'number' && character.maxMana > 0 && (actor.mana / character.maxMana <= 0.50);

          if (needsHp || needsMana) {
            const consumed = consumePotionFromInventory(state, potion.id);
            if (!consumed) continue;
            const rng = createSeededRng(encounter.rngState);
            let healed = 0;
            let restoredMana = 0;

            if (typeof potion.healMin === 'number' && typeof potion.healMax === 'number') {
              const rawHeal = rollInteger(rng, potion.healMin, potion.healMax);
              healed = Math.min(rawHeal, character.maxHp - actor.hp);
              actor.hp += healed;
            }

            if (typeof potion.manaMin === 'number' && typeof potion.manaMax === 'number') {
              const rawMana = rollInteger(rng, potion.manaMin, potion.manaMax);
              restoredMana = Math.min(rawMana, character.maxMana - actor.mana);
              actor.mana += restoredMana;
            }

            encounter.rngState = rng.state;
            actor.groupCooldowns['potion'] = encounter.elapsedMs + potion.cooldownMs;

            encounter.events.push({
              type: 'spell-cast',
              sourceId: actor.characterId,
              targetId: actor.characterId,
              spellId: potion.id,
              amount: healed || restoredMana,
              healing: healed > 0,
              speech: 'Aaaah...',
            });
            encounter.events.push({
              type: 'spell-visual',
              sourceId: actor.characterId,
              targetId: actor.characterId,
              spellId: potion.id,
              effectId: potion.effectId,
              projectileId: null,
            });

            const details = [
              healed > 0 ? `recuperou ${healed} HP` : '',
              restoredMana > 0 ? `recuperou ${restoredMana} MP` : '',
            ].filter(Boolean).join(' e ');

            addLog(state, `${character.name} usou ${potion.name} e ${details}.`);
            syncCharacterResources(state, actor);
            usedPotionThisTick = true;
          }
        }
      }

      // 2. RUNES AUTO-TRIGGER
      if (action.kind === 'rune' && !usedOffensiveActionThisTick) {
        // Strict Party Target Logic: In multiplayer party, secondary members only attack leader's target
        if (encounter.isMultiplayerParty && !isLeader && !leaderTarget) continue;
        const rune = action.rune;
        const runeReady = (actor.groupCooldowns['rune'] ?? 0) <= encounter.elapsedMs && (actor.groupCooldowns['attack'] ?? 0) <= encounter.elapsedMs;
        if (runeReady) {
          const eligibleEnemies = (encounter.isMultiplayerParty && !isLeader && leaderTarget)
            ? [leaderTarget]
            : encounter.enemies.filter((enemy) => enemy.alive);

          const inRange = eligibleEnemies
            .filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= rune.range)
            .sort((left, right) => meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id));

          if (inRange.length > 0) {
            const targets = rune.area === 'square-1x1' ? inRange.slice(0, 8) : [inRange[0]];
            const rng = createSeededRng(encounter.rngState);

            let minDmg = character.level * 0.2 + character.skills.magicLevel * 2.5 + 15;
            let maxDmg = character.level * 0.2 + character.skills.magicLevel * 4.0 + 30;

            if (rune.id === 2268) {
              minDmg = character.level * 0.2 + character.skills.magicLevel * 7.0 + 40;
              maxDmg = character.level * 0.2 + character.skills.magicLevel * 9.5 + 65;
            } else if (rune.id === 2311) {
              minDmg = character.level * 0.2 + character.skills.magicLevel * 1.6 + 10;
              maxDmg = character.level * 0.2 + character.skills.magicLevel * 2.4 + 18;
            } else if (rune.id === 2304 || rune.id === 2274) {
              minDmg = character.level * 0.2 + character.skills.magicLevel * 2.2 + 15;
              maxDmg = character.level * 0.2 + character.skills.magicLevel * 3.5 + 25;
            }

            const rawDamage = rollInteger(rng, Math.floor(minDmg), Math.max(Math.floor(minDmg), Math.ceil(maxDmg)));
            encounter.rngState = rng.state;
            actor.groupCooldowns['rune'] = encounter.elapsedMs + rune.cooldownMs;
            actor.groupCooldowns['attack'] = encounter.elapsedMs + rune.cooldownMs;
            actor.nextAttackAt = encounter.elapsedMs + rune.cooldownMs;

            for (const target of targets) {
              const damage = resistedDamage(rawDamage, target, rune.combatType, content);
              target.hp = Math.max(0, target.hp - damage);
              encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: target.id, spellId: rune.id, amount: damage, healing: false, speech: rune.name });
              encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: target.id, spellId: rune.id, effectId: rune.effectId, projectileId: rune.projectileId });
              addLog(state, `${character.name} usou ${rune.name} em ${target.name} por ${damage}.`);
              if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
            }

            syncCharacterResources(state, actor);
            usedOffensiveActionThisTick = true;
          }
        }
      }

      // 3. SPELLS AUTO-TRIGGER
      if (action.kind === 'spell' && !usedSpellThisTick) {
        const spell = action.spell;
        const isOffensive = spell.group === 'attack';
        if (isOffensive && usedOffensiveActionThisTick) continue;
        // Strict Party Target Logic: In multiplayer party, secondary members only attack leader's target
        if (encounter.isMultiplayerParty && isOffensive && !isLeader && !leaderTarget) continue;

        const spellReady = actor.mana >= spell.mana &&
          (actor.spellCooldowns[String(spell.spellId)] ?? 0) <= encounter.elapsedMs &&
          (actor.groupCooldowns[spell.group] ?? 0) <= encounter.elapsedMs &&
          (!isOffensive || ((actor.groupCooldowns['rune'] ?? 0) <= encounter.elapsedMs && (actor.groupCooldowns['attack'] ?? 0) <= encounter.elapsedMs));

        if (spellReady) {
          let targetActor: PartyActorState | undefined;
          let targets: EnemyState[] = [];
          const tookRecentHit = (encounter.elapsedMs - actor.lastHitTakenAt) < 3000 && actor.hp < character.maxHp;

          if (spell.group === 'healing') {
            const needsHealing = actor.hp / character.maxHp < 0.88 || tookRecentHit;
            targetActor = spell.name === 'Heal Friend'
              ? encounter.partyActors.filter((candidate) => candidate.alive && candidate.hp / state.session.characters.find((member) => member.id === candidate.characterId)!.maxHp < 0.75)
                  .sort((left, right) => left.hp - right.hp || left.characterId.localeCompare(right.characterId))[0]
              : needsHealing ? actor : undefined;
            if (!targetActor) continue;
          } else if (spell.group === 'support') {
            const isHaste = spell.name === 'Haste' || spell.name === 'Strong Haste' || spell.words.includes('hur');
            const isMagicShield = spell.words.includes('utamo') || spell.name.toLowerCase().includes('shield');
            const isBloodRage = spell.words.includes('tempo') || spell.name.toLowerCase().includes('rage');

            if (isHaste && actor.hasteUntil <= encounter.elapsedMs) {
              targetActor = actor;
            } else if (isMagicShield && actor.magicShieldUntil <= encounter.elapsedMs) {
              targetActor = actor;
            } else if (isBloodRage && actor.bloodRageUntil <= encounter.elapsedMs && encounter.enemies.some((enemy) => enemy.alive)) {
              targetActor = actor;
            } else {
              continue;
            }
          } else {
            const eligibleEnemies = (encounter.isMultiplayerParty && !isLeader && leaderTarget)
              ? [leaderTarget]
              : encounter.enemies.filter((enemy) => enemy.alive);
            const range = spell.area === 'wave-4' ? 4 : Math.max(1, spell.range);
            const inRange = eligibleEnemies.filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= range)
              .sort((left, right) => {
                const isLeftTarget = left.id === actor.targetId;
                const isRightTarget = right.id === actor.targetId;
                if (isLeftTarget !== isRightTarget) return isLeftTarget ? -1 : 1;
                return meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id);
              });
            if (inRange.length === 0) continue;
            targets = spell.area === 'wave-4' || spell.area === 'square-1x1' ? inRange.slice(0, spell.area === 'wave-4' ? 4 : 8) : [inRange[0]];
          }

          const rng = createSeededRng(encounter.rngState);
          const formulaRange = spellFormulaRange(spell, character, stats.activeSkillLevel, weapon?.attack ?? stats.attack);
          const amount = rollInteger(rng, Math.floor(formulaRange.min), Math.max(Math.floor(formulaRange.min), Math.ceil(formulaRange.max)));
          encounter.rngState = rng.state;
          actor.mana -= spell.mana;
          if (spell.mana > 0) {
            const vocation = vocationFor(content, character.vocation);
            const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
            const magicTries = spell.mana * content.rateMagic * skillRate;
            for (const advanced of addTrainingTries(character, 'magicLevel', magicTries, vocation)) {
              encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
              addLog(state, `You advanced to Magic Level ${character.skills.magicLevel}.`);
            }
          }
          actor.spellCooldowns[String(spell.spellId)] = encounter.elapsedMs + spell.cooldownMs;
          actor.groupCooldowns[spell.group] = encounter.elapsedMs + spell.groupCooldownMs;
          if (isOffensive) {
            actor.groupCooldowns['attack'] = encounter.elapsedMs + spell.groupCooldownMs;
            actor.groupCooldowns['rune'] = encounter.elapsedMs + spell.groupCooldownMs;
            actor.nextAttackAt = encounter.elapsedMs + spell.groupCooldownMs;
            usedOffensiveActionThisTick = true;
          }

          const spellSpeech = formatSpellWords(spell.words);
          const projectileId = spell.visual.projectileId === 'weapon-type' ? resolveWeaponProjectile(character, content) : spell.visual.projectileId;

          if (spell.group === 'healing' && targetActor) {
            const targetCharacter = state.session.characters.find((candidate) => candidate.id === targetActor!.characterId)!;
            const healed = Math.min(amount, targetCharacter.maxHp - targetActor.hp);
            targetActor.hp += healed;
            encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: targetActor.characterId, spellId: spell.spellId, amount: healed, healing: true, speech: spellSpeech });
            encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: targetActor.characterId, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
            addLog(state, `${character.name} usou ${spell.name} e curou ${healed}.`);
            syncCharacterResources(state, targetActor);
            usedSpellThisTick = true;
          } else if (spell.group === 'support' && targetActor) {
            const duration = spell.formula.durationMs ?? (spell.words.includes('utamo') ? 200_000 : 33_000);
            if (spell.words.includes('utamo')) actor.magicShieldUntil = encounter.elapsedMs + duration;
            else if (spell.words.includes('tempo')) actor.bloodRageUntil = encounter.elapsedMs + duration;
            else actor.hasteUntil = encounter.elapsedMs + duration;

            encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech });
            encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
            addLog(state, `${character.name} usou ${spell.name}.`);
            usedSpellThisTick = true;
          } else {
            if (spell.area === 'square-1x1') {
              const SURROUNDING_OFFSETS = [
                { dx: -1, dy: -1 }, { dx:  0, dy: -1 }, { dx:  1, dy: -1 },
                { dx: -1, dy:  0 },                     { dx:  1, dy:  0 },
                { dx: -1, dy:  1 }, { dx:  0, dy:  1 }, { dx:  1, dy:  1 },
              ];
              for (const offset of SURROUNDING_OFFSETS) {
                encounter.events.push({
                  type: 'spell-visual',
                  sourceId: actor.characterId,
                  targetPosition: { x: actor.position.x + offset.dx, y: actor.position.y + offset.dy, z: actor.position.z },
                  spellId: spell.spellId,
                  effectId: spell.visual.effectId,
                  projectileId: null,
                });
              }
            }

            for (const target of targets) {
              const damage = resistedDamage(amount, target, spell.combatType, content);
              target.hp = Math.max(0, target.hp - damage);
              encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: target.id, spellId: spell.spellId, amount: damage, healing: false, speech: spellSpeech });
              if (spell.area !== 'square-1x1') {
                encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: target.id, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
              }
              addLog(state, `${character.name} usou ${spell.name} em ${target.name} por ${damage}.`);
              if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
            }
            if (targets.length === 0) {
              encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech });
              addLog(state, `${character.name} usou ${spell.name}.`);
            }
            usedSpellThisTick = true;
          }
          syncCharacterResources(state, actor);
        }
      }
    }
  }
}

export function triggerManualHotbarAction(
  state: GameState,
  characterId: string,
  actionId: number,
  content: GameContent,
): boolean {
  const encounter = state.encounter;
  const actor = encounter.partyActors.find((candidate) => candidate.characterId === characterId && candidate.alive);
  if (!actor) return false;
  const character = state.session.characters.find((candidate) => candidate.id === characterId);
  if (!character) return false;
  const action = findHotbarAction(actionId, content);
  if (!action || !isHotbarActionUnlocked(character, action)) return false;

  // 1. Potion manual trigger
  if (action.kind === 'potion') {
    const potion = action.potion;
    if ((actor.groupCooldowns['potion'] ?? 0) > encounter.elapsedMs) return false;

    const consumed = consumePotionFromInventory(state, potion.id);
    if (!consumed) {
      addLog(state, `${character.name} não possui ${potion.name} no inventário.`);
      return false;
    }

    const rng = createSeededRng(encounter.rngState);
    let healed = 0;
    let restoredMana = 0;

    if (typeof potion.healMin === 'number' && typeof potion.healMax === 'number') {
      const rawHeal = rollInteger(rng, potion.healMin, potion.healMax);
      healed = Math.min(rawHeal, character.maxHp - actor.hp);
      actor.hp += healed;
    }
    if (typeof potion.manaMin === 'number' && typeof potion.manaMax === 'number') {
      const rawMana = rollInteger(rng, potion.manaMin, potion.manaMax);
      restoredMana = Math.min(rawMana, character.maxMana - actor.mana);
      actor.mana += restoredMana;
    }

    encounter.rngState = rng.state;
    actor.groupCooldowns['potion'] = encounter.elapsedMs + potion.cooldownMs;

    encounter.events.push({
      type: 'spell-cast',
      sourceId: actor.characterId,
      targetId: actor.characterId,
      spellId: potion.id,
      amount: healed || restoredMana,
      healing: healed > 0,
      speech: 'Aaaah...',
    });
    encounter.events.push({
      type: 'spell-visual',
      sourceId: actor.characterId,
      targetId: actor.characterId,
      spellId: potion.id,
      effectId: potion.effectId,
      projectileId: null,
    });

    const details = [
      healed > 0 ? `recuperou ${healed} HP` : '',
      restoredMana > 0 ? `recuperou ${restoredMana} MP` : '',
    ].filter(Boolean).join(' e ');

    addLog(state, `${character.name} usou ${potion.name} e ${details}.`);
    syncCharacterResources(state, actor);
    return true;
  }

  // 2. Rune manual trigger
  if (action.kind === 'rune') {
    const rune = action.rune;
    if ((actor.groupCooldowns['rune'] ?? 0) > encounter.elapsedMs || (actor.groupCooldowns['attack'] ?? 0) > encounter.elapsedMs) return false;
    const inRange = encounter.enemies
      .filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= rune.range)
      .sort((left, right) => {
        const isLeftTarget = left.id === actor.targetId;
        const isRightTarget = right.id === actor.targetId;
        if (isLeftTarget !== isRightTarget) return isLeftTarget ? -1 : 1;
        return meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id);
      });

    if (inRange.length === 0) return false;
    const targets = rune.area === 'square-1x1' ? inRange.slice(0, 8) : [inRange[0]];
    const rng = createSeededRng(encounter.rngState);

    let minDmg = character.level * 0.2 + character.skills.magicLevel * 2.5 + 15;
    let maxDmg = character.level * 0.2 + character.skills.magicLevel * 4.0 + 30;
    if (rune.id === 2268) {
      minDmg = character.level * 0.2 + character.skills.magicLevel * 7.0 + 40;
      maxDmg = character.level * 0.2 + character.skills.magicLevel * 9.5 + 65;
    }

    const rawDamage = rollInteger(rng, Math.floor(minDmg), Math.max(Math.floor(minDmg), Math.ceil(maxDmg)));
    encounter.rngState = rng.state;
    actor.groupCooldowns['rune'] = encounter.elapsedMs + rune.cooldownMs;
    actor.groupCooldowns['attack'] = encounter.elapsedMs + rune.cooldownMs;
    actor.nextAttackAt = encounter.elapsedMs + rune.cooldownMs;

    for (const target of targets) {
      const damage = resistedDamage(rawDamage, target, rune.combatType, content);
      target.hp = Math.max(0, target.hp - damage);
      encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: target.id, spellId: rune.id, amount: damage, healing: false, speech: rune.name });
      encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: target.id, spellId: rune.id, effectId: rune.effectId, projectileId: rune.projectileId });
      addLog(state, `${character.name} usou ${rune.name} em ${target.name} por ${damage}.`);
      if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
    }
    syncCharacterResources(state, actor);
    return true;
  }

  // 3. Spell manual trigger
  const spell = action.spell;
  if (actor.mana < spell.mana) return false;
  if ((actor.spellCooldowns[String(spell.spellId)] ?? 0) > encounter.elapsedMs) return false;
  if ((actor.groupCooldowns[spell.group] ?? 0) > encounter.elapsedMs) return false;
  const isOffensive = spell.group === 'attack';
  if (isOffensive && (actor.groupCooldowns['rune'] ?? 0) > encounter.elapsedMs) return false;

  const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
  const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));
  const rng = createSeededRng(encounter.rngState);
  const formulaRange = spellFormulaRange(spell, character, stats.activeSkillLevel, weapon?.attack ?? stats.attack);
  const amount = rollInteger(rng, Math.floor(formulaRange.min), Math.max(Math.floor(formulaRange.min), Math.ceil(formulaRange.max)));
  encounter.rngState = rng.state;
  actor.mana -= spell.mana;
  if (spell.mana > 0) {
    const vocation = vocationFor(content, character.vocation);
    const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
    const magicTries = spell.mana * content.rateMagic * skillRate;
    for (const advanced of addTrainingTries(character, 'magicLevel', magicTries, vocation)) {
      encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
      addLog(state, `You advanced to Magic Level ${character.skills.magicLevel}.`);
    }
  }
  actor.spellCooldowns[String(spell.spellId)] = encounter.elapsedMs + spell.cooldownMs;
  actor.groupCooldowns[spell.group] = encounter.elapsedMs + spell.groupCooldownMs;
  if (isOffensive) {
    actor.groupCooldowns['attack'] = encounter.elapsedMs + spell.groupCooldownMs;
    actor.groupCooldowns['rune'] = encounter.elapsedMs + spell.groupCooldownMs;
    actor.nextAttackAt = encounter.elapsedMs + spell.groupCooldownMs;
  }

  const spellSpeech = formatSpellWords(spell.words);
  const projectileId = spell.visual.projectileId === 'weapon-type' ? resolveWeaponProjectile(character, content) : spell.visual.projectileId;

  if (spell.group === 'healing') {
    const healed = Math.min(amount, character.maxHp - actor.hp);
    actor.hp += healed;
    encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: healed, healing: true, speech: spellSpeech });
    encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
    addLog(state, `${character.name} usou ${spell.name} e curou ${healed}.`);
    syncCharacterResources(state, actor);
    return true;
  }

  if (spell.group === 'support') {
    const duration = spell.formula.durationMs ?? (spell.words.includes('utamo') ? 200_000 : 33_000);
    if (spell.words.includes('utamo')) actor.magicShieldUntil = encounter.elapsedMs + duration;
    else if (spell.words.includes('tempo')) actor.bloodRageUntil = encounter.elapsedMs + duration;
    else actor.hasteUntil = encounter.elapsedMs + duration;

    encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech });
    encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
    addLog(state, `${character.name} usou ${spell.name}.`);
    syncCharacterResources(state, actor);
    return true;
  }

  // Attack spell
  const spellRange = spell.area === 'wave-4' ? 4 : Math.max(1, spell.range);
  const inRange = encounter.enemies.filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= spellRange)
    .sort((left, right) => {
      const isLeftTarget = left.id === actor.targetId;
      const isRightTarget = right.id === actor.targetId;
      if (isLeftTarget !== isRightTarget) return isLeftTarget ? -1 : 1;
      return meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id);
    });

  if (inRange.length === 0 && spell.area === 'target') return false;
  const targets = spell.area === 'wave-4' || spell.area === 'square-1x1' ? inRange.slice(0, spell.area === 'wave-4' ? 4 : 8) : (inRange.length > 0 ? [inRange[0]] : []);

  if (spell.area === 'square-1x1') {
    const SURROUNDING_OFFSETS = [
      { dx: -1, dy: -1 }, { dx:  0, dy: -1 }, { dx:  1, dy: -1 },
      { dx: -1, dy:  0 },                     { dx:  1, dy:  0 },
      { dx: -1, dy:  1 }, { dx:  0, dy:  1 }, { dx:  1, dy:  1 },
    ];
    for (const offset of SURROUNDING_OFFSETS) {
      encounter.events.push({
        type: 'spell-visual',
        sourceId: actor.characterId,
        targetPosition: { x: actor.position.x + offset.dx, y: actor.position.y + offset.dy, z: actor.position.z },
        spellId: spell.spellId,
        effectId: spell.visual.effectId,
        projectileId: null,
      });
    }
  }

  for (const target of targets) {
    const damage = resistedDamage(amount, target, spell.combatType, content);
    target.hp = Math.max(0, target.hp - damage);
    encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: target.id, spellId: spell.spellId, amount: damage, healing: false, speech: spellSpeech });
    if (spell.area !== 'square-1x1') {
      encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: target.id, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
    }
    addLog(state, `${character.name} usou ${spell.name} em ${target.name} por ${damage}.`);
    if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
  }

  if (targets.length === 0) {
    encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech });
    addLog(state, `${character.name} usou ${spell.name}.`);
  }
  syncCharacterResources(state, actor);
  return true;
}

function playerAttacks(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  const leaderActor = encounter.partyActors.find((a) => a.alive && (a.characterId === state.session.leaderId || a.characterId === state.session.selectedCharacterId)) ?? encounter.partyActors.find((a) => a.alive);

  for (const actor of encounter.partyActors.filter((candidate) => candidate.alive)) {
    if (actor.pendingAttack && encounter.elapsedMs >= actor.pendingAttack.impactAt) {
      const pending = actor.pendingAttack; actor.pendingAttack = null;
      const target = encounter.enemies.find((enemy) => enemy.id === pending.targetId && enemy.alive);
      if (target) {
        const rng = createSeededRng(encounter.rngState);
        const raw = rollInteger(rng, 0, Math.max(1, pending.attack));
        const armor = rollInteger(rng, Math.floor(target.armor / 2), target.armor);
        const damage = Math.max(1, raw - armor); encounter.rngState = rng.state;
        target.hp = Math.max(0, target.hp - damage);
        encounter.events.push({ type: 'player-attack', sourceId: actor.characterId, targetId: target.id, damage });
        if (pending.ranged) {
          const nameLower = pending.weaponName.toLowerCase();
          const isMagic = nameLower.includes('wand') || nameLower.includes('rod');
          let effectId = 10;
          if (isMagic) {
            if (nameLower.includes('vortex') || nameLower.includes('cosmic') || nameLower.includes('energy') || nameLower.includes('starfall')) {
              effectId = 11; // CONST_ME_ENERGYHIT
            } else if (nameLower.includes('dragonbreath') || nameLower.includes('draconia') || nameLower.includes('fire')) {
              effectId = 15; // CONST_ME_HITBYFIRE
            } else if (nameLower.includes('decay') || nameLower.includes('voodoo') || nameLower.includes('death') || nameLower.includes('necrotic') || nameLower.includes('underworld')) {
              effectId = 17; // CONST_ME_MORTAREA
            } else if (nameLower.includes('snakebite') || nameLower.includes('springsprout') || nameLower.includes('terra') || nameLower.includes('earth') || nameLower.includes('poison')) {
              effectId = 8; // CONST_ME_POISONRINGS
            } else if (nameLower.includes('moonlight') || nameLower.includes('hailstorm') || nameLower.includes('ice')) {
              effectId = 43; // CONST_ME_ICEATTACK
            } else {
              effectId = 11;
            }
          }
          encounter.visualEvents.push({ type: 'projectile-hit', sourceId: actor.characterId, targetId: target.id, effectId });
        } else {
          encounter.visualEvents.push({ type: 'melee-hit', sourceId: actor.characterId, targetId: target.id, effectId: 10, blocked: damage <= 0 });
        }
        const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
        if (pending.activeSkill) {
          const vocation = vocationFor(content, character.vocation);
          const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
          const rateMultiplier = pending.activeSkill === 'magicLevel' ? content.rateMagic : content.rateSkill;
          const tries = 1 * rateMultiplier * skillRate;
          for (const advanced of addTrainingTries(character, pending.activeSkill, tries, vocation)) {
            encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
            const skillDisplayName = pending.activeSkill === 'magicLevel' ? `Magic Level ${character.skills.magicLevel}` : pending.activeSkill;
            addLog(state, `You advanced in ${skillDisplayName}.`);
          }
        }
        addLog(state, `${character.name} atingiu ${target.name} por ${damage} com ${pending.weaponName}.`);
        if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
      }
    }
    if (actor.pendingAttack) continue;
    if (encounter.elapsedMs < actor.nextAttackAt || (actor.groupCooldowns['attack'] ?? 0) > encounter.elapsedMs) continue;

    const isLeader = actor.characterId === leaderActor?.characterId;
    const leaderTarget = leaderActor?.targetId ? encounter.enemies.find((e) => e.id === leaderActor.targetId && e.alive) : null;

    // Strict Party Target Logic:
    // In multiplayer party with friends, secondary members MUST ONLY attack the leader's target!
    // If the leader has no target or the leader's target is dead, the secondary member waits!
    if (encounter.isMultiplayerParty && !isLeader) {
      if (!leaderTarget) {
        actor.targetId = null;
        continue;
      }
      actor.targetId = leaderTarget.id;
    }

    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
    const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
    if (stats.attack <= 0) continue;
    const stance = character.stance ?? actor.stance ?? 'offensive';
    const stanceMultiplier = stance === 'offensive' ? 1.0 : stance === 'balanced' ? 0.75 : 0.5;
    const effectiveAttack = Math.max(1, Math.round(stats.attack * stanceMultiplier));
    const range = attackRange(character.id, state, content);

    let target: EnemyState | undefined;
    if (encounter.isMultiplayerParty && !isLeader && leaderTarget) {
      target = meleeDistance(actor.position, leaderTarget.position) <= range ? leaderTarget : undefined;
    } else {
      const lockedTarget = encounter.enemies.find((enemy) => enemy.id === actor.targetId && enemy.alive);
      target = lockedTarget && meleeDistance(actor.position, lockedTarget.position) <= range ? lockedTarget : undefined;
      if (!target) {
        target = encounter.enemies.find((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= range);
        if (target && !lockedTarget) actor.targetId = target.id;
      }
    }

    if (!target) continue;
    const ranged = range > 1;
    actor.pendingAttack = { targetId: target.id, impactAt: encounter.elapsedMs + 180, attack: effectiveAttack, weaponName: stats.weaponName, activeSkill: stats.activeSkill, activeSkillLevel: stats.activeSkillLevel, ranged };
    encounter.visualEvents.push({ type: 'basic-attack-started', sourceId: character.id, targetId: target.id, ranged });
    if (ranged) {
      const nameLower = stats.weaponName.toLowerCase();
      const isMagic = nameLower.includes('wand') || nameLower.includes('rod');
      let projectileId = 28;
      if (isMagic) {
        if (nameLower.includes('vortex') || nameLower.includes('cosmic') || nameLower.includes('energy') || nameLower.includes('starfall')) projectileId = 4; // Energy spark
        else if (nameLower.includes('dragonbreath') || nameLower.includes('draconia') || nameLower.includes('fire')) projectileId = 3; // Fire
        else if (nameLower.includes('decay') || nameLower.includes('voodoo') || nameLower.includes('death') || nameLower.includes('necrotic') || nameLower.includes('underworld')) projectileId = 31; // Death
        else if (nameLower.includes('snakebite') || nameLower.includes('springsprout') || nameLower.includes('terra') || nameLower.includes('earth') || nameLower.includes('poison')) projectileId = 14; // Poison
        else if (nameLower.includes('moonlight') || nameLower.includes('hailstorm') || nameLower.includes('ice')) projectileId = 28; // Ice / magic
        else projectileId = 4;
      }
      encounter.visualEvents.push({ type: 'projectile-launched', sourceId: character.id, targetId: target.id, projectileId });
    }
    actor.attackIntervalMs = stats.attackIntervalMs;
    actor.speed = vocationFor(content, character.vocation).baseSpeed + (character.level - 1) * 2 + stats.movementSpeedBonus;
    actor.nextAttackAt = encounter.elapsedMs + stats.attackIntervalMs;
    actor.groupCooldowns['attack'] = encounter.elapsedMs + stats.attackIntervalMs;
    actor.groupCooldowns['rune'] = encounter.elapsedMs + stats.attackIntervalMs;
  }
}

export function triggerEmergencyAutoPotion(
  state: GameState,
  target: PartyActorState,
  character: CharacterState,
  content: GameContent,
  incomingDamage: number
): void {
  const encounter = state.encounter;
  const isLethalOrCritical = (target.hp - incomingDamage <= 0) || (target.hp / character.maxHp <= 0.50);
  if (!isLethalOrCritical) return;

  const potionId = ensureHealthPotionInHotbar(character, content);
  if (!potionId) return;

  const action = findHotbarAction(potionId, content);
  if (!action || action.kind !== 'potion' || !isHotbarActionUnlocked(character, action)) return;

  const potion = action.potion;
  const canDrink = (target.groupCooldowns['potion'] ?? 0) <= encounter.elapsedMs || target.hp - incomingDamage <= 0;
  if (!canDrink) return;

  const consumed = consumePotionFromInventory(state, potion.id);
  if (!consumed) return;

  const rng = createSeededRng(encounter.rngState);
  let healed = 0;
  let restoredMana = 0;

  if (typeof potion.healMin === 'number' && typeof potion.healMax === 'number') {
    const rawHeal = rollInteger(rng, potion.healMin, potion.healMax);
    healed = Math.min(rawHeal, character.maxHp - target.hp);
    target.hp += healed;
  }

  if (typeof potion.manaMin === 'number' && typeof potion.manaMax === 'number') {
    const rawMana = rollInteger(rng, potion.manaMin, potion.manaMax);
    restoredMana = Math.min(rawMana, character.maxMana - target.mana);
    target.mana += restoredMana;
  }

  encounter.rngState = rng.state;
  target.groupCooldowns['potion'] = encounter.elapsedMs + potion.cooldownMs;

  encounter.events.push({
    type: 'spell-cast',
    sourceId: target.characterId,
    targetId: target.characterId,
    spellId: potion.id,
    amount: healed || restoredMana,
    healing: healed > 0,
    speech: 'Aaaah...',
  });
  encounter.events.push({
    type: 'spell-visual',
    sourceId: target.characterId,
    targetId: target.characterId,
    spellId: potion.id,
    effectId: potion.effectId,
    projectileId: null,
  });

  addLog(state, `${character.name} tomou poção de emergência (${potion.name}) antes do golpe fatal e recuperou ${healed} HP!`);
  syncCharacterResources(state, target);
}

function enemyAttacks(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  const rng = createSeededRng(encounter.rngState);
  for (const enemy of encounter.enemies.filter((candidate) => candidate.alive)) {
    if (encounter.elapsedMs < enemy.nextAttackAt) continue;
    const target = encounter.partyActors.find((actor) => actor.characterId === enemy.targetId && actor.alive && isMeleeRange(enemy.position, actor.position))
      ?? encounter.partyActors.find((actor) => actor.alive && isMeleeRange(enemy.position, actor.position));
    if (!target) continue;
    const character = state.session.characters.find((candidate) => candidate.id === target.characterId)!;
    const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
    const stance = character.stance ?? target.stance ?? 'offensive';
    const defenseMultiplier = stance === 'defensive' ? 1.0 : stance === 'balanced' ? 0.75 : 0.5;
    const raw = rollInteger(rng, 0, enemy.attackMax);
    const effectiveDefense = Math.max(0, Math.round(stats.defense * defenseMultiplier));
    const defense = rollInteger(rng, Math.floor(effectiveDefense / 2), effectiveDefense);
    const armor = rollInteger(rng, Math.floor(stats.armor / 2), stats.armor);
    let damage = Math.max(0, raw - defense - armor);
    if (damage > 0 && stats.physicalDamageMitigationPercent > 0) {
      damage = Math.max(0, Math.round(damage * (1 - stats.physicalDamageMitigationPercent / 100)));
    }
    enemy.nextAttackAt = encounter.elapsedMs + enemy.attackIntervalMs;
    // Progress shielding skill when defending with shield
    const hasShield = getEquippedItems(character, content.equipment).some((item) => item.weaponType === 'shield');
    if (hasShield) {
      const vocation = vocationFor(content, character.vocation);
      const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
      const tries = 1 * content.rateSkill * skillRate;
      for (const advanced of addTrainingTries(character, 'shielding', tries, vocation)) {
        encounter.events.push({ type: 'skill-up', characterId: character.id, skill: advanced, level: character.skills[advanced] });
        addLog(state, `You advanced in Shielding.`);
      }
    }
    if (damage > 0) {
      target.lastHitTakenAt = encounter.elapsedMs;
      // Emergency auto-potion check before applying lethal/critical damage!
      triggerEmergencyAutoPotion(state, target, character, content, damage);

      // Magic Shield (Utamo Vita) absorbs damage with mana first!
      if (target.magicShieldUntil > encounter.elapsedMs && target.mana > 0) {
        const manaDamage = Math.min(damage, target.mana);
        target.mana -= manaDamage;
        const remainingDamage = damage - manaDamage;
        target.hp = Math.max(0, target.hp - remainingDamage);
        encounter.visualEvents.push({ type: 'heal-applied', sourceId: target.characterId, targetId: target.characterId, effectId: 13 });
      } else {
        target.hp = Math.max(0, target.hp - damage);
      }
    }
    encounter.events.push({ type: 'enemy-attack', sourceId: enemy.id, targetId: target.characterId, damage });
    addLog(state, `${enemy.name} causou ${damage} em ${character.name}.`);
    if (target.hp <= 0) {
      target.alive = false; target.path = [];
      encounter.events.push({ type: 'player-death', characterId: target.characterId });
      addLog(state, `${character.name} foi derrotado.`);
    }
    syncCharacterResources(state, target);
  }
  encounter.rngState = rng.state;
  if (!encounter.partyActors.some((actor) => actor.alive)) encounter.status = 'defeated';
  synchronizeEncounterOccupancy(encounter);
}

function recordMovementEvents(encounter: HuntEncounterState): void {
  for (const actor of [...encounter.partyActors, ...encounter.enemies.filter((enemy) => enemy.alive)]) {
    const id = 'characterId' in actor ? actor.characterId : actor.id;
    if (!samePosition(actor.previousPosition, actor.position)) {
      const durationMs = Math.max(420, Math.min(1_100, Math.round(BASE_TILE_TRAVEL_MS * 220 / Math.max(1, actor.speed))));
      encounter.events.push({ type: 'movement', actorId: id, from: clonePosition(actor.previousPosition), to: clonePosition(actor.position), durationMs });
    }
  }
}

function unlockExit(state: GameState): void {
  if (state.encounter.room.exitUnlocked || state.encounter.enemies.some((enemy) => enemy.alive)) return;
  state.encounter.room.exitUnlocked = true; state.encounter.room.phase = 'room-cleared'; state.encounter.room.phaseTicks = 1;
  state.encounter.events.push({ type: 'room-complete', room: state.encounter.room.number });
  addLog(state, `Room ${state.encounter.room.number} limpa. Saída liberada.`);
}

function advanceRoomTransition(state: GameState, content: GameContent): void {
  const encounter = state.encounter; const room = encounter.room;
  if (room.phase === 'entering') {
    if (--room.phaseTicks <= 0) { room.phase = 'combat'; addLog(state, `A party entrou na Room ${room.number}.`); }
  } else if (room.phase === 'room-cleared') {
    if (--room.phaseTicks <= 0) { room.phase = 'exiting'; addLog(state, 'A party segue para a saída.'); }
  } else if (room.phase === 'exiting') {
    if (!movePartyToExit(encounter)) return;
    if (encounter.waveIndex >= encounter.hunt.waves.length - 1) {
      encounter.status = 'completed'; encounter.events.push({ type: 'hunt-complete' }); addLog(state, `${encounter.hunt.name} concluída.`); return;
    }
    room.phase = 'transitioning'; room.phaseTicks = 1;
  } else if (room.phase === 'transitioning' && --room.phaseTicks <= 0) {
    encounter.waveIndex += 1; encounter.events.push({ type: 'wave-complete', wave: encounter.waveIndex });
    spawnRoom(state, content); encounter.events.push({ type: 'room-transition', room: encounter.room.number });
  }
}

function advanceSpatialCombat(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  encounter.room.reservations = new Map();
  const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
  movePartyTowardTargets(encounter, ranges, undefined, state.session.selectedCharacterId); moveEnemiesTowardParty(encounter); recordMovementEvents(encounter);
  castAutomaticSpells(state, content); playerAttacks(state, content); enemyAttacks(state, content); unlockExit(state);
}

function advanceExpedition(state: GameState, content: GameContent): void {
  const encounter = state.encounter; const expedition = encounter.expedition; const progress = encounter.expeditionProgress;
  if (!expedition || !progress) return;
  encounter.room.reservations = new Map();
  const current = expedition.encounters[progress.activeEncounterIndex];
  if (encounter.enemies.some((enemy) => enemy.alive)) {
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    movePartyTowardTargets(encounter, ranges, undefined, state.session.selectedCharacterId); moveEnemiesTowardParty(encounter); recordMovementEvents(encounter);
    castAutomaticSpells(state, content); playerAttacks(state, content); enemyAttacks(state, content);
    return;
  }
  if (current && !progress.activeEncounterSpawned) {
    const reached = movePartyTowardPoint(encounter, current.anchor, state.session.selectedCharacterId); recordMovementEvents(encounter);
    progress.explorationPercent = Math.max(progress.explorationPercent, Math.round(100 * progress.activeEncounterIndex / expedition.encounters.length));
    if (reached) spawnExpeditionEncounter(state, content);
    return;
  }
  if (current) {
    progress.completedEncounterIds.push(current.id);
    if (current.boss) progress.bossState = 'defeated';
    encounter.events.push({ type: 'wave-complete', wave: current.sourceWaveIndex + 1 });
    progress.activeEncounterIndex += 1;
    progress.activeEncounterSpawned = false;
    progress.explorationPercent = Math.round(100 * progress.activeEncounterIndex / expedition.encounters.length);
    return;
  }
  const reachedExit = movePartyTowardPoint(encounter, expedition.exitPoint, state.session.selectedCharacterId); recordMovementEvents(encounter);
  if (reachedExit) {
    progress.reachedExit = true; progress.explorationPercent = 100; encounter.status = 'completed';
    encounter.events.push({ type: 'hunt-complete' }); addLog(state, `${encounter.hunt.name} concluída.`);
  }
}

export interface HuntObjective { kind: 'combat' | 'next-respawn' | 'waypoint' | 'next-loop'; zoneIndex: number; target: GridPosition; enemyIds: string[] }

export function resolveNextHuntObjective(state: GameState): HuntObjective | null {
  const { encounter } = state; const route = encounter.huntRoute; const progress = encounter.continuousProgress;
  if (!route || !progress || route.respawnZones.length === 0) return null;
  for (let offset = 0; offset < route.respawnZones.length; offset += 1) {
    const zoneIndex = (progress.currentZoneIndex + offset) % route.respawnZones.length;
    const enemyIds = progress.zones[zoneIndex].activeEnemyIds.filter((id) => encounter.enemies.some((enemy) => enemy.id === id && enemy.alive));
    if (enemyIds.length > 0) return { kind: 'combat', zoneIndex, target: clonePosition(route.respawnZones[zoneIndex].center), enemyIds };
  }
  const zoneIndex = progress.currentZoneIndex;
  return { kind: progress.loopCount > 0 && zoneIndex === 0 ? 'next-loop' : (progress.zones[zoneIndex].nextRespawnAt > encounter.elapsedMs ? 'waypoint' : 'next-respawn'), zoneIndex, target: clonePosition(route.respawnZones[zoneIndex].center), enemyIds: [] };
}

function recordContinuousActivityOrThrow(state: GameState, objective: HuntObjective): void {
  const progress = state.encounter.continuousProgress!;
  const active = state.encounter.events.some((event) => event.type === 'movement' || event.type === 'player-attack' || event.type === 'enemy-attack' || event.type === 'enemy-death');
  if (active) { progress.lastActivityAt = state.encounter.elapsedMs; progress.stalledSince = null; return; }
  if (progress.stalledSince === null) progress.stalledSince = state.encounter.elapsedMs;
  if (state.encounter.elapsedMs - progress.lastActivityAt >= 5_000) {
    const leader = state.encounter.partyActors.find((actor) => actor.characterId === state.session.leaderId);
    throw new Error(`[continuous-hunt-deadlock] hunt=${state.encounter.hunt.id} zone=${objective.zoneIndex} objective=${objective.kind} target=${objective.target.x},${objective.target.y},${objective.target.z} leader=${leader ? `${leader.position.x},${leader.position.y},${leader.position.z}` : 'missing'} elapsed=${state.encounter.elapsedMs}`);
  }
}

function advanceContinuousHunt(state: GameState, content: GameContent): void {
  const encounter = state.encounter; const route = encounter.huntRoute; const progress = encounter.continuousProgress;
  if (!route || !progress) return;
  encounter.room.reservations = new Map();
  populateReadyRespawns(state, content);
  let zone = route.respawnZones[progress.currentZoneIndex]; let zoneState = progress.zones[progress.currentZoneIndex];
  const activeEnemies = zoneState.activeEnemyIds.filter((id) => encounter.enemies.some((enemy) => enemy.id === id && enemy.alive));
  if (zoneState.activeEnemyIds.length > 0 && activeEnemies.length === 0) {
    zoneState.activeEnemyIds = []; zoneState.lastClearedAt = encounter.elapsedMs;
    zoneState.nextRespawnAt = encounter.elapsedMs + zone.gameRespawnSeconds * 1_000;
    progress.currentZoneIndex += 1;
    if (progress.currentZoneIndex >= route.respawnZones.length) { progress.currentZoneIndex = 0; progress.loopCount += 1; }
    addLog(state, `${zone.id} limpa. A party continua a rota.`);
    zone = route.respawnZones[progress.currentZoneIndex]; zoneState = progress.zones[progress.currentZoneIndex];
  }
  const objective = resolveNextHuntObjective(state);
  if (!objective) {
    if (progress.stalledSince === null) progress.stalledSince = encounter.elapsedMs;
    if (encounter.elapsedMs - progress.stalledSince >= 5_000) throw new Error(`[continuous-hunt-deadlock] hunt=${encounter.hunt.id} zone=${progress.currentZoneIndex} elapsed=${encounter.elapsedMs} no objective`);
    return;
  }
  progress.stalledSince = null;
  if (objective.kind === 'combat') {
    progress.currentZoneIndex = objective.zoneIndex;
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    movePartyTowardTargets(encounter, ranges, new Set(objective.enemyIds), state.session.selectedCharacterId);
    const leader = encounter.partyActors.find((actor) => actor.characterId === state.session.leaderId && actor.alive) ?? encounter.partyActors.find((actor) => actor.alive);
    if (leader && leader.path.length === 0 && !encounter.enemies.some((e) => e.alive && meleeDistance(leader.position, e.position) <= (ranges.get(leader.characterId) ?? 1))) {
      movePartyTowardPoint(encounter, objective.target, state.session.selectedCharacterId);
    }
    moveEnemiesTowardParty(encounter); recordMovementEvents(encounter);
    castAutomaticSpells(state, content); playerAttacks(state, content); enemyAttacks(state, content);
    recordContinuousActivityOrThrow(state, objective);
    return;
  }

  const visibleEnemies = encounter.enemies.filter((enemy) => enemy.alive && encounter.partyActors.some((actor) => actor.alive && (actor.targetId === enemy.id || meleeDistance(actor.position, enemy.position) <= 7)));
  if (visibleEnemies.length > 0) {
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    movePartyTowardTargets(encounter, ranges, new Set(visibleEnemies.map((e) => e.id)), state.session.selectedCharacterId);
    moveEnemiesTowardParty(encounter);
    recordMovementEvents(encounter);
    castAutomaticSpells(state, content);
    playerAttacks(state, content);
    enemyAttacks(state, content);
    recordContinuousActivityOrThrow(state, objective);
    return;
  }

  const leader = encounter.partyActors.find((actor) => actor.characterId === state.session.leaderId && actor.alive) ?? encounter.partyActors.find((actor) => actor.alive);
  if (!leader) return;
  const before = `${leader.position.x},${leader.position.y}`;
  const reached = movePartyTowardPoint(encounter, objective.target, state.session.selectedCharacterId);
  moveEnemiesTowardParty(encounter);
  recordMovementEvents(encounter);
  castAutomaticSpells(state, content);
  playerAttacks(state, content);
  enemyAttacks(state, content);
  if (`${leader.position.x},${leader.position.y}` !== before) progress.lastActivityAt = encounter.elapsedMs;
  if (reached && objective.enemyIds.length === 0) {
    progress.currentZoneIndex = (progress.currentZoneIndex + 1) % route.respawnZones.length;
    if (progress.currentZoneIndex === 0) progress.loopCount += 1;
    progress.lastActivityAt = encounter.elapsedMs;
  }
  recordContinuousActivityOrThrow(state, objective);
}

export function createIdleGame(seed: string, content: GameContent, huntId = 'rat-cellars', mode: 'continuous' | 'expedition' | 'legacyWaveMode' | 'waves' = 'continuous'): GameState {
  const character = createCharacter('knight-aldric', 'Aldric', 'Knight', content);
  const session: SessionState = {
    leaderId: character.id, selectedCharacterId: character.id, cameraTargetCharacterId: character.id, characters: [character],
    loot: [], gold: 0, trainingElapsedMs: 0, itemLootPreferences: {},
  };
  const state: GameState = { session, encounter: createEncounter(seed, session, content, huntId, mode) };
  synchronizeEncounterOccupancy(state.encounter); addLog(state, `Sessão pronta. Seed: ${seed}.`); return state;
}

export function startGame(state: GameState, content: GameContent): GameState {
  const next = cloneState(state);
  if (next.encounter.status !== 'ready') return next;
  if (leaderOf(next).level < next.encounter.hunt.minimumLevel) return next;
  next.encounter.status = 'running';
  if (next.encounter.mode === 'legacyWaveMode') spawnRoom(next, content);
  else if (next.encounter.mode === 'expedition') { next.encounter.room.phase = 'combat'; next.encounter.room.phaseTicks = 0; spawnExpeditionEncounter(next, content); }
  else { next.encounter.room.phase = 'combat'; next.encounter.room.phaseTicks = 0; populateReadyRespawns(next, content, true); }
  addLog(next, `${leaderOf(next).name} iniciou ${next.encounter.hunt.name}.`); return next;
}

export function restartHunt(state: GameState, seed: string, content: GameContent, huntId = state.encounter.hunt.id): GameState {
  const session = structuredClone(state.session) as SessionState;
  session.characters = session.characters.map((character) => ({
    ...character,
    currentHp: character.maxHp,
    currentMana: character.maxMana,
    combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
  }));
  return startGame({ session, encounter: createEncounter(seed, session, content, huntId, state.encounter.mode) }, content);
}

export function selectHunt(state: GameState, seed: string, content: GameContent, huntId: string): GameState {
  return restartHunt(state, seed, content, huntId);
}

export function advanceCombat(state: GameState, content: GameContent, deltaMs = MOVEMENT_TICK_MS): GameState {
  const next = cloneState(state); const encounter = next.encounter;
  if (encounter.status !== 'running' || deltaMs <= 0) return next;
  encounter.elapsedMs += deltaMs; encounter.round += 1;

  const deltaSec = deltaMs / 1000;
  for (const character of next.session.characters) {
    const maxStamina = calculateMaxStamina(character.level);
    character.maxStaminaMinutes = maxStamina;
    const curStamina = character.staminaMinutes ?? maxStamina;
    const staminaRes = tickStamina(curStamina, maxStamina, 'hunting', deltaSec);
    character.staminaMinutes = staminaRes.staminaMinutes;
    if (staminaRes.evicted) {
      encounter.status = 'completed';
      encounter.events.push({ type: 'hunt-complete' });
      addLog(next, `${character.name}: a estamina acabou! A caçada foi encerrada.`);
    }
  }

  regenerateParty(next, content);
  if (encounter.mode === 'continuous') advanceContinuousHunt(next, content);
  else if (encounter.mode === 'expedition') advanceExpedition(next, content);
  else if (encounter.room.phase !== 'combat') advanceRoomTransition(next, content);
  else if (encounter.elapsedMs >= encounter.nextMovementAt) {
    advanceSpatialCombat(next, content); encounter.nextMovementAt = encounter.elapsedMs + MOVEMENT_TICK_MS;
  } else {
    castAutomaticSpells(next, content); playerAttacks(next, content); enemyAttacks(next, content); unlockExit(next);
  }
  assertSpatialIntegrity(encounter);
  return next;
}

export function runCurrentHuntToEnd(initialState: GameState, content: GameContent, maxRounds = 5_000): GameState {
  let state = initialState;
  const startingLoop = state.encounter.continuousProgress?.loopCount ?? 0;
  while (state.encounter.status === 'running' && state.encounter.round < maxRounds
    && (state.encounter.mode !== 'continuous' || (state.encounter.continuousProgress?.loopCount ?? 0) === startingLoop)) state = advanceCombat(state, content, BASE_TILE_TRAVEL_MS);
  if (state.encounter.mode === 'continuous' && (state.encounter.continuousProgress?.loopCount ?? 0) > startingLoop) state = leaveHunt(state);
  return state;
}

export function runToEnd(seed: string, content: GameContent, maxRounds = 5_000, huntId = 'rat-cellars'): GameState {
  return runCurrentHuntToEnd(startGame(createIdleGame(seed, content, huntId), content), content, maxRounds);
}

export function lastCombatEvent(state: GameState): CombatEvent | undefined { return state.encounter.events.at(-1); }
export function isCorpseVisible(): boolean { return true; }

export const THAIS_TEMPLE_POSITION = { x: 32369, y: 32241, z: 7 } as const;

export function leaveHunt(state: GameState): GameState {
  const next = cloneState(state);
  for (const actor of next.encounter.partyActors) syncCharacterResources(next, actor);
  next.encounter.status = 'completed'; next.encounter.events.push({ type: 'hunt-complete' });
  addLog(next, `${next.encounter.hunt.name}: sessão encerrada pelo jogador.`); return next;
}

export interface DeathPenaltyOptions {
  expLossPercent?: number;
  skillLossPercent?: number;
  loseLoot?: boolean;
}

export interface SkillLossDetail {
  skill: string;
  name: string;
  before: number;
  after: number;
  lost: number;
}

export interface LostLootItemDetail {
  itemId?: number;
  name: string;
  amount: number;
}

export interface DeathPenaltyReport {
  expPercent: number;
  currentExp: number;
  lostExp: number;
  newExp: number;
  currentLevel: number;
  newLevel: number;
  isDelevel: boolean;
  skillsLost: SkillLossDetail[];
  lostLoot: LostLootItemDetail[];
  totalLootItemsLost: number;
  loseLootEnabled: boolean;
}

export function calculateDeathPenaltyReport(
  character: CharacterState,
  sessionLoot: LootStack[] = [],
  options?: DeathPenaltyOptions,
): DeathPenaltyReport {
  const cfg = serverConfigManager.getConfig();
  const expPercent = options?.expLossPercent ?? cfg.deathPenaltyExpPercent ?? 10;
  const skillPercent = options?.skillLossPercent ?? cfg.deathPenaltySkillPercent ?? 10;
  const loseLootEnabled = options?.loseLoot ?? cfg.deathPenaltyLoseLoot ?? true;

  const currentExp = character.experience;
  const lostExp = expPercent > 0 && currentExp > 0 ? Math.floor(currentExp * (expPercent / 100)) : 0;
  const newExp = Math.max(0, currentExp - lostExp);

  const currentLevel = character.level;
  const newLevel = levelForExperience(newExp);
  const isDelevel = newLevel < currentLevel;

  const SKILL_NAMES: Record<string, string> = {
    sword: 'Sword Fighting',
    axe: 'Axe Fighting',
    club: 'Club Fighting',
    distance: 'Distance Fighting',
    shielding: 'Shielding',
    fist: 'Fist Fighting',
    magicLevel: 'Magic Level',
  };

  const skillsLost: SkillLossDetail[] = [];
  if (skillPercent > 0 && character.skills) {
    const keys = ['sword', 'axe', 'club', 'distance', 'shielding', 'fist', 'magicLevel'] as const;
    for (const k of keys) {
      const currentVal = character.skills[k];
      if (typeof currentVal === 'number' && currentVal > 0) {
        const minVal = k === 'magicLevel' ? 0 : 10;
        const lostVal = Math.max(0, Math.floor(currentVal * (skillPercent / 100)));
        const afterVal = Math.max(minVal, currentVal - lostVal);
        skillsLost.push({
          skill: k,
          name: SKILL_NAMES[k] ?? k,
          before: currentVal,
          after: afterVal,
          lost: lostVal,
        });
      }
    }
  }

  const lostLoot: LostLootItemDetail[] = loseLootEnabled
    ? sessionLoot.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        amount: item.amount,
      }))
    : [];

  const totalLootItemsLost = lostLoot.reduce((sum, item) => sum + item.amount, 0);

  return {
    expPercent,
    currentExp,
    lostExp,
    newExp,
    currentLevel,
    newLevel,
    isDelevel,
    skillsLost,
    lostLoot,
    totalLootItemsLost,
    loseLootEnabled,
  };
}

export function respawnInTemple(
  state: GameState,
  options?: DeathPenaltyOptions,
  content?: GameContent,
): GameState {
  const next = cloneState(state);
  const cfg = serverConfigManager.getConfig();
  const expLossPercent = options?.expLossPercent ?? cfg.deathPenaltyExpPercent ?? 10;
  const skillLossPercent = options?.skillLossPercent ?? cfg.deathPenaltySkillPercent ?? 10;
  const loseLoot = options?.loseLoot ?? cfg.deathPenaltyLoseLoot ?? true;

  const charMap = new Map(next.session.characters.map((c) => [c.id, c]));
  for (const character of next.session.characters) {
    // 1. XP Penalty: lose configured % of experience (default 10%)
    if (expLossPercent > 0 && character.experience > 0) {
      const expLost = Math.floor(character.experience * (expLossPercent / 100));
      character.experience = Math.max(0, character.experience - expLost);

      // Level recalculation (de-level if experience drops below current level threshold)
      const prevLevel = character.level;
      const newLevel = levelForExperience(character.experience);
      if (newLevel < prevLevel) {
        character.level = newLevel;
        if (content) {
          try {
            const vocation = vocationFor(content, character.vocation);
            const baseHp = 150 + (newLevel - 1) * vocation.gainHp;
            const baseMana = (newLevel - 1) * vocation.gainMana;
            character.maxHp = Math.max(150, baseHp);
            character.maxMana = Math.max(0, baseMana);
          } catch {}
        }
      }
    }

    // 2. Skill Penalty: lose configured % in all skills (default 10%)
    if (skillLossPercent > 0 && character.skills) {
      const skillsToReduce: Array<keyof typeof character.skills> = [
        'sword', 'axe', 'club', 'distance', 'shielding', 'fist', 'magicLevel',
      ];
      for (const skillKey of skillsToReduce) {
        const currentVal = character.skills[skillKey];
        if (typeof currentVal === 'number' && currentVal > 0) {
          const minVal = skillKey === 'magicLevel' ? 0 : 10;
          const lostVal = Math.max(0, Math.floor(currentVal * (skillLossPercent / 100)));
          character.skills[skillKey] = Math.max(minVal, currentVal - lostVal);
        }
      }
    }

    character.currentHp = character.maxHp;
    character.currentMana = character.maxMana;
    character.combatState.targetId = null;
    character.combatState.spellCooldowns = {};
    character.combatState.groupCooldowns = {};
  }

  // 3. Loot Penalty: lose accumulated hunt loot if enabled (default true)
  let lostLootCount = 0;
  if (loseLoot && next.session.loot && next.session.loot.length > 0) {
    lostLootCount = next.session.loot.reduce((sum, item) => sum + item.amount, 0);
    next.session.loot = [];
  }

  for (const actor of next.encounter.partyActors) {
    const char = charMap.get(actor.characterId);
    actor.alive = true;
    actor.hp = char ? char.maxHp : actor.hp;
    actor.mana = char ? char.maxMana : actor.mana;
    actor.targetId = null;
    actor.path = [];
  }
  next.encounter.status = 'completed';
  next.encounter.events.push({ type: 'hunt-complete' });
  addLog(next, `Alas! Você morreu e renasceu no Templo de Thais. Penalidade: -${expLossPercent}% XP, -${skillLossPercent}% Skills${loseLoot ? `, e o loot da caçada foi perdido (${lostLootCount} itens)` : ''}.`);
  return next;
}

export function synchronizePartyWithEncounter(state: GameState, content: GameContent): GameState {
  const next = cloneState(state); const encounter = next.encounter;
  const existing = new Set(encounter.partyActors.map((actor) => actor.characterId));
  const occupied = new Set(encounter.partyActors.filter((actor) => actor.alive).map((actor) => `${actor.position.x},${actor.position.y}`));
  for (const character of next.session.characters.filter((candidate) => !existing.has(candidate.id))) {
    const candidates = encounter.room.map.tiles.filter((tile) => tile.walkable && !occupied.has(`${tile.position.x},${tile.position.y}`))
      .sort((left, right) => meleeDistance(left.position, encounter.room.entrance) - meleeDistance(right.position, encounter.room.entrance));
    const spawn = candidates[0]?.position ?? encounter.room.entrance; occupied.add(`${spawn.x},${spawn.y}`);
    encounter.partyActors.push(makeActor(character, spawn, content));
  }
  synchronizeEncounterOccupancy(encounter); return next;
}

export function setCharacterStance(state: GameState, characterId: string, stance: CombatStance): GameState {
  const next = cloneState(state);
  const character = next.session.characters.find((candidate) => candidate.id === characterId);
  if (character) character.stance = stance;
  const actor = next.encounter.partyActors.find((candidate) => candidate.characterId === characterId);
  if (actor) actor.stance = stance;
  return next;
}

export function setCharacterTargetDistance(state: GameState, characterId: string, distance: number): GameState {
  const next = cloneState(state);
  const targetDistance = Math.max(1, Math.min(5, Math.floor(distance)));
  const character = next.session.characters.find((candidate) => candidate.id === characterId);
  if (character) character.targetDistance = targetDistance;
  const actor = next.encounter.partyActors.find((candidate) => candidate.characterId === characterId);
  if (actor) actor.targetDistance = targetDistance;
  return next;
}

export function setActorTarget(state: GameState, characterId: string, targetId: string | null): GameState {
  const next = cloneState(state);
  const actor = next.encounter.partyActors.find((candidate) => candidate.characterId === characterId);
  if (actor) actor.targetId = targetId;
  const character = next.session.characters.find((candidate) => candidate.id === characterId);
  if (character) character.combatState.targetId = targetId;
  return next;
}


