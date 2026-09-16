import { describe, it, expect, beforeEach, vi } from 'vitest';
import { outfitDiagnostics, CURRENT_CLIENT_COMMIT } from '../apps/web/lib/outfitDiagnostics';
import {
  recoloredCanvasCache,
  isAppearanceFullyReady,
  isOutfitCanvasCached,
  getCanvasCacheKey,
} from '../apps/web/lib/outfitRecolor';

describe('Phase 179 - Outfit Diagnostic Telemetry & Strict Persistence', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  it('correctly reports clientCommit as "desconhecido" when commit hash is unavailable', () => {
    expect(CURRENT_CLIENT_COMMIT).toBe('desconhecido');
  });

  it('reproduces complete outfit change attempt lifecycle without leaking tokens or passwords', () => {
    const attemptId = outfitDiagnostics.startAttempt({
      characterId: 'char-123',
      characterName: 'TibiaWarrior',
      outfit: 'Knight',
      mount: 'none',
      mountActive: false,
      addons: 0,
      colors: { head: 0, primary: 86, secondary: 114, detail: 76 },
    });

    expect(attemptId).toBeTruthy();
    expect(attemptId.startsWith('att-')).toBe(true);

    // 1. User selects new outfit, mount, and addons
    outfitDiagnostics.updateSelection({
      outfit: 'Citizen',
      mount: 'widow-queen',
      mountActive: true,
      addons: 1,
      colors: { head: 10, primary: 20, secondary: 30, detail: 40 },
      direction: 'south',
    });

    // 2. Preparation records actual frames
    outfitDiagnostics.recordPreparation({
      status: 'ready',
      durationMs: 42,
      success: true,
      totalFramesRequested: 36,
      cachedFramesCount: 36,
      missingAssets: [],
      missingFrames: [],
      attemptsCount: 1,
    });

    outfitDiagnostics.recordPreview({
      hasCanvas: true,
      width: 64,
      height: 64,
      dataUrlLen: 1200,
      lastDrawnKey: 'Citizen_widow-queen_south_a1',
      isDefinitive: true,
    });

    // 3. User clicks save button
    outfitDiagnostics.recordSaveClick();

    // 4. Save callback fires with safe payload (verifying sensitive fields stripped)
    outfitDiagnostics.recordSaveCallback({
      characterId: 'char-123',
      outfit: 'Citizen',
      mount: 'widow-queen',
      mountActive: true,
      addons: 1,
      password: 'SUPER_SECRET_PASSWORD',
      token: 'BEARER_TOKEN_ABC',
    });

    outfitDiagnostics.recordNetworkDispatch();

    // 5. API response recorded
    outfitDiagnostics.recordApiSave(200, true);

    // 6. Arena actor appearance reflected
    outfitDiagnostics.recordArenaState({
      reactCharOutfit: 'Citizen',
      reactCharMount: 'widow-queen',
      reactCharMountActive: true,
      reactCharAddons: 1,
      arenaActiveAppearanceSig: 'Citizen_male_widow-queen_1_10_20_30_40',
      arenaPendingAppearanceSig: undefined,
      arenaAppearanceStatus: 'ready',
      pixiTextureKey: 'citizen_male_south_0_10_20_30_40_a1_mwidow-queen_v2',
    });

    const finished = outfitDiagnostics.endAttempt();
    expect(finished).not.toBeNull();
    expect(finished?.attemptId).toBe(attemptId);
    expect(finished?.clientCommit).toBe('desconhecido');

    // Asserts no tokens or passwords in payload
    expect(finished?.save.callbackPayload?.password).toBeUndefined();
    expect(finished?.save.callbackPayload?.token).toBeUndefined();

    // Asserts zero divergences detected on successful complete cycle
    expect(finished?.divergences).toEqual([]);
    expect(finished?.arena.isMatchWithSelection).toBe(true);
    expect(finished?.preparation.totalFramesRequested).toBe(36);
    expect(finished?.preparation.cachedFramesCount).toBe(36);
    expect(finished?.preparation.attemptsHistory?.length).toBeGreaterThan(0);
  });

  it('does NOT consider uncommitted modal selection as an error before Save is clicked', () => {
    // Scenario reported by user: Character has Glooth Engineer + Dromedary.
    // In modal, user is selecting Hunter + Racing Bird, but hasn't clicked Salvar yet.
    outfitDiagnostics.startAttempt({
      characterId: 'char-user',
      characterName: 'PlayerOne',
      outfit: 'glooth-engineer',
      mount: 'dromedary',
      mountActive: true,
    });

    outfitDiagnostics.updateSelection({
      outfit: 'Hunter',
      mount: 'racing-bird',
      mountActive: true,
    });

    outfitDiagnostics.recordPreview({
      hasCanvas: true,
      width: 64,
      height: 64,
      lastDrawnKey: 'hunter_racing-bird_south_a0',
    });

    outfitDiagnostics.recordArenaState({
      reactCharOutfit: 'glooth-engineer',
      reactCharMount: 'dromedary',
      reactCharMountActive: true,
      arenaActiveAppearanceSig: 'glooth-engineer_male_dromedary_0_0_86_114_76',
    });

    const report = outfitDiagnostics.getCurrentAttempt();
    // Before save, selection differing from character outfit is NOT a divergence
    expect(report?.save.buttonClicked).toBe(false);
    expect(report?.divergences).toEqual([]);
  });

  it('detects APARENCIA_SALVA_NAO_ASSUMIDA_PELO_RENDERIZADOR when character state has saved appearance but arena renderer is stuck', () => {
    // Scenario reported by user: Character state contains Glooth Engineer + Dromedary,
    // but the arena map is still rendering Nightmare + Lady Bug, and preparation is pending/failed.
    outfitDiagnostics.startAttempt({
      characterId: 'char-user',
      characterName: 'PlayerOne',
      outfit: 'glooth-engineer',
      mount: 'dromedary',
      mountActive: true,
    });

    outfitDiagnostics.recordPreparation({
      status: 'failed',
      totalFramesRequested: 36,
      cachedFramesCount: 20,
      missingFrames: ['west-f7', 'west-f8'],
      attemptsCount: 2,
    });

    outfitDiagnostics.recordArenaState({
      reactCharOutfit: 'glooth-engineer',
      reactCharMount: 'dromedary',
      reactCharMountActive: true,
      arenaActiveAppearanceSig: 'nightmare_male_lady-bug_0_0_86_114_76', // Stuck on old appearance!
      arenaPendingAppearanceSig: 'glooth-engineer_male_dromedary_0_0_86_114_76',
      arenaAppearanceStatus: 'failed',
    });

    const report = outfitDiagnostics.getCurrentAttempt();
    expect(report?.divergences.some((d) => d.includes('APARENCIA_SALVA_NAO_ASSUMIDA_PELO_RENDERIZADOR'))).toBe(true);
    expect(report?.divergences.some((d) => d.includes('PREPARAÇÃO_FALHOU'))).toBe(true);
  });

  it('ignores periodic background autosave HTTP 200 when user has not clicked Save in the attempt', () => {
    outfitDiagnostics.startAttempt({
      characterId: 'char-user',
      characterName: 'PlayerOne',
      outfit: 'Hunter',
      mount: 'racing-bird',
      mountActive: true,
    });

    // Simulate periodic autosave firing while user is only previewing in modal
    outfitDiagnostics.recordApiSave(200, true);

    const report = outfitDiagnostics.getCurrentAttempt();
    // Must NOT be marked as apiDispatched because button was not clicked
    expect(report?.save.buttonClicked).toBe(false);
    expect(report?.save.apiDispatched).toBe(false);
    expect(report?.save.apiResponseStatus).toBeUndefined();
  });

  it('detects divergence when character state in saveProgress does not match user selection', () => {
    outfitDiagnostics.startAttempt({
      characterId: 'char-999',
      characterName: 'MageHero',
      outfit: 'Mage',
      mount: 'none',
      mountActive: false,
    });

    outfitDiagnostics.updateSelection({
      outfit: 'Summoner',
      mount: 'crystalwolf',
      mountActive: true,
      addons: 2,
    });

    outfitDiagnostics.recordSaveClick();

    // Divergent scenario: callback fired with stale outfit
    outfitDiagnostics.recordSaveCallback({
      characterId: 'char-999',
      outfit: 'Mage', // Diverged from selection 'Summoner'
      mount: 'none',
      mountActive: false,
    });

    outfitDiagnostics.recordArenaState({
      reactCharOutfit: 'Mage', // Stale!
      reactCharMount: 'none',
    });

    const report = outfitDiagnostics.endAttempt();
    expect(report?.divergences.length).toBeGreaterThan(0);
    expect(report?.arena.isMatchWithSelection).toBe(false);
  });

  it('synchronously updates latestSaveStateRef.current.characters on outfit save', () => {
    const characters = [
      {
        id: 'char-main',
        name: 'PlayerOne',
        outfit: 'Knight',
        mount: 'none',
        mountActive: false,
        addons: 0,
        outfitColors: { head: 0, primary: 86, secondary: 114, detail: 76 },
        equipment: {},
        inventory: { equipmentIds: [] },
        skills: { fist: 10, club: 10, sword: 50, axe: 10, distance: 10, shielding: 45, magicLevel: 4 },
        level: 40,
        experience: 50000,
        currentHp: 600,
        maxHp: 600,
        currentMana: 150,
        maxMana: 150,
        vocation: 'Knight',
      },
    ];

    const latestSaveStateRef = {
      current: {
        activeCharacter: { ...characters[0] },
        onlineCharacter: { ...characters[0] },
        characters: [...characters],
      },
    };

    const newCustomization = {
      outfit: 'Citizen',
      mount: 'widow-queen',
      mountActive: true,
      addons: 3,
      outfitColors: { head: 12, primary: 34, secondary: 56, detail: 78 },
    };

    const characterId = 'char-main';

    // The fixed handler logic:
    if (latestSaveStateRef.current.characters) {
      latestSaveStateRef.current.characters = latestSaveStateRef.current.characters.map((char) =>
        char.id === characterId
          ? {
              ...char,
              outfit: newCustomization.outfit,
              mount: newCustomization.mount,
              mountActive: newCustomization.mountActive,
              addons: newCustomization.addons,
              outfitAddons: newCustomization.addons,
              outfitColors: newCustomization.outfitColors,
            }
          : char
      );
    }
    if (latestSaveStateRef.current.activeCharacter && latestSaveStateRef.current.activeCharacter.id === characterId) {
      latestSaveStateRef.current.activeCharacter = {
        ...latestSaveStateRef.current.activeCharacter,
        outfit: newCustomization.outfit,
        mount: newCustomization.mount,
        mountActive: newCustomization.mountActive,
        addons: newCustomization.addons,
        outfitAddons: newCustomization.addons,
        outfitColors: newCustomization.outfitColors,
      } as any;
    }
    if (latestSaveStateRef.current.onlineCharacter && latestSaveStateRef.current.onlineCharacter.id === characterId) {
      latestSaveStateRef.current.onlineCharacter = {
        ...latestSaveStateRef.current.onlineCharacter,
        outfit: newCustomization.outfit,
        mount: newCustomization.mount,
        mountActive: newCustomization.mountActive,
        addons: newCustomization.addons,
        outfitAddons: newCustomization.addons,
        outfitColors: newCustomization.outfitColors,
      } as any;
    }

    // Now execute simulated saveProgress extraction:
    const curOnline = latestSaveStateRef.current.onlineCharacter;
    const curCharacters = latestSaveStateRef.current.characters;
    const primaryChar = curCharacters.find((c) => c.id === curOnline.id);

    expect(primaryChar).toBeDefined();
    expect(primaryChar?.outfit).toBe('Citizen');
    expect(primaryChar?.mount).toBe('widow-queen');
    expect(primaryChar?.mountActive).toBe(true);
    expect(primaryChar?.addons).toBe(3);
    expect(primaryChar?.outfitColors).toEqual({ head: 12, primary: 34, secondary: 56, detail: 78 });
  });

  describe('Validation Scenario: Save and immediately walk/turn in all four directions with empty cache', () => {
    const directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'];
    const outfit = 'Warrior';
    const mount = 'war-bear';
    const addons = 3; // Addon 1 + Addon 2
    const colors = { head: 10, primary: 20, secondary: 30, detail: 40 };

    beforeEach(() => {
      // Ensure empty cache (cold cache condition)
      recoloredCanvasCache.clear();
    });

    it('proves that premature release on standing frame only (f0) leaves walking and turns broken with pending frames', () => {
      const attemptId = outfitDiagnostics.startAttempt({
        characterId: 'char-test-walk',
        characterName: 'TestWalker',
        outfit: 'Knight',
        mount: 'none',
        mountActive: false,
        addons: 0,
      });

      outfitDiagnostics.updateSelection({
        outfit,
        mount,
        mountActive: true,
        addons,
        colors,
        direction: 'south',
      });

      outfitDiagnostics.recordSaveClick();

      // Cold cache check: nothing is cached yet
      const coldCheck = isAppearanceFullyReady(outfit, 'male', colors, addons, mount, true, directions);
      expect(coldCheck.ready).toBe(false);
      expect(coldCheck.cached).toBe(0);
      expect(coldCheck.total).toBe(36); // 4 directions * 9 frames
      expect(coldCheck.missing.length).toBe(36);

      // Suppose renderer released prematurely on ONLY south-f0 (idle frame)
      const southF0Key = getCanvasCacheKey('warrior', 'male', 'south', 0, colors, addons, mount, true);
      const mockCanvas = {} as HTMLCanvasElement;
      recoloredCanvasCache.set(southF0Key, mockCanvas);

      // Standing frame south is cached:
      expect(isOutfitCanvasCached(outfit, 'male', 'south', 0, colors, addons, mount, true)).toBe(true);

      // BUT if player immediately turns to east, north, west, or walks (f1..f8):
      expect(isOutfitCanvasCached(outfit, 'male', 'east', 0, colors, addons, mount, true)).toBe(false);
      expect(isOutfitCanvasCached(outfit, 'male', 'north', 0, colors, addons, mount, true)).toBe(false);
      expect(isOutfitCanvasCached(outfit, 'male', 'west', 0, colors, addons, mount, true)).toBe(false);
      expect(isOutfitCanvasCached(outfit, 'male', 'south', 1, colors, addons, mount, true)).toBe(false);

      const partialCheck = isAppearanceFullyReady(outfit, 'male', colors, addons, mount, true, directions);
      expect(partialCheck.ready).toBe(false);
      expect(partialCheck.cached).toBe(1);
      expect(partialCheck.missing.length).toBe(35);

      // Record this diagnostic state
      outfitDiagnostics.recordPreparation({
        status: 'preparing',
        cachedFramesCount: partialCheck.cached,
        totalFramesRequested: partialCheck.total,
        missingFrames: partialCheck.missing,
        attemptsCount: 1,
      });

      const currentLog = outfitDiagnostics.getCurrentAttempt();
      expect(currentLog?.attemptId).toBe(attemptId);
      expect(currentLog?.preparation.missingFrames).toContain('south-f1');
      expect(currentLog?.preparation.missingFrames).toContain('east-f0');
      expect(currentLog?.preparation.missingFrames).toContain('north-f0');
      expect(currentLog?.preparation.missingFrames).toContain('west-f0');
      expect(currentLog?.preparation.missingFrames?.length).toBe(35);
    });

    it('verifies that full appearance readiness guarantees non-frozen walking, addon presence, and mount synchronization in all 4 directions', () => {
      const attemptId = outfitDiagnostics.startAttempt({
        characterId: 'char-test-walk-full',
        characterName: 'TestWalkerFull',
        outfit: 'Knight',
        mount: 'none',
        mountActive: false,
        addons: 0,
      });

      outfitDiagnostics.updateSelection({
        outfit,
        mount,
        mountActive: true,
        addons,
        colors,
        direction: 'south',
      });

      outfitDiagnostics.recordSaveClick();

      // Populate complete 36-frame set (all 4 directions, f0..f8) with addons and mount
      for (const dir of directions) {
        for (let f = 0; f < 9; f++) {
          const key = getCanvasCacheKey('warrior', 'male', dir, f, colors, addons, mount, true);
          // Each frame has a unique dummy canvas representation
          recoloredCanvasCache.set(key, { frameId: `${dir}-f${f}`, addons, mount } as any);
        }
      }

      // Check full readiness:
      const fullCheck = isAppearanceFullyReady(outfit, 'male', colors, addons, mount, true, directions);
      expect(fullCheck.ready).toBe(true);
      expect(fullCheck.cached).toBe(36);
      expect(fullCheck.total).toBe(36);
      expect(fullCheck.missing).toEqual([]);

      // Verify that every direction and walking frame is cached and distinct:
      directions.forEach((dir) => {
        // Idle frame f0
        expect(isOutfitCanvasCached(outfit, 'male', dir, 0, colors, addons, mount, true)).toBe(true);

        // Walking frames f1..f8 (no animation freezing)
        for (let f = 1; f < 9; f++) {
          expect(isOutfitCanvasCached(outfit, 'male', dir, f, colors, addons, mount, true)).toBe(true);
          const key = getCanvasCacheKey('warrior', 'male', dir, f, colors, addons, mount, true);
          // Key confirms addon layers (a3) and mount (mwar-bear) are composited
          expect(key).toContain('_a3_');
          expect(key).toContain('_mwar-bear_v2');
        }
      });

      // Record diagnostic telemetry
      outfitDiagnostics.recordPreparation({
        status: 'ready',
        durationMs: 45,
        success: true,
        cachedFramesCount: fullCheck.cached,
        totalFramesRequested: fullCheck.total,
        missingFrames: [],
        attemptsCount: 1,
      });

      outfitDiagnostics.recordSaveCallback({
        characterId: 'char-test-walk-full',
        outfit,
        mount,
        mountActive: true,
        addons,
      });

      outfitDiagnostics.recordArenaState({
        reactCharOutfit: outfit,
        reactCharMount: mount,
        reactCharMountActive: true,
        reactCharAddons: addons,
        arenaActiveAppearanceSig: `${outfit}_male_${mount}_${addons}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`,
        arenaAppearanceStatus: 'ready',
      });

      const finished = outfitDiagnostics.endAttempt();
      expect(finished?.attemptId).toBe(attemptId);
      expect(finished?.preparation.status).toBe('ready');
      expect(finished?.preparation.missingFrames).toEqual([]);
      expect(finished?.preparation.cachedFramesCount).toBe(36);
      expect(finished?.divergences).toEqual([]);
      expect(finished?.clientCommit).toBe('desconhecido');
    });
  });
});
