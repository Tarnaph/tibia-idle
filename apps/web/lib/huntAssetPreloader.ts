'use client';

import visualAssetsJson from '@/content/generated/tibia1098-combat-assets.json';

export interface HuntPreloadProgress {
  huntId: string;
  progress: number; // 0 to 100
  loaded: number;
  total: number;
  isComplete: boolean;
  message: string;
}

export type HuntPreloadCallback = (progress: HuntPreloadProgress) => void;

// Mapeamento canônico de monstros por caçada para pré-carregamento determinístico
export const HUNT_MONSTER_MAPPING: Record<string, string[]> = {
  'rat-cellars': ['rat', 'cave-rat'],
  'spider-burrow': ['spider', 'bug', 'poison-spider'],
  'troll-camp': ['troll', 'swamp-troll'],
  'old-crypt': ['skeleton'],
  'rotworm-cave': ['rotworm', 'carrion-worm'],
  'cyclops-camp': ['cyclops', 'cyclops-smith'],
  'elf-sanctuary': ['elf', 'elf-scout', 'elf-arcanist'],
  'dragon-lair': ['dragon', 'dragon-lord'],
  'pvp-arena': ['Knight', 'Paladin', 'Sorcerer', 'Druid'],
};

// IDs de efeitos de combate essenciais usados por magias e combate físico
export const ESSENTIAL_COMBAT_EFFECT_IDS = [
  '1', '2', '3', '4', '5', '7', '10', '11', '12', '13',
  '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
  '24', '25', '26', '27', '28', '29', '30', '31', '32', '33',
  '34', '35', '36', '37', '38', '39', '40', '41', '42', '43',
  '44', '46', '47', '50', '55',
];

export const ESSENTIAL_COMBAT_MISSILE_IDS = [
  '1', '2', '3', '4', '5', '11', '24', '28', '30', '37', '38', '39', '41',
];

class HuntAssetPreloaderService {
  private completedHunts = new Set<string>();
  private activePreloadPromises = new Map<string, Promise<boolean>>();
  private listeners = new Set<HuntPreloadCallback>();
  private imageCache = new Set<string>();

  public isHuntReady(huntId: string): boolean {
    return this.completedHunts.has(huntId);
  }

  public getHuntMonsterIds(huntId: string): string[] {
    return HUNT_MONSTER_MAPPING[huntId] || [];
  }

  public getHuntEssentialAssetUrls(huntId: string): string[] {
    const urls = new Set<string>();
    urls.add(`/generated/atlases/hunt-${huntId}-atlas.png`);
    const monsters = this.getHuntMonsterIds(huntId);
    for (const m of monsters) {
      const clean = m.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      urls.add(`/generated/bestiary/${clean}.png`);
      urls.add(`/generated/tibia1098/monster-${clean}-thumb.png`);
    }
    return Array.from(urls);
  }

  public onProgress(callback: HuntPreloadCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(state: HuntPreloadProgress): void {
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch {}
    });
  }

  private preloadImage(url: string): Promise<boolean> {
    if (this.imageCache.has(url)) return Promise.resolve(true);
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(true);
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.imageCache.add(url);
        resolve(true);
      };
      img.onerror = () => {
        resolve(false);
      };
      img.src = url;
    });
  }

  /**
   * Dispara o pré-carregamento autoritativo dos recursos da hunt ativa
   * Garante o download prévio do atlas da hunt, sprites dos monstros e efeitos de combate
   */
  public async preloadHunt(huntId: string): Promise<boolean> {
    if (this.completedHunts.has(huntId)) {
      return true;
    }

    if (this.activePreloadPromises.has(huntId)) {
      return this.activePreloadPromises.get(huntId)!;
    }

    const promise = (async () => {
      const urlsToLoad = new Set<string>();

      // 1. Atlas da Hunt específica (json e png)
      const atlasJsonUrl = `/generated/atlases/hunt-${huntId}-atlas.json`;
      const atlasPngUrl = `/generated/atlases/hunt-${huntId}-atlas.png`;
      urlsToLoad.add(atlasPngUrl);

      // 2. Fetch do JSON do atlas para pré-aquecer cache HTTP
      if (typeof window !== 'undefined') {
        fetch(atlasJsonUrl, { cache: 'force-cache' }).catch(() => {});
      }

      // 3. Monstros da Hunt (sprites canônicos no Bestiário e thumbs)
      const monsters = HUNT_MONSTER_MAPPING[huntId] || [];
      for (const monsterId of monsters) {
        const clean = monsterId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        urlsToLoad.add(`/generated/bestiary/${clean}.png`);
        urlsToLoad.add(`/generated/tibia1098/monster-${clean}-thumb.png`);
      }

      // 4. Efeitos e mísseis de combate essenciais do Tibia 10.98
      const combatAssets = visualAssetsJson as any;
      if (combatAssets?.effects) {
        for (const effId of ESSENTIAL_COMBAT_EFFECT_IDS) {
          const fx = combatAssets.effects[effId];
          if (fx?.frames) {
            for (const f of fx.frames) {
              if (f.publicUrl) urlsToLoad.add(f.publicUrl);
            }
          }
        }
      }

      if (combatAssets?.missiles) {
        for (const misId of ESSENTIAL_COMBAT_MISSILE_IDS) {
          const mis = combatAssets.missiles[misId];
          if (mis?.frames) {
            for (const f of mis.frames) {
              if (f.publicUrl) urlsToLoad.add(f.publicUrl);
            }
          }
        }
      }

      const list = Array.from(urlsToLoad);
      const total = list.length;
      let loaded = 0;

      this.notify({
        huntId,
        progress: 0,
        loaded: 0,
        total,
        isComplete: false,
        message: `Carregando mapa e monstros da caçada...`,
      });

      // Carregamento paralelo em lotes de 20
      const BATCH_SIZE = 20;
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const chunk = list.slice(i, i + BATCH_SIZE);
        await Promise.all(chunk.map((url) => this.preloadImage(url)));
        loaded = Math.min(total, loaded + chunk.length);
        const progress = Math.round((loaded / total) * 100);
        this.notify({
          huntId,
          progress,
          loaded,
          total,
          isComplete: loaded >= total,
          message: `Carregando recursos (${loaded}/${total})...`,
        });
      }

      this.completedHunts.add(huntId);
      this.activePreloadPromises.delete(huntId);

      this.notify({
        huntId,
        progress: 100,
        loaded: total,
        total,
        isComplete: true,
        message: `Cenário e criaturas 100% prontos!`,
      });

      return true;
    })();

    this.activePreloadPromises.set(huntId, promise);
    return promise;
  }
}

export const huntAssetPreloader = new HuntAssetPreloaderService();
