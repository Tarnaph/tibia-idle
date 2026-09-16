import rawOutfitsJson from '@/content/generated/outfits.json';
import rawMountsJson from '@/content/generated/mounts.json';
import {
  outfitDiagnostics,
  PreparationManifest,
  PreparationResourceState,
  UncompositedFrameDetail,
} from './outfitDiagnostics';

export interface OutfitColors {
  head: number;
  primary: number;
  secondary: number;
  detail: number;
}

export interface OutfitDisplacement {
  x: number;
  y: number;
}

export const TIBIA_133_COLORS: string[] = [
  // Row 0: White and light pastel spectrum
  '#ffffff', '#ffd5bf', '#ffeabf', '#ffffbf', '#eaffbf', '#d4ffbf', '#bfffbf', '#bfffd5', '#bfffea', '#bfffff', '#bfeaff', '#bfd4ff', '#bfbfff', '#d4bfff', '#eabfff', '#ffbfff', '#ffbfea', '#ffbfd5', '#ffbfbf',
  // Row 1: Light gray and muted earth
  '#dbdbdb', '#bf9f8f', '#bfaf8f', '#bfbf8f', '#afbf8f', '#9fbf8f', '#8fbf8f', '#8fbf9f', '#8fbfaf', '#8fbfbf', '#8fafbf', '#8f9fbf', '#8f8fbf', '#9f8fbf', '#af8fbf', '#bf8fbf', '#bf8faf', '#bf8f9f', '#bf8f8f',
  // Row 2: Medium gray and medium muted spectrum
  '#b6b6b6', '#bf8060', '#bf9f60', '#bfbf60', '#9fbf60', '#80bf60', '#60bf60', '#60bf80', '#60bf9f', '#60bfbf', '#609fbf', '#607fbf', '#6060bf', '#7f60bf', '#9f60bf', '#bf60bf', '#bf609f', '#bf6080', '#bf6060',
  // Row 3: Dark gray and deep muted spectrum
  '#929292', '#bf6a40', '#bf9540', '#bfbf40', '#95bf40', '#6abf40', '#40bf40', '#40bf6a', '#40bf95', '#40bfbf', '#4095bf', '#406abf', '#4040bf', '#6a40bf', '#9540bf', '#bf40bf', '#bf4095', '#bf406a', '#bf4040',
  // Row 4: Charcoal and pure vivid spectrum
  '#6d6d6d', '#ff5500', '#ffaa00', '#ffff00', '#aaff00', '#55ff00', '#00ff00', '#00ff55', '#00ffaa', '#00ffff', '#00aaff', '#0055ff', '#0000ff', '#5500ff', '#aa00ff', '#ff00ff', '#ff00aa', '#ff0055', '#ff0000',
  // Row 5: Deep charcoal and dark saturated spectrum
  '#494949', '#bf4000', '#bf8000', '#bfbf00', '#80bf00', '#40bf00', '#00bf00', '#00bf40', '#00bf7f', '#00bfbf', '#007fbf', '#0040bf', '#0000bf', '#4000bf', '#8000bf', '#bf00bf', '#bf0080', '#bf0040', '#bf0000',
  // Row 6: Near black and deep shadow shades
  '#242424', '#802b00', '#805500', '#808000', '#558000', '#2a8000', '#008000', '#00802b', '#008055', '#008080', '#005580', '#002a80', '#000080', '#2a0080', '#550080', '#800080', '#800055', '#80002b', '#800000',
];

export function parseHexColor(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const CANONICAL_OUTFITS = (rawOutfitsJson as Array<{
  id: string;
  name: string;
  femaleName: string;
  maleName: string;
  femaleLookType: number;
  maleLookType: number;
  premium: boolean;
  unlocked: boolean;
  hasAddon1?: boolean;
  hasAddon2?: boolean;
  hasMountRider?: boolean;
  displacement?: OutfitDisplacement;
  maleDisplacement?: OutfitDisplacement;
  femaleDisplacement?: OutfitDisplacement;
}>) || [];

const CANONICAL_MOUNTS = (rawMountsJson as Array<{
  mountId: number;
  id: string;
  clientId: number;
  name: string;
  speedBonus: number;
  isPremium: boolean;
  displacement?: OutfitDisplacement;
  width?: number;
  height?: number;
}>) || [];

export function getMountDisplacementOffset(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  mountId?: string
): { x: number; y: number } {
  if (!mountId || mountId === 'none') {
    return { x: 0, y: 0 };
  }
  const normMount = normalizeMountId(mountId);
  const mount = CANONICAL_MOUNTS.find((m) => m.id === normMount || m.name.toLowerCase() === normMount);
  const mountW = mount?.width ?? 2;
  const mountH = mount?.height ?? 2;
  const outfitW = 2;
  const outfitH = 2;

  // Authentic CipSoft / OTClient composition:
  // In Tibia's engine, rider sprites for mounted poses (z = 1) were authored on the exact same 64x64 grid
  // to align naturally at (0, 0) with mount saddles.
  // ThingAttrDisplacement from DAT is the creature's world-grid anchor displacement when on foot,
  // NOT a relative offset between rider and mount.
  // Relative offset on the composition canvas only accounts for multi-tile dimension deltas:
  return {
    x: (mountW - outfitW) * 32,
    y: (mountH - outfitH) * 32,
  };
}

export function normalizeOutfitId(outfitId: string): string {
  const idLower = (outfitId || 'Knight').toLowerCase().trim();
  const clean = idLower.replace(/[^a-z0-9]+/g, '-');

  // 1. Direct exact match against canonical catalog
  const found = CANONICAL_OUTFITS.find(
    (o) =>
      o.id === clean ||
      o.name.toLowerCase() === idLower ||
      o.femaleName.toLowerCase() === idLower ||
      o.maleName.toLowerCase() === idLower
  );
  if (found) return found.id;

  // 2. Canonical aliases for classic outfits
  if (clean === 'noble' || idLower === 'noble' || idLower === 'nobleman' || idLower === 'noblewoman') return 'noblewoman';
  if (clean === 'norse' || idLower === 'norse' || idLower === 'norseman' || idLower === 'norsewoman') return 'norsewoman';
  if (idLower.includes('sorcerer')) return 'mage';
  if (idLower.includes('paladin')) return 'hunter';

  // 3. Fallbacks for retro outfits (must check retro first before base names to avoid collisions)
  if (idLower.includes('retro')) {
    if (idLower.includes('citizen')) return 'retro-citizen';
    if (idLower.includes('hunter')) return 'retro-hunter';
    if (idLower.includes('knight')) return 'retro-knight';
    if (idLower.includes('wizard')) return 'retro-wizard';
    if (idLower.includes('noble')) return 'retro-noblewoman';
    if (idLower.includes('summoner')) return 'retro-summoner';
    if (idLower.includes('warrior')) return 'retro-warrior';
  }

  // 4. Base fallback keywords
  if (idLower.includes('citizen')) return 'citizen';
  if (idLower.includes('hunter')) return 'hunter';
  if (idLower.includes('mage')) return 'mage';
  if (idLower.includes('knight')) return 'knight';
  if (idLower.includes('noble')) return 'noblewoman';
  if (idLower.includes('summoner')) return 'summoner';
  if (idLower.includes('warrior')) return 'warrior';
  if (idLower.includes('barbarian')) return 'barbarian';
  if (idLower.includes('druid')) return 'druid';
  if (idLower.includes('oriental')) return 'oriental';
  if (idLower.includes('pirate')) return 'pirate';
  if (idLower.includes('assassin')) return 'assassin';
  if (idLower.includes('beggar')) return 'beggar';
  if (idLower.includes('sire')) return 'sire';
  return 'knight';
}

export function normalizeMountId(mountId: string): string {
  const clean = (mountId || 'none').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  return clean;
}

export interface OutfitCapabilities {
  hasAddon1: boolean;
  hasAddon2: boolean;
  hasMountRider: boolean;
  maxFrames: number;
}

export const OUTFITS_WITH_MOUNTS = new Set([
  'afflicted', 'arena-champion', 'assassin', 'barbarian', 'battle-mage', 'beastmaster',
  'beggar', 'brotherhood', 'cave-explorer', 'ceremonial-garb', 'champion', 'chaos-acolyte',
  'citizen', 'conjurer', 'crystal-warlord', 'death-herald', 'deepling', 'demon-hunter',
  'demon-outfit', 'discoverer', 'dream-warden', 'druid', 'elementalist', 'entrepreneur',
  'evoker', 'festive-outfit', 'glooth-engineer', 'grove-keeper', 'herbalist', 'hunter',
  'insectoid', 'jersey', 'jester', 'knight', 'lupine-warden', 'mage',
  'makeshift-warrior', 'mercenary', 'newly-wed', 'nightmare', 'noblewoman', 'norsewoman',
  'oriental', 'pharaoh', 'philosopher', 'pirate', 'pumpkin-mummy', 'puppeteer',
  'ranger', 'recruiter', 'retro-citizen', 'retro-hunter', 'retro-knight', 'retro-noblewoman',
  'retro-summoner', 'retro-warrior', 'retro-wizard', 'rift-warrior', 'royal-pumpkin', 'sea-dog',
  'seaweaver', 'shaman', 'siege-master', 'sinister-archer', 'soil-guardian', 'spirit-caller',
  'summoner', 'sun-priest', 'trophy-hunter', 'warmaster', 'warrior', 'wayfarer',
  'winter-warden', 'wizard', 'yalaharian'
]);

export const OUTFITS_MAX_FRAMES_3 = new Set(['noble', 'paladin', 'sire', 'sorcerer']);

export function getOutfitCapabilities(outfitId: string): OutfitCapabilities {
  const norm = normalizeOutfitId(outfitId);
  const found = CANONICAL_OUTFITS.find((o) => o.id === norm);
  const hasAddon1 = found?.hasAddon1 ?? true;
  const hasAddon2 = found?.hasAddon2 ?? true;
  const hasMountRider = OUTFITS_WITH_MOUNTS.has(norm);
  const maxFrames = OUTFITS_MAX_FRAMES_3.has(norm) ? 3 : 9;
  return {
    hasAddon1,
    hasAddon2,
    hasMountRider,
    maxFrames,
  };
}

export function getOutfitLayerUrls(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  direction: 'south' | 'east' | 'north' | 'west' = 'south',
  frame: number = 0,
  addons: number = 0,
  mount?: string,
  isMounted: boolean = false
): {
  base: string;
  mask: string;
  addon1Base?: string;
  addon1Mask?: string;
  addon2Base?: string;
  addon2Mask?: string;
  mountUrl?: string;
} {
  const norm = normalizeOutfitId(outfitId);
  const caps = getOutfitCapabilities(norm);

  let safeFrame: number;
  if (caps.maxFrames <= 3) {
    if (frame === 0) {
      safeFrame = 0;
    } else {
      safeFrame = ((Math.abs(frame) - 1) % 2) + 1;
    }
  } else {
    safeFrame = Math.max(0, Math.min(8, frame));
  }

  const effectiveMounted = isMounted && caps.hasMountRider;

  const res: {
    base: string;
    mask: string;
    addon1Base?: string;
    addon1Mask?: string;
    addon2Base?: string;
    addon2Mask?: string;
    mountUrl?: string;
  } = {
    base: effectiveMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-base.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-base.png`,
    mask: effectiveMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-mask.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mask.png`,
  };

  if (caps.hasAddon1 && (addons & 1) !== 0) {
    res.addon1Base = effectiveMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-addon1-base.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon1-base.png`;
    res.addon1Mask = effectiveMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-addon1-mask.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon1-mask.png`;
  }
  if (caps.hasAddon2 && (addons & 2) !== 0) {
    res.addon2Base = effectiveMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-addon2-base.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon2-base.png`;
    res.addon2Mask = effectiveMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-addon2-mask.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon2-mask.png`;
  }

  if (effectiveMounted && mount && mount !== 'none') {
    const normMount = normalizeMountId(mount);
    res.mountUrl = `/generated/mounts/${normMount}-${direction}-f${safeFrame}.png`;
  }

  return res;
}

export const imageElementCache = new Map<string, HTMLImageElement>();
const inFlightImagePromises = new Map<string, Promise<HTMLImageElement>>();
export const activePreparationTokens = new Map<string, string>();
export const failedImageUrls = new Set<string>();
const failedImageUrlsWithTimestamp = new Map<string, number>();
const failedImageAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED_IMAGE_ATTEMPTS = 3;
const FAILED_IMAGE_RETRY_DELAY_MS = 1000;
const FAILED_IMAGE_TTL_MS = 2000;

export function isImagePermanentlyFailed(url: string): boolean {
  const failedAt = failedImageUrlsWithTimestamp.get(url);
  if (failedAt !== undefined) {
    if (Date.now() - failedAt < FAILED_IMAGE_TTL_MS) {
      return true;
    }
    // TTL expired: allow retry
    failedImageUrlsWithTimestamp.delete(url);
    failedImageUrls.delete(url);
    failedImageAttempts.delete(url);
    return false;
  }
  if (failedImageUrls.has(url)) {
    return true;
  }
  const entry = failedImageAttempts.get(url);
  if (entry && entry.count >= MAX_FAILED_IMAGE_ATTEMPTS) {
    if (Date.now() - entry.lastAttempt < FAILED_IMAGE_TTL_MS) {
      return true;
    }
    // TTL expired: allow retry
    failedImageUrlsWithTimestamp.delete(url);
    failedImageUrls.delete(url);
    failedImageAttempts.delete(url);
    return false;
  }
  return false;
}

export function canRetryImage(url: string): boolean {
  if (isImagePermanentlyFailed(url)) return false;
  const entry = failedImageAttempts.get(url);
  if (!entry) return true;
  return Date.now() - entry.lastAttempt >= FAILED_IMAGE_RETRY_DELAY_MS;
}

export function invalidateProvisionalCache(url?: string): void {
  provisionalCanvasCache.clear();
}

export function registerCachedImage(url: string, img: HTMLImageElement): void {
  imageElementCache.set(url, img);
  failedImageUrls.delete(url);
  failedImageUrlsWithTimestamp.delete(url);
  failedImageAttempts.delete(url);
  invalidateProvisionalCache(url);
}

export function registerFailedImage(url: string): void {
  const now = Date.now();
  failedImageUrls.add(url);
  failedImageUrlsWithTimestamp.set(url, now);
  failedImageAttempts.set(url, { count: MAX_FAILED_IMAGE_ATTEMPTS, lastAttempt: now });
}

export function clearFailedImageCache(): void {
  failedImageUrls.clear();
  failedImageUrlsWithTimestamp.clear();
  failedImageAttempts.clear();
}

export function clearImageElementCache(): void {
  imageElementCache.clear();
  inFlightImagePromises.clear();
  failedImageUrls.clear();
  failedImageUrlsWithTimestamp.clear();
  failedImageAttempts.clear();
  invalidateProvisionalCache();
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    return Promise.reject(new Error('Window undefined in SSR'));
  }
  // 1. Return immediately if fully loaded and valid
  const cached = imageElementCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }

  // 2. Return existing in-flight promise so concurrent callers share the exact same resolution
  const inFlight = inFlightImagePromises.get(url);
  if (inFlight) {
    return inFlight;
  }

  if (isImagePermanentlyFailed(url)) {
    return Promise.reject(new Error(`Image marked permanently failed at ${url}`));
  }

  // 3. Create managed promise for this URL with safety timeout
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const isCrossOrigin = typeof window !== 'undefined' &&
      (url.startsWith('http://') || url.startsWith('https://')) &&
      !url.startsWith(window.location.origin);
    if (isCrossOrigin) {
      img.crossOrigin = 'anonymous';
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        handleError();
      }
    }, 15000);

    const handleSuccess = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      inFlightImagePromises.delete(url);
      failedImageUrls.delete(url);
      failedImageUrlsWithTimestamp.delete(url);
      failedImageAttempts.delete(url);
      imageElementCache.set(url, img);
      invalidateProvisionalCache(url);
      resolve(img);
    };

    const handleError = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
      }
      inFlightImagePromises.delete(url);

      const now = Date.now();
      const entry = failedImageAttempts.get(url) || { count: 0, lastAttempt: 0 };
      entry.count += 1;
      entry.lastAttempt = now;
      failedImageAttempts.set(url, entry);

      // Only mark permanently failed after exceeding MAX attempts (with cooldown)
      if (entry.count >= MAX_FAILED_IMAGE_ATTEMPTS) {
        failedImageUrls.add(url);
        failedImageUrlsWithTimestamp.set(url, now);
      }

      reject(new Error(`Failed to load image at ${url}`));
    };

    img.onload = handleSuccess;
    img.onerror = handleError;
    img.src = url;

    // Fast synchronous resolution if already loaded and valid from browser cache
    if (img.complete && img.naturalWidth > 0) {
      handleSuccess();
    }
  });

  inFlightImagePromises.set(url, promise);
  return promise;
}

export function recolorPixels(
  baseCtx: CanvasRenderingContext2D,
  maskCtx: CanvasRenderingContext2D,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: OutfitColors
): void {
  try {
    const baseData = baseCtx.getImageData(0, 0, width, height);
    const maskData = maskCtx.getImageData(0, 0, width, height);
    const outData = targetCtx.createImageData(width, height);

    const headHex = TIBIA_133_COLORS[colors?.head ?? 0] || '#ffffff';
    const bodyHex = TIBIA_133_COLORS[colors?.primary ?? 86] || '#0055ff';
    const legsHex = TIBIA_133_COLORS[colors?.secondary ?? 114] || '#00aa00';
    const feetHex = TIBIA_133_COLORS[colors?.detail ?? 76] || '#aa5500';

    const headRgb = parseHexColor(headHex);
    const bodyRgb = parseHexColor(bodyHex);
    const legsRgb = parseHexColor(legsHex);
    const feetRgb = parseHexColor(feetHex);

    const b = baseData.data;
    const m = maskData.data;
    const o = outData.data;
    const total = width * height * 4;

    for (let i = 0; i < total; i += 4) {
      const a0 = b[i + 3];
      if (a0 === 0) continue;

      const r0 = b[i];
      const g0 = b[i + 1];
      const b0 = b[i + 2];

      const mA = m[i + 3];
      let tint: [number, number, number] | null = null;

      if (mA > 0) {
        const mR = m[i];
        const mG = m[i + 1];
        const mB = m[i + 2];

        if (mR > 200 && mG < 50 && mB < 50) tint = headRgb;
        else if (mG > 200 && mR < 50 && mB < 50) tint = bodyRgb;
        else if (mB > 200 && mR < 50 && mG < 50) tint = legsRgb;
        else if (mR > 200 && mG > 200 && mB < 50) tint = feetRgb;
      }

      if (tint) {
        o[i] = Math.round((r0 * tint[0]) / 255);
        o[i + 1] = Math.round((g0 * tint[1]) / 255);
        o[i + 2] = Math.round((b0 * tint[2]) / 255);
        o[i + 3] = a0;
      } else {
        o[i] = r0;
        o[i + 1] = g0;
        o[i + 2] = b0;
        o[i + 3] = a0;
      }
    }

    targetCtx.putImageData(outData, 0, 0);
  } catch (err) {
    // Non-fatal safety guard: tainted or invalidated canvas context
    console.warn('recolorPixels safely skipped frame:', err);
  }
}

// Composites recolored layer onto target safely
function drawRecoloredLayer(
  targetCtx: CanvasRenderingContext2D,
  baseImg: HTMLImageElement,
  maskImg: HTMLImageElement,
  colors: OutfitColors,
  width: number,
  height: number,
  destX: number = 0,
  destY: number = 0
) {
  if (!baseImg || !maskImg) return;
  if (!baseImg.complete || baseImg.naturalWidth === 0) return;
  if (!maskImg.complete || maskImg.naturalWidth === 0) return;

  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const baseCtx = offCanvas.getContext('2d', { willReadFrequently: true });

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

    const recoloredCanvas = document.createElement('canvas');
    recoloredCanvas.width = width;
    recoloredCanvas.height = height;
    const recolorCtx = recoloredCanvas.getContext('2d');

    if (!baseCtx || !maskCtx || !recolorCtx) return;

    baseCtx.drawImage(baseImg, 0, 0);
    maskCtx.drawImage(maskImg, 0, 0);
    recolorPixels(baseCtx, maskCtx, recolorCtx, width, height, colors);

    targetCtx.drawImage(recoloredCanvas, destX, destY);
  } catch (err) {
    console.warn('drawRecoloredLayer safely handled exception:', err);
  }
}

export async function renderRecoloredOutfit(
  targetCanvas: HTMLCanvasElement,
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  direction: 'south' | 'east' | 'north' | 'west' = 'south',
  frame: number = 0,
  colors: OutfitColors,
  addons: number = 0,
  mount?: string,
  isMounted: boolean = false,
  isCurrent?: () => boolean
): Promise<void> {
  if (typeof window === 'undefined' && typeof document === 'undefined') return;
  if (isCurrent && !isCurrent()) return;

  const w = 64;
  const h = 64;

  const norm = normalizeOutfitId(outfitId);
  const caps = getOutfitCapabilities(norm);
  const safeFrame = caps.maxFrames <= 3
    ? (frame === 0 ? 0 : ((Math.abs(frame) - 1) % 2) + 1)
    : Math.max(0, Math.min(8, frame));
  const effectiveAddons = (caps.hasAddon1 ? (addons & 1) : 0) | (caps.hasAddon2 ? (addons & 2) : 0);
  const effectiveMounted = isMounted && caps.hasMountRider;
  const definitiveKey = getCanvasCacheKey(norm, gender, direction, safeFrame, colors, effectiveAddons, mount, effectiveMounted);

  // 1. Fast-path: If definitive recolored canvas is already in memory cache, draw immediately
  const definitiveCanvas = recoloredCanvasCache.get(definitiveKey);
  if (definitiveCanvas) {
    if (isCurrent && !isCurrent()) return;
    if (targetCanvas.width !== w) targetCanvas.width = w;
    if (targetCanvas.height !== h) targetCanvas.height = h;
    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx) {
      targetCtx.clearRect(0, 0, w, h);
      targetCtx.drawImage(definitiveCanvas, 0, 0);
    }
    return;
  }

  // 2. Immediate non-blocking provisional draw so UI does not show a blank rectangle while loading
  const provCanvas = getRecoloredCanvasSync(outfitId, gender, direction, frame, colors, addons, mount, isMounted);
  if (provCanvas) {
    if (!isCurrent || isCurrent()) {
      if (targetCanvas.width !== w) targetCanvas.width = w;
      if (targetCanvas.height !== h) targetCanvas.height = h;
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) {
        targetCtx.clearRect(0, 0, w, h);
        targetCtx.drawImage(provCanvas, 0, 0);
      }
    }
    // DO NOT return early here! We must proceed to download all required layers (including addons)
  }

  // 3. Gather layer URLs and trigger load for all required layers
  const urls = getOutfitLayerUrls(norm, gender, direction, safeFrame, effectiveAddons, mount, effectiveMounted);
  const offset = effectiveMounted ? getMountDisplacementOffset(norm, gender, mount) : { x: 0, y: 0 };

  const loadTasks: Promise<any>[] = [
    loadImage(urls.base).catch(() => null),
    loadImage(urls.mask).catch(() => null),
  ];
  if (effectiveMounted && urls.mountUrl) {
    loadTasks.push(loadImage(urls.mountUrl).catch(() => null));
  }
  if (urls.addon1Base && urls.addon1Mask) {
    loadTasks.push(loadImage(urls.addon1Base).catch(() => null));
    loadTasks.push(loadImage(urls.addon1Mask).catch(() => null));
  }
  if (urls.addon2Base && urls.addon2Mask) {
    loadTasks.push(loadImage(urls.addon2Base).catch(() => null));
    loadTasks.push(loadImage(urls.addon2Mask).catch(() => null));
  }

  await Promise.allSettled(loadTasks);

  if (isCurrent && !isCurrent()) return;

  // 4. Compose complete definitive canvas
  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;

  // 4a. Draw mount underneath if mounted
  let isMountDrawn = false;
  if (effectiveMounted && urls.mountUrl) {
    const mountImg = imageElementCache.get(urls.mountUrl);
    if (!mountImg || !mountImg.complete || mountImg.naturalWidth === 0) {
      console.warn('[renderRecoloredOutfit] ABORT: Mount image not ready:', urls.mountUrl, {
        hasCached: Boolean(mountImg),
        complete: mountImg?.complete,
        naturalWidth: mountImg?.naturalWidth
      });
      // Mandatory mount: do NOT draw a floating rider without mount!
      return;
    }
    offCtx.drawImage(mountImg, 0, 0);
    isMountDrawn = true;
  }

  // 4b. Draw rider/body base and mask layer
  let hasDrawnExactBase = false;
  let hasDrawnFallbackBase = false;
  const baseImg = imageElementCache.get(urls.base);
  const maskImg = imageElementCache.get(urls.mask);
  if (baseImg && maskImg && baseImg.complete && baseImg.naturalWidth > 0 && maskImg.complete && maskImg.naturalWidth > 0) {
    drawRecoloredLayer(offCtx, baseImg, maskImg, colors, w, h, offset.x, offset.y);
    hasDrawnExactBase = true;
  } else {
    const fbBaseUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-base.png`;
    const fbMaskUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-mask.png`;
    const fbBaseImg = imageElementCache.get(fbBaseUrl);
    const fbMaskImg = imageElementCache.get(fbMaskUrl);
    if (fbBaseImg && fbMaskImg && fbBaseImg.complete && fbBaseImg.naturalWidth > 0) {
      drawRecoloredLayer(offCtx, fbBaseImg, fbMaskImg, colors, w, h, offset.x, offset.y);
      hasDrawnFallbackBase = true;
    }
  }

  if (!hasDrawnExactBase && !hasDrawnFallbackBase && (!effectiveMounted || !urls.mountUrl)) {
    return;
  }

  // 4c. Draw Addon 1 if active
  let isAddon1Drawn = false;
  if (urls.addon1Base && urls.addon1Mask) {
    const a1Base = imageElementCache.get(urls.addon1Base);
    const a1Mask = imageElementCache.get(urls.addon1Mask);
    if (a1Base && a1Mask && a1Base.complete && a1Base.naturalWidth > 0 && a1Mask.complete && a1Mask.naturalWidth > 0) {
      drawRecoloredLayer(offCtx, a1Base, a1Mask, colors, w, h, offset.x, offset.y);
      isAddon1Drawn = true;
    }
  }

  // 4d. Draw Addon 2 if active
  let isAddon2Drawn = false;
  if (urls.addon2Base && urls.addon2Mask) {
    const a2Base = imageElementCache.get(urls.addon2Base);
    const a2Mask = imageElementCache.get(urls.addon2Mask);
    if (a2Base && a2Mask && a2Base.complete && a2Base.naturalWidth > 0 && a2Mask.complete && a2Mask.naturalWidth > 0) {
      drawRecoloredLayer(offCtx, a2Base, a2Mask, colors, w, h, offset.x, offset.y);
      isAddon2Drawn = true;
    }
  }

  if (isCurrent && !isCurrent()) return;

  // STRICT DEFINITIVE CACHE GUARD (Codex point 3):
  // Only store in recoloredCanvasCache if ALL required layers were drawn accurately without missing addons, mount, or base!
  const isFullyComplete =
    hasDrawnExactBase &&
    (!effectiveMounted || isMountDrawn) &&
    (!urls.addon1Base || isAddon1Drawn) &&
    (!urls.addon2Base || isAddon2Drawn);

  if (isFullyComplete) {
    recoloredCanvasCache.set(definitiveKey, offCanvas);
    provisionalCanvasCache.delete(definitiveKey);
  } else {
    // Incomplete composition: save to provisional canvas cache so UI can show progress,
    // but DO NOT poison definitive cache!
    provisionalCanvasCache.set(definitiveKey, offCanvas);
  }

  // 6. Draw to visible targetCanvas
  if (targetCanvas.width !== w) targetCanvas.width = w;
  if (targetCanvas.height !== h) targetCanvas.height = h;
  const targetCtx = targetCanvas.getContext('2d');
  if (targetCtx) {
    targetCtx.clearRect(0, 0, w, h);
    targetCtx.drawImage(offCanvas, 0, 0);
  }
}

// In-memory cache for definitive recolored canvas textures
export const recoloredCanvasCache = new Map<string, HTMLCanvasElement>();

// Transient cache for provisional fallback rendering during asset load
export const provisionalCanvasCache = new Map<string, HTMLCanvasElement>();

export function clearRecoloredCanvasCache(): void {
  recoloredCanvasCache.clear();
  provisionalCanvasCache.clear();
}

export async function preloadOutfitAllFrames(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  colors?: OutfitColors,
  addons: number = 0,
  mount?: string,
  isMounted: boolean = false,
  priorityDir: 'south' | 'east' | 'north' | 'west' = 'south'
): Promise<void> {
  if (typeof window === 'undefined' && typeof document === 'undefined') return;
  const norm = normalizeOutfitId(outfitId);
  const caps = getOutfitCapabilities(norm);
  const directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'];

  const effectiveAddons = (caps.hasAddon1 ? (addons & 1) : 0) | (caps.hasAddon2 ? (addons & 2) : 0);
  const effectiveMounted = isMounted && caps.hasMountRider;

  const loadAndCacheFrame = async (dir: 'south' | 'east' | 'north' | 'west', f: number) => {
    const urls = getOutfitLayerUrls(norm, gender, dir, f, effectiveAddons, mount, effectiveMounted);
    const subPromises: Promise<any>[] = [
      loadImage(urls.base).catch(() => null),
      loadImage(urls.mask).catch(() => null),
    ];
    if (urls.addon1Base) subPromises.push(loadImage(urls.addon1Base).catch(() => null));
    if (urls.addon1Mask) subPromises.push(loadImage(urls.addon1Mask).catch(() => null));
    if (urls.addon2Base) subPromises.push(loadImage(urls.addon2Base).catch(() => null));
    if (urls.addon2Mask) subPromises.push(loadImage(urls.addon2Mask).catch(() => null));
    if (urls.mountUrl) subPromises.push(loadImage(urls.mountUrl).catch(() => null));

    await Promise.allSettled(subPromises);
    if (colors) {
      getRecoloredCanvasSync(norm, gender, dir, f, colors, effectiveAddons, mount, effectiveMounted);
    }
  };

  const maxWalkFrame = Math.min(8, caps.maxFrames - 1);

  // 1. TOP PRIORITY: Idle (f0) and all walking frames for the priority facing direction FIRST!
  // This loads in < 30ms so character walking legs animate immediately without sliding
  const priorityFrames: number[] = [0];
  for (let f = 1; f <= maxWalkFrame; f++) {
    priorityFrames.push(f);
  }
  await Promise.allSettled(priorityFrames.map((f) => loadAndCacheFrame(priorityDir, f)));

  // 2. Idle frames (f0) across the other 3 directions
  const otherDirs = directions.filter((d) => d !== priorityDir);
  await Promise.allSettled(otherDirs.map((dir) => loadAndCacheFrame(dir, 0)));

  // 3. Preload remaining walk frames for the other directions in background with controlled concurrency (2)
  // so background preloading never floods the browser socket pool or starves active appearance preparation
  const remainingTasks: Array<() => Promise<void>> = [];
  for (const dir of otherDirs) {
    for (let f = 1; f <= maxWalkFrame; f++) {
      remainingTasks.push(() => loadAndCacheFrame(dir, f));
    }
  }
  if (remainingTasks.length > 0) {
    const queue = [...remainingTasks];
    const workerCount = Math.min(2, queue.length);
    const bgWorkers = Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const task = queue.shift();
        if (task) await task();
      }
    });
    Promise.allSettled(bgWorkers).catch(() => {});
  }
}

export interface AppearancePreparationResult {
  success: boolean;
  missingAssets: string[];
  totalFramesRequested: number;
  cachedFramesCount: number;
  durationMs: number;
  manifest?: PreparationManifest;
  resources?: PreparationResourceState;
  uncompositedFrames?: UncompositedFrameDetail[];
  error?: string;
}

/**
 * Phase 178/179: Pre-renderiza e aquece o cache síncrono (recoloredCanvasCache)
 * para todos os frames essenciais nas 4 direções cardeais do jogador ativo.
 * Instrumentado com manifesto prévio, contagem de recursos e auditoria de camadas faltantes.
 */
export async function prepareAppearanceCanvas(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  colors: OutfitColors = { head: 0, primary: 86, secondary: 114, detail: 76 },
  addons: number = 0,
  mount?: string,
  isMounted: boolean = false,
  directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'],
  frames?: number[],
  onProgress?: (manifest: PreparationManifest, resources: PreparationResourceState) => void,
  attemptId?: string
): Promise<AppearancePreparationResult> {
  const startTime = Date.now();
  if (typeof window === 'undefined' && typeof document === 'undefined') {
    return { success: false, missingAssets: ['window-undefined'], totalFramesRequested: 0, cachedFramesCount: 0, durationMs: 0 };
  }
  const norm = normalizeOutfitId(outfitId);
  const caps = getOutfitCapabilities(norm);
  const effectiveAddons = (caps.hasAddon1 ? (addons & 1) : 0) | (caps.hasAddon2 ? (addons & 2) : 0);
  const effectiveMounted = isMounted && caps.hasMountRider;

  const maxFrames = caps.maxFrames <= 3 ? 3 : 9;
  const targetFrames = frames && frames.length > 0
    ? frames.filter((f) => f < maxFrames)
    : Array.from({ length: maxFrames }, (_, i) => i);

  // 1. Gather all required image URLs in balanced priority order and categorize them BEFORE download starts:
  const rawUrls: string[] = [];
  const baseUrls: string[] = [];
  const maskUrls: string[] = [];
  const mountUrls: string[] = [];
  const addon1Urls: string[] = [];
  const addon2Urls: string[] = [];
  const unmountedUrls: string[] = [];

  const idleFrames = targetFrames.filter((f) => f === 0);
  const walkFrames = targetFrames.filter((f) => f !== 0);
  const orderedFrames = [...idleFrames, ...walkFrames];

  for (const f of orderedFrames) {
    for (const dir of directions) {
      const urls = getOutfitLayerUrls(norm, gender, dir, f, effectiveAddons, mount, effectiveMounted);
      if (urls.base) { rawUrls.push(urls.base); baseUrls.push(urls.base); }
      if (urls.mask) { rawUrls.push(urls.mask); maskUrls.push(urls.mask); }
      if (urls.addon1Base) { rawUrls.push(urls.addon1Base); addon1Urls.push(urls.addon1Base); }
      if (urls.addon1Mask) { rawUrls.push(urls.addon1Mask); addon1Urls.push(urls.addon1Mask); }
      if (urls.addon2Base) { rawUrls.push(urls.addon2Base); addon2Urls.push(urls.addon2Base); }
      if (urls.addon2Mask) { rawUrls.push(urls.addon2Mask); addon2Urls.push(urls.addon2Mask); }
      if (urls.mountUrl) { rawUrls.push(urls.mountUrl); mountUrls.push(urls.mountUrl); }
    }
  }

  // Also prepare unmounted idle frames if currently mounted so dismounting doesn't pop
  if (effectiveMounted) {
    for (const dir of directions) {
      const uUrls = getOutfitLayerUrls(norm, gender, dir, 0, effectiveAddons, undefined, false);
      if (uUrls.base) { rawUrls.push(uUrls.base); unmountedUrls.push(uUrls.base); }
      if (uUrls.mask) { rawUrls.push(uUrls.mask); unmountedUrls.push(uUrls.mask); }
      if (uUrls.addon1Base) { rawUrls.push(uUrls.addon1Base); addon1Urls.push(uUrls.addon1Base); }
      if (uUrls.addon1Mask) { rawUrls.push(uUrls.addon1Mask); addon1Urls.push(uUrls.addon1Mask); }
      if (uUrls.addon2Base) { rawUrls.push(uUrls.addon2Base); addon2Urls.push(uUrls.addon2Base); }
      if (uUrls.addon2Mask) { rawUrls.push(uUrls.addon2Mask); addon2Urls.push(uUrls.addon2Mask); }
    }
  }

  const uniqueUrls = Array.from(new Set(rawUrls));

  // Build manifest with counts filled BEFORE any downloads begin:
  const manifest: PreparationManifest = {
    totalUrls: rawUrls.length,
    uniqueUrls: uniqueUrls.length,
    categories: {
      base: baseUrls.length,
      mask: maskUrls.length,
      mount: mountUrls.length,
      addon1: addon1Urls.length,
      addon2: addon2Urls.length,
    },
    directions: [...directions],
    frames: [...targetFrames],
    unmountedBaseCount: unmountedUrls.length,
  };

  const inProgressUrls = new Set<string>();
  let startedCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  const failedDetails: Array<{ url: string; error: string; elapsedMs: number }> = [];

  const actualOnProgress = typeof onProgress === 'function' ? onProgress : undefined;
  const actualAttemptId = typeof onProgress === 'string' ? onProgress : attemptId;

  const updateTelemetry = (status: 'preparing' | 'ready' | 'failed' | 'exception', errorMsg?: string) => {
    try {
      const elapsed = Date.now() - startTime;
      const resState: PreparationResourceState = {
        enqueued: uniqueUrls.length,
        started: startedCount,
        completed: completedCount,
        failed: failedCount,
        inProgress: Array.from(inProgressUrls),
        failedDetails: [...failedDetails],
      };
      outfitDiagnostics.recordPreparation({
        status,
        manifest,
        resources: resState,
        durationMs: elapsed,
        error: errorMsg,
      }, actualAttemptId);
      if (typeof actualOnProgress === 'function') {
        try {
          actualOnProgress(manifest, resState);
        } catch (e) {
          console.warn('[outfitRecolor] Error in onProgress callback:', e);
        }
      }
    } catch (e) {
      console.warn('[outfitRecolor] Error in updateTelemetry:', e);
    }
  };

  // Token to cancel/yield stale preparations when superseded by a newer outfit change
  const prepToken = `${norm}_${gender}_${mount || 'none'}_${effectiveMounted}_${effectiveAddons}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}_${actualAttemptId || 'active'}`;
  const prepScopeKey = actualAttemptId || 'active';
  activePreparationTokens.set(prepScopeKey, prepToken);

  // Record function entry and initial manifest before downloads start:
  updateTelemetry('preparing');

  try {
    // 2. Throttled worker pool matching browser HTTP socket limits
    const missingAssets: string[] = [];
    const queue = [...uniqueUrls];
    const concurrency = 6;
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        // If superseded by a newer appearance preparation for the same scope, yield immediately
        if (activePreparationTokens.get(prepScopeKey) !== prepToken) {
          break;
        }

        const url = queue.shift();
        if (!url) break;
        const cached = imageElementCache.get(url);
        if (cached && cached.complete && cached.naturalWidth > 0) {
          completedCount++;
          updateTelemetry('preparing');
          continue;
        }

        startedCount++;
        inProgressUrls.add(url);
        updateTelemetry('preparing');

        const fetchT0 = Date.now();
        try {
          const img = await loadImage(url);
          inProgressUrls.delete(url);
          if (!img || !img.complete || img.naturalWidth === 0) {
            failedCount++;
            missingAssets.push(url);
            failedDetails.push({ url, error: 'image_empty_or_incomplete', elapsedMs: Date.now() - fetchT0 });
          } else {
            completedCount++;
          }
          updateTelemetry('preparing');
        } catch (err: any) {
          inProgressUrls.delete(url);
          failedCount++;
          missingAssets.push(url);
          failedDetails.push({ url, error: err?.message || 'load_failed', elapsedMs: Date.now() - fetchT0 });
          updateTelemetry('preparing');
        }
      }
    });

    await Promise.allSettled(workers);

    // 3. Now render and cache each recolored canvas synchronously into recoloredCanvasCache
    for (const dir of directions) {
      for (const f of targetFrames) {
        getRecoloredCanvasSync(norm, gender, dir, f, colors, effectiveAddons, mount, effectiveMounted);
      }
      if (effectiveMounted) {
        getRecoloredCanvasSync(norm, gender, dir, 0, colors, effectiveAddons, undefined, false);
      }
    }

    // 4. Audit uncomposited frames and identify which specific layers are missing
    const uncompositedFrames: UncompositedFrameDetail[] = [];
    for (const dir of directions) {
      for (const f of targetFrames) {
        const key = getCanvasCacheKey(norm, gender, dir, f, colors, effectiveAddons, mount, effectiveMounted);
        if (!recoloredCanvasCache.has(key)) {
          const layerUrls = getOutfitLayerUrls(norm, gender, dir, f, effectiveAddons, mount, effectiveMounted);
          const missingLayers: string[] = [];

          const baseImg = imageElementCache.get(layerUrls.base);
          if (!baseImg || !baseImg.complete || baseImg.naturalWidth === 0) {
            missingLayers.push(`base(${layerUrls.base})`);
          }
          const maskImg = imageElementCache.get(layerUrls.mask);
          if (!maskImg || !maskImg.complete || maskImg.naturalWidth === 0) {
            missingLayers.push(`mask(${layerUrls.mask})`);
          }
          if (effectiveMounted && layerUrls.mountUrl) {
            const mImg = imageElementCache.get(layerUrls.mountUrl);
            if (!mImg || !mImg.complete || mImg.naturalWidth === 0) {
              missingLayers.push(`mount(${layerUrls.mountUrl})`);
            }
          }
          if (layerUrls.addon1Base) {
            const a1b = imageElementCache.get(layerUrls.addon1Base);
            if (!a1b || !a1b.complete || a1b.naturalWidth === 0) {
              missingLayers.push(`addon1Base(${layerUrls.addon1Base})`);
            }
          }
          if (layerUrls.addon1Mask) {
            const a1m = imageElementCache.get(layerUrls.addon1Mask);
            if (!a1m || !a1m.complete || a1m.naturalWidth === 0) {
              missingLayers.push(`addon1Mask(${layerUrls.addon1Mask})`);
            }
          }
          if (layerUrls.addon2Base) {
            const a2b = imageElementCache.get(layerUrls.addon2Base);
            if (!a2b || !a2b.complete || a2b.naturalWidth === 0) {
              missingLayers.push(`addon2Base(${layerUrls.addon2Base})`);
            }
          }
          if (layerUrls.addon2Mask) {
            const a2m = imageElementCache.get(layerUrls.addon2Mask);
            if (!a2m || !a2m.complete || a2m.naturalWidth === 0) {
              missingLayers.push(`addon2Mask(${layerUrls.addon2Mask})`);
            }
          }

          uncompositedFrames.push({
            frameKey: `${dir}-f${f}`,
            direction: dir,
            frame: f,
            missingLayers,
          });
        }
      }
    }

    // 5. Verify full readiness across all directions and frames
    const fullCheck = isAppearanceFullyReady(norm, gender, colors, effectiveAddons, mount, effectiveMounted, directions, targetFrames);
    const uniqueMissing = Array.from(new Set([...missingAssets, ...fullCheck.missing]));
    const durationMs = Date.now() - startTime;
    const isSuccess = fullCheck.ready && uncompositedFrames.length === 0;

    const resState: PreparationResourceState = {
      enqueued: uniqueUrls.length,
      started: startedCount,
      completed: completedCount,
      failed: failedCount,
      inProgress: Array.from(inProgressUrls),
      failedDetails: [...failedDetails],
    };

    outfitDiagnostics.recordPreparation({
      status: isSuccess ? 'ready' : 'failed',
      success: isSuccess,
      durationMs,
      manifest,
      resources: resState,
      uncompositedFrames,
      missingAssets: uniqueMissing,
      missingFrames: fullCheck.missing,
      totalFramesRequested: fullCheck.total,
      cachedFramesCount: fullCheck.cached,
    }, attemptId);

    return {
      success: isSuccess,
      durationMs,
      manifest,
      resources: resState,
      uncompositedFrames,
      missingAssets: uniqueMissing,
      totalFramesRequested: fullCheck.total,
      cachedFramesCount: fullCheck.cached,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('[prepareAppearanceCanvas] Preparation threw unhandled exception:', errorMsg);

    const resState: PreparationResourceState = {
      enqueued: uniqueUrls.length,
      started: startedCount,
      completed: completedCount,
      failed: failedCount,
      inProgress: Array.from(inProgressUrls),
      failedDetails: [...failedDetails],
    };

    outfitDiagnostics.recordPreparation({
      status: 'exception',
      success: false,
      durationMs,
      error: errorMsg,
      manifest,
      resources: resState,
    }, attemptId);

    throw err;
  }
}

export function getCanvasCacheKey(
  norm: string,
  gender: string,
  direction: string,
  frame: number,
  colors: OutfitColors,
  addons: number,
  mount?: string,
  isMounted: boolean = false
): string {
  return `${norm}_${gender}_${direction}_${frame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}_a${addons || 0}_m${isMounted ? (mount || 'default') : 'none'}_v2`;
}

export function isOutfitCanvasCached(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  direction: 'south' | 'east' | 'north' | 'west' = 'south',
  frame: number = 0,
  colors: OutfitColors = { head: 0, primary: 86, secondary: 114, detail: 76 },
  addons: number = 0,
  mount?: string,
  isMounted: boolean = false
): boolean {
  const norm = normalizeOutfitId(outfitId);
  const caps = getOutfitCapabilities(norm);
  const safeFrame = caps.maxFrames <= 3
    ? (frame === 0 ? 0 : ((Math.abs(frame) - 1) % 2) + 1)
    : Math.max(0, Math.min(8, frame));
  const effectiveAddons = (caps.hasAddon1 ? (addons & 1) : 0) | (caps.hasAddon2 ? (addons & 2) : 0);
  const effectiveMounted = isMounted && caps.hasMountRider;
  const key = getCanvasCacheKey(norm, gender, direction, safeFrame, colors, effectiveAddons, mount, effectiveMounted);
  return recoloredCanvasCache.has(key);
}

/**
 * Phase 178: Verifica prontidão completa de todas as direções e passos de caminhada
 * no cache definitivo recoloredCanvasCache (Codex ponto 4).
 */
export function isAppearanceFullyReady(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  colors: OutfitColors = { head: 0, primary: 86, secondary: 114, detail: 76 },
  addons: number = 0,
  mount?: string,
  isMounted: boolean = false,
  directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'],
  frames?: number[]
): { ready: boolean; missing: string[]; total: number; cached: number } {
  const norm = normalizeOutfitId(outfitId);
  const caps = getOutfitCapabilities(norm);
  const maxFrames = caps.maxFrames <= 3 ? 3 : 9;
  const targetFrames = frames && frames.length > 0
    ? frames.filter((f) => f < maxFrames)
    : Array.from({ length: maxFrames }, (_, i) => i);
  const effectiveAddons = (caps.hasAddon1 ? (addons & 1) : 0) | (caps.hasAddon2 ? (addons & 2) : 0);
  const effectiveMounted = isMounted && caps.hasMountRider;

  const missing: string[] = [];
  let cached = 0;
  let total = 0;

  for (const dir of directions) {
    for (const f of targetFrames) {
      total++;
      const safeFrame = caps.maxFrames <= 3
        ? (f === 0 ? 0 : ((Math.abs(f) - 1) % 2) + 1)
        : Math.max(0, Math.min(8, f));
      const key = getCanvasCacheKey(norm, gender, dir, safeFrame, colors, effectiveAddons, mount, effectiveMounted);
      if (recoloredCanvasCache.has(key)) {
        cached++;
      } else {
        missing.push(`${dir}-f${f}`);
      }
    }
  }

  return {
    ready: missing.length === 0,
    missing,
    total,
    cached,
  };
}

export function getRecoloredCanvasSync(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  direction: 'south' | 'east' | 'north' | 'west' = 'south',
  frame: number = 0,
  colors: OutfitColors = { head: 0, primary: 86, secondary: 114, detail: 76 },
  addons: number = 0,
  mount?: string,
  isMounted: boolean = false
): HTMLCanvasElement | null {
  const norm = normalizeOutfitId(outfitId);
  const caps = getOutfitCapabilities(norm);
  const safeFrame = caps.maxFrames <= 3
    ? (frame === 0 ? 0 : ((Math.abs(frame) - 1) % 2) + 1)
    : Math.max(0, Math.min(8, frame));
  const effectiveAddons = (caps.hasAddon1 ? (addons & 1) : 0) | (caps.hasAddon2 ? (addons & 2) : 0);
  const effectiveMounted = isMounted && caps.hasMountRider;

  const key = getCanvasCacheKey(norm, gender, direction, safeFrame, colors, effectiveAddons, mount, effectiveMounted);
  const existing = recoloredCanvasCache.get(key);
  if (existing) return existing;

  const urls = getOutfitLayerUrls(norm, gender, direction, safeFrame, effectiveAddons, mount, effectiveMounted);

  // Check rider base and mask
  const isBaseFailed = isImagePermanentlyFailed(urls.base);
  const isMaskFailed = isImagePermanentlyFailed(urls.mask);
  const baseImg = imageElementCache.get(urls.base);
  const maskImg = imageElementCache.get(urls.mask);
  const isBaseReady = !!(baseImg && baseImg.complete && baseImg.naturalWidth > 0);
  const isMaskReady = !!(maskImg && maskImg.complete && maskImg.naturalWidth > 0);

  // Check mount layer if mounted (mandatory for mounted appearance)
  let isMountReady = true;
  let mountImg: HTMLImageElement | undefined;
  if (effectiveMounted && urls.mountUrl) {
    mountImg = imageElementCache.get(urls.mountUrl);
    isMountReady = !!(mountImg && mountImg.complete && mountImg.naturalWidth > 0);
  }

  // Check Addon 1 if active
  let isAddon1Ready = true;
  let a1Base: HTMLImageElement | undefined;
  let a1Mask: HTMLImageElement | undefined;
  if (urls.addon1Base && urls.addon1Mask) {
    if (isImagePermanentlyFailed(urls.addon1Base) || isImagePermanentlyFailed(urls.addon1Mask)) {
      // Inexistent addon 1: do not block composition
      isAddon1Ready = true;
      a1Base = undefined;
      a1Mask = undefined;
    } else {
      a1Base = imageElementCache.get(urls.addon1Base);
      a1Mask = imageElementCache.get(urls.addon1Mask);
      isAddon1Ready = !!(a1Base && a1Base.complete && a1Base.naturalWidth > 0 && a1Mask && a1Mask.complete && a1Mask.naturalWidth > 0);
    }
  }

  // Check Addon 2 if active
  let isAddon2Ready = true;
  let a2Base: HTMLImageElement | undefined;
  let a2Mask: HTMLImageElement | undefined;
  if (urls.addon2Base && urls.addon2Mask) {
    if (isImagePermanentlyFailed(urls.addon2Base) || isImagePermanentlyFailed(urls.addon2Mask)) {
      // Inexistent addon 2: do not block composition
      isAddon2Ready = true;
      a2Base = undefined;
      a2Mask = undefined;
    } else {
      a2Base = imageElementCache.get(urls.addon2Base);
      a2Mask = imageElementCache.get(urls.addon2Mask);
      isAddon2Ready = !!(a2Base && a2Base.complete && a2Base.naturalWidth > 0 && a2Mask && a2Mask.complete && a2Mask.naturalWidth > 0);
    }
  }

  const allLayersReady = isBaseReady && isMaskReady && isMountReady && isAddon1Ready && isAddon2Ready;

  // IF ANY REQUIRED LAYER IS NOT LOADED:
  if (!allLayersReady) {
    // Trigger asynchronous load for pending assets (skip permanently failed ones, respect retry cooldown)
    if (!isBaseReady && canRetryImage(urls.base)) loadImage(urls.base).catch(() => {});
    if (!isMaskReady && canRetryImage(urls.mask)) loadImage(urls.mask).catch(() => {});
    if (effectiveMounted && urls.mountUrl && !isMountReady && canRetryImage(urls.mountUrl)) {
      loadImage(urls.mountUrl).catch(() => {});
    }
    if (urls.addon1Base && !isAddon1Ready && canRetryImage(urls.addon1Base)) {
      loadImage(urls.addon1Base).catch(() => {});
      if (urls.addon1Mask && canRetryImage(urls.addon1Mask)) loadImage(urls.addon1Mask).catch(() => {});
    }
    if (urls.addon2Base && !isAddon2Ready && canRetryImage(urls.addon2Base)) {
      loadImage(urls.addon2Base).catch(() => {});
      if (urls.addon2Mask && canRetryImage(urls.addon2Mask)) loadImage(urls.addon2Mask).catch(() => {});
    }

    // DO NOT cache under definitive key in recoloredCanvasCache!
    // Return provisional fallback so display doesn't flicker or become invisible
    if (effectiveMounted) {
      // 1. Try mounted idle frame in CURRENT DIRECTION strictly
      const dirMountFallbackKey = getCanvasCacheKey(norm, gender, direction, 0, colors, effectiveAddons, mount, true);
      const dirMountFallback = recoloredCanvasCache.get(dirMountFallbackKey);
      if (dirMountFallback) return dirMountFallback;

      // 2. Try provisional canvas for this exact key (direction + frame)
      const provFallback = provisionalCanvasCache.get(key);
      if (provFallback) return provFallback;

      // 3. Try provisional canvas for current direction idle
      const provDirFallback = provisionalCanvasCache.get(dirMountFallbackKey);
      if (provDirFallback) return provDirFallback;

      // 4. Try constructing an immediate provisional composition using current direction f0 mount
      const f0MountUrl = mount && mount !== 'none' ? `/generated/mounts/${normalizeMountId(mount)}-${direction}-f0.png` : undefined;
      const f0MountImg = f0MountUrl ? imageElementCache.get(f0MountUrl) : undefined;
      const isF0MountReady = !!(f0MountImg && f0MountImg.complete && f0MountImg.naturalWidth > 0);

      // MANDATORY MOUNT: If f0 mount image is not ready, do NOT return a floating rider!
      if (!isF0MountReady || !f0MountImg) {
        return null;
      }

      const f0BaseUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-mount-base.png`;
      const f0MaskUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-mount-mask.png`;
      const f0BaseImg = imageElementCache.get(f0BaseUrl) || baseImg;
      const f0MaskImg = imageElementCache.get(f0MaskUrl) || maskImg;
      const isF0RiderReady = !!(f0BaseImg && f0BaseImg.complete && f0BaseImg.naturalWidth > 0 && f0MaskImg && f0MaskImg.complete && f0MaskImg.naturalWidth > 0);

      if (typeof document !== 'undefined' && isF0RiderReady) {
        const provW = 64;
        const provH = 64;
        const provCanvas = document.createElement('canvas');
        provCanvas.width = provW;
        provCanvas.height = provH;
        const provCtx = provCanvas.getContext('2d');
        if (provCtx) {
          provCtx.drawImage(f0MountImg, 0, 0);
          const offset = getMountDisplacementOffset(norm, gender, mount);
          drawRecoloredLayer(provCtx, f0BaseImg!, f0MaskImg!, colors, provW, provH, offset.x, offset.y);

          let hasMissingAddon = false;
          // Phase 178: DRAW ADDONS in provisional composition!
          if (caps.hasAddon1 && (effectiveAddons & 1) !== 0) {
            const f0A1BaseUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-mount-addon1-base.png`;
            const f0A1MaskUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-mount-addon1-mask.png`;
            const curA1Base = a1Base || imageElementCache.get(f0A1BaseUrl);
            const curA1Mask = a1Mask || imageElementCache.get(f0A1MaskUrl);
            if (curA1Base && curA1Mask) {
              drawRecoloredLayer(provCtx, curA1Base, curA1Mask, colors, provW, provH, offset.x, offset.y);
            } else {
              hasMissingAddon = true;
            }
          }
          if (caps.hasAddon2 && (effectiveAddons & 2) !== 0) {
            const f0A2BaseUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-mount-addon2-base.png`;
            const f0A2MaskUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-mount-addon2-mask.png`;
            const curA2Base = a2Base || imageElementCache.get(f0A2BaseUrl);
            const curA2Mask = a2Mask || imageElementCache.get(f0A2MaskUrl);
            if (curA2Base && curA2Mask) {
              drawRecoloredLayer(provCtx, curA2Base, curA2Mask, colors, provW, provH, offset.x, offset.y);
            } else {
              hasMissingAddon = true;
            }
          }

          if (!hasMissingAddon) {
            provisionalCanvasCache.set(key, provCanvas);
          }
          return provCanvas;
        }
      }
    } else {
      // 4. Fallback for unmounted: current direction frame 0
      const dirFallbackKey = getCanvasCacheKey(norm, gender, direction, 0, colors, effectiveAddons, undefined, false);
      const dirFallback = recoloredCanvasCache.get(dirFallbackKey);
      if (dirFallback) return dirFallback;

      // 5. Fallback for unmounted: south frame 0
      const southFallbackKey = getCanvasCacheKey(norm, gender, 'south', 0, colors, effectiveAddons, undefined, false);
      const southFallback = recoloredCanvasCache.get(southFallbackKey);
      if (southFallback) return southFallback;

      // 6. Try any provisional canvas for this key
      const provFallback = provisionalCanvasCache.get(key);
      if (provFallback) return provFallback;

      // 7. Try provisional canvas for dir or south
      const provDirFallback = provisionalCanvasCache.get(dirFallbackKey);
      if (provDirFallback) return provDirFallback;
      const provSouthFallback = provisionalCanvasCache.get(southFallbackKey);
      if (provSouthFallback) return provSouthFallback;

      // 8. If base and mask are loaded, generate an immediate provisional canvas so character never disappears
      if (typeof document !== 'undefined' && isBaseReady && isMaskReady && baseImg && maskImg) {
        const provW = 64;
        const provH = 64;
        const provCanvas = document.createElement('canvas');
        provCanvas.width = provW;
        provCanvas.height = provH;
        const provCtx = provCanvas.getContext('2d');
        if (provCtx) {
          drawRecoloredLayer(provCtx, baseImg, maskImg, colors, provW, provH, 0, 0);

          let hasMissingAddonUnmounted = false;
          // Phase 178: DRAW ADDONS in unmounted provisional composition!
          if (caps.hasAddon1 && (effectiveAddons & 1) !== 0) {
            const f0A1BaseUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-addon1-base.png`;
            const f0A1MaskUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-addon1-mask.png`;
            const curA1Base = a1Base || imageElementCache.get(f0A1BaseUrl);
            const curA1Mask = a1Mask || imageElementCache.get(f0A1MaskUrl);
            if (curA1Base && curA1Mask) {
              drawRecoloredLayer(provCtx, curA1Base, curA1Mask, colors, provW, provH, 0, 0);
            } else {
              hasMissingAddonUnmounted = true;
            }
          }
          if (caps.hasAddon2 && (effectiveAddons & 2) !== 0) {
            const f0A2BaseUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-addon2-base.png`;
            const f0A2MaskUrl = `/generated/outfits/${norm}-${gender}-${direction}-f0-addon2-mask.png`;
            const curA2Base = a2Base || imageElementCache.get(f0A2BaseUrl);
            const curA2Mask = a2Mask || imageElementCache.get(f0A2MaskUrl);
            if (curA2Base && curA2Mask) {
              drawRecoloredLayer(provCtx, curA2Base, curA2Mask, colors, provW, provH, 0, 0);
            } else {
              hasMissingAddonUnmounted = true;
            }
          }

          if (!hasMissingAddonUnmounted) {
            provisionalCanvasCache.set(key, provCanvas);
          }
          return provCanvas;
        }
      }
    }
    return null;
  }

  // ALL REQUIRED LAYERS ARE LOADED AND VALID!
  // Build definitive composition
  if (typeof document === 'undefined') return null;
  const w = 64;
  const h = 64;
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = w;
  targetCanvas.height = h;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return null;

  // MANDATORY MOUNT CHECK: A mounted character without mount is never drawn
  if (effectiveMounted && (!mountImg || !urls.mountUrl)) {
    return null;
  }

  const offset = effectiveMounted ? getMountDisplacementOffset(norm, gender, mount) : { x: 0, y: 0 };

  // 1. Draw mount underneath if mounted
  if (effectiveMounted && mountImg && urls.mountUrl) {
    targetCtx.drawImage(mountImg, 0, 0);
  }

  // 2. Draw rider / base with relative displacement
  drawRecoloredLayer(targetCtx, baseImg!, maskImg!, colors, w, h, offset.x, offset.y);

  // 3. Draw Addon 1 with relative displacement
  if (a1Base && a1Mask) {
    drawRecoloredLayer(targetCtx, a1Base, a1Mask, colors, w, h, offset.x, offset.y);
  }

  // 4. Draw Addon 2 with relative displacement
  if (a2Base && a2Mask) {
    drawRecoloredLayer(targetCtx, a2Base, a2Mask, colors, w, h, offset.x, offset.y);
  }

  // If any requested addon layer failed, store in provisional rather than poisoning definitive cache
  const hasIncompleteLayer =
    (urls.addon1Base && !a1Base) ||
    (urls.addon2Base && !a2Base);

  if (hasIncompleteLayer) {
    provisionalCanvasCache.set(key, targetCanvas);
  } else {
    recoloredCanvasCache.set(key, targetCanvas);
    provisionalCanvasCache.delete(key);
  }
  return targetCanvas;
}
