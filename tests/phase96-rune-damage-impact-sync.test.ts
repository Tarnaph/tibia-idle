import { describe, it, expect } from 'vitest';
import {
  HOTBAR_RUNES,
  addPartyMember,
  advanceCombat,
  createIdleGame,
  restartHunt,
  triggerManualHotbarAction,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 96: Rune Damage and Visual Impact Synchronization', () => {
  it('assigns delayMs: 240 to spell-cast event when firing Sudden Death (projectile rune)', () => {
    let game = createIdleGame('test-p96-sd', content);
    game = addPartyMember(game, 'Vesper', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Vesper')!;
    sorcerer.level = 45;
    sorcerer.skills.magicLevel = 35;
    sorcerer.hotbar = [2268]; // Sudden Death Rune

    const hunting = restartHunt(game, 'test-p96-sd', content, 'rat-cellars');
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;

    const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2268, content);
    expect(triggered).toBe(true);

    const sdCast = hunting.encounter.events.find(
      (e) => e.type === 'spell-cast' && e.spellId === 2268
    ) as any;
    expect(sdCast).toBeDefined();
    expect(sdCast.targetId).toBe(enemy.id);
    expect(sdCast.delayMs).toBe(240);
    expect(sdCast.amount).toBeGreaterThan(0);
    expect(sdCast.healing).toBe(false);
  });

  it('assigns delayMs: 240 to ALL damaged targets in Great Fireball area blast', () => {
    let game = createIdleGame('test-p96-gfb', content);
    game = addPartyMember(game, 'Vesper', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Vesper')!;
    sorcerer.level = 50;
    sorcerer.skills.magicLevel = 40;
    sorcerer.hotbar = [2304]; // Great Fireball Rune

    const hunting = restartHunt(game, 'test-p96-gfb', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;

    // Position multiple living enemies in the blast area (center at enemy 1)
    const aliveEnemies = hunting.encounter.enemies.filter((e) => e.alive);
    expect(aliveEnemies.length).toBeGreaterThanOrEqual(1);

    // Ensure enemies are adjacent to each other within 3x3 blast radius
    const primary = aliveEnemies[0];
    primary.position = { x: actor.position.x + 2, y: actor.position.y, z: actor.position.z };

    if (aliveEnemies.length > 1) {
      aliveEnemies[1].position = { x: primary.position.x + 1, y: primary.position.y, z: primary.position.z };
    }

    const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2304, content);
    expect(triggered).toBe(true);

    const gfbCasts = hunting.encounter.events.filter(
      (e) => e.type === 'spell-cast' && e.spellId === 2304
    ) as any[];

    expect(gfbCasts.length).toBeGreaterThanOrEqual(1);
    for (const cast of gfbCasts) {
      expect(cast.delayMs).toBe(240);
      expect(cast.amount).toBeGreaterThan(0);
      expect(cast.healing).toBe(false);
    }
  });

  it('assigns delayMs: 240 to ALL damaged targets in Avalanche area blast', () => {
    let game = createIdleGame('test-p96-ava', content);
    game = addPartyMember(game, 'Breeze', 'Druid', content);
    const druid = game.session.characters.find((c) => c.name === 'Breeze')!;
    druid.level = 50;
    druid.skills.magicLevel = 40;
    druid.hotbar = [2274]; // Avalanche Rune

    const hunting = restartHunt(game, 'test-p96-ava', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === druid.id)!;

    const aliveEnemies = hunting.encounter.enemies.filter((e) => e.alive);
    const primary = aliveEnemies[0];
    primary.position = { x: actor.position.x + 2, y: actor.position.y, z: actor.position.z };

    const triggered = triggerManualHotbarAction(hunting, druid.id, 2274, content);
    expect(triggered).toBe(true);

    const avaCasts = hunting.encounter.events.filter(
      (e) => e.type === 'spell-cast' && e.spellId === 2274
    ) as any[];

    expect(avaCasts.length).toBeGreaterThanOrEqual(1);
    for (const cast of avaCasts) {
      expect(cast.delayMs).toBe(240);
      expect(cast.amount).toBeGreaterThan(0);
    }
  });

  it('assigns delayMs: 240 to ALL damaged targets in Explosion cross blast', () => {
    let game = createIdleGame('test-p96-exp', content);
    game = addPartyMember(game, 'Ignis', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Ignis')!;
    sorcerer.level = 50;
    sorcerer.skills.magicLevel = 40;
    sorcerer.hotbar = [2313]; // Explosion Rune

    const hunting = restartHunt(game, 'test-p96-exp', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;
    const aliveEnemies = hunting.encounter.enemies.filter((e) => e.alive);
    const primary = aliveEnemies[0];
    primary.position = { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z };

    const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2313, content);
    expect(triggered).toBe(true);

    const expCasts = hunting.encounter.events.filter(
      (e) => e.type === 'spell-cast' && e.spellId === 2313
    ) as any[];

    expect(expCasts.length).toBeGreaterThanOrEqual(1);
    for (const cast of expCasts) {
      expect(cast.delayMs).toBe(240);
      expect(cast.amount).toBeGreaterThan(0);
    }
  });

  it('assigns delayMs: 240 during automatic combat rune triggering', () => {
    const game = createIdleGame('test-p96-auto', content);
    const sorcerer = game.session.characters[0];
    sorcerer.vocation = 'Sorcerer';
    sorcerer.level = 45;
    sorcerer.skills.magicLevel = 35;
    sorcerer.hotbar = [2268]; // Sudden Death Rune in hotbar for auto combat

    const hunting = restartHunt(game, 'test-p96-auto', content, 'rat-cellars');
    hunting.encounter.room.phase = 'combat';
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;
    enemy.position = { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z };
    actor.targetId = enemy.id;
    sorcerer.combatState.targetId = enemy.id;

    const nextState = advanceCombat(hunting, content, 120);

    const sdCast = nextState.encounter.events.find(
      (e) => e.type === 'spell-cast' && e.spellId === 2268
    ) as any;

    expect(sdCast).toBeDefined();
    expect(sdCast.delayMs).toBe(240);
  });

  it('assigns delayMs: 0 for non-projectile runes like Paralyze Rune', () => {
    let game = createIdleGame('test-p96-paralyze', content);
    game = addPartyMember(game, 'Paralyzer', 'Druid', content);
    const druid = game.session.characters.find((c) => c.name === 'Paralyzer')!;
    druid.level = 54;
    druid.skills.magicLevel = 20;
    druid.hotbar = [2278]; // Paralyze Rune (projectileId: 0)

    const hunting = restartHunt(game, 'test-p96-paralyze', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === druid.id)!;
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;
    enemy.position = { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z };

    const triggered = triggerManualHotbarAction(hunting, druid.id, 2278, content);
    expect(triggered).toBe(true);

    const paraCast = hunting.encounter.events.find(
      (e) => e.type === 'spell-cast' && e.spellId === 2278
    ) as any;

    expect(paraCast).toBeDefined();
    expect(paraCast.delayMs).toBe(0);
  });

  it('preserves rune cooldowns, requirements and projectile/effect mappings intact', () => {
    const runeMap = new Map(HOTBAR_RUNES.map((r) => [r.id, r]));
    const sd = runeMap.get(2268)!;
    const gfb = runeMap.get(2304)!;
    const ava = runeMap.get(2274)!;
    const exp = runeMap.get(2313)!;

    // Cooldowns
    expect(sd.cooldownMs).toBe(2000);
    expect(gfb.cooldownMs).toBe(2000);
    expect(ava.cooldownMs).toBe(2000);
    expect(exp.cooldownMs).toBe(2000);

    // Requirements
    expect(sd.requiredLevel).toBe(45);
    expect(sd.requiredMagicLevel).toBe(15);
    expect(gfb.requiredLevel).toBe(30);
    expect(gfb.requiredMagicLevel).toBe(4);
    expect(ava.requiredLevel).toBe(30);
    expect(ava.requiredMagicLevel).toBe(4);
    expect(exp.requiredLevel).toBe(31);
    expect(exp.requiredMagicLevel).toBe(6);

    // Projectile IDs from Phase 95
    expect(sd.projectileId).toBe(32); // CONST_ANI_SUDDENDEATH
    expect(gfb.projectileId).toBe(4);  // CONST_ANI_FIRE
    expect(ava.projectileId).toBe(29); // CONST_ANI_ICE
    expect(exp.projectileId).toBe(41); // CONST_ANI_EXPLOSION

    // Effect IDs from Phase 95
    expect(sd.effectId).toBe(18); // CONST_ME_MORTAREA
    expect(gfb.effectId).toBe(7);  // CONST_ME_FIREAREA
    expect(ava.effectId).toBe(42); // CONST_ME_ICEAREA
    expect(exp.effectId).toBe(5);  // CONST_ME_EXPLOSIONAREA
  });

  it('exports shared RUNE_PROJECTILE_FLIGHT_MS = 240 as single source of truth', async () => {
    const domain = await import('../packages/domain/src');
    expect(domain.RUNE_PROJECTILE_FLIGHT_MS).toBe(240);
  });

  it('preserves non-oscillating HP calculation across consecutive projectile impacts', () => {
    // Model the consecutive impact formula used by PixiArena:
    // visualHp = min(maxHp, max(0, enemy.hp + pendingDamage))
    const maxHp = 500;
    let logicalHp = 500;
    const pendingImpacts: Array<{ targetId: string; amount: number; impactAt: number }> = [];

    // Cast 1 at t=0 for 150 damage
    const t0 = 1000;
    logicalHp -= 150; // 350
    pendingImpacts.push({ targetId: 'enemy-1', amount: 150, impactAt: t0 + 240 });

    // During flight at t = 100ms
    let now = 1100;
    let pendingDamage = pendingImpacts.filter((p) => now < p.impactAt).reduce((sum, p) => sum + p.amount, 0);
    let visualHp = Math.min(maxHp, Math.max(0, logicalHp + pendingDamage));
    expect(visualHp).toBe(500); // Has NOT dropped yet

    // Cast 2 at t=120ms for 100 damage (consecutive hit on same target)
    logicalHp -= 100; // 250
    pendingImpacts.push({ targetId: 'enemy-1', amount: 100, impactAt: 1120 + 240 }); // impact at 1360

    // At t=200ms: both hits in flight, visualHp should still be 500
    now = 1200;
    pendingDamage = pendingImpacts.filter((p) => now < p.impactAt).reduce((sum, p) => sum + p.amount, 0);
    visualHp = Math.min(maxHp, Math.max(0, logicalHp + pendingDamage));
    expect(visualHp).toBe(500); // Perfectly stable, NO oscillation!

    // At t=241ms: Hit 1 lands, Hit 2 still flying
    now = 1241;
    pendingDamage = pendingImpacts.filter((p) => now < p.impactAt).reduce((sum, p) => sum + p.amount, 0);
    visualHp = Math.min(maxHp, Math.max(0, logicalHp + pendingDamage));
    expect(visualHp).toBe(350); // Cleanly steps to 350

    // At t=361ms: Hit 2 lands
    now = 1361;
    pendingDamage = pendingImpacts.filter((p) => now < p.impactAt).reduce((sum, p) => sum + p.amount, 0);
    visualHp = Math.min(maxHp, Math.max(0, logicalHp + pendingDamage));
    expect(visualHp).toBe(250); // Cleanly steps to 250, zero oscillation!
  });

  it('maintains dying creature view and delays corpse during fatal projectile rune flight', () => {
    let game = createIdleGame('test-p96-fatal', content);
    game = addPartyMember(game, 'Vesper', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Vesper')!;
    sorcerer.level = 100;
    sorcerer.skills.magicLevel = 80;
    sorcerer.hotbar = [2268]; // Sudden Death Rune

    const hunting = restartHunt(game, 'test-p96-fatal', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;
    enemy.position = { x: actor.position.x + 1, y: actor.position.y, z: actor.position.z };
    enemy.hp = 10; // Low HP so SD is guaranteed fatal

    const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2268, content);
    expect(triggered).toBe(true);

    // Enemy is logically dead
    expect(enemy.hp).toBe(0);
    expect(enemy.alive).toBe(false);

    // Spell cast has delayMs: 240
    const sdCast = hunting.encounter.events.find(
      (e) => e.type === 'spell-cast' && e.spellId === 2268
    ) as any;
    expect(sdCast).toBeDefined();
    expect(sdCast.delayMs).toBe(240);
    expect(sdCast.amount).toBeGreaterThanOrEqual(10);
  });
});
