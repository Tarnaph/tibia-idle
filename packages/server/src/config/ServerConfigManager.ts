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

const defaultConfig: ServerConfig = {
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

class ServerConfigManagerClass {
  private config: ServerConfig = { ...defaultConfig };
  private listeners: Array<(config: ServerConfig) => void> = [];

  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<ServerConfig>): ServerConfig {
    this.config = {
      ...this.config,
      ...partial,
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

    this.listeners.forEach((fn) => fn(this.getConfig()));
    return this.getConfig();
  }

  public resetToDefaults(): ServerConfig {
    this.config = { ...defaultConfig };
    this.listeners.forEach((fn) => fn(this.getConfig()));
    return this.getConfig();
  }

  public onChange(listener: (config: ServerConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const serverConfigManager = new ServerConfigManagerClass();
