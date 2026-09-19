export type ErrorLogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface ClientLogEntry {
  id: string;
  timestamp: string;
  level: ErrorLogLevel;
  category: string;
  message: string;
  details?: any;
  stack?: string;
}

type LogListener = (entry: ClientLogEntry, allLogs: ClientLogEntry[]) => void;

class ClientErrorLogger {
  private logs: ClientLogEntry[] = [];
  private maxLogs = 300;
  private listeners: Set<LogListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  public initGlobalHandlers(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // Intercept unhandled runtime JavaScript errors
    window.addEventListener('error', (event) => {
      this.error(
        'RUNTIME_ERROR',
        event.message || 'Erro não tratado em runtime',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        event.error?.stack
      );
    });

    // Intercept unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = typeof reason === 'string'
        ? reason
        : reason?.message || 'Promise rejeitada sem tratamento';
      const stack = reason?.stack;

      this.error(
        'UNHANDLED_PROMISE',
        message,
        { reason: typeof reason === 'object' ? JSON.stringify(reason) : reason },
        stack
      );
    });

    this.info('SYSTEM', 'ClientErrorLogger inicializado com interceptores globais ativos.');
  }

  public log(level: ErrorLogLevel, category: string, message: string, details?: any, stack?: string): ClientLogEntry {
    const entry: ClientLogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      category: category.toUpperCase(),
      message,
      details,
      stack,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    if (level === 'ERROR' || level === 'WARN') {
      this.saveToStorage();
    }

    // Notify active UI listeners
    this.listeners.forEach((fn) => {
      try {
        fn(entry, this.logs);
      } catch {}
    });

    return entry;
  }

  public error(category: string, message: string, details?: any, stack?: string): ClientLogEntry {
    console.error(`[${category}] ${message}`, details || '', stack || '');
    return this.log('ERROR', category, message, details, stack);
  }

  public warn(category: string, message: string, details?: any): ClientLogEntry {
    console.warn(`[${category}] ${message}`, details || '');
    return this.log('WARN', category, message, details);
  }

  public info(category: string, message: string, details?: any): ClientLogEntry {
    return this.log('INFO', category, message, details);
  }

  public debug(category: string, message: string, details?: any): ClientLogEntry {
    return this.log('DEBUG', category, message, details);
  }

  public getLogs(): ClientLogEntry[] {
    return [...this.logs];
  }

  public getErrorCount(): number {
    return this.logs.filter((l) => l.level === 'ERROR').length;
  }

  public clear(): void {
    this.logs = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('exura_client_error_logs');
      } catch {}
    }
    this.listeners.forEach((fn) => {
      try {
        fn({
          id: 'cleared',
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          category: 'SYSTEM',
          message: 'Logs limpos.',
        }, []);
      } catch {}
    });
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public exportJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const errorsOnly = this.logs.filter((l) => l.level === 'ERROR' || l.level === 'WARN').slice(0, 50);
      localStorage.setItem('exura_client_error_logs', JSON.stringify(errorsOnly));
    } catch {}
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('exura_client_error_logs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(0, 100);
        }
      }
    } catch {}
  }
}

export const clientErrorLogger = new ClientErrorLogger();
