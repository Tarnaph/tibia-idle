/**
 * progressionDiagnostics.ts
 * Telemetria e diagnóstico correlacionado para ciclo de caçada, XP, nível, loot, ouro,
 * salvamentos e reconciliação de concorrência (Phase 182 - Bloco A).
 */

export interface ProgressionLogEntry {
  timestamp: number;
  type: 'kill' | 'loot' | 'level-up' | 'save-attempt' | 'save-success' | 'save-conflict' | 'save-error' | 'reconcile';
  details: Record<string, any>;
}

class ProgressionDiagnostics {
  private logs: ProgressionLogEntry[] = [];
  private maxLogs = 200;

  private addLog(type: ProgressionLogEntry['type'], details: Record<string, any>) {
    const entry: ProgressionLogEntry = {
      timestamp: Date.now(),
      type,
      details,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    // Debug log to console in development or when requested
    if (typeof window !== 'undefined' && (window as any).__DEBUG_PROGRESSION__) {
      console.log(`[ProgressionDiag][${type}]`, details);
    }
  }

  recordKill(monsterId: string, monsterName: string, expGained: number, characterLevel: number, characterExp: number) {
    this.addLog('kill', { monsterId, monsterName, expGained, characterLevel, characterExp });
  }

  recordLoot(itemName: string, amount: number, totalGold: number, totalLootCount: number) {
    this.addLog('loot', { itemName, amount, totalGold, totalLootCount });
  }

  recordLevelUp(previousLevel: number, newLevel: number, totalExp: number) {
    this.addLog('level-up', { previousLevel, newLevel, totalExp });
  }

  recordSaveAttempt(attemptId: string, characterId: string, saveVersion: number, level: number, exp: number, gold: number, isHunting: boolean) {
    this.addLog('save-attempt', { attemptId, characterId, saveVersion, level, exp, gold, isHunting });
  }

  recordSaveSuccess(attemptId: string, saveVersion: number, responseStatus: number) {
    this.addLog('save-success', { attemptId, saveVersion, responseStatus });
  }

  recordSaveConflict(attemptId: string, requestedVersion: number, serverVersion: number, serverLevel: number, serverExp: number) {
    this.addLog('save-conflict', { attemptId, requestedVersion, serverVersion, serverLevel, serverExp });
  }

  recordSaveError(attemptId: string, status: number, error: string) {
    this.addLog('save-error', { attemptId, status, error });
  }

  recordReconciliation(
    characterId: string,
    previousVersion: number,
    reconciledVersion: number,
    levelBefore: number,
    levelAfter: number,
    expBefore: number,
    expAfter: number,
    goldBefore: number,
    goldAfter: number
  ) {
    this.addLog('reconcile', {
      characterId,
      previousVersion,
      reconciledVersion,
      levelBefore,
      levelAfter,
      expBefore,
      expAfter,
      goldBefore,
      goldAfter,
    });
  }

  getRecentLogs(limit = 50): ProgressionLogEntry[] {
    return this.logs.slice(-limit);
  }

  clear() {
    this.logs = [];
  }
}

export const progressionDiagnostics = new ProgressionDiagnostics();
if (typeof window !== 'undefined') {
  (window as any).progressionDiagnostics = progressionDiagnostics;
}
