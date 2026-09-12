'use client';

import thaisCityJson from '@/content/generated/thais-city.json';
import visualAssetsJson from '@/content/generated/tibia1098-assets.json';
import rawMountsJson from '@/content/generated/mounts.json';
import type { Tibia1098AssetManifest } from '@/packages/tibia1098-assets/src/types';
import { ALL_SPELL_ICON_URLS } from '@/apps/web/components/Tibia11ActionIcon';
import { imageElementCache, loadImage } from '@/apps/web/lib/outfitRecolor';

const visualAssets = visualAssetsJson as Tibia1098AssetManifest;

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

  // 1. Mapa de Thais (Piscinas, Pisos, Paredes, Telhados e Decorações)
  const upperTiles = (thaisCityJson as { upperTiles?: typeof thaisCityJson.tiles }).upperTiles ?? [];
  const allTiles = [...thaisCityJson.tiles, ...upperTiles];
  for (const t of allTiles) {
    for (const id of t.serverItemIds) {
      const mapping = visualAssets.mapItems[String(id)];
      if (mapping?.frames && mapping.frames.length > 0) {
        for (const f of mapping.frames) {
          if (f.publicUrl) mapUrls.add(f.publicUrl);
        }
      } else if (mapping?.frame?.publicUrl) {
        mapUrls.add(mapping.frame.publicUrl);
      }
    }
  }

  // Assets fixos de treinamento e templo
  if (visualAssets.assets?.trainingFloor?.frames?.[0]?.publicUrl) {
    mapUrls.add(visualAssets.assets.trainingFloor.frames[0].publicUrl);
  }
  if (visualAssets.assets?.trainingWall?.frames?.[0]?.publicUrl) {
    mapUrls.add(visualAssets.assets.trainingWall.frames[0].publicUrl);
  }
  if (visualAssets.assets?.trainingDummy?.frames?.[0]?.publicUrl) {
    mapUrls.add(visualAssets.assets.trainingDummy.frames[0].publicUrl);
  }

  // 2. Montarias (Todas as montarias do jogo em todas as direções)
  const directions = ['south', 'east', 'north', 'west'];
  (rawMountsJson as Array<{ id: string }>).forEach((m) => {
    if (!m.id || m.id === 'none') return;
    directions.forEach((dir) => {
      mountUrls.add(`/generated/mounts/${m.id}_rider_${dir}.png`);
      mountUrls.add(`/generated/mounts/${m.id}-${dir}-f0.png`);
    });
  });
  mountUrls.add('/generated/mounts/donkey_rider_south.png');

  // 3. Outfits & Vocações (Trajes principais, feminino e masculino, f0 a f4)
  const coreOutfits = [
    'citizen', 'hunter', 'mage', 'knight', 'noble', 'summoner',
    'warrior', 'barbarian', 'druid', 'sorcerer', 'paladin', 'sire',
    'assassin', 'pirate', 'oriental', 'beggar'
  ];
  const genders = ['male', 'female'];

  coreOutfits.forEach((outfit) => {
    outfitUrls.add(`/generated/outfit-thumbs/${outfit}.png`);
    genders.forEach((gender) => {
      directions.forEach((dir) => {
        // Idle frame f0
        outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f0-base.png`);
        outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f0-mask.png`);
        // Walk frames f1..f4
        for (let f = 1; f <= 4; f++) {
          outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f${f}-base.png`);
          outfitUrls.add(`/generated/outfits/${outfit}-${gender}-${dir}-f${f}-mask.png`);
        }
      });
    });
  });

  // 4. Magias, Runas e Poções
  ALL_SPELL_ICON_URLS.forEach((url) => {
    if (url) spellUrls.add(url);
  });

  // 5. Efeitos Visuais e Mísseis
  if (visualAssets.missiles) {
    Object.values(visualAssets.missiles).forEach((m) => {
      m.frames.forEach((f) => {
        if (f.publicUrl) effectUrls.add(f.publicUrl);
      });
    });
  }
  if (visualAssets.effects) {
    Object.values(visualAssets.effects).forEach((e) => {
      e.frames.forEach((f) => {
        if (f.publicUrl) effectUrls.add(f.publicUrl);
      });
    });
  }

  // 6. Itens Canônicos Essenciais
  if (visualAssets.items) {
    // Equipamentos principais e itens frequentes
    const coreItemKeys = Object.keys(visualAssets.items).slice(0, 350);
    coreItemKeys.forEach((key) => {
      const item = visualAssets.items[key];
      if (item?.frame?.publicUrl) {
        itemUrls.add(item.frame.publicUrl);
      }
    });
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
async function preloadSingleImage(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 350);
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

  public async startPreload(): Promise<void> {
    if (this.isPreloading || this.isFinished) return;
    this.isPreloading = true;
    this.isFinished = false;
    this.progress = 0;

    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
    }
    // Timeout de segurança: garante que em 2200ms a tela de loading seja liberada
    this.safetyTimer = setTimeout(() => {
      if (!this.isFinished) {
        this.markComplete();
      }
    }, 2200);

    const categorized = compileEssentialAssetUrls();
    const categories: Array<{
      key: keyof CategorizedAssetUrls;
      label: string;
      weight: number; // Porcentagem do total
      urls: string[];
    }> = [
      { key: 'map', label: 'mapa e cenários de Thais', weight: 28, urls: categorized.map },
      { key: 'mounts', label: 'montarias e criaturas', weight: 20, urls: categorized.mounts },
      { key: 'outfits', label: 'trajes e animações de personagens', weight: 20, urls: categorized.outfits },
      { key: 'spells', label: 'catálogo de magias, runas e poções', weight: 15, urls: categorized.spells },
      { key: 'effects', label: 'efeitos de combate e projéteis', weight: 7, urls: categorized.effects },
      { key: 'items', label: 'equipamentos e itens do mundo', weight: 6, urls: categorized.items },
      { key: 'audio', label: 'áudios e ambientação sonora', weight: 4, urls: categorized.audio },
    ];

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
        cat.key === 'audio' ? 2 : 32,
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
