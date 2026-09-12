import {
  CANONICAL_CYCLOPEDIA_ITEMS,
  CANONICAL_BESTIARY_MONSTERS,
  getCyclopediaItems,
  getBestiaryMonsters,
  type CyclopediaItem,
  type BestiaryMonster,
} from './cyclopediaData';

export interface BestiaryProgress {
  kills: number;
  killsNeeded: number;
  tier: 1 | 2 | 3 | 4;
  isUnlocked: boolean;
  percentage: number;
}

/**
 * Service encapsulating Cyclopedia catalog queries, caching, and bestiary calculations.
 */
export class CyclopediaService {
  private static itemsCache: CyclopediaItem[] | null = null;
  private static monstersCache: BestiaryMonster[] | null = null;

  /**
   * Warm up and return items catalog
   */
  public static getAllItems(): CyclopediaItem[] {
    if (!this.itemsCache) {
      this.itemsCache = getCyclopediaItems();
    }
    return this.itemsCache;
  }

  /**
   * Warm up and return monsters catalog
   */
  public static getAllMonsters(): BestiaryMonster[] {
    if (!this.monstersCache) {
      this.monstersCache = getBestiaryMonsters();
    }
    return this.monstersCache;
  }

  /**
   * Find item by numeric or string ID
   */
  public static getItemById(id: number | string): CyclopediaItem | undefined {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return this.getAllItems().find((it) => it.id === numId);
  }

  /**
   * Find monster by ID or name
   */
  public static getMonsterById(idOrName: string): BestiaryMonster | undefined {
    const query = idOrName.trim().toLowerCase();
    return this.getAllMonsters().find(
      (m) => m.id.toLowerCase() === query || m.name.toLowerCase() === query
    );
  }

  /**
   * Calculate bestiary progress and unlock tier for a given monster
   */
  public static getProgress(monsterId: string, killCount: number): BestiaryProgress {
    const monster = this.getMonsterById(monsterId);
    const needed = monster?.killsNeeded || 100;
    const kills = Math.max(0, killCount || 0);
    const pct = Math.min(100, Math.round((kills / needed) * 100));

    let tier: 1 | 2 | 3 | 4 = 1;
    if (kills >= needed) tier = 4;
    else if (kills >= needed * 0.5) tier = 3;
    else if (kills >= needed * 0.1) tier = 2;

    return {
      kills,
      killsNeeded: needed,
      tier,
      isUnlocked: kills >= needed,
      percentage: pct,
    };
  }
}
