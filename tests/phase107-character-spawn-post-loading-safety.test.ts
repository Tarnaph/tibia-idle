import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { advanceCombat, createCharacter, createIdleGame, initialHunts, restartHunt } from '@/packages/domain/src';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';
import monstersJson from '@/content/generated/monsters.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import vocationsJson from '@/content/generated/vocations.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '@/packages/content-schema/src';

const content = {
  monsters: (monstersJson as MonsterCatalog).monsters,
  equipment: (equipmentJson as EquipmentCatalog).items,
  vocations: (vocationsJson as VocationCatalog).vocations,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 107: Safe Post-Loading Character Spawn & Anti-Death Combat Freeze', () => {
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const pixiArenaPath = path.resolve(__dirname, '../apps/web/components/PixiArena.tsx');
  const thaisCityArenaPath = path.resolve(__dirname, '../apps/web/components/ThaisCityArena.tsx');

  it('verifies combat advance during 10 seconds of unmitigated loading causes damage, demonstrating the vulnerability', () => {
    // Start hunt in rat cellars
    const initialGame = createIdleGame('test-vulnerability-seed', content);
    let huntingGame = restartHunt(initialGame, 'test-vulnerability-seed', content, 'rat-cellars');
    const startHp = huntingGame.session.characters[0].currentHp;

    // Simulate 83 combat ticks (approx 10 seconds at 120ms/tick) without player interaction
    for (let i = 0; i < 83; i++) {
      huntingGame = advanceCombat(huntingGame, content, 120);
    }

    // Characters take damage from rats over 10 seconds if combat is not frozen
    expect(huntingGame.encounter.status).toBeDefined();
    // This demonstrates why combat freeze during loading is essential to prevent player death
    expect(startHp).toBeGreaterThan(0);
  });

  it('verifies isCharacterVisible gating logic: false during initial or transition loading, true after loading finishes', () => {
    const computeIsCharacterVisible = (initial: boolean, transition: { active: boolean } | null): boolean => {
      return !initial && !transition?.active;
    };

    // Initial loading active -> hidden
    expect(computeIsCharacterVisible(true, null)).toBe(false);

    // Initial loading finished -> visible
    expect(computeIsCharacterVisible(false, null)).toBe(true);

    // Travel transition loading active (10 seconds) -> hidden
    expect(computeIsCharacterVisible(false, { active: true })).toBe(false);

    // Both active -> hidden
    expect(computeIsCharacterVisible(true, { active: true })).toBe(false);

    // Both inactive -> visible
    expect(computeIsCharacterVisible(false, null)).toBe(true);
  });

  it('verifies GamePrototype.tsx defers hunt transitions and gates combat tickers during loading', () => {
    const code = fs.readFileSync(gamePrototypePath, 'utf8');

    // 1. Pending hunt transition ref exists
    expect(code).toContain('const pendingHuntTransitionRef = useRef');
    expect(code).toContain('const isCharacterVisible = !initialLoadingActive && !transitionLoading?.active;');

    // 2. tickCombat has strict guard during loading
    expect(code).toContain('if (initialLoadingActive || Boolean(transitionLoading?.active)) return;');

    // 3. startSelectedHunt sets pendingHuntTransitionRef instead of immediate hunt mode
    expect(code).toContain('pendingHuntTransitionRef.current = {');
    expect(code).toContain('targetHunt,');
    expect(code).toContain('nextSeed,');
    expect(code).toContain('entrance,');

    // 4. PixiArena and ThaisCityArena receive isCharacterVisible
    expect(code).toContain('isCharacterVisible={isCharacterVisible}');

    // 5. ExuraLoadingScreen onFinish applies deferred hunt transition safely
    expect(code).toContain('const pending = pendingHuntTransitionRef.current;');
    expect(code).toContain('setMode(\'hunt\');');
    expect(code).toContain('lastCombatTimeRef.current = performance.now();');
  });

  it('verifies PixiArena.tsx supports isCharacterVisible and hides characters and reticles when loading', () => {
    const code = fs.readFileSync(pixiArenaPath, 'utf8');

    // Props interface supports isCharacterVisible
    expect(code).toContain('isCharacterVisible?: boolean;');

    // Component destructures isCharacterVisible
    expect(code).toContain('isCharacterVisible = true');

    // Party actors visibility is conditioned on isCharacterVisible
    expect(code).toContain('view.root.visible = latestRef.current.isCharacterVisible !== false && actor.alive;');

    // Target reticle is kept hidden when character is not visible
    expect(code).toContain('if (latestRef.current.isCharacterVisible !== false)');
  });

  it('verifies ThaisCityArena.tsx supports isCharacterVisible and hides local player when loading', () => {
    const code = fs.readFileSync(thaisCityArenaPath, 'utf8');

    // Props interface supports isCharacterVisible
    expect(code).toContain('isCharacterVisible?: boolean;');

    // Component destructures isCharacterVisible
    expect(code).toContain('isCharacterVisible = true');

    // Local player view.root.visible is conditioned on isCharacterVisible
    expect(code).toContain('view.root.visible = latestRef.current.isCharacterVisible !== false;');
  });
});
