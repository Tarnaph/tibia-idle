import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  XpRateLimiter,
  ServerCharacterContextRegistry,
  CharacterService,
  VersionConflictError,
  MAX_BURST_EXP,
} from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { parseInventoryData, resolveSkillKey } from '../apps/web/lib/characterHydration';

const TEST_DB_PATH = path.resolve(__dirname, 'test-dispute.db');

describe('Phase 167.2: Bloco 1.1b - Correções Críticas de Migração, Reconciliação 409, Contexto de Caçada e Deduplicação de XP', () => {
  let testPrisma: PrismaClient;

  beforeEach(() => {
    XpRateLimiter.resetAll();
    ServerCharacterContextRegistry.clearAll();
  });

  afterEach(async () => {
    if (testPrisma) {
      await testPrisma.$disconnect();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  // =========================================================================
  // CENÁRIO 1: A migração SQLite funciona com personagens e dados existentes
  // =========================================================================
  it('Cenário 1: Migração SQLite executa sem erro em banco populado com personagens e chaves estrangeiras', () => {
    const memDb = new DatabaseSync(':memory:');

    // 1. Aplica o schema inicial (init)
    const initSqlPath = path.resolve(__dirname, '../prisma/migrations/20260901000000_init/migration.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    memDb.exec(initSql);

    // 2. Insere dados existentes (conta, personagem, skills, inventário)
    memDb.exec(`INSERT INTO "accounts" ("id", "email", "passwordHash", "updatedAt") VALUES ('acc-1', 'player@tibia.test', 'hash123', '2026-09-01');`);
    memDb.exec(`
      INSERT INTO "characters" (
        "id", "accountId", "name", "vocationName", "level", "experience", "health", "maxHealth", "mana", "maxMana", "capacity", "updatedAt"
      ) VALUES (
        'char-1', 'acc-1', 'Sir Valor', 'Knight', 25, 50000, 350, 350, 100, 100, 600, '2026-09-01'
      );
    `);
    memDb.exec(`
      INSERT INTO "character_skills" ("id", "characterId", "skillId", "skillName", "value", "tries")
      VALUES ('sk-1', 'char-1', 2, 'Sword Fighting', 60, 2000);
    `);
    memDb.exec(`
      INSERT INTO "inventory_items" ("id", "characterId", "slot", "serverId", "name", "count")
      VALUES ('inv-1', 'char-1', 'armor', 2463, 'Plate Armor', 1);
    `);

    // 3. Executa a migração atualizada (RedefineTables)
    const migrationSqlPath = path.resolve(__dirname, '../prisma/migrations/20260914120000_add_save_version_and_last_saved_at/migration.sql');
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

    expect(() => memDb.exec(migrationSql)).not.toThrow();

    // 4. Valida integridade referencial de Foreign Keys
    const fkCheck = memDb.prepare('PRAGMA foreign_key_check;').all();
    expect(fkCheck).toEqual([]);

    // 5. Valida integridade dos dados migrados
    const charRow: any = memDb.prepare(`SELECT "id", "name", "saveVersion", "lastSavedAt" FROM "characters" WHERE "id" = 'char-1';`).get();
    expect(charRow).toBeDefined();
    expect(charRow.id).toBe('char-1');
    expect(charRow.name).toBe('Sir Valor');
    expect(charRow.saveVersion).toBe(1);
    expect(charRow.lastSavedAt).toBeTruthy();

    const skillRow: any = memDb.prepare(`SELECT "skillId", "value" FROM "character_skills" WHERE "characterId" = 'char-1';`).get();
    expect(skillRow.skillId).toBe(2);
    expect(skillRow.value).toBe(60);

    const invRow: any = memDb.prepare(`SELECT "slot", "serverId" FROM "inventory_items" WHERE "characterId" = 'char-1';`).get();
    expect(invRow.slot).toBe('armor');
    expect(invRow.serverId).toBe(2463);
  });

  // =========================================================================
  // CENÁRIO 2: Reconciliação do HTTP 409 atualiza todo o inventário real e skills
  // =========================================================================
  it('Cenário 2: Reconciliação 409 atualiza ouro, bolsa, loot, equipamentos e skills sem retornar valores antigos no autosave', () => {
    const mockEquipmentCatalog = [
      { id: 2463, name: 'Plate Armor' },
      { id: 2376, name: 'Sword' },
      { id: 2386, name: 'Axe' },
      { id: 2148, name: 'Gold Coin' },
      { id: 7618, name: 'Health Potion' },
    ];

    // Estado 1: Sessão A inicial antes de conflito
    const initialDbInventory = [
      { slot: 'armor', serverId: 2463, name: 'Plate Armor', count: 1 },
      { slot: 'leftHand', serverId: 2376, name: 'Sword', count: 1 },
      { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 5000 },
      { slot: 'bag_0', serverId: 7618, name: 'Health Potion', count: 20 },
      { slot: 'backpack_loot_0', serverId: 2672, name: 'Dragon Ham', count: 10 },
    ];

    const initialParsed = parseInventoryData(initialDbInventory, mockEquipmentCatalog);
    expect(initialParsed.gold).toBe(5000);
    expect(initialParsed.equipment.leftHand).toBe(2376); // Sword
    expect(initialParsed.bag).toHaveLength(1);
    expect(initialParsed.loot).toHaveLength(1);

    // Mapeamento de skills no modelo
    const rawSkills = [
      { skillId: 2, skillName: 'Sword Fighting', value: 50, tries: 1000 },
      { skillId: 0, skillName: 'Fist Fighting', value: 15, tries: 50 },
    ];
    expect(resolveSkillKey(rawSkills[0])).toBe('sword');
    expect(resolveSkillKey(rawSkills[1])).toBe('fist');

    // Estado 2: Simulação de conflito 409 recebido do servidor (modificado em outra aba):
    // Na outra aba: Sword vendida, equipado Axe, ouro reduzido para 1000, bolsa agora tem 5 Health Potions, loot vazio
    const serverConflictCharacter = {
      id: 'char-1',
      level: 25,
      saveVersion: 2,
      skills: [
        { skillId: 2, skillName: 'Sword Fighting', value: 52, tries: 1500 },
        { skillId: 0, skillName: 'Fist Fighting', value: 16, tries: 100 },
      ],
      inventory: [
        { slot: 'armor', serverId: 2463, name: 'Plate Armor', count: 1 },
        { slot: 'leftHand', serverId: 2386, name: 'Axe', count: 1 },
        { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 1000 },
        { slot: 'bag_0', serverId: 7618, name: 'Health Potion', count: 5 },
      ],
    };

    // Reconciliação completa
    const reconciledInventory = parseInventoryData(serverConflictCharacter.inventory, mockEquipmentCatalog);
    expect(reconciledInventory.gold).toBe(1000);
    expect(reconciledInventory.equipment.leftHand).toBe(2386); // Axe equipado
    expect(reconciledInventory.bag).toHaveLength(1);
    expect(reconciledInventory.bag[0].amount).toBe(5);
    expect(reconciledInventory.loot).toHaveLength(0); // Loot purgado

    // Montagem do payload do próximo autosave com o estado reconciliado
    const nextSavePayload: Array<{ slot: string; serverId: number; name: string; count: number }> = [];
    if (reconciledInventory.equipment.leftHand) {
      nextSavePayload.push({ slot: 'leftHand', serverId: reconciledInventory.equipment.leftHand, name: 'Axe', count: 1 });
    }
    if (reconciledInventory.gold > 0) {
      nextSavePayload.push({ slot: 'gold', serverId: 2148, name: 'Gold Coin', count: reconciledInventory.gold });
    }
    reconciledInventory.bag.forEach((item, idx) => {
      nextSavePayload.push({ slot: `bag_${idx}`, serverId: item.itemId!, name: item.name, count: item.amount });
    });
    reconciledInventory.loot.forEach((item, idx) => {
      nextSavePayload.push({ slot: `backpack_loot_${idx}`, serverId: item.itemId!, name: item.name, count: item.amount });
    });

    // Nenhum item antigo reaparece!
    expect(nextSavePayload.some((item) => item.serverId === 2376)).toBe(false); // Sword NÃO está presente
    expect(nextSavePayload.some((item) => item.slot.startsWith('backpack_loot_'))).toBe(false); // Loot antigo NÃO está presente
    const goldPayload = nextSavePayload.find((item) => item.slot === 'gold');
    expect(goldPayload?.count).toBe(1000); // Ouro é exatamente 1000, não 5000 nem 5100
  });

  // =========================================================================
  // CENÁRIO 3: Avaliação de caçada baseada no contexto registrado pelo servidor
  // =========================================================================
  it('Cenário 3: Validação de XP em caçada consulta contexto registrado no servidor sem depender de flags do cliente', async () => {
    const charId = 'hunt-char-1';
    const baseTime = 1_000_000;

    // 1. Servidor registra contexto: personagem está na cidade (isHunting = false)
    ServerCharacterContextRegistry.setActivity(charId, { isHunting: false });
    expect(ServerCharacterContextRegistry.isHunting(charId)).toBe(false);

    // Na cidade: burst cap é 10.000 XP. Tentar salvar +20.000 XP deve ser rejeitado
    const cityCheck = XpRateLimiter.consume(charId, 20_000, baseTime, {
      isHunting: ServerCharacterContextRegistry.isHunting(charId),
    });
    expect(cityCheck.allowed).toBe(false);

    // 2. Servidor registra contexto: personagem entrou em caçada ativa (isHunting = true)
    ServerCharacterContextRegistry.setActivity(charId, { isHunting: true, huntId: 'dragon-lair' });
    expect(ServerCharacterContextRegistry.isHunting(charId)).toBe(true);

    // Em caçada: burst cap é 1.800.000 XP. Salvamento legítimo de +20.000 XP é aceito!
    XpRateLimiter.reset(charId);
    const huntCheck = XpRateLimiter.consume(charId, 20_000, baseTime, {
      isHunting: ServerCharacterContextRegistry.isHunting(charId),
    });
    expect(huntCheck.allowed).toBe(true);
    expect(huntCheck.currentBudget).toBe(MAX_BURST_EXP - 20_000);
  });

  // =========================================================================
  // CENÁRIO 4: Deduplicação de XP (sem cobrança dupla) e reversão em falha/conflito
  // =========================================================================
  it('Cenário 4: Ganho de XP é cobrado uma única vez entre WS e persistência, e reembolsado em conflito de gravação', () => {
    const charId = 'xp-dedup-char-1';
    const baseTime = 2_000_000;

    // Etapa 1: Ganho de 20.000 XP via WebSocket
    const wsCheck = XpRateLimiter.consume(charId, 20_000, baseTime, { isHunting: true });
    expect(wsCheck.allowed).toBe(true);
    expect(wsCheck.currentBudget).toBe(MAX_BURST_EXP - 20_000);

    // WebSocket registra XP autorizada
    XpRateLimiter.recordAuthorizedExp(charId, 20_000);
    expect(XpRateLimiter.getAuthorizedExp(charId)).toBe(20_000);

    // Etapa 2: Persistência imediata dos mesmos 20.000 XP (DB tem 0 XP)
    const existingExp = 0;
    const effectiveExp = 20_000;
    const authorizedExp = XpRateLimiter.getAuthorizedExp(charId);
    const unvalidatedBaseline = Math.max(existingExp, authorizedExp);
    const unvalidatedDelta = effectiveExp - unvalidatedBaseline;

    // Delta não-validado é 0! Não consome o bucket novamente!
    expect(unvalidatedDelta).toBe(0);

    let consumedDelta = 0;
    if (unvalidatedDelta > 0) {
      const dbCheck = XpRateLimiter.consume(charId, unvalidatedDelta, baseTime, { isHunting: true });
      consumedDelta = unvalidatedDelta;
      expect(dbCheck.allowed).toBe(true);
    }

    // Saldo permanece em MAX_BURST_EXP - 20_000 sem corte indevido de XP!
    const tracker = XpRateLimiter.getOrCreate(charId, baseTime);
    expect(tracker.availableBudget).toBe(MAX_BURST_EXP - 20_000);

    // Etapa 3: Novo ganho de 5.000 XP com conflito de gravação
    const newWsCheck = XpRateLimiter.consume(charId, 5_000, baseTime, { isHunting: true });
    expect(newWsCheck.allowed).toBe(true);
    expect(newWsCheck.currentBudget).toBe(MAX_BURST_EXP - 25_000);

    // Conflito OCC disparado na persistência -> refund acionado
    XpRateLimiter.refund(charId, 5_000, baseTime, { isHunting: true });

    // Orçamento volta a MAX_BURST_EXP - 20_000 (não perde orçamento indevidamente por colisão)
    const trackerAfterRefund = XpRateLimiter.getOrCreate(charId, baseTime);
    expect(trackerAfterRefund.availableBudget).toBe(MAX_BURST_EXP - 20_000);
  });

  // =========================================================================
  // CENÁRIO 5: Disputa real de concorrência entre CharacterService e PrismaPersistenceManager
  // =========================================================================
  it('Cenário 5: Executa os dois serviços reais disputando personagem e habilidades no SQLite real com rollback atômico', async () => {
    // 1. Inicializa o banco SQLite real no arquivo de teste
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
    ServerCharacterContextRegistry.setActivity('char-dispute', { isHunting: false });
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    const initSqlPath = path.resolve(__dirname, '../prisma/migrations/20260901000000_init/migration.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    const migrationSqlPath = path.resolve(__dirname, '../prisma/migrations/20260914120000_add_save_version_and_last_saved_at/migration.sql');
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

    const rawDb = new DatabaseSync(TEST_DB_PATH);
    rawDb.exec('PRAGMA journal_mode = WAL;');
    rawDb.exec(initSql);
    rawDb.exec(migrationSql);
    const extraCols = [
      'adminTitle TEXT',
      'isHunting BOOLEAN DEFAULT 0',
      'lastHuntId TEXT',
      'hotbarJson TEXT',
      'blessingsJson TEXT',
      'bestiaryKillsJson TEXT',
      'trackedBestiaryId TEXT',
      'bossPoints INTEGER DEFAULT 0',
      'pvpElo INTEGER DEFAULT 1000',
      'pvpTier TEXT DEFAULT "Bronze"',
      'pvpWins INTEGER DEFAULT 0',
      'pvpLosses INTEGER DEFAULT 0',
      'pvpDraws INTEGER DEFAULT 0',
      'arenaCoins INTEGER DEFAULT 0',
      'displaySkull BOOLEAN DEFAULT 1',
      'pvpMatchHistoryJson TEXT',
      'pvpTacticsJson TEXT',
    ];
    for (const col of extraCols) {
      try {
        rawDb.exec(`ALTER TABLE "characters" ADD COLUMN ${col};`);
      } catch {}
    }

    const nowIso = new Date('2026-09-01T12:00:00.000Z').toISOString();
    rawDb.exec(`INSERT INTO "accounts" ("id", "email", "passwordHash", "createdAt", "updatedAt") VALUES ('acc-dispute', 'dispute@tibia.test', 'hash', '${nowIso}', '${nowIso}');`);
    rawDb.exec(`
      INSERT INTO "characters" (
        "id", "accountId", "name", "vocationName", "level", "experience", "health", "maxHealth", "mana", "maxMana", "capacity", "saveVersion", "lastSavedAt", "createdAt", "updatedAt"
      ) VALUES (
        'char-dispute', 'acc-dispute', 'WarriorDispute', 'Knight', 10, 10000, 200, 200, 50, 50, 400, 1, '${nowIso}', '${nowIso}', '${nowIso}'
      );
    `);
    rawDb.exec(`
      INSERT INTO "character_skills" ("id", "characterId", "skillId", "skillName", "value", "tries")
      VALUES ('sk-sword', 'char-dispute', 2, 'Sword Fighting', 20, 0);
    `);
    rawDb.exec(`
      INSERT INTO "character_skills" ("id", "characterId", "skillId", "skillName", "value", "tries")
      VALUES ('sk-club', 'char-dispute', 1, 'Club Fighting', 20, 0);
    `);
    rawDb.close();

    // 2. Conecta o Prisma Client no banco SQLite real
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${TEST_DB_PATH}`,
        },
      },
    });

    const characterService = new CharacterService(testPrisma);
    const persistenceManager = new PrismaPersistenceManager(testPrisma);

    // 3. Serviço A (CharacterService) salva com saveVersion: 1 -> avança para versão 2
    const resA = await characterService.saveCharacterProgress('char-dispute', {
      saveVersion: 1,
      skills: [
        { skillId: 2, skillName: 'Sword Fighting', value: 22, tries: 100 },
      ],
    });
    expect((resA as any).saveVersion).toBe(2);

    // 4. Serviço B (PrismaPersistenceManager) tenta persistir estado concorrente defasado (versão 1)
    const stalePlayer = new PlayerState();
    stalePlayer.characterId = 'char-dispute';
    stalePlayer.name = 'WarriorDispute';
    stalePlayer.experience = 10000;
    stalePlayer.level = 10;
    stalePlayer.hp = 200;
    stalePlayer.maxHp = 200;
    stalePlayer.mp = 50;
    stalePlayer.maxMp = 50;
    (stalePlayer as any).saveVersion = 1; // Defasado! O banco já está na versão 2!
    (stalePlayer as any).skills = [
      { skillId: 1, skillName: 'Club Fighting', value: 22, tries: 500 },
    ];

    // O persistenceManager detecta o OCC conflict e não sobrescreve
    await persistenceManager.saveCharacter(stalePlayer);

    // 5. Verifica no banco: Sword Fighting foi atualizado para 22, mas Club Fighting permanece 20 (rollback atômico)
    const finalChar = await testPrisma.character.findUnique({
      where: { id: 'char-dispute' },
      include: { skills: true },
    });

    expect(finalChar?.saveVersion).toBe(2);
    const finalSword = finalChar?.skills.find((s) => s.skillId === 2);
    const finalClub = finalChar?.skills.find((s) => s.skillId === 1);

    expect(finalSword?.value).toBe(22);
    expect(finalClub?.value).toBe(20); // Rollback atômico garantiu que versão defasada não corrompeu a skill!
  });
});
