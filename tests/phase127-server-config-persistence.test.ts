import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { serverConfigManager, defaultConfig, type ServerConfig } from '../packages/server/src/config/ServerConfigManager';
import '../packages/server/src/config/ServerConfigDatabase';
import { prisma } from '../packages/database/src';

describe('Phase 127: Permanent Persistence for Admin Server Variables and Rates', () => {
  const configFilePath = path.join(process.cwd(), 'content', 'server-config.json');
  let originalFileBackup: string | null = null;
  let originalDbBackup: any = null;

  beforeEach(async () => {
    // Backup existing file if present
    if (fs.existsSync(configFilePath)) {
      originalFileBackup = fs.readFileSync(configFilePath, 'utf8');
    }

    // Backup existing DB record
    try {
      if (prisma && typeof prisma.serverConfigRecord?.findUnique === 'function') {
        originalDbBackup = await prisma.serverConfigRecord.findUnique({ where: { id: 'default' } });
      }
    } catch {}
  });

  afterAll(async () => {
    // Restore backups
    if (originalFileBackup !== null) {
      fs.writeFileSync(configFilePath, originalFileBackup, 'utf8');
    } else if (fs.existsSync(configFilePath)) {
      try {
        fs.unlinkSync(configFilePath);
      } catch {}
    }

    try {
      if (originalDbBackup && prisma) {
        await prisma.serverConfigRecord.upsert({
          where: { id: 'default' },
          create: originalDbBackup,
          update: originalDbBackup,
        });
      }
    } catch {}

    serverConfigManager.resetToDefaults();
  });

  it('1. verifies that updating server config writes to content/server-config.json file', async () => {
    const testRates: Partial<ServerConfig> = {
      expRate: 3.5,
      lootRate: 2.5,
      skillRate: 4.0,
      regenRate: 2.0,
    };

    serverConfigManager.updateConfig(testRates);

    expect(fs.existsSync(configFilePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));

    expect(content.expRate).toBe(3.5);
    expect(content.lootRate).toBe(2.5);
    expect(content.skillRate).toBe(4.0);
    expect(content.regenRate).toBe(2.0);
  });

  it('2. verifies that saveConfig persists to Prisma ServerConfigRecord in the database', async () => {
    const customConfig: Partial<ServerConfig> = {
      expRate: 5.0,
      lootRate: 3.0,
      skillRate: 2.5,
      maxClientsPerRoom: 250,
      periodicSaveIntervalMs: 15000,
      deathPenaltyExpPercent: 12,
      deathPenaltyLoseLoot: false,
    };

    await serverConfigManager.saveConfig(customConfig);

    const dbRecord = await prisma.serverConfigRecord.findUnique({
      where: { id: 'default' },
    });

    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.expRate).toBe(5.0);
    expect(dbRecord?.lootRate).toBe(3.0);
    expect(dbRecord?.skillRate).toBe(2.5);
    expect(dbRecord?.maxClientsPerRoom).toBe(250);
    expect(dbRecord?.periodicSaveIntervalMs).toBe(15000);
    expect(dbRecord?.deathPenaltyExpPercent).toBe(12);
    expect(dbRecord?.deathPenaltyLoseLoot).toBe(false);
  });

  it('3. verifies that serverConfig restores saved configuration after simulated server restart', async () => {
    // Write explicit test rates to file and database
    const savedConfig: Partial<ServerConfig> = {
      expRate: 7.5,
      lootRate: 4.0,
      skillRate: 5.0,
      allowReconnectionSec: 45,
    };

    await serverConfigManager.saveConfig(savedConfig);

    // Simulate new process reading the file
    expect(fs.existsSync(configFilePath)).toBe(true);
    const reloadedFromFile = serverConfigManager.loadFromFile();
    expect(reloadedFromFile).toBe(true);

    const activeConfig = serverConfigManager.getConfig();
    expect(activeConfig.expRate).toBe(7.5);
    expect(activeConfig.lootRate).toBe(4.0);
    expect(activeConfig.skillRate).toBe(5.0);
    expect(activeConfig.allowReconnectionSec).toBe(45);
  });

  it('4. verifies that loadFromDatabase restores values even if local file is missing', async () => {
    // Save to DB
    await serverConfigManager.saveConfig({
      expRate: 6.0,
      lootRate: 3.5,
    });
    await new Promise((r) => setTimeout(r, 30));

    // Delete local file temporarily
    if (fs.existsSync(configFilePath)) {
      fs.unlinkSync(configFilePath);
    }

    // Reset memory to defaults
    serverConfigManager.resetToDefaults();
    expect(serverConfigManager.getConfig().expRate).toBe(defaultConfig.expRate);

    // Load from DB
    await serverConfigManager.loadFromDatabase();
    const restored = serverConfigManager.getConfig();
    expect(restored.expRate).toBe(6.0);
    expect(restored.lootRate).toBe(3.5);

    // Verifies local file was recreated from DB
    expect(fs.existsSync(configFilePath)).toBe(true);
  });

  it('5. verifies that admin config route calls saveConfig and persists changes', () => {
    const routePath = path.resolve(__dirname, '../app/api/admin/config/route.ts');
    const content = fs.readFileSync(routePath, 'utf8');

    expect(content).toContain('serverConfigManager.saveConfig');
    expect(content).toContain('serverConfigManager.loadFromDatabase');
  });

  it('6. verifies that ThaisCityRoom loads persisted server config on startup and applies it', () => {
    const roomPath = path.resolve(__dirname, '../packages/server/src/rooms/ThaisCityRoom.ts');
    const content = fs.readFileSync(roomPath, 'utf8');

    expect(content).toContain('serverConfigManager.loadFromDatabase()');
    expect(content).toContain("serverConfigManager.onChange");
  });

  it('7. verifies that resetToDefaults properly resets and persists default rates', async () => {
    await serverConfigManager.saveConfig({ expRate: 9.0 });
    expect(serverConfigManager.getConfig().expRate).toBe(9.0);

    await serverConfigManager.resetToDefaultsAsync();
    expect(serverConfigManager.getConfig().expRate).toBe(defaultConfig.expRate);

    // Check DB updated
    const dbRecord = await prisma.serverConfigRecord.findUnique({ where: { id: 'default' } });
    expect(dbRecord?.expRate).toBe(defaultConfig.expRate);
  });
});
