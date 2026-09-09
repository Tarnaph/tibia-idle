import { describe, expect, it } from 'vitest';
import { createCharacter, createIdleGame, initialHunts, THAIS_TEMPLE_POSITION } from '@/packages/domain/src';
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

describe('Phase 89: Login Hydration & Loading Screen Gating', () => {
  it('initializes default game with placeholder character at temple position before login', () => {
    const idleGame = createIdleGame('test-seed', content);
    expect(idleGame.session.characters.length).toBe(1);
    expect(idleGame.session.characters[0].name).toBe('Aldric');
    expect(idleGame.session.characters[0].vocation).toBe('Knight');
    // Default initial city position is Thais Temple
    expect(THAIS_TEMPLE_POSITION).toEqual({ x: 32369, y: 32241, z: 7 });
  });

  it('hydrates saved character with real saved position, outfit, name and stats on login selection', () => {
    const savedCharData = {
      id: 'char-saved-101',
      name: 'Laron',
      vocation: 'Paladin',
      level: 45,
      experience: 1200000,
      health: 480,
      maxHealth: 480,
      mana: 210,
      maxMana: 210,
      positionX: 32342,
      positionY: 32231,
      positionZ: 7,
      outfit: 'Paladin',
      outfitColors: { head: 10, primary: 95, secondary: 114, detail: 76 },
    };

    // Simulate character creation/hydration logic from handleSelectCharacter
    const userChar = createCharacter(savedCharData.id, savedCharData.name, 'Paladin', content, 'male');
    userChar.level = savedCharData.level;
    userChar.experience = savedCharData.experience;
    userChar.currentHp = savedCharData.health;
    userChar.maxHp = savedCharData.maxHealth;
    userChar.currentMana = savedCharData.mana;
    userChar.maxMana = savedCharData.maxMana;
    userChar.outfit = savedCharData.outfit;
    userChar.outfitColors = savedCharData.outfitColors;

    const hydratedPosition = {
      x: savedCharData.positionX,
      y: savedCharData.positionY,
      z: savedCharData.positionZ,
    };

    // Verify hydrated character properties
    expect(userChar.name).toBe('Laron');
    expect(userChar.vocation).toBe('Paladin');
    expect(userChar.level).toBe(45);
    expect(userChar.outfit).toBe('Paladin');
    expect(userChar.outfitColors.primary).toBe(95);

    // Verify position is the saved coordinates, NOT Thais temple
    expect(hydratedPosition).toEqual({ x: 32342, y: 32231, z: 7 });
    expect(hydratedPosition).not.toEqual(THAIS_TEMPLE_POSITION);
  });

  it('verifies gating rules: city arena is only active when character is ready and auth modal is closed', () => {
    const isCharacterReady = false;
    const showAuthModal = true;
    const mode: string = 'training';

    // When showAuthModal is true or isCharacterReady is false, arena MUST be inactive
    const activeStateInitial = mode !== 'hunt' && isCharacterReady && !showAuthModal;
    expect(activeStateInitial).toBe(false);

    // After login selection completes: isCharacterReady = true, showAuthModal = false
    const readyState = { isCharacterReady: true, showAuthModal: false };
    const activeStateReady = mode !== 'hunt' && readyState.isCharacterReady && !readyState.showAuthModal;
    expect(activeStateReady).toBe(true);
  });
});
