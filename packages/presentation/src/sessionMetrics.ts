export interface SessionCounters {
  kills: number;
  damageDealt: number;
  damageTaken: number;
}

export interface SessionMetrics extends SessionCounters {
  elapsedMs: number;
  xpGained: number;
  lootGained: number;
  roomsReached: number;
  xpPerHour: number;
  approximateDps: number;
}

export type ViewportMode = 'training' | 'hunt';

/** Presentation-only mode selection. It never mutates the session or encounter. */
export function resolveViewportMode(status: 'ready' | 'running' | 'completed' | 'defeated'): ViewportMode {
  return status === 'running' ? 'hunt' : 'training';
}

export function calculateSessionRates(
  counters: SessionCounters,
  values: Pick<SessionMetrics, 'elapsedMs' | 'xpGained' | 'lootGained' | 'roomsReached'>,
): SessionMetrics {
  const elapsedSeconds = values.elapsedMs / 1_000;
  return {
    ...counters,
    ...values,
    xpPerHour: elapsedSeconds > 0 ? Math.round(values.xpGained * 3_600 / elapsedSeconds) : 0,
    approximateDps: elapsedSeconds > 0 ? counters.damageDealt / elapsedSeconds : 0,
  };
}

export function formatSessionDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}
