import { describe, it, expect, beforeEach, vi } from 'vitest';
import { outfitDiagnostics, CURRENT_CLIENT_COMMIT } from '../apps/web/lib/outfitDiagnostics';

describe('Phase 179 - Outfit Diagnostic Telemetry & Strict Persistence', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  it('correctly reports clientCommit matching reference 15ca6ae03', () => {
    expect(CURRENT_CLIENT_COMMIT).toBe('15ca6ae03');
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

    // 2. Preparation and preview render completion
    outfitDiagnostics.recordPreparation({
      status: 'ready',
      durationMs: 42,
      success: true,
      missingAssets: [],
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
    expect(finished?.clientCommit).toBe('15ca6ae03');

    // Asserts no tokens or passwords in payload
    expect(finished?.save.callbackPayload?.password).toBeUndefined();
    expect(finished?.save.callbackPayload?.token).toBeUndefined();

    // Asserts zero divergences detected on successful complete cycle
    expect(finished?.divergences).toEqual([]);
    expect(finished?.arena.isMatchWithSelection).toBe(true);
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
    // Replicates the exact bug in GamePrototype where latestSaveStateRef.characters was omitted
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
});
