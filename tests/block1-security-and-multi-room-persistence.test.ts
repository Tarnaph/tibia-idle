import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterService, CharacterSaveLockManager, ServerCharacterContextRegistry } from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { colyseusMonitorAuthMiddleware } from '../packages/server/src/server';
import { runBackup } from '../scripts/backup-sqlite.mjs';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';

describe('Phase 167: Bloco 1 - Segurança, Persistência Multi-Sala e Backup SQLite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
  });

  describe('1. Derivação Autoritativa de Nível e Atributos no Servidor', () => {
    it('ignora level arbitrário (ex: level 500) se a experiência acumulada for compatível apenas com level 1', async () => {
      let savedData: any = null;

      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-test-1',
            level: 1,
            experience: BigInt(0),
            vocationName: 'Knight',
            saveVersion: 1,
            lastSavedAt: new Date(Date.now() - 30000),
          }),
          update: vi.fn().mockImplementation(async ({ data }: any) => {
            savedData = data;
            return {
              id: 'char-test-1',
              ...data,
              skills: [],
              inventory: [],
              spells: [],
            };
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      // Injeta payload tentando forçar level 500 com XP 0
      const result = await service.saveCharacterProgress('char-test-1', {
        level: 500,
        experience: BigInt(0),
        health: 999999,
        maxHealth: 999999,
        mana: 999999,
        maxMana: 999999,
        capacity: 999999,
        saveVersion: 1,
      });

      expect(savedData).not.toBeNull();
      // O nível gravado DEVE ser 1, derivado autoritativamente de XP 0
      expect(savedData.level).toBe(1);
      // MaxHealth, MaxMana e Capacity para Knight level 1
      expect(savedData.maxHealth).toBe(150);
      expect(savedData.maxMana).toBe(35);
      expect(savedData.capacity).toBe(400);
      // HP e Mana ajustados aos limites legítimos
      expect(savedData.health).toBe(150);
      expect(savedData.mana).toBe(35);
    });

    it('PrismaPersistenceManager deriva nível autoritativamente a partir da XP no autosave da sala', async () => {
      let updatePayload: any = null;

      const mockDb = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-autosave-1',
            level: 1,
            experience: BigInt(0),
            vocationName: 'Sorcerer',
            saveVersion: 1,
          }),
          update: vi.fn().mockImplementation(async ({ data }: any) => {
            updatePayload = data;
            return { id: 'char-autosave-1', ...data };
          }),
        },
        characterSkill: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as any;

      const persistence = new PrismaPersistenceManager(mockDb);

      const player = new PlayerState();
      player.characterId = 'char-autosave-1';
      player.level = 300; // Cliente reportando nível 300
      player.experience = 0; // Mas sem experiência real acumulada
      (player as any).vocationName = 'Sorcerer';
      player.hp = 5000;
      player.mp = 5000;

      await persistence.saveCharacter(player);

      expect(updatePayload).not.toBeNull();
      expect(updatePayload.level).toBe(1);
      expect(updatePayload.maxHealth).toBe(150); // Sorcerer base HP
      expect(updatePayload.maxMana).toBe(35);   // Sorcerer base Mana
      expect(updatePayload.saveVersion).toBe(2);
    });
  });

  describe('2. Versionamento Monotônico e Anti-Replay', () => {
    it('descarta pacotes desatualizados quando saveVersion recebido for menor que o do banco', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-stale-1',
            level: 10,
            experience: BigInt(15000),
            saveVersion: 8,
            lastSavedAt: new Date(),
          }),
          update: vi.fn(),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      // Pacote com saveVersion 4 (antigo/atrasado por jitter de rede) deve lançar VersionConflictError
      await expect(
        service.saveCharacterProgress('char-stale-1', {
          level: 10,
          experience: BigInt(15000),
          saveVersion: 4,
        })
      ).rejects.toThrow();

      // O banco não deve ter sido alterado
      expect(mockPrisma.character.update).not.toHaveBeenCalled();
    });

    it('aceita pacote com saveVersion igual ou maior e incrementa saveVersion no banco', async () => {
      let savedVersion = 0;
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-valid-1',
            level: 5,
            experience: BigInt(2000),
            saveVersion: 8,
            lastSavedAt: new Date(Date.now() - 10000),
          }),
          update: vi.fn().mockImplementation(async ({ data }: any) => {
            savedVersion = data.saveVersion;
            return { id: 'char-valid-1', ...data, skills: [], inventory: [], spells: [] };
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      const result = await service.saveCharacterProgress('char-valid-1', {
        experience: BigInt(2000),
        saveVersion: 8,
      });

      expect((result as any).skipped).toBeUndefined();
      expect(savedVersion).toBe(9);
    });
  });

  describe('3. Mutex Atômico por Personagem (CharacterSaveLockManager)', () => {
    it('serializa gravações simultâneas para o mesmo personagem evitando race conditions', async () => {
      const executionOrder: string[] = [];

      const p1 = CharacterSaveLockManager.withLock('char-race-1', async () => {
        executionOrder.push('p1-start');
        await new Promise((r) => setTimeout(r, 40));
        executionOrder.push('p1-end');
      });

      const p2 = CharacterSaveLockManager.withLock('char-race-1', async () => {
        executionOrder.push('p2-start');
        await new Promise((r) => setTimeout(r, 10));
        executionOrder.push('p2-end');
      });

      await Promise.all([p1, p2]);

      // p1 deve começar e terminar COMPLETAMENTE antes de p2 iniciar
      expect(executionOrder).toEqual(['p1-start', 'p1-end', 'p2-start', 'p2-end']);
    });

    it('permite concorrência entre personagens diferentes sem bloqueio mútuo', async () => {
      const executionOrder: string[] = [];

      const p1 = CharacterSaveLockManager.withLock('char-A', async () => {
        executionOrder.push('A-start');
        await new Promise((r) => setTimeout(r, 30));
        executionOrder.push('A-end');
      });

      const p2 = CharacterSaveLockManager.withLock('char-B', async () => {
        executionOrder.push('B-start');
        await new Promise((r) => setTimeout(r, 10));
        executionOrder.push('B-end');
      });

      await Promise.all([p1, p2]);

      // Personagens distintos iniciam imediatamente em paralelo (B termina antes de A)
      expect(executionOrder[0]).toBe('A-start');
      expect(executionOrder[1]).toBe('B-start');
      expect(executionOrder[2]).toBe('B-end');
      expect(executionOrder[3]).toBe('A-end');
    });
  });

  describe('4. Isolamento de Autosave Multi-Sala no Colyseus e Graceful Teardown', () => {
    it('cada sala gerencia seu ciclo de autosave independente e onDispose aguarda saves em andamento', async () => {
      const room1 = new ThaisCityRoom();
      const room2 = new ThaisCityRoom();

      const clearedTimers: any[] = [];
      const createMockClock = () => ({
        start: vi.fn(),
        stop: vi.fn(),
        tick: vi.fn(),
        clear: vi.fn(),
        setInterval: vi.fn().mockImplementation((fn: () => void, ms: number) => {
          return { clear: () => clearedTimers.push(ms) };
        }),
      });

      (room1 as any).clock = createMockClock();
      (room2 as any).clock = createMockClock();

      room1.onCreate({});
      room2.onCreate({});

      // Duas salas criadas -> timers registrados independentemente
      expect((room1 as any).clock.setInterval).toHaveBeenCalled();
      expect((room2 as any).clock.setInterval).toHaveBeenCalled();

      // Simula descarte da sala 1
      await room1.onDispose();

      // Somente 1 timer foi limpo (da sala 1)
      expect(clearedTimers.length).toBe(1);
      // Sala 2 permanece ativa
      expect((room2 as any).isDisposed).toBe(false);

      await room2.onDispose();
      expect(clearedTimers.length).toBe(2);
      expect((room2 as any).isDisposed).toBe(true);
    });
  });

  describe('5. Proteção do Endpoint /colyseus (HTTP Basic Auth & 404 Guard)', () => {
    it('retorna 404 Not Found por padrão quando COLYSEUS_MONITOR_USER/PASS não estão configurados (Secure by Default)', () => {
      const origUser = process.env.COLYSEUS_MONITOR_USER;
      const origPass = process.env.COLYSEUS_MONITOR_PASS;
      delete process.env.COLYSEUS_MONITOR_USER;
      delete process.env.COLYSEUS_MONITOR_PASS;

      try {
        const mockReq: any = { headers: {} };
        let sentStatus = 0;
        const mockRes: any = {
          status: (s: number) => {
            sentStatus = s;
            return mockRes;
          },
          send: vi.fn(),
          set: vi.fn(),
        };
        const nextFn = vi.fn();

        colyseusMonitorAuthMiddleware(mockReq, mockRes, nextFn);

        expect(sentStatus).toBe(404);
        expect(nextFn).not.toHaveBeenCalled();
      } finally {
        if (origUser) process.env.COLYSEUS_MONITOR_USER = origUser;
        if (origPass) process.env.COLYSEUS_MONITOR_PASS = origPass;
      }
    });

    it('retorna 401 Unauthorized sem cabeçalho Authorization quando credenciais estão configuradas', () => {
      const origUser = process.env.COLYSEUS_MONITOR_USER;
      const origPass = process.env.COLYSEUS_MONITOR_PASS;
      process.env.COLYSEUS_MONITOR_USER = 'admin';
      process.env.COLYSEUS_MONITOR_PASS = 'secret123';

      try {
        const mockReq: any = { headers: {} };
        let sentStatus = 0;
        let sentBody = '';
        const mockRes: any = {
          status: (s: number) => {
            sentStatus = s;
            return mockRes;
          },
          send: (b: string) => {
            sentBody = b;
            return mockRes;
          },
          set: vi.fn(),
        };
        const nextFn = vi.fn();

        colyseusMonitorAuthMiddleware(mockReq, mockRes, nextFn);

        expect(sentStatus).toBe(401);
        expect(sentBody).toContain('Authentication required');
        expect(mockRes.set).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="Colyseus Monitor"');
        expect(nextFn).not.toHaveBeenCalled();
      } finally {
        if (origUser) process.env.COLYSEUS_MONITOR_USER = origUser;
        else delete process.env.COLYSEUS_MONITOR_USER;
        if (origPass) process.env.COLYSEUS_MONITOR_PASS = origPass;
        else delete process.env.COLYSEUS_MONITOR_PASS;
      }
    });

    it('permite acesso (chama next()) com credenciais HTTP Basic válidas quando configuradas', () => {
      const origUser = process.env.COLYSEUS_MONITOR_USER;
      const origPass = process.env.COLYSEUS_MONITOR_PASS;
      process.env.COLYSEUS_MONITOR_USER = 'admin';
      process.env.COLYSEUS_MONITOR_PASS = 'secret123';

      try {
        const validAuth = Buffer.from('admin:secret123').toString('base64');
        const mockReq: any = {
          headers: {
            authorization: `Basic ${validAuth}`,
          },
        };

        const mockRes: any = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
          set: vi.fn(),
        };
        const nextFn = vi.fn();

        colyseusMonitorAuthMiddleware(mockReq, mockRes, nextFn);

        expect(nextFn).toHaveBeenCalled();
      } finally {
        if (origUser) process.env.COLYSEUS_MONITOR_USER = origUser;
        else delete process.env.COLYSEUS_MONITOR_USER;
        if (origPass) process.env.COLYSEUS_MONITOR_PASS = origPass;
        else delete process.env.COLYSEUS_MONITOR_PASS;
      }
    });
  });

  describe('6. Script Determinístico de Backup SQLite (WAL Safe)', () => {
    it('executa backup atômico via VACUUM INTO em diretório e banco temporários 100% isolados', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { PrismaClient } = await import('@prisma/client');
      const tempDir = path.resolve(__dirname, '../temp-test-backup-isolated');
      fs.mkdirSync(tempDir, { recursive: true });
      const tempDbPath = path.resolve(tempDir, 'synthetic-source.db');
      const backupsDir = path.resolve(tempDir, 'backups');
      fs.mkdirSync(backupsDir, { recursive: true });

      const setupPrisma = new PrismaClient({
        datasources: { db: { url: `file:${tempDbPath.replace(/\\/g, '/')}` } },
      });
      try {
        await setupPrisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "test_records" ("id" TEXT PRIMARY KEY, "val" TEXT);');
        await setupPrisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
        await setupPrisma.$executeRawUnsafe("INSERT OR REPLACE INTO test_records VALUES ('r1', 'isolated-data');");
      } finally {
        await setupPrisma.$disconnect();
      }

      try {
        const backupResult = await runBackup({
          dbPath: tempDbPath,
          backupsDir,
        });
        expect(backupResult).toBeDefined();
        expect(backupResult.success).toBe(true);
        expect(backupResult.file).toMatch(/^backup-.*\.db$/);
        expect(backupResult.sizeBytes).toBeGreaterThan(0);
      } finally {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });
  });
});
