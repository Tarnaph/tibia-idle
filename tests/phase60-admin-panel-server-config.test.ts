import { describe, it, expect, beforeEach } from 'vitest';
import { serverConfigManager } from '../packages/server/src/config/ServerConfigManager';
import { systemLogger } from '../packages/server/src/logging/SystemLogger';

describe('Phase 60: Admin Panel & Server Config Manager', () => {
  beforeEach(() => {
    serverConfigManager.resetToDefaults();
    systemLogger.clearLogs();
  });

  it('should initialize with default server rates and configurations', () => {
    const config = serverConfigManager.getConfig();
    expect(config.expRate).toBe(1.0);
    expect(config.lootRate).toBe(1.0);
    expect(config.skillRate).toBe(1.0);
    expect(config.maxClientsPerRoom).toBe(100);
    expect(config.periodicSaveIntervalMs).toBe(20000);
  });

  it('should dynamically update server config rates and notify listeners', () => {
    let notified = false;
    const unsubscribe = serverConfigManager.onChange((newConfig) => {
      notified = true;
      expect(newConfig.expRate).toBe(5.0);
    });

    const updated = serverConfigManager.updateConfig({ expRate: 5.0, lootRate: 3.0 });
    expect(updated.expRate).toBe(5.0);
    expect(updated.lootRate).toBe(3.0);
    expect(notified).toBe(true);

    unsubscribe();
  });

  it('should record structured system logs and GM actions', () => {
    systemLogger.info('TEST', 'Servidor iniciado.');
    systemLogger.warn('TEST', 'Carga elevada de conexões.');
    systemLogger.gmAction('AdminUser', 'Teleportou jogador Hero para o templo');

    const allLogs = systemLogger.getLogs();
    expect(allLogs.length).toBeGreaterThanOrEqual(3);

    const gmLogs = systemLogger.getLogs({ level: 'GM_ACTION' });
    expect(gmLogs.length).toBe(1);
    expect(gmLogs[0].message).toContain('AdminUser');

    const searchLogs = systemLogger.getLogs({ query: 'Carga elevada' });
    expect(searchLogs.length).toBe(1);
    expect(searchLogs[0].level).toBe('WARN');
  });

  it('should enforce numeric bounds on server configuration parameters', () => {
    serverConfigManager.updateConfig({
      expRate: -5.0, // Invalid negative rate should be ignored
      maxClientsPerRoom: 0, // Invalid zero should be ignored
    });

    const config = serverConfigManager.getConfig();
    expect(config.expRate).toBe(1.0);
    expect(config.maxClientsPerRoom).toBe(100);
  });
});
