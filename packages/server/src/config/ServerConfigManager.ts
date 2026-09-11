export interface ServerConfig {
  expRate: number;
  lootRate: number;
  skillRate: number;
  regenRate: number;
  maxClientsPerRoom: number;
  periodicSaveIntervalMs: number;
  allowReconnectionSec: number;
  localChatRadius: number;
  yellChatRadius: number;
  deathPenaltyExpPercent: number;
  deathPenaltySkillPercent: number;
  deathPenaltyLoseLoot: boolean;
}

export const defaultConfig: ServerConfig = {
  expRate: 1.0,
  lootRate: 1.0,
  skillRate: 1.0,
  regenRate: 1.0,
  maxClientsPerRoom: 100,
  periodicSaveIntervalMs: 20000,
  allowReconnectionSec: 20,
  localChatRadius: 8,
  yellChatRadius: 30,
  deathPenaltyExpPercent: 10,
  deathPenaltySkillPercent: 10,
  deathPenaltyLoseLoot: true,
};

let fsModule: any = null;
let pathModule: any = null;

function getNodeModules() {
  if (typeof window === 'undefined') {
    if (!fsModule) {
      try {
        if (typeof require !== 'undefined') {
          fsModule = require('fs');
          pathModule = require('path');
        }
      } catch {}
    }
  }
  return { fs: fsModule, path: pathModule };
}

function getConfigFilePath(): string | null {
  const { fs, path } = getNodeModules();
  if (!fs || !path) return null;

  try {
    const candidates = [
      path.join(process.cwd(), 'content', 'server-config.json'),
      path.resolve(__dirname, '../../../../content/server-config.json'),
      path.resolve(__dirname, '../../../content/server-config.json'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  } catch {
    return null;
  }
}

class ServerConfigManagerClass {
  private config: ServerConfig = { ...defaultConfig };
  private listeners: Array<(config: ServerConfig) => void> = [];
  private lastFileMtime: number = 0;
  private lastStatCheckTime: number = 0;
  private onSaveHook?: (config: ServerConfig) => Promise<void>;
  private onLoadHook?: (customPrisma?: any) => Promise<Partial<ServerConfig> | null>;

  constructor() {
    this.loadFromFile();
  }

  /**
   * Sets a persistent save hook (e.g. database saver on the server side)
   */
  public setSaveHook(hook: (config: ServerConfig) => Promise<void>): void {
    this.onSaveHook = hook;
  }

  /**
   * Sets a persistent load hook (e.g. database loader on the server side)
   */
  public setLoadHook(hook: (customPrisma?: any) => Promise<Partial<ServerConfig> | null>): void {
    this.onLoadHook = hook;
  }

  /**
   * Asynchronously loads configuration from persistent storage (database) via hook,
   * falls back to local file or current memory.
   */
  public async loadFromDatabase(customPrisma?: any): Promise<ServerConfig> {
    if (this.onLoadHook) {
      try {
        const record = await this.onLoadHook(customPrisma);
        if (record) {
          this.applyPartialToMemory(record);
          this.saveToFile();
          this.notifyListeners();
          return this.getConfig();
        }
      } catch (err) {
        console.warn('[ServerConfigManager] Falha ao executar onLoadHook:', err);
      }
    }
    this.loadFromFile();
    return this.getConfig();
  }

  /**
   * Synchronously reads config from content/server-config.json if present on disk
   */
  public loadFromFile(): boolean {
    const { fs } = getNodeModules();
    const filePath = getConfigFilePath();
    if (!fs || !filePath) return false;

    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        this.lastFileMtime = stat.mtimeMs;
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.applyPartialToMemory(parsed);
        return true;
      }
    } catch (err) {
      console.warn('[ServerConfigManager] Falha ao ler cache local de config:', err);
    }
    return false;
  }

  /**
   * Synchronously writes current config to content/server-config.json
   */
  public saveToFile(): boolean {
    const { fs, path } = getNodeModules();
    const filePath = getConfigFilePath();
    if (!fs || !path || !filePath) return false;

    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2), 'utf8');
      const stat = fs.statSync(filePath);
      this.lastFileMtime = stat.mtimeMs;
      return true;
    } catch (err) {
      console.warn('[ServerConfigManager] Falha ao salvar arquivo de config:', err);
      return false;
    }
  }

  private applyPartialToMemory(partial: Partial<ServerConfig>): void {
    this.config = {
      ...this.config,
      expRate: typeof partial.expRate === 'number' && partial.expRate > 0 ? partial.expRate : this.config.expRate,
      lootRate: typeof partial.lootRate === 'number' && partial.lootRate > 0 ? partial.lootRate : this.config.lootRate,
      skillRate: typeof partial.skillRate === 'number' && partial.skillRate > 0 ? partial.skillRate : this.config.skillRate,
      regenRate: typeof partial.regenRate === 'number' && partial.regenRate > 0 ? partial.regenRate : this.config.regenRate,
      maxClientsPerRoom: typeof partial.maxClientsPerRoom === 'number' && partial.maxClientsPerRoom > 0 ? Math.floor(partial.maxClientsPerRoom) : this.config.maxClientsPerRoom,
      periodicSaveIntervalMs: typeof partial.periodicSaveIntervalMs === 'number' && partial.periodicSaveIntervalMs >= 1000 ? Math.floor(partial.periodicSaveIntervalMs) : this.config.periodicSaveIntervalMs,
      allowReconnectionSec: typeof partial.allowReconnectionSec === 'number' && partial.allowReconnectionSec >= 0 ? Math.floor(partial.allowReconnectionSec) : this.config.allowReconnectionSec,
      localChatRadius: typeof partial.localChatRadius === 'number' && partial.localChatRadius > 0 ? Math.floor(partial.localChatRadius) : this.config.localChatRadius,
      yellChatRadius: typeof partial.yellChatRadius === 'number' && partial.yellChatRadius > 0 ? Math.floor(partial.yellChatRadius) : this.config.yellChatRadius,
      deathPenaltyExpPercent: typeof partial.deathPenaltyExpPercent === 'number' && partial.deathPenaltyExpPercent >= 0 ? Math.min(100, partial.deathPenaltyExpPercent) : this.config.deathPenaltyExpPercent,
      deathPenaltySkillPercent: typeof partial.deathPenaltySkillPercent === 'number' && partial.deathPenaltySkillPercent >= 0 ? Math.min(100, partial.deathPenaltySkillPercent) : this.config.deathPenaltySkillPercent,
      deathPenaltyLoseLoot: typeof partial.deathPenaltyLoseLoot === 'boolean' ? partial.deathPenaltyLoseLoot : this.config.deathPenaltyLoseLoot,
    };
  }

  /**
   * Retrieves active server configuration, checking for cross-process file updates
   */
  public getConfig(): ServerConfig {
    if (typeof window === 'undefined' && !process.env.VITEST) {
      const now = Date.now();
      if (now - this.lastStatCheckTime > 2000) {
        this.lastStatCheckTime = now;
        const { fs } = getNodeModules();
        const filePath = getConfigFilePath();
        if (fs && filePath && fs.existsSync(filePath)) {
          try {
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs > this.lastFileMtime) {
              this.lastFileMtime = stat.mtimeMs;
              const raw = fs.readFileSync(filePath, 'utf8');
              const parsed = JSON.parse(raw);
              this.applyPartialToMemory(parsed);
              this.notifyListeners();
            }
          } catch {}
        }
      }
    }
    return { ...this.config };
  }

  /**
   * Updates server configuration in memory and persists to file
   */
  public updateConfig(partial: Partial<ServerConfig>): ServerConfig {
    this.applyPartialToMemory(partial);
    this.saveToFile();
    if (this.onSaveHook) {
      void this.onSaveHook(this.getConfig());
    }
    this.notifyListeners();
    return this.getConfig();
  }

  /**
   * Asynchronously updates server configuration with full completion guarantee
   */
  public async saveConfig(partial: Partial<ServerConfig>): Promise<ServerConfig> {
    this.applyPartialToMemory(partial);
    this.saveToFile();
    if (this.onSaveHook) {
      await this.onSaveHook(this.getConfig());
    }
    this.notifyListeners();
    return this.getConfig();
  }

  public resetToDefaults(): ServerConfig {
    this.config = { ...defaultConfig };
    this.saveToFile();
    if (this.onSaveHook) {
      void this.onSaveHook(this.getConfig());
    }
    this.notifyListeners();
    return this.getConfig();
  }

  public async resetToDefaultsAsync(): Promise<ServerConfig> {
    this.config = { ...defaultConfig };
    this.saveToFile();
    if (this.onSaveHook) {
      await this.onSaveHook(this.getConfig());
    }
    this.notifyListeners();
    return this.getConfig();
  }

  private notifyListeners(): void {
    const current = { ...this.config };
    this.listeners.forEach((fn) => {
      try {
        fn(current);
      } catch (err) {
        console.error('[ServerConfigManager] Erro no listener de config:', err);
      }
    });
  }

  public onChange(listener: (config: ServerConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const serverConfigManager = new ServerConfigManagerClass();
