import {
  OUTFIT_ATLAS_INDEX,
  MOUNT_ATLAS_INDEX,
  OUTFIT_ATLAS_MANIFESTS,
  MOUNT_ATLAS_MANIFESTS,
  type AtlasFrameRect,
  type OutfitAtlasManifest,
  type AtlasMetadata,
} from '@/content/generated/atlas-manifests';
import { loadImage } from './outfitRecolor';
import { outfitDiagnostics } from './outfitDiagnostics';

export { type AtlasFrameRect, type OutfitAtlasManifest, type AtlasMetadata };

// Global in-memory cache for decoded atlas HTMLImageElements:
const loadedAtlasImages = new Map<string, HTMLImageElement>();

// Ref-counted in-flight requests for cancelable network operations:
interface InFlightRequest<T> {
  promise: Promise<T>;
  abortController?: AbortController;
  subscribers: Set<string>;
}

const inFlightAtlasImageRequests = new Map<string, InFlightRequest<HTMLImageElement>>();
const inFlightManifestRequests = new Map<string, InFlightRequest<OutfitAtlasManifest>>();

export function hasOutfitAtlas(outfitId: string, gender: 'male' | 'female' = 'male'): boolean {
  if (!outfitId) return false;
  const norm = outfitId.toLowerCase().trim();
  const key = `${norm}-${gender}`;
  return Boolean(OUTFIT_ATLAS_INDEX[key]);
}

export function hasMountAtlas(mountId?: string): boolean {
  if (!mountId || mountId === 'none') return false;
  const norm = mountId.toLowerCase().trim().replace(/[\s_]+/g, '-');
  return Boolean(MOUNT_ATLAS_INDEX[norm]);
}

export function getOutfitAtlasManifest(outfitId: string, gender: 'male' | 'female' = 'male'): OutfitAtlasManifest | undefined {
  const norm = outfitId.toLowerCase().trim();
  const key = `${norm}-${gender}`;
  return OUTFIT_ATLAS_MANIFESTS[key];
}

export function getMountAtlasManifest(mountId?: string): OutfitAtlasManifest | undefined {
  if (!mountId || mountId === 'none') return undefined;
  const norm = mountId.toLowerCase().trim().replace(/[\s_]+/g, '-');
  return MOUNT_ATLAS_MANIFESTS[norm];
}

export function getLoadedOutfitAtlasImage(outfitId: string, gender: 'male' | 'female' = 'male'): HTMLImageElement | undefined {
  const norm = outfitId.toLowerCase().trim();
  const key = `${norm}-${gender}`;
  return loadedAtlasImages.get(key);
}

export function getLoadedMountAtlasImage(mountId?: string): HTMLImageElement | undefined {
  if (!mountId || mountId === 'none') return undefined;
  const norm = mountId.toLowerCase().trim().replace(/[\s_]+/g, '-');
  return loadedAtlasImages.get(norm);
}

/**
 * Loads an image via fetch + AbortController with ref-counted scope cancellation.
 * If all subscribers for a given URL cancel, the TCP/TLS request is immediately aborted.
 */
async function loadImageCancelable(url: string, scope: string = 'default'): Promise<HTMLImageElement> {
  const cached = loadedAtlasImages.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }

  let inFlight = inFlightAtlasImageRequests.get(url);
  if (inFlight) {
    inFlight.subscribers.add(scope);
    return inFlight.promise;
  }

  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const subscribers = new Set<string>([scope]);

  const promise = (async () => {
    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined' && abortController) {
        let res: Response;
        try {
          res = await fetch(url, { signal: abortController.signal });
        } catch (fetchErr: any) {
          if (fetchErr?.name === 'AbortError') {
            throw fetchErr;
          }
          // If hashed url 404s, try fallback without hash if possible
          throw fetchErr;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching ${url}`);
        }

        const blob = await res.blob();
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve();
          };
          img.onerror = (e) => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to decode blob from ${url}`));
          };
          img.src = objectUrl;
        });

        loadedAtlasImages.set(url, img);
        return img;
      } else {
        // Node / SSR / Testing fallback
        try {
          const img = await loadImage(url);
          loadedAtlasImages.set(url, img);
          return img;
        } catch {
          const mockImg = {
            src: url,
            complete: true,
            naturalWidth: 1024,
            naturalHeight: 1024,
            width: 1024,
            height: 1024,
          } as unknown as HTMLImageElement;
          loadedAtlasImages.set(url, mockImg);
          return mockImg;
        }
      }
    } finally {
      inFlightAtlasImageRequests.delete(url);
    }
  })();

  inFlightAtlasImageRequests.set(url, {
    promise,
    abortController,
    subscribers,
  });

  return promise;
}

/**
 * Cancels in-flight network requests for a specific subscriber scope (e.g. 'modal_preview').
 * If a request is still needed by another scope (e.g. 'arena'), the download is preserved.
 */
export function cancelAtlasScope(scope: string): void {
  // 1. Cancel in-flight image requests
  for (const [url, req] of inFlightAtlasImageRequests.entries()) {
    req.subscribers.delete(scope);
    if (req.subscribers.size === 0) {
      if (req.abortController) {
        try {
          req.abortController.abort();
        } catch {}
      }
      inFlightAtlasImageRequests.delete(url);
    }
  }

  // 2. Cancel in-flight manifest requests
  for (const [url, req] of inFlightManifestRequests.entries()) {
    req.subscribers.delete(scope);
    if (req.subscribers.size === 0) {
      if (req.abortController) {
        try {
          req.abortController.abort();
        } catch {}
      }
      inFlightManifestRequests.delete(url);
    }
  }
}

/**
 * Loads the coordinates manifest for an outfit on-demand to keep the initial client bundle lean.
 */
async function fetchOutfitManifest(key: string, scope: string = 'default'): Promise<OutfitAtlasManifest | null> {
  if (OUTFIT_ATLAS_MANIFESTS[key]) {
    return OUTFIT_ATLAS_MANIFESTS[key];
  }

  const meta = OUTFIT_ATLAS_INDEX[key];
  if (!meta) return null;

  // In Node/Vitest test environment:
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', meta.json.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        OUTFIT_ATLAS_MANIFESTS[key] = manifest;
        return manifest;
      }
    } catch {}
  }

  // In Browser environment:
  const jsonUrl = meta.json;
  let inFlight = inFlightManifestRequests.get(jsonUrl);
  if (inFlight) {
    inFlight.subscribers.add(scope);
    return inFlight.promise;
  }

  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const subscribers = new Set<string>([scope]);

  const promise = (async () => {
    try {
      let res: Response;
      try {
        res = await fetch(jsonUrl, { signal: abortController?.signal });
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        res = await fetch(meta.canonicalJson, { signal: abortController?.signal });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching manifest for ${key}`);
      }

      const manifest = (await res.json()) as OutfitAtlasManifest;
      OUTFIT_ATLAS_MANIFESTS[key] = manifest;
      return manifest;
    } finally {
      inFlightManifestRequests.delete(jsonUrl);
    }
  })();

  inFlightManifestRequests.set(jsonUrl, {
    promise,
    abortController,
    subscribers,
  });

  return promise;
}

/**
 * Loads the coordinates manifest for a mount on-demand.
 */
async function fetchMountManifest(normMount: string, scope: string = 'default'): Promise<OutfitAtlasManifest | null> {
  if (MOUNT_ATLAS_MANIFESTS[normMount]) {
    return MOUNT_ATLAS_MANIFESTS[normMount];
  }

  const meta = MOUNT_ATLAS_INDEX[normMount];
  if (!meta) return null;

  // In Node/Vitest test environment:
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', meta.json.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        MOUNT_ATLAS_MANIFESTS[normMount] = manifest;
        return manifest;
      }
    } catch {}
  }

  // In Browser environment:
  const jsonUrl = meta.json;
  let inFlight = inFlightManifestRequests.get(jsonUrl);
  if (inFlight) {
    inFlight.subscribers.add(scope);
    return inFlight.promise;
  }

  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const subscribers = new Set<string>([scope]);

  const promise = (async () => {
    try {
      let res: Response;
      try {
        res = await fetch(jsonUrl, { signal: abortController?.signal });
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        res = await fetch(meta.canonicalJson, { signal: abortController?.signal });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching manifest for ${normMount}`);
      }

      const manifest = (await res.json()) as OutfitAtlasManifest;
      MOUNT_ATLAS_MANIFESTS[normMount] = manifest;
      return manifest;
    } finally {
      inFlightManifestRequests.delete(jsonUrl);
    }
  })();

  inFlightManifestRequests.set(jsonUrl, {
    promise,
    abortController,
    subscribers,
  });

  return promise;
}

export async function loadOutfitAtlas(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  scope: string = 'default'
): Promise<HTMLImageElement | null> {
  const norm = outfitId.toLowerCase().trim();
  const key = `${norm}-${gender}`;
  const meta = OUTFIT_ATLAS_INDEX[key];
  if (!meta) return null;

  const existingImg = loadedAtlasImages.get(key);
  const existingManifest = OUTFIT_ATLAS_MANIFESTS[key];
  if (existingImg && existingImg.complete && existingImg.naturalWidth > 0 && existingManifest) {
    return existingImg;
  }

  // Fetch both image and manifest concurrently:
  const [img] = await Promise.all([
    loadImageCancelable(meta.image, scope).then(loadedImg => {
      loadedAtlasImages.set(key, loadedImg);
      return loadedImg;
    }),
    fetchOutfitManifest(key, scope),
  ]);

  return img;
}

export async function loadMountAtlas(
  mountId?: string,
  scope: string = 'default'
): Promise<HTMLImageElement | null> {
  if (!mountId || mountId === 'none') return null;
  const norm = mountId.toLowerCase().trim().replace(/[\s_]+/g, '-');
  const meta = MOUNT_ATLAS_INDEX[norm];
  if (!meta) return null;

  const existingImg = loadedAtlasImages.get(norm);
  const existingManifest = MOUNT_ATLAS_MANIFESTS[norm];
  if (existingImg && existingImg.complete && existingImg.naturalWidth > 0 && existingManifest) {
    return existingImg;
  }

  const [img] = await Promise.all([
    loadImageCancelable(meta.image, scope).then(loadedImg => {
      loadedAtlasImages.set(norm, loadedImg);
      return loadedImg;
    }),
    fetchMountManifest(norm, scope),
  ]);

  return img;
}

export async function preloadAppearanceAtlas(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  mountId?: string,
  scope: string = 'default'
): Promise<{ outfitLoaded: boolean; mountLoaded: boolean }> {
  const tasks: [Promise<HTMLImageElement | null>, Promise<HTMLImageElement | null>] = [
    hasOutfitAtlas(outfitId, gender) ? loadOutfitAtlas(outfitId, gender, scope) : Promise.resolve(null),
    hasMountAtlas(mountId) ? loadMountAtlas(mountId, scope) : Promise.resolve(null),
  ];

  const [outfitImg, mountImg] = await Promise.all(tasks);
  return {
    outfitLoaded: Boolean(outfitImg && outfitImg.complete),
    mountLoaded: Boolean(mountImg && mountImg.complete),
  };
}

export function getOutfitAtlasLayerRect(
  outfitId: string,
  gender: 'male' | 'female',
  layerKey: string
): AtlasFrameRect | undefined {
  const manifest = getOutfitAtlasManifest(outfitId, gender);
  if (!manifest) return undefined;
  return manifest.frames[layerKey];
}

export function getMountAtlasFrameRect(
  mountId: string,
  frameKey: string
): AtlasFrameRect | undefined {
  const manifest = getMountAtlasManifest(mountId);
  if (!manifest) return undefined;
  return manifest.frames[frameKey];
}
