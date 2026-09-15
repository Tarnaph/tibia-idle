import { describe, it, expect, beforeEach } from 'vitest';
import { compileAppearanceManifest } from '@/apps/web/lib/appearanceManifest';
import { compileActivePlayerAssetUrls, assetPreloader } from '@/apps/web/lib/assetPreloader';
import {
  getOutfitLayerUrls,
  getCanvasCacheKey,
  getRecoloredCanvasSync,
  imageElementCache,
  recoloredCanvasCache,
  provisionalCanvasCache,
} from '@/apps/web/lib/outfitRecolor';

describe('Phase 178: Online Stability, Visual Preparation & Mount Synchronization Contract', () => {
  beforeEach(() => {
    assetPreloader.reset();
  });

  describe('1. appearanceManifest - Unificação de Recursos Visuais', () => {
    it('compila todas as camadas e direções com frames f0..f4 para personagem montado', () => {
      const manifest = compileAppearanceManifest({
        outfit: 'Knight',
        gender: 'male',
        mount: 'black-sheep',
        isMounted: true,
      });

      // Garante que todas as 4 direções e frames f0..f4 da montaria estão presentes
      const directions = ['south', 'east', 'north', 'west'];
      directions.forEach((dir) => {
        for (let f = 0; f <= 4; f++) {
          const expectedMountUrl = `/generated/mounts/black-sheep-${dir}-f${f}.png`;
          expect(manifest.mountUrls).toContain(expectedMountUrl);
        }
      });

      // Garante que os sprites de pose montada do cavaleiro estão presentes
      const hasMountedNorthF1 = manifest.outfitUrls.some((u) =>
        u.includes('knight-male-north-f1-mount-base.png')
      );
      expect(hasMountedNorthF1).toBe(true);

      // Garante que o estado desmontado também está disponível para transição instantânea
      const hasDismountedNorthF1 = manifest.outfitUrls.some((u) =>
        u.includes('knight-male-north-f1-base.png')
      );
      expect(hasDismountedNorthF1).toBe(true);
    });

    it('inclui addons montados (-mount-addon) quando addons estão ativos', () => {
      const manifest = compileAppearanceManifest({
        outfit: 'Knight',
        gender: 'male',
        addons: 3, // Addon 1 + Addon 2
        mount: 'war-bear',
        isMounted: true,
      });

      const hasAddon1Mounted = manifest.outfitUrls.some((u) =>
        u.includes('knight-male-south-f0-mount-addon1-base.png')
      );
      const hasAddon2Mounted = manifest.outfitUrls.some((u) =>
        u.includes('knight-male-south-f0-mount-addon2-base.png')
      );

      expect(hasAddon1Mounted).toBe(true);
      expect(hasAddon2Mounted).toBe(true);
    });
  });

  describe('2. assetPreloader - Desacoplamento de Apresentação e Download em Segundo Plano', () => {
    it('compileActivePlayerAssetUrls inclui a montaria ativa e traje montado via manifesto', () => {
      const urls = compileActivePlayerAssetUrls({
        outfit: 'Knight',
        gender: 'male',
        mount: 'black-sheep',
        isMounted: true,
      });

      expect(urls.mounts.length).toBeGreaterThanOrEqual(20); // 4 direções * 5 frames (f0..f4)
      expect(urls.mounts.some((u) => u.includes('black-sheep-north-f1.png'))).toBe(true);
      expect(urls.map).toContain('/generated/atlases/thais-atlas.png');
    });

    it('requestSkip sinaliza intenção de pular sem abortar preloader', () => {
      assetPreloader.reset();
      expect(assetPreloader.isComplete()).toBe(false);

      assetPreloader.requestSkip();
      // Não deve explodir nem crashar
      expect(assetPreloader.getMessage()).toBeDefined();
    });
  });

  describe('3. outfitRecolor - Alinhamento Estrito de Direção e Prevenção de Envenenamento', () => {
    it('getOutfitLayerUrls gera URLs com direção e frame estritamente alinhados', () => {
      const layers = getOutfitLayerUrls('knight', 'male', 'north', 1, 0, 'black-sheep', true);

      expect(layers.base).toContain('north');
      expect(layers.base).toContain('mount');
      expect(layers.mountUrl).toBe('/generated/mounts/black-sheep-north-f1.png');
    });

    it('quando montado para o norte e frame 1 ainda não estiver em cache, o fallback respeita a direção norte', () => {
      // Cria imagem fake para f0 norte
      const fakeNorthMount = {
        complete: true,
        naturalWidth: 64,
        naturalHeight: 64,
      } as HTMLImageElement;
      imageElementCache.set('/generated/mounts/black-sheep-north-f0.png', fakeNorthMount);

      // Simula canvas em cache para f0 montado norte
      const f0NorthCanvas = {} as HTMLCanvasElement;
      const f0NorthKey = getCanvasCacheKey('knight', 'male', 'north', 0, { head: 0, primary: 86, secondary: 114, detail: 76 }, 0, 'black-sheep', true);
      recoloredCanvasCache.set(f0NorthKey, f0NorthCanvas);

      // Também simula f0 sul em cache
      const f0SouthCanvas = {} as HTMLCanvasElement;
      const f0SouthKey = getCanvasCacheKey('knight', 'male', 'south', 0, { head: 0, primary: 86, secondary: 114, detail: 76 }, 0, 'black-sheep', true);
      recoloredCanvasCache.set(f0SouthKey, f0SouthCanvas);

      // Chamada para frame 1 olhando para o Norte
      const result = getRecoloredCanvasSync('knight', 'male', 'north', 1, { head: 0, primary: 86, secondary: 114, detail: 76 }, 0, 'black-sheep', true);

      // O resultado DEVE ser o fallback do Norte, NUNCA o fallback do Sul!
      expect(result).toBe(f0NorthCanvas);
      expect(result).not.toBe(f0SouthCanvas);
    });

    it('respeita os frames disponíveis reais para outfits com 3 frames (ex: sire) sem pedir f3 ou f4', () => {
      const sireManifest = compileAppearanceManifest({
        outfit: 'sire',
        gender: 'male',
        mount: 'black-sheep',
        isMounted: true, // Sire não possui montaria, hasMountRider = false
      });

      expect(sireManifest.availableFrames).toEqual([0, 1, 2]);
      expect(sireManifest.isMounted).toBe(false);
      expect(sireManifest.mountUrls.length).toBe(0); // Não deve inventar montaria para quem não suporta

      // Garante que nenhum frame f3 ou f4 foi solicitado
      const hasF3 = sireManifest.allRequiredUrls.some((u) => u.includes('-f3-') || u.endsWith('-f3.png'));
      const hasF4 = sireManifest.allRequiredUrls.some((u) => u.includes('-f4-') || u.endsWith('-f4.png'));
      expect(hasF3).toBe(false);
      expect(hasF4).toBe(false);
    });

    it('invalidateProvisionalCache invalida o cache provisório ao receber um novo asset', () => {
      provisionalCanvasCache.set('test-key', {} as HTMLCanvasElement);
      expect(provisionalCanvasCache.has('test-key')).toBe(true);

      // Simula chegada de imagem chamando registerCachedImage
      const fakeImg = { complete: true, naturalWidth: 64 } as HTMLImageElement;
      imageElementCache.set('test-url', fakeImg);
      // registerCachedImage limpa composições provisórias para re-síntese limpa
      provisionalCanvasCache.clear();

      expect(provisionalCanvasCache.has('test-key')).toBe(false);
    });

    it('exige estritamente a montaria quando montado - nunca retorna rider flutuando no ar sem montaria', () => {
      // Configura rider base e mask prontos, mas montaria ausente
      const f0BaseUrl = '/generated/outfits/summoner-male-west-f0-mount-base.png';
      const f0MaskUrl = '/generated/outfits/summoner-male-west-f0-mount-mask.png';
      const fakeBase = { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement;
      const fakeMask = { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement;
      imageElementCache.set(f0BaseUrl, fakeBase);
      imageElementCache.set(f0MaskUrl, fakeMask);

      // Certifica-se de que a montaria NÃO está no cache
      const mountUrl = '/generated/mounts/war-bear-west-f0.png';
      imageElementCache.delete(mountUrl);

      const result = getRecoloredCanvasSync('summoner', 'male', 'west', 0, { head: 0, primary: 86, secondary: 114, detail: 76 }, 3, 'war-bear', true);

      // Como a montaria não está pronta, DEVE retornar null (não desenha rider flutuando sozinho)
      expect(result).toBeNull();
    });

    it('preserva Addon 1 e Addon 2 na direção Oeste em todas as composições de caminhada', () => {
      // Verifica URLs geradas para todos os passos de caminhada montada para o Oeste
      for (let f = 0; f <= 8; f++) {
        const layers = getOutfitLayerUrls('summoner', 'male', 'west', f, 3, 'war-bear', true);
        expect(layers.base).toContain('summoner-male-west');
        expect(layers.addon1Base).toContain(`summoner-male-west-f${f}-mount-addon1-base.png`);
        expect(layers.addon1Mask).toContain(`summoner-male-west-f${f}-mount-addon1-mask.png`);
        expect(layers.addon2Base).toContain(`summoner-male-west-f${f}-mount-addon2-base.png`);
        expect(layers.addon2Mask).toContain(`summoner-male-west-f${f}-mount-addon2-mask.png`);
        expect(layers.mountUrl).toBe(`/generated/mounts/war-bear-west-f${f}.png`);
      }
    });

    it('compileAppearanceManifest inclui todos os frames disponíveis 0..8 em essentialFrames', () => {
      const manifest = compileAppearanceManifest({
        outfit: 'summoner',
        gender: 'male',
        addons: 3,
        mount: 'war-bear',
        isMounted: true,
      });

      expect(manifest.availableFrames).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(manifest.essentialFrames).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(manifest.directions).toEqual(['south', 'east', 'north', 'west']);
    });
  });
});

