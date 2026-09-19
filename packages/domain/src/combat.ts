import { deriveStats, getEquippedItems } from './derivedStats';
import { adaptWaveHuntToExpedition } from './expedition';
import { experienceForLevel, levelForExperience } from './experience';
import { huntById } from './hunt';
import { createContinuousHuntRoute, getPullSizeMonsterPool } from './huntRoute';
import { calculateStatsForLevel, createCharacter, leaderOf, sharedExperiencePerCharacter, vocationFor } from './party';
import { createSeededRng, rollInteger } from './rng';
import { calculateBestSpellDirection, getSpellAreaTiles, isDirectionalSpell, spellFormulaRange } from './spells';
import { addTrainingTries } from './training';
import { calculateMaxStamina, tickStamina } from './stamina';
import { getEffectiveExpMultiplier, applySkillTrainingProgress } from './progressionStages';
import { HOTBAR_POTIONS, RUNE_PROJECTILE_FLIGHT_MS, ensureHealthPotionInHotbar, findHotbarAction, getActionSupplyCost, getBestHealthPotionForCharacter, isHotbarActionUnlocked, isHotbarSlotConditionsMet } from './hotbarActions';
import { findWandDefinition, canUseWand } from './wands';
import { assertSpatialIntegrity, directionBetween, moveEnemiesTowardParty, movePartyToExit, movePartyTowardPoint, movePartyTowardTargets, synchronizeEncounterOccupancy } from './spatial/movement';
import { findPath, isMeleeRange, meleeDistance } from './spatial/pathfinding';
import { createRoomState, roomDefinitionAt } from './spatial/rooms';
import { clonePosition, samePosition } from './spatial/tileMap';
import type { GridPosition } from './spatial/types';
import type {
  CharacterEquipmentSlot, CharacterState, CombatEvent, CombatLogEntry, CombatStance, CorpseState, EnemyState, GameContent, GameState, HuntEncounterState, HuntPullSize,
  LootStack, MonsterVariantDefinition, PartyActorState, SessionState, TargetSelectionStrategy,
} from './types';
import { tickImbuementTime } from './imbuements';
import { calculateDeathProtection } from './blessings';
import { findEquipment } from './equipment';
import type { MonsterDefinition } from '../../content-schema/src';
import { serverConfigManager } from '../../server/src/config/ServerConfigManager';

export const MOVEMENT_TICK_MS = 120;
export const BASE_TILE_TRAVEL_MS = 720;
const MAX_LOG_ENTRIES = 100;

export const SQUARE_1X1_OFFSETS = [
  { dx:  0, dy:  0 },
  { dx: -1, dy: -1 }, { dx:  0, dy: -1 }, { dx:  1, dy: -1 },
  { dx: -1, dy:  0 },                     { dx:  1, dy:  0 },
  { dx: -1, dy:  1 }, { dx:  0, dy:  1 }, { dx:  1, dy:  1 },
];

export const CROSS_1X1_OFFSETS = [
  { dx:  0, dy:  0 },
  { dx:  0, dy: -1 },
  { dx: -1, dy:  0 }, { dx:  1, dy:  0 },
  { dx:  0, dy:  1 },
];

export const CIRCLE_3X3_OFFSETS = [
  // dy = -3
  { dx: -1, dy: -3 }, { dx: 0, dy: -3 }, { dx: 1, dy: -3 },
  // dy = -2
  { dx: -2, dy: -2 }, { dx: -1, dy: -2 }, { dx: 0, dy: -2 }, { dx: 1, dy: -2 }, { dx: 2, dy: -2 },
  // dy = -1
  { dx: -3, dy: -1 }, { dx: -2, dy: -1 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 }, { dx: 3, dy: -1 },
  // dy = 0
  { dx: -3, dy: 0 }, { dx: -2, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }, { dx: 3, dy: 0 },
  // dy = 1
  { dx: -3, dy: 1 }, { dx: -2, dy: 1 }, { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }, { dx: 3, dy: 1 },
  // dy = 2
  { dx: -2, dy: 2 }, { dx: -1, dy: 2 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: 2, dy: 2 },
  // dy = 3
  { dx: -1, dy: 3 }, { dx: 0, dy: 3 }, { dx: 1, dy: 3 },
];

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

function createEncounter(seed: string, session: SessionState, content: GameContent, huntId: string, requestedMode: 'continuous' | 'expedition' | 'legacyWaveMode' | 'waves' = 'continuous', pullSize?: HuntPullSize): HuntEncounterState {
  const hunt = huntById(content.hunts, huntId);
  const region = regionFor(content, hunt.id);
  const room = createRoomState(hunt, 0, region);
  const definition = roomDefinitionAt(hunt, 0, region);
  const mode = requestedMode === 'waves' ? 'legacyWaveMode' : requestedMode;
  const expedition = mode === 'expedition' ? adaptWaveHuntToExpedition(hunt, room) : null;
  const huntRoute = mode === 'continuous' ? createContinuousHuntRoute(hunt, room, region, pullSize) : null;
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
    pullSize,
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
    behavior: 'idle', nextRoamAt: encounter.elapsedMs + 720 + index * 240, nextMoveAt: 0, detectionRange: 50, variant,
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
      nextRoamAt: encounter.elapsedMs + 720 + index * 240, nextMoveAt: 0, detectionRange: 50, variant,
    };
  });
  if (definition.boss) progress.bossState = 'active';
  synchronizeEncounterOccupancy(encounter);
  addLog(state, `Encontro ${progress.activeEncounterIndex + 1}: ${definition.count} ${monster.name}(s)${definition.boss ? ` + ${definition.boss.name}` : ''}.`);
}

export function populateRespawnZone(state: GameState, content: GameContent, zoneIndex: number): void {
  const encounter = state.encounter; const route = encounter.huntRoute; const progress = encounter.continuousProgress;
  if (!route || !progress) return;
  const zone = route.respawnZones[zoneIndex]; const zoneState = progress.zones[zoneIndex];
  if (!zone || !zoneState || zoneState.activeEnemyIds.length > 0 || encounter.elapsedMs < zoneState.nextRespawnAt) return;
  const rng = createSeededRng(encounter.rngState);
  const count = rollInteger(rng, zone.minCount, zone.maxCount);
  const partyPositions = encounter.partyActors.filter((actor) => actor.alive).map((actor) => actor.position);
  const occupiedEnemyPositions = encounter.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.position);
  const preferredKeys = new Set(zone.positions.map((position) => `${position.x},${position.y}`));
  const isAccessible = (pos: GridPosition) => {
    if (pos.x === zone.center.x && pos.y === zone.center.y) return true;
    return findPath(encounter.room.map, pos, [zone.center], new Set()).length > 0;
  };
  const valid = encounter.room.map.tiles.filter((tile) => tile.walkable
    && (preferredKeys.has(`${tile.position.x},${tile.position.y}`) || meleeDistance(tile.position, zone.center) <= zone.radius)
    && partyPositions.every((position) => meleeDistance(tile.position, position) >= 3)
    && occupiedEnemyPositions.every((position) => meleeDistance(tile.position, position) >= 1)
    && isAccessible(tile.position))
    .sort((a, b) => b.position.y - a.position.y || b.position.x - a.position.x);
  const fallback = encounter.room.map.tiles.filter((tile) => tile.walkable && partyPositions.every((position) => meleeDistance(tile.position, position) >= 2)
    && occupiedEnemyPositions.every((position) => meleeDistance(tile.position, position) >= 1)
    && isAccessible(tile.position))
    .sort((a, b) => meleeDistance(a.position, zone.center) - meleeDistance(b.position, zone.center));
  const candidates = valid.length >= count ? valid : (fallback.length > 0 ? fallback : [encounter.room.map.tiles.find((t) => t.position.x === zone.center.x && t.position.y === zone.center.y) || encounter.room.map.tiles[0]]);
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
      nextRoamAt: encounter.elapsedMs + 720 + index * 240, nextMoveAt: 0, detectionRange: encounter.hunt.id === 'pvp-arena' ? 50 : 6, variant, respawnZoneId: zone.id,
    });
  }
  encounter.rngState = rng.state; encounter.enemies.push(...spawned);
  zoneState.activeEnemyIds = spawned.map((enemy) => enemy.id); zoneState.lastActivatedAt = encounter.elapsedMs; zoneState.activationCount += 1;
  synchronizeEncounterOccupancy(encounter);
  addLog(state, `${zone.id}: ${spawned.length} criatura(s) despertaram${spawned.some((enemy) => enemy.variant) ? ' · presença rara detectada' : ''}.`);
}

function choosePullMonsterId(
  huntId: string,
  pullSize: HuntPullSize,
  pool: string[],
  slotIndex: number,
  totalSlots: number,
  rng: ReturnType<typeof createSeededRng>
): string {
  if (huntId === 'cyclops-camp' || huntId.includes('cyclops')) {
    if (pullSize === 'cauteloso') return 'cyclops';
    if (pullSize === 'ousado') {
      return rollInteger(rng, 1, 100) <= 25 ? 'cyclops-smith' : 'cyclops';
    }
    // agressivo: slots 0 and 1 guaranteed cyclops-smith, others 60% chance cyclops-smith
    if (slotIndex < 2) return 'cyclops-smith';
    return rollInteger(rng, 1, 100) <= 60 ? 'cyclops-smith' : 'cyclops';
  }

  if (huntId === 'dragon-lair' || huntId.includes('dragon')) {
    if (pullSize === 'agressivo') {
      if (slotIndex === 0) return 'dragon-lord';
      return rollInteger(rng, 1, 100) <= 40 ? 'dragon-lord' : 'dragon';
    }
    return 'dragon';
  }

  if (huntId === 'elf-sanctuary' || huntId.includes('elf')) {
    if (pullSize === 'cauteloso') return 'elf';
    if (pullSize === 'ousado') {
      return rollInteger(rng, 1, 100) <= 35 ? 'elf-scout' : 'elf';
    }
    const roll = rollInteger(rng, 1, 100);
    if (roll <= 45) return 'elf-arcanist';
    if (roll <= 80) return 'elf-scout';
    return 'elf';
  }

  if (huntId === 'rat-cellars' || huntId.includes('rat')) {
    if (pullSize === 'cauteloso') return 'rat';
    return rollInteger(rng, 1, 100) <= 40 ? 'cave-rat' : 'rat';
  }

  if (pool.length === 1) return pool[0];
  return pool[rollInteger(rng, 0, pool.length - 1)];
}

function findPullSpawnPositions(
  encounter: HuntEncounterState,
  center: GridPosition,
  count: number,
  rng: ReturnType<typeof createSeededRng>
): GridPosition[] {
  const map = encounter.room.map;
  const occupied = new Set([
    ...encounter.partyActors.filter((a) => a.alive).map((a) => `${a.position.x},${a.position.y}`),
    ...encounter.enemies.filter((e) => e.alive).map((e) => `${e.position.x},${e.position.y}`),
  ]);

  const ring1 = map.tiles.filter((tile) => {
    if (!tile.walkable) return false;
    const key = `${tile.position.x},${tile.position.y}`;
    if (occupied.has(key)) return false;
    const dist = meleeDistance(tile.position, center);
    return dist >= 2 && dist <= 4;
  }).filter((tile) => findPath(map, tile.position, [center], new Set()).length > 0);

  const ring2 = map.tiles.filter((tile) => {
    if (!tile.walkable) return false;
    const key = `${tile.position.x},${tile.position.y}`;
    if (occupied.has(key)) return false;
    const dist = meleeDistance(tile.position, center);
    return dist >= 1 && dist <= 6;
  }).filter((tile) => findPath(map, tile.position, [center], new Set()).length > 0);

  const pool = ring1.length >= count ? ring1 : (ring2.length >= count ? ring2 : map.tiles.filter((t) => t.walkable && !occupied.has(`${t.position.x},${t.position.y}`)));

  const poolCopy = [...pool];
  const picked: GridPosition[] = [];
  for (let i = 0; i < count && poolCopy.length > 0; i++) {
    const idx = rollInteger(rng, 0, poolCopy.length - 1);
    const chosen = poolCopy.splice(idx, 1)[0];
    picked.push(clonePosition(chosen.position));
  }
  return picked;
}

export function populatePullAroundParty(state: GameState, content: GameContent, initial = false): void {
  const encounter = state.encounter;
  const progress = encounter.continuousProgress;
  const route = encounter.huntRoute;
  if (!progress || !route) return;

  const pullSize = encounter.pullSize ?? 'cauteloso';

  // If any enemies are still alive, NEVER spawn new creatures!
  const living = encounter.enemies.filter((e) => e.alive);
  if (living.length > 0) return;

  const zoneState = progress.zones[0];
  if (!initial && zoneState && encounter.elapsedMs < zoneState.nextRespawnAt) {
    return;
  }

  // Prune dead enemies and corpses to avoid unbounded accumulation
  if (encounter.enemies.length > 20) {
    encounter.enemies = encounter.enemies.filter((e) => e.alive);
  }
  if (encounter.corpses.length > 15) {
    encounter.corpses = encounter.corpses.slice(-15);
  }

  const leader = encounter.partyActors.find((actor) => actor.alive) ?? encounter.partyActors[0];
  if (!leader) return;

  const rng = createSeededRng(encounter.rngState);
  let count = 2;
  if (pullSize === 'cauteloso') {
    count = rollInteger(rng, 2, 3);
  } else if (pullSize === 'ousado') {
    count = 4;
  } else if (pullSize === 'agressivo') {
    count = rollInteger(rng, 5, 6);
  }

  const basePool = route.respawnZones[0]?.monsterPool ?? getPullSizeMonsterPool(encounter.hunt.id, pullSize, encounter.hunt.monsters);
  const spawnPositions = findPullSpawnPositions(encounter, leader.position, count, rng);

  const spawned: EnemyState[] = [];
  const activation = (zoneState?.activationCount ?? 0) + 1;

  for (let i = 0; i < spawnPositions.length; i++) {
    const pos = spawnPositions[i];
    const monsterId = choosePullMonsterId(encounter.hunt.id, pullSize, basePool, i, spawnPositions.length, rng);
    const monster = monsterFor(content, monsterId);

    const rare = rollInteger(rng, 1, 10_000) <= Math.round((route.rareSpawnRules?.probability ?? 0.04) * 10_000);
    const variant = rare && route.rareSpawnRules ? { ...route.rareSpawnRules.variant, baseMonsterId: monster.id, name: `Enraged ${monster.name}` } : null;
    const resolved = deriveMonsterVariantStats(monster, variant);

    spawned.push({
      id: `pull-${activation}-${i + 1}-${rollInteger(rng, 100, 999)}`,
      monsterId: monster.id,
      name: variant?.name ?? monster.name,
      hp: resolved.maxHp,
      maxHp: resolved.maxHp,
      attackMax: resolved.attackMax,
      defense: resolved.defense,
      armor: resolved.armor,
      alive: true,
      position: clonePosition(pos),
      previousPosition: clonePosition(pos),
      direction: directionBetween(pos, leader.position),
      path: [],
      targetId: leader.characterId,
      nextAttackAt: 0,
      attackIntervalMs: monster.attacks[0]?.intervalMs ?? 1800,
      speed: monster.speed,
      behavior: 'chase',
      nextRoamAt: encounter.elapsedMs + 5000,
      nextMoveAt: encounter.elapsedMs + 100,
      detectionRange: 25,
      variant,
      respawnZoneId: 'pull-zone',
    });
  }

  encounter.rngState = rng.state;
  encounter.enemies.push(...spawned);

  if (zoneState) {
    zoneState.activeEnemyIds = spawned.map((e) => e.id);
    zoneState.lastActivatedAt = encounter.elapsedMs;
    zoneState.activationCount = activation;
    zoneState.nextRespawnAt = 0;
  }

  synchronizeEncounterOccupancy(encounter);
  addLog(state, `Pack de ${spawned.length} criatura(s) surgiu! (${pullSize})`);
}

function populateReadyRespawns(state: GameState, content: GameContent, initial = false): void {
  const encounter = state.encounter; const route = encounter.huntRoute; const progress = encounter.continuousProgress;
  if (!route || !progress) return;

  if (encounter.pullSize) {
    populatePullAroundParty(state, content, initial);
    return;
  }

  // If there are living enemies not associated with any zone (e.g. injected mock enemies in tests),
  // or if all zones are currently empty while living enemies exist, do not auto-populate zones.
  if (!initial && encounter.enemies.some((e) => e.alive && !e.respawnZoneId)) {
    return;
  }
  if (!initial && progress.zones.every((z) => z.activeEnemyIds.length === 0) && encounter.enemies.some((e) => e.alive)) {
    return;
  }

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

export function grantSharedExperience(state: GameState, rawExperience: number, content: GameContent, serverExpRate: number = 1.0): void {
  const baseShare = sharedExperiencePerCharacter(rawExperience, state.session.characters);
  for (const character of state.session.characters) {
    const effectiveMultiplier = getEffectiveExpMultiplier(
      character.level,
      character.staminaMinutes,
      serverExpRate
    );
    const memberExp = Math.max(1, Math.ceil(baseShare * effectiveMultiplier));
    character.experience += memberExp;
    levelUpCharacter(state, character.id, content);
    if (memberExp > 0) {
      state.encounter.events.push({ type: 'experience-gained', characterId: character.id, amount: memberExp });
    }
  }
  if (state.session.characters.length > 1) {
    addLog(state, `XP base (${rawExperience}) compartilhada entre os membros da party.`);
  }
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
          state.encounter.events.push({ type: 'loot', itemName: 'Gold Coin', amount });
          addLog(state, `Loot (Gold): +${amount} gold adicionados à Caixa da Party.`);
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
          state.encounter.events.push({ type: 'loot', itemName: 'Gold Coin', amount });
          addLog(state, `Loot (Gold): +${amount} gold adicionados à Caixa da Party.`);
        } else if (loot.itemId === undefined || (state.session.itemLootPreferences[String(loot.itemId)]?.autoLoot ?? true)) {
          addLoot(state.session.loot, { itemId: loot.itemId, name: loot.name, amount });
          state.encounter.events.push({ type: 'loot', itemName: loot.name, amount });
          addLog(state, `Loot: ${amount}x ${loot.name}.`);
        } else {
          state.encounter.events.push({ type: 'loot', itemName: loot.name, amount });
          addLog(state, `Loot: ${amount}x ${loot.name}.`);
        }
      }
    }
  }
  state.encounter.rngState = rng.state;
}

export function defeatEnemy(state: GameState, target: EnemyState, content: GameContent): void {
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
  grantSharedExperience(state, Math.ceil(monster.experience * (target.variant?.xpMultiplier ?? 1)), content, expRate);
  rollLoot(state, monster.id, content, (target.variant?.lootMultiplier ?? 1) * lootRate);
  if (encounter.expeditionProgress) encounter.expeditionProgress.kills += 1;
  if (encounter.continuousProgress) {
    encounter.continuousProgress.kills += 1;
    if (target.variant?.visualModifier === 'rare-aura') encounter.continuousProgress.rareKills += 1;
    if (encounter.pullSize) {
      const remainingAlive = encounter.enemies.filter((enemy) => enemy.alive && enemy.id !== target.id);
      if (remainingAlive.length === 0) {
        const zoneState = encounter.continuousProgress.zones[0];
        if (zoneState) {
          zoneState.activeEnemyIds = [];
          zoneState.lastClearedAt = encounter.elapsedMs;
          zoneState.nextRespawnAt = encounter.elapsedMs + 1000;
        }
        encounter.continuousProgress.lastActivityAt = encounter.elapsedMs;
      }
    }
  }

  // Bestiary progression for idle hunts
  const monsterKey = target.monsterId.toLowerCase().replace(/\s+/g, '-');
  const sessionAny = state.session as any;
  if (!sessionAny.bestiaryKills) {
    sessionAny.bestiaryKills = {};
  }
  const prevKills = sessionAny.bestiaryKills[monsterKey] || 0;
  sessionAny.bestiaryKills[monsterKey] = prevKills + 1;
  if (prevKills === 0) {
    encounter.events.push({
      type: 'bestiary-first-kill' as any,
      monsterId: monsterKey,
      monsterName: monster.name,
    } as any);
    addLog(state, `Você começou o bestiário deste monstro: ${monster.name}!`);
  }
  for (const c of state.session.characters) {
    const cAny = c as any;
    if (!cAny.bestiaryKills) cAny.bestiaryKills = {};
    cAny.bestiaryKills[monsterKey] = (cAny.bestiaryKills[monsterKey] || 0) + 1;
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

export function attackRange(characterId: string, state: GameState, content: GameContent): number {
  const character = state.session.characters.find((candidate) => candidate.id === characterId);
  if (!character) return 1;
  if (typeof character.targetDistance === 'number' && character.targetDistance >= 1) {
    return character.targetDistance;
  }
  const vocLower = (character.baseVocation || character.vocation || '').toLowerCase();
  const isKnight = vocLower.includes('knight');
  if (isKnight) return 1;
  const isRanged = ['druid', 'sorcerer', 'paladin'].some((v) => vocLower.includes(v));
  if (isRanged) return 4;
  const weapon = getEquippedItems(character, content.equipment).find((item) => ['distance', 'wand'].includes(item.weaponType) || Boolean(findWandDefinition(item.id)));
  if (weapon) {
    const wandDef = findWandDefinition(weapon.id);
    return wandDef ? wandDef.range : Math.max(2, weapon.range || 4);
  }
  return 1;
}

export function minTacticalRange(characterId: string, state: GameState): number {
  const character = state.session.characters.find((candidate) => candidate.id === characterId);
  if (!character) return 1;
  const vocLower = (character.baseVocation || character.vocation || '').toLowerCase();
  const isKnight = vocLower.includes('knight');
  if (isKnight) return 1;
  const isRanged = ['druid', 'sorcerer', 'paladin'].some((v) => vocLower.includes(v));
  if (isRanged) return 3;
  return 1;
}

export function findPartyKnightActor(state: GameState): PartyActorState | undefined {
  return state.encounter.partyActors.find((actor) => {
    if (!actor.alive) return false;
    const character = state.session.characters.find((c) => c.id === actor.characterId);
    if (!character) return false;
    const vocLower = (character.baseVocation || character.vocation || '').toLowerCase();
    return vocLower.includes('knight');
  });
}

function executeKnightChallenge(state: GameState, content: GameContent, encounter: HuntEncounterState): void {
  const livingActors = encounter.partyActors.filter((a) => a.alive);
  if (livingActors.length <= 1) return;
  
  const knightActor = findPartyKnightActor(state);
  if (!knightActor) return;

  const knightChar = state.session.characters.find((c) => c.id === knightActor.characterId);
  if (!knightChar || knightChar.level < 20) return;
  if (knightActor.mana < 30) return;
  if ((knightActor.groupCooldowns['support'] ?? 0) > encounter.elapsedMs) return;
  if ((knightActor.spellCooldowns['93'] ?? 0) > encounter.elapsedMs) return;
  if ((knightActor.groupCooldowns['potion'] ?? 0) > encounter.elapsedMs) return;

  const nonKnightActors = livingActors.filter((a) => a.characterId !== knightActor.characterId);
  const allyThreatened = encounter.enemies.some((enemy) => {
    if (!enemy.alive) return false;
    if (meleeDistance(enemy.position, knightActor.position) > 3) return false;
    const targetsAlly = nonKnightActors.some((ally) => enemy.targetId === ally.characterId);
    const meleeAlly = nonKnightActors.some((ally) => meleeDistance(enemy.position, ally.position) <= 1);
    return targetsAlly || meleeAlly;
  });

  if (!allyThreatened) return;

  knightActor.mana -= 30;
  knightActor.groupCooldowns['support'] = encounter.elapsedMs + 2000;
  knightActor.spellCooldowns['93'] = encounter.elapsedMs + 2000;
  knightActor.groupCooldowns['potion'] = Math.max(knightActor.groupCooldowns['potion'] ?? 0, encounter.elapsedMs + 1000);

  encounter.events.push({
    type: 'spell-cast',
    sourceId: knightActor.characterId,
    targetId: knightActor.characterId,
    spellId: 93,
    amount: 0,
    healing: false,
    speech: 'Exeta res',
  });
  encounter.events.push({
    type: 'spell-visual',
    sourceId: knightActor.characterId,
    targetId: knightActor.characterId,
    spellId: 93,
    effectId: 13,
    projectileId: null,
  });

  for (const enemy of encounter.enemies.filter((e) => e.alive && meleeDistance(e.position, knightActor.position) <= 3)) {
    enemy.targetId = knightActor.characterId;
    enemy.challengedTargetId = knightActor.characterId;
    enemy.challengedUntil = encounter.elapsedMs + 6000;
    enemy.path = [];
  }

  addLog(state, `${knightChar.name} usou Exeta res e desafiou os monstros!`);
  syncCharacterResources(state, knightActor);
}

function syncCharacterResources(state: GameState, actor: PartyActorState): void {
  const character = state.session.characters.find((candidate) => candidate.id === actor.characterId);
  if (!character) return;
  character.currentHp = actor.hp; character.currentMana = actor.mana;
  character.combatState.targetId = actor.targetId;
  character.combatState.spellCooldowns = { ...actor.spellCooldowns };
  character.combatState.groupCooldowns = { ...actor.groupCooldowns };
  character.combatState.hasteUntil = actor.hasteUntil;
  character.combatState.magicShieldUntil = actor.magicShieldUntil;
  character.combatState.bloodRageUntil = actor.bloodRageUntil;
  if (actor.stance) character.stance = actor.stance;
  if (typeof actor.targetDistance === 'number') character.targetDistance = actor.targetDistance;
}

function regenerateParty(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  for (const actor of encounter.partyActors.filter((candidate) => candidate.alive)) {
    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId);
    if (!character) continue;
    const vocation = vocationFor(content, character.vocation);
    const manaInterval = Math.max(1, vocation.manaGainTicks * 1_000);
    const healthInterval = Math.max(1, vocation.healthGainTicks * 1_000);
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

export function consumePotionFromInventory(
  state: GameState,
  potionId: number,
  characterName?: string,
  outDetails?: { fromGold?: boolean; cost?: number }
): boolean {
  const potionDef = HOTBAR_POTIONS.find((p) => p.id === potionId);
  if (!potionDef) return false;

  const containers = [
    state.session.bag ?? [],
    state.session.loot ?? [],
  ];

  // 1. Procurar nas bolsas/mochilas por itemId exato ou nome correspondente
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
      if (outDetails) {
        outDetails.fromGold = false;
        outDetails.cost = 0;
      }
      return true;
    }
  }

  // 2. Auto-suprimento via gold se disponível (usa tabela canônica de custo de suprimento da Caixa da Party)
  const cost = getActionSupplyCost(potionId);
  if (state.session.gold >= cost) {
    state.session.gold -= cost;
    if (outDetails) {
      outDetails.fromGold = true;
      outDetails.cost = cost;
    }
    return true;
  }

  // 3. Em caçadas e testes, se não houver a poção no inventário nem gold, permitir o consumo contínuo automático
  if (outDetails) {
    outDetails.fromGold = false;
    outDetails.cost = 0;
  }
  return true;
}

export function castAutomaticSpells(state: GameState, content: GameContent, allowOffensive = true): void {
  const encounter = state.encounter;
  executeKnightChallenge(state, content, encounter);

  const leaderActor = encounter.partyActors.find((a) => a.alive && (a.characterId === state.session.leaderId || a.characterId === state.session.selectedCharacterId)) ?? encounter.partyActors.find((a) => a.alive);
  const partyKnight = findPartyKnightActor(state);
  const isParty = encounter.partyActors.filter((a) => a.alive).length > 1;
  const focusLeadActor = partyKnight ?? leaderActor;
  const focusTarget = focusLeadActor?.targetId ? encounter.enemies.find((e) => e.id === focusLeadActor.targetId && e.alive) : null;

  const sortedActors = isParty
    ? [...encounter.partyActors.filter((a) => a.alive)].sort((a, b) => {
        const charA = state.session.characters.find((c) => c.id === a.characterId);
        const charB = state.session.characters.find((c) => c.id === b.characterId);
        const isDruidA = charA ? (charA.baseVocation === 'Druid' || charA.vocation.includes('Druid')) : false;
        const isDruidB = charB ? (charB.baseVocation === 'Druid' || charB.vocation.includes('Druid')) : false;
        if (isDruidA && !isDruidB) return -1;
        if (!isDruidA && isDruidB) return 1;
        return 0;
      })
    : encounter.partyActors.filter((candidate) => candidate.alive);

  for (const actor of sortedActors) {
    const isLeader = actor.characterId === leaderActor?.characterId;
    const isFocusLead = actor.characterId === focusLeadActor?.characterId;
    const leaderTarget = leaderActor?.targetId ? encounter.enemies.find((e) => e.id === leaderActor.targetId && e.alive) : null;
    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId);
    if (!character) continue;
    const isDruid = (character.baseVocation === 'Druid' || character.vocation.includes('Druid'));
    const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
    const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));

    let usedPotionThisTick = false;
    let usedSpellThisTick = false;
    let usedOffensiveActionThisTick = false;

    for (let slotIndex = 0; slotIndex < character.hotbar.length; slotIndex++) {
      const actionId = character.hotbar[slotIndex];
      if (typeof actionId !== 'number' || actionId === 0) continue;
      const action = findHotbarAction(actionId, content);
      if (!action || !isHotbarActionUnlocked(character, action)) continue;

      const slotConfig = character.hotbarConfigs?.[slotIndex];
      // 0. DISABLED SLOT CHECK
      if (slotConfig && slotConfig.enabled === false) {
        continue;
      }

      const ignoredList = (slotConfig?.ignoredMonsters || []).map((m) => m.trim().toLowerCase()).filter(Boolean);
      const isIgnored = (name: string) => ignoredList.length > 0 && ignoredList.includes(name.trim().toLowerCase());

      // 1. POTIONS AUTO-TRIGGER
      if (action.kind === 'potion' && !usedPotionThisTick && !usedSpellThisTick) {
        const potion = action.potion;
        if ((actor.groupCooldowns['potion'] ?? 0) <= encounter.elapsedMs) {
          let conditionMet = false;
          if (slotConfig && slotConfig.conditions && slotConfig.conditions.length > 0) {
            conditionMet = isHotbarSlotConditionsMet(slotConfig, {
              actor,
              character,
              state,
            });
          } else {
            const needsHp = typeof potion.healMin === 'number' && actor.hp < character.maxHp;
            const needsMana = typeof potion.manaMin === 'number' && character.maxMana > 0 && actor.mana < character.maxMana;
            conditionMet = needsHp || needsMana;
          }

          if (conditionMet) {
            const potionDetails = { fromGold: false, cost: 0 };
            const consumed = consumePotionFromInventory(state, potion.id, character.name, potionDetails);
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
            actor.groupCooldowns['potion'] = encounter.elapsedMs + Math.max(1000, potion.cooldownMs);
            actor.groupCooldowns['healing'] = Math.max(actor.groupCooldowns['healing'] ?? 0, encounter.elapsedMs + 1000);
            actor.groupCooldowns['attack'] = Math.max(actor.groupCooldowns['attack'] ?? 0, encounter.elapsedMs + 1000);
            actor.groupCooldowns['support'] = Math.max(actor.groupCooldowns['support'] ?? 0, encounter.elapsedMs + 1000);

            const speechText = potionDetails.fromGold ? `Aaaah... (-${potionDetails.cost}gp)` : 'Aaaah...';
            encounter.events.push({
              type: 'spell-cast',
              sourceId: actor.characterId,
              targetId: actor.characterId,
              spellId: potion.id,
              amount: healed || restoredMana,
              healing: healed > 0,
              speech: speechText,
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

            const goldLog = potionDetails.fromGold ? ` (-${potionDetails.cost} gold da Caixa da Party)` : '';
            addLog(state, `${character.name} usou ${potion.name} (${details}${goldLog}).`);
            syncCharacterResources(state, actor);
            usedPotionThisTick = true;
            usedSpellThisTick = true;
          }
        }
      }

      // 2. RUNES AUTO-TRIGGER
      if (action.kind === 'rune' && !usedSpellThisTick && !usedPotionThisTick) {
        const rune = action.rune;
        if (rune.category === 'healing') {
          const runeReady = (actor.groupCooldowns['rune'] ?? 0) <= encounter.elapsedMs;
          if (runeReady) {
            const healTargetType = slotConfig?.healingTarget ?? 'self';
            let targetActor: PartyActorState | undefined;
            if (isDruid && isParty && partyKnight) {
              const kChar = state.session.characters.find((m) => m.id === partyKnight.characterId);
              if (kChar && (partyKnight.hp / kChar.maxHp < 0.85)) {
                targetActor = partyKnight;
              }
            }
            if (!targetActor) {
              if (healTargetType === 'party_leader') {
                targetActor = leaderActor;
              } else if (healTargetType === 'lowest_hp') {
                targetActor = encounter.partyActors
                  .filter((candidate) => {
                    if (!candidate.alive) return false;
                    const memberChar = state.session.characters.find((m) => m.id === candidate.characterId);
                    return memberChar ? candidate.hp < memberChar.maxHp : false;
                  })
                  .sort((a, b) => {
                    const charA = state.session.characters.find((m) => m.id === a.characterId);
                    const charB = state.session.characters.find((m) => m.id === b.characterId);
                    const ratioA = charA ? a.hp / charA.maxHp : 1;
                    const ratioB = charB ? b.hp / charB.maxHp : 1;
                    return ratioA - ratioB || a.hp - b.hp;
                  })[0] ?? actor;
              } else {
                targetActor = actor;
              }
            }

            const targetCharacter = state.session.characters.find((c) => c.id === targetActor?.characterId);
            if (targetActor && targetCharacter) {
              let conditionMet = false;
              if (slotConfig && slotConfig.conditions && slotConfig.conditions.length > 0) {
                conditionMet = isHotbarSlotConditionsMet(slotConfig, {
                  actor,
                  character,
                  state,
                  primaryTarget: null,
                });
              } else {
                conditionMet = targetActor.hp < targetCharacter.maxHp;
              }

              if (conditionMet) {
                const rng = createSeededRng(encounter.rngState);
                const minHeal = character.level * 0.2 + character.skills.magicLevel * 3.0 + 168;
                const maxHeal = character.level * 0.2 + character.skills.magicLevel * 5.0 + 272;
                const rawHeal = rollInteger(rng, Math.floor(minHeal), Math.max(Math.floor(minHeal), Math.ceil(maxHeal)));
                const healed = Math.min(rawHeal, targetCharacter.maxHp - targetActor.hp);
                targetActor.hp += healed;
                encounter.rngState = rng.state;
                actor.groupCooldowns['rune'] = encounter.elapsedMs + rune.cooldownMs;
                actor.groupCooldowns['potion'] = Math.max(actor.groupCooldowns['potion'] ?? 0, encounter.elapsedMs + 1000);

                encounter.events.push({
                  type: 'spell-cast',
                  sourceId: actor.characterId,
                  targetId: targetActor.characterId,
                  spellId: rune.id,
                  amount: healed,
                  healing: true,
                  speech: rune.name,
                });
                encounter.events.push({
                  type: 'spell-visual',
                  sourceId: actor.characterId,
                  targetId: targetActor.characterId,
                  spellId: rune.id,
                  effectId: rune.effectId,
                  projectileId: null,
                });
                addLog(state, `${character.name} usou ${rune.name} em ${targetCharacter.name} e curou ${healed}.`);
                syncCharacterResources(state, targetActor);
                usedSpellThisTick = true;
                usedPotionThisTick = true;
              }
            }
          }
        } else if (!usedOffensiveActionThisTick) {
          if (!allowOffensive) continue;
          if (isDruid && isParty) {
            const knightNeedsHeal = partyKnight && (partyKnight.hp / (state.session.characters.find(c => c.id === partyKnight.characterId)?.maxHp ?? 1) < 0.85);
            const allyNeedsHeal = encounter.partyActors.some(a => a.alive && (a.hp / (state.session.characters.find(c => c.id === a.characterId)?.maxHp ?? 1) < 0.80));
            if (knightNeedsHeal || allyNeedsHeal) continue;
          }
          const runeReady = (actor.groupCooldowns['rune'] ?? 0) <= encounter.elapsedMs && (actor.groupCooldowns['attack'] ?? 0) <= encounter.elapsedMs;
          if (runeReady) {
            const lockedTarget = actor.targetId ? encounter.enemies.find((enemy) => enemy.id === actor.targetId && enemy.alive) : null;
            const targetToPrioritize = ((encounter.isMultiplayerParty && !isLeader && leaderTarget) || (isParty && !isFocusLead && focusTarget))
              ? (focusTarget ?? leaderTarget)
              : lockedTarget;

            const rawEligible = targetToPrioritize
              ? [targetToPrioritize]
              : encounter.enemies.filter((enemy) => enemy.alive);

            const eligibleEnemies = rawEligible.filter((enemy) => !isIgnored(enemy.name));

            const inRange = eligibleEnemies
              .filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= rune.range)
              .sort((left, right) => {
                const isLeft = left.id === targetToPrioritize?.id;
                const isRight = right.id === targetToPrioritize?.id;
                if (isLeft !== isRight) return isLeft ? -1 : 1;
                return meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id);
              });

            if (inRange.length > 0) {
              const primaryTarget = inRange[0];

              if (slotConfig && slotConfig.conditions && slotConfig.conditions.length > 0) {
                const condMet = isHotbarSlotConditionsMet(slotConfig, {
                  actor,
                  character,
                  state,
                  primaryTarget,
                  eligibleEnemies: inRange,
                });
                if (!condMet) continue;
              }

              const centerPos = primaryTarget.position;
              const offsets = rune.area === 'circle-3x3'
                ? CIRCLE_3X3_OFFSETS
                : rune.area === 'cross-1x1'
                ? CROSS_1X1_OFFSETS
                : rune.area === 'square-1x1'
                ? SQUARE_1X1_OFFSETS
                : null;

              let targets: EnemyState[] = [primaryTarget];
              if (offsets) {
                const affectedMap = new Set(offsets.map((o) => `${centerPos.x + o.dx},${centerPos.y + o.dy}`));
                const secondaryEnemies = eligibleEnemies.filter((e) => e.alive && e.id !== primaryTarget.id && affectedMap.has(`${e.position.x},${e.position.y}`));
                targets = [primaryTarget, ...secondaryEnemies];
              }

              const rng = createSeededRng(encounter.rngState);

              let minDmg = character.level * 0.2 + character.skills.magicLevel * 2.5 + 15;
              let maxDmg = character.level * 0.2 + character.skills.magicLevel * 4.0 + 30;

              if (rune.id === 2268) {
                minDmg = character.level * 0.2 + character.skills.magicLevel * 7.0 + 40;
                maxDmg = character.level * 0.2 + character.skills.magicLevel * 9.5 + 65;
              } else if (rune.id === 2311) {
                minDmg = character.level * 0.2 + character.skills.magicLevel * 1.6 + 10;
                maxDmg = character.level * 0.2 + character.skills.magicLevel * 2.4 + 18;
              } else if (rune.id === 2304 || rune.id === 2274 || rune.id === 2288 || rune.id === 2315) {
                minDmg = character.level * 0.2 + character.skills.magicLevel * 2.2 + 15;
                maxDmg = character.level * 0.2 + character.skills.magicLevel * 3.5 + 25;
              }

              const rawDamage = rollInteger(rng, Math.floor(minDmg), Math.max(Math.floor(minDmg), Math.ceil(maxDmg)));
              encounter.rngState = rng.state;
              actor.groupCooldowns['rune'] = encounter.elapsedMs + rune.cooldownMs;
              actor.groupCooldowns['attack'] = encounter.elapsedMs + rune.cooldownMs;
              actor.nextAttackAt = encounter.elapsedMs + rune.cooldownMs;
              actor.groupCooldowns['potion'] = Math.max(actor.groupCooldowns['potion'] ?? 0, encounter.elapsedMs + 1000);

              const impactDelay = rune.projectileId > 0 ? RUNE_PROJECTILE_FLIGHT_MS : 0;

              // 1. Launch missile to primary target if projectileId > 0
              if (rune.projectileId > 0) {
                encounter.events.push({
                  type: 'spell-visual',
                  sourceId: actor.characterId,
                  targetId: primaryTarget.id,
                  spellId: rune.id,
                  effectId: rune.area === 'target' && rune.effectId > 0 ? rune.effectId : null,
                  projectileId: rune.projectileId,
                });
              }

              // 2. For area runes, detonate impact effect across blast area tiles at missile arrival (+240ms if missile, 0ms otherwise)
              if (offsets && rune.effectId > 0) {
                for (const offset of offsets) {
                  encounter.events.push({
                    type: 'spell-visual',
                    sourceId: actor.characterId,
                    targetPosition: { x: centerPos.x + offset.dx, y: centerPos.y + offset.dy, z: centerPos.z },
                    spellId: rune.id,
                    effectId: rune.effectId,
                    projectileId: null,
                    delayMs: impactDelay,
                  });
                }
              } else if (rune.area === 'target' && rune.projectileId === 0 && rune.effectId > 0) {
                encounter.events.push({
                  type: 'spell-visual',
                  sourceId: actor.characterId,
                  targetId: primaryTarget.id,
                  spellId: rune.id,
                  effectId: rune.effectId,
                  projectileId: null,
                });
              }

              let isFirstRuneTarget = true;
              for (const target of targets) {
                const damage = resistedDamage(rawDamage, target, rune.combatType, content);
                target.hp = Math.max(0, target.hp - damage);
                encounter.events.push({
                  type: 'spell-cast',
                  sourceId: actor.characterId,
                  targetId: target.id,
                  spellId: rune.id,
                  amount: damage,
                  healing: false,
                  speech: isFirstRuneTarget ? rune.name : undefined,
                  delayMs: impactDelay,
                  element: rune.combatType,
                });
                isFirstRuneTarget = false;
                addLog(state, `${character.name} usou ${rune.name} em ${target.name} por ${damage}.`);
                if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
              }

              syncCharacterResources(state, actor);
              usedOffensiveActionThisTick = true;
              usedSpellThisTick = true;
              usedPotionThisTick = true;
            }
          }
        }
      }

      // 3. SPELLS AUTO-TRIGGER
      if (action.kind === 'spell' && !usedSpellThisTick && !usedPotionThisTick) {
        const spell = action.spell;
        const isOffensive = spell.group === 'attack';
        if (isOffensive && (!allowOffensive || usedOffensiveActionThisTick)) continue;
        if (isDruid && isParty && isOffensive) {
          const knightNeedsHeal = partyKnight && (partyKnight.hp / (state.session.characters.find(c => c.id === partyKnight.characterId)?.maxHp ?? 1) < 0.85);
          const allyNeedsHeal = encounter.partyActors.some(a => a.alive && (a.hp / (state.session.characters.find(c => c.id === a.characterId)?.maxHp ?? 1) < 0.80));
          if (knightNeedsHeal || allyNeedsHeal) continue;
        }

        const spellReady = actor.mana >= spell.mana &&
          (actor.spellCooldowns[String(spell.spellId)] ?? 0) <= encounter.elapsedMs &&
          (actor.groupCooldowns[spell.group] ?? 0) <= encounter.elapsedMs &&
          (!isOffensive || ((actor.groupCooldowns['rune'] ?? 0) <= encounter.elapsedMs && (actor.groupCooldowns['attack'] ?? 0) <= encounter.elapsedMs));

        if (spellReady) {
          let targetActor: PartyActorState | undefined;
          let targets: EnemyState[] = [];
          let waveTiles: Array<{ x: number; y: number; z: number }> = [];

          if (spell.group === 'healing') {
            if (isDruid && isParty && partyKnight) {
              const kChar = state.session.characters.find((m) => m.id === partyKnight.characterId);
              if (kChar && (partyKnight.hp / kChar.maxHp < 0.85)) {
                targetActor = partyKnight;
              }
            }
            if (!targetActor) {
              const healTargetType = slotConfig?.healingTarget ?? (spell.name === 'Heal Friend' ? 'lowest_hp' : 'self');
              if (healTargetType === 'party_leader') {
                targetActor = leaderActor;
              } else if (healTargetType === 'lowest_hp' || spell.name === 'Heal Friend') {
                targetActor = encounter.partyActors.filter((candidate) => {
                  if (!candidate.alive) return false;
                  const memberChar = state.session.characters.find((member) => member.id === candidate.characterId);
                  return memberChar ? candidate.hp < memberChar.maxHp : false;
                }).sort((left, right) => {
                  const charL = state.session.characters.find((m) => m.id === left.characterId);
                  const charR = state.session.characters.find((m) => m.id === right.characterId);
                  const ratioL = charL ? left.hp / charL.maxHp : 1;
                  const ratioR = charR ? right.hp / charR.maxHp : 1;
                  return ratioL - ratioR || left.hp - right.hp;
                })[0] ?? actor;
              } else {
                targetActor = actor;
              }
            }

            const targetChar = state.session.characters.find((c) => c.id === targetActor?.characterId);
            if (!targetActor || !targetChar) continue;

            let conditionMet = false;
            if (slotConfig && slotConfig.conditions && slotConfig.conditions.length > 0) {
              conditionMet = isHotbarSlotConditionsMet(slotConfig, {
                actor,
                character,
                state,
              });
            } else {
              const tookRecentHit = (encounter.elapsedMs - actor.lastHitTakenAt) < 3000 && actor.hp < character.maxHp;
              conditionMet = targetActor.hp / targetChar.maxHp < 0.88 || tookRecentHit;
            }

            if (!conditionMet) continue;
          } else if (spell.group === 'support') {
            const isHaste = spell.name === 'Haste' || spell.name === 'Strong Haste' || spell.words.includes('hur');
            const isMagicShield = spell.words.includes('utamo') || spell.name.toLowerCase().includes('shield');
            const isBloodRage = spell.words.includes('tempo') || spell.name.toLowerCase().includes('rage');

            let buffActive = false;
            if (isHaste && actor.hasteUntil > encounter.elapsedMs) buffActive = true;
            else if (isMagicShield && actor.magicShieldUntil > encounter.elapsedMs) buffActive = true;
            else if (isBloodRage && actor.bloodRageUntil > encounter.elapsedMs) buffActive = true;

            if (buffActive) continue;

            if (slotConfig && slotConfig.conditions && slotConfig.conditions.length > 0) {
              const condMet = isHotbarSlotConditionsMet(slotConfig, {
                actor,
                character,
                state,
              });
              if (!condMet) continue;
            } else if (isBloodRage && !encounter.enemies.some((enemy) => enemy.alive)) {
              continue;
            }
            targetActor = actor;
          } else if (isDirectionalSpell(spell)) {
            const rawEnemies = ((encounter.isMultiplayerParty && !isLeader && leaderTarget) || (isParty && !isFocusLead && focusTarget))
              ? [focusTarget ?? leaderTarget!]
              : encounter.enemies.filter((enemy) => enemy.alive);
            const eligibleEnemies = rawEnemies.filter((e) => !isIgnored(e.name));
            const maxReach = Math.max(5, spell.range || 1);
            const nearby = eligibleEnemies.filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= maxReach);
            if (nearby.length === 0) continue;

            const lockedTarget = actor.targetId ? nearby.find((e) => e.id === actor.targetId) : undefined;
            const preferredId = lockedTarget?.id ?? (focusTarget?.id || leaderTarget?.id || null);

            const { direction: bestDir, hitCount } = calculateBestSpellDirection(
              actor.position,
              nearby,
              spell,
              preferredId,
              actor.direction
            );

            if (hitCount === 0) continue;

            if (actor.direction !== bestDir) {
              actor.direction = bestDir;
              encounter.events.push({
                type: 'movement',
                actorId: actor.characterId,
                from: clonePosition(actor.position),
                to: clonePosition(actor.position),
                durationMs: 0,
              });
            }

            waveTiles = getSpellAreaTiles(spell, actor.position, actor.direction);
            const waveTileMap = new Set(waveTiles.map((t) => `${t.x},${t.y}`));
            targets = nearby.filter((enemy) => waveTileMap.has(`${enemy.position.x},${enemy.position.y}`));
            if (targets.length === 0) continue;

            if (slotConfig && slotConfig.conditions && slotConfig.conditions.length > 0) {
              const condMet = isHotbarSlotConditionsMet(slotConfig, {
                actor,
                character,
                state,
                primaryTarget: targets[0],
                eligibleEnemies: targets,
              });
              if (!condMet) continue;
            }
          } else {
            const lockedTarget = actor.targetId ? encounter.enemies.find((enemy) => enemy.id === actor.targetId && enemy.alive) : null;
            const targetToPrioritize = ((encounter.isMultiplayerParty && !isLeader && leaderTarget) || (isParty && !isFocusLead && focusTarget))
              ? (focusTarget ?? leaderTarget)
              : lockedTarget;

            const rawEnemies = (targetToPrioritize && spell.area === 'target')
              ? [targetToPrioritize]
              : encounter.enemies.filter((enemy) => enemy.alive);

            const eligibleEnemies = rawEnemies.filter((e) => !isIgnored(e.name));
            const range = Math.max(1, spell.range);
            const inRange = eligibleEnemies.filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= range)
              .sort((left, right) => {
                const isLeftTarget = left.id === targetToPrioritize?.id;
                const isRightTarget = right.id === targetToPrioritize?.id;
                if (isLeftTarget !== isRightTarget) return isLeftTarget ? -1 : 1;
                return meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id);
              });
            if (inRange.length === 0) continue;
            const primaryTarget = inRange[0];

            if (slotConfig && slotConfig.conditions && slotConfig.conditions.length > 0) {
              const condMet = isHotbarSlotConditionsMet(slotConfig, {
                actor,
                character,
                state,
                primaryTarget,
                eligibleEnemies: inRange,
              });
              if (!condMet) continue;
            }

            targets = spell.area === 'square-1x1' ? inRange.slice(0, 8) : [primaryTarget];
          }

          const rng = createSeededRng(encounter.rngState);
          const formulaRange = spellFormulaRange(spell, character, stats.activeSkillLevel, weapon?.attack ?? stats.attack);
          const amount = rollInteger(rng, Math.floor(formulaRange.min), Math.max(Math.floor(formulaRange.min), Math.ceil(formulaRange.max)));
          encounter.rngState = rng.state;
          actor.mana -= spell.mana;
          if (spell.mana > 0) {
            const vocation = vocationFor(content, character.vocation);
            const skillRate = serverConfigManager.getConfig().skillRate ?? 1.0;
            for (const advanced of applySkillTrainingProgress(character, 'magicLevel', spell.mana, vocation, content.rateMagic, skillRate)) {
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
          actor.groupCooldowns['potion'] = Math.max(actor.groupCooldowns['potion'] ?? 0, encounter.elapsedMs + 1000);

          const spellSpeech = formatSpellWords(spell.words);
          const projectileId = spell.visual.projectileId === 'weapon-type' ? resolveWeaponProjectile(character, content) : spell.visual.projectileId;

          if (spell.group === 'healing' && targetActor) {
            const targetCharacter = state.session.characters.find((candidate) => candidate.id === targetActor!.characterId)!;
            const healed = Math.min(amount, targetCharacter.maxHp - targetActor.hp);
            targetActor.hp += healed;
            encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: targetActor.characterId, spellId: spell.spellId, amount: healed, healing: true, speech: spellSpeech, element: 'healing' });
            encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: targetActor.characterId, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
            addLog(state, `${character.name} usou ${spell.name} e curou ${healed}.`);
            syncCharacterResources(state, targetActor);
            usedSpellThisTick = true;
            usedPotionThisTick = true;
          } else if (spell.group === 'support' && targetActor) {
            const duration = spell.formula.durationMs ?? (spell.words.includes('utamo') ? 200_000 : 33_000);
            if (spell.words.includes('utamo')) actor.magicShieldUntil = encounter.elapsedMs + duration;
            else if (spell.words.includes('tempo')) actor.bloodRageUntil = encounter.elapsedMs + duration;
            else actor.hasteUntil = encounter.elapsedMs + duration;

            encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech, element: 'support' });
            encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
            addLog(state, `${character.name} usou ${spell.name}.`);
            usedSpellThisTick = true;
            usedPotionThisTick = true;
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
            } else if (isDirectionalSpell(spell)) {
              for (const tile of waveTiles) {
                encounter.events.push({
                  type: 'spell-visual',
                  sourceId: actor.characterId,
                  targetPosition: { x: tile.x, y: tile.y, z: actor.position.z },
                  spellId: spell.spellId,
                  effectId: spell.visual.effectId,
                  projectileId: null,
                });
              }
            }

            let isFirstSpellTarget = true;
            for (const target of targets) {
              const damage = resistedDamage(amount, target, spell.combatType, content);
              target.hp = Math.max(0, target.hp - damage);
              encounter.events.push({
                type: 'spell-cast',
                sourceId: actor.characterId,
                targetId: target.id,
                spellId: spell.spellId,
                amount: damage,
                healing: false,
                speech: isFirstSpellTarget ? spellSpeech : undefined,
                element: spell.combatType,
              });
              isFirstSpellTarget = false;
              if (spell.area !== 'square-1x1' && !isDirectionalSpell(spell)) {
                encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: target.id, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
              }
              addLog(state, `${character.name} usou ${spell.name} em ${target.name} por ${damage}.`);
              if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
            }
            if (targets.length === 0) {
              encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech, element: spell.combatType || 'support' });
              addLog(state, `${character.name} usou ${spell.name}.`);
            }
            usedSpellThisTick = true;
            usedPotionThisTick = true;
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
  const character = state.session.characters.find((candidate) => candidate.id === characterId);
  if (!character) return false;
  const action = findHotbarAction(actionId, content);
  if (!action || !isHotbarActionUnlocked(character, action)) return false;

  const actor = encounter.partyActors.find((candidate) => candidate.characterId === characterId && candidate.alive);
  if (!actor) {
    // City Mode (Thais) Fallback: Execute potions and non-aggressive healing/support spells directly
    if (action.kind === 'potion') {
      const potion = action.potion;
      if (!character.combatState) {
        character.combatState = { targetId: null, spellCooldowns: {}, groupCooldowns: {}, hasteUntil: 0, magicShieldUntil: 0, bloodRageUntil: 0 };
      }
      if (!character.combatState.spellCooldowns) character.combatState.spellCooldowns = {};
      if (!character.combatState.groupCooldowns) character.combatState.groupCooldowns = {};

      if ((character.combatState.groupCooldowns['potion'] ?? 0) > encounter.elapsedMs) return false;
      if ((character.combatState.groupCooldowns['healing'] ?? 0) > encounter.elapsedMs) return false;

      const potionDetails = { fromGold: false, cost: 0 };
      const consumed = consumePotionFromInventory(state, potion.id, character.name, potionDetails);
      if (!consumed) return false;
      const rng = createSeededRng(encounter.rngState);
      if (typeof potion.healMin === 'number' && typeof potion.healMax === 'number') {
        const rawHeal = rollInteger(rng, potion.healMin, potion.healMax);
        const healed = Math.min(rawHeal, character.maxHp - character.currentHp);
        character.currentHp += healed;
      }
      if (typeof potion.manaMin === 'number' && typeof potion.manaMax === 'number') {
        const rawMana = rollInteger(rng, potion.manaMin, potion.manaMax);
        const restoredMana = Math.min(rawMana, character.maxMana - character.currentMana);
        character.currentMana += restoredMana;
      }
      character.combatState.groupCooldowns['potion'] = encounter.elapsedMs + Math.max(1000, potion.cooldownMs);
      character.combatState.groupCooldowns['healing'] = Math.max(character.combatState.groupCooldowns['healing'] ?? 0, encounter.elapsedMs + 1000);
      character.combatState.groupCooldowns['attack'] = Math.max(character.combatState.groupCooldowns['attack'] ?? 0, encounter.elapsedMs + 1000);
      character.combatState.groupCooldowns['support'] = Math.max(character.combatState.groupCooldowns['support'] ?? 0, encounter.elapsedMs + 1000);
      const goldLog = potionDetails.fromGold ? ` (-${potionDetails.cost} gold da Caixa da Party)` : '';
      addLog(state, `${character.name} usou ${potion.name}${goldLog}.`);
      return true;
    }
    if (action.kind === 'spell') {
      const spell = action.spell;
      if (character.currentMana < spell.mana) return false;
      if (!character.combatState) {
        character.combatState = { targetId: null, spellCooldowns: {}, groupCooldowns: {}, hasteUntil: 0, magicShieldUntil: 0, bloodRageUntil: 0 };
      }
      if (!character.combatState.spellCooldowns) character.combatState.spellCooldowns = {};
      if (!character.combatState.groupCooldowns) character.combatState.groupCooldowns = {};

      if ((character.combatState.spellCooldowns[String(spell.spellId)] ?? 0) > encounter.elapsedMs) return false;
      if ((character.combatState.groupCooldowns[spell.group] ?? 0) > encounter.elapsedMs) return false;
      if ((character.combatState.groupCooldowns['potion'] ?? 0) > encounter.elapsedMs) return false;

      character.currentMana -= spell.mana;
      character.combatState.spellCooldowns[String(spell.spellId)] = encounter.elapsedMs + (spell.cooldownMs ?? 1000);
      character.combatState.groupCooldowns[spell.group] = encounter.elapsedMs + (spell.groupCooldownMs ?? 1000);
      character.combatState.groupCooldowns['potion'] = Math.max(character.combatState.groupCooldowns['potion'] ?? 0, encounter.elapsedMs + 1000);

      if (spell.group === 'healing') {
        const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
        const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));
        const rng = createSeededRng(encounter.rngState);
        const formulaRange = spellFormulaRange(spell, character, stats.activeSkillLevel, weapon?.attack ?? stats.attack);
        const amount = rollInteger(rng, Math.floor(formulaRange.min), Math.max(Math.floor(formulaRange.min), Math.ceil(formulaRange.max)));
        const healed = Math.min(amount, character.maxHp - character.currentHp);
        character.currentHp += healed;
        addLog(state, `${character.name} usou ${spell.name} e curou ${healed}.`);
        return true;
      }
      if (spell.group === 'support') {
        const duration = spell.formula.durationMs ?? (spell.words.includes('utamo') ? 200_000 : 33_000);
        if (spell.words.includes('utamo')) {
          character.combatState.magicShieldUntil = encounter.elapsedMs + duration;
        } else if (spell.words.includes('tempo')) {
          character.combatState.bloodRageUntil = encounter.elapsedMs + duration;
        } else {
          character.combatState.hasteUntil = encounter.elapsedMs + duration;
        }
        addLog(state, `${character.name} usou ${spell.name}.`);
        return true;
      }
      // Offensive and utility spells in city mode
      addLog(state, `${character.name} usou ${spell.name}.`);
      return true;
    }
    return false;
  }

  // 1. Potion manual trigger
  if (action.kind === 'potion') {
    const potion = action.potion;
    if ((actor.groupCooldowns['potion'] ?? 0) > encounter.elapsedMs) return false;
    if ((actor.groupCooldowns['healing'] ?? 0) > encounter.elapsedMs) return false;

    const potionDetails = { fromGold: false, cost: 0 };
    const consumed = consumePotionFromInventory(state, potion.id, character.name, potionDetails);
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
    actor.groupCooldowns['potion'] = encounter.elapsedMs + Math.max(1000, potion.cooldownMs);
    actor.groupCooldowns['healing'] = Math.max(actor.groupCooldowns['healing'] ?? 0, encounter.elapsedMs + 1000);
    actor.groupCooldowns['attack'] = Math.max(actor.groupCooldowns['attack'] ?? 0, encounter.elapsedMs + 1000);
    actor.groupCooldowns['support'] = Math.max(actor.groupCooldowns['support'] ?? 0, encounter.elapsedMs + 1000);

    const speechText = potionDetails.fromGold ? `Aaaah... (-${potionDetails.cost}gp)` : 'Aaaah...';
    encounter.events.push({
      type: 'spell-cast',
      sourceId: actor.characterId,
      targetId: actor.characterId,
      spellId: potion.id,
      amount: healed || restoredMana,
      healing: healed > 0,
      speech: speechText,
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

    const goldLog = potionDetails.fromGold ? ` (-${potionDetails.cost} gold da Caixa da Party)` : '';
    addLog(state, `${character.name} usou ${potion.name}${details ? ` (${details}${goldLog})` : goldLog}.`);
    syncCharacterResources(state, actor);
    return true;
  }

  // 2. Rune manual trigger
  if (action.kind === 'rune') {
    const rune = action.rune;
    if ((actor.groupCooldowns['rune'] ?? 0) > encounter.elapsedMs || (actor.groupCooldowns['attack'] ?? 0) > encounter.elapsedMs || (actor.groupCooldowns['potion'] ?? 0) > encounter.elapsedMs) return false;
    const lockedTarget = actor.targetId ? encounter.enemies.find((enemy) => enemy.id === actor.targetId && enemy.alive) : null;
    const candidates = lockedTarget ? [lockedTarget] : encounter.enemies.filter((enemy) => enemy.alive);
    const inRange = candidates
      .filter((enemy) => meleeDistance(actor.position, enemy.position) <= rune.range)
      .sort((left, right) => {
        const isLeftTarget = left.id === actor.targetId;
        const isRightTarget = right.id === actor.targetId;
        if (isLeftTarget !== isRightTarget) return isLeftTarget ? -1 : 1;
        return meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id);
      });

    if (inRange.length === 0) return false;
    const primaryTarget = inRange[0];
    const centerPos = primaryTarget.position;
    const offsets = rune.area === 'circle-3x3'
      ? CIRCLE_3X3_OFFSETS
      : rune.area === 'cross-1x1'
      ? CROSS_1X1_OFFSETS
      : rune.area === 'square-1x1'
      ? SQUARE_1X1_OFFSETS
      : null;

    let targets: EnemyState[] = [primaryTarget];
    if (offsets) {
      const areaTileKeys = new Set(offsets.map((o) => `${centerPos.x + o.dx},${centerPos.y + o.dy},${centerPos.z}`));
      const secondaryEnemies = inRange.filter((enemy) =>
        enemy.alive && enemy.id !== primaryTarget.id && areaTileKeys.has(`${enemy.position.x},${enemy.position.y},${enemy.position.z}`)
      );
      targets = [primaryTarget, ...secondaryEnemies];
    }

    const rng = createSeededRng(encounter.rngState);

    let minDmg = character.level * 0.2 + character.skills.magicLevel * 2.5 + 15;
    let maxDmg = character.level * 0.2 + character.skills.magicLevel * 4.0 + 30;
    if (rune.id === 2268) {
      minDmg = character.level * 0.2 + character.skills.magicLevel * 7.0 + 40;
      maxDmg = character.level * 0.2 + character.skills.magicLevel * 9.5 + 65;
    } else if (rune.id === 2311) {
      minDmg = character.level * 0.2 + character.skills.magicLevel * 1.6 + 10;
      maxDmg = character.level * 0.2 + character.skills.magicLevel * 2.4 + 18;
    } else if (rune.id === 2304 || rune.id === 2274 || rune.id === 2288 || rune.id === 2315) {
      minDmg = character.level * 0.2 + character.skills.magicLevel * 2.2 + 15;
      maxDmg = character.level * 0.2 + character.skills.magicLevel * 3.5 + 25;
    }

    const rawDamage = rollInteger(rng, Math.floor(minDmg), Math.max(Math.floor(minDmg), Math.ceil(maxDmg)));
    encounter.rngState = rng.state;
    actor.groupCooldowns['rune'] = encounter.elapsedMs + rune.cooldownMs;
    actor.groupCooldowns['attack'] = encounter.elapsedMs + rune.cooldownMs;
    actor.groupCooldowns['potion'] = Math.max(actor.groupCooldowns['potion'] ?? 0, encounter.elapsedMs + 1000);
    actor.nextAttackAt = encounter.elapsedMs + rune.cooldownMs;

    const impactDelay = rune.projectileId > 0 ? RUNE_PROJECTILE_FLIGHT_MS : 0;

    // 1. Launch missile to primary target if projectileId > 0
    if (rune.projectileId > 0) {
      encounter.events.push({
        type: 'spell-visual',
        sourceId: actor.characterId,
        targetId: primaryTarget.id,
        spellId: rune.id,
        effectId: rune.area === 'target' && rune.effectId > 0 ? rune.effectId : null,
        projectileId: rune.projectileId,
      });
    }

    // 2. For area runes, detonate impact effect across blast area tiles at missile arrival (+240ms if missile, 0ms otherwise)
    if (offsets && rune.effectId > 0) {
      for (const offset of offsets) {
        encounter.events.push({
          type: 'spell-visual',
          sourceId: actor.characterId,
          targetPosition: { x: centerPos.x + offset.dx, y: centerPos.y + offset.dy, z: centerPos.z },
          spellId: rune.id,
          effectId: rune.effectId,
          projectileId: null,
          delayMs: impactDelay,
        });
      }
    } else if (rune.area === 'target' && rune.projectileId === 0 && rune.effectId > 0) {
      encounter.events.push({
        type: 'spell-visual',
        sourceId: actor.characterId,
        targetId: primaryTarget.id,
        spellId: rune.id,
        effectId: rune.effectId,
        projectileId: null,
      });
    }

    let isFirstManualRuneTarget = true;
    for (const target of targets) {
      const damage = resistedDamage(rawDamage, target, rune.combatType, content);
      target.hp = Math.max(0, target.hp - damage);
      encounter.events.push({
        type: 'spell-cast',
        sourceId: actor.characterId,
        targetId: target.id,
        spellId: rune.id,
        amount: damage,
        healing: false,
        speech: isFirstManualRuneTarget ? rune.name : undefined,
        delayMs: impactDelay,
        element: rune.combatType,
      });
      isFirstManualRuneTarget = false;
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
  if ((actor.groupCooldowns['potion'] ?? 0) > encounter.elapsedMs) return false;
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
  actor.groupCooldowns['potion'] = Math.max(actor.groupCooldowns['potion'] ?? 0, encounter.elapsedMs + 1000);
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
    encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: healed, healing: true, speech: spellSpeech, element: 'healing' });
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

    encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech, element: 'support' });
    encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
    addLog(state, `${character.name} usou ${spell.name}.`);
    syncCharacterResources(state, actor);
    return true;
  }

  // Attack spell
  let targets: EnemyState[] = [];
  let waveTiles: Array<{ x: number; y: number; z: number }> = [];

  if (isDirectionalSpell(spell)) {
    const maxReach = Math.max(5, spell.range || 1);
    const nearby = encounter.enemies.filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= maxReach);
    const lockedTarget = actor.targetId ? nearby.find((e) => e.id === actor.targetId) : undefined;
    const { direction: bestDir, hitCount } = calculateBestSpellDirection(
      actor.position,
      nearby,
      spell,
      lockedTarget?.id || null,
      actor.direction
    );
    if (hitCount > 0 || lockedTarget) {
      if (actor.direction !== bestDir) {
        actor.direction = bestDir;
        encounter.events.push({
          type: 'movement',
          actorId: actor.characterId,
          from: clonePosition(actor.position),
          to: clonePosition(actor.position),
          durationMs: 0,
        });
      }
    }
    waveTiles = getSpellAreaTiles(spell, actor.position, actor.direction);
    const waveTileMap = new Set(waveTiles.map((t) => `${t.x},${t.y}`));
    targets = encounter.enemies.filter((enemy) => enemy.alive && waveTileMap.has(`${enemy.position.x},${enemy.position.y}`));
  } else {
    const spellRange = Math.max(1, spell.range);
    const lockedTarget = actor.targetId ? encounter.enemies.find((e) => e.id === actor.targetId && e.alive) : null;
    const candidates = (lockedTarget && spell.area === 'target') ? [lockedTarget] : encounter.enemies.filter((enemy) => enemy.alive);
    const inRange = candidates.filter((enemy) => meleeDistance(actor.position, enemy.position) <= spellRange)
      .sort((left, right) => {
        const isLeftTarget = left.id === actor.targetId;
        const isRightTarget = right.id === actor.targetId;
        if (isLeftTarget !== isRightTarget) return isLeftTarget ? -1 : 1;
        return meleeDistance(actor.position, left.position) - meleeDistance(actor.position, right.position) || left.id.localeCompare(right.id);
      });

    if (inRange.length === 0 && spell.area === 'target') return false;
    targets = spell.area === 'square-1x1' ? inRange.slice(0, 8) : (inRange.length > 0 ? [inRange[0]] : []);
  }

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
  } else if (isDirectionalSpell(spell)) {
    for (const tile of waveTiles) {
      encounter.events.push({
        type: 'spell-visual',
        sourceId: actor.characterId,
        targetPosition: { x: tile.x, y: tile.y, z: actor.position.z },
        spellId: spell.spellId,
        effectId: spell.visual.effectId,
        projectileId: null,
      });
    }
  }

  let isFirstManualSpellTarget = true;
  for (const target of targets) {
    const damage = resistedDamage(amount, target, spell.combatType, content);
    target.hp = Math.max(0, target.hp - damage);
    encounter.events.push({
      type: 'spell-cast',
      sourceId: actor.characterId,
      targetId: target.id,
      spellId: spell.spellId,
      amount: damage,
      healing: false,
      speech: isFirstManualSpellTarget ? spellSpeech : undefined,
      element: spell.combatType,
    });
    isFirstManualSpellTarget = false;
    if (spell.area !== 'square-1x1' && !isDirectionalSpell(spell)) {
      encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: target.id, spellId: spell.spellId, effectId: spell.visual.effectId, projectileId });
    }
    addLog(state, `${character.name} usou ${spell.name} em ${target.name} por ${damage}.`);
    if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
  }

  if (targets.length === 0) {
    encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: actor.characterId, spellId: spell.spellId, amount: 0, healing: false, speech: spellSpeech, element: spell.combatType || 'support' });
    addLog(state, `${character.name} usou ${spell.name}.`);
  }
  syncCharacterResources(state, actor);
  return true;
}

function playerAttacks(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  const isParty = encounter.partyActors.filter((a) => a.alive).length > 1;
  const partyKnight = findPartyKnightActor(state);
  const focusLeadActor = partyKnight ?? encounter.partyActors.find((a) => a.alive && (a.characterId === state.session.leaderId || a.characterId === state.session.selectedCharacterId)) ?? encounter.partyActors.find((a) => a.alive);

  for (const actor of encounter.partyActors.filter((candidate) => candidate.alive)) {
    if (actor.pendingAttack && encounter.elapsedMs >= actor.pendingAttack.impactAt) {
      const pending = actor.pendingAttack; actor.pendingAttack = null;
      const target = encounter.enemies.find((enemy) => enemy.id === pending.targetId && enemy.alive);
      if (target) {
        const rng = createSeededRng(encounter.rngState);
        let damage = 0;
        if (pending.element) {
          damage = resistedDamage(pending.attack, target, pending.element, content);
        } else {
          const raw = rollInteger(rng, 0, Math.max(1, pending.attack));
          const armor = rollInteger(rng, Math.floor(target.armor / 2), target.armor);
          damage = Math.max(1, raw - armor);
        }
        encounter.rngState = rng.state;
        target.hp = Math.max(0, target.hp - damage);
        encounter.events.push({ type: 'player-attack', sourceId: actor.characterId, targetId: target.id, damage, element: pending.element || 'physical' });
        if (damage > 0) {
          if (pending.lifeLeechPercent && pending.lifeLeechPercent > 0) {
            const healedHp = Math.max(1, Math.round(damage * (pending.lifeLeechPercent / 100)));
            const char = state.session.characters.find((candidate) => candidate.id === actor.characterId);
            const maxHp = char?.maxHp || 150;
            actor.hp = Math.min(maxHp, actor.hp + healedHp);
            if (char) char.currentHp = actor.hp;
            encounter.visualEvents.push({ type: 'heal-applied', sourceId: actor.characterId, targetId: actor.characterId, effectId: 12 });
          }
          if (pending.manaLeechPercent && pending.manaLeechPercent > 0) {
            const restoredMana = Math.max(1, Math.round(damage * (pending.manaLeechPercent / 100)));
            const char = state.session.characters.find((candidate) => candidate.id === actor.characterId);
            const maxMana = char?.maxMana || 35;
            actor.mana = Math.min(maxMana, actor.mana + restoredMana);
            if (char) char.currentMana = actor.mana;
          }
        }
        if (pending.ranged) {
          const effectId = pending.effectId ?? 12;
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
        const critText = pending.isCritical ? ' (CRÍTICO!)' : '';
        addLog(state, `${character.name} atingiu ${target.name} por ${damage}${critText} com ${pending.weaponName}.`);
        if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
      }
    }
    if (actor.pendingAttack) continue;
    if (encounter.elapsedMs < actor.nextAttackAt || (actor.groupCooldowns['attack'] ?? 0) > encounter.elapsedMs) continue;

    const isFocusLead = !isParty || actor.characterId === focusLeadActor?.characterId;
    const isKnightActor = Boolean(partyKnight && actor.characterId === partyKnight.characterId);

    // Knight in party chooses the closest living enemy if no current target is set or dead
    if (isParty && isKnightActor) {
      const currentTarget = actor.targetId ? encounter.enemies.find((e) => e.id === actor.targetId && e.alive) : null;
      if (!currentTarget) {
        const livingEnemies = encounter.enemies.filter((e) => e.alive);
        if (livingEnemies.length > 0) {
          livingEnemies.sort((a, b) => meleeDistance(actor.position, a.position) - meleeDistance(actor.position, b.position));
          actor.targetId = livingEnemies[0].id;
        }
      }
    }

    // Secondary party members MUST synchronize and target the focus lead's target
    const leadTarget = focusLeadActor?.targetId ? encounter.enemies.find((e) => e.id === focusLeadActor.targetId && e.alive) : null;
    if (isParty && !isFocusLead && leadTarget) {
      actor.targetId = leadTarget.id;
    }

    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
    const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
    if (stats.attack <= 0) continue;

    const equippedWeapon = getEquippedItems(character, content.equipment).find((item) =>
      ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType) || Boolean(findWandDefinition(item.id))
    );
    const wandDef = equippedWeapon ? findWandDefinition(equippedWeapon.id) : undefined;

    if (wandDef) {
      // 1. Level and vocation requirement check
      const vocCheck = canUseWand(character, wandDef);
      if (!vocCheck.ok) {
        if ((actor as any).lastRequirementWarningAt !== encounter.elapsedMs) {
          (actor as any).lastRequirementWarningAt = encounter.elapsedMs;
          addLog(state, vocCheck.reason ?? `${character.name} não pode empunhar ${wandDef.name}.`);
        }
        actor.nextAttackAt = encounter.elapsedMs + 2000;
        continue;
      }
      // 2. Mana requirement
      if (actor.mana < wandDef.mana) {
        if ((actor as any).lastManaWarningAt !== encounter.elapsedMs) {
          (actor as any).lastManaWarningAt = encounter.elapsedMs;
          addLog(state, `${character.name} não possui mana suficiente para disparar ${wandDef.name} (${wandDef.mana} MP necessários).`);
        }
        actor.nextAttackAt = encounter.elapsedMs + 1000;
        continue;
      }
    }

    const range = attackRange(character.id, state, content);

    let target: EnemyState | undefined;
    if (isParty && !isFocusLead && leadTarget && meleeDistance(actor.position, leadTarget.position) <= range) {
      target = leadTarget;
    } else {
      const lockedTarget = actor.targetId ? encounter.enemies.find((enemy) => enemy.id === actor.targetId && enemy.alive) : undefined;
      if (lockedTarget) {
        if (meleeDistance(actor.position, lockedTarget.position) <= range) {
          target = lockedTarget;
        } else {
          // Locked target is out of range: do NOT redirect basic attacks to neighboring enemies (Phase 162)
          continue;
        }
      } else {
        const inRangeEnemies = encounter.enemies.filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= range);
        if (inRangeEnemies.length > 0) {
          inRangeEnemies.sort((a, b) => meleeDistance(actor.position, a.position) - meleeDistance(actor.position, b.position) || a.id.localeCompare(b.id));
          target = inRangeEnemies[0];
          actor.targetId = target.id;
        }
      }
    }

    if (!target) continue;

    const rng = createSeededRng(encounter.rngState);
    let effectiveAttack = 0;
    let isCritical = false;
    if (wandDef) {
      actor.mana = Math.max(0, actor.mana - wandDef.mana);
      syncCharacterResources(state, actor);
      const magicBonus = Math.floor(stats.activeSkillLevel * 0.6);
      const rawWandDmg = rollInteger(rng, wandDef.min, wandDef.max) + magicBonus;
      effectiveAttack = Math.max(1, rawWandDmg);
    } else {
      const stance = character.stance ?? actor.stance ?? 'offensive';
      const stanceMultiplier = stance === 'offensive' ? 1.0 : stance === 'balanced' ? 0.75 : 0.5;
      effectiveAttack = Math.max(1, Math.round(stats.attack * stanceMultiplier));
    }

    if (stats.criticalChancePercent && stats.criticalChancePercent > 0) {
      const critRoll = rollInteger(rng, 1, 100);
      if (critRoll <= stats.criticalChancePercent) {
        isCritical = true;
        const extraCritDmg = Math.round(effectiveAttack * ((stats.criticalDamagePercent || 10) / 100));
        effectiveAttack += extraCritDmg;
      }
    }
    encounter.rngState = rng.state;

    const ranged = range > 1;
    actor.pendingAttack = {
      targetId: target.id,
      impactAt: encounter.elapsedMs + 180,
      attack: effectiveAttack,
      weaponName: wandDef?.name ?? stats.weaponName,
      activeSkill: stats.activeSkill,
      activeSkillLevel: stats.activeSkillLevel,
      ranged,
      element: wandDef?.element,
      effectId: wandDef?.effectId,
      projectileId: wandDef?.projectileId,
      isCritical,
      lifeLeechPercent: stats.lifeLeechPercent,
      manaLeechPercent: stats.manaLeechPercent,
    };
    encounter.visualEvents.push({ type: 'basic-attack-started', sourceId: character.id, targetId: target.id, ranged });
    if (ranged) {
      // Legacy visual parity checks:
      // nameLower.includes('vortex') -> projectileId = 4, effectId = 11
      // nameLower.includes('draconia') -> effectId = 15
      // nameLower.includes('cosmic')
      const projectileId = wandDef ? wandDef.projectileId : (stats.weaponName.toLowerCase().includes('wand') ? 5 : 28);
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

  const potion = getBestHealthPotionForCharacter(character);
  if (!potion) return;

  const canDrink = (target.groupCooldowns['potion'] ?? 0) <= encounter.elapsedMs || target.hp - incomingDamage <= 0;
  if (!canDrink) return;

  const potionDetails = { fromGold: false, cost: 0 };
  const consumed = consumePotionFromInventory(state, potion.id, character.name, potionDetails);
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
  target.groupCooldowns['potion'] = encounter.elapsedMs + Math.max(1000, potion.cooldownMs);
  target.groupCooldowns['healing'] = Math.max(target.groupCooldowns['healing'] ?? 0, encounter.elapsedMs + 1000);
  target.groupCooldowns['attack'] = Math.max(target.groupCooldowns['attack'] ?? 0, encounter.elapsedMs + 1000);
  target.groupCooldowns['support'] = Math.max(target.groupCooldowns['support'] ?? 0, encounter.elapsedMs + 1000);

  const speechText = potionDetails.fromGold ? `Aaaah... (-${potionDetails.cost}gp)` : 'Aaaah...';
  encounter.events.push({
    type: 'spell-cast',
    sourceId: target.characterId,
    targetId: target.characterId,
    spellId: potion.id,
    amount: healed || restoredMana,
    healing: healed > 0,
    speech: speechText,
  });
  encounter.events.push({
    type: 'spell-visual',
    sourceId: target.characterId,
    targetId: target.characterId,
    spellId: potion.id,
    effectId: potion.effectId,
    projectileId: null,
  });

  const goldLog = potionDetails.fromGold ? ` (-${potionDetails.cost} gold da Caixa da Party)` : '';
  addLog(state, `${character.name} tomou poção de emergência (${potion.name}) antes do golpe fatal e recuperou ${healed} HP${goldLog}!`);
  syncCharacterResources(state, target);
}

function enemyAttacks(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  const rng = createSeededRng(encounter.rngState);
  for (const enemy of encounter.enemies.filter((candidate) => candidate.alive)) {
    if (encounter.elapsedMs < enemy.nextAttackAt) continue;
    const isChallenged = Boolean(enemy.challengedTargetId && enemy.challengedUntil && enemy.challengedUntil > encounter.elapsedMs);
    const challengedActor = isChallenged
      ? encounter.partyActors.find((actor) => actor.characterId === enemy.challengedTargetId && actor.alive && isMeleeRange(enemy.position, actor.position))
      : undefined;

    const target = challengedActor
      ?? encounter.partyActors.find((actor) => actor.characterId === enemy.targetId && actor.alive && isMeleeRange(enemy.position, actor.position))
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
    const hasShield = getEquippedItems(character, content.equipment).some(
      (item) => item.weaponType === 'shield' || (item as any).slot === 'shield' || item.defense > 0
    );
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
    encounter.events.push({ type: 'enemy-attack', sourceId: enemy.id, targetId: target.characterId, damage, element: 'physical' });
    addLog(state, `${enemy.name} causou ${damage} em ${character.name}.`);
    if (target.hp <= 0) {
      target.alive = false; target.path = [];
      encounter.events.push({ type: 'player-death', characterId: target.characterId, killerName: enemy.name } as any);
      addLog(state, `${character.name} foi derrotado por ${enemy.name}.`);
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
  const partyKnight = findPartyKnightActor(state);
  const mainLeadId = partyKnight?.characterId ?? state.session.selectedCharacterId;
  const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
  const minRanges = new Map(encounter.partyActors.map((actor) => [actor.characterId, minTacticalRange(actor.characterId, state)]));
  const activeChar = state.session.characters.find((candidate) => candidate.id === state.session.selectedCharacterId);
  const targetStrategy = activeChar?.targetStrategy ?? 'closest';
  movePartyTowardTargets(encounter, ranges, undefined, mainLeadId, targetStrategy, minRanges);
  moveEnemiesTowardParty(encounter);
  recordMovementEvents(encounter);
  castAutomaticSpells(state, content);
  playerAttacks(state, content);
  enemyAttacks(state, content);
  unlockExit(state);
}

function advanceExpedition(state: GameState, content: GameContent): void {
  const encounter = state.encounter; const expedition = encounter.expedition; const progress = encounter.expeditionProgress;
  if (!expedition || !progress) return;
  encounter.room.reservations = new Map();
  const current = expedition.encounters[progress.activeEncounterIndex];
  if (encounter.enemies.some((enemy) => enemy.alive)) {
    const partyKnight = findPartyKnightActor(state);
    const mainLeadId = partyKnight?.characterId ?? state.session.selectedCharacterId;
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    const minRanges = new Map(encounter.partyActors.map((actor) => [actor.characterId, minTacticalRange(actor.characterId, state)]));
    const activeChar = state.session.characters.find((candidate) => candidate.id === state.session.selectedCharacterId);
    const targetStrategy = activeChar?.targetStrategy ?? 'closest';
    movePartyTowardTargets(encounter, ranges, undefined, mainLeadId, targetStrategy, minRanges);
    moveEnemiesTowardParty(encounter);
    recordMovementEvents(encounter);
    castAutomaticSpells(state, content);
    playerAttacks(state, content);
    enemyAttacks(state, content);
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

  if (encounter.pullSize) {
    const living = encounter.enemies.filter((e) => e.alive);
    const leader = encounter.partyActors.find((a) => a.alive);
    if (living.length > 0 && leader) {
      return { kind: 'combat', zoneIndex: 0, target: clonePosition(living[0].position), enemyIds: living.map((e) => e.id) };
    }
    if (leader) {
      return { kind: 'next-respawn', zoneIndex: 0, target: clonePosition(leader.position), enemyIds: [] };
    }
  }

  for (let offset = 0; offset < route.respawnZones.length; offset += 1) {
    const zoneIndex = (progress.currentZoneIndex + offset) % route.respawnZones.length;
    const enemyIds = progress.zones[zoneIndex].activeEnemyIds.filter((id) => encounter.enemies.some((enemy) => enemy.id === id && enemy.alive));
    if (enemyIds.length > 0) return { kind: 'combat', zoneIndex, target: clonePosition(route.respawnZones[zoneIndex].center), enemyIds };
  }

  // Dynamic solo exploration: if there are living enemies anywhere in the cave, head to the nearest one!
  const isSolo = encounter.partyActors.filter((a) => a.alive).length <= 1;
  const livingEnemies = encounter.enemies.filter((enemy) => enemy.alive);
  if (isSolo && livingEnemies.length > 0) {
    const leader = encounter.partyActors.find((actor) => actor.alive);
    if (leader) {
      const sortedEnemies = [...livingEnemies].sort((a, b) => meleeDistance(leader.position, a.position) - meleeDistance(leader.position, b.position));
      const nearest = sortedEnemies[0];
      let bestZoneIndex = progress.currentZoneIndex;
      let bestDist = Infinity;
      for (let i = 0; i < route.respawnZones.length; i++) {
        const d = meleeDistance(route.respawnZones[i].center, nearest.position);
        if (d < bestDist) {
          bestDist = d;
          bestZoneIndex = i;
        }
      }
      return { kind: 'combat', zoneIndex: bestZoneIndex, target: clonePosition(nearest.position), enemyIds: [nearest.id] };
    }
  }

  const zoneIndex = progress.currentZoneIndex;
  return { kind: progress.loopCount > 0 && zoneIndex === 0 ? 'next-loop' : (progress.zones[zoneIndex].nextRespawnAt > encounter.elapsedMs ? 'waypoint' : 'next-respawn'), zoneIndex, target: clonePosition(route.respawnZones[zoneIndex].center), enemyIds: [] };
}

function recordContinuousActivityOrThrow(state: GameState, objective: HuntObjective): void {
  const progress = state.encounter.continuousProgress!;
  const active = state.encounter.events.some((event) => event.type === 'movement' || event.type === 'player-attack' || event.type === 'enemy-attack' || event.type === 'enemy-death');
  if (active || (state.encounter.pullSize && !state.encounter.enemies.some((e) => e.alive))) {
    progress.lastActivityAt = state.encounter.elapsedMs;
    progress.stalledSince = null;
    return;
  }
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
  for (let checked = 0; checked < route.respawnZones.length; checked += 1) {
    const zone = route.respawnZones[progress.currentZoneIndex];
    const zoneState = progress.zones[progress.currentZoneIndex];
    const activeEnemies = zoneState.activeEnemyIds.filter((id) => encounter.enemies.some((enemy) => enemy.id === id && enemy.alive));
    if (zoneState.activeEnemyIds.length > 0 && activeEnemies.length === 0) {
      zoneState.activeEnemyIds = [];
      zoneState.lastClearedAt = encounter.elapsedMs;
      zoneState.nextRespawnAt = encounter.elapsedMs + zone.gameRespawnSeconds * 1_000;
      progress.currentZoneIndex += 1;
      if (progress.currentZoneIndex >= route.respawnZones.length) {
        progress.currentZoneIndex = 0;
        progress.loopCount += 1;
      }
      addLog(state, `${zone.id} limpa. A party continua a rota.`);
    } else {
      break;
    }
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
    const partyKnight = findPartyKnightActor(state);
    const mainLeadId = partyKnight?.characterId ?? state.session.selectedCharacterId;
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    const minRanges = new Map(encounter.partyActors.map((actor) => [actor.characterId, minTacticalRange(actor.characterId, state)]));
    movePartyTowardTargets(encounter, ranges, new Set(objective.enemyIds), mainLeadId, undefined, minRanges);
    const leader = encounter.partyActors.find((actor) => actor.characterId === (partyKnight?.characterId ?? state.session.leaderId) && actor.alive) ?? encounter.partyActors.find((actor) => actor.alive);
    if (leader && leader.path.length === 0 && !encounter.enemies.some((e) => e.alive && meleeDistance(leader.position, e.position) <= (ranges.get(leader.characterId) ?? 1))) {
      movePartyTowardPoint(encounter, objective.target, mainLeadId);
    }
    moveEnemiesTowardParty(encounter); recordMovementEvents(encounter);
    castAutomaticSpells(state, content); playerAttacks(state, content); enemyAttacks(state, content);
    recordContinuousActivityOrThrow(state, objective);
    return;
  }

  const maxVisDist = encounter.pullSize ? 25 : 7;
  const visibleEnemies = encounter.enemies.filter((enemy) => enemy.alive && encounter.partyActors.some((actor) => actor.alive && (meleeDistance(actor.position, enemy.position) <= maxVisDist || (actor.targetId === enemy.id && meleeDistance(actor.position, enemy.position) <= maxVisDist + 1))));
  if (visibleEnemies.length > 0) {
    const partyKnight = findPartyKnightActor(state);
    const mainLeadId = partyKnight?.characterId ?? state.session.selectedCharacterId;
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    const minRanges = new Map(encounter.partyActors.map((actor) => [actor.characterId, minTacticalRange(actor.characterId, state)]));
    movePartyTowardTargets(encounter, ranges, new Set(visibleEnemies.map((e) => e.id)), mainLeadId, undefined, minRanges);
    moveEnemiesTowardParty(encounter);
    recordMovementEvents(encounter);
    castAutomaticSpells(state, content);
    playerAttacks(state, content);
    enemyAttacks(state, content);
    recordContinuousActivityOrThrow(state, objective);
    return;
  }

  const partyKnight = findPartyKnightActor(state);
  const mainLeadId = partyKnight?.characterId ?? state.session.selectedCharacterId;
  const leader = encounter.partyActors.find((actor) => actor.characterId === (partyKnight?.characterId ?? state.session.leaderId) && actor.alive) ?? encounter.partyActors.find((actor) => actor.alive);
  if (!leader) return;

  // Idle Arena Pull Mode: if pullSize is set and waiting for respawn, leader stays put in arena (no wandering)
  if (encounter.pullSize && !encounter.enemies.some((e) => e.alive)) {
    progress.lastActivityAt = encounter.elapsedMs;
    return;
  }

  // Solo dynamic exploration: if waypoint is empty and there are living monsters elsewhere in the dungeon, pathfind to nearest living monster!
  let targetPoint = objective.target;
  const isSolo = encounter.partyActors.filter((a) => a.alive).length <= 1;
  const livingEnemies = encounter.enemies.filter((e) => e.alive);
  if (isSolo && livingEnemies.length > 0 && visibleEnemies.length === 0) {
    const sortedLiving = [...livingEnemies].sort((a, b) => meleeDistance(leader.position, a.position) - meleeDistance(leader.position, b.position));
    targetPoint = sortedLiving[0].position;
  }

  const before = `${leader.position.x},${leader.position.y}`;
  const reached = movePartyTowardPoint(encounter, targetPoint, mainLeadId);
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
  next.encounter.status = 'running';
  if (next.encounter.mode === 'legacyWaveMode') spawnRoom(next, content);
  else if (next.encounter.mode === 'expedition') { next.encounter.room.phase = 'combat'; next.encounter.room.phaseTicks = 0; spawnExpeditionEncounter(next, content); }
  else { next.encounter.room.phase = 'combat'; next.encounter.room.phaseTicks = 0; populateReadyRespawns(next, content, true); }
  addLog(next, `${leaderOf(next).name} iniciou ${next.encounter.hunt.name}.`); return next;
}

export function restartHunt(state: GameState, seed: string, content: GameContent, huntId = state.encounter.hunt.id, pullSize: HuntPullSize | undefined = state.encounter.pullSize): GameState {
  const session = structuredClone(state.session) as SessionState;
  session.characters = session.characters.map((character) => ({
    ...character,
    currentHp: character.maxHp,
    currentMana: character.maxMana,
    combatState: { targetId: null, spellCooldowns: {}, groupCooldowns: {} },
  }));
  return startGame({ session, encounter: createEncounter(seed, session, content, huntId, state.encounter.mode, pullSize) }, content);
}

export function selectHunt(state: GameState, seed: string, content: GameContent, huntId: string, pullSize?: HuntPullSize): GameState {
  return restartHunt(state, seed, content, huntId, pullSize);
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

    // Tick imbuements on equipped items
    if (character.equipmentAttributes) {
      for (const [slot, attr] of Object.entries(character.equipmentAttributes)) {
        if (character.equipment[slot as CharacterEquipmentSlot] && attr && Array.isArray(attr.imbuements) && attr.imbuements.length > 0) {
          const res = tickImbuementTime(attr.imbuements, deltaSec, next.session.gold);
          if (res.goldDeducted > 0) {
            next.session.gold = Math.max(0, next.session.gold - res.goldDeducted);
            addLog(next, `Imbuement renovado automaticamente para ${character.name}! (-${res.goldDeducted} gp da Caixa da Party)`);
          }
          if (res.expiredCount > 0) {
            addLog(next, `Um imbuement de ${character.name} no slot ${slot} expirou!`);
          }
          attr.imbuements = res.updated;
        }
      }
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
  killerName?: string;
  content?: GameContent;
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

export interface LostEquipmentItemDetail {
  slot: CharacterEquipmentSlot;
  itemId: number;
  name: string;
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
  consumedBlessingsCount: number;
  blessingsProtectionPercent: number;
  lostEquipment: LostEquipmentItemDetail[];
  killerName?: string;
}

export function calculateDeathPenaltyReport(
  character: CharacterState,
  sessionLoot: LootStack[] = [],
  options?: DeathPenaltyOptions,
): DeathPenaltyReport {
  const cfg = serverConfigManager.getConfig();
  const rawExpPercent = options?.expLossPercent ?? cfg.deathPenaltyExpPercent ?? 10;
  const rawSkillPercent = options?.skillLossPercent ?? cfg.deathPenaltySkillPercent ?? 10;
  const loseLootEnabled = options?.loseLoot ?? cfg.deathPenaltyLoseLoot ?? true;

  const protection = calculateDeathProtection(character.blessings || []);
  const isPromoted = Boolean(character.promotion) || ['Master Sorcerer', 'Elder Druid', 'Royal Paladin', 'Elite Knight'].includes(character.vocation);
  const promoMultiplier = isPromoted ? 0.70 : 1.0;
  const expPercent = Math.max(0, rawExpPercent * promoMultiplier * protection.effectiveLossRatio);
  const skillPercent = Math.max(0, rawSkillPercent * promoMultiplier * protection.effectiveLossRatio);

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

  // Equipment loss based on blessings protection
  const lostEquipment: LostEquipmentItemDetail[] = [];
  if (protection.equipLossChancePercent > 0 && character.equipment) {
    const equipKeys = Object.keys(character.equipment) as CharacterEquipmentSlot[];
    for (const slot of equipKeys) {
      const itemId = character.equipment[slot];
      if (itemId) {
        if (Math.random() * 100 < protection.equipLossChancePercent) {
          const itemDef = options?.content?.equipment ? findEquipment(options.content.equipment, itemId) : undefined;
          lostEquipment.push({
            slot,
            itemId,
            name: itemDef?.name || `Item #${itemId}`,
          });
        }
      }
    }
  }

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
    consumedBlessingsCount: protection.blessingsCount,
    blessingsProtectionPercent: protection.lossReductionPercent,
    lostEquipment,
    killerName: options?.killerName,
  };
}

export function respawnInTemple(
  state: GameState,
  options?: DeathPenaltyOptions,
  content?: GameContent,
): GameState {
  const next = cloneState(state);
  const cfg = serverConfigManager.getConfig();
  const rawExpLossPercent = options?.expLossPercent ?? cfg.deathPenaltyExpPercent ?? 10;
  const rawSkillLossPercent = options?.skillLossPercent ?? cfg.deathPenaltySkillPercent ?? 10;
  const loseLoot = options?.loseLoot ?? cfg.deathPenaltyLoseLoot ?? true;

  const charMap = new Map(next.session.characters.map((c) => [c.id, c]));
  let totalBlessingsConsumed = 0;

  for (const character of next.session.characters) {
    const protection = calculateDeathProtection(character.blessings || []);
    if (protection.blessingsCount > 0) {
      totalBlessingsConsumed = Math.max(totalBlessingsConsumed, protection.blessingsCount);
    }
    const isPromoted = Boolean(character.promotion) || ['Master Sorcerer', 'Elder Druid', 'Royal Paladin', 'Elite Knight'].includes(character.vocation);
    const promoMultiplier = isPromoted ? 0.70 : 1.0;
    const expLossPercent = Math.max(0, rawExpLossPercent * promoMultiplier * protection.effectiveLossRatio);
    const skillLossPercent = Math.max(0, rawSkillLossPercent * promoMultiplier * protection.effectiveLossRatio);

    // 1. XP Penalty: lose configured % of experience (mitigated by blessings & promotion)
    if (expLossPercent > 0 && character.experience > 0) {
      const expLost = Math.floor(character.experience * (expLossPercent / 100));
      character.experience = Math.max(0, character.experience - expLost);

      // Level recalculation (de-level if experience drops below current level threshold)
      const prevLevel = character.level;
      const newLevel = levelForExperience(character.experience);
      if (newLevel < prevLevel) {
        character.level = newLevel;
        const stats = calculateStatsForLevel(character.vocation, newLevel);
        character.maxHp = stats.maxHp;
        character.maxMana = stats.maxMana;
      }
    }

    // 2. Skill Penalty: lose configured % in all skills (mitigated by blessings)
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

    // 3. Equipment Loss if without full blessings
    if (protection.equipLossChancePercent > 0 && character.equipment) {
      const equipKeys = Object.keys(character.equipment) as CharacterEquipmentSlot[];
      for (const slot of equipKeys) {
        const itemId = character.equipment[slot];
        if (itemId && Math.random() * 100 < protection.equipLossChancePercent) {
          character.equipment[slot] = null;
        }
      }
    }

    // 4. Always consume ALL blessings upon death
    character.blessings = [];

    character.currentHp = character.maxHp;
    character.currentMana = character.maxMana;
    character.combatState.targetId = null;
    character.combatState.spellCooldowns = {};
    character.combatState.groupCooldowns = {};
  }

  // 5. Loot Penalty: lose accumulated hunt loot if enabled (default true)
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
  const blessingsMsg = totalBlessingsConsumed > 0 ? ` (${totalBlessingsConsumed} blessings consumidas)` : ' (sem blessings)';
  addLog(next, `Alas! Você morreu e renasceu no Templo de Thais. Penalidade calculada${blessingsMsg}${loseLoot ? `, e o loot da caçada foi perdido (${lostLootCount} itens)` : ''}.`);
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

export function setCharacterTargetStrategy(state: GameState, characterId: string, strategy: TargetSelectionStrategy): GameState {
  const next = cloneState(state);
  const character = next.session.characters.find((candidate) => candidate.id === characterId);
  if (character) character.targetStrategy = strategy;
  const actor = next.encounter.partyActors.find((candidate) => candidate.characterId === characterId);
  if (actor) actor.targetStrategy = strategy;
  return next;
}

export function advanceCityAutoSpells(state: GameState, content: GameContent, deltaMs: number): GameState {
  const next = cloneState(state);
  next.encounter.elapsedMs += deltaMs;

  for (const character of next.session.characters) {
    let actor = next.encounter.partyActors.find((a) => a.characterId === character.id);
    if (!actor) {
      const voc = vocationFor(content, character.vocation);
      actor = {
        characterId: character.id,
        hp: character.currentHp,
        mana: character.currentMana,
        alive: true,
        position: { x: THAIS_TEMPLE_POSITION.x, y: THAIS_TEMPLE_POSITION.y, z: THAIS_TEMPLE_POSITION.z },
        previousPosition: { x: THAIS_TEMPLE_POSITION.x, y: THAIS_TEMPLE_POSITION.y, z: THAIS_TEMPLE_POSITION.z },
        direction: 'south',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 200,
        nextMoveAt: 0,
        nextSpellAt: 0,
        spellCooldowns: {},
        groupCooldowns: {},
        hasteUntil: 0,
        magicShieldUntil: 0,
        bloodRageUntil: 0,
        lastHitTakenAt: -99_999,
        nextManaRegenAt: next.encounter.elapsedMs + voc.manaGainTicks * 2000,
        nextHealthRegenAt: next.encounter.elapsedMs + voc.healthGainTicks * 2000,
        pendingAttack: null,
      };
      next.encounter.partyActors.push(actor);
    } else {
      actor.hp = character.currentHp;
      actor.mana = character.currentMana;
    }
  }

  regenerateParty(next, content);
  castAutomaticSpells(next, content, false);

  for (const actor of next.encounter.partyActors) {
    const character = next.session.characters.find((c) => c.id === actor.characterId);
    if (character) {
      character.currentHp = actor.hp;
      character.currentMana = actor.mana;
    }
  }

  return next;
}




