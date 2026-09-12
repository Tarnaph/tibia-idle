import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/packages/database/src';
import visualAssetsJson from '@/content/generated/tibia1098-assets.json';
import thaisCityJson from '@/content/generated/thais-city.json';
import { initialHunts } from '@/packages/domain/src/hunt';
import monstersJson from '@/content/generated/monsters.json';
import type { Tibia1098AssetManifest } from '@/packages/tibia1098-assets/src/types';
import type { MonsterDefinition } from '@/packages/content-schema/src';

const assets = visualAssetsJson as Tibia1098AssetManifest;
const monsters = (monstersJson as { monsters: MonsterDefinition[] }).monsters;

describe('Phase 142: Incognito, Cold Cache & Multi-Environment Alignment', () => {
  describe('1. Thais Temple Immediate Priority & Socket Decongestion', () => {
    it('includes authentic temple spawn textures (item-406, 407, 1050..1052, 1481) in priorityUrls', () => {
      const arenaPath = path.join(process.cwd(), 'apps/web/components/ThaisCityArena.tsx');
      const content = fs.readFileSync(arenaPath, 'utf-8');

      // templeSpawnUrls must filter for distance <= 6 tiles
      expect(content).toMatch(/templeSpawnUrls\s*=\s*allThaisMapUrls\.filter\(\s*\([^)]*\)\s*=>\s*\(urlDistances\.get\([^)]*\)\s*\?\?\s*9999\)\s*<=\s*6/);

      // priorityUrls must include templeSpawnUrls directly
      expect(content).toContain('...templeSpawnUrls');

      // Verify the essential temple textures exist in the templeSpawnUrls range
      const playerSpawnX = 32369;
      const playerSpawnY = 32241;
      const allTiles = [...thaisCityJson.tiles, ...((thaisCityJson as any).upperTiles || [])];

      const templeDistances = new Map<string, number>();
      for (const t of allTiles) {
        const dist = Math.hypot(t.x - playerSpawnX, t.y - playerSpawnY);
        for (const id of t.serverItemIds) {
          const mapping = (assets.mapItems as any)[String(id)];
          const url = mapping?.frame?.publicUrl || mapping?.frames?.[0]?.publicUrl;
          if (url) {
            const prev = templeDistances.get(url) ?? Infinity;
            if (dist < prev) templeDistances.set(url, dist);
          }
        }
      }

      const immediateUrls = Array.from(templeDistances.entries())
        .filter(([_, d]) => d <= 6)
        .map(([u]) => u);

      // Expect item-406 (marble ground) and item-407 to be immediately in the priority list
      expect(immediateUrls.some((u) => u.includes('item-406.png'))).toBe(true);
      expect(immediateUrls.some((u) => u.includes('item-407.png'))).toBe(true);
      expect(immediateUrls.length).toBeLessThan(35); // Fast, concise batch under 35 textures
    });

    it('throttles distant background streaming to preserve the browser 6-socket connection pool', () => {
      const arenaPath = path.join(process.cwd(), 'apps/web/components/ThaisCityArena.tsx');
      const content = fs.readFileSync(arenaPath, 'utf-8');

      // Concurrency must be conservative (chunkSize <= 4, delay > 0)
      expect(content).toMatch(/loadBatch\(\s*nearbyViewportUrls\s*,\s*[1-4]\s*,\s*[1-9][0-9]*\s*\)/);
      expect(content).toMatch(/loadBatch\(\s*distantThaisMapUrls\s*,\s*[1-4]\s*,\s*[1-9][0-9]*\s*\)/);

      // Delayed stream start to yield network bandwidth
      expect(content).toContain('setTimeout(');
      expect(content).toContain('streamBackgroundAssets();');
    });
  });

  describe('2. Loading Screen Immediate Backdrop & Preload Resilience', () => {
    it('ensures ExuraLoadingScreen has an atmospheric fantasy gradient and artworkLoaded state', () => {
      const loadingPath = path.join(process.cwd(), 'apps/web/components/ExuraLoadingScreen.tsx');
      const content = fs.readFileSync(loadingPath, 'utf-8');

      expect(content).toContain('artworkLoaded');
      expect(content).toContain('radial-gradient(');
      expect(content).toContain('onLoad={() => setArtworkLoaded(true)}');
      expect(content).toContain('new Image()');
    });
  });

  describe('3. Hunt Cards & Carousel Resilience', () => {
    it('ensures HuntCarousel pre-loads all hunt backgrounds on mount', () => {
      const carouselPath = path.join(process.cwd(), 'apps/web/components/hunts/HuntCarousel.tsx');
      const content = fs.readFileSync(carouselPath, 'utf-8');

      expect(content).toContain('React.useEffect');
      expect(content).toContain('/images/hunts/${h.id}.jpg');
    });

    it('ensures HuntCard renders resilient fallback with monster sprite and level medallion', () => {
      const cardPath = path.join(process.cwd(), 'apps/web/components/hunts/HuntCard.tsx');
      const content = fs.readFileSync(cardPath, 'utf-8');

      expect(content).toContain('bgLoaded');
      expect(content).toContain('hunt-card-sprite-centered');
      expect(content).toContain('onLoad={() => setBgLoaded(true)}');

      // Verify all 6 hunts have valid sprites and backgrounds
      for (const hunt of initialHunts) {
        const monster = monsters.find((m) => m.id === hunt.monsters[0]);
        expect(monster).toBeDefined();

        const asset =
          assets.creatures[String(monster?.lookType)] ||
          assets.creatures[monster!.id];
        expect(asset).toBeDefined();

        const bgPath = path.join(process.cwd(), 'public/images/hunts', `${hunt.id}.jpg`);
        expect(fs.existsSync(bgPath)).toBe(true);
      }
    });

    it('ensures globals.css enables creature sprite badges and fallback styling', () => {
      const cssPath = path.join(process.cwd(), 'app/globals.css');
      const content = fs.readFileSync(cssPath, 'utf-8');

      expect(content).toContain('.hunt-card-sprite-wrapper');
      expect(content).not.toContain('.hunt-card-sprite-wrapper {\n  display: none;\n}');
      expect(content).toContain('.hunt-card-sprite-centered');
    });
  });

  describe('4. SQLite Singleton, Concurrency & Git Cleanliness', () => {
    it('ensures PrismaClient is a globalThis singleton with WAL mode and busy_timeout configured', async () => {
      const dbPath = path.join(process.cwd(), 'packages/database/src/index.ts');
      const content = fs.readFileSync(dbPath, 'utf-8');

      expect(content).toContain('globalThis as unknown');
      expect(content).toContain('PRAGMA journal_mode = WAL;');
      expect(content).toContain('PRAGMA busy_timeout = 10000;');

      const mode = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>('PRAGMA journal_mode;');
      expect(mode[0].journal_mode.toLowerCase()).toBe('wal');
    });

    it('ensures .gitignore ignores ephemeral SQLite files (db-shm, db-wal)', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      expect(content).toContain('prisma/*.db-shm');
      expect(content).toContain('prisma/*.db-wal');
    });

    it('ensures auto-save interval in GamePrototype is calibrated to 30s to avoid server flooding', () => {
      const protoPath = path.join(process.cwd(), 'apps/web/components/GamePrototype.tsx');
      const content = fs.readFileSync(protoPath, 'utf-8');

      expect(content).toContain('}, 30000);');
    });
  });
});
