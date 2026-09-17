/**
 * SkillRateLimiter: Orçamento contínuo de evolução de habilidades e tentativas de treino (Token Bucket / Sliding Window)
 * 
 * Garante que mensagens ou requisições de salvamento (em caçadas, dummies ou na cidade) não
 * consigam avançar habilidades físicas ou nível mágico acima das tentativas de treino físicas
 * e temporais acumuladas no contexto de jogo, utilizando as fórmulas canônicas do Tibia / realmap11.
 */

export interface SkillBudgetEntry {
  lastSyncTime: number;
  availableBudget: number;
}

export interface SkillRateLimiterOptions {
  isHunting?: boolean;
}

export const SKILL_BASE_TRIES: Record<string, number> = {
  fist: 50,
  club: 50,
  sword: 50,
  axe: 50,
  distance: 30,
  shielding: 100,
};

export const VOCATION_SKILL_MULTIPLIERS: Record<string, Record<string, number>> = {
  knight: { fist: 1.1, club: 1.1, sword: 1.1, axe: 1.1, distance: 1.4, shielding: 1.1 },
  paladin: { fist: 1.2, club: 1.2, sword: 1.2, axe: 1.2, distance: 1.1, shielding: 1.1 },
  sorcerer: { fist: 1.5, club: 2.0, sword: 2.0, axe: 2.0, distance: 1.5, shielding: 1.5 },
  druid: { fist: 1.5, club: 2.0, sword: 2.0, axe: 2.0, distance: 1.5, shielding: 1.5 },
  none: { fist: 1.5, club: 2.0, sword: 2.0, axe: 2.0, distance: 2.0, shielding: 1.5 },
};

export const VOCATION_MANA_MULTIPLIERS: Record<string, number> = {
  sorcerer: 1.1,
  druid: 1.1,
  paladin: 1.4,
  knight: 3.0,
  none: 1.0,
};

/**
 * Retorna as tentativas canônicas necessárias para atingir o nível especificado de habilidade física.
 */
export function requiredSkillTriesForLevel(vocationName: string, skillKey: string, level: number): number {
  const voc = vocationName?.toLowerCase().replace('elite ', '').replace('master ', '').replace('elder ', '').replace('royal ', '') || 'none';
  const multipliers = VOCATION_SKILL_MULTIPLIERS[voc] || VOCATION_SKILL_MULTIPLIERS.none;
  const mult = multipliers[skillKey] ?? 1.5;
  const base = SKILL_BASE_TRIES[skillKey] ?? 50;
  return Math.floor(base * Math.pow(mult, Math.max(0, level - 11)));
}

/**
 * Retorna as tentativas (mana gasta) necessárias para atingir o nível mágico especificado.
 */
export function requiredMagicTriesForLevel(vocationName: string, magicLevel: number): number {
  if (magicLevel <= 0) return 0;
  const voc = vocationName?.toLowerCase().replace('elite ', '').replace('master ', '').replace('elder ', '').replace('royal ', '') || 'none';
  const manaMult = VOCATION_MANA_MULTIPLIERS[voc] ?? 1.1;
  return Math.floor(1600 * Math.pow(manaMult, magicLevel - 1));
}

/**
 * Normaliza o identificador ou nome da skill para a chave interna canônica.
 */
export function normalizeSkillKey(skillIdOrName: number | string): string {
  if (typeof skillIdOrName === 'number') {
    switch (skillIdOrName) {
      case 0: return 'fist';
      case 1: return 'club';
      case 2: return 'sword';
      case 3: return 'axe';
      case 4: return 'distance';
      case 5: return 'shielding';
      case 6: return 'fishing';
      case 7: return 'magicLevel';
      default: return 'sword';
    }
  }
  const s = String(skillIdOrName).toLowerCase();
  if (s.includes('fist')) return 'fist';
  if (s.includes('club')) return 'club';
  if (s.includes('sword')) return 'sword';
  if (s.includes('axe')) return 'axe';
  if (s.includes('dist')) return 'distance';
  if (s.includes('shield')) return 'shielding';
  if (s.includes('fish')) return 'fishing';
  if (s.includes('magic') || s === 'ml') return 'magicLevel';
  return 'sword';
}

/**
 * Calcula o custo total em tentativas (tries) para evoluir uma habilidade de um nível/tries antigo para um novo.
 */
export function calculateSkillTriesCost(
  vocationName: string,
  skillKey: string | number,
  prevLevel: number,
  prevTries: number,
  targetLevel: number,
  targetTries: number
): number {
  if (targetLevel < prevLevel) return 0; // perda de skill por morte: custo 0
  if (targetLevel === prevLevel) {
    return Math.max(0, targetTries - prevTries);
  }

  const normKey = normalizeSkillKey(skillKey);
  let totalRequiredTries = 0;

  for (let lvl = prevLevel + 1; lvl <= targetLevel; lvl++) {
    if (normKey === 'magicLevel') {
      totalRequiredTries += requiredMagicTriesForLevel(vocationName, lvl);
    } else {
      totalRequiredTries += requiredSkillTriesForLevel(vocationName, normKey, lvl);
    }
  }

  // Desconta o que já havia sido progredido e adiciona o resíduo do nível alvo
  const netTries = totalRequiredTries - prevTries + targetTries;
  return Math.max(0, netTries);
}

// Em caçada (combate ativo com arma, duplo bloqueio de escudo e rotação sustentada de magia com poções):
// - Arma: 1 hit a cada 2s com rateSkill 50 e stage 10x = 250 tries/segundo
// - Escudo: até 2 bloqueios de criaturas por segundo = 500 tries/segundo
// - Magia ofensiva (Flame Strike / Waves a cada 2s): ~15 mana/s * 25 rateMagic * 10 stage = 3.750 tries/segundo
// - Magia de cura / suporte (Exura / Exura Gran reativo a cada 1s): ~15 mana/s * 250 = 3.750 tries/segundo
// - Combos de buff (Haste / Utamo) sustentados com poções de mana contínuas: ~750 tries/segundo
// Taxa sustentada contínua calibrada para caçada com magia: 9.000 tentativas/segundo
export const HUNT_MAX_TRIES_PER_SECOND = 9_000;
// Capacidade de burst em caçada: acomoda até 25 segundos de combate ativo acumulado com atraso de rede (25s * 9.000 = 225.000)
export const HUNT_MAX_BURST_TRIES = 225_000;

// Fora de caçada / Urbano (dummy de treino público ou residencial em cidade):
// - Treino no dummy de arma física: 1 hit a cada 2s (250 tries/segundo)
// - Treino no dummy de escudo: 1 pulso a cada 4s (125 tries/segundo)
// - Treino combinado arma + escudo no dummy: 375 tries/segundo legítimos
// - Treino de Magic Level no dummy (Mage promovido): 2 mana a cada 2s = 250 tries/segundo
// Taxa sustentada urbana calibrada (com tolerância de jitter de tick de 500ms): 500 tentativas/segundo
export const NON_HUNT_MAX_TRIES_PER_SECOND = 500;
// Capacidade de burst urbano: acomoda até 50-60 segundos de treino contínuo no dummy sem salvamento
export const NON_HUNT_MAX_BURST_TRIES = 25_000;

export class SkillRateLimiter {
  private static trackers = new Map<string, SkillBudgetEntry>();

  public static getOrCreate(
    characterId: string,
    now: number = Date.now(),
    initialBudget: number = HUNT_MAX_BURST_TRIES
  ): SkillBudgetEntry {
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
   * Estorna orçamento caso a persistência falhe (ex: OCC 409).
   */
  public static refund(
    characterId: string,
    amount: number,
    now: number = Date.now(),
    options?: SkillRateLimiterOptions
  ): void {
    if (!characterId || amount <= 0) return;
    const isHunting = options?.isHunting !== false;
    const maxBurst = isHunting ? HUNT_MAX_BURST_TRIES : NON_HUNT_MAX_BURST_TRIES;

    const entry = this.getOrCreate(characterId, now, maxBurst);
    entry.availableBudget = Math.min(maxBurst, entry.availableBudget + amount);
  }

  /**
   * Valida e consome o orçamento contínuo de tentativas de treino.
   * Requisições repetidas em curto intervalo NÃO renovam o orçamento;
   * cada requisição apenas adiciona elapsedSeconds * rate ao que resta no bucket.
   */
  public static consume(
    characterId: string,
    totalTries: number,
    now: number = Date.now(),
    options?: SkillRateLimiterOptions
  ): { allowed: boolean; maxAllowed: number; currentBudget: number } {
    const isHunting = options?.isHunting !== false;
    const rate = isHunting ? HUNT_MAX_TRIES_PER_SECOND : NON_HUNT_MAX_TRIES_PER_SECOND;
    const maxBurst = isHunting ? HUNT_MAX_BURST_TRIES : NON_HUNT_MAX_BURST_TRIES;

    if (totalTries <= 0) {
      return { allowed: true, maxAllowed: 0, currentBudget: maxBurst };
    }

    const entry = this.getOrCreate(characterId, now, maxBurst);
    const elapsedSeconds = Math.max(0, (now - entry.lastSyncTime) / 1000);

    // Reabastece o bucket proporcionalmente ao tempo real decorrido respeitando o teto de burst
    entry.availableBudget = Math.min(maxBurst, entry.availableBudget + elapsedSeconds * rate);
    entry.lastSyncTime = now;

    if (totalTries <= entry.availableBudget) {
      entry.availableBudget -= totalTries;
      return { allowed: true, maxAllowed: totalTries, currentBudget: entry.availableBudget };
    }

    const maxAllowed = Math.floor(entry.availableBudget);
    return { allowed: false, maxAllowed, currentBudget: entry.availableBudget };
  }

  public static reset(characterId: string): void {
    this.trackers.delete(characterId);
  }

  public static resetAll(): void {
    this.trackers.clear();
  }

  public static getActiveTrackerCount(): number {
    return this.trackers.size;
  }
}
