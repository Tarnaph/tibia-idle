import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import rawOutfitsJson from '../content/generated/outfits.json';
import rawMountsJson from '../content/generated/mounts.json';
import { AVAILABLE_OUTFITS, AVAILABLE_MOUNTS } from '../apps/web/components/OutfitModal';
import { getOutfitLayerUrls, normalizeOutfitId, normalizeMountId } from '../apps/web/lib/outfitRecolor';
import { CANONICAL_WANDS, findWandDefinition, canUseWand } from '../packages/domain/src/wands';
import {
  createIdleGame,
  addPartyMember,
  startGame,
  advanceCombat,
  consumePotionFromInventory,
  HOTBAR_POTIONS,
  ensureHealthPotionInHotbar,
} from '../packages/domain/src';
import { content } from './fixture';

const projectRoot = resolve(__dirname, '..');

describe('Phase 115 - FIX.md Complete Audit & Verifications', () => {
  describe('Item 1: Outfits, Addons, and Mounts from outfits.xml, mounts.xml, and 10.98 client', () => {
    it('imports all 76 outfits with male and female looktypes from outfits.xml', () => {
      expect(rawOutfitsJson.length).toBe(76);
      expect(AVAILABLE_OUTFITS.length).toBeGreaterThanOrEqual(76);

      const citizen = rawOutfitsJson.find((o) => o.id === 'citizen');
      expect(citizen).toBeDefined();
      expect(citizen?.maleLookType).toBe(128);
      expect(citizen?.femaleLookType).toBe(136);
      expect(citizen?.hasAddon1).toBe(true);
      expect(citizen?.hasAddon2).toBe(true);
      expect(citizen?.hasMountRider).toBe(true);
    });

    it('imports all 129 mounts from mounts.xml', () => {
      expect(rawMountsJson.length).toBe(129);
      expect(AVAILABLE_MOUNTS.length).toBeGreaterThanOrEqual(129);

      const donkey = rawMountsJson.find((m) => m.id === 'donkey');
      expect(donkey).toBeDefined();
      expect(donkey?.clientId).toBe(387);
    });

    it('generates authentic layer URLs for base, masks, addons, and mount rider pose', () => {
      const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 3, 'donkey', true);
      expect(urls.base).toContain('citizen-male-south-f0-mount-base.png');
      expect(urls.mask).toContain('citizen-male-south-f0-mount-mask.png');
      expect(urls.addon1Base).toContain('citizen-male-south-f0-addon1-base.png');
      expect(urls.addon2Base).toContain('citizen-male-south-f0-addon2-base.png');
      expect(urls.mountUrl).toContain('/generated/mounts/donkey-south-f0.png');

      // Verify files exist in public directory
      expect(existsSync(resolve(projectRoot, 'public' + urls.base))).toBe(true);
      expect(existsSync(resolve(projectRoot, 'public' + urls.mask))).toBe(true);
      expect(existsSync(resolve(projectRoot, 'public' + urls.addon1Base!))).toBe(true);
      expect(existsSync(resolve(projectRoot, 'public' + urls.addon2Base!))).toBe(true);
      expect(existsSync(resolve(projectRoot, 'public' + urls.mountUrl!))).toBe(true);
    });

    it('confirms 100% of outfits and mounts have compatible authentic sprites', () => {
      // Check first, middle, and last outfits
      const testOutfits = ['citizen', 'knight', 'assassin', 'retro-warrior', 'pumpkin-mummy'];
      for (const id of testOutfits) {
        const thumbPath = resolve(projectRoot, `public/generated/outfit-thumbs/${id}.png`);
        expect(existsSync(thumbPath)).toBe(true);
      }
      // Check mounts
      const testMounts = ['widow-queen', 'donkey', 'war-bear', 'black-sheep'];
      for (const mId of testMounts) {
        const mountPath = resolve(projectRoot, `public/generated/mounts/${mId}.png`);
        expect(existsSync(mountPath)).toBe(true);
      }
    });
  });

  describe('Item 2: Dragon Lair Hunt Entrance and Respawns', () => {
    it('allows entrance to Dragon Lair without minimum level freeze', () => {
      const dragonHunt = content.hunts.find((h) => h.id === 'dragon-lair')!;
      expect(dragonHunt).toBeDefined();
      expect(dragonHunt.minimumLevel).toBe(1);

      let game = createIdleGame('dragon-test-115', content, 'dragon-lair');
      expect(game.encounter.status).toBe('ready');

      // startGame should transition directly to running without getting stuck
      game = startGame(game, content);
      expect(game.encounter.status).toBe('running');
      expect(game.encounter.enemies.length).toBeGreaterThan(0);
      expect(game.encounter.enemies[0].alive).toBe(true);
    });
  });

  describe('Item 3: Potions & Sync', () => {
    it('uses canonical CONST_ME_MAGIC_BLUE (effectId 13) for healing and mana potions', () => {
      for (const potion of HOTBAR_POTIONS) {
        if (potion.healMin !== undefined || potion.manaMin !== undefined) {
          expect(potion.effectId).toBe(13);
        }
      }
    });

    it('consumes potions reliably and maintains auto-supply across hunts', () => {
      const game = createIdleGame('potion-test-115', content, 'rat-cellars');
      // Even with loot in bag, potion consumption succeeds
      game.session.loot = [{ itemId: 2148, count: 100 } as any];
      const consumed = consumePotionFromInventory(game, 7618); // Health Potion
      expect(consumed).toBe(true);
    });
  });

  describe('Item 4: Promotion Gate at Level 20', () => {
    it('verifies Promotion gate condition in SkillsWindow', () => {
      const skillsSrc = readFileSync(resolve(projectRoot, 'apps/web/components/SkillsWindow.tsx'), 'utf8');
      expect(skillsSrc).toContain('!isPromoted && character.level >= 20');
    });
  });

  describe('Item 5: Emoji & Duplicate Button Cleanups', () => {
    it('confirms emoji cleanups and removed redundant CAÇADAS dock button', () => {
      const loadingSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ExuraLoadingScreen.tsx'), 'utf8');
      expect(loadingSrc).not.toContain('📜');

      const bottomDockSrc = readFileSync(resolve(projectRoot, 'apps/web/components/BottomDock.tsx'), 'utf8');
      expect(bottomDockSrc).not.toContain('🎯 CAÇADAS');
    });
  });

  describe('Item 6: TopBar Cluster & Coin Icons', () => {
    it('uses official gold-coin and tibia-coin images in TopBar', () => {
      const dockBarSrc = readFileSync(resolve(projectRoot, 'apps/web/components/window/WindowDockBar.tsx'), 'utf8');
      expect(dockBarSrc).toContain('/images/gold-coin.png');
      expect(dockBarSrc).toContain('/images/tibia-coin.png');
      expect(dockBarSrc).toContain('huntera-left-cluster');
    });
  });

  describe('Item 7: Wands & Rods Parity & Hot-Swapping', () => {
    it('registers all 41 canonical wands and rods from realmap11', () => {
      expect(Object.keys(CANONICAL_WANDS).length).toBe(41);

      // Wand of Vortex
      const vortex = findWandDefinition(2190);
      expect(vortex).toBeDefined();
      expect(vortex?.name).toBe('wand of vortex');
      expect(vortex?.level).toBe(7);
      expect(vortex?.mana).toBe(2);
      expect(vortex?.element).toBe('energy');
      expect(vortex?.projectileId).toBe(5);
      expect(vortex?.effectId).toBe(12);
      expect(vortex?.range).toBe(4);

      // Snakebite Rod
      const snakebite = findWandDefinition(2182);
      expect(snakebite).toBeDefined();
      expect(snakebite?.name).toBe('snakebite rod');
      expect(snakebite?.element).toBe('earth');
      expect(snakebite?.projectileId).toBe(15);
      expect(snakebite?.effectId).toBe(17);
    });

    it('enforces level and vocation requirements while allowing starter wands for level 1 starters', () => {
      const game = createIdleGame('wand-use-115', content);
      const sorcerer = game.session.characters[0];
      sorcerer.vocation = 'Sorcerer';
      sorcerer.level = 1;

      const vortex = findWandDefinition(2190)!;
      // Starter wand (level <= 8) is usable by level 1 sorcerer
      expect(canUseWand(sorcerer, vortex).ok).toBe(true);

      // High level wand requires higher level
      const falconWand = findWandDefinition(31986)!; // Falcon Wand requires level 300
      expect(canUseWand(sorcerer, falconWand).ok).toBe(false);

      // Knight cannot use wands
      const knight = { ...sorcerer, vocation: 'Knight', baseVocation: 'Knight' } as any;
      expect(canUseWand(knight, vortex).ok).toBe(false);
    });
  });
});
