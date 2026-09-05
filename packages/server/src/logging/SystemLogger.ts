export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'GM_ACTION';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
}

class SystemLoggerClass {
  private logs: LogEntry[] = [];
  private maxLogs = 500;

  constructor() {
    this.info('SYSTEM', 'SystemLogger inicializado com sucesso.');
  }

  public log(level: LogLevel, category: string, message: string, details?: any): LogEntry {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    return entry;
  }

  public info(category: string, message: string, details?: any): LogEntry {
    return this.log('INFO', category, message, details);
  }

  public warn(category: string, message: string, details?: any): LogEntry {
    return this.log('WARN', category, message, details);
  }

  public error(category: string, message: string, details?: any): LogEntry {
    return this.log('ERROR', category, message, details);
  }

  public gmAction(adminName: string, action: string, details?: any): LogEntry {
    return this.log('GM_ACTION', 'GM_TOOLS', `GM [${adminName}]: ${action}`, details);
  }

  public getLogs(filter?: { level?: LogLevel; category?: string; query?: string }): LogEntry[] {
    let result = [...this.logs];

    if (filter?.level) {
      result = result.filter((l) => l.level === filter.level);
    }
    if (filter?.category) {
      result = result.filter((l) => l.category.toLowerCase().includes(filter.category!.toLowerCase()));
    }
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
      );
    }

    return result;
  }

  public clearLogs(): void {
    this.logs = [];
    this.info('SYSTEM', 'Logs limpos pelo administrador.');
  }
}

export const systemLogger = new SystemLoggerClass();
