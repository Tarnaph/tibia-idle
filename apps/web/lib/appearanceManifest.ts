import {
  normalizeOutfitId,
  normalizeMountId,
  getOutfitCapabilities,
  getOutfitLayerUrls,
} from './outfitRecolor';
import { hasOutfitAtlas, hasMountAtlas } from './outfitAtlasLoader';

export interface AppearanceParams {
  outfit?: string;
  gender?: 'male' | 'female';
  addons?: number;
  mount?: string;
  isMounted?: boolean;
}

export interface AppearanceManifest {
  outfitId: string;
  gender: 'male' | 'female';
  addons: number;
  mountId?: string;
  isMounted: boolean;
  availableFrames: number[];
  essentialFrames: number[];
  extendedFrames: number[];
  directions: ('south' | 'east' | 'north' | 'west')[];
  outfitUrls: string[];
  mountUrls: string[];
  essentialUrls: string[];
  extendedUrls: string[];
  allRequiredUrls: string[];
}

const DIRECTIONS = ['south', 'east', 'north', 'west'] as const;

/**
 * Compila a lista exata e canônica de todas as camadas visuais exigidas
 * pela aparência ativa de um personagem (a pé e/ou montado), consultando
 * os frames e recursos realmente disponíveis de cada outfit, addon e montaria.
 * Prioriza texturas consolidadas de Atlas (1-2 URLs) em vez de centenas de arquivos individuais.
 */
export function compileAppearanceManifest(params?: AppearanceParams): AppearanceManifest {
  const outfitId = normalizeOutfitId(params?.outfit || 'knight');
  const gender = params?.gender === 'female' ? 'female' : 'male';
  const caps = getOutfitCapabilities(outfitId);
  const effectiveAddons = (caps.hasAddon1 ? ((params?.addons ?? 0) & 1) : 0) |
                          (caps.hasAddon2 ? ((params?.addons ?? 0) & 2) : 0);
  const isMounted = Boolean(params?.isMounted && caps.hasMountRider);
  const rawMount = params?.mount && params.mount !== 'none' ? normalizeMountId(params.mount) : undefined;
  const mountId = (isMounted || rawMount) && caps.hasMountRider ? rawMount : undefined;

  const outfitUrls = new Set<string>();
  const mountUrls = new Set<string>();
  const essentialUrls = new Set<string>();
  const extendedUrls = new Set<string>();

  // Miniatura canônica do traje
  const thumbUrl = `/generated/outfit-thumbs/${outfitId}.png`;
  outfitUrls.add(thumbUrl);
  essentialUrls.add(thumbUrl);

  // Frames disponíveis reais do outfit
  const maxAvailable = caps.maxFrames <= 3 ? 3 : 9;
  const availableFrames = Array.from({ length: maxAvailable }, (_, i) => i);
  // Frames essenciais para início imediato (f0 idle + ciclo completo de passos f1..f8)
  const essentialFrames = availableFrames;
  const extendedFrames: number[] = [];

  const outfitAtlasAvailable = hasOutfitAtlas(outfitId, gender);
  const mountAtlasAvailable = mountId ? hasMountAtlas(mountId) : false;

  // 1. OUTFIT ASSETS: Se coberto por Texture Atlas, enfileira UNICAMENTE o atlas consolidado
  if (outfitAtlasAvailable) {
    const atlasUrl = `/generated/atlases/outfits/${outfitId}-${gender}.png`;
    outfitUrls.add(atlasUrl);
    essentialUrls.add(atlasUrl);
  } else {
    // Fallback para outfits legados sem atlas compilado
    const mountStates: boolean[] = [];
    if (isMounted) {
      mountStates.push(true, false);
    } else if (mountId) {
      mountStates.push(false, true);
    } else {
      mountStates.push(false);
    }

    for (const mounted of mountStates) {
      const isPrimaryMountState = mounted === isMounted;
      for (const dir of DIRECTIONS) {
        for (const f of availableFrames) {
          const layers = getOutfitLayerUrls(outfitId, gender, dir, f, effectiveAddons, mountId, mounted);
          const isEss = isPrimaryMountState && essentialFrames.includes(f);

          const addLayer = (url?: string, isMount = false) => {
            if (!url) return;
            if (isMount) {
              if (!mountAtlasAvailable) mountUrls.add(url);
            } else {
              outfitUrls.add(url);
            }
            if (isEss) {
              essentialUrls.add(url);
            } else {
              extendedUrls.add(url);
            }
          };

          addLayer(layers.base);
          addLayer(layers.mask);
          if (layers.addon1Base) addLayer(layers.addon1Base);
          if (layers.addon1Mask) addLayer(layers.addon1Mask);
          if (layers.addon2Base) addLayer(layers.addon2Base);
          if (layers.addon2Mask) addLayer(layers.addon2Mask);
          if (layers.mountUrl && !mountAtlasAvailable) addLayer(layers.mountUrl, true);
        }
      }
    }
  }

  // 2. MOUNT ASSETS: Se coberto por Texture Atlas, enfileira UNICAMENTE o atlas da montaria
  if (mountId) {
    if (mountAtlasAvailable) {
      const mountAtlasUrl = `/generated/atlases/mounts/${mountId}.png`;
      mountUrls.add(mountAtlasUrl);
      if (isMounted) {
        essentialUrls.add(mountAtlasUrl);
      } else {
        extendedUrls.add(mountAtlasUrl);
      }
    } else {
      // Fallback para montarias legadas sem atlas compilado
      for (const dir of DIRECTIONS) {
        for (const f of availableFrames) {
          const mUrl = `/generated/mounts/${mountId}-${dir}-f${f}.png`;
          mountUrls.add(mUrl);
          if (isMounted && essentialFrames.includes(f)) {
            essentialUrls.add(mUrl);
          } else {
            extendedUrls.add(mUrl);
          }
        }
      }
    }
  }

  const allRequired = Array.from(new Set([...outfitUrls, ...mountUrls]));

  return {
    outfitId,
    gender,
    addons: effectiveAddons,
    mountId,
    isMounted,
    availableFrames,
    essentialFrames,
    extendedFrames,
    directions: Array.from(DIRECTIONS),
    outfitUrls: Array.from(outfitUrls),
    mountUrls: Array.from(mountUrls),
    essentialUrls: Array.from(essentialUrls),
    extendedUrls: Array.from(extendedUrls),
    allRequiredUrls: allRequired,
  };
}
