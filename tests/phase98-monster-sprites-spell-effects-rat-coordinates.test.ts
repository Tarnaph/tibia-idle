import { describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import visualAssetsJson from '../content/generated/tibia1098-assets.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import { createIdleGame, initialHunts } from '../packages/domain/src';
import { ALL_SPELL_ICON_URLS, resolveActionImagePath } from '../apps/web/components/Tibia11ActionIcon';
import monstersJson from '../content/generated/monsters.json';
import equipmentJson from '../content/generated/equipment.json';
import vocationsJson from '../content/generated/vocations.json';
import startersJson from '../content/generated/starter-loadouts.json';
import economyJson from '../content/generated/item-economy.json';

const contentFixture: any = {
  hunts: initialHunts,
  huntRegions: huntRegionsJson.regions,
  monsters: monstersJson.monsters,
  equipment: equipmentJson.items,
  vocations: vocationsJson.vocations,
  starterLoadouts: startersJson.loadouts,
  spells: spellsJson.spells,
  economy: economyJson,
};

describe('Phase 98: Monster Sprites, Tibia 11 Spell Icons & Effects, and Rat Hunt Coordinates', () => {
  describe('Pillar 1: Authentic Monster Sprites and 32x32 Centered Thumbnails', () => {
    const requiredMonsters = [
      { id: 'rat', name: 'Rat', lookType: 21 },
      { id: 'cave-rat', name: 'Cave Rat', lookType: 56 },
      { id: 'spider', name: 'Spider', lookType: 30 },
      { id: 'bug', name: 'Bug', lookType: 45 },
      { id: 'poison-spider', name: 'Poison Spider', lookType: 36 },
      { id: 'troll', name: 'Troll', lookType: 15 },
      { id: 'swamp-troll', name: 'Swamp Troll', lookType: 76 },
      { id: 'rotworm', name: 'Rotworm', lookType: 26 },
      { id: 'skeleton', name: 'Skeleton', lookType: 33 },
      { id: 'minotaur', name: 'Minotaur', lookType: 25 },
      { id: 'dwarf', name: 'Dwarf', lookType: 69 },
      { id: 'carrion-worm', name: 'Carrion Worm', lookType: 205 },
      { id: 'dragon', name: 'Dragon', lookType: 34 },
    ];

    it('has valid sprite mappings and generated 32x32 thumbnails for all 13 creatures', () => {
      const creatures = (visualAssetsJson as any).creatures;
      expect(creatures).toBeDefined();

      for (const m of requiredMonsters) {
        const mapping = creatures[m.id];
        expect(mapping, `Creature mapping missing for ${m.id}`).toBeDefined();
        expect(mapping.frames.length).toBeGreaterThan(0);
        expect(mapping.thumbUrl).toBe(`/generated/tibia1098/monster-${m.id}-thumb.png`);

        // Verify that the physical file exists in public/
        const filePath = resolve(process.cwd(), `public${mapping.thumbUrl}`);
        expect(existsSync(filePath), `Physical thumbnail missing at ${filePath}`).toBe(true);
      }
    });

    it('verifies Rotworm and Aldric have valid thumbnails in the asset catalog', () => {
      const assets = (visualAssetsJson as any).assets;
      expect(assets.rotworm.thumbUrl).toBe('/generated/tibia1098/rotworm-thumb.png');
      expect(assets.aldric.thumbUrl).toBe('/generated/tibia1098/aldric-thumb.png');

      expect(existsSync(resolve(process.cwd(), 'public/generated/tibia1098/rotworm-thumb.png'))).toBe(true);
      expect(existsSync(resolve(process.cwd(), 'public/generated/tibia1098/aldric-thumb.png'))).toBe(true);
    });
  });

  describe('Pillar 2: Canonical Tibia 11 Spell Icons', () => {
    it('contains all 146 canonical 32x32 Tibia 11 spell icons on disk', () => {
      expect(ALL_SPELL_ICON_URLS.length).toBeGreaterThanOrEqual(146);
      for (let i = 0; i <= 145; i++) {
        const path = resolve(process.cwd(), `public/spells/canonical/spell-${i}.png`);
        expect(existsSync(path), `Canonical spell icon missing: spell-${i}.png`).toBe(true);
      }
    });

    it('resolves valid existing image files for Knight, Paladin, Sorcerer, and Druid spells', () => {
      const testSpells = [
        { id: 'exori-ico', words: 'exori ico' },
        { id: 'exori-gran-ico', words: 'exori gran ico' },
        { id: 'utito-tempo', words: 'utito tempo' },
        { id: 'exura-gran-san', words: 'exura gran san' },
        { id: 'exori-con', words: 'exori con' },
        { id: 'exori-gran-con', words: 'exori gran con' },
        { id: 'utito-tempo-san', words: 'utito tempo san' },
        { id: 'exori-flam', words: 'exori flam' },
        { id: 'exevo-gran-mas-flam', words: 'exevo gran mas flam' },
        { id: 'exura-sio', words: 'exura sio' },
        { id: 'exevo-gran-mas-frigo', words: 'exevo gran mas frigo' },
      ];

      for (const spell of testSpells) {
        const imgPath = resolveActionImagePath(spell.id, 'spell', spell.words);
        expect(imgPath).toBeDefined();
        const physical = resolve(process.cwd(), `public${imgPath}`);
        expect(existsSync(physical), `Spell icon missing on disk: ${imgPath}`).toBe(true);
      }
    });
  });

  describe('Pillar 3: Spell Effects & Projectiles from RealMap const.h', () => {
    it('associates authentic effectId and projectileId from realmap11/src/const.h', () => {
      const spells = (spellsJson as any).spells;
      expect(spells.length).toBeGreaterThan(0);

      // Terra Strike: CONST_ME_CARNIPHILA (47), CONST_ANI_SMALLEARTH (39)
      const terraStrike = spells.find((s: any) => s.words === 'exori tera');
      expect(terraStrike).toBeDefined();
      expect(terraStrike.visual.effectId).toBe(47);
      expect(terraStrike.visual.projectileId).toBe(39);

      // Ice Strike: CONST_ME_ICEATTACK (44), CONST_ANI_SMALLICE (37)
      const iceStrike = spells.find((s: any) => s.words === 'exori frigo');
      expect(iceStrike).toBeDefined();
      expect(iceStrike.visual.effectId).toBe(44);
      expect(iceStrike.visual.projectileId).toBe(37);

      // Flame Strike: CONST_ME_FIREATTACK (37), CONST_ANI_FIRE (4)
      const flameStrike = spells.find((s: any) => s.words === 'exori flam');
      expect(flameStrike).toBeDefined();
      expect(flameStrike.visual.effectId).toBe(37);
      expect(flameStrike.visual.projectileId).toBe(4);

      // Energy Strike: CONST_ME_ENERGYAREA (38), CONST_ANI_ENERGY (5)
      const energyStrike = spells.find((s: any) => s.words === 'exori vis');
      expect(energyStrike).toBeDefined();
      expect(energyStrike.visual.effectId).toBe(38);
      expect(energyStrike.visual.projectileId).toBe(5);

      // Light Healing (exura): CONST_ME_MAGIC_BLUE (13)
      const lightHealing = spells.find((s: any) => s.words === 'exura');
      expect(lightHealing).toBeDefined();
      expect(lightHealing.visual.effectId).toBe(13);

      // Total count of spells with effects should be high (canonical import)
      const withEffects = spells.filter((s: any) => s.visual?.effectId !== null && s.visual?.effectId > 0);
      expect(withEffects.length).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Pillar 4: Rat Hunt RealMap Coordinates (32102, 32205, 8)', () => {
    it('initializes rat-cellars at strictly (32102, 32205, 8)', () => {
      const ratRegion = (huntRegionsJson as any).regions.find((r: any) => r.huntId === 'rat-cellars');
      expect(ratRegion, 'rat-cellars region not found in hunt-regions.json').toBeDefined();

      // Rat Cellars region bounds in RealMap
      expect(ratRegion.bounds).toEqual({
        x: 32077,
        y: 32180,
        z: 8,
        width: 51,
        height: 51,
      });

      // Local player spawn position is (25, 25, 8) inside the region
      const game = createIdleGame('test-rat-coords', contentFixture, 'rat-cellars');
      const actor = game.encounter.partyActors[0];
      expect(actor).toBeDefined();
      expect(actor.position).toEqual({ x: 25, y: 25, z: 8 });

      // Global RealMap coordinate calculation:
      const worldX = ratRegion.bounds.x + actor.position.x;
      const worldY = ratRegion.bounds.y + actor.position.y;
      const worldZ = actor.position.z;

      expect(worldX).toBe(32102);
      expect(worldY).toBe(32205);
      expect(worldZ).toBe(8);

      // The spawn tile in the room map exists, is walkable and has authentic tiles
      const roomTile = game.encounter.room.map.tiles.find(
        (t) => t.position.x === actor.position.x && t.position.y === actor.position.y
      );
      expect(roomTile).toBeDefined();
      expect(roomTile?.walkable).toBe(true);
      expect(roomTile?.serverItemIds?.length).toBeGreaterThan(0);
    });
  });
});
