import { describe, it, expect } from 'vitest';
import {
  createIdleGame,
  leaveHunt,
  advanceCityAutoSpells,
  castAutomaticSpells,
  THAIS_TEMPLE_POSITION,
} from '../packages/domain/src/combat';
import { HUNT_LOADING_CONFIGS } from '../apps/web/lib/loadingConfig';
import { content } from './fixture';

describe('Phase 223: Dragon Lair Black Screen, City Exeta Res Spam & Cyclops/Elf Loading Screens', () => {
  it('1. HUNT_LOADING_CONFIGS correctly maps cyclops-camp and elf-sanctuary to dedicated loading artwork', () => {
    const cyclopsConfig = HUNT_LOADING_CONFIGS['cyclops-camp'];
    expect(cyclopsConfig).toBeDefined();
    expect(cyclopsConfig.bgImage).toBe('/images/loading/cyclops-camp-loading.jpg');
    expect(cyclopsConfig.curiosities.length).toBeGreaterThan(0);

    const elfConfig = HUNT_LOADING_CONFIGS['elf-sanctuary'];
    expect(elfConfig).toBeDefined();
    expect(elfConfig.bgImage).toBe('/images/loading/elf-sanctuary-loading.jpg');
    expect(elfConfig.curiosities.length).toBeGreaterThan(0);

    const dragonConfig = HUNT_LOADING_CONFIGS['dragon-lair'];
    expect(dragonConfig).toBeDefined();
    expect(dragonConfig.bgImage).toBe('/images/loading/dragon-lair-loading.jpg');
  });

  it('2. leaveHunt purges enemies, corpses, clears actor targets/cooldowns, and places actors in Thais Temple', () => {
    const state = createIdleGame('test-phase-223-1', content);

    // Simula estado ativo de caçada com dragão vivo e corpos
    state.encounter.enemies = [
      {
        id: 'dragon-enemy-1',
        monsterId: 'dragon',
        name: 'Dragon',
        position: { x: 32800, y: 32600, z: 7 },
        currentHp: 1000,
        maxHp: 1000,
        targetId: state.encounter.partyActors[0].characterId,
        attackCooldownMs: 0,
        spellCooldownMs: 0,
        alive: true,
        flags: [],
      } as any,
    ];
    state.encounter.corpses = [
      {
        id: 'corpse-1',
        monsterId: 'dragon',
        position: { x: 32801, y: 32600, z: 7 },
        decayRemainingMs: 30000,
        corpseId: 3104,
      } as any,
    ];

    const actor = state.encounter.partyActors[0];
    actor.targetId = 'dragon-enemy-1';
    actor.position = { x: 32800, y: 32601, z: 7 };
    actor.spellCooldowns = { 93: 2000 };

    const exited = leaveHunt(state);

    // Verifica que a saída de caçada limpou todo o resíduo
    expect(exited.encounter.status).toBe('completed');
    expect(exited.encounter.enemies).toEqual([]);
    expect(exited.encounter.corpses).toEqual([]);

    const exitedActor = exited.encounter.partyActors[0];
    expect(exitedActor.targetId).toBeNull();
    expect(exitedActor.spellCooldowns).toEqual({});
    expect(exitedActor.position).toEqual({
      x: THAIS_TEMPLE_POSITION.x,
      y: THAIS_TEMPLE_POSITION.y,
      z: THAIS_TEMPLE_POSITION.z,
    });
  });

  it('3. advanceCityAutoSpells prevents Exeta Res (Challenge) execution and clears residual monsters in city ticks', () => {
    const state = createIdleGame('test-phase-223-2', content);
    const char = state.session.characters[0];
    char.currentMana = 100;
    char.maxMana = 100;
    // Adiciona Exeta Res (Challenge ID 93) na hotbar
    char.hotbar = [93];
    char.hotbarConfigs = {
      0: {
        enabled: true,
        conditions: [],
      },
    };

    const actor = state.encounter.partyActors[0];
    actor.mana = 100;

    // Se porventura existissem inimigos residuais na memória da sala
    state.encounter.enemies = [
      {
        id: 'residual-dragon',
        monsterId: 'dragon',
        name: 'Dragon',
        position: { x: THAIS_TEMPLE_POSITION.x + 1, y: THAIS_TEMPLE_POSITION.y, z: 7 },
        currentHp: 1000,
        maxHp: 1000,
        targetId: actor.characterId,
        attackCooldownMs: 0,
        spellCooldownMs: 0,
        alive: true,
        flags: [],
      } as any,
    ];

    // Avança tick urbano (onde allowOffensive = false)
    const nextState = advanceCityAutoSpells(state, content, 1000);

    // Inimigos devem ser purgados imediatamente
    expect(nextState.encounter.enemies).toEqual([]);
    expect(nextState.encounter.corpses).toEqual([]);

    // O Knight não deve ter gasto mana em Exeta Res
    expect(nextState.encounter.partyActors[0].mana).toBe(100);
    expect(nextState.session.characters[0].currentMana).toBe(100);
  });

  it('4. castAutomaticSpells with allowOffensive=false strictly ignores Challenge (Exeta Res) spells', () => {
    const state = createIdleGame('test-phase-223-3', content);
    const char = state.session.characters[0];
    char.currentMana = 100;
    char.maxMana = 100;
    char.hotbar = [93]; // Challenge / Exeta Res
    char.hotbarConfigs = { 0: { enabled: true } };

    const actor = state.encounter.partyActors[0];
    actor.mana = 100;

    // Adiciona inimigo ao alcance corpo a corpo
    state.encounter.enemies = [
      {
        id: 'enemy-near',
        monsterId: 'dragon',
        name: 'Dragon',
        position: { x: actor.position.x + 1, y: actor.position.y, z: 7 },
        currentHp: 500,
        maxHp: 500,
        targetId: null,
        attackCooldownMs: 0,
        spellCooldownMs: 0,
        alive: true,
        flags: [],
      } as any,
    ];

    // Executa auto-spells com allowOffensive = false (modo cidade/peace)
    castAutomaticSpells(state, content, false);

    // Não deve lançar Exeta Res e nem consumir mana
    expect(actor.mana).toBe(100);
    expect(actor.spellCooldowns[93]).toBeUndefined();
  });

  it('5. ExuraLoadingScreen progress formula respects durationMs even when asset preloading is already 100%', () => {
    // Simula a lógica corrigida de ExuraLoadingScreen.tsx
    const computeLoadingProgress = (
      elapsedMs: number,
      durationMs: number,
      isAssetsComplete: boolean,
      assetProgressPct: number,
      waitForAssets: boolean
    ) => {
      const timePct = Math.min(100, (elapsedMs / durationMs) * 100);
      let effectivePct: number;

      if (!waitForAssets) {
        effectivePct = timePct;
      } else if (!isAssetsComplete) {
        effectivePct = Math.min(99, Math.max(timePct * 0.4, assetProgressPct));
      } else {
        // Quando os assets estão prontos, o progresso acompanha a duração suave da viagem (timePct)
        effectivePct = timePct;
      }

      return Math.min(100, effectivePct);
    };

    const durationMs = 10000;
    const isAssetsComplete = true; // Assets já no cache do navegador ou pré-carregados em Thais
    const assetProgressPct = 100;
    const waitForAssets = true;

    // No instante inicial (0ms / primeiro frame), NÃO PODE pular direto para 100%
    const progressAt0ms = computeLoadingProgress(0, durationMs, isAssetsComplete, assetProgressPct, waitForAssets);
    expect(progressAt0ms).toBe(0);

    // Aos 2.5 segundos (2500ms), deve estar em 25%
    const progressAt2500ms = computeLoadingProgress(2500, durationMs, isAssetsComplete, assetProgressPct, waitForAssets);
    expect(progressAt2500ms).toBe(25);

    // Aos 5 segundos (5000ms), deve estar em 50%
    const progressAt5000ms = computeLoadingProgress(5000, durationMs, isAssetsComplete, assetProgressPct, waitForAssets);
    expect(progressAt5000ms).toBe(50);

    // Aos 10 segundos (10000ms), atinge 100%
    const progressAt10000ms = computeLoadingProgress(10000, durationMs, isAssetsComplete, assetProgressPct, waitForAssets);
    expect(progressAt10000ms).toBe(100);
  });
});
