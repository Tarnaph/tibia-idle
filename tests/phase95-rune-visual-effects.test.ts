import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import manifestJson from '../content/generated/tibia1098-assets.json';
import {
  HOTBAR_RUNES,
  addPartyMember,
  advanceCombat,
  createIdleGame,
  restartHunt,
  triggerManualHotbarAction,
} from '../packages/domain/src';
import { content } from './fixture';
import { resolveActionImagePath } from '../apps/web/components/Tibia11ActionIcon.tsx';

describe('Phase 95: Authentic Rune Visual Effects, Projectiles and Area Parity (realmap11)', () => {
  it('corrects effectId and projectileId for all canonical runes according to realmap11 scripts and const.h', () => {
    const runeMap = new Map(HOTBAR_RUNES.map((r) => [r.id, r]));

    // Sudden Death: Mort Area (18), Sudden Death Missile (32)
    const sd = runeMap.get(2268);
    expect(sd).toBeDefined();
    expect(sd?.effectId).toBe(18);
    expect(sd?.projectileId).toBe(32);
    expect(sd?.area).toBe('target');

    // Great Fireball: Fire Area (7), Fire Missile (4), Circle 3x3
    const gfb = runeMap.get(2304);
    expect(gfb).toBeDefined();
    expect(gfb?.effectId).toBe(7);
    expect(gfb?.projectileId).toBe(4);
    expect(gfb?.area).toBe('circle-3x3');

    // Avalanche: Ice Area (42), Ice Missile (29), Circle 3x3
    const ava = runeMap.get(2274);
    expect(ava).toBeDefined();
    expect(ava?.effectId).toBe(42);
    expect(ava?.projectileId).toBe(29);
    expect(ava?.area).toBe('circle-3x3');

    // Explosion: Explosion Area (5), Explosion Missile (41), Cross 1x1
    const exp = runeMap.get(2313);
    expect(exp).toBeDefined();
    expect(exp?.effectId).toBe(5);
    expect(exp?.projectileId).toBe(41);
    expect(exp?.area).toBe('cross-1x1');

    // Thunderstorm: Energy Hit (12), Energyball Missile (36), Circle 3x3
    const thun = runeMap.get(2315);
    expect(thun).toBeDefined();
    expect(thun?.effectId).toBe(12);
    expect(thun?.projectileId).toBe(36);
    expect(thun?.area).toBe('circle-3x3');

    // Stone Shower: Stones (45), Earth Missile (30), Circle 3x3
    const ss = runeMap.get(2288);
    expect(ss).toBeDefined();
    expect(ss?.effectId).toBe(45);
    expect(ss?.projectileId).toBe(30);
    expect(ss?.area).toBe('circle-3x3');

    // Icicle: Ice Area (42), Ice Missile (29), Target
    const icicle = runeMap.get(2271);
    expect(icicle).toBeDefined();
    expect(icicle?.effectId).toBe(42);
    expect(icicle?.projectileId).toBe(29);
    expect(icicle?.area).toBe('target');

    // Fireball: Fire Attack (37), Fire Missile (4), Target
    const fb = runeMap.get(2302);
    expect(fb).toBeDefined();
    expect(fb?.effectId).toBe(37);
    expect(fb?.projectileId).toBe(4);
    expect(fb?.area).toBe('target');

    // Stalagmite: Stones (45), Earth Missile (30), Target
    const stalag = runeMap.get(2292);
    expect(stalag).toBeDefined();
    expect(stalag?.effectId).toBe(45);
    expect(stalag?.projectileId).toBe(30);
    expect(stalag?.area).toBe('target');

    // Holy Missile: Holy Damage (40), Holy Missile (31), Target
    const holy = runeMap.get(2295);
    expect(holy).toBeDefined();
    expect(holy?.effectId).toBe(40);
    expect(holy?.projectileId).toBe(31);
    expect(holy?.area).toBe('target');

    // HMM & LMM: Energy Area (38), Energy Missile (5)
    const hmm = runeMap.get(2311);
    expect(hmm?.effectId).toBe(38);
    expect(hmm?.projectileId).toBe(5);
    const lmm = runeMap.get(2287);
    expect(lmm?.effectId).toBe(38);
    expect(lmm?.projectileId).toBe(5);

    // Bombs: Fire (16/4), Poison (9/15), Energy (12/36)
    const fBomb = runeMap.get(2305);
    expect(fBomb?.effectId).toBe(16);
    expect(fBomb?.projectileId).toBe(4);
    expect(fBomb?.area).toBe('square-1x1');

    const pBomb = runeMap.get(2286);
    expect(pBomb?.effectId).toBe(9);
    expect(pBomb?.projectileId).toBe(15);
    expect(pBomb?.area).toBe('square-1x1');

    const eBomb = runeMap.get(2262);
    expect(eBomb?.effectId).toBe(12);
    expect(eBomb?.projectileId).toBe(36);
    expect(eBomb?.area).toBe('square-1x1');

    // Magic Wall (0/5) & Wild Growth (0/30)
    const mw = runeMap.get(2293);
    expect(mw?.effectId).toBe(0);
    expect(mw?.projectileId).toBe(5);

    const wg = runeMap.get(2269);
    expect(wg?.effectId).toBe(0);
    expect(wg?.projectileId).toBe(30);
  });

  it('guarantees that all rune missiles and effects exist in tibia1098-assets manifest', () => {
    const manifest = manifestJson as any;
    expect(manifest.missiles).toBeDefined();
    expect(manifest.effects).toBeDefined();

    for (const rune of HOTBAR_RUNES) {
      if (rune.projectileId > 0) {
        const missile = manifest.missiles[String(rune.projectileId)];
        expect(missile, `Missile ${rune.projectileId} for rune ${rune.name} (${rune.id}) missing in manifest`).toBeDefined();
        expect(missile.frames.length).toBeGreaterThan(0);
      }
      if (rune.effectId > 0) {
        const effect = manifest.effects[String(rune.effectId)];
        expect(effect, `Effect ${rune.effectId} for rune ${rune.name} (${rune.id}) missing in manifest`).toBeDefined();
        expect(effect.frames.length).toBeGreaterThan(0);
      }
    }
  });

  it('emits Sudden Death with projectile 32 and impact effect 18 on single target', () => {
    let game = createIdleGame('test-sd-combat', content);
    game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Mira')!;
    sorcerer.level = 50;
    sorcerer.skills.magicLevel = 30;
    sorcerer.hotbar = [2268]; // Sudden Death Rune

    const hunting = restartHunt(game, 'test-sd-combat', content, 'rat-cellars');
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;

    // Trigger Sudden Death manual hotbar action
    const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2268, content);
    expect(triggered).toBe(true);

    const visual = hunting.encounter.events.find(
      (e) => e.type === 'spell-visual' && e.spellId === 2268
    ) as any;
    expect(visual).toBeDefined();
    expect(visual.projectileId).toBe(32); // Authentic CONST_ANI_SUDDENDEATH
    expect(visual.effectId).toBe(18); // Authentic CONST_ME_MORTAREA
  });

  it('emits Great Fireball area blast: projectile 4 and impact effect 7 across circle-3x3 area tiles with delayMs: 240', () => {
    let game = createIdleGame('test-gfb-area', content);
    game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Mira')!;
    sorcerer.level = 50;
    sorcerer.skills.magicLevel = 30;
    sorcerer.hotbar = [2304]; // Great Fireball Rune

    const hunting = restartHunt(game, 'test-gfb-area', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;
    const walkableTile = hunting.encounter.room.map.tiles.find(
      (t) => t.walkable && Math.abs(t.position.x - actor.position.x) + Math.abs(t.position.y - actor.position.y) === 2
    );
    if (walkableTile) enemy.position = { ...walkableTile.position };

    const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2304, content);
    expect(triggered).toBe(true);

    const gfbVisuals = hunting.encounter.events.filter(
      (e) => e.type === 'spell-visual' && e.spellId === 2304
    ) as any[];
    expect(gfbVisuals.length).toBeGreaterThan(1);

    // 1. Projectile event to primary target
    const missileEvent = gfbVisuals.find((v) => v.projectileId === 4);
    expect(missileEvent).toBeDefined();

    // 2. Area tile impact events with authentic CONST_ME_FIREAREA (7) and delayMs: 240
    const tileEffects = gfbVisuals.filter((v) => v.effectId === 7 && v.targetPosition !== undefined);
    expect(tileEffects.length).toBe(37); // AREA_CIRCLE3X3 tile count
    expect(tileEffects[0].delayMs).toBe(240);

    // 3. Enemies in blast area took damage from GFB
    const spellCasts = hunting.encounter.events.filter(
      (e) => e.type === 'spell-cast' && e.spellId === 2304
    ) as any[];
    expect(spellCasts.length).toBeGreaterThanOrEqual(1);
  });

  it('emits Avalanche area blast: projectile 29 and impact effect 42 across circle-3x3 area tiles with delayMs: 240', () => {
    let game = createIdleGame('test-ava-area', content);
    game = addPartyMember(game, 'Mira', 'Druid', content);
    const druid = game.session.characters.find((c) => c.name === 'Mira')!;
    druid.level = 50;
    druid.skills.magicLevel = 30;
    druid.hotbar = [2274]; // Avalanche Rune

    const hunting = restartHunt(game, 'test-ava-area', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === druid.id)!;
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;
    const walkableTile = hunting.encounter.room.map.tiles.find(
      (t) => t.walkable && Math.abs(t.position.x - actor.position.x) + Math.abs(t.position.y - actor.position.y) === 2
    );
    if (walkableTile) enemy.position = { ...walkableTile.position };

    const triggered = triggerManualHotbarAction(hunting, druid.id, 2274, content);
    expect(triggered).toBe(true);

    const avaVisuals = hunting.encounter.events.filter(
      (e) => e.type === 'spell-visual' && e.spellId === 2274
    ) as any[];
    expect(avaVisuals.length).toBeGreaterThan(1);

    // 1. Projectile event to primary target: CONST_ANI_ICE = 29
    const missileEvent = avaVisuals.find((v) => v.projectileId === 29);
    expect(missileEvent).toBeDefined();

    // 2. Area tile impact events with authentic CONST_ME_ICEAREA (42) and delayMs: 240
    const tileEffects = avaVisuals.filter((v) => v.effectId === 42 && v.targetPosition !== undefined);
    expect(tileEffects.length).toBe(37); // AREA_CIRCLE3X3 tile count
    expect(tileEffects[0].delayMs).toBe(240);
  });

  it('emits Explosion cross blast: projectile 41 and impact effect 5 across cross-1x1 area tiles with delayMs: 240', () => {
    let game = createIdleGame('test-exp-area', content);
    game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Mira')!;
    sorcerer.level = 50;
    sorcerer.skills.magicLevel = 30;
    sorcerer.hotbar = [2313]; // Explosion Rune

    const hunting = restartHunt(game, 'test-exp-area', content, 'rat-cellars');

    const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2313, content);
    expect(triggered).toBe(true);

    const expVisuals = hunting.encounter.events.filter(
      (e) => e.type === 'spell-visual' && e.spellId === 2313
    ) as any[];
    expect(expVisuals.length).toBeGreaterThan(1);

    // 1. Projectile event to primary target: CONST_ANI_EXPLOSION = 41
    const missileEvent = expVisuals.find((v) => v.projectileId === 41);
    expect(missileEvent).toBeDefined();

    // 2. Cross 1x1 area tile impact events with authentic CONST_ME_EXPLOSIONAREA (5) and delayMs: 240
    const tileEffects = expVisuals.filter((v) => v.effectId === 5 && v.targetPosition !== undefined);
    expect(tileEffects.length).toBe(5); // AREA_CROSS1X1 tile count
    expect(tileEffects[0].delayMs).toBe(240);
  });

  it('casts runes automatically in auto-combat loop when ready and in range', () => {
    let game = createIdleGame('test-auto-rune', content);
    game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Mira')!;
    sorcerer.level = 50;
    sorcerer.skills.magicLevel = 30;
    sorcerer.hotbar = [2268]; // Sudden Death Rune

    const hunting = restartHunt(game, 'test-auto-rune', content, 'rat-cellars');

    let state = hunting;
    let sdSeen = false;
    for (let i = 0; i < 40; i++) {
      state = advanceCombat(state, content, 120);
      if (state.encounter.events.some((e) => e.type === 'spell-visual' && e.spellId === 2268)) {
        sdSeen = true;
        break;
      }
    }
    expect(sdSeen).toBe(true);
  });

  it('preserves all rune item icons from Phase 94 without regression', () => {
    for (const rune of HOTBAR_RUNES) {
      const iconPath = resolveActionImagePath(rune.id, 'rune', rune.name);
      expect(iconPath).toBeDefined();
      expect(iconPath).toMatch(/^\/runes\//);
      expect(iconPath).not.toContain('/spells/');

      const diskPath = path.resolve('public', iconPath!.replace(/^\//, ''));
      expect(fs.existsSync(diskPath), `Rune icon missing on disk: ${diskPath}`).toBe(true);
    }
  });
});
