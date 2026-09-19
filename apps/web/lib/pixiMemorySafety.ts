/**
 * PixiJS Memory Safety & Resource Management Helper
 * Eliminates WebGL dynamic texture leaks, dangling tickers, unbounded collections,
 * and DOM Canvas memory retention.
 */

/**
 * Recursively destroys a PixiJS visual node (Sprite, Text, Graphics, or Container)
 * ensuring dynamic text textures and custom canvases are released from WebGL memory,
 * while preserving shared asset/atlas textures.
 */
export function destroyVisualNode(node: any): void {
  if (!node || node.destroyed) return;
  try {
    if (node.parent) {
      try {
        node.parent.removeChild(node);
      } catch {}
    }

    // Dynamic Text node: destroy texture with { texture: true } so canvas backing store is released
    if (typeof node.style !== 'undefined' && node._texture) {
      try {
        node.destroy({ texture: true });
      } catch {}
      return;
    }

    // Container with children: recursively clean children before destroying container
    if (Array.isArray(node.children)) {
      const childList = [...node.children];
      for (const child of childList) {
        destroyVisualNode(child);
      }
    }

    // Destroy container / sprite without destroying shared asset textures
    node.destroy({ children: true, texture: false });
  } catch {
    // Safe catch during destruction cycles
  }
}

/**
 * Complete and safe teardown of a PixiJS Application instance.
 */
export function safelyDestroyPixiApp(app: any): void {
  if (!app) return;
  try {
    if (app.ticker) {
      try {
        app.ticker.stop();
      } catch {}
    }
    if (app.stage) {
      try {
        destroyVisualNode(app.stage);
      } catch {}
    }
    try {
      app.destroy(true, { children: true, texture: false });
    } catch {}
  } catch (err) {
    console.warn('[pixiMemorySafety] Safe catch on app destroy:', err);
  }
}

/**
 * Scratch canvas pool for synchronous 2D rendering operations (recoloring, layer composites).
 * Reuses 3 canvas instances across calls instead of allocating thousands of DOM canvases.
 */
let scratchBaseCanvas: HTMLCanvasElement | null = null;
let scratchMaskCanvas: HTMLCanvasElement | null = null;
let scratchRecolorCanvas: HTMLCanvasElement | null = null;

export function getScratchCanvases(width: number, height: number): {
  baseCanvas: HTMLCanvasElement;
  maskCanvas: HTMLCanvasElement;
  recolorCanvas: HTMLCanvasElement;
  baseCtx: CanvasRenderingContext2D | null;
  maskCtx: CanvasRenderingContext2D | null;
  recolorCtx: CanvasRenderingContext2D | null;
} | null {
  if (typeof document === 'undefined') return null;

  if (!scratchBaseCanvas) scratchBaseCanvas = document.createElement('canvas');
  if (!scratchMaskCanvas) scratchMaskCanvas = document.createElement('canvas');
  if (!scratchRecolorCanvas) scratchRecolorCanvas = document.createElement('canvas');

  if (scratchBaseCanvas.width !== width) scratchBaseCanvas.width = width;
  if (scratchBaseCanvas.height !== height) scratchBaseCanvas.height = height;

  if (scratchMaskCanvas.width !== width) scratchMaskCanvas.width = width;
  if (scratchMaskCanvas.height !== height) scratchMaskCanvas.height = height;

  if (scratchRecolorCanvas.width !== width) scratchRecolorCanvas.width = width;
  if (scratchRecolorCanvas.height !== height) scratchRecolorCanvas.height = height;

  const baseCtx = scratchBaseCanvas.getContext('2d', { willReadFrequently: true });
  const maskCtx = scratchMaskCanvas.getContext('2d', { willReadFrequently: true });
  const recolorCtx = scratchRecolorCanvas.getContext('2d');

  if (baseCtx) baseCtx.clearRect(0, 0, width, height);
  if (maskCtx) maskCtx.clearRect(0, 0, width, height);
  if (recolorCtx) recolorCtx.clearRect(0, 0, width, height);

  return {
    baseCanvas: scratchBaseCanvas,
    maskCanvas: scratchMaskCanvas,
    recolorCanvas: scratchRecolorCanvas,
    baseCtx,
    maskCtx,
    recolorCtx,
  };
}

/**
 * Bounds a Map cache of canvases to a maximum size, safely setting width/height=0
 * on evicted canvas elements so browsers deallocate the backing GPU texture store immediately.
 */
export function setBoundedCanvasCache(
  cache: Map<string, HTMLCanvasElement>,
  key: string,
  canvas: HTMLCanvasElement,
  maxEntries: number = 384
): void {
  if (cache.has(key)) {
    cache.delete(key); // Refresh insertion order for LRU
  } else if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      const oldCanvas = cache.get(oldestKey);
      if (oldCanvas) {
        try {
          oldCanvas.width = 0;
          oldCanvas.height = 0;
        } catch {}
      }
      cache.delete(oldestKey);
    }
  }
  cache.set(key, canvas);
}
