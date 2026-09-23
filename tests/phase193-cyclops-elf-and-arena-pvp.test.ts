import { describe, it, expect } from 'vitest';
import { initialHunts, huntById } from '../packages/domain/src/hunt';
import {
  PVP_POINTS_PER_WIN,
  PVP_POINTS_PER_RANK,
  PVP_TIERS,
  PVP_ARENA_SPAWNS,
  getPvPTierInfo,
  canDisplaySkull,
  getNextRankProgress,
  checkRankPromotion,
  calculatePointsDelta,
} from '../packages/domain/src/pvp';
import { huntConfigs } from '../packages/realmap11-importer/src/importHuntRegions';
import { getLoadingConfigForHunt } from '../apps/web/lib/loadingConfig';
import { getTrackForHunt } from '../apps/web/lib/audioManager';
import fs from 'fs';
import path from 'path';

describe('Phase 193: Cyclops and Elf Hunts + Map-based Live PvP Arena', () => {
  describe('1. Hunt Coordinates and Map Extraction', () => {
    it('defines cyclops-camp in importer with exact FIX.md coordinates [32416, 32041, 8]', () => {
      const cyclopsDef = huntConfigs.find((h) => h.huntId === 'cyclops-camp');
      expect(cyclopsDef).toBeDefined();
      expect(cyclopsDef?.center).toEqual([32416, 32041, 8]);
      expect(cyclopsDef?.available).toBe(true);
    });

    it('defines elf-sanctuary in importer with canonical fortress coordinates', () => {
      const elfDef = huntConfigs.find((h) => h.huntId === 'elf-sanctuary');
      expect(elfDef).toBeDefined();
      expect(elfDef?.center).toEqual([33089, 32155, 7]);
      expect(elfDef?.available).toBe(true);
    });

    it('defines pvp-arena region with center [33136, 32969, 8]', () => {
      const pvpDef = huntConfigs.find((h) => h.huntId === 'pvp-arena');
      expect(pvpDef).toBeDefined();
      expect(pvpDef?.center).toEqual([33136, 32969, 8]);
    });

    it('verifies hunt-regions.json contains extracted tiles for cyclops-camp and elf-sanctuary', () => {
      const huntRegionsPath = path.resolve(__dirname, '../content/generated/hunt-regions.json');
      expect(fs.existsSync(huntRegionsPath)).toBe(true);
      const json = JSON.parse(fs.readFileSync(huntRegionsPath, 'utf8'));
      const cyclops = json.regions.find((r: any) => r.huntId === 'cyclops-camp');
      const elf = json.regions.find((r: any) => r.huntId === 'elf-sanctuary');

      expect(cyclops).toBeDefined();
      expect(cyclops.tiles.length).toBeGreaterThan(50);
      expect(elf).toBeDefined();
      expect(elf.tiles.length).toBeGreaterThan(50);
    });

    it('includes cyclops-camp and elf-sanctuary in domain initialHunts', () => {
      const cyclops = huntById(initialHunts, 'cyclops-camp');
      expect(cyclops).toBeDefined();
      expect(cyclops.status).toBe('available');
      expect(cyclops.monsters).toContain('cyclops');

      const elf = huntById(initialHunts, 'elf-sanctuary');
      expect(elf).toBeDefined();
      expect(elf.status).toBe('available');
      expect(elf.monsters).toContain('elf');
    });
  });

  describe('2. PvP Arena Progression, Skulls and Gated Toggle', () => {
    it('sets +20 points per win and 250 points per rank tier', () => {
      expect(PVP_POINTS_PER_WIN).toBe(20);
      expect(PVP_POINTS_PER_RANK).toBe(250);
      expect(calculatePointsDelta('win')).toBe(20);
      expect(calculatePointsDelta('loss')).toBe(0);
      expect(calculatePointsDelta('draw')).toBe(5);
    });

    it('gates skull display until Rank 1 (250 points)', () => {
      expect(canDisplaySkull(0)).toBe(false);
      expect(canDisplaySkull(100)).toBe(false);
      expect(canDisplaySkull(249)).toBe(false);
      expect(canDisplaySkull(250)).toBe(true);
      expect(canDisplaySkull(500)).toBe(true);
    });

    it('maps points to exact canonical skull tiers', () => {
      // 0-249: Iniciante (no skull)
      const rank0 = getPvPTierInfo(0);
      expect(rank0.tier).toBe('Iniciante');
      expect(rank0.skull).toBe('none');

      // 250-499: Bronze (green skull)
      const rank1 = getPvPTierInfo(250);
      expect(rank1.tier).toBe('Bronze');
      expect(rank1.skull).toBe('green');
      expect(rank1.skullAsset).toBe('/assets/skulls/skull-green.png');

      // 500-749: Prata (yellow skull)
      const rank2 = getPvPTierInfo(500);
      expect(rank2.tier).toBe('Prata');
      expect(rank2.skull).toBe('yellow');
      expect(rank2.skullAsset).toBe('/assets/skulls/skull-yellow.png');

      // 750-999: Ouro (white skull)
      const rank3 = getPvPTierInfo(750);
      expect(rank3.tier).toBe('Ouro');
      expect(rank3.skull).toBe('white');
      expect(rank3.skullAsset).toBe('/assets/skulls/skull-white.png');

      // 1000-1249: Platina (red skull)
      const rank4 = getPvPTierInfo(1000);
      expect(rank4.tier).toBe('Platina');
      expect(rank4.skull).toBe('red');
      expect(rank4.skullAsset).toBe('/assets/skulls/skull-red.png');

      // 1250-1499: Diamante (black skull)
      const rank5 = getPvPTierInfo(1250);
      expect(rank5.tier).toBe('Diamante');
      expect(rank5.skull).toBe('black');
      expect(rank5.skullAsset).toBe('/assets/skulls/skull-black.png');

      // 1500+: Desafiante (orange skull)
      const rank6 = getPvPTierInfo(1500);
      expect(rank6.tier).toBe('Desafiante');
      expect(rank6.skull).toBe('orange');
      expect(rank6.skullAsset).toBe('/assets/skulls/skull-orange.png');
    });

    it('accurately calculates next rank progress and remaining points', () => {
      const p1 = getNextRankProgress(100);
      expect(p1.currentRank).toBe(0);
      expect(p1.nextRankPoints).toBe(250);
      expect(p1.pointsNeeded).toBe(150);

      const p2 = getNextRankProgress(250);
      expect(p2.currentRank).toBe(1);
      expect(p2.nextRankPoints).toBe(500);
      expect(p2.pointsNeeded).toBe(250);
    });

    it('detects promotions and returns celebration metadata', () => {
      // Crossing from 240 to 260 triggers promotion to Rank 1 (Bronze)
      const promo1 = checkRankPromotion(240, 260);
      expect(promo1).not.toBeNull();
      expect(promo1?.promoted).toBe(true);
      expect(promo1?.oldTier.tier).toBe('Iniciante');
      expect(promo1?.newTier.tier).toBe('Bronze');
      expect(promo1?.nextGoalPoints).toBe(500);

      // Remaining in same tier returns null
      const noPromo = checkRankPromotion(250, 270);
      expect(noPromo).toBeNull();
    });

    it('configures exact FIX.md duel spawn coordinates', () => {
      expect(PVP_ARENA_SPAWNS[0]).toEqual({ id: 1, x: 33136, y: 32965, z: 8 });
      expect(PVP_ARENA_SPAWNS[1]).toEqual({ id: 2, x: 33136, y: 32973, z: 8 });
    });
  });

  describe('3. Audio & Loading Screen Integrations', () => {
    it('returns custom lore curiosities for cyclops-camp and elf-sanctuary', () => {
      const cyclopsConfig = getLoadingConfigForHunt('cyclops-camp');
      expect(cyclopsConfig.curiosities.length).toBeGreaterThan(0);
      expect(cyclopsConfig.curiosities[0]).toContain('Ciclopes');

      const elfConfig = getLoadingConfigForHunt('elf-sanctuary');
      expect(elfConfig.curiosities.length).toBeGreaterThan(0);
      expect(elfConfig.curiosities[0]).toContain('Elfos');
    });

    it('maps audio tracks for cyclops-camp and elf-sanctuary', () => {
      const cyclopsTrack = getTrackForHunt('cyclops-camp');
      expect(cyclopsTrack).toBeDefined();
      expect(cyclopsTrack?.id).toBe('cyclops-camp');

      const elfTrack = getTrackForHunt('elf-sanctuary');
      expect(elfTrack).toBeDefined();
      expect(elfTrack?.id).toBe('elf-sanctuary');
    });
  });
});
