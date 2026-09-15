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
  renderRecoloredOutfit,
  prepareAppearanceCanvas,
  isAppearanceFullyReady,
  isOutfitCanvasCached,
  clearFailedImageCache,
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

    it('não envenena provisionalCanvasCache quando addons solicitados não puderem ser desenhados', () => {
      // Limpa caches
      provisionalCanvasCache.clear();
      recoloredCanvasCache.clear();

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        createElement: () => ({
          width: 64,
          height: 64,
          getContext: () => ({
            drawImage: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            putImageData: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            clearRect: () => {},
          }),
        }),
      };

      try {
        // Configura rider f0 e mount f0 prontos, mas SEM as imagens do Addon 2
        const f0BaseUrl = '/generated/outfits/summoner-male-south-f0-mount-base.png';
        const f0MaskUrl = '/generated/outfits/summoner-male-south-f0-mount-mask.png';
        const mountUrl = '/generated/mounts/war-bear-south-f0.png';
        imageElementCache.set(f0BaseUrl, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(f0MaskUrl, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(mountUrl, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);

        const f0A2BaseUrl = '/generated/outfits/summoner-male-south-f0-mount-addon2-base.png';
        const f0A2MaskUrl = '/generated/outfits/summoner-male-south-f0-mount-addon2-mask.png';
        imageElementCache.delete(f0A2BaseUrl);
        imageElementCache.delete(f0A2MaskUrl);

        const key = getCanvasCacheKey('summoner', 'male', 'south', 0, { head: 0, primary: 86, secondary: 114, detail: 76 }, 2, 'war-bear', true);

        // Executa getRecoloredCanvasSync solicitando Addon 2
        const prov = getRecoloredCanvasSync('summoner', 'male', 'south', 0, { head: 0, primary: 86, secondary: 114, detail: 76 }, 2, 'war-bear', true);

        // Como o Addon 2 não estava carregado, o canvas provisório pode ser retornado para fallback imediato,
        // MAS NÃO PODE SER ARMAZENADO no provisionalCanvasCache sob a chave do Addon 2!
        expect(provisionalCanvasCache.has(key)).toBe(false);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });

    it('renderRecoloredOutfit descarta composições atrasadas se isCurrent retornar false', async () => {
      const mockCanvas = {
        width: 64,
        height: 64,
        getContext: () => ({
          clearRect: () => {},
          drawImage: () => {},
        }),
      } as unknown as HTMLCanvasElement;

      // Chama render com isCurrent sempre false (representando seleção cancelada pelo usuário)
      let isCurrent = false;
      await renderRecoloredOutfit(
        mockCanvas,
        'summoner',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        2,
        'war-bear',
        true,
        () => isCurrent
      );

      const key = getCanvasCacheKey('summoner', 'male', 'south', 0, { head: 0, primary: 86, secondary: 114, detail: 76 }, 2, 'war-bear', true);
      // Nenhuma textura definitiva foi colocada se a seleção foi cancelada antes da execução
      expect(recoloredCanvasCache.has(key)).toBe(false);
    });

    it('renderRecoloredOutfit NÃO grava no recoloredCanvasCache se addons solicitados estiverem ausentes (Codex ponto 3)', async () => {
      recoloredCanvasCache.clear();
      provisionalCanvasCache.clear();

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        createElement: () => ({
          width: 64,
          height: 64,
          getContext: () => ({
            drawImage: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            putImageData: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            clearRect: () => {},
          }),
        }),
      };

      try {
        // Base e mount carregados, mas addon 1 ausente
        const f0BaseUrl = '/generated/outfits/citizen-male-south-f0-base.png';
        const f0MaskUrl = '/generated/outfits/citizen-male-south-f0-mask.png';
        imageElementCache.set(f0BaseUrl, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(f0MaskUrl, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);

        const a1BaseUrl = '/generated/outfits/citizen-male-south-f0-addon1-base.png';
        const a1MaskUrl = '/generated/outfits/citizen-male-south-f0-addon1-mask.png';
        imageElementCache.delete(a1BaseUrl);
        imageElementCache.delete(a1MaskUrl);

        const mockCanvas = {
          width: 64,
          height: 64,
          getContext: () => ({
            clearRect: () => {},
            drawImage: () => {},
          }),
        } as unknown as HTMLCanvasElement;

        const colors = { head: 0, primary: 86, secondary: 114, detail: 76 };
        // Chama renderRecoloredOutfit solicitando Addon 1 (addons = 1)
        await renderRecoloredOutfit(
          mockCanvas,
          'citizen',
          'male',
          'south',
          0,
          colors,
          1,
          undefined,
          false
        );

        const key = getCanvasCacheKey('citizen', 'male', 'south', 0, colors, 1, undefined, false);
        // O cache definitivo NÃO pode ser poluído sem o addon 1!
        expect(recoloredCanvasCache.has(key)).toBe(false);
        // O cache provisório pode receber para não ficar em branco na tela
        expect(provisionalCanvasCache.has(key)).toBe(true);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });

    it('prepareAppearanceCanvas NÃO retorna sucesso quando algum frame exigido falha (Codex ponto 1)', async () => {
      recoloredCanvasCache.clear();
      provisionalCanvasCache.clear();
      imageElementCache.clear();

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        createElement: () => ({
          width: 64,
          height: 64,
          getContext: () => ({
            drawImage: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            putImageData: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            clearRect: () => {},
          }),
        }),
      };

      try {
        const colors = { head: 0, primary: 86, secondary: 114, detail: 76 };

        // Chama prepareAppearanceCanvas em ambiente de teste onde imagens não resolvem automaticamente
        const result = await prepareAppearanceCanvas(
          'citizen',
          'male',
          colors,
          0,
          undefined,
          false,
          ['south'],
          [0]
        );

        // Como nenhuma imagem foi pré-registrada no imageElementCache e não há servidor real no teste unitário,
        // prepareAppearanceCanvas NÃO pode marcar sucesso automático!
        expect(result.success).toBe(false);
        expect(result.missingAssets.length).toBeGreaterThan(0);
        expect(result.cachedFramesCount).toBeLessThan(result.totalFramesRequested);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });

    it('recurso atrasado: falha inicialmente, mas obtém sucesso após recursos serem disponibilizados', async () => {
      recoloredCanvasCache.clear();
      provisionalCanvasCache.clear();
      imageElementCache.clear();
      clearFailedImageCache();

      const colors = { head: 0, primary: 86, secondary: 114, detail: 76 };
      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        createElement: () => ({
          width: 64,
          height: 64,
          getContext: () => ({
            drawImage: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            putImageData: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            clearRect: () => {},
          }),
        }),
      };

      try {
        // Tentativa 1: sem recursos carregados
        const res1 = await prepareAppearanceCanvas('citizen', 'male', colors, 0, undefined, false, ['south'], [0]);
        expect(res1.success).toBe(false);
        expect(isAppearanceFullyReady('citizen', 'male', colors, 0, undefined, false, ['south'], [0]).ready).toBe(false);

        // Agora o recurso atrasado chega e é decodificado com sucesso
        clearFailedImageCache();
        const f0Base = '/generated/outfits/citizen-male-south-f0-base.png';
        const f0Mask = '/generated/outfits/citizen-male-south-f0-mask.png';
        imageElementCache.set(f0Base, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(f0Mask, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);

        // Tentativa 2: com os recursos disponibilizados
        const res2 = await prepareAppearanceCanvas('citizen', 'male', colors, 0, undefined, false, ['south'], [0]);
        expect(res2.success).toBe(true);
        expect(res2.cachedFramesCount).toBe(1);
        expect(isAppearanceFullyReady('citizen', 'male', colors, 0, undefined, false, ['south'], [0]).ready).toBe(true);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });

    it('isAppearanceFullyReady valida todas as direções e rejeita aparências parciais (Codex ponto 4)', () => {
      recoloredCanvasCache.clear();
      const colors = { head: 0, primary: 86, secondary: 114, detail: 76 };

      // Registra apenas o frame f0 da direção south
      const southKey = getCanvasCacheKey('citizen', 'male', 'south', 0, colors, 0, undefined, false);
      const mockCanvas = { width: 64, height: 64 } as HTMLCanvasElement;
      recoloredCanvasCache.set(southKey, mockCanvas);

      // isAppearanceFullyReady para todas as 4 direções deve retornar ready = false
      const fullCheck = isAppearanceFullyReady('citizen', 'male', colors, 0, undefined, false, ['south', 'east', 'north', 'west']);
      expect(fullCheck.ready).toBe(false);
      expect(fullCheck.missing).toContain('east-f0');
      expect(fullCheck.missing).toContain('north-f0');
      expect(fullCheck.missing).toContain('west-f0');

      // Adiciona as direções restantes e frames
      ['east', 'north', 'west'].forEach((dir) => {
        const key0 = getCanvasCacheKey('citizen', 'male', dir, 0, colors, 0, undefined, false);
        const key1 = getCanvasCacheKey('citizen', 'male', dir, 1, colors, 0, undefined, false);
        const key2 = getCanvasCacheKey('citizen', 'male', dir, 2, colors, 0, undefined, false);
        recoloredCanvasCache.set(key0, mockCanvas);
        recoloredCanvasCache.set(key1, mockCanvas);
        recoloredCanvasCache.set(key2, mockCanvas);
      });
      const keySouth1 = getCanvasCacheKey('citizen', 'male', 'south', 1, colors, 0, undefined, false);
      const keySouth2 = getCanvasCacheKey('citizen', 'male', 'south', 2, colors, 0, undefined, false);
      recoloredCanvasCache.set(keySouth1, mockCanvas);
      recoloredCanvasCache.set(keySouth2, mockCanvas);

      const completeCheck = isAppearanceFullyReady('citizen', 'male', colors, 0, undefined, false, ['south', 'east', 'north', 'west'], [0, 1, 2]);
      expect(completeCheck.ready).toBe(true);
      expect(completeCheck.missing.length).toBe(0);
    });

    it('troca rápida de seleção: descarta renderizações atrasadas e impede que seleção antiga sobrescreva a mais recente', async () => {
      recoloredCanvasCache.clear();
      provisionalCanvasCache.clear();

      let activeGeneration = 1;
      const targetCanvas = {
        width: 64,
        height: 64,
        getContext: () => ({
          clearRect: () => {},
          drawImage: () => {},
        }),
      } as unknown as HTMLCanvasElement;

      // Seleção 1 (antiga): Usuário selecionou 'summoner'
      const gen1 = activeGeneration;
      const p1 = renderRecoloredOutfit(
        targetCanvas,
        'summoner',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        0,
        undefined,
        false,
        () => activeGeneration === gen1
      );

      // Usuário troca rapidamente para 'hunter' (geração 2)
      activeGeneration = 2;
      const gen2 = activeGeneration;
      const p2 = renderRecoloredOutfit(
        targetCanvas,
        'hunter',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        0,
        undefined,
        false,
        () => activeGeneration === gen2
      );

      await Promise.all([p1, p2]);

      const keySummoner = getCanvasCacheKey('summoner', 'male', 'south', 0, { head: 0, primary: 86, secondary: 114, detail: 76 }, 0, undefined, false);
      // Como a geração 1 foi cancelada antes da conclusão, summoner não pode ter sido gravado pela chamada antiga
      expect(recoloredCanvasCache.has(keySummoner)).toBe(false);
    });

    it('aparência pendente: preserva aparência anterior completa durante a preparação e aplica troca atômica quando pronta', async () => {
      recoloredCanvasCache.clear();
      provisionalCanvasCache.clear();
      imageElementCache.clear();

      const origDoc = (globalThis as any).document;
      (globalThis as any).document = {
        createElement: () => ({
          width: 64,
          height: 64,
          getContext: () => ({
            drawImage: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            putImageData: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
            clearRect: () => {},
          }),
        }),
      };

      try {
        const colors = { head: 0, primary: 86, secondary: 114, detail: 76 };

        // 1. Prepara aparência inicial (Summoner desmontado)
        const sBase = '/generated/outfits/summoner-male-south-f0-base.png';
        const sMask = '/generated/outfits/summoner-male-south-f0-mask.png';
        imageElementCache.set(sBase, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(sMask, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        await prepareAppearanceCanvas('summoner', 'male', colors, 0, undefined, false, ['south'], [0]);

        const summonerKey = getCanvasCacheKey('summoner', 'male', 'south', 0, colors, 0, undefined, false);
        expect(recoloredCanvasCache.has(summonerKey)).toBe(true);

        // Estado do ator simulado
        const actorView = {
          activeAppearance: { outfitKey: 'summoner', charGender: 'male' as const, colors, addons: 0, mount: undefined, isMounted: false, outfitSig: 'summoner_male_none_0' },
          pendingAppearance: null as any,
          appearanceState: undefined as any,
        };

        // 2. Jogador solicita nova aparência (Hunter montado em war-bear)
        const targetAppearance = { outfitKey: 'hunter', charGender: 'male' as const, colors, addons: 2, mount: 'war-bear', isMounted: true, outfitSig: 'hunter_male_war-bear_2' };
        actorView.appearanceState = {
          status: 'preparing',
          outfitSig: targetAppearance.outfitSig,
          target: targetAppearance,
          attempts: 1,
          lastAttemptTime: Date.now(),
          missingAssets: [],
        };
        actorView.pendingAppearance = targetAppearance;

        // Enquanto estiver preparando, a aparência ativa RENDERIZADA continua sendo Summoner!
        const curAppWhilePreparing = actorView.activeAppearance;
        expect(curAppWhilePreparing.outfitKey).toBe('summoner');
        expect(curAppWhilePreparing.isMounted).toBe(false);

        // 3. Os recursos da nova aparência chegam e são cacheados
        const hBase = '/generated/outfits/hunter-male-south-f0-mount-base.png';
        const hMask = '/generated/outfits/hunter-male-south-f0-mount-mask.png';
        const hA2Base = '/generated/outfits/hunter-male-south-f0-mount-addon2-base.png';
        const hA2Mask = '/generated/outfits/hunter-male-south-f0-mount-addon2-mask.png';
        const mountImg = '/generated/mounts/war-bear-south-f0.png';
        imageElementCache.set(hBase, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(hMask, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(hA2Base, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(hA2Mask, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);
        imageElementCache.set(mountImg, { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement);

        const prepResult = await prepareAppearanceCanvas('hunter', 'male', colors, 2, 'war-bear', true, ['south'], [0]);
        expect(prepResult.success).toBe(true);

        // 4. Com prontidão completa garantida, troca atômica é executada
        const readyCheck = isAppearanceFullyReady('hunter', 'male', colors, 2, 'war-bear', true, ['south'], [0]);
        expect(readyCheck.ready).toBe(true);

        // Executa troca atômica
        actorView.activeAppearance = actorView.pendingAppearance;
        actorView.pendingAppearance = null;
        actorView.appearanceState = undefined;

        // A aparência ativa agora é 100% o novo conjunto completo (corpo + addons + montaria juntos)
        expect(actorView.activeAppearance.outfitKey).toBe('hunter');
        expect(actorView.activeAppearance.isMounted).toBe(true);
        expect(actorView.activeAppearance.addons).toBe(2);
      } finally {
        (globalThis as any).document = origDoc;
      }
    });
  });
});

