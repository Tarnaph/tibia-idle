'use client';

import visualAssetsJson from '@/content/generated/tibia1098-combat-assets.json';
import { initialHunts } from '@/packages/domain/src';

export interface HuntPreloadProgress {
  huntId: string;
  progress: number; // 0 to 100
  loaded: number;
  total: number;
  isComplete: boolean;
  message: string;
}

export type HuntPreloadCallback = (progress: HuntPreloadProgress) => void;

// Mapeamento canônico estático de monstros por caçada para fallback e otimização imediata
export const HUNT_MONSTER_MAPPING: Record<string, string[]> = {
  'rat-cellars': ['rat', 'cave-rat'],
  'spider-burrow': ['spider', 'bug', 'poison-spider'],
  'troll-camp': ['troll', 'swamp-troll'],
  'old-crypt': ['skeleton'],
  'rotworm-cave': ['rotworm', 'carrion-worm'],
  'cyclops-camp': ['cyclops', 'cyclops-smith'],
  'elf-sanctuary': ['elf', 'elf-scout', 'elf-arcanist'],
  'dragon-lair': ['dragon', 'dragon-lord'],
  'corym-mine': ['corym-vanguard', 'corym-skirmisher', 'corym-charlatan'],
  'giant-spider-lair': ['giant-spider', 'tarantula'],
  'hero-cave': ['hero', 'renegade-knight', 'vicious-squire'],
  'hydra-lair': ['hydra', 'bog-raider'],
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
  private huntProgressMap = new Map<string, number>();

  public isHuntReady(huntId: string): boolean {
    return this.completedHunts.has(huntId);
  }

  public getHuntProgress(huntId: string): number {
    if (this.completedHunts.has(huntId)) return 100;
    return this.huntProgressMap.get(huntId) || 0;
  }

  /**
   * Resolve todos os monstros de qualquer hunt atual ou futura dinamicamente.
   * Consulta tanto o mapeamento canônico quanto o catálogo de `initialHunts` (inclusive bosses e ondas).
   */
  public getHuntMonsterIds(huntId: string): string[] {
    const list = new Set<string>();

    // 1. Mapeamento estático canônico
    const staticMonsters = HUNT_MONSTER_MAPPING[huntId] || [];
    for (const m of staticMonsters) {
      if (m) list.add(m);
    }

    // 2. Extração dinâmica de initialHunts para qualquer hunt presente ou futura
    const domainHunt = initialHunts.find((h) => h.id === huntId);
    if (domainHunt?.monsters) {
      for (const m of domainHunt.monsters) {
        if (m) list.add(m);
      }
    }
    if (domainHunt?.waves) {
      for (const w of domainHunt.waves) {
        if (w.monsterId) list.add(w.monsterId);
        if (w.boss?.baseMonsterId) list.add(w.boss.baseMonsterId);
      }
    }

    return Array.from(list);
  }

  /**
   * Compila a lista de todas as URLs essenciais de uma hunt:
   * Atlas do mapa, todas as sprites direcionais de caminhada dos monstros,
   * miniaturas, bestiário, corpos, outfits de vocações e efeitos de combate.
   */
  public getHuntEssentialAssetUrls(huntId: string): string[] {
    const urls = new Set<string>();
    const combatAssets = visualAssetsJson as any;

    // 1. Atlases
    urls.add(`/generated/atlases/hunt-${huntId}-atlas.png`);
    urls.add('/generated/atlases/combat-fx-atlas.png');

    // 2. Monstros: todos os frames direcionais reais (norte, sul, leste, oeste)
    const monsters = this.getHuntMonsterIds(huntId);
    const creatureAssets = combatAssets?.creatures || {};
    const corpseAssets = combatAssets?.corpses || {};

    for (const m of monsters) {
      const clean = m.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      urls.add(`/generated/bestiary/${clean}.png`);
      urls.add(`/generated/tibia1098/monster-${clean}-thumb.png`);

      // Procura mapeamento da criatura (pelo ID original ou sanitizado)
      const creatureMapping = creatureAssets[m] || creatureAssets[clean];
      if (creatureMapping?.frames && Array.isArray(creatureMapping.frames)) {
        for (const frame of creatureMapping.frames) {
          if (frame?.publicUrl) urls.add(frame.publicUrl);
        }
      }
      if (creatureMapping?.thumbUrl) {
        urls.add(creatureMapping.thumbUrl);
      }

      // Corpos da criatura
      const corpse = corpseAssets[m] || corpseAssets[clean];
      if (corpse?.frame?.publicUrl) urls.add(corpse.frame.publicUrl);
      if (corpse?.frames && Array.isArray(corpse.frames)) {
        for (const f of corpse.frames) {
          if (f?.publicUrl) urls.add(f.publicUrl);
        }
      }
    }

    // 3. Outfits essenciais das vocações do grupo
    const outfitAssets = combatAssets?.outfits || {};
    for (const voc of ['Knight', 'Paladin', 'Sorcerer', 'Druid', 'Sire']) {
      const out = outfitAssets[voc];
      if (out?.frames && Array.isArray(out.frames)) {
        for (const f of out.frames) {
          if (f?.publicUrl) urls.add(f.publicUrl);
        }
      }
    }

    // 4. Sprites utilitárias e itens de arena
    urls.add('/generated/mounts/donkey_rider_south.png');
    urls.add('/generated/tibia1098/items/item-5972.png');
    urls.add('/assets/items/item-3058.png');
    urls.add('/assets/items/item-3065.png');

    // 5. Efeitos e mísseis de combate essenciais do Tibia 10.98
    if (combatAssets?.effects) {
      for (const effId of ESSENTIAL_COMBAT_EFFECT_IDS) {
        const fx = combatAssets.effects[effId];
        if (fx?.frames && Array.isArray(fx.frames)) {
          for (const f of fx.frames) {
            if (f?.publicUrl) urls.add(f.publicUrl);
          }
        }
      }
    }

    if (combatAssets?.missiles) {
      for (const misId of ESSENTIAL_COMBAT_MISSILE_IDS) {
        const mis = combatAssets.missiles[misId];
        if (mis?.frames && Array.isArray(mis.frames)) {
          for (const f of mis.frames) {
            if (f?.publicUrl) urls.add(f.publicUrl);
          }
        }
      }
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
        // Não trava o loop se uma imagem pontual falhar
        resolve(false);
      };
      img.src = url;
    });
  }

  /**
   * Dispara o pré-carregamento autoritativo dos recursos da hunt ativa.
   * Garante o download prévio do atlas da hunt, sprites direcionais dos monstros e efeitos de combate.
   */
  public async preloadHunt(huntId: string): Promise<boolean> {
    if (this.completedHunts.has(huntId)) {
      this.huntProgressMap.set(huntId, 100);
      return true;
    }

    if (this.activePreloadPromises.has(huntId)) {
      return this.activePreloadPromises.get(huntId)!;
    }

    const promise = (async () => {
      // 1. Pré-aquecer JSON dos atlases para cache HTTP
      const atlasJsonUrl = `/generated/atlases/hunt-${huntId}-atlas.json`;
      if (typeof window !== 'undefined') {
        fetch(atlasJsonUrl, { cache: 'force-cache' }).catch(() => {});
        fetch('/generated/atlases/combat-fx-atlas.json', { cache: 'force-cache' }).catch(() => {});
      }

      // 2. Compilar todas as URLs essenciais
      const list = this.getHuntEssentialAssetUrls(huntId);
      const total = list.length;
      let loaded = 0;

      this.huntProgressMap.set(huntId, 0);
      this.notify({
        huntId,
        progress: 0,
        loaded: 0,
        total,
        isComplete: false,
        message: `Carregando monstros e cenário da masmorra...`,
      });

      // 3. Carregamento em lotes paralelos de 25
      const BATCH_SIZE = 25;
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const chunk = list.slice(i, i + BATCH_SIZE);
        await Promise.all(chunk.map((url) => this.preloadImage(url)));
        loaded = Math.min(total, loaded + chunk.length);
        const progress = Math.round((loaded / total) * 100);
        this.huntProgressMap.set(huntId, progress);
        this.notify({
          huntId,
          progress,
          loaded,
          total,
          isComplete: loaded >= total,
          message: `Carregando criaturas e efeitos (${loaded}/${total})...`,
        });
      }

      this.completedHunts.add(huntId);
      this.huntProgressMap.set(huntId, 100);
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

  public reset(): void {
    this.completedHunts.clear();
    this.activePreloadPromises.clear();
    this.huntProgressMap.clear();
  }
}

export const huntAssetPreloader = new HuntAssetPreloaderService();
