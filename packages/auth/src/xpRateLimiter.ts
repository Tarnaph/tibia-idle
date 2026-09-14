/**
 * XpRateLimiter: Orçamento contínuo de experiência (Token Bucket / Sliding Window)
 * Garante que mensagens ou requisições de salvamento em alta frequência não consigam
 * acumular XP acima da taxa física permitida pela caçada/tempo decorrido.
 */

export interface XpBudgetEntry {
  lastSyncTime: number;
  availableBudget: number;
}

export interface XpRateLimiterOptions {
  isHunting?: boolean;
}

// Taxa máxima durante caçadas ativas: 5.000 XP/segundo (~18 milhões de XP por hora)
export const MAX_EXP_PER_SECOND = 5_000;
// Capacidade do bucket para absorver morte simultânea de packs de monstros ou bosses
export const MAX_BURST_EXP = 30_000;

// Taxa máxima fora de caçada (em cidades, treino ou idle): 100 XP/segundo
export const NON_HUNT_MAX_EXP_PER_SECOND = 100;
// Burst reduzido fora de caçada
export const NON_HUNT_MAX_BURST_EXP = 2_000;

export class XpRateLimiter {
  private static trackers = new Map<string, XpBudgetEntry>();

  public static getOrCreate(
    characterId: string,
    now: number = Date.now(),
    initialBudget: number = MAX_BURST_EXP
  ): XpBudgetEntry {
    let entry = this.trackers.get(characterId);
    if (!entry) {
      entry = {
        lastSyncTime: now,
        availableBudget: initialBudget,
      };
      this.trackers.set(characterId, entry);
    }
    return entry;
  }

  /**
   * Valida se um delta de XP é permitido de acordo com o orçamento acumulado no tempo e contexto de caçada.
   * Não possui piso fixo por mensagem: mensagens consecutivas a cada 100ms
   * ganham apenas o orçamento proporcional aos 100ms decorridos (0.1s * rate).
   */
  public static consume(
    characterId: string,
    deltaExp: number,
    now: number = Date.now(),
    options?: XpRateLimiterOptions
  ): { allowed: boolean; maxAllowed: number; currentBudget: number } {
    const isHunting = options?.isHunting !== false;
    const rate = isHunting ? MAX_EXP_PER_SECOND : NON_HUNT_MAX_EXP_PER_SECOND;
    const maxBurst = isHunting ? MAX_BURST_EXP : NON_HUNT_MAX_BURST_EXP;

    if (deltaExp <= 0) {
      return { allowed: true, maxAllowed: 0, currentBudget: maxBurst };
    }

    const entry = this.getOrCreate(characterId, now, maxBurst);
    const elapsedSeconds = Math.max(0, (now - entry.lastSyncTime) / 1000);

    // Reabastece o bucket proporcionalmente ao tempo real decorrido respeitando o teto de burst do contexto
    entry.availableBudget = Math.min(maxBurst, entry.availableBudget + elapsedSeconds * rate);
    entry.lastSyncTime = now;

    if (deltaExp <= entry.availableBudget) {
      entry.availableBudget -= deltaExp;
      return { allowed: true, maxAllowed: deltaExp, currentBudget: entry.availableBudget };
    }

    // Se excedeu o orçamento acumulado, informa o máximo permitido no momento sem conceder o excedente
    const maxAllowed = Math.floor(entry.availableBudget);
    return { allowed: false, maxAllowed, currentBudget: entry.availableBudget };
  }

  public static reset(characterId: string) {
    this.trackers.delete(characterId);
  }

  public static getActiveTrackerCount(): number {
    return this.trackers.size;
  }
}
