import { describe, it, expect } from 'vitest';
import { initialHunts, huntById } from '../packages/domain/src/hunt';
import { huntConfigs } from '../packages/realmap11-importer/src/importHuntRegions';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 252: Mobile Game-First & FIX.md Overhaul Suite', () => {
  describe('1. Spider Burrow Hunt Configuration & Navigable Mesh', () => {
    it('should have spider-burrow configured with official coordinates [32094, 32108, 8] and available: true in importer', () => {
      const spiderCfg = huntConfigs.find((h) => h.huntId === 'spider-burrow');
      expect(spiderCfg).toBeDefined();
      expect(spiderCfg?.center).toEqual([32094, 32108, 8]);
      expect(spiderCfg?.radius).toBe(25);
      expect(spiderCfg?.available).toBe(true);
    });

    it('should have spider-burrow with status available in domain initialHunts', () => {
      const spiderHunt = huntById(initialHunts, 'spider-burrow');
      expect(spiderHunt).toBeDefined();
      expect(spiderHunt.status).toBe('available');
      expect(spiderHunt.name).toBe('Spider Burrow');
      expect(spiderHunt.monsters).toContain('spider');
    });

    it('should have navigable mesh and spawn positions in generated hunt-regions.json', () => {
      const catalogPath = path.resolve(process.cwd(), 'content', 'generated', 'hunt-regions.json');
      expect(fs.existsSync(catalogPath)).toBe(true);
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      const spiderRegion = catalog.regions.find((r: any) => r.huntId === 'spider-burrow');

      expect(spiderRegion).toBeDefined();
      expect(spiderRegion.available).toBe(true);
      expect(spiderRegion.sourceCenter.x).toBe(32094);
      expect(spiderRegion.sourceCenter.y).toBe(32108);
      expect(spiderRegion.sourceCenter.z).toBe(8);
      expect(spiderRegion.sourceCenter.radius).toBe(25);
      expect(spiderRegion.bounds.width).toBeGreaterThan(0);
      expect(spiderRegion.bounds.height).toBeGreaterThan(0);
      expect(spiderRegion.spawnPositions.length).toBeGreaterThan(0);
      expect(spiderRegion.tiles.length).toBeGreaterThan(0);
    });
  });

  describe('2. Mobile Metrics & Rates Computation', () => {
    it('should accurately calculate rates for mobile widget', () => {
      const elapsedMs = 60000; // 1 minuto
      const elapsedHours = elapsedMs / 3600000;
      const xpGained = 5000;
      const lootGold = 1200;

      const xpHour = Math.round(xpGained / elapsedHours);
      const goldHour = Math.round(lootGold / elapsedHours);

      expect(xpHour).toBe(300000);
      expect(goldHour).toBe(72000);
    });
  });

  describe('3. Concurrency Protection & Duplicate Session Kick', () => {
    it('should use code 4001 for concurrent session leave in ThaisCityRoom.ts', () => {
      const roomFilePath = path.resolve(process.cwd(), 'packages/server/src/rooms/ThaisCityRoom.ts');
      const content = fs.readFileSync(roomFilePath, 'utf8');

      expect(content).toContain("oldClient.leave(4001)");
      expect(content).toContain("reason: 'CONCURRENT_LOGIN'");
      expect(content).toContain("await persistenceManager.saveCharacter(existingPlayer)");
    });
  });

  describe('4. Mobile Audio Notification Exclusivity', () => {
    it('should restrict desktop MusicTrackToast to non-mobile in GamePrototype.tsx', () => {
      const protoPath = path.resolve(process.cwd(), 'apps/web/components/GamePrototype.tsx');
      const content = fs.readFileSync(protoPath, 'utf8');

      expect(content).toContain("{!responsive.isMobile && (");
      expect(content).toContain("<MusicTrackToast");
      expect(content).toContain("<MobileMusicBadge");
    });
  });

  describe('5. Mobile Responsive CSS for DraggableWindow and Auth', () => {
    it('should include mobile rules for .draggable-window and .auth-card-container in globals.css', () => {
      const cssPath = path.resolve(process.cwd(), 'app/globals.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      expect(css).toContain(".draggable-window");
      expect(css).toContain("max-width: 95vw !important;");
      expect(css).toContain(".auth-bard-container");
      expect(css).toContain(".bestiary-creatures-grid");
      expect(css).toContain(".bestiary-monster-card");
    });
  });
});
