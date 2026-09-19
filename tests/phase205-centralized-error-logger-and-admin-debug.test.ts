import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { clientErrorLogger } from '../apps/web/lib/errorLogger';
import { POST as postAdminLog } from '../app/api/admin/logs/route';
import { systemLogger } from '../packages/server/src/logging/SystemLogger';

describe('Phase 205: Centralized Error Logging & ADMIN Exclusive Debug Modal', () => {
  describe('1. Centralized Client Error Logger (apps/web/lib/errorLogger.ts)', () => {
    it('records error, warn, and info logs with structured metadata', () => {
      clientErrorLogger.clear();

      clientErrorLogger.info('TEST_CAT', 'Informational message', { detail: 123 });
      clientErrorLogger.warn('TEST_CAT', 'Warning message');
      clientErrorLogger.error('COMBAT', 'Fatal anomaly detected', { actorId: 'hero-1' }, 'Error: at line 42');

      const logs = clientErrorLogger.getLogs();
      expect(logs).toHaveLength(3);

      const errLog = logs[0]; // newest first
      expect(errLog.level).toBe('ERROR');
      expect(errLog.category).toBe('COMBAT');
      expect(errLog.message).toBe('Fatal anomaly detected');
      expect(errLog.details).toEqual({ actorId: 'hero-1' });
      expect(errLog.stack).toContain('line 42');
      expect(errLog.timestamp).toBeDefined();

      expect(clientErrorLogger.getErrorCount()).toBe(1);
    });

    it('notifies subscribers reactively when new logs arrive', () => {
      clientErrorLogger.clear();
      const listener = vi.fn();
      const unsubscribe = clientErrorLogger.subscribe(listener);

      clientErrorLogger.error('TELEMETRY', 'Packet dropped');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'TELEMETRY',
          message: 'Packet dropped',
          level: 'ERROR',
        }),
        expect.any(Array)
      );

      unsubscribe();
      clientErrorLogger.info('TELEMETRY', 'After unsub');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('clears logs and exports formatted JSON', () => {
      clientErrorLogger.clear();
      clientErrorLogger.error('EXPORT', 'Test export');
      const json = clientErrorLogger.exportJson();
      expect(json).toContain('Test export');

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].category).toBe('EXPORT');

      clientErrorLogger.clear();
      expect(clientErrorLogger.getLogs()).toHaveLength(0);
      expect(clientErrorLogger.getErrorCount()).toBe(0);
    });
  });

  describe('2. WindowDockBar Exclusive Debug Button for ADMIN', () => {
    it('declares onOpenDebug in WindowDockBarProps and imports clientErrorLogger', () => {
      const filePath = path.resolve(process.cwd(), 'apps/web/components/window/WindowDockBar.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('onOpenDebug?: () => void;');
      expect(content).toContain('clientErrorLogger');
      expect(content).toContain('className="huntera-square-btn debug-btn"');
      expect(content).toContain('<span>Debug</span>');
      expect(content).toContain('errorCount');
    });

    it('wires onOpenDebug and renders AdminDebugModal in GamePrototype.tsx', () => {
      const filePath = path.resolve(process.cwd(), 'apps/web/components/GamePrototype.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('import { AdminDebugModal } from \'./admin/AdminDebugModal\';');
      expect(content).toContain('isAdminDebugModalOpen');
      expect(content).toContain('onOpenDebug={() => setIsAdminDebugModalOpen(true)}');
      expect(content).toContain('<AdminDebugModal');
    });
  });

  describe('3. AdminDebugModal Component Integration & Capabilities', () => {
    it('verifies AdminDebugModal exports tabs for Logs, Telemetry, and GM Actions', () => {
      const filePath = path.resolve(process.cwd(), 'apps/web/components/admin/AdminDebugModal.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('export function AdminDebugModal');
      expect(content).toContain('PAINEL DE DEBUG & LOGS CENTRALIZADOS');
      expect(content).toContain('Logs do Sistema');
      expect(content).toContain('Telemetria & Engine');
      expect(content).toContain('Ações Rápidas de GM');
      expect(content).toContain('handleSimulateError');
      expect(content).toContain('handleCopyLogs');
      expect(content).toContain('handleClearLogs');
    });
  });

  describe('4. Server SystemLogger POST Endpoint (/api/admin/logs)', () => {
    it('rejects unauthenticated requests to POST /api/admin/logs with 401', async () => {
      const req = new Request('http://localhost/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Unauthorized test log' }),
      });

      const res = await postAdminLog(req);
      expect(res.status).toBe(401);
    });
  });
});
