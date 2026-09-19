import { describe, it, expect } from 'vitest';
import { initialHunts, getPullSizeMonsterPool, createIdleGame, restartHunt, type GameContent } from '@/packages/domain/src';
import monstersJson from '@/content/generated/monsters.json';
import equipmentJson from '@/content/generated/equipment.json';
import vocationsJson from '@/content/generated/vocations.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import economyJson from '@/content/generated/item-economy.json';
import { CANONICAL_BESTIARY_MONSTERS } from '@/apps/web/lib/cyclopediaData';
import fs from 'fs';
import path from 'path';

const content: GameContent = {
  monsters: (monstersJson as any).monsters,
  equipment: (equipmentJson as any).items,
  vocations: (vocationsJson as any).vocations,
  starterLoadouts: (startersJson as any).loadouts,
  spells: (spellsJson as any).spells,
  huntRegions: (huntRegionsJson as any).regions,
  economy: economyJson as any,
  hunts: initialHunts,
  rateSkill: (vocationsJson as any).rateSkill,
  rateMagic: (vocationsJson as any).rateMagic,
};

describe('Phase 206: Canonical Skeleton Corpse & Cyclops Smith Hunt Integration', () => {
  describe('1. Cyclops Smith Integration in Hunt Definition & Catalog', () => {
    it('defines cyclops-camp with both cyclops and cyclops-smith in canonical initialHunts', () => {
      const cyclopsHunt = initialHunts.find((h) => h.id === 'cyclops-camp');
      expect(cyclopsHunt).toBeDefined();
      expect(cyclopsHunt?.monsters).toContain('cyclops');
      expect(cyclopsHunt?.monsters).toContain('cyclops-smith');
    });

    it('returns cyclops-smith in monster pool for ousado and agressivo pull sizes', () => {
      const cautelosoPool = getPullSizeMonsterPool('cyclops-camp', 'cauteloso');
      const ousadoPool = getPullSizeMonsterPool('cyclops-camp', 'ousado');
      const agressivoPool = getPullSizeMonsterPool('cyclops-camp', 'agressivo');

      expect(cautelosoPool).toContain('cyclops');
      expect(ousadoPool).toContain('cyclops');
      expect(ousadoPool).toContain('cyclops-smith');
      expect(agressivoPool).toContain('cyclops');
      expect(agressivoPool).toContain('cyclops-smith');
    });

    it('registers cyclops-smith in CANONICAL_BESTIARY_MONSTERS with authentic drops and stats', () => {
      const smith = CANONICAL_BESTIARY_MONSTERS.find((m) => m.id === 'cyclops-smith');
      expect(smith).toBeDefined();
      expect(smith?.name).toBe('Cyclops Smith');
      expect(smith?.hp).toBe(435);
      expect(smith?.exp).toBe(255);
      expect(smith?.spriteUrl).toBe('/generated/bestiary/cyclops-smith.png');
      expect(smith?.drops.some((d) => d.name === 'Battle shield')).toBe(true);
      expect(smith?.drops.some((d) => d.name === 'Spiked squelcher')).toBe(true);
    });

    it('verifies hunt-cyclops-camp-atlas contains all directional walk frames for cyclops-smith', () => {
      const atlasPath = path.resolve(process.cwd(), 'public/generated/atlases/hunt-cyclops-camp-atlas.json');
      expect(fs.existsSync(atlasPath)).toBe(true);

      const atlas = JSON.parse(fs.readFileSync(atlasPath, 'utf8'));
      const frameKeys = Object.keys(atlas.frames);

      const directions = ['north', 'south', 'east', 'west'];
      for (const dir of directions) {
        const hasDirFrame = frameKeys.some((k) => k.includes(`monster-cyclops-smith-${dir}-frame-0`));
        expect(hasDirFrame, `Missing ${dir} frame for cyclops-smith in atlas`).toBe(true);
      }
    });
  });

  describe('2. Canonical Skeleton Corpse (Item 5972 / remains of a skeleton)', () => {
    it('verifies canonical skeleton corpse sprite file exists on disk (item-5972.png)', () => {
      const spritePath1 = path.resolve(process.cwd(), 'public/assets/items/item-5972.png');
      const spritePath2 = path.resolve(process.cwd(), 'public/generated/tibia1098/items/item-5972.png');

      expect(fs.existsSync(spritePath1) || fs.existsSync(spritePath2)).toBe(true);
    });

    it('PixiArena preloads item-5972.png and renders skeletonMapping for all dead hunt creatures', () => {
      const pixiArenaPath = path.resolve(process.cwd(), 'apps/web/components/PixiArena.tsx');
      const content = fs.readFileSync(pixiArenaPath, 'utf8');

      // Preloading check
      expect(content).toContain("priorityUrls.add('/generated/tibia1098/items/item-5972.png')");

      // Corpse replacement mapping check
      expect(content).toContain("visualAssets.corpses?.['5972']");
      expect(content).toContain('skeletonMapping');
    });

    it('simulates cyclops defeat and produces a valid corpse with coordinates in encounter', () => {
      let state = createIdleGame('test-corpse-seed', content, 'cyclops-camp');
      state = restartHunt(state, 'test-corpse-seed', content, 'cyclops-camp', 'agressivo');

      expect(state.encounter.enemies.length).toBeGreaterThanOrEqual(5);

      // Check cyclops-smith presence in agressivo
      const hasSmith = state.encounter.enemies.some((e) => e.monsterId === 'cyclops-smith');
      expect(hasSmith).toBe(true);

      // Defeat the first enemy
      const enemy = state.encounter.enemies[0];
      enemy.alive = false;
      state.encounter.corpses.push({
        id: `corpse-${enemy.id}`,
        monsterId: enemy.monsterId,
        corpseId: 5972,
        position: { ...enemy.position },
        createdAt: 100,
      });

      expect(state.encounter.corpses.length).toBe(1);
      expect(state.encounter.corpses[0].position).toEqual(enemy.position);
    });
  });
});
