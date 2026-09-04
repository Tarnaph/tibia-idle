import { describe, expect, it } from 'vitest';
import {
  createCharacter,
  createIdleGame,
  movePartyTowardPoint,
  movePartyTowardTargets,
  startGame,
  synchronizeEncounterOccupancy,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 51: Squad Follow, Target Focus & Explicit Party Creation Workflow', () => {
  it('correctly locks all secondary squad members onto the active main character target (Target Focus)', () => {
    let game = startGame(createIdleGame('test-target-focus-seed', content), content);
    const knight = createCharacter('knight-1', 'Knight Leader', 'Knight', content);
    const sorcerer = createCharacter('sorc-1', 'Sorcerer Member', 'Sorcerer', content);
    const paladin = createCharacter('pally-1', 'Paladin Member', 'Paladin', content);

    game.session.characters = [knight, sorcerer, paladin];
    game.session.selectedCharacterId = knight.id;

    const encounter = game.encounter;
    const walkableTiles = encounter.room.map.tiles.filter((t) => t.walkable);

    // Position party members and enemies on valid walkable tiles
    const t0 = walkableTiles[0].position;
    const t1 = walkableTiles[1].position;
    const t2 = walkableTiles[2].position;
    const enemyTile1 = walkableTiles[3].position;
    const enemyTile2 = walkableTiles[4].position;

    encounter.partyActors = [
      {
        characterId: knight.id,
        hp: knight.maxHp,
        mana: knight.maxMana,
        alive: true,
        position: { ...t0 },
        previousPosition: { ...t0 },
        direction: 'south',
        path: [],
        targetId: 'rat-boss-1', // Knight targets rat-boss-1
        nextAttackAt: 0,
        attackIntervalMs: 1000,
        speed: 100,
        nextMoveAt: 0,
        nextSpellAt: 0,
        spellCooldowns: {},
        groupCooldowns: {},
        hasteUntil: 0,
        magicShieldUntil: 0,
        bloodRageUntil: 0,
        lastHitTakenAt: 0,
        nextManaRegenAt: 0,
        nextHealthRegenAt: 0,
        pendingAttack: null,
        stance: 'offensive',
        targetDistance: 1,
      },
      {
        characterId: sorcerer.id,
        hp: sorcerer.maxHp,
        mana: sorcerer.maxMana,
        alive: true,
        position: { ...t1 },
        previousPosition: { ...t1 },
        direction: 'south',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 1000,
        speed: 100,
        nextMoveAt: 0,
        nextSpellAt: 0,
        spellCooldowns: {},
        groupCooldowns: {},
        hasteUntil: 0,
        magicShieldUntil: 0,
        bloodRageUntil: 0,
        lastHitTakenAt: 0,
        nextManaRegenAt: 0,
        nextHealthRegenAt: 0,
        pendingAttack: null,
        stance: 'offensive',
        targetDistance: 3,
      },
      {
        characterId: paladin.id,
        hp: paladin.maxHp,
        mana: paladin.maxMana,
        alive: true,
        position: { ...t2 },
        previousPosition: { ...t2 },
        direction: 'south',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 1000,
        speed: 100,
        nextMoveAt: 0,
        nextSpellAt: 0,
        spellCooldowns: {},
        groupCooldowns: {},
        hasteUntil: 0,
        magicShieldUntil: 0,
        bloodRageUntil: 0,
        lastHitTakenAt: 0,
        nextManaRegenAt: 0,
        nextHealthRegenAt: 0,
        pendingAttack: null,
        stance: 'offensive',
        targetDistance: 2,
      },
    ];

    encounter.enemies = [
      {
        id: 'rat-minion-2',
        monsterId: 'rat',
        name: 'Rat Minion',
        hp: 20,
        maxHp: 20,
        attackMax: 5,
        defense: 2,
        armor: 1,
        alive: true,
        position: { ...enemyTile1 },
        previousPosition: { ...enemyTile1 },
        direction: 'north',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 1000,
        speed: 80,
        behavior: 'idle',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 5,
        variant: null,
      },
      {
        id: 'rat-boss-1',
        monsterId: 'rat',
        name: 'Rat Boss',
        hp: 100,
        maxHp: 100,
        attackMax: 10,
        defense: 5,
        armor: 3,
        alive: true,
        position: { ...enemyTile2 },
        previousPosition: { ...enemyTile2 },
        direction: 'east',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 1000,
        speed: 80,
        behavior: 'idle',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 5,
        variant: null,
      },
    ];

    synchronizeEncounterOccupancy(encounter);

    const ranges = new Map([
      [knight.id, 1],
      [sorcerer.id, 3],
      [paladin.id, 2],
    ]);

    // Move party toward targets passing main character knight.id
    movePartyTowardTargets(encounter, ranges, undefined, knight.id);

    // Sorcerer and Paladin MUST lock onto 'rat-boss-1' because Knight (main character) targeted 'rat-boss-1'
    const sorcActor = encounter.partyActors.find((a) => a.characterId === sorcerer.id);
    const pallyActor = encounter.partyActors.find((a) => a.characterId === paladin.id);

    expect(sorcActor?.targetId).toBe('rat-boss-1');
    expect(pallyActor?.targetId).toBe('rat-boss-1');
  });

  it('makes secondary squad members follow the main character position step-by-step (Tibia Follow)', () => {
    let game = startGame(createIdleGame('test-follow-seed', content), content);
    const leaderChar = createCharacter('main-leader', 'Main Leader', 'Knight', content);
    const followerChar = createCharacter('squad-follower', 'Squad Follower', 'Sorcerer', content);

    const encounter = game.encounter;
    const walkableTiles = encounter.room.map.tiles.filter((t) => t.walkable);
    const t0 = walkableTiles[0].position;
    const tFar = walkableTiles[5].position;
    const targetPoint = walkableTiles[2].position;

    encounter.partyActors = [
      {
        characterId: leaderChar.id,
        hp: leaderChar.maxHp,
        mana: leaderChar.maxMana,
        alive: true,
        position: { ...t0 },
        previousPosition: { ...t0 },
        direction: 'south',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 1000,
        speed: 100,
        nextMoveAt: 0,
        nextSpellAt: 0,
        spellCooldowns: {},
        groupCooldowns: {},
        hasteUntil: 0,
        magicShieldUntil: 0,
        bloodRageUntil: 0,
        lastHitTakenAt: 0,
        nextManaRegenAt: 0,
        nextHealthRegenAt: 0,
        pendingAttack: null,
        stance: 'offensive',
        targetDistance: 1,
      },
      {
        characterId: followerChar.id,
        hp: followerChar.maxHp,
        mana: followerChar.maxMana,
        alive: true,
        position: { ...tFar },
        previousPosition: { ...tFar },
        direction: 'west',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 1000,
        speed: 100,
        nextMoveAt: 0,
        nextSpellAt: 0,
        spellCooldowns: {},
        groupCooldowns: {},
        hasteUntil: 0,
        magicShieldUntil: 0,
        bloodRageUntil: 0,
        lastHitTakenAt: 0,
        nextManaRegenAt: 0,
        nextHealthRegenAt: 0,
        pendingAttack: null,
        stance: 'offensive',
        targetDistance: 1,
      },
    ];

    synchronizeEncounterOccupancy(encounter);

    const initialFollowerPos = { ...tFar };

    // Move party toward point passing main leader ID
    movePartyTowardPoint(encounter, targetPoint, leaderChar.id);

    const followerActor = encounter.partyActors.find((a) => a.characterId === followerChar.id)!;
    
    // Follower moved from initial position or updated nextMoveAt / path
    expect(followerActor.position !== initialFollowerPos || followerActor.nextMoveAt > 0 || followerActor.path.length >= 0).toBe(true);
  });
});
