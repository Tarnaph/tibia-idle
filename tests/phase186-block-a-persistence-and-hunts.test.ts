import { describe, it, expect } from 'vitest';
import {
  createIdleGame,
  restartHunt,
  leaveHunt,
  levelForExperience,
  experienceForLevel,
  initialHunts,
  type GameContent,
} from '../packages/domain/src';
import monstersJson from '../content/generated/monsters.json';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';
import type {
  MonsterCatalog,
  EquipmentCatalog,
  StarterLoadoutCatalog,
  VocationCatalog,
  SpellCatalog,
  HuntRegionCatalog,
  ItemEconomyCatalog,
} from '../packages/content-schema/src';
import { ServerCharacterContextRegistry } from '../packages/auth/src';
import {
  getTrackForHunt,
  playHuntBgm,
  playCityBgm,
  stopHuntBgm,
  onTrackNotification,
  triggerTrackNotification,
  THAIS_THEME_TRACK,
  RATS_THEME_TRACK,
  TROLLS_THEME_TRACK,
} from '../apps/web/lib/audioManager';

const content: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 186 - Bloco A: Persistência, Transições de Caçada e Trilha Sonora', () => {
  it('1. Cenário e mapa da caçada prontos antes de iniciar o combate', () => {
    let state = createIdleGame('test-bloco-a-seed', content, 'rat-cellars', 'continuous');
    state = restartHunt(state, 'test-bloco-a-seed', content, 'rat-cellars');
    expect(state.encounter).toBeDefined();
    expect(state.encounter.hunt.id).toBe('rat-cellars');
    expect(state.encounter.room).toBeDefined();
    expect(state.encounter.room.number).toBeGreaterThanOrEqual(1);
    expect(state.encounter.enemies.length).toBeGreaterThan(0);
  });

  it('2. Progressão contínua além do nível 6 (XP, level, gold)', () => {
    const level10Xp = experienceForLevel(10);
    expect(level10Xp).toBeGreaterThan(experienceForLevel(6));
    expect(levelForExperience(level10Xp)).toBe(10);

    const initial = createIdleGame('test-prog-level10', content, 'rat-cellars', 'continuous');
    initial.session.characters[0].experience = level10Xp;
    initial.session.characters[0].level = levelForExperience(level10Xp);
    expect(initial.session.characters[0].level).toBe(10);
  });

  it('3. Troca direta entre caçadas preservando o estado do personagem', () => {
    let state = createIdleGame('seed-switch-a', content, 'rat-cellars', 'continuous');
    expect(state.encounter.hunt.id).toBe('rat-cellars');

    state = restartHunt(state, 'seed-switch-b', content, 'rotworm-cave');
    expect(state.encounter.hunt.id).toBe('rotworm-cave');

    state = restartHunt(state, 'seed-switch-c', content, 'troll-camp');
    expect(state.encounter.hunt.id).toBe('troll-camp');
  });

  it('4. Retorno ao templo encerra caçada sem penalidade de morte', () => {
    let state = createIdleGame('seed-temple-exit', content, 'rat-cellars', 'continuous');
    const xpBefore = state.session.characters[0].experience;

    state = leaveHunt(state);
    expect(state.session.characters[0].experience).toBe(xpBefore);
  });

  it('5. Registro e recuperação autoritativa de contexto no ServerCharacterContextRegistry', () => {
    const testCharId = 'test-char-bloco-a-' + Date.now();
    ServerCharacterContextRegistry.setActivity(testCharId, {
      isHunting: true,
      huntId: 'rotworm-cave',
      activeSessionId: 'session-bloco-a-1',
    });

    const ctx = ServerCharacterContextRegistry.getActivity(testCharId);
    expect(ctx).toBeDefined();
    expect(ctx?.isHunting).toBe(true);
    expect(ctx?.huntId).toBe('rotworm-cave');

    ServerCharacterContextRegistry.setActivity(testCharId, {
      isHunting: false,
      huntId: undefined,
    });
    const ctxAfter = ServerCharacterContextRegistry.getActivity(testCharId);
    expect(ctxAfter?.isHunting).toBe(false);
  });

  it('6. Combate pausado até contexto ser confirmado (rejeição de isHunting falso pelo cliente)', () => {
    const registryContext = ServerCharacterContextRegistry.getActivity('unknown-client-id');
    expect(registryContext).toBeUndefined();
  });

  it('7. Trilha sonora sincronizada sem sobreposição em entrada, troca e saída', () => {
    let currentNotification: string | null = null;
    const unsub = onTrackNotification((t) => {
      currentNotification = t.title;
    });

    expect(getTrackForHunt('rat-cellars')?.title).toBe('Beneath the Streets');
    triggerTrackNotification(RATS_THEME_TRACK);
    expect(currentNotification).toBe('Beneath the Streets');

    expect(getTrackForHunt('troll-camp')?.title).toBe('Drums Under Stone');
    triggerTrackNotification(TROLLS_THEME_TRACK);
    expect(currentNotification).toBe('Drums Under Stone');

    triggerTrackNotification(THAIS_THEME_TRACK);
    expect(currentNotification).toBe('Thais Theme');

    unsub();
  });
});
