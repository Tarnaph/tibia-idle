import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  destroyVisualNode,
  safelyDestroyPixiApp,
  getScratchCanvases,
  setBoundedCanvasCache,
} from '@/apps/web/lib/pixiMemorySafety';
import {
  recoloredCanvasCache,
  provisionalCanvasCache,
  clearRecoloredCanvasCache,
} from '@/apps/web/lib/outfitRecolor';

describe('Phase 212: PixiJS Memory Safety & Resource Management', () => {
  beforeAll(() => {
    if (typeof globalThis.document === 'undefined') {
      (globalThis as any).document = {
        createElement: (tag: string) => ({
          width: 0,
          height: 0,
          getContext: () => ({
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(64 * 64 * 4) })),
            createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(64 * 64 * 4) })),
            putImageData: vi.fn(),
          }),
        }),
      };
    }
  });

  describe('destroyVisualNode', () => {
    it('safely handles null, undefined, and already destroyed nodes', () => {
      expect(() => destroyVisualNode(null)).not.toThrow();
      expect(() => destroyVisualNode(undefined)).not.toThrow();
      expect(() => destroyVisualNode({ destroyed: true })).not.toThrow();
    });

    it('removes node from parent before destroying', () => {
      const parent = {
        removeChild: vi.fn(),
      };
      const node = {
        parent,
        destroy: vi.fn(),
      };
      destroyVisualNode(node);
      expect(parent.removeChild).toHaveBeenCalledWith(node);
      expect(node.destroy).toHaveBeenCalledWith({ children: true, texture: false });
    });

    it('destroys dynamic Text node textures with { texture: true } to release WebGL canvas backing store', () => {
      const textNode = {
        style: { fontSize: 8 },
        _texture: { destroy: vi.fn() },
        destroy: vi.fn(),
      };
      destroyVisualNode(textNode);
      expect(textNode.destroy).toHaveBeenCalledWith({ texture: true });
    });

    it('recursively cleans Container children before destroying container', () => {
      const childText = {
        style: { fontSize: 10 },
        _texture: {},
        destroy: vi.fn(),
      };
      const childSprite = {
        destroy: vi.fn(),
      };
      const container = {
        children: [childText, childSprite],
        destroy: vi.fn(),
      };

      destroyVisualNode(container);

      expect(childText.destroy).toHaveBeenCalledWith({ texture: true });
      expect(childSprite.destroy).toHaveBeenCalledWith({ children: true, texture: false });
      expect(container.destroy).toHaveBeenCalledWith({ children: true, texture: false });
    });
  });

  describe('safelyDestroyPixiApp', () => {
    it('stops ticker, cleans stage, and safely destroys application', () => {
      const ticker = { stop: vi.fn() };
      const stageChild = {
        style: { fontSize: 12 },
        _texture: {},
        destroy: vi.fn(),
      };
      const stage = {
        children: [stageChild],
        destroy: vi.fn(),
      };
      const app = {
        ticker,
        stage,
        destroy: vi.fn(),
      };

      safelyDestroyPixiApp(app);

      expect(ticker.stop).toHaveBeenCalled();
      expect(stageChild.destroy).toHaveBeenCalledWith({ texture: true });
      expect(stage.destroy).toHaveBeenCalledWith({ children: true, texture: false });
      expect(app.destroy).toHaveBeenCalledWith(true, { children: true, texture: false });
    });

    it('catches and logs any exceptions without throwing', () => {
      const brokenApp = {
        ticker: {
          stop: () => {
            throw new Error('Ticker stopped unexpectedly');
          },
        },
        destroy: () => {
          throw new Error('WebGL context already lost');
        },
      };

      expect(() => safelyDestroyPixiApp(brokenApp)).not.toThrow();
    });
  });

  describe('getScratchCanvases (2D scratch canvas recycling)', () => {
    it('reuses the same scratch canvases across calls without reallocating DOM elements', () => {
      const first = getScratchCanvases(64, 64);
      expect(first).not.toBeNull();
      expect(first?.baseCanvas.width).toBe(64);
      expect(first?.maskCanvas.width).toBe(64);
      expect(first?.recolorCanvas.width).toBe(64);

      const second = getScratchCanvases(32, 32);
      expect(second).not.toBeNull();
      expect(second?.baseCanvas).toBe(first?.baseCanvas);
      expect(second?.maskCanvas).toBe(first?.maskCanvas);
      expect(second?.recolorCanvas).toBe(first?.recolorCanvas);
      expect(second?.baseCanvas.width).toBe(32);
      expect(second?.maskCanvas.width).toBe(32);
      expect(second?.recolorCanvas.width).toBe(32);
    });
  });

  describe('setBoundedCanvasCache (Bounded LRU & GPU Memory Deallocation)', () => {
    it('bounds cache size and sets width/height=0 on evicted canvases to release GPU memory', () => {
      const cache = new Map<string, HTMLCanvasElement>();
      const c1 = document.createElement('canvas') as unknown as HTMLCanvasElement;
      c1.width = 64; c1.height = 64;
      const c2 = document.createElement('canvas') as unknown as HTMLCanvasElement;
      c2.width = 64; c2.height = 64;
      const c3 = document.createElement('canvas') as unknown as HTMLCanvasElement;
      c3.width = 64; c3.height = 64;

      setBoundedCanvasCache(cache, 'item-1', c1, 2);
      setBoundedCanvasCache(cache, 'item-2', c2, 2);
      expect(cache.size).toBe(2);

      // Inserting 3rd item with limit 2 should evict c1 and zero its dimensions
      setBoundedCanvasCache(cache, 'item-3', c3, 2);
      expect(cache.size).toBe(2);
      expect(cache.has('item-1')).toBe(false);
      expect(c1.width).toBe(0);
      expect(c1.height).toBe(0);
      expect(cache.get('item-2')).toBe(c2);
      expect(cache.get('item-3')).toBe(c3);
    });

    it('refreshes insertion order when re-setting existing key', () => {
      const cache = new Map<string, HTMLCanvasElement>();
      const c1 = document.createElement('canvas') as unknown as HTMLCanvasElement;
      c1.width = 64; c1.height = 64;
      const c2 = document.createElement('canvas') as unknown as HTMLCanvasElement;
      c2.width = 64; c2.height = 64;
      const c3 = document.createElement('canvas') as unknown as HTMLCanvasElement;
      c3.width = 64; c3.height = 64;

      setBoundedCanvasCache(cache, 'item-1', c1, 2);
      setBoundedCanvasCache(cache, 'item-2', c2, 2);
      // Re-touch item-1
      setBoundedCanvasCache(cache, 'item-1', c1, 2);

      // Now item-2 should be oldest and evicted when item-3 is added
      setBoundedCanvasCache(cache, 'item-3', c3, 2);
      expect(cache.has('item-2')).toBe(false);
      expect(c2.width).toBe(0);
      expect(cache.has('item-1')).toBe(true);
      expect(cache.has('item-3')).toBe(true);
    });
  });

  describe('outfitRecolor cache clearing with GPU buffer release', () => {
    it('zeros dimensions of cached canvases on clearRecoloredCanvasCache', () => {
      const testCanvas = document.createElement('canvas') as unknown as HTMLCanvasElement;
      testCanvas.width = 64;
      testCanvas.height = 64;
      setBoundedCanvasCache(recoloredCanvasCache, 'test-key', testCanvas);

      const provCanvas = document.createElement('canvas') as unknown as HTMLCanvasElement;
      provCanvas.width = 64;
      provCanvas.height = 64;
      setBoundedCanvasCache(provisionalCanvasCache, 'test-prov', provCanvas);

      clearRecoloredCanvasCache();

      expect(testCanvas.width).toBe(0);
      expect(testCanvas.height).toBe(0);
      expect(provCanvas.width).toBe(0);
      expect(provCanvas.height).toBe(0);
      expect(recoloredCanvasCache.size).toBe(0);
      expect(provisionalCanvasCache.size).toBe(0);
    });
  });

  describe('Architectural Verification in Components', () => {
    it('verifies PixiArena imports and utilizes destroyVisualNode and safelyDestroyPixiApp', () => {
      const pixiArenaPath = path.resolve(process.cwd(), 'apps/web/components/PixiArena.tsx');
      const content = fs.readFileSync(pixiArenaPath, 'utf8');

      expect(content).toContain("import { destroyVisualNode, safelyDestroyPixiApp } from '@/apps/web/lib/pixiMemorySafety';");
      expect(content).toContain('destroyVisualNode(view.root)');
      expect(content).toContain('destroyVisualNode(visual.root)');
      expect(content).toContain('destroyVisualNode(child)');
      expect(content).toContain('safelyDestroyPixiApp(app)');
    });

    it('verifies ThaisCityArena implements remote actor eviction and speech pruning', () => {
      const cityArenaPath = path.resolve(process.cwd(), 'apps/web/components/ThaisCityArena.tsx');
      const content = fs.readFileSync(cityArenaPath, 'utf8');

      expect(content).toContain("import { destroyVisualNode, safelyDestroyPixiApp } from '@/apps/web/lib/pixiMemorySafety';");
      expect(content).toContain('processedSpeechIds.size > 2000');
      expect(content).toContain('liveActorIds');
      expect(content).toContain('destroyVisualNode(view.root)');
      expect(content).toContain('safelyDestroyPixiApp(app)');
    });

    it('verifies TrainingArena cleans rebuild elements and unmounts safely', () => {
      const trainingArenaPath = path.resolve(process.cwd(), 'apps/web/components/TrainingArena.tsx');
      const content = fs.readFileSync(trainingArenaPath, 'utf8');

      expect(content).toContain("import { destroyVisualNode, safelyDestroyPixiApp } from '@/apps/web/lib/pixiMemorySafety';");
      expect(content).toContain('destroyVisualNode(child)');
      expect(content).toContain('safelyDestroyPixiApp(appRef.current)');
    });

    it('verifies outfitRecolor uses getScratchCanvases in drawRecoloredLayer and drawRecoloredLayerFromAtlas', () => {
      const recolorPath = path.resolve(process.cwd(), 'apps/web/lib/outfitRecolor.ts');
      const content = fs.readFileSync(recolorPath, 'utf8');

      expect(content).toContain("import { getScratchCanvases, setBoundedCanvasCache } from './pixiMemorySafety';");
      expect(content).toContain('const scratch = getScratchCanvases(width, height);');
      // Verify drawRecoloredLayer implementation body does not allocate new canvas elements
      const drawLayerBody = content.split('function drawRecoloredLayer(')[1]?.split('export function drawRecoloredLayerFromAtlas(')[0] || '';
      expect(drawLayerBody).not.toContain("document.createElement('canvas')");
      expect(drawLayerBody).toContain('getScratchCanvases(width, height)');
    });
  });
});
