import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  compileEssentialAssetUrls,
  assetPreloader,
  type PreloadProgressState,
} from '../apps/web/lib/assetPreloader';
import rawMountsJson from '../content/generated/mounts.json';
import { ALL_SPELL_ICON_URLS } from '../apps/web/components/Tibia11ActionIcon';

describe('Phase 146: Sistema Universal de Pré-Carregamento na Tela de Loading', () => {
  const exuraComponentPath = path.resolve(__dirname, '../apps/web/components/ExuraLoadingScreen.tsx');
  const gamePrototypePath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const preloaderPath = path.resolve(__dirname, '../apps/web/lib/assetPreloader.ts');

  describe('1. Compilação do Manifesto Integral de Assets Essenciais', () => {
    const assets = compileEssentialAssetUrls();

    it('compila com sucesso todas as 7 categorias fundamentais do jogo', () => {
      expect(Array.isArray(assets.map)).toBe(true);
      expect(Array.isArray(assets.mounts)).toBe(true);
      expect(Array.isArray(assets.outfits)).toBe(true);
      expect(Array.isArray(assets.spells)).toBe(true);
      expect(Array.isArray(assets.effects)).toBe(true);
      expect(Array.isArray(assets.items)).toBe(true);
      expect(Array.isArray(assets.audio)).toBe(true);

      // Quantidades substanciais garantindo cobertura completa
      expect(assets.map.length).toBeGreaterThan(150);
      expect(assets.mounts.length).toBeGreaterThan(50);
      expect(assets.outfits.length).toBeGreaterThan(150);
      expect(assets.spells.length).toBeGreaterThanOrEqual(146);
      expect(assets.effects.length).toBeGreaterThan(20);
      expect(assets.items.length).toBeGreaterThan(100);
      expect(assets.audio.length).toBeGreaterThan(0);
    });

    it('garante que todas as montarias de mounts.json estão mapeadas no preloader', () => {
      const allMounts = rawMountsJson as Array<{ id: string; name: string }>;
      const validMountIds = allMounts.filter((m) => m.id && m.id !== 'none').map((m) => m.id);

      expect(validMountIds.length).toBeGreaterThanOrEqual(20);

      validMountIds.forEach((mountId) => {
        const hasMountRider = assets.mounts.some((url) => url.includes(`${mountId}_rider_`));
        const hasMountIdle = assets.mounts.some((url) => url.includes(`${mountId}-`));
        expect(hasMountRider || hasMountIdle).toBe(true);
      });
    });

    it('garante que todos os 146 ícones canônicos de magias, runas e poções estão presentes', () => {
      expect(ALL_SPELL_ICON_URLS.length).toBeGreaterThanOrEqual(146);

      ALL_SPELL_ICON_URLS.forEach((url) => {
        expect(assets.spells).toContain(url);
      });
    });

    it('inclui a trilha musical de Thais para pre-aquecimento de áudio', () => {
      expect(assets.audio).toContain('/songs/sunset-in-the-village.mp3');
    });
  });

  describe('2. Orquestrador AssetPreloaderService', () => {
    it('informa estado inicial limpo e coerente', () => {
      assetPreloader.reset();
      const state = assetPreloader.getState();

      expect(state.progress).toBe(0);
      expect(state.loaded).toBe(0);
      expect(state.isComplete).toBe(false);
      expect(typeof state.message).toBe('string');
    });

    it('notifica observadores registrados através de onProgress', () => {
      const states: PreloadProgressState[] = [];
      const unsubscribe = assetPreloader.onProgress((s) => {
        states.push(s);
      });

      expect(states.length).toBeGreaterThan(0);
      expect(states[0].progress).toBe(0);

      unsubscribe();
    });
  });

  describe('3. Integração com ExuraLoadingScreen', () => {
    const exuraCode = fs.readFileSync(exuraComponentPath, 'utf8');

    it('suporta prop waitForAssets para sincronização com preloader', () => {
      expect(exuraCode).toContain('waitForAssets?: boolean');
      expect(exuraCode).toContain('waitForAssets = false');
    });

    it('inscreve-se ao assetPreloader e atualiza mensagens dinâmicas', () => {
      expect(exuraCode).toContain('assetPreloader.onProgress');
      expect(exuraCode).toContain('setPreloaderMessage(state.message)');
      expect(exuraCode).toContain('{(waitForAssets && preloaderMessage) || message} ({Math.round(progress)}%)');
    });

    it('condiciona o término do carregamento (100% e onFinish) à conclusão de todos os assets', () => {
      expect(exuraCode).toContain('const isAssetsComplete = !waitForAssets || assetPreloader.isComplete()');
      expect(exuraCode).toContain('const assetProgressPct = waitForAssets ? assetPreloader.getProgress() : 100');
      expect(exuraCode).toContain('pct < 100 || (!isAssetsComplete && waitForAssets)');
    });
  });

  describe('4. Disparo Autoritativo no GamePrototype ao Selecionar Personagem', () => {
    const gameProtoCode = fs.readFileSync(gamePrototypePath, 'utf8');

    it('importa assetPreloader no GamePrototype', () => {
      expect(gameProtoCode).toContain("import { assetPreloader } from '@/apps/web/lib/assetPreloader'");
    });

    it('dispara assetPreloader.startPreload() imediatamente no handleSelectCharacter', () => {
      expect(gameProtoCode).toContain('void assetPreloader.startPreload()');
    });

    it('passa waitForAssets={initialLoadingActive} para ExuraLoadingScreen', () => {
      expect(gameProtoCode).toContain('waitForAssets={initialLoadingActive}');
    });

    it('reseta o preloader no logout e troca de personagem', () => {
      expect(gameProtoCode).toContain('assetPreloader.reset()');
    });
  });
});
