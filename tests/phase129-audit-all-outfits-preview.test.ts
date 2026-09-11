import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import rawOutfitsJson from '../content/generated/outfits.json';
import rawMountsJson from '../content/generated/mounts.json';
import {
  normalizeOutfitId,
  normalizeMountId,
  getOutfitCapabilities,
  getOutfitLayerUrls,
  renderRecoloredOutfit,
  loadImage,
  clearImageElementCache,
  clearRecoloredCanvasCache,
  registerCachedImage,
  getRecoloredCanvasSync,
  isImagePermanentlyFailed,
} from '../apps/web/lib/outfitRecolor';
import { AVAILABLE_OUTFITS, AVAILABLE_MOUNTS, CLASSIC_OUTFITS } from '../apps/web/components/OutfitModal';

describe('Phase 129: Auditoria Integral de Outfits e Montarias contra Travamentos e Mapeamentos Inválidos', () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalImage: any;

  class MockContext2D {
    public drawCalls = 0;
    public clearCalls = 0;
    clearRect() {
      this.clearCalls++;
    }
    drawImage() {
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
      const diskPath = path.resolve(process.cwd(), 'public' + val);
      if (fs.existsSync(diskPath)) {
        this.complete = true;
        this.naturalWidth = 64;
        this.naturalHeight = 64;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 1);
      } else {
        setTimeout(() => {
          if (this.onerror) this.onerror();
        }, 1);
      }
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

  it('Item 1: Retro Nobleman normaliza corretamente para retro-noblewoman e NAO para noblewoman', () => {
    expect(normalizeOutfitId('retro-noblewoman')).toBe('retro-noblewoman');
    expect(normalizeOutfitId('Retro Nobleman')).toBe('retro-noblewoman');
    expect(normalizeOutfitId('retro nobleman')).toBe('retro-noblewoman');
    expect(normalizeOutfitId('Retro Noblewoman')).toBe('retro-noblewoman');
    expect(normalizeOutfitId('retro noble')).toBe('retro-noblewoman');

    // Noble clássico continua normalizando para noblewoman
    expect(normalizeOutfitId('Noble')).toBe('noblewoman');
    expect(normalizeOutfitId('noble')).toBe('noblewoman');
    expect(normalizeOutfitId('Nobleman')).toBe('noblewoman');
    expect(normalizeOutfitId('Noblewoman')).toBe('noblewoman');

    // Norseman normaliza para norsewoman
    expect(normalizeOutfitId('Norseman')).toBe('norsewoman');
    expect(normalizeOutfitId('Norsewoman')).toBe('norsewoman');
    expect(normalizeOutfitId('norseman')).toBe('norsewoman');
    expect(normalizeOutfitId('norse')).toBe('norsewoman');
  });

  it('Item 2: Todos os outfits em AVAILABLE_OUTFITS normalizam para seus respectivos IDs canônicos', () => {
    for (const o of AVAILABLE_OUTFITS) {
      const norm = normalizeOutfitId(o.id);
      expect(norm).toBeDefined();
      expect(norm.length).toBeGreaterThan(0);

      // Verify thumbnail file exists for this normalized ID
      const thumbPath = path.resolve(process.cwd(), `public/generated/outfit-thumbs/${norm}.png`);
      expect(fs.existsSync(thumbPath)).toBe(true);
    }
  });

  it('Item 3: renderRecoloredOutfit renderiza com sucesso todos os 78 outfits sem congelar nem lançar erro', async () => {
    for (const o of AVAILABLE_OUTFITS) {
      const targetCanvas = new MockCanvas();
      await renderRecoloredOutfit(
        targetCanvas as any,
        o.id,
        'male',
        'south',
        0,
        { head: 0, primary: 86, secondary: 114, detail: 76 },
        0,
        'none',
        false,
        () => true
      );
      expect(targetCanvas.ctx.drawCalls).toBeGreaterThan(0);
    }
  });

  it('Item 4: renderRecoloredOutfit com montaria ativa renderiza para outfits com hasMountRider', async () => {
    const targetCanvas = new MockCanvas();
    await renderRecoloredOutfit(
      targetCanvas as any,
      'Knight',
      'male',
      'south',
      0,
      { head: 0, primary: 86, secondary: 114, detail: 76 },
      0,
      'donkey',
      true,
      () => true
    );
    expect(targetCanvas.ctx.drawCalls).toBeGreaterThan(0);
  });

  it('Item 5: Todas as 4 direções e variantes de gênero renderizam sem erro para trajes clássicos e retrô', async () => {
    const testOutfits = ['Knight', 'retro-noblewoman', 'retro-knight', 'sire', 'Citizen', 'Mage'];
    const directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'];

    for (const outfitId of testOutfits) {
      for (const gender of ['male', 'female'] as const) {
        for (const dir of directions) {
          const targetCanvas = new MockCanvas();
          await renderRecoloredOutfit(
            targetCanvas as any,
            outfitId,
            gender,
            dir,
            0,
            { head: 10, primary: 20, secondary: 30, detail: 40 },
            0,
            'none',
            false,
            () => true
          );
          expect(targetCanvas.ctx.drawCalls).toBeGreaterThan(0);
        }
      }
    }
  });

  it('Item 6: Renderização com addons ativos (1, 2 e 3) funciona seguramente para trajes compatíveis e incompatíveis', async () => {
    const targetCanvas = new MockCanvas();

    // Citizen tem suporte a addon 1 e 2
    await renderRecoloredOutfit(
      targetCanvas as any,
      'Citizen',
      'male',
      'south',
      0,
      { head: 0, primary: 86, secondary: 114, detail: 76 },
      3, // Addons 1 e 2
      'none',
      false,
      () => true
    );
    expect(targetCanvas.ctx.drawCalls).toBeGreaterThan(0);

    // Sire e Retro-Knight não possuem addons, renderização não quebra nem congela
    const sireCanvas = new MockCanvas();
    await renderRecoloredOutfit(
      sireCanvas as any,
      'Sire',
      'male',
      'south',
      0,
      { head: 0, primary: 86, secondary: 114, detail: 76 },
      3,
      'none',
      false,
      () => true
    );
    expect(sireCanvas.ctx.drawCalls).toBeGreaterThan(0);
  });

  it('Item 7: Timeout de segurança em loadImage não deixa Promises travadas se o carregamento estacionar', async () => {
    class HangingImage {
      public crossOrigin = '';
      public complete = false;
      public naturalWidth = 0;
      public naturalHeight = 0;
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      // Intentionally never fires onload or onerror
      set src(_val: string) {}
      get src() {
        return '';
      }
    }

    (globalThis as any).Image = HangingImage;

    const start = Date.now();
    let caught = false;
    try {
      await loadImage('/stuck-image-simulation.png');
    } catch (err: any) {
      caught = true;
      expect(err.message).toContain('Failed to load image');
    }

    expect(caught).toBe(true);
    // Timeout is 3500ms, should resolve in ~3500ms
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(3000);
  }, 10000);
});
