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
  baselineTime?: number;
}

// Taxa máxima durante caçadas ativas com stages altos (até 80x * 1.5 stamina verde = 120x)
export const MAX_EXP_PER_SECOND = 600_000;
// Capacidade do bucket para absorver morte simultânea de packs de monstros ou bosses com stages
export const MAX_BURST_EXP = 1_800_000;

// Taxa máxima fora de caçada (em cidades, treino ou idle): 2.000 XP/segundo
export const NON_HUNT_MAX_EXP_PER_SECOND = 2_000;
// Burst fora de caçada (100.000 XP para absorver transições de caçadas, quests e mortes com stages)
export const NON_HUNT_MAX_BURST_EXP = 100_000;

export class XpRateLimiter {
  private static trackers = new Map<string, XpBudgetEntry>();
  private static authorizedExp = new Map<string, number>();

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
   * Registra a experiência máxima que já foi autorizada e consumida na sessão ativa
   * (por exemplo, via WebSocket player:syncProgress), evitando que a camada de persistência
   * cobre uma segunda vez o mesmo ganho ao gravar no banco.
   */
  public static recordAuthorizedExp(characterId: string, exp: number): void {
    if (!characterId) return;
    const current = this.authorizedExp.get(characterId) || 0;
    if (exp > current) {
      this.authorizedExp.set(characterId, exp);
    }
  }

  public static getAuthorizedExp(characterId: string): number {
    if (!characterId) return 0;
    return this.authorizedExp.get(characterId) || 0;
  }

  public static clearAuthorizedExp(characterId: string): void {
    if (!characterId) return;
    this.authorizedExp.delete(characterId);
  }

  /**
   * Reverte (estorna) orçamento de XP debitado caso uma transação ou salvamento
   * falhe (ex: colisão de versão HTTP 409 ou erro de banco de dados).
   */
  public static refund(
    characterId: string,
    amount: number,
    now: number = Date.now(),
    options?: XpRateLimiterOptions
  ): void {
    if (!characterId || amount <= 0) return;
    const isHunting = options?.isHunting !== false;
    const maxBurst = isHunting ? MAX_BURST_EXP : NON_HUNT_MAX_BURST_EXP;

    const entry = this.getOrCreate(characterId, now, maxBurst);
    entry.availableBudget = Math.min(maxBurst, entry.availableBudget + amount);
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
    let candidateBudget = entry.availableBudget + elapsedSeconds * rate;

    // Se baselineTime for informado (ex: lastSavedAt do registro do banco),
    // o teto acomoda o tempo decorrido desde o último salvamento com sucesso
    if (typeof options?.baselineTime === 'number' && options.baselineTime > 0 && options.baselineTime <= now) {
      const elapsedSinceBaseline = Math.max(0, (now - options.baselineTime) / 1000);
      const baselineBudget = maxBurst + elapsedSinceBaseline * rate;
      candidateBudget = Math.min(baselineBudget, Math.max(candidateBudget, baselineBudget));
    } else {
      candidateBudget = Math.min(maxBurst, candidateBudget);
    }

    if (deltaExp <= candidateBudget) {
      entry.availableBudget = candidateBudget - deltaExp;
      entry.lastSyncTime = now;
      return { allowed: true, maxAllowed: deltaExp, currentBudget: entry.availableBudget };
    }

    // Se excedeu o orçamento acumulado, preserva o timestamp anterior
    const maxAllowed = Math.floor(candidateBudget);
    return { allowed: false, maxAllowed, currentBudget: candidateBudget };
  }

  public static reset(characterId: string) {
    this.trackers.delete(characterId);
    this.authorizedExp.delete(characterId);
  }

  public static resetAll(): void {
    this.trackers.clear();
    this.authorizedExp.clear();
  }

  public static getActiveTrackerCount(): number {
    return this.trackers.size;
  }
}
