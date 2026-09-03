import { deriveStats, getEquippedItems } from './derivedStats';
import { adaptWaveHuntToExpedition } from './expedition';
import { experienceForLevel } from './experience';
import { huntById } from './hunt';
import { createContinuousHuntRoute } from './huntRoute';
import { createCharacter, leaderOf, sharedExperiencePerCharacter, vocationFor } from './party';
import { createSeededRng, rollInteger } from './rng';
import { spellFormulaRange } from './spells';
import { findHotbarAction, isHotbarActionUnlocked } from './hotbarActions';
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
  return {
    characterId: character.id, hp: character.currentHp, mana: character.currentMana, alive: character.currentHp > 0,
    position: clonePosition(spawn), previousPosition: clonePosition(spawn), direction: 'east', path: [], targetId: null,
    nextAttackAt: 0, attackIntervalMs: vocation.attackSpeedMs, speed: vocation.baseSpeed, nextMoveAt: 0, nextSpellAt: 0,
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
  for (let roll = 0; roll < Math.max(1, Math.floor(multiplier)); roll += 1) for (const loot of monster.loot) {
    if (rollInteger(rng, 0, 99_999) >= loot.chance) continue;
    const amount = rollInteger(rng, 1, Math.max(1, loot.maxCount));
    if (loot.itemId === 2148) state.session.gold += amount;
    else if (loot.itemId === undefined || (state.session.itemLootPreferences[String(loot.itemId)]?.autoLoot ?? true)) addLoot(state.session.loot, { itemId: loot.itemId, name: loot.name, amount });
    state.encounter.events.push({ type: 'loot', itemName: loot.name, amount });
    addLog(state, `Loot: ${amount}x ${loot.name}.`);
  }
  state.encounter.rngState = rng.state;
}

function defeatEnemy(state: GameState, target: EnemyState, content: GameContent): void {
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
  grantSharedExperience(state, Math.ceil(monster.experience * (target.variant?.xpMultiplier ?? 1)), content);
  rollLoot(state, monster.id, content, target.variant?.lootMultiplier ?? 1);
  if (encounter.expeditionProgress) encounter.expeditionProgress.kills += 1;
  if (encounter.continuousProgress) {
    encounter.continuousProgress.kills += 1;
    if (target.variant?.visualModifier === 'rare-aura') encounter.continuousProgress.rareKills += 1;
  }
  synchronizeEncounterOccupancy(encounter);
}

function attackRange(characterId: string, state: GameState, content: GameContent): number {
  const character = state.session.characters.find((candidate) => candidate.id === characterId);
  if (!character) return 1;
  if (typeof character.targetDistance === 'number' && character.targetDistance >= 1) {
    return character.targetDistance;
  }
  const weapon = getEquippedItems(character, content.equipment).find((item) => item.weaponType === 'distance');
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

function castAutomaticSpells(state: GameState, content: GameContent): void {
  const encounter = state.encounter;
  for (const actor of encounter.partyActors.filter((candidate) => candidate.alive)) {
    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
    const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
    const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));

    let usedPotionThisTick = false;
    let usedSpellThisTick = false;
    let usedRuneThisTick = false;

    for (const actionId of character.hotbar) {
      if (typeof actionId !== 'number' || actionId === 0) continue;
      const action = findHotbarAction(actionId, content);
      if (!action || !isHotbarActionUnlocked(character, action)) continue;

      // 1. POTIONS AUTO-TRIGGER
      if (action.kind === 'potion' && !usedPotionThisTick) {
        const potion = action.potion;
        if ((actor.groupCooldowns['potion'] ?? 0) <= encounter.elapsedMs) {
          const tookRecentHit = (encounter.elapsedMs - actor.lastHitTakenAt) < 3000 && actor.hp < character.maxHp;
          const needsHp = typeof potion.healMin === 'number' && (actor.hp / character.maxHp < 0.88 || tookRecentHit);
          const needsMana = typeof potion.manaMin === 'number' && character.maxMana > 0 && actor.mana / character.maxMana < 0.70;

          if (needsHp || needsMana) {
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
      if (action.kind === 'rune' && !usedRuneThisTick) {
        const rune = action.rune;
        if ((actor.groupCooldowns['rune'] ?? 0) <= encounter.elapsedMs) {
          const inRange = encounter.enemies
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

            for (const target of targets) {
              const damage = resistedDamage(rawDamage, target, rune.combatType, content);
              target.hp = Math.max(0, target.hp - damage);
              encounter.events.push({ type: 'spell-cast', sourceId: actor.characterId, targetId: target.id, spellId: rune.id, amount: damage, healing: false, speech: rune.name });
              encounter.events.push({ type: 'spell-visual', sourceId: actor.characterId, targetId: target.id, spellId: rune.id, effectId: rune.effectId, projectileId: rune.projectileId });
              addLog(state, `${character.name} usou ${rune.name} em ${target.name} por ${damage}.`);
              if (target.hp <= 0 && target.alive) defeatEnemy(state, target, content);
            }

            syncCharacterResources(state, actor);
            usedRuneThisTick = true;
          }
        }
      }

      // 3. SPELLS AUTO-TRIGGER
      if (action.kind === 'spell' && !usedSpellThisTick) {
        const spell = action.spell;
        if (actor.mana >= spell.mana && (actor.spellCooldowns[String(spell.spellId)] ?? 0) <= encounter.elapsedMs && (actor.groupCooldowns[spell.group] ?? 0) <= encounter.elapsedMs) {
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
            const range = spell.area === 'wave-4' ? 4 : Math.max(1, spell.range);
            const inRange = encounter.enemies.filter((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= range)
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
          actor.spellCooldowns[String(spell.spellId)] = encounter.elapsedMs + spell.cooldownMs;
          actor.groupCooldowns[spell.group] = encounter.elapsedMs + spell.groupCooldownMs;

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
    if ((actor.groupCooldowns['rune'] ?? 0) > encounter.elapsedMs) return false;
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

  const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
  const weapon = getEquippedItems(character, content.equipment).find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));
  const rng = createSeededRng(encounter.rngState);
  const formulaRange = spellFormulaRange(spell, character, stats.activeSkillLevel, weapon?.attack ?? stats.attack);
  const amount = rollInteger(rng, Math.floor(formulaRange.min), Math.max(Math.floor(formulaRange.min), Math.ceil(formulaRange.max)));
  encounter.rngState = rng.state;
  actor.mana -= spell.mana;
  actor.spellCooldowns[String(spell.spellId)] = encounter.elapsedMs + spell.cooldownMs;
  actor.groupCooldowns[spell.group] = encounter.elapsedMs + spell.groupCooldownMs;

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
        if (pending.ranged) encounter.visualEvents.push({ type: 'projectile-hit', sourceId: actor.characterId, targetId: target.id, effectId: 10 });
        else encounter.visualEvents.push({ type: 'melee-hit', sourceId: actor.characterId, targetId: target.id, effectId: 10, blocked: damage <= 0 });
        const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
        addLog(state, `${character.name} atingiu ${target.name} por ${damage} com ${pending.weaponName}.`);
        if (target.hp <= 0) defeatEnemy(state, target, content);
      }
    }
    if (actor.pendingAttack) continue;
    if (encounter.elapsedMs < actor.nextAttackAt) continue;
    const character = state.session.characters.find((candidate) => candidate.id === actor.characterId)!;
    const stats = deriveStats(character, content.equipment, vocationFor(content, character.vocation));
    if (stats.attack <= 0) continue;
    const stance = character.stance ?? actor.stance ?? 'offensive';
    const stanceMultiplier = stance === 'offensive' ? 1.0 : stance === 'balanced' ? 0.75 : 0.5;
    const effectiveAttack = Math.max(1, Math.round(stats.attack * stanceMultiplier));
    const range = attackRange(character.id, state, content);
    const lockedTarget = encounter.enemies.find((enemy) => enemy.id === actor.targetId && enemy.alive);
    let target = lockedTarget && meleeDistance(actor.position, lockedTarget.position) <= range ? lockedTarget : undefined;
    if (!target && !lockedTarget) {
      target = encounter.enemies.find((enemy) => enemy.alive && meleeDistance(actor.position, enemy.position) <= range);
      if (target) actor.targetId = target.id;
    }
    if (!target) continue;
    const ranged = range > 1;
    actor.pendingAttack = { targetId: target.id, impactAt: encounter.elapsedMs + 180, attack: effectiveAttack, weaponName: stats.weaponName, activeSkill: stats.activeSkill, activeSkillLevel: stats.activeSkillLevel, ranged };
    encounter.visualEvents.push({ type: 'basic-attack-started', sourceId: character.id, targetId: target.id, ranged });
    if (ranged) encounter.visualEvents.push({ type: 'projectile-launched', sourceId: character.id, targetId: target.id, projectileId: 28 });
    actor.nextAttackAt = encounter.elapsedMs + actor.attackIntervalMs;
  }
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
    const damage = Math.max(0, raw - defense - armor);
    enemy.nextAttackAt = encounter.elapsedMs + enemy.attackIntervalMs;
    if (damage > 0) {
      target.lastHitTakenAt = encounter.elapsedMs;
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
  movePartyTowardTargets(encounter, ranges); moveEnemiesTowardParty(encounter); recordMovementEvents(encounter);
  castAutomaticSpells(state, content); playerAttacks(state, content); enemyAttacks(state, content); unlockExit(state);
}

function advanceExpedition(state: GameState, content: GameContent): void {
  const encounter = state.encounter; const expedition = encounter.expedition; const progress = encounter.expeditionProgress;
  if (!expedition || !progress) return;
  encounter.room.reservations = new Map();
  const current = expedition.encounters[progress.activeEncounterIndex];
  if (encounter.enemies.some((enemy) => enemy.alive)) {
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    movePartyTowardTargets(encounter, ranges); moveEnemiesTowardParty(encounter); recordMovementEvents(encounter);
    castAutomaticSpells(state, content); playerAttacks(state, content); enemyAttacks(state, content);
    return;
  }
  if (current && !progress.activeEncounterSpawned) {
    const reached = movePartyTowardPoint(encounter, current.anchor); recordMovementEvents(encounter);
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
  const reachedExit = movePartyTowardPoint(encounter, expedition.exitPoint); recordMovementEvents(encounter);
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
    movePartyTowardTargets(encounter, ranges, new Set(objective.enemyIds));
    const leader = encounter.partyActors.find((actor) => actor.characterId === state.session.leaderId && actor.alive) ?? encounter.partyActors.find((actor) => actor.alive);
    if (leader && leader.path.length === 0 && !encounter.enemies.some((e) => e.alive && meleeDistance(leader.position, e.position) <= (ranges.get(leader.characterId) ?? 1))) {
      movePartyTowardPoint(encounter, objective.target);
    }
    moveEnemiesTowardParty(encounter); recordMovementEvents(encounter);
    castAutomaticSpells(state, content); playerAttacks(state, content); enemyAttacks(state, content);
    recordContinuousActivityOrThrow(state, objective);
    return;
  }

  const visibleEnemies = encounter.enemies.filter((enemy) => enemy.alive && encounter.partyActors.some((actor) => actor.alive && (actor.targetId === enemy.id || meleeDistance(actor.position, enemy.position) <= 7)));
  if (visibleEnemies.length > 0) {
    const ranges = new Map(encounter.partyActors.map((actor) => [actor.characterId, attackRange(actor.characterId, state, content)]));
    movePartyTowardTargets(encounter, ranges, new Set(visibleEnemies.map((e) => e.id)));
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
  const reached = movePartyTowardPoint(encounter, objective.target);
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

export function leaveHunt(state: GameState): GameState {
  const next = cloneState(state);
  for (const actor of next.encounter.partyActors) syncCharacterResources(next, actor);
  next.encounter.status = 'completed'; next.encounter.events.push({ type: 'hunt-complete' });
  addLog(next, `${next.encounter.hunt.name}: sessão encerrada pelo jogador.`); return next;
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


