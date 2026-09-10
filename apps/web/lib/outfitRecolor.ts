import rawOutfitsJson from '@/content/generated/outfits.json';

export interface OutfitColors {
  head: number;
  primary: number;
  secondary: number;
  detail: number;
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
}>) || [];

export function normalizeOutfitId(outfitId: string): string {
  const idLower = (outfitId || 'Knight').toLowerCase().trim();
  const clean = idLower.replace(/[^a-z0-9]+/g, '-');
  const found = CANONICAL_OUTFITS.find(
    (o) =>
      o.id === clean ||
      o.name.toLowerCase() === idLower ||
      o.femaleName.toLowerCase() === idLower ||
      o.maleName.toLowerCase() === idLower
  );
  if (found) return found.id;

  // Aliases and fallbacks
  if (idLower.includes('citizen')) return 'citizen';
  if (idLower.includes('hunter')) return 'hunter';
  if (idLower.includes('mage')) return 'mage';
  if (idLower.includes('knight')) return 'knight';
  if (idLower.includes('noble')) return 'noble';
  if (idLower.includes('summoner')) return 'summoner';
  if (idLower.includes('warrior')) return 'warrior';
  if (idLower.includes('barbarian')) return 'barbarian';
  if (idLower.includes('druid')) return 'druid';
  if (idLower.includes('sorcerer')) return 'mage';
  if (idLower.includes('paladin')) return 'hunter';
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
  const safeFrame = Math.max(0, Math.min(8, frame));
  const posePrefix = isMounted ? 'mount' : 'f' + safeFrame;

  const res: {
    base: string;
    mask: string;
    addon1Base?: string;
    addon1Mask?: string;
    addon2Base?: string;
    addon2Mask?: string;
    mountUrl?: string;
  } = {
    base: isMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-base.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-base.png`,
    mask: isMounted
      ? `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mount-mask.png`
      : `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mask.png`,
  };

  if ((addons & 1) !== 0) {
    res.addon1Base = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon1-base.png`;
    res.addon1Mask = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon1-mask.png`;
  }
  if ((addons & 2) !== 0) {
    res.addon2Base = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon2-base.png`;
    res.addon2Mask = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-addon2-mask.png`;
  }

  if (isMounted && mount && mount !== 'none') {
    const normMount = normalizeMountId(mount);
    res.mountUrl = `/generated/mounts/${normMount}-${direction}-f${safeFrame}.png`;
  }

  return res;
}

const imageElementCache = new Map<string, HTMLImageElement>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window undefined in SSR'));
  }
  const cached = imageElementCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      // Fallback for missing directional mount frames to south base mount
      if (url.includes('/generated/mounts/') && url.includes('-f')) {
        const baseMountUrl = url.replace(/-[a-z]+-f\d+\.png$/, '.png');
        if (baseMountUrl !== url) {
          img.src = baseMountUrl;
          return;
        }
      }
      reject(new Error(`Failed to load image at ${url}`));
    };
    img.src = url;
  });
}

export function recolorPixels(
  baseCtx: CanvasRenderingContext2D,
  maskCtx: CanvasRenderingContext2D,
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: OutfitColors
): void {
  const baseData = baseCtx.getImageData(0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);
  const outData = targetCtx.createImageData(width, height);

  const headHex = TIBIA_133_COLORS[colors.head] || '#ffffff';
  const bodyHex = TIBIA_133_COLORS[colors.primary] || '#0055ff';
  const legsHex = TIBIA_133_COLORS[colors.secondary] || '#00aa00';
  const feetHex = TIBIA_133_COLORS[colors.detail] || '#aa5500';

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
}

// Composites recolored layer onto target
function drawRecoloredLayer(
  targetCtx: CanvasRenderingContext2D,
  baseImg: HTMLImageElement,
  maskImg: HTMLImageElement,
  colors: OutfitColors,
  width: number,
  height: number
) {
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

  targetCtx.drawImage(recoloredCanvas, 0, 0);
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
  isMounted: boolean = false
): Promise<void> {
  if (typeof window === 'undefined') return;

  const w = 64;
  const h = 64;
  targetCanvas.width = w;
  targetCanvas.height = h;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return;
  targetCtx.clearRect(0, 0, w, h);

  const urls = getOutfitLayerUrls(outfitId, gender, direction, frame, addons, mount, isMounted);

  // 1. If mounted, load and draw mount underneath
  if (isMounted && urls.mountUrl) {
    try {
      const mountImg = await loadImage(urls.mountUrl);
      targetCtx.drawImage(mountImg, 0, 0);
    } catch {
      // ignore
    }
  }

  // 2. Load rider/base layer
  try {
    let baseImg: HTMLImageElement;
    let maskImg: HTMLImageElement;
    try {
      [baseImg, maskImg] = await Promise.all([loadImage(urls.base), loadImage(urls.mask)]);
    } catch {
      // If mount pose doesn't exist, fallback to regular base
      const norm = normalizeOutfitId(outfitId);
      const safeFrame = Math.max(0, Math.min(2, frame));
      const fbBase = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-base.png`;
      const fbMask = `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mask.png`;
      [baseImg, maskImg] = await Promise.all([loadImage(fbBase), loadImage(fbMask)]);
    }
    drawRecoloredLayer(targetCtx, baseImg, maskImg, colors, w, h);
  } catch {
    // ignore
  }

  // 3. Addon 1
  if (urls.addon1Base && urls.addon1Mask) {
    try {
      const [a1Base, a1Mask] = await Promise.all([loadImage(urls.addon1Base), loadImage(urls.addon1Mask)]);
      drawRecoloredLayer(targetCtx, a1Base, a1Mask, colors, w, h);
    } catch {
      // ignore
    }
  }

  // 4. Addon 2
  if (urls.addon2Base && urls.addon2Mask) {
    try {
      const [a2Base, a2Mask] = await Promise.all([loadImage(urls.addon2Base), loadImage(urls.addon2Mask)]);
      drawRecoloredLayer(targetCtx, a2Base, a2Mask, colors, w, h);
    } catch {
      // ignore
    }
  }
}

// In-memory cache for recolored canvas textures
const recoloredCanvasCache = new Map<string, HTMLCanvasElement>();

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
  const directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'];
  const frames = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const loadPromises: Promise<HTMLImageElement>[] = [];
  for (const dir of directions) {
    for (const f of frames) {
      const urls = getOutfitLayerUrls(norm, gender, dir, f, addons, mount, isMounted);
      loadPromises.push(loadImage(urls.base).catch(() => null as any));
      loadPromises.push(loadImage(urls.mask).catch(() => null as any));
      if (urls.addon1Base) loadPromises.push(loadImage(urls.addon1Base).catch(() => null as any));
      if (urls.addon1Mask) loadPromises.push(loadImage(urls.addon1Mask).catch(() => null as any));
      if (urls.addon2Base) loadPromises.push(loadImage(urls.addon2Base).catch(() => null as any));
      if (urls.addon2Mask) loadPromises.push(loadImage(urls.addon2Mask).catch(() => null as any));
      if (urls.mountUrl) loadPromises.push(loadImage(urls.mountUrl).catch(() => null as any));
    }
  }

  await Promise.allSettled(loadPromises);

  if (colors) {
    for (const dir of directions) {
      for (const f of frames) {
        getRecoloredCanvasSync(norm, gender, dir, f, colors, addons, mount, isMounted);
      }
    }
  }
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
  const key = `${norm}_${gender}_${direction}_${frame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}_a${addons || 0}_m${isMounted ? (mount || 'default') : 'none'}`;
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
  const key = `${norm}_${gender}_${direction}_${frame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}_a${addons || 0}_m${isMounted ? (mount || 'default') : 'none'}`;
  const existing = recoloredCanvasCache.get(key);
  if (existing) return existing;

  const urls = getOutfitLayerUrls(norm, gender, direction, frame, addons, mount, isMounted);
  let baseImg = imageElementCache.get(urls.base);
  let maskImg = imageElementCache.get(urls.mask);

  if (!baseImg || !baseImg.complete) {
    // Fallback if mounted pose is not cached: try regular base
    const fbBase = `/generated/outfits/${norm}-${gender}-${direction}-f${frame}-base.png`;
    const fbMask = `/generated/outfits/${norm}-${gender}-${direction}-f${frame}-mask.png`;
    baseImg = imageElementCache.get(fbBase);
    maskImg = imageElementCache.get(fbMask);
  }

  if (!baseImg || !baseImg.complete || !maskImg || !maskImg.complete) {
    // Trigger async load
    loadImage(urls.base).catch(() => {});
    loadImage(urls.mask).catch(() => {});
    if (urls.mountUrl) loadImage(urls.mountUrl).catch(() => {});

    // Fallback standing frame with identical colors
    const dirFallbackKey = `${norm}_${gender}_${direction}_0_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}_a0_mnone`;
    const dirFallback = recoloredCanvasCache.get(dirFallbackKey);
    if (dirFallback) return dirFallback;

    const southFallbackKey = `${norm}_${gender}_south_0_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}_a0_mnone`;
    const southFallback = recoloredCanvasCache.get(southFallbackKey);
    if (southFallback) return southFallback;
    return null;
  }

  const w = 64;
  const h = 64;
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = w;
  targetCanvas.height = h;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return null;

  // 1. Draw mount underneath if mounted
  if (isMounted && urls.mountUrl) {
    const mountImg = imageElementCache.get(urls.mountUrl);
    if (mountImg && mountImg.complete) {
      targetCtx.drawImage(mountImg, 0, 0);
    } else {
      loadImage(urls.mountUrl).catch(() => {});
    }
  }

  // 2. Draw rider / base
  drawRecoloredLayer(targetCtx, baseImg, maskImg, colors, w, h);

  // 3. Draw Addon 1
  if (urls.addon1Base && urls.addon1Mask) {
    const a1Base = imageElementCache.get(urls.addon1Base);
    const a1Mask = imageElementCache.get(urls.addon1Mask);
    if (a1Base && a1Base.complete && a1Mask && a1Mask.complete) {
      drawRecoloredLayer(targetCtx, a1Base, a1Mask, colors, w, h);
    } else {
      loadImage(urls.addon1Base).catch(() => {});
      loadImage(urls.addon1Mask).catch(() => {});
    }
  }

  // 4. Draw Addon 2
  if (urls.addon2Base && urls.addon2Mask) {
    const a2Base = imageElementCache.get(urls.addon2Base);
    const a2Mask = imageElementCache.get(urls.addon2Mask);
    if (a2Base && a2Base.complete && a2Mask && a2Mask.complete) {
      drawRecoloredLayer(targetCtx, a2Base, a2Mask, colors, w, h);
    } else {
      loadImage(urls.addon2Base).catch(() => {});
      loadImage(urls.addon2Mask).catch(() => {});
    }
  }

  recoloredCanvasCache.set(key, targetCanvas);
  return targetCanvas;
}
