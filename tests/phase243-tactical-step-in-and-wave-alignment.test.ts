import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import {
  createCharacter,
  createIdleGame,
  advanceCombat,
  restartHunt,
  findPartyKnightActor,
  attackRange,
  minTacticalRange,
  getReadyStrikeSpell,
  getReadyWaveSpell,
  computeCardinalFocalPoints,
  findCardinalApproachTiles,
  isDirectionalSpell,
  synchronizeEncounterOccupancy,
  type GameState,
  type CharacterState,
  type PartyActorState,
  type EnemyState,
} from '../packages/domain/src';
import type { SpellDefinition } from '../packages/content-schema/src';
import { meleeDistance } from '../packages/domain/src/spatial/pathfinding';

describe('Phase 243 - Tactical AI: Step-In & Cast for Short-Range Spells and Cardinal Wave Alignment', () => {
  // Ensure we have strike and wave spells in content for deterministic testing
  const flameStrikeSpell: SpellDefinition = {
    spellId: 2001,
    name: 'Flame Strike',
    words: 'exori flam',
    vocations: ['Sorcerer', 'Master Sorcerer', 'Druid', 'Elder Druid'],
    requiredLevel: 1,
    mana: 20,
    cooldownMs: 2000,
    groupCooldownMs: 2000,
    group: 'attack',
    range: 3,
    combatType: 'fire',
    formula: { kind: 'level-magic', min: { level: 1, constant: 15 }, max: { level: 1, constant: 30 } },
    area: 'target',
    aggressive: true,
    runeId: null,
    visual: { effectId: 4, projectileId: null, effectConstant: null, projectileConstant: null },
    sourceFiles: ['data/spells/spells.xml', 'data/spells/scripts/attack/flame_strike.lua'],
    importWarnings: [],
  };

  const fireWaveSpell: SpellDefinition = {
    spellId: 2002,
    name: 'Fire Wave',
    words: 'exevo flam hur',
    vocations: ['Sorcerer', 'Master Sorcerer'],
    requiredLevel: 1,
    mana: 25,
    cooldownMs: 4000,
    groupCooldownMs: 2000,
    group: 'attack',
    range: 4,
    combatType: 'fire',
    formula: { kind: 'level-magic', min: { level: 1, constant: 25 }, max: { level: 1, constant: 50 } },
    area: 'wave-4',
    aggressive: true,
    runeId: null,
    visual: { effectId: 4, projectileId: null, effectConstant: null, projectileConstant: null },
    sourceFiles: ['data/spells/spells.xml', 'data/spells/scripts/attack/fire_wave.lua'],
    importWarnings: [],
  };

  const testContent = {
    ...content,
    spells: [
      ...content.spells.filter((s) => s.spellId !== 2001 && s.spellId !== 2002),
      flameStrikeSpell,
      fireWaveSpell,
    ],
  };

  describe('1. Step-In & Cast (Avanço Tático para Magias de Curto Alcance)', () => {
    it('returns attackRange = 3 when a ranged character has Exori Flam ready, and returns 4 when on cooldown', () => {
      let state = createIdleGame('test-step-in', testContent, 'rat-cellars');
      state = restartHunt(state, 'test-step-in', testContent, 'rat-cellars');

      const sorcerer = state.session.characters[0];
      sorcerer.baseVocation = 'Sorcerer';
      sorcerer.vocation = 'Sorcerer';
      sorcerer.targetDistance = 4;
      sorcerer.level = 30;
      sorcerer.spells = [flameStrikeSpell.spellId];
      sorcerer.hotbar = [flameStrikeSpell.spellId];

      const actor = state.encounter.partyActors[0];
      actor.mana = 200;
      actor.spellCooldowns = {};
      actor.groupCooldowns = {};

      // 1. With spell ready and off cooldown, attackRange is dynamically 3!
      const readySpell = getReadyStrikeSpell(sorcerer, actor, state.encounter.elapsedMs, testContent, state);
      expect(readySpell).toBeDefined();
      expect(readySpell?.name).toBe('Flame Strike');
      expect(attackRange(sorcerer.id, state, testContent)).toBe(3);
      expect(minTacticalRange(sorcerer.id, state, testContent)).toBe(3);

      // 2. Put spell on cooldown
      actor.spellCooldowns[String(flameStrikeSpell.spellId)] = state.encounter.elapsedMs + 2000;
      expect(getReadyStrikeSpell(sorcerer, actor, state.encounter.elapsedMs, testContent, state)).toBeUndefined();
      // Attack range returns to 4 (standard weapon/wand range)
      expect(attackRange(sorcerer.id, state, testContent)).toBe(4);
      expect(minTacticalRange(sorcerer.id, state, testContent)).toBe(3);

      // 3. When cooldown expires, attackRange returns to 3
      state.encounter.elapsedMs += 2500;
      expect(getReadyStrikeSpell(sorcerer, actor, state.encounter.elapsedMs, testContent, state)).toBeDefined();
      expect(attackRange(sorcerer.id, state, testContent)).toBe(3);
    });

    it('sorcerer steps forward from distance 4 into distance 3 to cast Exori Flam, then stays at safe range', () => {
      let state = createIdleGame('test-step-in-cast', testContent, 'rat-cellars');
      state = restartHunt(state, 'test-step-in-cast', testContent, 'rat-cellars');

      const sorcerer = state.session.characters[0];
      sorcerer.baseVocation = 'Sorcerer';
      sorcerer.vocation = 'Sorcerer';
      sorcerer.targetDistance = 4;
      sorcerer.level = 30;
      sorcerer.spells = [flameStrikeSpell.spellId];
      sorcerer.hotbar = [flameStrikeSpell.spellId];

      const actor = state.encounter.partyActors[0];
      actor.targetDistance = 4;
      actor.mana = 200;
      actor.spellCooldowns = {};
      actor.groupCooldowns = {};
      actor.nextMoveAt = 0;
      actor.nextAttackAt = 2000;
      actor.nextSpellAt = 0;

      const map = state.encounter.room.map;
      const walkable = map.tiles.filter((t) => t.walkable);
      const startTile = walkable.find((t) => {
        return [1, 2, 3, 4].every((dx) => {
          const neighbor = map.tiles.find((tile) => tile.position.x === t.position.x + dx && tile.position.y === t.position.y);
          return neighbor && neighbor.walkable;
        });
      }) ?? walkable[10];

      // Ensure straight corridor of 5 tiles is walkable
      for (let dx = 0; dx <= 4; dx++) {
        const t = map.tiles.find((tile) => tile.position.x === startTile.position.x + dx && tile.position.y === startTile.position.y);
        if (t) t.walkable = true;
      }

      actor.position = { ...startTile.position };
      actor.previousPosition = { ...startTile.position };

      const enemy = state.encounter.enemies[0];
      enemy.alive = true;
      enemy.hp = 200;
      enemy.maxHp = 200;
      enemy.position = { x: startTile.position.x + 4, y: startTile.position.y, z: startTile.position.z };
      enemy.previousPosition = { ...enemy.position };
      enemy.nextMoveAt = Number.POSITIVE_INFINITY;
      actor.targetId = enemy.id;

      // Other enemies dead
      for (const e of state.encounter.enemies.slice(1)) e.alive = false;

      state.encounter.pullSize = 'cauteloso';
      if (state.encounter.continuousProgress) {
        state.encounter.continuousProgress.zones[state.encounter.continuousProgress.currentZoneIndex].activeEnemyIds = [enemy.id];
      }
      synchronizeEncounterOccupancy(state.encounter);

      expect(meleeDistance(actor.position, enemy.position)).toBe(4);

      // Advance combat: sorcerer should step forward from distance 4 to distance 3 and cast!
      const initialElapsed = state.encounter.elapsedMs;
      state = advanceCombat(state, testContent, 120);
      const updatedActor = state.encounter.partyActors[0];
      const updatedEnemy = state.encounter.enemies[0];

      // Sorcerer moved closer (distance is now 3)
      const newDist = meleeDistance(updatedActor.position, updatedEnemy.position);
      expect(newDist).toBe(3);

      // Spell was cast! Cooldown was recorded and spell-cast event emitted
      expect(updatedActor.spellCooldowns[String(flameStrikeSpell.spellId)]).toBeGreaterThan(initialElapsed);
      const castEvent = state.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === flameStrikeSpell.spellId);
      expect(castEvent).toBeDefined();

      // Next tick: spell is on cooldown, desired range returns to 4, but since already at 3 (>= minRange 3),
      // sorcerer does not unnecessarily flee and continues shooting wand
      expect(attackRange(sorcerer.id, state, testContent)).toBe(4);
    });
  });

  describe('2. Cardinal Wave Alignment with Knight in the Box (Line-up Tático)', () => {
    it('identifies cardinal focal point on Knight when Knight has adjacent enemies and mage has wave ready', () => {
      let state = createIdleGame('test-wave-focal', testContent, 'rat-cellars');
      state = restartHunt(state, 'test-wave-focal', testContent, 'rat-cellars');

      const knightChar = createCharacter('c-knight', 'Knight', 'Knight', testContent);
      knightChar.baseVocation = 'Knight';
      const sorcererChar = createCharacter('c-sorcerer', 'Sorcerer', 'Sorcerer', testContent);
      sorcererChar.baseVocation = 'Sorcerer';
      sorcererChar.spells = [fireWaveSpell.spellId];
      sorcererChar.hotbar = [fireWaveSpell.spellId];

      state.session.characters = [knightChar, sorcererChar];

      const walkable = state.encounter.room.map.tiles.filter((t) => t.walkable);
      const kTile = walkable[15];
      const sTile = walkable[18];

      const knightActor: PartyActorState = {
        characterId: knightChar.id,
        position: { ...kTile.position },
        previousPosition: { ...kTile.position },
        direction: 'south',
        speed: 250,
        hp: 1000,
        mana: 300,
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
      };

      const sorcererActor: PartyActorState = {
        characterId: sorcererChar.id,
        position: { ...sTile.position },
        previousPosition: { ...sTile.position },
        direction: 'south',
        speed: 250,
        hp: 500,
        mana: 500,
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
      };

      state.encounter.partyActors = [knightActor, sorcererActor];

      // Surround Knight with an enemy (box)
      const enemy = state.encounter.enemies[0];
      enemy.alive = true;
      enemy.position = { x: knightActor.position.x + 1, y: knightActor.position.y, z: knightActor.position.z };

      // Compute cardinal focal points
      const focalPoints = computeCardinalFocalPoints(state, testContent);
      expect(focalPoints.has(sorcererChar.id)).toBe(true);
      const focal = focalPoints.get(sorcererChar.id)!;
      expect(focal.x).toBe(knightActor.position.x);
      expect(focal.y).toBe(knightActor.position.y);

      // Verify cardinal approach tiles generation
      const cardinalTiles = findCardinalApproachTiles(state.encounter.room.map, focal, 4, new Set(), 2);
      expect(cardinalTiles.length).toBeGreaterThan(0);
      // All returned tiles must share x or y with focal
      for (const tile of cardinalTiles) {
        expect(tile.x === focal.x || tile.y === focal.y).toBe(true);
        const dist = meleeDistance(tile, focal);
        expect(dist).toBeGreaterThanOrEqual(2);
        expect(dist).toBeLessThanOrEqual(4);
      }
    });

    it('mage moves onto cardinal line of Knight and fires wave through the Knight box hitting multiple monsters', () => {
      let state = createIdleGame('test-wave-box-sweep', testContent, 'rat-cellars');
      state = restartHunt(state, 'test-wave-box-sweep', testContent, 'rat-cellars');

      const knightChar = createCharacter('c-knight', 'Knight', 'Knight', testContent);
      knightChar.baseVocation = 'Knight';
      const sorcererChar = createCharacter('c-sorcerer', 'Sorcerer', 'Sorcerer', testContent);
      sorcererChar.baseVocation = 'Sorcerer';
      sorcererChar.spells = [fireWaveSpell.spellId];
      sorcererChar.hotbar = [fireWaveSpell.spellId];

      state.session.characters = [knightChar, sorcererChar];

      // Find an open area inside the tile map
      const map = state.encounter.room.map;
      const walkable = map.tiles.filter((t) => t.walkable);
      const centerTile = walkable.find((t) => {
        return [-3, -2, -1, 0, 1, 2, 3].every((dx) =>
          [-3, -2, -1, 0, 1, 2, 3].every((dy) =>
            map.tiles.some((tile) => tile.position.x === t.position.x + dx && tile.position.y === t.position.y + dy)
          )
        );
      }) ?? walkable[20];

      const centerX = centerTile.position.x;
      const centerY = centerTile.position.y;
      const centerZ = centerTile.position.z;

      // Ensure open walkable area around center
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          const t = map.tiles.find((tile) => tile.position.x === centerX + dx && tile.position.y === centerY + dy);
          if (t) t.walkable = true;
        }
      }


      const knightActor: PartyActorState = {
        characterId: knightChar.id,
        position: { x: centerX, y: centerY, z: centerZ },
        previousPosition: { x: centerX, y: centerY, z: centerZ },
        direction: 'south',
        speed: 250,
        hp: 1000,
        mana: 300,
        alive: true,
        path: [],
        targetId: 'rat-box-1',
        nextMoveAt: Number.POSITIVE_INFINITY, // Keep knight stationary holding the box
        nextAttackAt: Number.POSITIVE_INFINITY,
        nextSpellAt: Number.POSITIVE_INFINITY,
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
      };

      // Place Sorcerer slightly off-cardinal (e.g. 3 tiles west, 1 tile north: x: centerX - 3, y: centerY - 1)
      const sorcererActor: PartyActorState = {
        characterId: sorcererChar.id,
        position: { x: centerX - 3, y: centerY - 1, z: centerZ },
        previousPosition: { x: centerX - 3, y: centerY - 1, z: centerZ },
        direction: 'east',
        speed: 300,
        hp: 500,
        mana: 500,
        alive: true,
        path: [],
        targetId: 'rat-box-1',
        nextMoveAt: 0,
        nextAttackAt: 2000,
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
      };

      state.encounter.partyActors = [knightActor, sorcererActor];

      // Setup 3 monsters in Knight's box (e.g. west of knight, center, east of knight)
      const boxMonsters = [
        {
          id: 'rat-box-1',
          monsterId: 'rat',
          name: 'Cave Rat',
          position: { x: centerX - 1, y: centerY, z: centerZ },
          previousPosition: { x: centerX - 1, y: centerY, z: centerZ },
          direction: 'east' as const,
          hp: 150,
          maxHp: 150,
          alive: true,
          nextAttackAt: Number.POSITIVE_INFINITY,
          nextMoveAt: Number.POSITIVE_INFINITY,
          attackIntervalMs: 2000,
          speed: 150,
        },
        {
          id: 'rat-box-2',
          monsterId: 'rat',
          name: 'Cave Rat',
          position: { x: centerX, y: centerY - 1, z: centerZ },
          previousPosition: { x: centerX, y: centerY - 1, z: centerZ },
          direction: 'south' as const,
          hp: 150,
          maxHp: 150,
          alive: true,
          nextAttackAt: Number.POSITIVE_INFINITY,
          nextMoveAt: Number.POSITIVE_INFINITY,
          attackIntervalMs: 2000,
          speed: 150,
        },
        {
          id: 'rat-box-3',
          monsterId: 'rat',
          name: 'Cave Rat',
          position: { x: centerX, y: centerY + 1, z: centerZ },
          previousPosition: { x: centerX, y: centerY + 1, z: centerZ },
          direction: 'north' as const,
          hp: 150,
          maxHp: 150,
          alive: true,
          nextAttackAt: Number.POSITIVE_INFINITY,
          nextMoveAt: Number.POSITIVE_INFINITY,
          attackIntervalMs: 2000,
          speed: 150,
        },
      ];

      state.encounter.enemies = boxMonsters as unknown as EnemyState[];
      state.encounter.pullSize = 'cauteloso';
      state.session.selectedCharacterId = knightChar.id;
      state.session.leaderId = knightChar.id;
      if (state.encounter.continuousProgress) {
        state.encounter.continuousProgress.zones[state.encounter.continuousProgress.currentZoneIndex].activeEnemyIds = boxMonsters.map((m) => m.id);
      }
      synchronizeEncounterOccupancy(state.encounter);

      // Advance combat tick: Sorcerer should step onto cardinal line (y = centerY)
      state = advanceCombat(state, testContent, 120);

      // Verify sorcerer moved onto the cardinal horizontal line of the Knight's box!
      const updatedSorcerer = state.encounter.partyActors.find((a) => a.characterId === sorcererChar.id)!;
      expect(updatedSorcerer.position.y).toBe(centerY);
      expect(updatedSorcerer.position.x).toBe(centerX - 3);

      // Verify Fire Wave was cast in direction 'east', hitting monsters in the box!
      expect(updatedSorcerer.direction).toBe('east');
      const waveCast = state.encounter.events.find((e) => e.type === 'spell-cast' && e.spellId === fireWaveSpell.spellId);
      expect(waveCast).toBeDefined();

      // Verify enemies in the box took damage
      expect(state.encounter.enemies.some((m) => m.hp < m.maxHp)).toBe(true);
    });
  });
});
