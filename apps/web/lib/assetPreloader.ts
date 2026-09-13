'use client';

import rawMountsJson from '@/content/generated/mounts.json';
import { ALL_SPELL_ICON_URLS } from '@/apps/web/components/Tibia11ActionIcon';
import { imageElementCache, loadImage } from '@/apps/web/lib/outfitRecolor';

export interface PreloadProgressState {
  progress: number; // 0 to 100
  category: string;
  message: string;
  loaded: number;
  total: number;
  isComplete: boolean;
}

export type PreloadProgressCallback = (state: PreloadProgressState) => void;

/**
 * Categorias prioritárias para carregamento progressivo
 */
export interface CategorizedAssetUrls {
  map: string[];
  mounts: string[];
  outfits: string[];
  spells: string[];
  effects: string[];
  items: string[];
  audio: string[];
}

export interface ActivePlayerPreloadContext {
  outfit?: string;
  gender?: 'male' | 'female';
  outfitColors?: { head: number; primary: number; secondary: number; detail: number };
  addons?: number;
  mount?: string;
  isMounted?: boolean;
  hotbarUrls?: string[];
}

/**
 * Phase 150: Extrai os assets fundamentais e prioritários estritamente para o personagem ativo.
 * Garante que traje (idle + passos de caminhada f1..f4), montaria ativa e chão do spawn carregem 100% no Frame 1.
 */
export function compileActivePlayerAssetUrls(ctx?: ActivePlayerPreloadContext): CategorizedAssetUrls {
  const mapUrls = new Set<string>();
  const mountUrls = new Set<string>();
  const outfitUrls = new Set<string>();
  const spellUrls = new Set<string>();
  const effectUrls = new Set<string>();
  const itemUrls = new Set<string>();
  const audioUrls = new Set<string>();

  const directions = ['south', 'east', 'north', 'west'] as const;

  // 1. Outfit do jogador ativo: frames idle f0 e passos de caminhada f1..f4 nas 4 direções
  const rawOutfit = (ctx?.outfit || 'knight').toLowerCase().trim();
  const cleanOutfit = rawOutfit.replace(/[^a-z0-9]+/g, '-');
  const outfit = cleanOutfit.includes('sorcerer') ? 'mage' : cleanOutfit.includes('paladin') ? 'hunter' : (cleanOutfit || 'knight');
  const gender = ctx?.gender === 'female' ? 'female' : 'male';

  outfitUrls.add(`/generated/outfit-thumbs/${outfit}.png`);
  outfitUrls.add(`/generated/outfit-thumbs/citizen.png`);

  directions.forEach((dir) => {
    // Idle frame f0
    outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f0-base.png`);
    outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f0-mask.png`);
    // Walk frames prioritários f1..f4 (garante passos fluidos sem deslizar)
    for (let f = 1; f <= 4; f++) {
      outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f${f}-base.png`);
      outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f${f}-mask.png`);
    }
  });

  // 2. Montaria ativa do jogador (somente a montaria que ele estiver usando!)
  if (ctx?.isMounted && ctx?.mount && ctx?.mount !== 'none') {
    const mountId = ctx.mount.toLowerCase().trim();
    directions.forEach((dir) => {
      mountUrls.add(`/generated/mounts/${mountId}-${dir}-f0.png`);
    });
  }

  // 3. Atlases de Textura do mundo de Thais, criaturas/UI, magias/runas e equipamentos
  mapUrls.add('/generated/atlases/thais-atlas.png');
  mapUrls.add('/generated/atlases/creatures-atlas.png');
  mapUrls.add('/generated/atlases/spells-atlas.png');
  mapUrls.add('/generated/atlases/equipment-atlas.png');

  // 4. Magias da hotbar do jogador
  if (ctx?.hotbarUrls && ctx.hotbarUrls.length > 0) {
    ctx.hotbarUrls.forEach((url) => {
      if (url) spellUrls.add(url);
    });
  } else {
    ['/spells/exura.png', '/spells/exori.png', '/potions/health-potion.png', '/potions/mana-potion.png'].forEach((u) => spellUrls.add(u));
  }

  // 5. Itens e moedas essenciais
  itemUrls.add('/assets/items/item-2160.png'); // Crystal Coin / Gold
  itemUrls.add('/assets/items/item-2148.png'); // Gold Coin

  // 6. Áudio essencial de Thais
  audioUrls.add('/songs/sunset-in-the-village.mp3');

  return {
    map: Array.from(mapUrls),
    mounts: Array.from(mountUrls),
    outfits: Array.from(outfitUrls),
    spells: Array.from(spellUrls),
    effects: Array.from(effectUrls),
    items: Array.from(itemUrls),
    audio: Array.from(audioUrls),
  };
}

/**
 * Extrai e compila a lista completa de todos os assets fundamentais do jogo
 */
export function compileEssentialAssetUrls(): CategorizedAssetUrls {
  const mapUrls = new Set<string>();
  const mountUrls = new Set<string>();
  const outfitUrls = new Set<string>();
  const spellUrls = new Set<string>();
  const effectUrls = new Set<string>();
  const itemUrls = new Set<string>();
  const audioUrls = new Set<string>();

  // 1. Atlases de Textura: Thais, Criaturas/UI, Magias/Runas e Equipamentos Canônicos
  mapUrls.add('/generated/atlases/thais-atlas.png');
  mapUrls.add('/generated/atlases/creatures-atlas.png');
  mapUrls.add('/generated/atlases/spells-atlas.png');
  mapUrls.add('/generated/atlases/equipment-atlas.png');
  for (let i = 100; i <= 280; i++) {
    mapUrls.add(`/assets/items/item-${i}.png`);
  }

  // 2. Montarias Canônicas (todos os frames idle f0 válidos existentes para as 129 montarias)
  const directions = ['south', 'east', 'north', 'west'];
  (rawMountsJson as Array<{ id: string }>).forEach((m) => {
    if (!m.id || m.id === 'none') return;
    directions.forEach((dir) => {
      // Carrega frames idle existentes f0 (sem URLs fantasmas de rider que causavam 404 e lentidão)
      mountUrls.add(`/generated/mounts/${m.id}-${dir}-f0.png`);
    });
  });

  // 3. Outfits Principais das 4 Vocações e Citizen (f0 idle e f1..f4 passos)
  const coreOutfits = ['knight', 'paladin', 'sorcerer', 'druid', 'citizen'];
  const genders = ['male', 'female'];

  coreOutfits.forEach((outfit) => {
    outfitUrls.add(`/generated/outfit-thumbs/${outfit}.png`);
    genders.forEach((gender) => {
      directions.forEach((dir) => {
        // Idle frame f0
        outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f0-base.png`);
        outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f0-mask.png`);
        // Walk frames prioritários f1..f4
        for (let f = 1; f <= 4; f++) {
          outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f${f}-base.png`);
          outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f${f}-mask.png`);
        }
      });
    });
  });

  // 4. Todas as Magias, Runas e Poções Canônicas
  ALL_SPELL_ICON_URLS.forEach((url) => {
    if (url) spellUrls.add(url);
  });

  // 5. Efeitos Visuais e Mísseis prioritários
  for (let i = 1; i <= 30; i++) {
    effectUrls.add(`/generated/tibia1098/effect-${i}-static-frame-0.png`);
  }

  // 6. Itens Canônicos Iniciais
  for (let i = 2140; i <= 2260; i++) {
    itemUrls.add(`/assets/items/item-${i}.png`);
  }

  // 7. Áudio
  audioUrls.add('/songs/sunset-in-the-village.mp3');

  return {
    map: Array.from(mapUrls),
    mounts: Array.from(mountUrls),
    outfits: Array.from(outfitUrls),
    spells: Array.from(spellUrls),
    effects: Array.from(effectUrls),
    items: Array.from(itemUrls),
    audio: Array.from(audioUrls),
  };
}

/**
 * Carrega e decodifica uma imagem individual no browser com timeout estrito de segurança
 */
async function preloadSingleImage(url: string, timeoutMs: number = 2500): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    loadImage(url)
      .then((img) => {
        clearTimeout(timer);
        if ('decode' in img) {
          img.decode().catch(() => {}).finally(() => resolve(true));
        } else {
          resolve(true);
        }
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}

/**
 * Pré-carrega um arquivo de áudio no browser
 */
function preloadAudio(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(true);
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audio.oncanplaythrough = () => resolve(true);
      audio.onerror = () => resolve(false);
      setTimeout(() => resolve(true), 1500);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Pré-carrega um lote de URLs com controle estrito de concorrência
 */
async function preloadBatchWithConcurrency(
  urls: string[],
  concurrencyLimit: number,
  onItemLoaded: () => void,
  isAudio: boolean = false
): Promise<void> {
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(concurrencyLimit, urls.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      if (isAudio) {
        await preloadAudio(url);
      } else {
        await preloadSingleImage(url);
      }
      onItemLoaded();
    }
  });

  await Promise.allSettled(workers);
}

class AssetPreloaderService {
  private isPreloading = false;
  private isFinished = false;
  private progress = 0;
  private message = 'Iniciando carregamento do mundo...';
  private currentCategory = '';
  private loadedCount = 0;
  private totalCount = 0;
  private listeners = new Set<PreloadProgressCallback>();
  private safetyTimer: NodeJS.Timeout | null = null;

  public onProgress(cb: PreloadProgressCallback): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getState(): PreloadProgressState {
    return {
      progress: this.progress,
      category: this.currentCategory,
      message: this.message,
      loaded: this.loadedCount,
      total: this.totalCount,
      isComplete: this.isFinished,
    };
  }

  public isComplete(): boolean {
    return this.isFinished;
  }

  public getProgress(): number {
    return this.progress;
  }

  public getMessage(): string {
    return this.message;
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.warn('[AssetPreloader] Listener error:', err);
      }
    });
  }

  public markComplete(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    this.progress = 100;
    this.isFinished = true;
    this.isPreloading = false;
    this.message = 'Mundo 100% carregado! Entrando em Thais...';
    this.notify();
  }

  /**
   * Phase 150: Pré-carrega prioritariamente os assets exclusivos do personagem ativo
   * e libera a entrada no jogo sem cortes prematuros nem dependência de 1.900 arquivos.
   */
  public async startPreload(ctx?: ActivePlayerPreloadContext): Promise<void> {
    if (this.isPreloading || this.isFinished) return;
    this.isPreloading = true;
    this.isFinished = false;
    this.progress = 0;

    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
    }
    // Timeout emergencial amplo de 10s caso ocorra queda total de conexão
    this.safetyTimer = setTimeout(() => {
      if (!this.isFinished) {
        this.markComplete();
      }
    }, 10000);

    const categorized = compileActivePlayerAssetUrls(ctx);
    const allCategories: Array<{
      key: keyof CategorizedAssetUrls;
      label: string;
      weight: number; // Porcentagem do total
      urls: string[];
    }> = [
      { key: 'outfits', label: 'traje e animações de caminhada', weight: 50, urls: categorized.outfits },
      { key: 'mounts', label: 'montaria ativa', weight: 15, urls: categorized.mounts },
      { key: 'map', label: 'mapa e templo de Thais', weight: 25, urls: categorized.map },
      { key: 'spells', label: 'ações da hotbar', weight: 5, urls: categorized.spells },
      { key: 'items', label: 'equipamentos iniciais', weight: 3, urls: categorized.items },
      { key: 'audio', label: 'áudio ambiente', weight: 2, urls: categorized.audio },
    ];
    const categories = allCategories.filter((c) => c.urls.length > 0);

    this.totalCount = categories.reduce((sum, c) => sum + c.urls.length, 0);
    this.loadedCount = 0;

    let accumulatedWeight = 0;

    for (const cat of categories) {
      if (this.isFinished) break;
      this.currentCategory = cat.key;
      this.message = `Carregando ${cat.label}...`;
      this.notify();

      let catLoaded = 0;
      const catTotal = Math.max(1, cat.urls.length);

      await preloadBatchWithConcurrency(
        cat.urls,
        cat.key === 'audio' ? 2 : 6,
        () => {
          if (this.isFinished) return;
          catLoaded++;
          this.loadedCount++;
          const catProgress = (catLoaded / catTotal) * cat.weight;
          this.progress = Math.min(99, Math.round(accumulatedWeight + catProgress));
          this.notify();
        },
        cat.key === 'audio'
      );

      accumulatedWeight += cat.weight;
      if (!this.isFinished) {
        this.progress = Math.min(99, Math.round(accumulatedWeight));
        this.notify();
      }
    }

    this.markComplete();

    // Streaming silencioso em segundo plano para o restante do catálogo (sem bloquear a jogabilidade)
    void this.startDeferredBackgroundPreload();
  }

  /**
   * Transmite o catálogo expandido em segundo plano com baixa concorrência
   */
  private async startDeferredBackgroundPreload(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const otherOutfits = ['paladin', 'sorcerer', 'druid', 'citizen'];
      const bgOutfitUrls: string[] = [];
      const directions = ['south', 'east', 'north', 'west'] as const;
      otherOutfits.forEach((outfit) => {
        bgOutfitUrls.push(`/generated/outfit-thumbs/${outfit}.png`);
        directions.forEach((dir) => {
          bgOutfitUrls.push(`/generated/outfits/${outfit}-male-${dir}-f0-base.png`);
          bgOutfitUrls.push(`/generated/outfits/${outfit}-male-${dir}-f0-mask.png`);
        });
      });
      await preloadBatchWithConcurrency(bgOutfitUrls, 2, () => {});
    } catch {
      // Background preload falha silenciosamente sem impactar jogo
    }
  }

  public reset(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    this.isPreloading = false;
    this.isFinished = false;
    this.progress = 0;
    this.loadedCount = 0;
    this.totalCount = 0;
    this.message = 'Iniciando carregamento do mundo...';
    this.currentCategory = '';
    this.notify();
  }
}

export const assetPreloader = new AssetPreloaderService();
