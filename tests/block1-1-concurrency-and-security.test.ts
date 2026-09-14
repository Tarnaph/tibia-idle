import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  CharacterService,
  CharacterSaveLockManager,
  VersionConflictError,
  XpRateLimiter,
  MAX_BURST_EXP,
  MAX_EXP_PER_SECOND,
  NON_HUNT_MAX_BURST_EXP,
  NON_HUNT_MAX_EXP_PER_SECOND,
} from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { runBackup } from '../scripts/backup-sqlite.mjs';

describe('Phase 167.1: Bloco 1.1 - Concorrência Otimista (OCC), Proteção Transacional e WebSocket Hardening', () => {
  const tempTestDir = path.resolve(__dirname, '../temp-sandbox-block1-1');

  beforeEach(() => {
    vi.clearAllMocks();
    XpRateLimiter.reset('char-occ-1');
    XpRateLimiter.reset('char-occ-race');
    XpRateLimiter.reset('char-ws-hack');
    XpRateLimiter.reset('char-ws-legit');
    XpRateLimiter.reset('char-rate-flood');
    XpRateLimiter.reset('char-rate-town');
  });

  afterAll(() => {
    if (fs.existsSync(tempTestDir)) {
      try {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('1. OCC Transacional Atômico e Rollback de Inventário/Habilidades', () => {
    it('rejeita requisições sem saveVersion inteiro >= 1 na API pública', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-occ-missing',
            level: 10,
            experience: BigInt(20000),
            vocationName: 'Knight',
            saveVersion: 5,
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      // Chamada pública sem saveVersion deve ser rejeitada
      await expect(
        service.saveCharacterProgress('char-occ-missing', {
          experience: BigInt(20000),
        })
      ).rejects.toThrow('saveVersion é obrigatório e deve ser um número inteiro >= 1.');

      // Chamada interna com isInternal: true tem contrato separado e é aceita
      mockPrisma.character.update = vi.fn().mockResolvedValue({
        id: 'char-occ-missing',
        saveVersion: 6,
      });

      const internalResult = await service.saveCharacterProgress(
        'char-occ-missing',
        { experience: BigInt(20000) },
        { isInternal: true }
      );
      expect(internalResult).toBeDefined();
    });

    it('lança VersionConflictError quando saveVersion recebido difere do banco', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-occ-1',
            level: 10,
            experience: BigInt(20000),
            vocationName: 'Knight',
            saveVersion: 5,
            lastSavedAt: new Date(Date.now() - 5000),
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      await expect(
        service.saveCharacterProgress('char-occ-1', {
          saveVersion: 4, // Tentativa com versão defasada
          experience: BigInt(25000),
        })
      ).rejects.toThrow(VersionConflictError);
    });

    it('reverte toda a transação e busca o registro atualizado após o rollback', async () => {
      let transactionRolledBack = false;

      const mockTx = {
        character: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // 0 linhas afetadas = colisão de versão!
        },
        characterSkill: {
          upsert: vi.fn(),
        },
        inventoryItem: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      };

      const freshCharacterAfterRollback = {
        id: 'char-occ-race',
        level: 6,
        experience: BigInt(7000),
        vocationName: 'Knight',
        saveVersion: 3, // Outro processo já atualizou para a versão 3
        skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 25, tries: BigInt(10) }],
        inventory: [{ slot: 'head', serverId: 2493, name: 'Demon Helmet', count: 1 }],
      };

      const mockPrisma = {
        character: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({
              id: 'char-occ-race',
              level: 5,
              experience: BigInt(5000),
              vocationName: 'Knight',
              saveVersion: 2,
              lastSavedAt: new Date(Date.now() - 2000),
              skills: [],
              inventory: [],
            })
            // Segunda chamada pós-rollback para obter o fresh state
            .mockResolvedValueOnce(freshCharacterAfterRollback),
        },
        $transaction: vi.fn().mockImplementation(async (callback: any) => {
          try {
            return await callback(mockTx);
          } catch (err) {
            transactionRolledBack = true;
            throw err;
          }
        }),
      } as any;

      const service = new CharacterService(mockPrisma);

      try {
        await service.saveCharacterProgress('char-occ-race', {
          saveVersion: 2,
          experience: BigInt(6000),
          inventory: [
            { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
          ],
        });
        expect.unreachable('Deveria ter lançado VersionConflictError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(VersionConflictError);
        expect(transactionRolledBack).toBe(true);
        // O erro deve transportar o registro atualizado buscado pós-rollback
        expect(err.currentVersion).toBe(3);
        expect(err.character?.id).toBe('char-occ-race');
        expect(err.character?.inventory).toHaveLength(1);
        expect(err.character?.inventory[0].serverId).toBe(2493);
      }

      // Inventário NÃO deve ser gravado se o update do personagem falhar
      expect(mockTx.inventoryItem.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.inventoryItem.createMany).not.toHaveBeenCalled();
    });

    it('demonstra concorrência OCC real com conexões SQLite reais em sandbox', async () => {
      fs.mkdirSync(tempTestDir, { recursive: true });
      const dbPath = path.resolve(tempTestDir, 'occ-real.db');
      const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;

      const prismaClient = new PrismaClient({
        datasources: { db: { url: dbUrl } },
      });

      try {
        await prismaClient.$executeRawUnsafe(`
          CREATE TABLE "characters" (
            "id" TEXT PRIMARY KEY,
            "name" TEXT NOT NULL,
            "saveVersion" INTEGER NOT NULL DEFAULT 1,
            "level" INTEGER NOT NULL DEFAULT 1
          );
        `);

        await prismaClient.$executeRawUnsafe(`
          INSERT INTO "characters" ("id", "name", "saveVersion", "level")
          VALUES ('char-real-occ', 'Knight Real', 1, 10);
        `);

        // Simula duas conexões/transações concorrentes lendo a versão 1
        const runTxA = async () => {
          return prismaClient.$transaction(async (tx) => {
            const res = await tx.$executeRawUnsafe(`
              UPDATE "characters"
              SET "level" = 11, "saveVersion" = 2
              WHERE "id" = 'char-real-occ' AND "saveVersion" = 1;
            `);
            return res;
          });
        };

        const runTxB = async () => {
          return prismaClient.$transaction(async (tx) => {
            const res = await tx.$executeRawUnsafe(`
              UPDATE "characters"
              SET "level" = 12, "saveVersion" = 2
              WHERE "id" = 'char-real-occ' AND "saveVersion" = 1;
            `);
            return res;
          });
        };

        // Dispara ambas as transações simultaneamente
        const [resA, resB] = await Promise.all([runTxA(), runTxB()]);

        // Exatamente UMA transação deve ter afetado 1 linha, e a outra 0 linhas (conflito detectado)
        const updatedCount = Number(resA) + Number(resB);
        expect(updatedCount).toBe(1);

        // A versão final do banco é 2, e não houve corrupção
        const rows: any = await prismaClient.$queryRawUnsafe(`SELECT * FROM "characters" WHERE "id" = 'char-real-occ';`);
        expect(rows[0].saveVersion).toBe(2);
      } finally {
        await prismaClient.$disconnect();
      }
    });
  });

  describe('2. Validação Rigorosa de Catálogo, Vocações, Promoções e Habilidades', () => {
    it('rejeita itens com serverId inexistente no catálogo de equipamentos', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-item-val-1',
            level: 1,
            experience: BigInt(0),
            vocationName: 'Knight',
            saveVersion: 1,
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      await expect(
        service.saveCharacterProgress('char-item-val-1', {
          saveVersion: 1,
          inventory: [
            { slot: 'armor', serverId: 999999, name: 'Hacked Armor', count: 1 },
          ],
        })
      ).rejects.toThrow(/Item inválido no inventário/);
    });

    it('rejeita slot de equipamento não permitido', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-item-val-2',
            level: 1,
            experience: BigInt(0),
            vocationName: 'Knight',
            saveVersion: 1,
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      await expect(
        service.saveCharacterProgress('char-item-val-2', {
          saveVersion: 1,
          inventory: [
            { slot: 'invalid_cheat_slot', serverId: 2463, name: 'Plate Armor', count: 1 },
          ],
        })
      ).rejects.toThrow(/Slot de equipamento inválido/);
    });

    it('impede transição arbitrária de vocação (ex: Knight para Sorcerer) via autosave', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-voc-hack',
            level: 30,
            experience: BigInt(100000),
            vocationName: 'Knight',
            saveVersion: 1,
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      await expect(
        service.saveCharacterProgress('char-voc-hack', {
          saveVersion: 1,
          vocationName: 'Sorcerer',
        })
      ).rejects.toThrow(/Transição de vocação não permitida/);
    });

    it('impede promoção de vocação sem nível mínimo 20', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-promo-hack',
            level: 15,
            experience: BigInt(20000),
            vocationName: 'Knight',
            saveVersion: 1,
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      await expect(
        service.saveCharacterProgress('char-promo-hack', {
          saveVersion: 1,
          promotion: 'Elite Knight',
        })
      ).rejects.toThrow(/Promoção de vocação exige nível 20/);
    });

    it('impede saltos anômalos de habilidade (+3 ou mais em único salvamento)', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-skill-jump',
            level: 10,
            experience: BigInt(20000),
            vocationName: 'Knight',
            saveVersion: 1,
            skills: [
              { skillId: 2, skillName: 'Sword Fighting', value: 20, tries: BigInt(500) },
            ],
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      await expect(
        service.saveCharacterProgress('char-skill-jump', {
          saveVersion: 1,
          skills: [
            { skillId: 2, skillName: 'Sword Fighting', value: 35 }, // Salto de 20 para 35!
          ],
        })
      ).rejects.toThrow(/Salto anômalo de habilidade não permitido/);
    });
  });

  describe('3. Orçamento Contínuo de XP (Anti-Fragmentação e Contexto de Caçada)', () => {
    it('bloqueia injeção excessiva de XP enviada via player:syncProgress', () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const mockClient = { sessionId: 'client-sync-1', send: vi.fn() } as any;

      const player = new PlayerState();
      player.id = 'client-sync-1';
      player.characterId = 'char-ws-hack';
      player.level = 1;
      player.experience = 0;
      player.hp = 150;
      player.maxHp = 150;

      room.state.players.set(mockClient.sessionId, player);

      const syncHandler = (room as any).onMessageHandlers['player:syncProgress'];
      expect(syncHandler).toBeDefined();

      syncHandler(mockClient, {
        level: 500,
        experience: 10_000_000,
        hp: 999999,
        mp: 999999,
      });

      expect(player.experience).toBe(0);
      expect(player.level).toBe(1);
    });

    it('bloqueia ataque de fragmentação com 10 mensagens de XP enviadas em 50ms', () => {
      const charId = 'char-rate-flood';
      const baseTime = Date.now();

      // Primeira mensagem consome o burst (30.000 XP)
      const res1 = XpRateLimiter.consume(charId, 30_000, baseTime, { isHunting: true });
      expect(res1.allowed).toBe(true);

      // Próximas 9 mensagens chegam com 5ms de intervalo tentando ganhar mais 10.000 cada
      let rejectedCount = 0;
      for (let i = 1; i <= 9; i++) {
        const check = XpRateLimiter.consume(charId, 10_000, baseTime + i * 5, { isHunting: true });
        if (!check.allowed) {
          rejectedCount++;
        }
      }

      // Todas as rajadas subsequentes no intervalo quase instantâneo foram bloqueadas!
      expect(rejectedCount).toBe(9);
    });

    it('aplica orçamento restrito e taxa baixa fora de caçada (em cidade / idle)', () => {
      const charId = 'char-rate-town';
      const baseTime = Date.now();

      // Fora de caçada, o teto de burst é apenas 2.000 XP (não 30.000)
      const resNormalBurst = XpRateLimiter.consume(charId, 5_000, baseTime, { isHunting: false });
      expect(resNormalBurst.allowed).toBe(false);
      expect(resNormalBurst.maxAllowed).toBeLessThanOrEqual(NON_HUNT_MAX_BURST_EXP);

      // Ganho condizente com treino/idle (ex: 500 XP) é permitido
      XpRateLimiter.reset(charId);
      const resAllowed = XpRateLimiter.consume(charId, 500, baseTime, { isHunting: false });
      expect(resAllowed.allowed).toBe(true);
    });
  });

  describe('4. Resolução do Memory Leak no Map de Locks (CharacterSaveLockManager)', () => {
    it('remove a entrada do Map ao concluir as operações e zera getActiveLockCount()', async () => {
      expect(CharacterSaveLockManager.getActiveLockCount()).toBe(0);

      const charId = 'char-leak-test';
      const lockPromise = CharacterSaveLockManager.withLock(charId, async () => {
        expect(CharacterSaveLockManager.getActiveLockCount()).toBe(1);
        await new Promise((r) => setTimeout(r, 20));
        return 'success';
      });

      const result = await lockPromise;
      expect(result).toBe('success');

      // O Map NÃO pode manter referências acumuladas após terminar
      expect(CharacterSaveLockManager.getActiveLockCount()).toBe(0);
    });
  });

  describe('5. Sandbox SQLite em WAL Real com Dados Sintéticos e Validação de Snapshot', () => {
    it('executa backup WAL Safe a partir de banco temporário com dados pendentes no WAL', async () => {
      fs.mkdirSync(tempTestDir, { recursive: true });
      const tempDbPath = path.resolve(tempTestDir, 'temp-wal-source.db');
      const backupsDir = path.resolve(tempTestDir, 'backups');
      fs.mkdirSync(backupsDir, { recursive: true });

      const normalizedTempDbUrl = `file:${tempDbPath.replace(/\\/g, '/')}`;

      const setupPrisma = new PrismaClient({
        datasources: { db: { url: normalizedTempDbUrl } },
      });

      try {
        // Cria tabela sintética e ativa WAL
        await setupPrisma.$executeRawUnsafe(`
          CREATE TABLE "synthetic_ledger" (
            "id" TEXT PRIMARY KEY,
            "description" TEXT NOT NULL,
            "amount" INTEGER NOT NULL
          );
        `);
        await setupPrisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');

        // Grava transações sintéticas que ficam no log WAL
        await setupPrisma.$executeRawUnsafe(`
          INSERT INTO "synthetic_ledger" ("id", "description", "amount")
          VALUES ('tx-001', 'Loot de Dragon', 3500);
        `);
        await setupPrisma.$executeRawUnsafe(`
          INSERT INTO "synthetic_ledger" ("id", "description", "amount")
          VALUES ('tx-002', 'Venda no NPC', 1200);
        `);

        // Verifica que o arquivo WAL ou SHM existe na sandbox
        const walPath = `${tempDbPath}-wal`;
        const shmPath = `${tempDbPath}-shm`;
        const walExists = fs.existsSync(walPath) || fs.existsSync(shmPath);
        expect(walExists).toBe(true);

        // Executa backup passando a base sintética temporária como origem
        const backupResult = await runBackup({
          dbPath: tempDbPath,
          backupsDir,
        });

        expect(backupResult.success).toBe(true);
        expect(backupResult.file).toMatch(/^backup-.*\.db$/);

        const generatedFilePath = path.resolve(backupsDir, backupResult.file);
        expect(fs.existsSync(generatedFilePath)).toBe(true);
        expect(backupResult.sizeBytes).toBeGreaterThan(0);

        // Conecta diretamente no arquivo de backup gerado para validar recuperação completa dos dados do WAL
        const verifyPrisma = new PrismaClient({
          datasources: { db: { url: `file:${generatedFilePath.replace(/\\/g, '/')}` } },
        });

        try {
          const check: any = await verifyPrisma.$queryRawUnsafe('PRAGMA integrity_check;');
          const status = check?.[0]?.integrity_check || 'unknown';
          expect(status).toBe('ok');

          const records: any = await verifyPrisma.$queryRawUnsafe('SELECT * FROM "synthetic_ledger" ORDER BY "id" ASC;');
          expect(records).toHaveLength(2);
          expect(records[0].id).toBe('tx-001');
          expect(records[0].amount).toBe(3500);
          expect(records[1].id).toBe('tx-002');
          expect(records[1].amount).toBe(1200);
        } finally {
          await verifyPrisma.$disconnect();
        }
      } finally {
        await setupPrisma.$disconnect();
      }
    });
  });
});
