import { describe, expect, it } from 'vitest';
import {
  advanceCombat, createIdleGame, experienceForLevel, initialHunts, restartHunt, rotwormCave,
  runCurrentHuntToEnd, runToEnd, startGame,
} from '../packages/domain/src';
import { content } from './fixture';

function until<T>(initial: T, advance: (state: T) => T, predicate: (state: T) => boolean, limit = 2000): T {
  let state = initial;
  for (let index = 0; index < limit && !predicate(state); index += 1) state = advance(state);
  if (!predicate(state)) throw new Error('Condition not reached.');
  return state;
}

describe('idle hunt domain', () => {
  it('keeps Rotworm Cave as ten tuned waves with a final boss and adds', () => {
    expect(rotwormCave.waves.map((wave) => wave.count)).toEqual([1, 1, 2, 2, 2, 3, 3, 3, 4, 2]);
    expect(rotwormCave.waves.slice(0, 9).every((wave) => wave.boss === undefined)).toBe(true);
    expect(rotwormCave.waves[9].boss).toMatchObject({ baseMonsterId: 'rotworm', name: 'The Burrower', hpMultiplier: 4 });
  });

  it('provides five real STYLLER habitat hunts with gradual recommended levels', () => {
    expect(initialHunts.map((hunt) => hunt.recommendedLevel)).toEqual([1, 4, 7, 10, 12]);
    expect(initialHunts.every((hunt) => hunt.waves.length === 10 && hunt.environment.source === 'styller-otbm')).toBe(true);
    const imported = new Set(content.monsters.map((monster) => monster.id));
    expect(initialHunts.flatMap((hunt) => hunt.monsters).every((id) => imported.has(id))).toBe(true);
  });

  it('replays the same state with the same seed', () => {
    expect(runToEnd('deterministic', content)).toEqual(runToEnd('deterministic', content));
  });

  it('restarts only the encounter and accumulates XP across completions', () => {
    const first = runToEnd('progress', content);
    expect(first.encounter.status).toBe('completed');
    const xp = first.session.characters[0].experience;
    const persistent = first.session.characters.map(({ level, experience, skills, skillTries, equipment, inventory, spells, hotbar, promotion }) => ({ level, experience, skills, skillTries, equipment, inventory, spells, hotbar, promotion }));
    const loot = structuredClone(first.session.loot);
    const gold = first.session.gold;
    const restarted = restartHunt(first, 'progress', content);
    expect(restarted.session.characters.map(({ level, experience, skills, skillTries, equipment, inventory, spells, hotbar, promotion }) => ({ level, experience, skills, skillTries, equipment, inventory, spells, hotbar, promotion }))).toEqual(persistent);
    expect(restarted.session.loot).toEqual(loot);
    expect(restarted.session.gold).toBe(gold);
    expect(restarted.session.characters.every((character) => character.currentHp === character.maxHp && character.currentMana === character.maxMana)).toBe(true);
    expect(restarted.encounter.round).toBe(0);
    const second = runCurrentHuntToEnd(restarted, content);
    expect(second.session.characters[0].experience).toBeGreaterThan(xp);
  });

  it('uses the cumulative TFS experience curve', () => {
    expect(experienceForLevel(1)).toBe(0); expect(experienceForLevel(2)).toBe(100); expect(experienceForLevel(5)).toBe(800);
  });

  it('does not attack before each independent cooldown', () => {
    const started = startGame(createIdleGame('cooldown', content), content);
    const firstHit = until(started, (state) => advanceCombat(state, content, 120), (state) => state.encounter.events.some((event) => event.type === 'player-attack'));
    const actor = firstHit.encounter.partyActors[0];
    expect(actor.nextAttackAt).toBeGreaterThan(firstHit.encounter.elapsedMs);
    const early = advanceCombat(firstHit, content, 120);
    expect(early.encounter.elapsedMs).toBeLessThan(actor.nextAttackAt);
    expect(early.encounter.events.some((event) => event.type === 'player-attack')).toBe(false);
  });

  it('moves while an attack cooldown is still pending', () => {
    const started = advanceCombat(startGame(createIdleGame('movement-cooldown', content), content), content, 120);
    started.encounter.partyActors[0].nextAttackAt = 999_999;
    const moved = until(started, (state) => advanceCombat(state, content, 120), (state) => state.encounter.events.some((event) => event.type === 'movement'), 30);
    expect(moved.encounter.events.some((event) => event.type === 'player-attack')).toBe(false);
  });

  it('creates the real corpse, leaves it nonblocking and keeps it for the room', () => {
    const started = startGame(createIdleGame('corpse', content), content);
    const dead = until(started, (state) => advanceCombat(state, content, 120), (state) => state.encounter.corpses.length > 0);
    const corpse = dead.encounter.corpses[0];
    const monster = content.monsters.find((candidate) => candidate.id === corpse.monsterId)!;
    expect(corpse.corpseId).toBe(monster.corpseId);
    expect(dead.encounter.room.occupancy.has(`${corpse.position.x},${corpse.position.y},${corpse.position.z}`)).toBe(false);
    const later = advanceCombat(dead, content, 120);
    expect(later.encounter.corpses).toContainEqual(corpse);
  });
});
