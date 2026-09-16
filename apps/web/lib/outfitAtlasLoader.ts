import {
  OUTFIT_ATLAS_MANIFESTS,
  MOUNT_ATLAS_MANIFESTS,
  type AtlasFrameRect,
  type OutfitAtlasManifest,
} from '@/content/generated/atlas-manifests';
import { loadImage } from './outfitRecolor';

export { type AtlasFrameRect, type OutfitAtlasManifest };

// Global in-memory cache for decoded atlas HTMLImageElements:
const loadedAtlasImages = new Map<string, HTMLImageElement>();

// In-flight promises to share network requests across concurrent callers (e.g. preview & arena):
const inFlightAtlasPromises = new Map<string, Promise<HTMLImageElement>>();

export function hasOutfitAtlas(outfitId: string, gender: 'male' | 'female' = 'male'): boolean {
  const norm = outfitId.toLowerCase().trim();
  const key = `${norm}-${gender}`;
  return Boolean(OUTFIT_ATLAS_MANIFESTS[key]);
}

export function hasMountAtlas(mountId?: string): boolean {
  if (!mountId || mountId === 'none') return false;
  const norm = mountId.toLowerCase().trim().replace(/[\s_]+/g, '-');
  return Boolean(MOUNT_ATLAS_MANIFESTS[norm]);
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

export async function loadOutfitAtlas(outfitId: string, gender: 'male' | 'female' = 'male'): Promise<HTMLImageElement | null> {
  const norm = outfitId.toLowerCase().trim();
  const key = `${norm}-${gender}`;
  const manifest = OUTFIT_ATLAS_MANIFESTS[key];
  if (!manifest) return null;

  const existing = loadedAtlasImages.get(key);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    return existing;
  }

  const inFlight = inFlightAtlasPromises.get(key);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      // Load content-hashed URL first, fallback to canonical
      let img: HTMLImageElement;
      try {
        img = await loadImage(manifest.image);
      } catch {
        img = await loadImage(manifest.canonicalImage);
      }
      loadedAtlasImages.set(key, img);
      return img;
    } finally {
      inFlightAtlasPromises.delete(key);
    }
  })();

  inFlightAtlasPromises.set(key, promise);
  return promise;
}

export async function loadMountAtlas(mountId?: string): Promise<HTMLImageElement | null> {
  if (!mountId || mountId === 'none') return null;
  const norm = mountId.toLowerCase().trim().replace(/[\s_]+/g, '-');
  const manifest = MOUNT_ATLAS_MANIFESTS[norm];
  if (!manifest) return null;

  const existing = loadedAtlasImages.get(norm);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    return existing;
  }

  const inFlight = inFlightAtlasPromises.get(norm);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      let img: HTMLImageElement;
      try {
        img = await loadImage(manifest.image);
      } catch {
        img = await loadImage(manifest.canonicalImage);
      }
      loadedAtlasImages.set(norm, img);
      return img;
    } finally {
      inFlightAtlasPromises.delete(norm);
    }
  })();

  inFlightAtlasPromises.set(norm, promise);
  return promise;
}

export async function preloadAppearanceAtlas(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  mountId?: string
): Promise<{ outfitLoaded: boolean; mountLoaded: boolean }> {
  const tasks: [Promise<HTMLImageElement | null>, Promise<HTMLImageElement | null>] = [
    hasOutfitAtlas(outfitId, gender) ? loadOutfitAtlas(outfitId, gender) : Promise.resolve(null),
    hasMountAtlas(mountId) ? loadMountAtlas(mountId) : Promise.resolve(null),
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
