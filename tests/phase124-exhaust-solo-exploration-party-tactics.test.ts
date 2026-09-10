import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import {
  createCharacter,
  createIdleGame,
  advanceCombat,
  restartHunt,
  startGame,
  findHotbarAction,
  triggerManualHotbarAction,
  findPartyKnightActor,
  attackRange,
  minTacticalRange,
  resolveNextHuntObjective,
  type GameState,
  type CharacterState,
  type PartyActorState,
} from '../packages/domain/src';

describe('Phase 124 - Canonical Exhaust, Smart Solo Hunting AI & Advanced Party Tactics', () => {
  describe('1. Sistema de Exhaust Canônico (Mutual Delay Magia/Poção)', () => {
    it('applies 1000ms cross-exhaust to spell groups when a potion is consumed', () => {
      let state = createIdleGame('test-exhaust-potion', content, 'rat-cellars');
      state = restartHunt(state, 'test-exhaust-potion', content, 'rat-cellars');
      const character = state.session.characters[0];
      character.level = 50;
      character.hotbar = [7618]; // Health Potion
      const actor = state.encounter.partyActors[0];
      actor.hp = 50;
      actor.lastHitTakenAt = state.encounter.elapsedMs;

      // Use potion manually via hotbar action (id: 7618)
      const used = triggerManualHotbarAction(state, character.id, 7618, content);
      expect(used).toBe(true);

      // Potion group cooldown should be set
      expect(actor.groupCooldowns['potion']).toBeGreaterThanOrEqual(state.encounter.elapsedMs + 1000);
      // Cross-cooldown on spell groups (healing, attack, support) must be at least 1000ms
      expect(actor.groupCooldowns['healing']).toBeGreaterThanOrEqual(state.encounter.elapsedMs + 1000);
      expect(actor.groupCooldowns['attack']).toBeGreaterThanOrEqual(state.encounter.elapsedMs + 1000);
      expect(actor.groupCooldowns['support']).toBeGreaterThanOrEqual(state.encounter.elapsedMs + 1000);
    });

    it('rejects casting a spell while under potion exhaust', () => {
      let state = createIdleGame('test-exhaust-spell-reject', content, 'rat-cellars');
      state = restartHunt(state, 'test-exhaust-spell-reject', content, 'rat-cellars');
      const character = state.session.characters[0];
      character.level = 50;
      character.vocation = 'Druid';
      character.spells = [1]; // Light Healing (exura)
      const actor = state.encounter.partyActors[0];
      actor.hp = 80;
      actor.mana = 100;

      // Simulate character just drank a potion
      actor.groupCooldowns['potion'] = state.encounter.elapsedMs + 900;
      actor.groupCooldowns['healing'] = state.encounter.elapsedMs + 900;

      // Attempt to cast exura (id: 1)
      const castResult = triggerManualHotbarAction(state, character.id, 1, content);
      // Spell must be rejected due to exhaust
      expect(castResult).toBe(false);
    });

    it('applies 1000ms cross-exhaust to potions when a spell is cast', () => {
      let state = createIdleGame('test-exhaust-spell-sets-potion', content, 'rat-cellars');
      state = restartHunt(state, 'test-exhaust-spell-sets-potion', content, 'rat-cellars');
      const character = state.session.characters[0];
      character.level = 50;
      character.vocation = 'Druid';
      character.spells = [1]; // Light Healing (exura)
      const actor = state.encounter.partyActors[0];
      actor.hp = 80;
      actor.mana = 100;

      const castResult = triggerManualHotbarAction(state, character.id, 1, content);
      expect(castResult).toBe(true);

      // Potion group must be put on at least 1000ms exhaust
      expect(actor.groupCooldowns['potion']).toBeGreaterThanOrEqual(state.encounter.elapsedMs + 1000);

      // Attempting to drink potion immediately must be rejected
      const potionResult = triggerManualHotbarAction(state, character.id, 7618, content);
      expect(potionResult).toBe(false);
    });

    it('prevents casting spell and drinking potion in the exact same tick in auto combat', () => {
      let state = createIdleGame('test-no-dual-cast-tick', content, 'rat-cellars');
      state = restartHunt(state, 'test-no-dual-cast-tick', content, 'rat-cellars');
      const character = state.session.characters[0];
      character.level = 50;
      character.vocation = 'Druid';
      character.hotbar = [7618, 1]; // Potion + Exura
      character.spells = [1];
      const actor = state.encounter.partyActors[0];
      actor.hp = 30; // Very low, triggers both potion and heal
      actor.mana = 100;
      actor.lastHitTakenAt = state.encounter.elapsedMs;

      // Advance one tick
      state = advanceCombat(state, content, 120);

      // Check events in this tick: should not contain both spell-cast for potion (7618) and spell (1)
      const potionCasts = state.encounter.events.filter((e) => e.type === 'spell-cast' && e.spellId === 7618);
      const healCasts = state.encounter.events.filter((e) => e.type === 'spell-cast' && e.spellId === 1);

      // Mutually exclusive: either potion was used OR exura, not both in the same tick!
      expect(potionCasts.length + healCasts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('2. IA de Caçada Solo Inteligente (Dynamic Seeking)', () => {
    it('directs solo player dynamically toward distant living enemies when current zone/room is empty', () => {
      let state = createIdleGame('test-solo-dynamic', content, 'rat-cellars');
      state = restartHunt(state, 'test-solo-dynamic', content, 'rat-cellars');
      const encounter = state.encounter;

      // Ensure solo
      expect(encounter.partyActors.length).toBe(1);
      const soloActor = encounter.partyActors[0];

      // Mark all enemies in current zone as dead
      for (const enemy of encounter.enemies) {
        enemy.alive = false;
      }

      // Spawn a living enemy far away in another part of the dungeon
      const farEnemy = {
        ...encounter.enemies[0],
        id: 'far-living-rat',
        name: 'Cave Rat',
        alive: true,
        hp: 50,
        position: { x: soloActor.position.x + 12, y: soloActor.position.y + 10, z: soloActor.position.z },
      };
      encounter.enemies.push(farEnemy);

      const objective = resolveNextHuntObjective(state);
      expect(objective).toBeDefined();
      expect(objective?.kind).toBe('combat');
      // Objective target should be at or near the far living enemy's position, not an empty waypoint
      expect(objective?.enemyIds).toContain('far-living-rat');
      expect(objective?.target.x).toBe(farEnemy.position.x);
      expect(objective?.target.y).toBe(farEnemy.position.y);
    });
  });

  describe('3. IA Tática Avançada de Party', () => {
    function createFourVocationPartyState(): GameState {
      let state = createIdleGame('test-party-tactics', content, 'rat-cellars');
      state = restartHunt(state, 'test-party-tactics', content, 'rat-cellars');

      // Create 4 vocations: Knight, Druid, Sorcerer, Paladin
      const knight = createCharacter('c-knight', 'Valiant Knight', 'Knight', content);
      const druid = createCharacter('c-druid', 'Elder Druid', 'Druid', content);
      const sorcerer = createCharacter('c-sorcerer', 'Master Sorcerer', 'Sorcerer', content);
      const paladin = createCharacter('c-paladin', 'Royal Paladin', 'Paladin', content);

      knight.level = 80; druid.level = 80; sorcerer.level = 80; paladin.level = 80;
      knight.maxHp = 1500; knight.currentHp = 1500; knight.maxMana = 500; knight.currentMana = 500;
      druid.maxHp = 800; druid.currentHp = 800; druid.maxMana = 2000; druid.currentMana = 2000;
      sorcerer.maxHp = 800; sorcerer.currentHp = 800; sorcerer.maxMana = 2000; sorcerer.currentMana = 2000;
      paladin.maxHp = 1100; paladin.currentHp = 1100; paladin.maxMana = 1000; paladin.currentMana = 1000;
      druid.spells = [84, 1]; // Exura Sio (84), Exura (1)
      druid.hotbar = [84, 1];
      sorcerer.spells = [2]; // Exori Mort / strike
      sorcerer.hotbar = [2];
      paladin.spells = [3]; // Exori Con
      paladin.hotbar = [3];
      knight.spells = [93]; // Challenge
      knight.hotbar = [93];

      state.session.characters = [knight, druid, sorcerer, paladin];
      state.session.leaderId = knight.id;
      state.session.selectedCharacterId = knight.id;

      // Pick valid walkable tiles from the room map
      const walkableTiles = state.encounter.room.map.tiles.filter((t) => t.walkable);
      const kPos = walkableTiles[10]?.position ?? { x: 32360, y: 32235, z: 8 };
      const dPos = walkableTiles[11]?.position ?? { x: kPos.x - 1, y: kPos.y, z: kPos.z };
      const sPos = walkableTiles[12]?.position ?? { x: kPos.x - 2, y: kPos.y, z: kPos.z };
      const pPos = walkableTiles[13]?.position ?? { x: kPos.x - 3, y: kPos.y, z: kPos.z };

      state.encounter.partyActors = [
        {
          characterId: knight.id,
          position: { ...kPos },
          previousPosition: { ...kPos },
          direction: 'south',
          speed: 250,
          hp: knight.maxHp,
          mana: knight.maxMana,
          alive: true,
          path: [],
          targetId: null,
          nextMoveAt: 0,
          nextAttackAt: 0,
          nextSpellAt: 0,
          attackIntervalMs: 2000,
          spellCooldowns: {},
          groupCooldowns: {},
          hasteUntil: 0,
          magicShieldUntil: 0,
          bloodRageUntil: 0,
          lastHitTakenAt: 0,
          nextManaRegenAt: 0,
          nextHealthRegenAt: 0,
          pendingAttack: null,
        },
        {
          characterId: druid.id,
          position: { ...dPos },
          previousPosition: { ...dPos },
          direction: 'east',
          speed: 250,
          hp: druid.maxHp,
          mana: druid.maxMana,
          alive: true,
          path: [],
          targetId: null,
          nextMoveAt: 0,
          nextAttackAt: 0,
          nextSpellAt: 0,
          attackIntervalMs: 2000,
          spellCooldowns: {},
          groupCooldowns: {},
          hasteUntil: 0,
          magicShieldUntil: 0,
          bloodRageUntil: 0,
          lastHitTakenAt: 0,
          nextManaRegenAt: 0,
          nextHealthRegenAt: 0,
          pendingAttack: null,
        },
        {
          characterId: sorcerer.id,
          position: { ...sPos },
          previousPosition: { ...sPos },
          direction: 'east',
          speed: 250,
          hp: sorcerer.maxHp,
          mana: sorcerer.maxMana,
          alive: true,
          path: [],
          targetId: null,
          nextMoveAt: 0,
          nextAttackAt: 0,
          nextSpellAt: 0,
          attackIntervalMs: 2000,
          spellCooldowns: {},
          groupCooldowns: {},
          hasteUntil: 0,
          magicShieldUntil: 0,
          bloodRageUntil: 0,
          lastHitTakenAt: 0,
          nextManaRegenAt: 0,
          nextHealthRegenAt: 0,
          pendingAttack: null,
        },
        {
          characterId: paladin.id,
          position: { ...pPos },
          previousPosition: { ...pPos },
          direction: 'east',
          speed: 250,
          hp: paladin.maxHp,
          mana: paladin.maxMana,
          alive: true,
          path: [],
          targetId: null,
          nextMoveAt: 0,
          nextAttackAt: 0,
          nextSpellAt: 0,
          attackIntervalMs: 2000,
          spellCooldowns: {},
          groupCooldowns: {},
          hasteUntil: 0,
          magicShieldUntil: 0,
          bloodRageUntil: 0,
          lastHitTakenAt: 0,
          nextManaRegenAt: 0,
          nextHealthRegenAt: 0,
          pendingAttack: null,
        },
      ];

      return state;
    }

    it('identifies party Knight correctly and assigns tactical ranges (Knight 1, Ranged 3-4)', () => {
      const state = createFourVocationPartyState();
      const knightActor = findPartyKnightActor(state);
      expect(knightActor).toBeDefined();
      expect(knightActor?.characterId).toBe('c-knight');

      // Tactical minimum ranges
      expect(minTacticalRange('c-knight', state)).toBe(1);
      expect(minTacticalRange('c-druid', state)).toBe(3);
      expect(minTacticalRange('c-sorcerer', state)).toBe(3);
      expect(minTacticalRange('c-paladin', state)).toBe(3);

      // Desired attack ranges
      expect(attackRange('c-knight', state, content)).toBe(1);
      expect(attackRange('c-druid', state, content)).toBe(4);
      expect(attackRange('c-sorcerer', state, content)).toBe(4);
      expect(attackRange('c-paladin', state, content)).toBe(4);
    });

    it('Knight casts Challenge (exeta res) when an ally is targeted by an enemy', () => {
      let state = createFourVocationPartyState();
      const encounter = state.encounter;
      const druidActor = encounter.partyActors.find((a) => a.characterId === 'c-druid')!;
      const knightActor = encounter.partyActors.find((a) => a.characterId === 'c-knight')!;
      const walkableTiles = encounter.room.map.tiles.filter((t) => t.walkable);
      const enemyPos = walkableTiles[14]?.position ?? { x: knightActor.position.x + 1, y: knightActor.position.y, z: knightActor.position.z };

      // Position enemy near Knight and Druid, targeting the Druid
      const enemy = {
        ...encounter.enemies[0],
        id: 'threatening-orc',
        name: 'Orc Berserker',
        alive: true,
        hp: 300,
        position: { ...enemyPos },
        targetId: druidActor.characterId, // Targeting Druid!
      };
      encounter.enemies = [enemy];
      if (encounter.continuousProgress) {
        encounter.continuousProgress.zones[encounter.continuousProgress.currentZoneIndex].activeEnemyIds = [enemy.id];
      }

      // Advance combat
      state = advanceCombat(state, content, 120);

      // Knight should have cast Exeta res
      const challengeEvents = state.encounter.events.filter(
        (e) => e.type === 'spell-cast' && e.speech === 'Exeta res' && e.sourceId === knightActor.characterId
      );
      expect(challengeEvents.length).toBeGreaterThan(0);

      // Enemy target must now be forced to the Knight
      const updatedEnemy = state.encounter.enemies.find((e) => e.id === enemy.id);
      expect(updatedEnemy?.challengedTargetId).toBe(knightActor.characterId);
      expect(updatedEnemy?.challengedUntil).toBeGreaterThan(state.encounter.elapsedMs);
      expect(updatedEnemy?.targetId).toBe(knightActor.characterId);
    });

    it('Druid prioritizes healing Knight (exura sio) when Knight HP is below 85%', () => {
      const state0 = createFourVocationPartyState();
      const encounter0 = state0.encounter;
      const knightActor0 = encounter0.partyActors.find((a) => a.characterId === 'c-knight')!;
      const knightChar0 = state0.session.characters.find((c) => c.id === 'c-knight')!;
      const druidActor0 = encounter0.partyActors.find((a) => a.characterId === 'c-druid')!;
      const walkableTiles = encounter0.room.map.tiles.filter((t) => t.walkable);
      const enemyPos = walkableTiles[14]?.position ?? { x: knightActor0.position.x + 1, y: knightActor0.position.y, z: knightActor0.position.z };

      // Knight is at 60% HP (< 85%)
      knightActor0.hp = Math.floor(knightChar0.maxHp * 0.60);
      const enemy = {
        ...encounter0.enemies[0],
        id: 'target-enemy',
        alive: true,
        hp: 500,
        position: { ...enemyPos },
      };
      encounter0.enemies = [enemy];
      knightActor0.targetId = enemy.id;
      if (encounter0.continuousProgress) {
        encounter0.continuousProgress.zones[encounter0.continuousProgress.currentZoneIndex].activeEnemyIds = [enemy.id];
      }

      const nextState = advanceCombat(state0, content, 120);

      // Druid should have cast Exura Sio on the Knight
      const sioHeals = nextState.encounter.events.filter(
        (e) => e.type === 'spell-cast' && e.sourceId === druidActor0.characterId && e.targetId === knightActor0.characterId && e.healing
      );
      expect(sioHeals.length).toBeGreaterThan(0);
    });

    it('synchronizes target: all secondary party members attack the Knight target', () => {
      let state = createFourVocationPartyState();
      const knightActor = state.encounter.partyActors.find((a) => a.characterId === 'c-knight')!;
      const walkableTiles = state.encounter.room.map.tiles.filter((t) => t.walkable);

      // Sort walkable tiles by distance from knightActor so enemy1 is definitely closest
      const sortedByDist = [...walkableTiles].sort(
        (a, b) => Math.hypot(a.position.x - knightActor.position.x, a.position.y - knightActor.position.y) -
                  Math.hypot(b.position.x - knightActor.position.x, b.position.y - knightActor.position.y)
      );

      const enemy1Pos = sortedByDist[1]?.position ?? { x: knightActor.position.x + 1, y: knightActor.position.y, z: knightActor.position.z };
      const enemy2Pos = sortedByDist[sortedByDist.length - 1]?.position ?? { x: knightActor.position.x + 10, y: knightActor.position.y + 10, z: knightActor.position.z };

      // Two enemies exist
      const enemy1 = {
        ...state.encounter.enemies[0],
        id: 'enemy-focus',
        name: 'Dragon',
        alive: true,
        hp: 1000,
        position: { ...enemy1Pos },
      };
      const enemy2 = {
        ...state.encounter.enemies[0],
        id: 'enemy-other',
        name: 'Dragon Hatchling',
        alive: true,
        hp: 300,
        position: { ...enemy2Pos },
      };
      state.encounter.enemies = [enemy1, enemy2];
      if (state.encounter.continuousProgress) {
        state.encounter.continuousProgress.zones[state.encounter.continuousProgress.currentZoneIndex].activeEnemyIds = [enemy1.id, enemy2.id];
      }

      // Knight targets enemy1 (closest)
      knightActor.targetId = enemy1.id;

      state = advanceCombat(state, content, 120);

      // Secondary members should synchronize target to enemy1
      const updatedSorcerer = state.encounter.partyActors.find((a) => a.characterId === 'c-sorcerer');
      const updatedPaladin = state.encounter.partyActors.find((a) => a.characterId === 'c-paladin');
      expect(updatedSorcerer?.targetId).toBe(enemy1.id);
      expect(updatedPaladin?.targetId).toBe(enemy1.id);
    });
  });
});
