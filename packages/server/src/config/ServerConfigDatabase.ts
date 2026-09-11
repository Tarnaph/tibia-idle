import { prisma as defaultPrisma } from '../../../database/src';
import { serverConfigManager, type ServerConfig, defaultConfig } from './ServerConfigManager';

/**
 * Loads the persisted server configuration from Prisma database.
 */
export async function loadServerConfigFromDatabase(customPrisma?: any): Promise<Partial<ServerConfig> | null> {
  const db = customPrisma || defaultPrisma;
  if (!db || typeof db.serverConfigRecord?.findUnique !== 'function') {
    return null;
  }

  try {
    const record = await db.serverConfigRecord.findUnique({
      where: { id: 'default' },
    });
    return record || null;
  } catch (err) {
    console.warn('[ServerConfigDatabase] Falha ao carregar do banco:', err);
    return null;
  }
}

/**
 * Saves the server configuration to Prisma database.
 */
export async function saveServerConfigToDatabase(config: ServerConfig, customPrisma?: any): Promise<void> {
  const db = customPrisma || defaultPrisma;
  if (!db || typeof db.serverConfigRecord?.upsert !== 'function') {
    return;
  }

  try {
    await db.serverConfigRecord.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        expRate: config.expRate,
        lootRate: config.lootRate,
        skillRate: config.skillRate,
        regenRate: config.regenRate,
        maxClientsPerRoom: config.maxClientsPerRoom,
        periodicSaveIntervalMs: config.periodicSaveIntervalMs,
        allowReconnectionSec: config.allowReconnectionSec,
        localChatRadius: config.localChatRadius,
        yellChatRadius: config.yellChatRadius,
        deathPenaltyExpPercent: config.deathPenaltyExpPercent,
        deathPenaltySkillPercent: config.deathPenaltySkillPercent,
        deathPenaltyLoseLoot: config.deathPenaltyLoseLoot,
      },
      update: {
        expRate: config.expRate,
        lootRate: config.lootRate,
        skillRate: config.skillRate,
        regenRate: config.regenRate,
        maxClientsPerRoom: config.maxClientsPerRoom,
        periodicSaveIntervalMs: config.periodicSaveIntervalMs,
        allowReconnectionSec: config.allowReconnectionSec,
        localChatRadius: config.localChatRadius,
        yellChatRadius: config.yellChatRadius,
        deathPenaltyExpPercent: config.deathPenaltyExpPercent,
        deathPenaltySkillPercent: config.deathPenaltySkillPercent,
        deathPenaltyLoseLoot: config.deathPenaltyLoseLoot,
      },
    });
  } catch (err) {
    console.warn('[ServerConfigDatabase] Falha ao persistir no banco:', err);
  }
}

/**
 * Synchronizes ServerConfigManager with the database: loads saved configuration
 * if present, or seeds initial defaults if database is empty.
 */
export async function syncServerConfigWithDatabase(
  manager = serverConfigManager,
  customPrisma?: any
): Promise<ServerConfig> {
  const dbRecord = await loadServerConfigFromDatabase(customPrisma);
  if (dbRecord) {
    manager.updateConfig(dbRecord);
  } else {
    await saveServerConfigToDatabase(manager.getConfig(), customPrisma);
  }
  return manager.getConfig();
}

/**
 * Attaches the database persistence hook to ServerConfigManager for automatic saving and loading.
 */
export function attachDatabasePersistence(manager = serverConfigManager, customPrisma?: any): void {
  manager.setSaveHook(async (cfg) => {
    await saveServerConfigToDatabase(cfg, customPrisma);
  });
  manager.setLoadHook(async (overridePrisma?: any) => {
    return await loadServerConfigFromDatabase(overridePrisma || customPrisma);
  });
}

// Auto-attach on server side module execution
if (typeof window === 'undefined') {
  attachDatabasePersistence(serverConfigManager);
}
