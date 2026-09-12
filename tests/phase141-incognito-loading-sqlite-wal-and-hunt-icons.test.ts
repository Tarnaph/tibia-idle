import { describe, it, expect } from 'vitest';
import visualAssetsJson from '@/content/generated/tibia1098-assets.json';
import monstersJson from '@/content/generated/monsters.json';
import { initialHunts } from '@/packages/domain/src/hunt';
import type { Tibia1098AssetManifest } from '@/packages/tibia1098-assets/src/types';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import { prisma } from '@/packages/database/src';
import fs from 'fs';
import path from 'path';

const assets = visualAssetsJson as Tibia1098AssetManifest;
const monsters = (monstersJson as { monsters: MonsterDefinition[] }).monsters;

describe('Phase 141: Incognito Loading, SQLite WAL Mode & Hunt Icons Fixes', () => {
  describe('1. Hunt Card Creature Sprite Resolution', () => {
    it('resolves authentic creature sprite thumb URLs for all 6 active hunts', () => {
      expect(initialHunts.length).toBeGreaterThanOrEqual(6);

      for (const hunt of initialHunts) {
        const primaryMonsterId = hunt.monsters[0];
        expect(primaryMonsterId).toBeDefined();

        const primaryMonster = monsters.find((m) => m.id === primaryMonsterId);
        expect(primaryMonster).toBeDefined();

        const lookType = primaryMonster?.lookType;
        const appId = (primaryMonster as any)?.appearanceId;
        const asset =
          (lookType !== undefined ? assets.creatures[String(lookType)] : undefined) ||
          (appId !== undefined ? assets.creatures[String(appId)] : undefined) ||
          assets.creatures[primaryMonsterId] ||
          (assets as any).assets?.[primaryMonsterId];

        expect(asset, `Asset must be found for hunt monster: ${primaryMonsterId}`).toBeDefined();

        const spriteUrl =
          asset.thumbUrl ||
          asset.frames?.find((f: any) => f.direction === 'south')?.publicUrl ||
          asset.frames?.[0]?.publicUrl;

        expect(spriteUrl, `Sprite URL must exist for hunt: ${hunt.id}`).toBeTruthy();
        expect(spriteUrl).toMatch(/\.(png|jpg|webp)$/);

        // Verify the file actually exists in the public directory
        const publicPath = path.join(process.cwd(), 'public', spriteUrl.replace(/^\//, ''));
        expect(fs.existsSync(publicPath), `Sprite file must exist on disk: ${publicPath}`).toBe(true);
      }
    });

    it('specifically maps Rat (lookType 21), Spider (30), Troll (15), Skeleton (33), Rotworm (26), Dragon (34)', () => {
      const expectedLookTypes: Record<string, number> = {
        'rat-cellars': 21,
        'spider-burrow': 30,
        'troll-camp': 15,
        'old-crypt': 33,
        'rotworm-cave': 26,
        'dragon-lair': 34,
      };

      for (const [huntId, expectedLookType] of Object.entries(expectedLookTypes)) {
        const hunt = initialHunts.find((h) => h.id === huntId);
        expect(hunt).toBeDefined();

        const monster = monsters.find((m) => m.id === hunt!.monsters[0]);
        expect(monster?.lookType).toBe(expectedLookType);

        const asset = assets.creatures[String(expectedLookType)];
        expect(asset).toBeDefined();
        expect(asset.thumbUrl).toContain('.png');
      }
    });
  });

  describe('2. SQLite Concurrency & WAL Mode', () => {
    it('verifies SQLite database is operating with WAL mode and resilient busy timeout', async () => {
      const modeResult = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>('PRAGMA journal_mode;');
      expect(modeResult[0].journal_mode.toLowerCase()).toBe('wal');

      const busyTimeoutResult = await prisma.$queryRawUnsafe<Array<{ timeout: bigint }>>('PRAGMA busy_timeout;');
      expect(Number(busyTimeoutResult[0].timeout)).toBeGreaterThanOrEqual(5000);
    });

    it('executes database transactions cleanly in milliseconds without lock stalls', async () => {
      // Warm up connection pool
      await prisma.$queryRawUnsafe('SELECT 1;');

      const start = performance.now();
      await prisma.$transaction(async (tx) => {
        const char = await tx.character.findFirst({ select: { id: true } });
        if (char) {
          await tx.character.findUnique({ where: { id: char.id }, select: { id: true, level: true } });
        }
      });
      const elapsed = performance.now() - start;
      // Must be fast (< 500ms, typically 5-20ms) rather than 34,000ms+
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('3. Socket Congestion & City Arena Priority Assets', () => {
    it('ensures ThaisCityArena priorityUrls does not block the ticker with 138 viewport textures', () => {
      const filePath = path.join(process.cwd(), 'apps/web/components/ThaisCityArena.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Must NOT include spawnViewportUrls in the blocking priorityUrls array
      expect(content).not.toMatch(/priorityUrls\s*=\s*\[[^\]]*\.\.\.spawnViewportUrls/);

      // Must use chunkSize <= 8 to preserve HTTP connection limits
      expect(content).toMatch(/loadBatch\(priorityUrls,\s*[1-8],\s*0\)/);

      // Must stream spawnViewportUrls in background
      expect(content).toMatch(/void loadBatch\(\[?\.\.\.spawnViewportUrls/);
    });
  });

  describe('4. Loading Artwork & Incognito Entry Resilience', () => {
    it('ensures ExuraLoadingScreen includes fetchPriority="high" and fallback gradient', () => {
      const filePath = path.join(process.cwd(), 'apps/web/components/ExuraLoadingScreen.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('fetchPriority="high"');
      expect(content).toContain('radial-gradient(');
    });

    it('ensures LandingPage preloads loading images on boot for instant incognito transitions', () => {
      const filePath = path.join(process.cwd(), 'apps/web/components/public/LandingPage.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('/images/loading/thais-loading.jpg');
      expect(content).toContain('/images/loading/loading-bg.jpg');
    });
  });
});
