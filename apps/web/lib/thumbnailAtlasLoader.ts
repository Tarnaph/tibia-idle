import { outfitDiagnostics } from './outfitDiagnostics';

export interface ThumbnailFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThumbnailManifest {
  image: string;
  width: number;
  height: number;
  thumbSize: number;
  count: number;
  frames: Record<string, ThumbnailFrame>;
}

interface AtlasState {
  manifest: ThumbnailManifest | null;
  imageLoaded: boolean;
  coldLoadDurationMs: number;
  isLoading: boolean;
  loadPromise: Promise<boolean> | null;
}

const atlasStates: Record<'outfits' | 'mounts', AtlasState> = {
  outfits: {
    manifest: null,
    imageLoaded: false,
    coldLoadDurationMs: -1,
    isLoading: false,
    loadPromise: null,
  },
  mounts: {
    manifest: null,
    imageLoaded: false,
    coldLoadDurationMs: -1,
    isLoading: false,
    loadPromise: null,
  },
};

const warmMetrics = {
  outfits: { count: 0, totalMs: 0 },
  mounts: { count: 0, totalMs: 0 },
};

/**
 * Loads a thumbnail atlas on demand.
 * Separately measures the cold load time (first access: download + decode).
 */
export async function loadThumbnailAtlas(type: 'outfits' | 'mounts'): Promise<boolean> {
  const state = atlasStates[type];
  if (state.imageLoaded) return true;
  if (state.loadPromise) return state.loadPromise;

  state.isLoading = true;
  const startCold = Date.now();

  state.loadPromise = (async () => {
    try {
      const manifestUrl =
        type === 'outfits'
          ? '/generated/atlases/outfit-thumbs-manifest.json'
          : '/generated/atlases/mount-thumbs-manifest.json';
      const atlasImageUrl =
        type === 'outfits'
          ? '/generated/atlases/outfit-thumbs-atlas.png'
          : '/generated/atlases/mount-thumbs-atlas.png';

      // 1. Fetch manifest
      const res = await fetch(manifestUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${manifestUrl}`);
      const manifest: ThumbnailManifest = await res.json();
      state.manifest = manifest;

      // 2. Preload and decode the consolidated image
      if (typeof window !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = (e) => reject(new Error(`Failed to load ${atlasImageUrl}`));
          img.src = atlasImageUrl;
        });
      }

      state.imageLoaded = true;
      state.coldLoadDurationMs = Date.now() - startCold;
      outfitDiagnostics.recordThumbnailColdLoad(type, state.coldLoadDurationMs);
      console.log(`[ThumbnailAtlas] Cold load for ${type} finished in ${state.coldLoadDurationMs}ms (${manifest.count} items)`);
      return true;
    } catch (err) {
      console.warn(`[ThumbnailAtlas] Could not load ${type} atlas, falling back to discrete thumbs:`, err);
      state.imageLoaded = false;
      return false;
    } finally {
      state.isLoading = false;
    }
  })();

  return state.loadPromise;
}

export function isThumbnailAtlasReady(type: 'outfits' | 'mounts'): boolean {
  return atlasStates[type].imageLoaded && !!atlasStates[type].manifest;
}

export function getThumbnailAtlasFrame(
  type: 'outfits' | 'mounts',
  id: string
): { frame: ThumbnailFrame; atlasUrl: string; durationMs: number } | null {
  const startLookup = Date.now();
  const state = atlasStates[type];
  if (!state.imageLoaded || !state.manifest) return null;

  const key = id.toLowerCase().trim();
  const frame = state.manifest.frames[key];
  if (!frame) return null;

  const durationMs = Date.now() - startLookup;
  warmMetrics[type].count++;
  warmMetrics[type].totalMs += durationMs;

  outfitDiagnostics.recordThumbnailRender(type, durationMs, true);
  return {
    frame,
    atlasUrl: `/generated/atlases/${state.manifest.image}`,
    durationMs,
  };
}

export function getThumbnailDiagnostics() {
  return {
    outfitsColdLoadMs: atlasStates.outfits.coldLoadDurationMs,
    mountsColdLoadMs: atlasStates.mounts.coldLoadDurationMs,
    outfitsWarmAvgMs:
      warmMetrics.outfits.count > 0
        ? Number((warmMetrics.outfits.totalMs / warmMetrics.outfits.count).toFixed(2))
        : 0,
    mountsWarmAvgMs:
      warmMetrics.mounts.count > 0
        ? Number((warmMetrics.mounts.totalMs / warmMetrics.mounts.count).toFixed(2))
        : 0,
    outfitsCount: warmMetrics.outfits.count,
    mountsCount: warmMetrics.mounts.count,
  };
}
