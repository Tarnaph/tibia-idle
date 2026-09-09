import { describe, expect, it } from 'vitest';
import { createIdleGame, getHuntWorldEntrance, huntById, isHuntAvailable, roomDefinitionAt } from '../packages/domain/src';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import economyJson from '../content/generated/item-economy.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '../packages/content-schema/src';

const gameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: [
    {
      id: 'rat-cellars', name: 'Rat Cellars', description: 'Porão e esgoto.', recommendedLevel: 1, minimumLevel: 1, monsters: ['rat'], rewardProfile: 'xp' as const, status: 'available' as const, roomDefinitions: ['rat-cellars-wave-1'], environment: { regionId: 'rat-cellars', label: 'Porão', source: 'realmap11-otbm' as const }, waves: []
    },
    {
      id: 'spider-burrow', name: 'Spider Burrow', description: 'Caverna úmida.', recommendedLevel: 4, minimumLevel: 1, monsters: ['spider'], rewardProfile: 'xp' as const, status: 'unavailable' as const, roomDefinitions: ['spider-burrow-wave-1'], environment: { regionId: 'spider-burrow', label: 'Caverna úmida', source: 'realmap11-otbm' as const }, waves: []
    },
    {
      id: 'troll-camp', name: 'Troll Camp', description: 'Troll camp.', recommendedLevel: 7, minimumLevel: 1, monsters: ['troll'], rewardProfile: 'xp' as const, status: 'available' as const, roomDefinitions: ['troll-camp-wave-1'], environment: { regionId: 'troll-camp', label: 'Troll camp', source: 'realmap11-otbm' as const }, waves: []
    },
    {
      id: 'old-crypt', name: 'Old Crypt', description: 'Old crypt.', recommendedLevel: 10, minimumLevel: 1, monsters: ['skeleton'], rewardProfile: 'xp' as const, status: 'available' as const, roomDefinitions: ['old-crypt-wave-1'], environment: { regionId: 'old-crypt', label: 'Cripta', source: 'realmap11-otbm' as const }, waves: []
    },
    {
      id: 'rotworm-cave', name: 'Rotworm Cave', description: 'Rotworm cave.', recommendedLevel: 12, minimumLevel: 1, monsters: ['rotworm'], rewardProfile: 'xp' as const, status: 'available' as const, roomDefinitions: ['rotworm-cave-wave-1'], environment: { regionId: 'rotworm-cave', label: 'Rotworm cave', source: 'realmap11-otbm' as const }, waves: []
    },
    {
      id: 'dragon-lair', name: 'Dragon Lair', description: 'Dragon lair.', recommendedLevel: 45, minimumLevel: 25, monsters: ['dragon'], rewardProfile: 'xp' as const, status: 'available' as const, roomDefinitions: ['dragon-lair-wave-1'], environment: { regionId: 'dragon-lair', label: 'Dragon lair', source: 'realmap11-otbm' as const }, waves: []
    },
  ],
  rateSkill: 1,
  rateMagic: 1,
};

describe('Phase 84: Hunt Regions Availability and Startup Regression Test', () => {
  it('allows application boot without crashing when loading default game state', () => {
    const game = createIdleGame('test-seed', gameContent);
    expect(game).toBeDefined();
    expect(game.session.characters.length).toBeGreaterThan(0);
    expect(game.encounter.hunt.id).toBe('rat-cellars');
  });

  it('validates walkability and entry points for all 5 active hunt regions', () => {
    const activeHunts = ['rat-cellars', 'troll-camp', 'old-crypt', 'rotworm-cave', 'dragon-lair'];
    for (const huntId of activeHunts) {
      const hunt = huntById(gameContent.hunts, huntId);
      const region = gameContent.huntRegions.find((r) => r.huntId === huntId);
      expect(region).toBeDefined();
      expect(isHuntAvailable(hunt, region)).toBe(true);

      const entrance = getHuntWorldEntrance(huntId, gameContent);
      expect(entrance.isWalkable).toBe(true);
      expect(entrance.isInsideMap).toBe(true);

      const room = roomDefinitionAt(hunt, 0, region);
      expect(room.map.tiles.filter((t) => t.walkable).length).toBeGreaterThanOrEqual(8);
    }
  });

  it('correctly marks spider-burrow as unavailable and prevents room generation', () => {
    const hunt = huntById(gameContent.hunts, 'spider-burrow');
    const region = gameContent.huntRegions.find((r) => r.huntId === 'spider-burrow');
    expect(isHuntAvailable(hunt, region)).toBe(false);

    const entrance = getHuntWorldEntrance('spider-burrow', gameContent);
    expect(entrance.isWalkable).toBe(false);

    expect(() => roomDefinitionAt(hunt, 0, region)).toThrow(/temporariamente indisponível/);
  });
});
