import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  loadImage,
  registerCachedImage,
  registerFailedImage,
  clearImageElementCache,
  clearRecoloredCanvasCache,
  getRecoloredCanvasSync,
  isOutfitCanvasCached,
  getCanvasCacheKey,
  renderRecoloredOutfit,
  normalizeOutfitId,
  normalizeMountId,
  getOutfitLayerUrls,
  getOutfitCapabilities,
  failedImageUrls,
} from '../apps/web/lib/outfitRecolor';

describe('Phase 122: Navegação Personagem ↔ Outfit, Capabilities de Addon/Montaria, Suporte ao Sire e Token de Concorrência', () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalImage: any;

  class MockContext2D {
    public drawCalls = 0;
    public clearCalls = 0;
    clearRect(x: number, y: number, w: number, h: number) {
      this.clearCalls++;
    }
    drawImage(..._args: any[]) {
      this.drawCalls++;
    }
    getImageData() {
      return { data: new Uint8ClampedArray(64 * 64 * 4), width: 64, height: 64 };
    }
    createImageData() {
      return { data: new Uint8ClampedArray(64 * 64 * 4), width: 64, height: 64 };
    }
    putImageData() {}
  }

  class MockCanvas {
    width = 64;
    height = 64;
    public ctx = new MockContext2D();
    getContext() {
      return this.ctx;
    }
  }

  class MockImage {
    private _src = '';
    public crossOrigin = '';
    public complete = false;
    public naturalWidth = 0;
    public naturalHeight = 0;
    public onload: (() => void) | null = null;
    public onerror: (() => void) | null = null;

    set src(val: string) {
      this._src = val;
    }
    get src() {
      return this._src;
    }
  }

  beforeEach(() => {
    clearImageElementCache();
    clearRecoloredCanvasCache();

    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;
    originalImage = (globalThis as any).Image;

    (globalThis as any).window = globalThis;
    (globalThis as any).document = {
      createElement: (tag: string) => (tag === 'canvas' ? new MockCanvas() : new MockImage()),
    };
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    (globalThis as any).Image = originalImage;
  });

  describe('Item 1 & 2: Capabilities do catálogo e camadas inexistentes não bloqueando composição', () => {
    it('informa capabilities corretas para retro-knight e sire (sem addons)', () => {
      const retroKnightCaps = getOutfitCapabilities('retro-knight');
      expect(retroKnightCaps.hasAddon1).toBe(false);
      expect(retroKnightCaps.hasAddon2).toBe(false);
      expect(retroKnightCaps.hasMountRider).toBe(true);
      expect(retroKnightCaps.maxFrames).toBe(9);

      const sireCaps = getOutfitCapabilities('sire');
      expect(sireCaps.hasAddon1).toBe(false);
      expect(sireCaps.hasAddon2).toBe(false);
      expect(sireCaps.hasMountRider).toBe(false);
      expect(sireCaps.maxFrames).toBe(3);

      const citizenCaps = getOutfitCapabilities('citizen');
      expect(citizenCaps.hasAddon1).toBe(true);
      expect(citizenCaps.hasAddon2).toBe(true);
      expect(citizenCaps.hasMountRider).toBe(true);
      expect(citizenCaps.maxFrames).toBe(9);
    });

    it('getOutfitLayerUrls não gera URLs de addon para outfits incompatíveis como retro-knight mesmo com addons=3', () => {
      const urls = getOutfitLayerUrls('retro-knight', 'male', 'south', 0, 3);
      expect(urls.base).toContain('retro-knight-male-south-f0-base.png');
      expect(urls.mask).toContain('retro-knight-male-south-f0-mask.png');
      expect(urls.addon1Base).toBeUndefined();
      expect(urls.addon1Mask).toBeUndefined();
      expect(urls.addon2Base).toBeUndefined();
      expect(urls.addon2Mask).toBeUndefined();
    });

    it('getRecoloredCanvasSync não retorna null para retro-knight com addon 1 quando base e máscara estão prontas', () => {
      const urls = getOutfitLayerUrls('retro-knight', 'male', 'south', 0, 1);

      // Register base and mask in cache
      const mockBase = new MockImage();
      mockBase.complete = true;
      mockBase.naturalWidth = 64;
      mockBase.naturalHeight = 64;

      const mockMask = new MockImage();
      mockMask.complete = true;
      mockMask.naturalWidth = 64;
      mockMask.naturalHeight = 64;

      registerCachedImage(urls.base, mockBase as any);
      registerCachedImage(urls.mask, mockMask as any);

      // Call getRecoloredCanvasSync requesting addon 1
      const canvas = getRecoloredCanvasSync(
        'retro-knight',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        1
      );

      // MUST NOT be null! Base and mask are ready and retro-knight has no addon 1
      expect(canvas).not.toBeNull();
    });

    it('distingue asset inexistente (404 / failed) de asset carregando: failedImageUrls não bloqueia composição', () => {
      const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 1);

      const mockBase = new MockImage();
      mockBase.complete = true;
      mockBase.naturalWidth = 64;
      mockBase.naturalHeight = 64;

      const mockMask = new MockImage();
      mockMask.complete = true;
      mockMask.naturalWidth = 64;
      mockMask.naturalHeight = 64;

      registerCachedImage(urls.base, mockBase as any);
      registerCachedImage(urls.mask, mockMask as any);

      // Mark addon 1 as failed / 404
      registerFailedImage(urls.addon1Base!);
      registerFailedImage(urls.addon1Mask!);

      // getRecoloredCanvasSync should gracefully compose base + mask without blocking indefinitely on addon 1
      const canvas = getRecoloredCanvasSync(
        'citizen',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        1
      );

      expect(canvas).not.toBeNull();
    });
  });

  describe('Item 3: Sire compatibilidade de frames e recusa de montaria', () => {
    it('mapeia ciclos de caminhada para Sire entre f1 e f2 sem nunca requisitar f3..f8', () => {
      // Frame 0: idle
      const f0 = getOutfitLayerUrls('sire', 'male', 'south', 0);
      expect(f0.base).toContain('sire-male-south-f0-base.png');

      // Frame 1: walk 1
      const f1 = getOutfitLayerUrls('sire', 'male', 'south', 1);
      expect(f1.base).toContain('sire-male-south-f1-base.png');

      // Frame 2: walk 2
      const f2 = getOutfitLayerUrls('sire', 'male', 'south', 2);
      expect(f2.base).toContain('sire-male-south-f2-base.png');

      // Frame 3: cycles back to f1
      const f3 = getOutfitLayerUrls('sire', 'male', 'south', 3);
      expect(f3.base).toContain('sire-male-south-f1-base.png');

      // Frame 4: cycles to f2
      const f4 = getOutfitLayerUrls('sire', 'male', 'south', 4);
      expect(f4.base).toContain('sire-male-south-f2-base.png');

      // Frame 5: cycles to f1
      const f5 = getOutfitLayerUrls('sire', 'male', 'south', 5);
      expect(f5.base).toContain('sire-male-south-f1-base.png');

      // Frame 8: cycles to f2
      const f8 = getOutfitLayerUrls('sire', 'male', 'south', 8);
      expect(f8.base).toContain('sire-male-south-f2-base.png');
    });

    it('Sire recusa montaria: nunca gera mountUrl e utiliza pose a pé mesmo com isMounted=true', () => {
      const urls = getOutfitLayerUrls('sire', 'male', 'south', 0, 0, 'widow-queen', true);
      expect(urls.mountUrl).toBeUndefined();
      expect(urls.base).toContain('sire-male-south-f0-base.png');
      expect(urls.base).not.toContain('mount');
    });
  });

  describe('Item 4: Concorrência no preview e token de cancelamento', () => {
    it('renderRecoloredOutfit aborta sem desenhar no canvas se isCurrent() retornar false', async () => {
      const targetCanvas = new MockCanvas();

      // Register images so load succeeds immediately
      const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0);
      const mockImg = new MockImage();
      mockImg.complete = true;
      mockImg.naturalWidth = 64;
      mockImg.naturalHeight = 64;
      registerCachedImage(urls.base, mockImg as any);
      registerCachedImage(urls.mask, mockImg as any);

      // Call render with isCurrent = () => false (stale render)
      await renderRecoloredOutfit(
        targetCanvas as any,
        'citizen',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        0,
        'none',
        false,
        () => false
      );

      // Target canvas was NOT updated because render was cancelled!
      expect(targetCanvas.ctx.drawCalls).toBe(0);
      expect(targetCanvas.ctx.clearCalls).toBe(0);
    });

    it('renderRecoloredOutfit atualiza o canvas quando isCurrent() retorna true', async () => {
      const targetCanvas = new MockCanvas();

      const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0);
      const mockImg = new MockImage();
      mockImg.complete = true;
      mockImg.naturalWidth = 64;
      mockImg.naturalHeight = 64;
      registerCachedImage(urls.base, mockImg as any);
      registerCachedImage(urls.mask, mockImg as any);

      await renderRecoloredOutfit(
        targetCanvas as any,
        'citizen',
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        0,
        'none',
        false,
        () => true
      );

      // Target canvas was drawn
      expect(targetCanvas.ctx.drawCalls).toBeGreaterThan(0);
      expect(targetCanvas.ctx.clearCalls).toBe(1);
    });
  });

  describe('Item 5: Integridade dos Avatares PNG e Assets do Sire em Disco', () => {
    it('todos os 5 avatares possuem cabeçalho autêntico PNG (89 50 4E 47)', () => {
      const avatarsDir = path.resolve(process.cwd(), 'public/images/avatars');
      for (let i = 1; i <= 5; i++) {
        const file = path.join(avatarsDir, `avatar-${i}.png`);
        expect(fs.existsSync(file)).toBe(true);
        const buffer = fs.readFileSync(file);
        expect(buffer.length).toBeGreaterThan(10000);
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50);
        expect(buffer[2]).toBe(0x4e);
        expect(buffer[3]).toBe(0x47);
      }
    });

    it('assets do Sire e thumbnail existem em disco com sprites válidos', () => {
      const thumb = path.resolve(process.cwd(), 'public/generated/outfit-thumbs/sire.png');
      expect(fs.existsSync(thumb)).toBe(true);
      expect(fs.statSync(thumb).size).toBeGreaterThan(500);

      const dirs = ['south', 'east', 'north', 'west'];
      const frames = [0, 1, 2];
      for (const d of dirs) {
        for (const f of frames) {
          const baseFile = path.resolve(process.cwd(), `public/generated/outfits/sire-male-${d}-f${f}-base.png`);
          const maskFile = path.resolve(process.cwd(), `public/generated/outfits/sire-male-${d}-f${f}-mask.png`);
          expect(fs.existsSync(baseFile)).toBe(true);
          expect(fs.existsSync(maskFile)).toBe(true);
          expect(fs.statSync(baseFile).size).toBeGreaterThan(500);
          expect(fs.statSync(maskFile).size).toBeGreaterThan(100);
        }
      }
    });
  });
});
