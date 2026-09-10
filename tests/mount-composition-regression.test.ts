import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  clearImageElementCache,
  clearRecoloredCanvasCache,
  getMountDisplacementOffset,
  getOutfitLayerUrls,
  getRecoloredCanvasSync,
  isOutfitCanvasCached,
  registerCachedImage,
  type OutfitColors,
} from '../apps/web/lib/outfitRecolor';
import { parseTibia1098Dat } from '../packages/tibia1098-assets/src/dat.ts';

describe('Phase 120: Mount Composition, Layer Caching & Mounted Addons Regression', () => {
  const colors: OutfitColors = { head: 10, primary: 20, secondary: 30, detail: 40 };

  describe('1. Metadados de Deslocamento (ThingAttrDisplacement) e Cálculo Relativo', () => {
    it('preserva ThingAttrDisplacement ao parsear o Tibia.dat', () => {
      const datBuffer = fs.readFileSync('Tibia 10/tibia/Tibia.dat');
      const dat = parseTibia1098Dat(datBuffer);

      // Citizen male (lookType 128)
      const citizenM = dat.appearances.creature.get(128);
      expect(citizenM).toBeDefined();
      expect(citizenM?.displacement).toEqual({ x: 8, y: 8 });

      // War Bear mount (clientId 370)
      const warBear = dat.appearances.creature.get(370);
      expect(warBear).toBeDefined();
      // War Bear tem 2x2 e sem deslocamento especial (disp undefined / {0,0})
      expect(warBear?.displacement).toBeUndefined();
    });

    it('exporta metadados de deslocamento e dimensões nos JSONs gerados', () => {
      const outfits = JSON.parse(fs.readFileSync('content/generated/outfits.json', 'utf8'));
      const mounts = JSON.parse(fs.readFileSync('content/generated/mounts.json', 'utf8'));

      const citizen = outfits.find((o: any) => o.id === 'citizen');
      expect(citizen).toBeDefined();
      expect(citizen.displacement).toEqual({ x: 8, y: 8 });
      expect(citizen.maleDisplacement).toEqual({ x: 8, y: 8 });
      expect(citizen.femaleDisplacement).toEqual({ x: 8, y: 8 });

      const warBear = mounts.find((m: any) => m.id === 'war-bear');
      expect(warBear).toBeDefined();
      expect(warBear.displacement).toEqual({ x: 0, y: 0 });
      expect(warBear.width).toBe(2);
      expect(warBear.height).toBe(2);

      const blackSheep = mounts.find((m: any) => m.id === 'black-sheep');
      expect(blackSheep).toBeDefined();
      expect(blackSheep.displacement).toEqual({ x: 0, y: 0 });
      expect(blackSheep.width).toBe(2);
      expect(blackSheep.height).toBe(2);
    });

    it('calcula o deslocamento relativo correto de Citizen no War Bear nas 4 direções', () => {
      // Citizen (size 2x2) em War Bear (size 2x2)
      // No motor CipSoft / OTClient, a pose montada (z=1) é desenhada na mesma grade 64x64 com origem (0, 0).
      // ThingAttrDisplacement é o deslocamento do ser no grid do mapa ao andar a pé, não um offset relativo entre cavaleiro e montaria.
      // offsetX = (2 - 2)*32 = 0
      // offsetY = (2 - 2)*32 = 0
      const offset = getMountDisplacementOffset('citizen', 'male', 'war-bear');
      expect(offset).toEqual({ x: 0, y: 0 });

      const offsetFemale = getMountDisplacementOffset('citizen', 'female', 'war-bear');
      expect(offsetFemale).toEqual({ x: 0, y: 0 });

      // Quando desmontado ou sem montaria: deslocamento é (0,0)
      expect(getMountDisplacementOffset('citizen', 'male', 'none')).toEqual({ x: 0, y: 0 });
      expect(getMountDisplacementOffset('citizen', 'male', undefined)).toEqual({ x: 0, y: 0 });
    });
  });

  describe('2. Addons Montados (z = 1) e Seleção de Camadas', () => {
    it('seleciona URLs de addons montados quando isMounted é true', () => {
      const mountedUrls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 3, 'war-bear', true);
      expect(mountedUrls.base).toContain('citizen-male-south-f0-mount-base.png');
      expect(mountedUrls.mask).toContain('citizen-male-south-f0-mount-mask.png');
      expect(mountedUrls.addon1Base).toContain('citizen-male-south-f0-mount-addon1-base.png');
      expect(mountedUrls.addon1Mask).toContain('citizen-male-south-f0-mount-addon1-mask.png');
      expect(mountedUrls.addon2Base).toContain('citizen-male-south-f0-mount-addon2-base.png');
      expect(mountedUrls.addon2Mask).toContain('citizen-male-south-f0-mount-addon2-mask.png');
      expect(mountedUrls.mountUrl).toContain('war-bear-south-f0.png');
    });

    it('seleciona URLs de addons normais (a pé) quando isMounted é false', () => {
      const unmountedUrls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 3, 'war-bear', false);
      expect(unmountedUrls.base).toContain('citizen-male-south-f0-base.png');
      expect(unmountedUrls.mask).toContain('citizen-male-south-f0-mask.png');
      expect(unmountedUrls.addon1Base).toContain('citizen-male-south-f0-addon1-base.png');
      expect(unmountedUrls.addon1Mask).toContain('citizen-male-south-f0-addon1-mask.png');
      expect(unmountedUrls.addon2Base).toContain('citizen-male-south-f0-addon2-base.png');
      expect(unmountedUrls.addon2Mask).toContain('citizen-male-south-f0-addon2-mask.png');
      expect(unmountedUrls.mountUrl).toBeUndefined();
    });

    it('arquivos de addons montados existem em disco para idle e walk cycle', () => {
      expect(fs.existsSync('public/generated/outfits/citizen-male-south-f0-mount-addon1-base.png')).toBe(true);
      expect(fs.existsSync('public/generated/outfits/citizen-male-south-f0-mount-addon1-mask.png')).toBe(true);
      expect(fs.existsSync('public/generated/outfits/citizen-male-south-f0-mount-addon2-base.png')).toBe(true);
      expect(fs.existsSync('public/generated/outfits/citizen-male-south-f0-mount-addon2-mask.png')).toBe(true);

      // Walk frames f1..f8
      for (let f = 1; f <= 8; f++) {
        expect(fs.existsSync(`public/generated/outfits/citizen-male-south-f${f}-mount-addon1-base.png`)).toBe(true);
      }
    });
  });

  describe('3. Invariante de Cache e Prevenção de Cache Poisoning (Black Sheep / Carregamento Lento)', () => {
    let originalWindow: any;
    let originalDocument: any;
    let originalImage: any;

    const drawnOperations: Array<{ method: string; args: any[] }> = [];

    class MockContext2D {
      drawImage(...args: any[]) {
        drawnOperations.push({ method: 'drawImage', args });
      }
      getImageData() {
        return { data: new Uint8ClampedArray(64 * 64 * 4) };
      }
      createImageData() {
        return { data: new Uint8ClampedArray(64 * 64 * 4) };
      }
      putImageData() {}
      clearRect() {}
    }

    class MockCanvas {
      width = 64;
      height = 64;
      getContext() {
        return new MockContext2D();
      }
    }

    class MockImage {
      src = '';
      crossOrigin = '';
      complete = false;
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
    }

    beforeEach(() => {
      clearRecoloredCanvasCache();
      clearImageElementCache();
      drawnOperations.length = 0;

      originalWindow = (globalThis as any).window;
      originalDocument = (globalThis as any).document;
      originalImage = (globalThis as any).Image;

      (globalThis as any).window = globalThis;
      (globalThis as any).document = {
        createElement: (tag: string) => (tag === 'canvas' ? new MockCanvas() : {}),
      };
      (globalThis as any).Image = MockImage;
    });

    afterEach(() => {
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
      (globalThis as any).Image = originalImage;
      clearRecoloredCanvasCache();
      clearImageElementCache();
    });

    it('NÃO armazena composição definitiva no cache quando a montaria ainda não carregou', () => {
      const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 0, 'black-sheep', true);

      // Simula: Rider base e mask já terminaram de carregar
      const baseMock = new MockImage();
      baseMock.src = urls.base;
      baseMock.complete = true;
      baseMock.naturalWidth = 64;
      baseMock.naturalHeight = 64;
      registerCachedImage(urls.base, baseMock as any);

      const maskMock = new MockImage();
      maskMock.src = urls.mask;
      maskMock.complete = true;
      maskMock.naturalWidth = 64;
      maskMock.naturalHeight = 64;
      registerCachedImage(urls.mask, maskMock as any);

      // Montaria NÃO carregou ainda (não está em imageElementCache)

      // Chama getRecoloredCanvasSync
      const result = getRecoloredCanvasSync('citizen', 'male', 'south', 0, colors, 0, 'black-sheep', true);

      // Invariante 1: O cache definitivo NÃO pode conter a chave mounted
      expect(isOutfitCanvasCached('citizen', 'male', 'south', 0, colors, 0, 'black-sheep', true)).toBe(false);

      // Invariante 2: A montaria não foi desenhada porque não estava pronta
      const mountDraw = drawnOperations.find(
        (op) => op.method === 'drawImage' && op.args[0]?.src?.includes('black-sheep')
      );
      expect(mountDraw).toBeUndefined();

      // Invariante 3: Agora simula que a montaria termina de carregar
      const mountMock = new MockImage();
      mountMock.src = urls.mountUrl!;
      mountMock.complete = true;
      mountMock.naturalWidth = 64;
      mountMock.naturalHeight = 64;
      registerCachedImage(urls.mountUrl!, mountMock as any);

      // Chama getRecoloredCanvasSync novamente
      drawnOperations.length = 0;
      const definitiveResult = getRecoloredCanvasSync('citizen', 'male', 'south', 0, colors, 0, 'black-sheep', true);
      expect(definitiveResult).toBeDefined();

      // Invariante 4: Agora sim está em cache definitivo!
      expect(isOutfitCanvasCached('citizen', 'male', 'south', 0, colors, 0, 'black-sheep', true)).toBe(true);

      // Invariante 5: A montaria foi desenhada em (0,0)
      const mountOp = drawnOperations.find(
        (op) => op.method === 'drawImage' && op.args[0]?.src?.includes('black-sheep')
      );
      expect(mountOp).toBeDefined();
      expect(mountOp?.args[1]).toBe(0); // x = 0
      expect(mountOp?.args[2]).toBe(0); // y = 0

      // Invariante 6: O cavaleiro foi desenhado com o deslocamento relativo autêntico (0, 0)
      // drawRecoloredLayer desenha o recoloredCanvas no targetCtx em (destX, destY)
      const riderDraw = drawnOperations.find(
        (op) => op.method === 'drawImage' && op.args[1] === 0 && op.args[2] === 0
      );
      expect(riderDraw).toBeDefined();
    });

    it('troca de montaria e alternância entre montado e desmontado mantêm chaves independentes', () => {
      // 1. Simula imagens carregadas para war-bear, black-sheep e citizen
      const bearUrls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 0, 'war-bear', true);
      const sheepUrls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 0, 'black-sheep', true);
      const unmountedUrls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 0, undefined, false);

      const makeReady = (url: string) => {
        const img = new MockImage();
        img.src = url;
        img.complete = true;
        img.naturalWidth = 64;
        img.naturalHeight = 64;
        registerCachedImage(url, img as any);
      };

      [bearUrls.base, bearUrls.mask, bearUrls.mountUrl!,
       sheepUrls.base, sheepUrls.mask, sheepUrls.mountUrl!,
       unmountedUrls.base, unmountedUrls.mask].forEach(makeReady);

      // Renderiza war-bear
      getRecoloredCanvasSync('citizen', 'male', 'south', 0, colors, 0, 'war-bear', true);
      expect(isOutfitCanvasCached('citizen', 'male', 'south', 0, colors, 0, 'war-bear', true)).toBe(true);
      expect(isOutfitCanvasCached('citizen', 'male', 'south', 0, colors, 0, 'black-sheep', true)).toBe(false);
      expect(isOutfitCanvasCached('citizen', 'male', 'south', 0, colors, 0, undefined, false)).toBe(false);

      // Renderiza black-sheep
      getRecoloredCanvasSync('citizen', 'male', 'south', 0, colors, 0, 'black-sheep', true);
      expect(isOutfitCanvasCached('citizen', 'male', 'south', 0, colors, 0, 'black-sheep', true)).toBe(true);

      // Desmonta
      getRecoloredCanvasSync('citizen', 'male', 'south', 0, colors, 0, undefined, false);
      expect(isOutfitCanvasCached('citizen', 'male', 'south', 0, colors, 0, undefined, false)).toBe(true);
    });
  });
});

