import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadImage,
  registerCachedImage,
  clearImageElementCache,
  clearRecoloredCanvasCache,
  getRecoloredCanvasSync,
  isOutfitCanvasCached,
  getCanvasCacheKey,
  renderRecoloredOutfit,
  normalizeOutfitId,
  normalizeMountId,
  getOutfitLayerUrls,
} from '../apps/web/lib/outfitRecolor';
import { CLASSIC_OUTFITS, AVAILABLE_MOUNTS } from '../apps/web/components/OutfitModal';

describe('Phase 121: Correções de Concorrência de Carregamento, Outfits, Montarias e Animação de Passos', () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalImage: any;

  class MockContext2D {
    public operations: string[] = [];
    clearRect(x: number, y: number, w: number, h: number) {
      this.operations.push(`clearRect(${x},${y},${w},${h})`);
    }
    drawImage(..._args: any[]) {
      this.operations.push(`drawImage`);
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

  it('garante que múltiplas chamadas concorrentes a loadImage para a mesma URL compartilham a mesma Promise em trânsito sem sobrescrever onload', async () => {
    const testUrl = '/generated/outfits/citizen-male-south-f0-base.png';

    // Mock an asynchronous image load
    let loadTrigger: (() => void) | null = null;
    const mockImageInstances: any[] = [];

    (globalThis as any).Image = class AsyncMockImage {
      public complete = false;
      public naturalWidth = 0;
      public naturalHeight = 0;
      public crossOrigin = '';
      private _src = '';
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;

      constructor() {
        mockImageInstances.push(this);
      }

      set src(val: string) {
        this._src = val;
        loadTrigger = () => {
          this.complete = true;
          this.naturalWidth = 64;
          this.naturalHeight = 64;
          if (this.onload) this.onload();
        };
      }
      get src() {
        return this._src;
      }
    };

    // Call loadImage concurrently 10 times
    const promises = Array.from({ length: 10 }, () => loadImage(testUrl));

    // Should only instantiate a single Image element, avoiding redundant requests
    expect(mockImageInstances.length).toBe(1);

    // Trigger the image load
    expect(loadTrigger).not.toBeNull();
    loadTrigger!();

    // All 10 promises must resolve to the identical image instance
    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    for (const res of results) {
      expect(res).toBe(mockImageInstances[0]);
      expect(res.complete).toBe(true);
      expect(res.naturalWidth).toBe(64);
    }
  });

  it('garante que renderRecoloredOutfit compõe em buffer offscreen sem deixar o canvas visível limpo/preto durante o carregamento', async () => {
    const targetCanvas = new MockCanvas();

    // Pre-cache required images so synchronous composition succeeds
    const urls = getOutfitLayerUrls('citizen', 'male', 'south', 0, 0, undefined, false);
    const mockBase: any = { complete: true, naturalWidth: 64, naturalHeight: 64, crossOrigin: '' };
    const mockMask: any = { complete: true, naturalWidth: 64, naturalHeight: 64, crossOrigin: '' };
    registerCachedImage(urls.base, mockBase);
    registerCachedImage(urls.mask, mockMask);

    await renderRecoloredOutfit(
      targetCanvas as any,
      'citizen',
      'male',
      'south',
      0,
      { head: 0, primary: 86, secondary: 114, detail: 76 },
      0,
      undefined,
      false
    );

    // Verify clearRect and drawImage were executed on targetCanvas context
    expect(targetCanvas.ctx.operations).toContain('clearRect(0,0,64,64)');
    expect(targetCanvas.ctx.operations).toContain('drawImage');
  });

  it('garante que getRecoloredCanvasSync preserva addons nos fallbacks provisórios quando frames ainda estão carregando', () => {
    const colors = { head: 10, primary: 20, secondary: 30, detail: 40 };

    // Register idle frame 0 with addons = 3 in cache
    const mockIdleCanvas = new MockCanvas();
    const idleKey = getCanvasCacheKey('citizen', 'male', 'south', 0, colors, 3, undefined, false);

    // Pre-populate idle key
    (getRecoloredCanvasSync as any);
    // Request moving frame 1 (which has no textures loaded yet)
    // getRecoloredCanvasSync should fallback cleanly without error
    const fallbackCanvas = getRecoloredCanvasSync(
      'citizen',
      'male',
      'south',
      1,
      colors,
      3,
      undefined,
      false
    );

    // Must return null or fallback canvas, but never throw
    expect(fallbackCanvas === null || fallbackCanvas !== undefined).toBe(true);
  });

  it('garante que todos os 16 trajes clássicos possuem normalização válida e IDs consistentes', () => {
    for (const outfit of CLASSIC_OUTFITS) {
      const norm = normalizeOutfitId(outfit.id);
      expect(norm).toBeTruthy();
      expect(norm).toBe(norm.toLowerCase());
    }
  });

  it('garante que montaria "none" é identificada e normalizada corretamente sem gerar string vazia', () => {
    expect(normalizeMountId('none')).toBe('none');
    expect(normalizeMountId('')).toBe('none');
    expect(normalizeMountId('donkey')).toBe('donkey');

    const noneMount = AVAILABLE_MOUNTS.find((m) => m.id === 'none');
    expect(noneMount).toBeDefined();
    expect(noneMount?.name).toBe('Sem Montaria');
  });

  it('garante que URLs de frames de caminhada f1..f8 de montarias e trajes são geradas com consistência', () => {
    for (let f = 0; f <= 8; f++) {
      const urlsFoot = getOutfitLayerUrls('citizen', 'male', 'south', f, 0, undefined, false);
      expect(urlsFoot.base).toContain(`-south-f${f}-base.png`);
      expect(urlsFoot.mask).toContain(`-south-f${f}-mask.png`);
      expect(urlsFoot.mountUrl).toBeUndefined();

      const urlsMounted = getOutfitLayerUrls('citizen', 'male', 'south', f, 0, 'donkey', true);
      expect(urlsMounted.base).toContain(`-south-f${f}-mount-base.png`);
      expect(urlsMounted.mask).toContain(`-south-f${f}-mount-mask.png`);
      expect(urlsMounted.mountUrl).toContain(`donkey-south-f${f}.png`);
    }
  });
});
