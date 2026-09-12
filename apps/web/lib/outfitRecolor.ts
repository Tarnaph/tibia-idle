import rawOutfitsJson from '@/content/generated/outfits.json';
import rawMountsJson from '@/content/generated/mounts.json';

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

export const OUTFITS_MAX_FRAMES_3 = new Set(['noble', 'paladin', 'sire', 'sorcerer']);

export function getOutfitCapabilities(outfitId: string): OutfitCapabilities {
  const norm = normalizeOutfitId(outfitId);
  const found = CANONICAL_OUTFITS.find((o) => o.id === norm);
  const hasAddon1 = found?.hasAddon1 ?? true;
  const hasAddon2 = found?.hasAddon2 ?? true;
  const hasMountRider = found?.hasMountRider ?? true;
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

const imageElementCache = new Map<string, HTMLImageElement>();
const inFlightImagePromises = new Map<string, Promise<HTMLImageElement>>();
export const failedImageUrls = new Set<string>();
const failedImageUrlsWithTimestamp = new Map<string, number>();
const failedImageAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED_IMAGE_ATTEMPTS = 3;
const FAILED_IMAGE_RETRY_DELAY_MS = 2000;
const FAILED_IMAGE_TTL_MS = 15000;

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
  return failedImageUrls.has(url);
}

export function canRetryImage(url: string): boolean {
  if (isImagePermanentlyFailed(url)) return false;
  const entry = failedImageAttempts.get(url);
  if (!entry) return true;
  return Date.now() - entry.lastAttempt >= FAILED_IMAGE_RETRY_DELAY_MS;
}

export function registerCachedImage(url: string, img: HTMLImageElement): void {
  imageElementCache.set(url, img);
  failedImageUrls.delete(url);
  failedImageUrlsWithTimestamp.delete(url);
  failedImageAttempts.delete(url);
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
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
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
    img.crossOrigin = 'anonymous';

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        handleError();
      }
    }, 3500);

    const handleSuccess = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      inFlightImagePromises.delete(url);
      failedImageUrls.delete(url);
      failedImageUrlsWithTimestamp.delete(url);
      failedImageAttempts.delete(url);
      imageElementCache.set(url, img);
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

      if (entry.count >= MAX_FAILED_IMAGE_ATTEMPTS) {
        failedImageUrls.add(url);
        failedImageUrlsWithTimestamp.set(url, now);
      }

      // Fallback for missing directional mount frames to south base mount
      if (url.includes('/generated/mounts/') && url.includes('-f')) {
        const baseMountUrl = url.replace(/-[a-z]+-f\d+\.png$/, '.png');
        if (baseMountUrl !== url) {
          loadImage(baseMountUrl)
            .then((baseImg) => {
              imageElementCache.set(url, baseImg);
              resolve(baseImg);
            })
            .catch(() => {
              reject(new Error(`Failed to load mount fallback image at ${url}`));
            });
          return;
        }
      }

      // If a mounted addon is missing, fallback to unmounted addon
      if (url.includes('-mount-addon')) {
        const unmountedAddonUrl = url.replace('-mount-addon', '-addon');
        if (unmountedAddonUrl !== url) {
          loadImage(unmountedAddonUrl)
            .then((addonImg) => {
              imageElementCache.set(url, addonImg);
              resolve(addonImg);
            })
            .catch(() => {
              reject(new Error(`Failed to load addon fallback image at ${url}`));
            });
          return;
        }
      }

      reject(new Error(`Failed to load image at ${url}`));
    };

    img.onload = handleSuccess;
    img.onerror = handleError;
    img.src = url;
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
  if (typeof window === 'undefined') return;
  if (isCurrent && !isCurrent()) return;

  const w = 64;
  const h = 64;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;

  const urls = getOutfitLayerUrls(outfitId, gender, direction, frame, addons, mount, isMounted);
  const offset = isMounted ? getMountDisplacementOffset(outfitId, gender, mount) : { x: 0, y: 0 };

  // 1. If mounted, load and draw mount underneath
  if (isMounted && urls.mountUrl) {
    try {
      const mountImg = await loadImage(urls.mountUrl);
      if (isCurrent && !isCurrent()) return;
      offCtx.drawImage(mountImg, 0, 0);
    } catch {
      // ignore missing mount
    }
  }
  if (isCurrent && !isCurrent()) return;

  // 2. Load rider/base layer
  try {
    let baseImg: HTMLImageElement;
    let maskImg: HTMLImageElement;
    try {
      [baseImg, maskImg] = await Promise.all([loadImage(urls.base), loadImage(urls.mask)]);
    } catch {
      // If mount pose doesn't exist, fallback to regular base
      const norm = normalizeOutfitId(outfitId);
      const caps = getOutfitCapabilities(norm);
      const safeFrame = caps.maxFrames <= 3
        ? (frame === 0 ? 0 : ((Math.abs(frame) - 1) % 2) + 1)
        : Math.max(0, Math.min(2, frame));
      const fbBase = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-base.png`;
      const fbMask = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mask.png`;
      [baseImg, maskImg] = await Promise.all([loadImage(fbBase), loadImage(fbMask)]);
    }
    if (isCurrent && !isCurrent()) return;
    drawRecoloredLayer(offCtx, baseImg, maskImg, colors, w, h, offset.x, offset.y);
  } catch {
    // ignore
  }
  if (isCurrent && !isCurrent()) return;

  // 3. Addon 1
  if (urls.addon1Base && urls.addon1Mask) {
    try {
      const [a1Base, a1Mask] = await Promise.all([loadImage(urls.addon1Base), loadImage(urls.addon1Mask)]);
      if (isCurrent && !isCurrent()) return;
      drawRecoloredLayer(offCtx, a1Base, a1Mask, colors, w, h, offset.x, offset.y);
    } catch {
      // ignore
    }
  }
  if (isCurrent && !isCurrent()) return;

  // 4. Addon 2
  if (urls.addon2Base && urls.addon2Mask) {
    try {
      const [a2Base, a2Mask] = await Promise.all([loadImage(urls.addon2Base), loadImage(urls.addon2Mask)]);
      if (isCurrent && !isCurrent()) return;
      drawRecoloredLayer(offCtx, a2Base, a2Mask, colors, w, h, offset.x, offset.y);
    } catch {
      // ignore
    }
  }
  if (isCurrent && !isCurrent()) return;

  // 5. Blit offscreen buffer to visible targetCanvas in a single synchronous operation
  if (targetCanvas.width !== w) targetCanvas.width = w;
  if (targetCanvas.height !== h) targetCanvas.height = h;
  const targetCtx = targetCanvas.getContext('2d');
  if (targetCtx) {
    targetCtx.clearRect(0, 0, w, h);
    targetCtx.drawImage(offCanvas, 0, 0);
  }
}

// In-memory cache for definitive recolored canvas textures
const recoloredCanvasCache = new Map<string, HTMLCanvasElement>();

// Transient cache for provisional fallback rendering during asset load
const provisionalCanvasCache = new Map<string, HTMLCanvasElement>();

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
  isMounted: boolean = false
): Promise<void> {
  if (typeof window === 'undefined') return;
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

  // 1. Prioritize frame 0 (idle) across all 4 directions immediately so standing pose is instantly ready
  await Promise.allSettled(directions.map((dir) => loadAndCacheFrame(dir, 0)));

  // 2. Preload walk frames: up to maxFrames - 1 (e.g. 2 for 3-frame outfits, 8 for others)
  const maxWalkFrame = Math.min(8, caps.maxFrames - 1);
  for (const dir of directions) {
    const dirPromises: Promise<void>[] = [];
    for (let f = 1; f <= maxWalkFrame; f++) {
      dirPromises.push(loadAndCacheFrame(dir, f));
    }
    await Promise.allSettled(dirPromises);
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

  // Check mount layer if mounted
  let isMountReady = true;
  let mountImg: HTMLImageElement | undefined;
  if (effectiveMounted && urls.mountUrl) {
    if (isImagePermanentlyFailed(urls.mountUrl)) {
      // Inexistent mount: do not block composition
      isMountReady = true;
      mountImg = undefined;
    } else {
      mountImg = imageElementCache.get(urls.mountUrl);
      isMountReady = !!(mountImg && mountImg.complete && mountImg.naturalWidth > 0);
    }
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
      // 1. Try mounted idle frame in current direction
      const dirMountFallbackKey = getCanvasCacheKey(norm, gender, direction, 0, colors, effectiveAddons, mount, true);
      const dirMountFallback = recoloredCanvasCache.get(dirMountFallbackKey);
      if (dirMountFallback) return dirMountFallback;

      // 2. Try mounted idle frame in south direction
      const southMountFallbackKey = getCanvasCacheKey(norm, gender, 'south', 0, colors, effectiveAddons, mount, true);
      const southMountFallback = recoloredCanvasCache.get(southMountFallbackKey);
      if (southMountFallback) return southMountFallback;

      // 3. Try any provisional canvas for this key
      const provFallback = provisionalCanvasCache.get(key);
      if (provFallback) return provFallback;
    } else {
      // 4. Fallback for unmounted: current direction frame 0
      const dirFallbackKey = getCanvasCacheKey(norm, gender, direction, 0, colors, effectiveAddons, undefined, false);
      const dirFallback = recoloredCanvasCache.get(dirFallbackKey);
      if (dirFallback) return dirFallback;

      // 5. Fallback for unmounted: south frame 0
      const southFallbackKey = getCanvasCacheKey(norm, gender, 'south', 0, colors, effectiveAddons, undefined, false);
      const southFallback = recoloredCanvasCache.get(southFallbackKey);
      if (southFallback) return southFallback;
    }
    return null;
  }

  // ALL REQUIRED LAYERS ARE LOADED AND VALID!
  // Build definitive composition
  const w = 64;
  const h = 64;
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = w;
  targetCanvas.height = h;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return null;

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

  // If any requested layer failed (e.g. 404 or transient), do NOT poison recoloredCanvasCache!
  // Cache in provisionalCanvasCache so it can be re-attempted or upgraded once available.
  const hasIncompleteLayer =
    (effectiveMounted && urls.mountUrl && !mountImg) ||
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
