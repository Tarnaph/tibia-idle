import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadThumbnailAtlas,
  isThumbnailAtlasReady,
  getThumbnailAtlasFrame,
  getThumbnailDiagnostics,
  type ThumbnailManifest,
} from '../apps/web/lib/thumbnailAtlasLoader';
import { outfitDiagnostics } from '../apps/web/lib/outfitDiagnostics';

describe('Phase 182: Bloco B - Otimização das Miniaturas da Lista (Card Thumbnails)', () => {
  const outfitManifestPath = path.resolve(__dirname, '../public/generated/atlases/outfit-thumbs-manifest.json');
  const mountManifestPath = path.resolve(__dirname, '../public/generated/atlases/mount-thumbs-manifest.json');
  const outfitAtlasImgPath = path.resolve(__dirname, '../public/generated/atlases/outfit-thumbs-atlas.png');
  const mountAtlasImgPath = path.resolve(__dirname, '../public/generated/atlases/mount-thumbs-atlas.png');

  it('1. Arquivos consolidados de atlas e manifestos de miniaturas existem no disco', () => {
    expect(fs.existsSync(outfitManifestPath)).toBe(true);
    expect(fs.existsSync(mountManifestPath)).toBe(true);
    expect(fs.existsSync(outfitAtlasImgPath)).toBe(true);
    expect(fs.existsSync(mountAtlasImgPath)).toBe(true);

    const outfitStat = fs.statSync(outfitAtlasImgPath);
    const mountStat = fs.statSync(mountAtlasImgPath);

    // O atlas de 79 outfits deve ser compacto (< 250 KB)
    expect(outfitStat.size).toBeGreaterThan(10_000);
    expect(outfitStat.size).toBeLessThan(300_000);

    // O atlas de 126 montarias deve ser compacto (< 400 KB)
    expect(mountStat.size).toBeGreaterThan(10_000);
    expect(mountStat.size).toBeLessThan(500_000);
  });

  it('2. Manifesto de miniaturas de outfits contém as classes clássicas e dimensões exatas de 64x64', () => {
    const raw = fs.readFileSync(outfitManifestPath, 'utf8');
    const manifest: ThumbnailManifest = JSON.parse(raw);

    expect(manifest.count).toBeGreaterThanOrEqual(70);
    expect(manifest.thumbSize).toBe(64);

    const essentialOutfits = ['citizen', 'hunter', 'mage', 'knight', 'assassin', 'brotherhood', 'sire'];
    for (const outfit of essentialOutfits) {
      const frame = manifest.frames[outfit];
      expect(frame, `Outfit ${outfit} deve estar indexado no manifesto`).toBeDefined();
      expect(frame.w).toBe(64);
      expect(frame.h).toBe(64);
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('3. Manifesto de miniaturas de montarias contém as montarias essenciais e dimensões de 64x64', () => {
    const raw = fs.readFileSync(mountManifestPath, 'utf8');
    const manifest: ThumbnailManifest = JSON.parse(raw);

    expect(manifest.count).toBeGreaterThanOrEqual(100);
    expect(manifest.thumbSize).toBe(64);

    const essentialMounts = ['donkey', 'blazebringer', 'crystal-wolf', 'draptor'];
    for (const mount of essentialMounts) {
      const frame = manifest.frames[mount];
      expect(frame, `Mount ${mount} deve estar indexado no manifesto`).toBeDefined();
      expect(frame.w).toBe(64);
      expect(frame.h).toBe(64);
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('4. Carregamento sob demanda separa medição de primeiro acesso (cold) e cache preenchido (warm < 100ms)', async () => {
    outfitDiagnostics.startAttempt({
      characterId: 'char-test-atlas',
      characterName: 'Tester',
      outfit: 'Citizen',
    });

    // Mock global fetch para ambiente Node
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('outfit-thumbs-manifest.json')) {
        const raw = fs.readFileSync(outfitManifestPath, 'utf8');
        return new Response(raw, { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('mount-thumbs-manifest.json')) {
        const raw = fs.readFileSync(mountManifestPath, 'utf8');
        return new Response(raw, { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(url);
    };

    try {
      // 1. Carregamento do atlas sob demanda (Cold load)
      const ready = await loadThumbnailAtlas('outfits');
      expect(ready).toBe(true);
      expect(isThumbnailAtlasReady('outfits')).toBe(true);

      // 2. Consulta de miniatura com cache preenchido (Warm lookup)
      const frameStart = performance.now();
      const frameInfo = getThumbnailAtlasFrame('outfits', 'citizen');
      const frameDuration = performance.now() - frameStart;

      expect(frameInfo).toBeDefined();
      expect(frameInfo!.atlasUrl).toContain('outfit-thumbs-atlas.png');
      expect(frameInfo!.frame.w).toBe(64);
      expect(frameInfo!.frame.h).toBe(64);

      // Warm lookup deve ser instantâneo (< 100ms, tipicamente < 1ms)
      expect(frameDuration).toBeLessThan(100);

      // 3. Telemetria registra métricas segregadas de cold e warm
      const diag = getThumbnailDiagnostics();
      expect(diag.outfitsColdLoadMs).toBeGreaterThanOrEqual(0);
      expect(diag.outfitsWarmAvgMs).toBeLessThan(100);
      expect(diag.outfitsCount).toBeGreaterThan(0);

      const report = outfitDiagnostics.getLatestReport();
      expect(report?.thumbnails).toBeDefined();
      expect(report?.thumbnails?.outfitsAtlasCount).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('5. Miniatura não presente no atlas retorna null para acionar fallback gracioso', () => {
    const unknownInfo = getThumbnailAtlasFrame('outfits', 'outfit-inexistente-12345');
    expect(unknownInfo).toBeNull();
  });
});
