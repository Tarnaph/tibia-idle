import { describe, it, expect, beforeEach } from 'vitest';
import { createIdleGame, restartHunt, type GameContent, initialHunts } from '../packages/domain/src';
import { SkillRateLimiter, HUNT_MAX_TRIES_PER_SECOND, HUNT_MAX_BURST_TRIES, NON_HUNT_MAX_TRIES_PER_SECOND } from '../packages/auth/src/skillRateLimiter';
import fs from 'node:fs';
import path from 'node:path';

function loadTestContent(): GameContent {
  const root = process.cwd();
  const monsters = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/monsters.json'), 'utf8')).monsters;
  const equipment = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/equipment.json'), 'utf8')).items;
  const vocations = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/vocations.json'), 'utf8')).vocations;
  const spells = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/spells.json'), 'utf8')).spells;
  const starterLoadouts = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/starter-loadouts.json'), 'utf8')).loadouts;
  const huntRegions = JSON.parse(fs.readFileSync(path.join(root, 'content/generated/hunt-regions.json'), 'utf8')).regions;
  return { monsters, equipment, vocations, spells, starterLoadouts, huntRegions, hunts: initialHunts, rateSkill: 50, rateMagic: 25 } as any;
}

describe('Phase 220: Monster Spawn Teleport FX & Skill Rate Limiter Hunt Fix', () => {
  const content = loadTestContent();

  beforeEach(() => {
    SkillRateLimiter.resetAll();
  });

  it('emite evento spawn-visual com effectId 11 (CONST_ME_TELEPORT) no nascimento de criaturas', () => {
    const game = createIdleGame('spawn-teleport-test', content, 'cyclops-camp');
    const running = restartHunt(game, 'cyclops-camp', content, 'cyclops-camp');

    // Ao iniciar ou avançar o combate e popular monstros, deve conter eventos spawn-visual
    const spawnVisuals = running.encounter.visualEvents.filter((ev) => ev.type === 'spawn-visual');
    expect(spawnVisuals.length).toBeGreaterThan(0);
    for (const ev of spawnVisuals) {
      if (ev.type === 'spawn-visual') {
        expect(ev.effectId).toBe(11);
        expect(ev.position).toBeDefined();
        expect(typeof ev.position?.x).toBe('number');
        expect(typeof ev.position?.y).toBe('number');
      }
    }
  });

  it('SkillRateLimiter acomoda com segurança bursts intensivos de magias com mana potion (576.000 tries)', () => {
    const charId = 'test-char-high-magic-burst';
    const now = Date.now();

    // 576.000 tentativas que falhavam na Phase 219 agora cabem confortavelmente no novo burst de caçada (600.000)
    const result = SkillRateLimiter.consume(charId, 576_000, now, {
      isHunting: true,
      baselineTime: now - 15_000, // 15s de caçada acumulada
    });

    expect(result.allowed).toBe(true);
    expect(result.maxAllowed).toBe(576_000);
  });

  it('SkillRateLimiter opera com taxa contínua de 40.000 tentativas por segundo em caçada', () => {
    const charId = 'test-char-sustained-hunting';
    const start = Date.now();

    // Consome o burst inicial
    SkillRateLimiter.consume(charId, HUNT_MAX_BURST_TRIES, start, { isHunting: true });

    // Após 10 segundos de caçada intensa (spam de magias de área + curas reativas + mana potions)
    const after10s = start + 10_000;
    const expectedGeneration = 10 * HUNT_MAX_TRIES_PER_SECOND; // 400.000 tries gerados
    const check = SkillRateLimiter.consume(charId, expectedGeneration, after10s, {
      isHunting: true,
      baselineTime: start,
    });

    expect(check.allowed).toBe(true);
    expect(check.maxAllowed).toBe(expectedGeneration);
  });

  it('SkillRateLimiter diferencia rigorosamente caçada (40.000/s) de treino urbano/dummy (500/s)', () => {
    expect(HUNT_MAX_TRIES_PER_SECOND).toBe(40_000);
    expect(HUNT_MAX_BURST_TRIES).toBe(225_000);
    expect(NON_HUNT_MAX_TRIES_PER_SECOND).toBe(500);

    const urbanChar = 'test-urban-dummy';
    const now = Date.now();

    // Em cidade/fora de caçada, 576.000 tentativas sem tempo decorrido DEVE ser rejeitado
    const urbanResult = SkillRateLimiter.consume(urbanChar, 576_000, now, { isHunting: false });
    expect(urbanResult.allowed).toBe(false);
    expect(urbanResult.maxAllowed).toBeLessThan(100_000);
  });
});
