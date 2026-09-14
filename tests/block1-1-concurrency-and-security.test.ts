import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CharacterService, CharacterSaveLockManager, VersionConflictError } from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { runBackup } from '../scripts/backup-sqlite.mjs';

describe('Phase 167.1: Bloco 1.1 - Concorrência Otimista (OCC), Proteção Transacional e WebSocket Hardening', () => {
  const tempTestDir = path.resolve(__dirname, '../temp-sandbox-block1-1');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    if (fs.existsSync(tempTestDir)) {
      try {
        fs.rmSync(tempTestDir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('1. OCC Transacional Atômico e Rollback de Inventário/Habilidades', () => {
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

    it('reverte toda a transação se saveVersion sofrer conflito concorrente durante executeMutations', async () => {
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

      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-occ-race',
            level: 5,
            experience: BigInt(5000),
            vocationName: 'Knight',
            saveVersion: 2,
            lastSavedAt: new Date(Date.now() - 2000),
          }),
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

      await expect(
        service.saveCharacterProgress('char-occ-race', {
          saveVersion: 2,
          experience: BigInt(6000),
          inventory: [
            { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
          ],
        })
      ).rejects.toThrow(VersionConflictError);

      expect(transactionRolledBack).toBe(true);
      // Inventário NÃO deve ser gravado se o update do personagem falhar
      expect(mockTx.inventoryItem.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.inventoryItem.createMany).not.toHaveBeenCalled();
    });
  });

  describe('2. Validação Rigorosa de Catálogo e Quantidade de Itens', () => {
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
            { slot: 'head', serverId: 99999999, name: 'Hacked Helm', count: 1 }, // ID inexistente
          ],
        })
      ).rejects.toThrow(/Item inválido no inventário/);
    });

    it('rejeita quantidade maior que 1 para itens de equipamento não-empilháveis', async () => {
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
            { slot: 'head', serverId: 2461, name: 'Leather Helmet', count: 5 }, // Helmet com count 5!
          ],
        })
      ).rejects.toThrow(/não pode ter quantidade maior que 1/);
    });

    it('rejeita slots de equipamento inválidos', async () => {
      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-item-val-3',
            level: 1,
            experience: BigInt(0),
            vocationName: 'Knight',
            saveVersion: 1,
          }),
        },
      } as any;

      const service = new CharacterService(mockPrisma);

      await expect(
        service.saveCharacterProgress('char-item-val-3', {
          saveVersion: 1,
          inventory: [
            { slot: 'invalid_slot', serverId: 2461, name: 'Leather Helmet', count: 1 },
          ],
        })
      ).rejects.toThrow(/Slot de equipamento inválido/);
    });

    it('aceita itens válidos do catálogo com quantidade permitida (ex: 100 flechas no leftHand)', async () => {
      let insertedInventory: any = null;

      const mockTx = {
        character: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-item-valid',
            level: 1,
            experience: BigInt(0),
            vocationName: 'Paladin',
            saveVersion: 2,
            skills: [],
            inventory: [],
            spells: [],
          }),
        },
        characterSkill: {
          upsert: vi.fn(),
        },
        inventoryItem: {
          deleteMany: vi.fn(),
          createMany: vi.fn().mockImplementation(({ data }: any) => {
            insertedInventory = data;
          }),
        },
      };

      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'char-item-valid',
            level: 1,
            experience: BigInt(0),
            vocationName: 'Paladin',
            saveVersion: 1,
            lastSavedAt: new Date(Date.now() - 5000),
          }),
        },
        $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      } as any;

      const service = new CharacterService(mockPrisma);

      const res = await service.saveCharacterProgress('char-item-valid', {
        saveVersion: 1,
        inventory: [
          { slot: 'rightHand', serverId: 2456, name: 'Bow', count: 1 },
          { slot: 'leftHand', serverId: 2544, name: 'Arrow', count: 100 },
        ],
      });

      expect(res).toBeDefined();
      expect(insertedInventory).toHaveLength(2);
      expect(insertedInventory[1].count).toBe(100);
    });
  });

  describe('3. Fechamento de Brecha de XP e Derivação de Nível via WebSocket', () => {
    it('bloqueia injeção excessiva de XP enviada via player:syncProgress', () => {
      const room = new ThaisCityRoom();
      room.onCreate({}); // Inicializa room.state (WorldState) e message handlers

      const mockClient = { sessionId: 'client-sync-1', send: vi.fn() } as any;

      const player = new PlayerState();
      player.id = 'client-sync-1';
      player.characterId = 'char-ws-hack';
      player.level = 1;
      player.experience = 0;
      player.hp = 150;
      player.maxHp = 150;

      room.state.players.set(mockClient.sessionId, player);
      (room as any).playerExpSync.set(mockClient.sessionId, {
        lastSyncTime: Date.now(),
        lastExperience: 0,
      });

      // Simula cliente tentando injetar 10 milhões de XP no WebSocket de uma vez só
      const syncHandler = (room as any).onMessageHandlers['player:syncProgress'];
      expect(syncHandler).toBeDefined();

      syncHandler(mockClient, {
        level: 500,
        experience: 10_000_000,
        hp: 999999,
        mp: 999999,
      });

      // XP e level NÃO devem ser atualizados para o valor forjado
      expect(player.experience).toBe(0);
      expect(player.level).toBe(1);
      // HP e MP são limitados a maxHp e maxMp
      expect(player.hp).toBe(150);
    });

    it('aceita progressão legítima de XP e deriva o level automaticamente', () => {
      const room = new ThaisCityRoom();
      room.onCreate({}); // Inicializa room.state

      const mockClient = { sessionId: 'client-sync-2', send: vi.fn() } as any;

      const player = new PlayerState();
      player.id = 'client-sync-2';
      player.characterId = 'char-ws-legit';
      player.level = 1;
      player.experience = 0;

      room.state.players.set(mockClient.sessionId, player);
      (room as any).playerExpSync.set(mockClient.sessionId, {
        lastSyncTime: Date.now() - 2000,
        lastExperience: 0,
      });

      const syncHandler = (room as any).onMessageHandlers['player:syncProgress'];

      // Ganho plausível de 500 XP (ex: matou alguns monstros na caçada)
      syncHandler(mockClient, {
        level: 999, // Tenta burlar enviando level 999
        experience: 500,
      });

      expect(player.experience).toBe(500);
      // O nível DEVE ser derivado de 500 XP (Level 3), ignorando o level 999 forjado
      expect(player.level).toBeGreaterThanOrEqual(2);
      expect(player.level).toBeLessThan(10);
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

  describe('5. Isolamento Estrito de Backup em Sandbox Temporária', () => {
    it('executa backup WAL Safe em banco e diretório temporários com integridade e limpeza', async () => {
      fs.mkdirSync(tempTestDir, { recursive: true });
      const backupsDir = path.resolve(tempTestDir, 'backups');
      fs.mkdirSync(backupsDir, { recursive: true });

      // Cria cópia temporária do banco para o teste isolado
      const sourceDb = path.resolve(__dirname, '../prisma/dev.db');
      const tempDbPath = path.resolve(tempTestDir, 'temp-source.db');
      fs.copyFileSync(sourceDb, tempDbPath);

      const result = await runBackup({
        dbPath: tempDbPath,
        backupsDir,
      });

      expect(result.success).toBe(true);
      expect(result.file).toMatch(/^backup-.*\.db$/);

      const generatedFilePath = path.resolve(backupsDir, result.file);
      expect(fs.existsSync(generatedFilePath)).toBe(true);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });
  });
});
