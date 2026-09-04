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

export function normalizeOutfitId(outfitId: string): string {
  const idLower = (outfitId || 'Knight').toLowerCase().trim();
  if (idLower.includes('sire')) return 'sire';
  if (idLower.includes('citizen')) return 'citizen';
  if (idLower.includes('hunter')) return 'hunter';
  if (idLower.includes('mage')) return 'mage';
  if (idLower.includes('knight')) return 'knight';
  if (idLower.includes('noble')) return 'noble';
  if (idLower.includes('summoner')) return 'summoner';
  if (idLower.includes('warrior')) return 'warrior';
  if (idLower.includes('barbarian')) return 'barbarian';
  if (idLower.includes('druid')) return 'druid';
  if (idLower.includes('sorcerer')) return 'sorcerer';
  if (idLower.includes('oriental')) return 'oriental';
  if (idLower.includes('pirate')) return 'pirate';
  if (idLower.includes('assassin')) return 'assassin';
  if (idLower.includes('beggar')) return 'beggar';
  if (idLower.includes('paladin')) return 'paladin';
  return 'knight';
}

export function getOutfitLayerUrls(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  direction: 'south' | 'east' | 'north' | 'west' = 'south',
  frame: number = 0
): { base: string; mask: string } {
  const norm = normalizeOutfitId(outfitId);
  const safeFrame = Math.max(0, Math.min(2, frame));
  return {
    base: `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-base.png`,
    mask: `/generated/outfits/${norm}-${gender}-${direction}-f${safeFrame}-mask.png`,
  };
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
    img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
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

      // Red -> Head
      if (mR > 200 && mG < 50 && mB < 50) tint = headRgb;
      // Green -> Body / Primary
      else if (mG > 200 && mR < 50 && mB < 50) tint = bodyRgb;
      // Blue -> Legs / Secondary
      else if (mB > 200 && mR < 50 && mG < 50) tint = legsRgb;
      // Yellow -> Feet / Detail
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

export async function renderRecoloredOutfit(
  targetCanvas: HTMLCanvasElement,
  outfitId: string,
  gender: 'male' | 'female',
  direction: 'south' | 'east' | 'north' | 'west',
  frame: number,
  colors: OutfitColors
): Promise<void> {
  if (typeof window === 'undefined') return;

  const { base, mask } = getOutfitLayerUrls(outfitId, gender, direction, frame);
  try {
    const [baseImg, maskImg] = await Promise.all([loadImage(base), loadImage(mask)]);
    const w = baseImg.width || 64;
    const h = baseImg.height || 64;

    targetCanvas.width = w;
    targetCanvas.height = h;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const baseCtx = offCanvas.getContext('2d', { willReadFrequently: true });

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

    const targetCtx = targetCanvas.getContext('2d');
    if (!baseCtx || !maskCtx || !targetCtx) return;

    baseCtx.drawImage(baseImg, 0, 0);
    maskCtx.drawImage(maskImg, 0, 0);

    recolorPixels(baseCtx, maskCtx, targetCtx, w, h, colors);
  } catch {
    // Fallback: draw base image directly
    const ctx = targetCanvas.getContext('2d');
    if (ctx) {
      try {
        const fallback = await loadImage(base);
        targetCanvas.width = fallback.width || 64;
        targetCanvas.height = fallback.height || 64;
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(fallback, 0, 0);
      } catch {
        // ignore
      }
    }
  }
}

// In-memory cache for recolored canvas textures (e.g. for PixiJS and game loop)
const recoloredCanvasCache = new Map<string, HTMLCanvasElement>();

export async function preloadOutfitAllFrames(
  outfitId: string,
  gender: 'male' | 'female' = 'male',
  colors?: OutfitColors
): Promise<void> {
  if (typeof window === 'undefined') return;
  const norm = normalizeOutfitId(outfitId);
  const directions: Array<'south' | 'east' | 'north' | 'west'> = ['south', 'east', 'north', 'west'];
  const frames = [0, 1, 2];

  const loadPromises: Promise<HTMLImageElement>[] = [];
  for (const dir of directions) {
    for (const f of frames) {
      const { base, mask } = getOutfitLayerUrls(norm, gender, dir, f);
      loadPromises.push(loadImage(base));
      loadPromises.push(loadImage(mask));
    }
  }

  await Promise.allSettled(loadPromises);

  if (colors) {
    for (const dir of directions) {
      for (const f of frames) {
        getRecoloredCanvasSync(norm, gender, dir, f, colors);
      }
    }
  }
}

export function getRecoloredCanvasSync(
  outfitId: string,
  gender: 'male' | 'female',
  direction: 'south' | 'east' | 'north' | 'west',
  frame: number,
  colors: OutfitColors
): HTMLCanvasElement | null {
  const norm = normalizeOutfitId(outfitId);
  const key = `${norm}_${gender}_${direction}_${frame}_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
  const existing = recoloredCanvasCache.get(key);
  if (existing) return existing;

  const { base, mask } = getOutfitLayerUrls(norm, gender, direction, frame);
  const baseImg = imageElementCache.get(base);
  const maskImg = imageElementCache.get(mask);

  if (!baseImg || !baseImg.complete || !maskImg || !maskImg.complete) {
    // Pre-trigger async load for upcoming frames
    loadImage(base).catch(() => {});
    loadImage(mask).catch(() => {});

    // Fallback: If walk frame is not loaded yet, return frame 0 or standing frame with identical colors
    // to PREVENT reverting to uncolored base outfit frames while walking
    const dirFallbackKey = `${norm}_${gender}_${direction}_0_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
    const dirFallback = recoloredCanvasCache.get(dirFallbackKey);
    if (dirFallback) return dirFallback;

    const southFallbackKey = `${norm}_${gender}_south_0_${colors.head}_${colors.primary}_${colors.secondary}_${colors.detail}`;
    const southFallback = recoloredCanvasCache.get(southFallbackKey);
    if (southFallback) return southFallback;

    return null;
  }

  const w = baseImg.width || 64;
  const h = baseImg.height || 64;

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = w;
  targetCanvas.height = h;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const baseCtx = offCanvas.getContext('2d', { willReadFrequently: true });

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

  const targetCtx = targetCanvas.getContext('2d');
  if (!baseCtx || !maskCtx || !targetCtx) return null;

  baseCtx.drawImage(baseImg, 0, 0);
  maskCtx.drawImage(maskImg, 0, 0);

  recolorPixels(baseCtx, maskCtx, targetCtx, w, h, colors);
  recoloredCanvasCache.set(key, targetCanvas);
  return targetCanvas;
}
