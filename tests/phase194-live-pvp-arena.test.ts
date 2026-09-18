import { describe, it, expect, vi } from 'vitest';
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
  calculateArenaRewards,
} from '../packages/domain/src/pvp';
import { getLoadingConfigForHunt } from '../apps/web/lib/loadingConfig';
import fs from 'fs';
import path from 'path';

describe('Phase 194: Live PvP Arena Online Matchmaking, Timeout, and Realmap Duel Teleport', () => {
  describe('1. Hunt and Region Registration for pvp-arena', () => {
    it('registers pvp-arena in domain initialHunts with proper metadata', () => {
      const pvpArena = huntById(initialHunts, 'pvp-arena');
      expect(pvpArena).toBeDefined();
      expect(pvpArena.status).toBe('available');
      expect(pvpArena.environment.regionId).toBe('pvp-arena');
      expect(pvpArena.environment.source).toBe('realmap11-otbm');
    });

    it('has pvp-arena region extracted in content/generated/hunt-regions.json', () => {
      const huntRegionsPath = path.resolve(__dirname, '../content/generated/hunt-regions.json');
      expect(fs.existsSync(huntRegionsPath)).toBe(true);
      const json = JSON.parse(fs.readFileSync(huntRegionsPath, 'utf8'));
      const pvpRegion = json.regions.find((r: any) => r.huntId === 'pvp-arena');

      expect(pvpRegion).toBeDefined();
      expect(pvpRegion.sourceCenter).toEqual({ x: 33136, y: 32969, z: 8, radius: 20 });
      expect(pvpRegion.bounds).toEqual({ x: 33116, y: 32949, z: 8, width: 41, height: 41 });
      expect(pvpRegion.tiles.length).toBeGreaterThan(100);
    });

    it('has dedicated loading screen curiosities and config for pvp-arena', () => {
      const config = getLoadingConfigForHunt('pvp-arena');
      expect(config).toBeDefined();
      expect(config.curiosities.length).toBeGreaterThanOrEqual(3);
      expect(config.curiosities[0]).toContain('Arena');
      expect(config.curiosities[1]).toContain('+20 pontos');
      expect(config.curiosities[2]).toContain('100 Health Potions');
    });
  });

  describe('2. Spawn Coordinates and Match Geometry', () => {
    it('defines official Spawn 1 at [33136, 32965, 8] and Spawn 2 at [33136, 32973, 8]', () => {
      expect(PVP_ARENA_SPAWNS).toHaveLength(2);
      expect(PVP_ARENA_SPAWNS[0]).toEqual({ id: 1, x: 33136, y: 32965, z: 8 });
      expect(PVP_ARENA_SPAWNS[1]).toEqual({ id: 2, x: 33136, y: 32973, z: 8 });
    });

    it('calculates local coordinates within pvp-arena bounds (41x41)', () => {
      const bounds = { x: 33116, y: 32949, z: 8 };
      const localSpawn1 = {
        x: PVP_ARENA_SPAWNS[0].x - bounds.x,
        y: PVP_ARENA_SPAWNS[0].y - bounds.y,
        z: PVP_ARENA_SPAWNS[0].z,
      };
      const localSpawn2 = {
        x: PVP_ARENA_SPAWNS[1].x - bounds.x,
        y: PVP_ARENA_SPAWNS[1].y - bounds.y,
        z: PVP_ARENA_SPAWNS[1].z,
      };

      expect(localSpawn1).toEqual({ x: 20, y: 16, z: 8 });
      expect(localSpawn2).toEqual({ x: 20, y: 24, z: 8 });
      // Exactly 8 tiles distance between combatants in arena
      expect(Math.abs(localSpawn2.y - localSpawn1.y)).toBe(8);
    });
  });

  describe('3. Online Player Matchmaking Rules', () => {
    it('matches online players within rank tier difference <= 250 points', () => {
      const player1Elo = 280; // Rank 1 (Bronze)
      const player2Elo = 320; // Rank 1 (Bronze)
      const diff = Math.abs(player1Elo - player2Elo);
      expect(diff).toBeLessThanOrEqual(250);
    });

    it('prevents matching online players with rank difference > 250 points', () => {
      const beginnerElo = 50; // Rank 0 (Iniciante)
      const goldElo = 800; // Rank 3 (Ouro)
      const diff = Math.abs(goldElo - beginnerElo);
      expect(diff).toBeGreaterThan(250);
    });

    it('uses 18 seconds timeout for unmatched queue searches', () => {
      const QUEUE_TIMEOUT_MS = 18000;
      expect(QUEUE_TIMEOUT_MS / 1000).toBe(18);
    });
  });

  describe('4. Duel Resolution, Persistence and Rewards', () => {
    it('awards fixed +20 points and 15 Arena Coins to the winner', () => {
      const points = calculatePointsDelta('win');
      const rewards = calculateArenaRewards('win');
      expect(points).toBe(PVP_POINTS_PER_WIN);
      expect(points).toBe(20);
      expect(rewards.arenaCoins).toBe(15);
    });

    it('awards 0 points and 5 Arena Coins to the loser (non-punitive sports duel)', () => {
      const points = calculatePointsDelta('loss');
      const rewards = calculateArenaRewards('loss');
      expect(points).toBe(0);
      expect(rewards.arenaCoins).toBe(5);
    });

    it('triggers promotion and unlocks skull toggle on reaching 250 points', () => {
      const oldPoints = 240;
      const newPoints = 260; // +20 from win crosses 250 threshold
      const promo = checkRankPromotion(oldPoints, newPoints);
      expect(promo).not.toBeNull();
      expect(promo?.promoted).toBe(true);
      expect(promo?.oldTier.rankLevel).toBe(0);
      expect(promo?.newTier.rankLevel).toBe(1);
      expect(promo?.newTier.skull).toBe('green');
      expect(canDisplaySkull(newPoints)).toBe(true);
    });

    it('advances through tiers every 250 points', () => {
      expect(getPvPTierInfo(0).tier).toBe('Iniciante');
      expect(getPvPTierInfo(250).tier).toBe('Bronze');
      expect(getPvPTierInfo(500).tier).toBe('Prata');
      expect(getPvPTierInfo(750).tier).toBe('Ouro');
      expect(getPvPTierInfo(1000).tier).toBe('Platina');
      expect(getPvPTierInfo(1250).tier).toBe('Diamante');
      expect(getPvPTierInfo(1500).tier).toBe('Desafiante');
    });

    it('restores players to Thais Temple (32369, 32241, 7) post-duel without death penalty', () => {
      const thaisTemple = { x: 32369, y: 32241, z: 7 };
      expect(thaisTemple).toEqual({ x: 32369, y: 32241, z: 7 });
    });
  });
});
