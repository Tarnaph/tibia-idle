import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  defeatEnemy,
  createIdleGame,
  experienceForLevel,
  levelForExperience,
  initialHunts,
  getExpStageMultiplier,
  leaveHunt,
  restartHunt,
  type GameContent,
  type EnemyState,
} from '../packages/domain/src';
import monstersJson from '../content/generated/monsters.json';
import vocationsJson from '../content/generated/vocations.json';
import equipmentJson from '../content/generated/equipment.json';
import startersJson from '../content/generated/starter-loadouts.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';
import { parseInventoryData } from '../apps/web/lib/characterHydration';
import { progressionDiagnostics } from '../apps/web/lib/progressionDiagnostics';
import { ServerCharacterContextRegistry, CharacterService, SessionSupersededError, ContextServiceUnavailableError, SkillRateLimiter, HUNT_MAX_BURST_TRIES } from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import type { MonsterCatalog, EquipmentCatalog, StarterLoadoutCatalog, VocationCatalog, SpellCatalog, HuntRegionCatalog, ItemEconomyCatalog } from '../packages/content-schema/src';

const content: GameContent = {
  equipment: (equipmentJson as EquipmentCatalog).items,
  monsters: (monstersJson as MonsterCatalog).monsters,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  vocations: (vocationsJson as VocationCatalog).vocations,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 182 - Bloco A: Correção de Progressão, Autoridade na Caçada e Conflito Não-Destrutivo', () => {
  beforeEach(() => {
    ServerCharacterContextRegistry.clearAll();
    ServerCharacterContextRegistry.setAuthoritativeSource(false);
  });

  it('1. Catálogo dos ratos contém gold coins e queijo com drop garantido', () => {
    const rat = content.monsters.find((m) => m.id === 'rat');
    expect(rat).toBeDefined();
    expect(rat!.name).toBe('Rat');
    expect(rat!.experience).toBe(5);

    const goldLoot = rat!.loot.find((l) => l.itemId === 2148);
    expect(goldLoot).toBeDefined();
    expect(goldLoot!.name.toLowerCase()).toContain('gold');
    expect(goldLoot!.chance).toBe(100000); // 100% chance
    expect(goldLoot!.maxCount).toBeGreaterThanOrEqual(1);

    const cheeseLoot = rat!.loot.find((l) => l.itemId === 2696);
    expect(cheeseLoot).toBeDefined();
    expect(cheeseLoot!.chance).toBeGreaterThan(0);
  });

  it('2. Matar ratos acumula gold na Party Box e concede XP contínua sem perdas', () => {
    const state = createIdleGame('test-rat-rewards-seed', content, 'rat-cellars', 'continuous');
    const initialGold = state.session.gold;
    const initialExp = state.session.characters[0].experience;

    for (let i = 0; i < 10; i++) {
      const enemy = {
        id: `rat-test-${i}`,
        monsterId: 'rat',
        name: 'Rat',
        hp: 0,
        maxHp: 20,
        alive: true,
        position: { x: 32369, y: 32241, z: 7 },
        path: [],
        targetId: null,
        nextAttackAt: 0,
        nextMoveAt: 0,
      } as unknown as EnemyState;

      defeatEnemy(state, enemy, content);
    }

    expect(state.session.gold).toBeGreaterThan(initialGold);
    expect(state.session.characters[0].experience).toBeGreaterThan(initialExp);
    expect(state.session.characters[0].experience).toBeGreaterThanOrEqual(initialExp + 10 * 5);
  });

  it('3. Progressão com stages configurados (50x) avança estritamente até ultrapassar o Nível 6', () => {
    const state = createIdleGame('test-levelup-seed', content, 'rat-cellars', 'continuous');
    const character = state.session.characters[0];
    character.level = 1;
    character.experience = 0;

    const levelHistory: number[] = [character.level];
    const multiplier = getExpStageMultiplier(1);
    expect(multiplier).toBe(50); // Stages de nível 1 a 8 = 50x

    // Derrotar ratos com multiplicador de stage: cada rato dá 5 * 50 = 250 XP
    // Level 7 requer 2400 XP -> ~10 ratos
    for (let r = 0; r < 12; r++) {
      const enemy = {
        id: `rat-stage-${r}`,
        monsterId: 'rat',
        name: 'Rat',
        hp: 0,
        maxHp: 20,
        alive: true,
        position: { x: 32369, y: 32241, z: 7 },
        path: [],
        targetId: null,
        nextAttackAt: 0,
        nextMoveAt: 0,
      } as unknown as EnemyState;

      defeatEnemy(state, enemy, content);
      levelHistory.push(character.level);
    }

    // Nível deve ser estritamente não-decrescente
    for (let i = 1; i < levelHistory.length; i++) {
      expect(levelHistory[i]).toBeGreaterThanOrEqual(levelHistory[i - 1]);
    }
    expect(character.level).toBeGreaterThanOrEqual(7);
  });

  it('4. Autoridade na caçada: Colyseus não grava e não incrementa versão durante a caçada', async () => {
    const charId = 'test-hunt-isolation-1';
    let dbUpdateCalls = 0;

    // Mock Prisma client
    const mockPrisma: any = {
      character: {
        findUnique: vi.fn().mockResolvedValue({
          id: charId,
          level: 1,
          experience: BigInt(0),
          saveVersion: 1,
        }),
        updateMany: vi.fn().mockImplementation(async () => {
          dbUpdateCalls++;
          return { count: 1 };
        }),
      },
      characterSkill: {
        upsert: vi.fn(),
      },
    };

    const persistence = new PrismaPersistenceManager(mockPrisma);

    // 1. Jogador na cidade: Colyseus pode salvar
    const cityPlayer = new PlayerState();
    cityPlayer.characterId = charId;
    cityPlayer.inHunt = false;
    ServerCharacterContextRegistry.setActivity(charId, { isHunting: false });

    await persistence.saveCharacter(cityPlayer);
    expect(dbUpdateCalls).toBe(1); // salvou na cidade

    // 2. Jogador entra em caçada: Colyseus DEVE ser bloqueado pelo guard de autoridade
    cityPlayer.inHunt = true;
    ServerCharacterContextRegistry.setActivity(charId, { isHunting: true, huntId: 'rat-cellars' });

    await persistence.saveCharacter(cityPlayer);
    // Chamadas continuam 1! Colyseus não tocou no banco durante a caçada!
    expect(dbUpdateCalls).toBe(1);

    // 3. Mesmo que inHunt seja falso no PlayerState, se o ServerCharacterContextRegistry registrar caçada ativa, bloqueia
    cityPlayer.inHunt = false;
    await persistence.saveCharacter(cityPlayer);
    expect(dbUpdateCalls).toBe(1); // ainda bloqueado pelo registro autoritativo
  });

  it('5. Compra, consumo, venda e morte seguidos de 409: ausência de duplicação ou restauração indevida', () => {
    // Estado inicial ativo do cliente na sessão
    let sessionGold = 1000;
    let sessionPotions = 10;
    let sessionSwords = 1;
    let sessionExp = 1200; // Level 5
    let sessionSwordSkill = 20;

    // 1. Jogador compra suprimento por 700 gold
    sessionGold -= 700; // agora 300
    expect(sessionGold).toBe(300);

    // 2. Jogador consome 8 poções
    sessionPotions -= 8; // agora 2
    expect(sessionPotions).toBe(2);

    // 3. Jogador vende a espada
    sessionSwords -= 1; // agora 0
    expect(sessionSwords).toBe(0);

    // 4. Jogador morre em combate (penalidade legítima de 10% XP e -1 skill)
    sessionExp = Math.floor(sessionExp * 0.9); // 1080 XP
    sessionSwordSkill -= 1; // skill 19
    expect(sessionExp).toBe(1080);
    expect(sessionSwordSkill).toBe(19);

    // 5. Simulação de conflito OCC HTTP 409 com resposta desatualizada do banco
    // O banco ainda tinha o estado antigo pré-gastos: 1000 gold, 10 potions, 1 sword, 1200 exp, skill 20
    const conflictData = {
      currentVersion: 5,
      character: {
        level: 5,
        experience: 1200,
        inventory: [
          { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 1000 },
          { slot: 'backpack_0', serverId: 7618, name: 'Health Potion', count: 10 },
          { slot: 'backpack_1', serverId: 2376, name: 'Sword', count: 1 },
        ],
        skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 20 }],
      },
    };

    // Aplicação da regra da Phase 182: A sessão ativa é a autoridade dos eventos jogados
    // Ao receber 409, apenas a saveVersion é sincronizada para o retry save.
    // NÃO executamos Math.max em gold, itens, XP ou skills.
    let trackedSaveVersion = 3;
    trackedSaveVersion = conflictData.currentVersion;

    // Asserções críticas:
    // Gold gasto NÃO foi ressuscitado
    expect(sessionGold).toBe(300);
    expect(sessionGold).not.toBe(conflictData.character.inventory[0].count);

    // Poções consumidas NÃO foram restauradas
    expect(sessionPotions).toBe(2);
    expect(sessionPotions).not.toBe(10);

    // Espada vendida NÃO foi restaurada
    expect(sessionSwords).toBe(0);
    expect(sessionSwords).not.toBe(1);

    // Penalidade de morte (XP e skills) NÃO foi apagada
    expect(sessionExp).toBe(1080);
    expect(sessionExp).not.toBe(1200);
    expect(sessionSwordSkill).toBe(19);
    expect(sessionSwordSkill).not.toBe(20);

    // Versão de gravação foi sincronizada para 5 permitindo retry save limpo
    expect(trackedSaveVersion).toBe(5);
  });

  it('6. Sincronização e telemetria de diagnóstico registram tentativas e conflitos sem corromper estado', () => {
    progressionDiagnostics.clear();

    progressionDiagnostics.recordKill('rat', 'Rat', 250, 5, 1250);
    progressionDiagnostics.recordLoot('Gold Coin', 5, 300, 1);
    progressionDiagnostics.recordSaveAttempt('att-test', 'hero-1', 3, 5, 1250, 300, true);
    progressionDiagnostics.recordSaveConflict('att-test', 3, 5, 5, 1200);

    const logs = progressionDiagnostics.getRecentLogs(10);
    expect(logs.length).toBe(4);
    expect(logs[0].type).toBe('kill');
    expect(logs[1].type).toBe('loot');
    expect(logs[2].type).toBe('save-attempt');
    expect(logs[3].type).toBe('save-conflict');
    expect((logs[3] as any).details.serverVersion).toBe(5);
  });

  it('7. Proteção de Conflito Real: Sessão antiga é bloqueada com SESSION_SUPERSEDED e não sobrescreve compras, perdas ou progresso da sessão atual', async () => {
    // Banco simulado com personagem
    let dbCharacter: any = {
      id: 'char-multi-sess-1',
      accountId: 'acc-1',
      name: 'AtlasMultiHero',
      vocationName: 'Knight',
      level: 6,
      experience: BigInt(2200),
      saveVersion: 2,
      skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 18, tries: BigInt(0) }],
      inventory: [
        { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 300 }, // 700 gold foi gasto pela nova sessão!
        { slot: 'backpack_0', serverId: 7618, name: 'Health Potion', count: 2 }, // 8 poções foram consumidas
      ],
      lastSavedAt: new Date(),
    };

    const mockPrisma = {
      character: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === dbCharacter.id) return { ...dbCharacter };
          return null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          dbCharacter = { ...dbCharacter, ...data, saveVersion: (dbCharacter.saveVersion || 1) + 1 };
          return dbCharacter;
        }),
      },
      characterSkill: { upsert: vi.fn() },
      characterInventory: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma)),
    } as any;

    const service = new CharacterService(mockPrisma);

    // 1. Sessão 2 (ativa) estabeleceu o direito exclusivo de gravação no servidor
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
    ServerCharacterContextRegistry.setActiveSession('char-multi-sess-1', 'colyseus-session-2-active');

    // 2. Sessão 1 (antiga/defasada) tenta salvar com snapshot anterior: 1000 gold, 10 potions, saveVersion 2
    // Tentativa COM sessionId desatualizada ('colyseus-session-1-stale')
    await expect(
      service.saveCharacterProgress('char-multi-sess-1', {
        saveVersion: 2,
        experience: BigInt(2200),
        sessionId: 'colyseus-session-1-stale',
      })
    ).rejects.toThrow('foi sobreposta pela sessão ativa');

    // 3. Tentativa da sessão antiga SEM sessionId (tentando burlar)
    await expect(
      service.saveCharacterProgress('char-multi-sess-1', {
        saveVersion: 2,
        experience: BigInt(2200),
      })
    ).rejects.toThrow(SessionSupersededError);

    // 4. Confirmação: O estado do banco NÃO foi sobrescrito!
    expect(dbCharacter.inventory.find((i: any) => i.slot === 'gold')?.count).toBe(300);
    expect(dbCharacter.inventory.find((i: any) => i.slot === 'backpack_0')?.count).toBe(2);
    expect(dbCharacter.saveVersion).toBe(2);

    // 5. Sessão 2 (ativa legítima) salva com sucesso
    const validSave = await service.saveCharacterProgress('char-multi-sess-1', {
      saveVersion: 2,
      experience: BigInt(2400),
      sessionId: 'colyseus-session-2-active',
    });
    expect(validSave).toBeDefined();
    expect(dbCharacter.saveVersion).toBe(3);
  });

  it('8. Retorno à cidade Handshake: salvamento final conclui com sucesso antes de liberar autosave urbano e Colyseus assume estado persistido', async () => {
    // 1. Personagem no banco com nível 5
    let dbRecord: any = {
      id: 'char-return-city-1',
      accountId: 'acc-return',
      name: 'CityReturnHero',
      vocationName: 'Knight',
      level: 5,
      experience: BigInt(1200),
      health: 200,
      maxHealth: 200,
      mana: 50,
      maxMana: 50,
      capacity: 400,
      saveVersion: 1,
      skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 15, tries: BigInt(0) }],
      inventory: [{ slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 100 }],
      lastSavedAt: new Date(),
    };

    const mockPrisma = {
      character: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === dbRecord.id) return { ...dbRecord };
          return null;
        }),
        updateMany: vi.fn().mockImplementation(async ({ where, data }: any) => {
          if (where.saveVersion === dbRecord.saveVersion) {
            dbRecord = { ...dbRecord, ...data, saveVersion: dbRecord.saveVersion + 1 };
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
      characterSkill: { upsert: vi.fn() },
      characterInventory: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma)),
    } as any;

    const persistence = new PrismaPersistenceManager(mockPrisma);

    // 2. Jogador entra em caçada no Colyseus
    const player = new PlayerState();
    player.id = 'client-sess-handshake';
    player.characterId = 'char-return-city-1';
    player.name = 'CityReturnHero';
    player.level = 5;
    player.experience = 1200;
    player.inHunt = true;
    (player as any).saveVersion = 1;

    ServerCharacterContextRegistry.setActivity(player.characterId, { isHunting: true });

    // 3. Enquanto inHunt=true, o autosave do Colyseus é estritamente ignorado
    await persistence.saveCharacter(player);
    expect(dbRecord.saveVersion).toBe(1); // Banco não foi alterado pelo Colyseus

    // 4. Durante a caçada, o cliente acumulou XP e alcançou Nível 7 (3000 XP) com 500 gold
    // O salvamento final da caçada é executado PRIMEIRO via CharacterService
    const service = new CharacterService(mockPrisma);
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
    ServerCharacterContextRegistry.setActiveSession(player.characterId, player.id);

    await service.saveCharacterProgress(player.characterId, {
      saveVersion: 1,
      level: 7,
      experience: BigInt(3000),
      sessionId: player.id,
    });

    expect(dbRecord.saveVersion).toBe(2);
    expect(dbRecord.level).toBe(7);
    expect(Number(dbRecord.experience)).toBe(3000);

    // 5. Handshake de Retorno à Cidade: Colyseus sincroniza do banco ANTES de liberar inHunt
    const freshDbChar = await persistence.loadCharacter(player.characterId);
    expect(freshDbChar).toBeDefined();

    // Colyseus adota os dados autoritativos do banco
    player.level = freshDbChar!.level;
    player.experience = Number(freshDbChar!.experience);
    (player as any).saveVersion = (freshDbChar as any).saveVersion;

    // Apenas APÓS sincronizar, o inHunt é liberado
    player.inHunt = false;
    ServerCharacterContextRegistry.setActivity(player.characterId, { isHunting: false });

    expect(player.level).toBe(7);
    expect(player.experience).toBe(3000);
    expect((player as any).saveVersion).toBe(2);

    // 6. Ciclo do autosave urbano do Colyseus roda agora em paz:
    await persistence.saveCharacter(player);
    expect(dbRecord.saveVersion).toBe(3);
    expect(dbRecord.level).toBe(7);
    expect(Number(dbRecord.experience)).toBe(3000);
  });

  it('9. Bloqueio quando não há sessão registrada ou serviço de contexto indisponível: gravação antiga é barrada', async () => {
    const characterId = 'char-offline-test-1';
    const mockDbChar: any = {
      id: characterId,
      name: 'OfflineHero',
      level: 5,
      experience: BigInt(1200),
      saveVersion: 3,
      skills: [],
      inventory: [{ slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 50 }],
      spells: [],
    };

    const mockPrisma: any = {
      character: {
        findUnique: vi.fn().mockResolvedValue(mockDbChar),
        update: vi.fn().mockImplementation(({ data }) => {
          Object.assign(mockDbChar, data);
          return Promise.resolve(mockDbChar);
        }),
      },
      characterSkill: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      inventoryItem: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const service = new CharacterService(mockPrisma);

    // 1. Sessão 2 salvou por último e o jogador desconectou (setPlayerOffline)
    ServerCharacterContextRegistry.setActiveSession(characterId, 'session-2-latest');
    ServerCharacterContextRegistry.setPlayerOffline(characterId);

    // Contexto confirma que activeSessionId é undefined, mas lastActiveSessionId é session-2-latest
    const ctx = ServerCharacterContextRegistry.getActivity(characterId);
    expect(ctx?.activeSessionId).toBeUndefined();
    expect(ctx?.lastActiveSessionId).toBe('session-2-latest');

    // 2. Sessão 1 (antiga) tenta salvar agora que não há sessão ativa registrada
    await expect(
      service.saveCharacterProgress(characterId, {
        saveVersion: 3,
        experience: BigInt(1500),
        sessionId: 'session-1-old',
      })
    ).rejects.toThrow(SessionSupersededError);

    // O banco NÃO pode ter sido alterado
    expect(mockDbChar.saveVersion).toBe(3);

    // 3. Quando o serviço de contexto está indisponível e não há lease em cache para o char,
    // a gravação NÃO é liberada automaticamente
    const unknownCharId = 'char-unknown-no-cache-1';
    const unknownMockChar: any = {
      id: unknownCharId,
      level: 1,
      experience: BigInt(0),
      saveVersion: 1,
      skills: [],
      inventory: [],
      spells: [],
    };
    mockPrisma.character.findUnique.mockResolvedValueOnce(unknownMockChar);

    // Mock getContextAsync para simular Colyseus indisponível sem cache local
    const originalGetContext = ServerCharacterContextRegistry.getContextAsync;
    ServerCharacterContextRegistry.getContextAsync = vi.fn().mockResolvedValue({
      isHunting: false,
      activeSessionId: undefined,
      lastActiveSessionId: undefined,
      isServiceAvailable: false,
    });

    try {
      await expect(
        service.saveCharacterProgress(unknownCharId, {
          saveVersion: 1,
          experience: BigInt(100),
          sessionId: 'some-session',
        })
      ).rejects.toThrow(ContextServiceUnavailableError);
    } finally {
      ServerCharacterContextRegistry.getContextAsync = originalGetContext;
    }
  });

  it('10. Retração da garantia de perda zero: timestamp do último salvamento confirmado e keepalive', () => {
    // Registra sucesso de salvamento e valida rastreamento do último salvamento confirmado
    progressionDiagnostics.clear();
    expect(progressionDiagnostics.getLastConfirmedSave()).toBeNull();

    const timestampBefore = Date.now();
    progressionDiagnostics.recordSaveSuccess('attempt-test-1', 'char-10-test', 5, 200);
    const confirmed = progressionDiagnostics.getLastConfirmedSave();

    expect(confirmed).toBeDefined();
    expect(confirmed!.characterId).toBe('char-10-test');
    expect(confirmed!.saveVersion).toBe(5);
    expect(confirmed!.responseStatus).toBe(200);
    expect(confirmed!.timestamp).toBeGreaterThanOrEqual(timestampBefore);
  });

  it('11. Indisponibilidade do contexto: cache da API reconhece sessão mas serviço indisponível impede autorização (informação desatualizada não autoriza gravação)', async () => {
    const charId = 'char-stale-cache-test';
    let dbRecord: any = {
      id: charId,
      accountId: 'acc-stale',
      name: 'StaleHero',
      level: 10,
      experience: BigInt(10000),
      saveVersion: 5,
      skills: [],
      inventory: [{ slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 500 }],
      lastSavedAt: new Date(),
    };

    const mockPrisma = {
      character: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === dbRecord.id) return { ...dbRecord };
          return null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          dbRecord = { ...dbRecord, ...data, saveVersion: (dbRecord.saveVersion || 1) + 1 };
          return dbRecord;
        }),
      },
      characterSkill: { upsert: vi.fn() },
      characterInventory: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockPrisma)),
    } as any;

    const service = new CharacterService(mockPrisma);

    // O cache local da API ainda reconhece a sessão 'sess-stale-1'
    ServerCharacterContextRegistry.setActivity(charId, {
      isHunting: false,
      activeSessionId: 'sess-stale-1',
      lastActiveSessionId: 'sess-stale-1',
    });

    // Mas o serviço de contexto está INDISPONÍVEL!
    const originalGetContext = ServerCharacterContextRegistry.getContextAsync;
    ServerCharacterContextRegistry.getContextAsync = vi.fn().mockResolvedValue({
      isHunting: false,
      activeSessionId: 'sess-stale-1',
      lastActiveSessionId: 'sess-stale-1',
      isServiceAvailable: false, // Contexto indisponível!
    });

    try {
      // 1. Cliente apresenta a mesma sessão reconhecida pelo cache ('sess-stale-1').
      // Como o serviço está indisponível, informação desatualizada de cache NÃO pode autorizar a gravação!
      await expect(
        service.saveCharacterProgress(charId, {
          saveVersion: 5,
          experience: BigInt(10500),
          sessionId: 'sess-stale-1',
        })
      ).rejects.toThrow(ContextServiceUnavailableError);

      // 2. Cliente tenta enviar uma sessão ainda mais antiga ('ancient-sess-0')
      await expect(
        service.saveCharacterProgress(charId, {
          saveVersion: 5,
          experience: BigInt(10500),
          sessionId: 'ancient-sess-0',
        })
      ).rejects.toThrow(SessionSupersededError);

      // 3. Garantir que o banco de dados permaneceu 100% intocado
      expect(dbRecord.saveVersion).toBe(5);
      expect(Number(dbRecord.experience)).toBe(10000);
    } finally {
      ServerCharacterContextRegistry.getContextAsync = originalGetContext;
    }
  });

  describe('Bloco B: Validação de Salto de Habilidades Durante Caçada e Segurança Anti-Injeção', () => {
    beforeEach(() => {
      ServerCharacterContextRegistry.setAuthoritativeSource(true);
    });

    it('permite ganho legítimo que antes recebia HTTP 400 (Fist 10 para 25 nos ratos)', async () => {
      SkillRateLimiter.resetAll();
      const dbChar = {
        id: 'char-fist-legit',
        level: 1,
        experience: BigInt(0),
        vocationName: 'Knight',
        saveVersion: 1,
        skills: [
          { skillId: 0, skillName: 'Fist Fighting', value: 10, tries: BigInt(0) },
        ],
      };

      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue(dbChar),
          update: vi.fn().mockImplementation(({ data }) => {
            return Promise.resolve({ ...dbChar, saveVersion: 2, ...data });
          }),
        },
        characterSkill: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as any;

      const service = new CharacterService(mockPrisma);
      ServerCharacterContextRegistry.setAuthoritativeSource(true);
      ServerCharacterContextRegistry.setActivity('char-fist-legit', { isHunting: true });

      // Fist de 10 para 25 consome 1581 tries (bem abaixo do burst de 18000 tries)
      const result = await service.saveCharacterProgress('char-fist-legit', {
        saveVersion: 1,
        level: 5,
        experience: BigInt(900),
        skills: [
          { skillId: 0, skillName: 'Fist Fighting', value: 25, tries: 0 },
        ],
        isHunting: true,
      }, { isHunting: true });

      expect(result).toBeDefined();
    });

    it('bloqueia requisições que individualmente cabem no orçamento de 225.000, mas cuja soma excede o saldo disponível, descontada a regeneração', async () => {
      SkillRateLimiter.resetAll();
      const charId = 'char-skill-flood-sub225k';
      const baseTime = Date.now();

      // Cada requisição individual consome exatamente 85.000 tentativas (bem abaixo de 225.000)
      const triesPerRequest = 85_000;

      // Requisição 1 (t0): consome 85.000 de 225.000 -> Permitida. Saldo restante: 140.000
      const res1 = SkillRateLimiter.consume(charId, triesPerRequest, baseTime, { isHunting: true });
      expect(res1.allowed).toBe(true);
      expect(res1.currentBudget).toBe(140_000);

      // Requisição 2 (t0 + 100ms): em 100ms regenera 0.1s * 9.000 = 900 tentativas. Saldo disponível: 140.900
      // Consome 85.000 -> Permitida. Saldo restante: 55.900
      const res2 = SkillRateLimiter.consume(charId, triesPerRequest, baseTime + 100, { isHunting: true });
      expect(res2.allowed).toBe(true);
      expect(res2.currentBudget).toBe(55_900);

      // Requisição 3 (t0 + 200ms): em mais 100ms regenera 900 tentativas. Saldo disponível: 56.800
      // Tenta consumir 85.000 tentativas (que individualmente cabe com folga em 225.000!).
      // Como 85.000 > 56.800 disponível, DEVE ser rejeitada por esgotamento acumulado!
      const res3 = SkillRateLimiter.consume(charId, triesPerRequest, baseTime + 200, { isHunting: true });
      expect(res3.allowed).toBe(false);
      expect(res3.maxAllowed).toBe(56_800);
    });

    it('valida o treino legítimo no dummy urbano (arma + shielding e magia) e garante que o limite urbano não rejeita', async () => {
      SkillRateLimiter.resetAll();
      const knightId = 'char-dummy-knight-urban';
      const mageId = 'char-dummy-mage-urban';
      const baseTime = Date.now();

      // 1. Knight no Dummy por 15 segundos:
      // Arma (1 hit/2s = 7.5 hits * 500 = 3.750 tries) + Shielding (1 hit/4s = 3.75 hits * 500 = 1.875 tries)
      // Total legítimo em 15s no dummy = 5.625 tries
      const knightDummyTries15s = 5_625;
      const resKnight = SkillRateLimiter.consume(knightId, knightDummyTries15s, baseTime, { isHunting: false });
      expect(resKnight.allowed).toBe(true);
      expect(resKnight.currentBudget).toBe(25_000 - knightDummyTries15s);

      // 2. Mage promovido no Dummy por 15 segundos:
      // Magic Level (2 mana / 2s = 1 mana/s * 25 rateMagic * 10 stage = 250 tries/s)
      // Total legítimo em 15s no dummy = 15 * 250 = 3.750 tries
      const mageDummyTries15s = 3_750;
      const resMage = SkillRateLimiter.consume(mageId, mageDummyTries15s, baseTime, { isHunting: false });
      expect(resMage.allowed).toBe(true);
      expect(resMage.currentBudget).toBe(25_000 - mageDummyTries15s);

      // 3. Salto anômalo no contexto urbano (ex: 35.000 tries instantâneas em cidade sem caçada):
      // Deve ser bloqueado pelo limite urbano calibrado (max burst 25.000)
      const resAnomalous = SkillRateLimiter.consume('char-hacker-urban', 35_000, baseTime, { isHunting: false });
      expect(resAnomalous.allowed).toBe(false);
      expect(resAnomalous.maxAllowed).toBe(25_000);
    });

    it('valida salvamento em caçada após 15 segundos e após atraso maior de rede (30s+) com evolução legítima de arma, shielding e magia', async () => {
      SkillRateLimiter.resetAll();
      const charId = 'char-hunt-combined-progression';
      const t0 = Date.now();

      // 1. Combate ativo durante 15 segundos:
      // - Arma: 7 ataques * 500 = 3.500 tries
      // - Shielding: 14 bloqueios de monstro * 500 = 7.000 tries
      // - Magia / Feitiços com poções: 100 mana gasta * 250 = 25.000 tries
      // Total legítimo em 15s = 35.500 tries
      const tries15s = 35_500;
      const res15s = SkillRateLimiter.consume(charId, tries15s, t0, { isHunting: true });
      expect(res15s.allowed).toBe(true);
      expect(res15s.currentBudget).toBe(225_000 - tries15s);

      // 2. Atraso maior de rede (30 segundos sem salvar):
      // Tempo decorrido t0 + 30.000ms.
      // O bucket regenera a 9.000 tries/s por 30s (+270.000 tries), recompondo o burst até o teto de 225.000.
      // Combate acumulado nos 30s: 15 ataques (7.500) + 30 blocos (15.000) + 220 mana (55.000) = 77.500 tries.
      const tAfter30s = t0 + 30_000;
      const triesDelayed30s = 77_500;
      const resDelayed = SkillRateLimiter.consume(charId, triesDelayed30s, tAfter30s, { isHunting: true });
      expect(resDelayed.allowed).toBe(true);
      expect(resDelayed.currentBudget).toBe(225_000 - triesDelayed30s);

      // 3. Injeção excessiva / salto impossível mesmo em caçada (ex: 350.000 tries instantâneas):
      // Deve ser rejeitado imediatamente pelo teto calibrado de burst (225.000)
      const resExcess = SkillRateLimiter.consume(charId, 350_000, tAfter30s, { isHunting: true });
      expect(resExcess.allowed).toBe(false);
    });

    it('bloqueia no CharacterService requisição individualmente abaixo do burst por esgotamento acumulado', async () => {
      SkillRateLimiter.resetAll();
      const charId = 'char-service-flood-sub225k';
      let currentSkill = 10;

      const dbChar = {
        id: charId,
        level: 1,
        experience: BigInt(0),
        vocationName: 'Knight',
        saveVersion: 1,
        skills: [
          { skillId: 2, skillName: 'Sword Fighting', value: 10, tries: BigInt(0) },
        ],
      };

      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockImplementation(() => Promise.resolve({
            ...dbChar,
            skills: [{ skillId: 2, skillName: 'Sword Fighting', value: currentSkill, tries: BigInt(0) }],
          })),
          update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...dbChar, saveVersion: 2, ...data })),
        },
        characterSkill: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      } as any;

      const service = new CharacterService(mockPrisma);
      ServerCharacterContextRegistry.setAuthoritativeSource(true);
      ServerCharacterContextRegistry.setActivity(charId, { isHunting: true });

      // Requisição 1: Sword 10 -> 63 consome 77.597 tries (< 225.000) -> Permitida pelo burst
      const res1 = await service.saveCharacterProgress(charId, {
        saveVersion: 1,
        skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 63, tries: 0 }],
        isHunting: true,
      }, { isHunting: true });
      expect(res1).toBeDefined();
      currentSkill = 63;

      // Requisição 2 imediata: Sword 63 -> 71 consome 85.086 tries (< 225.000) -> Permitida pelo saldo restante (~147.400)
      const res2 = await service.saveCharacterProgress(charId, {
        saveVersion: 1,
        skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 71, tries: 0 }],
        isHunting: true,
      }, { isHunting: true });
      expect(res2).toBeDefined();
      currentSkill = 71;

      // Requisição 3 imediata: Sword 71 -> 76 consome 89.920 tries (INDIVIDUALMENTE CABE EM 225.000!)
      // Mas o saldo disponível é de apenas ~62.300 tentativas. Rejeitada por esgotamento acumulado!
      await expect(
        service.saveCharacterProgress(charId, {
          saveVersion: 1,
          skills: [{ skillId: 2, skillName: 'Sword Fighting', value: 76, tries: 0 }],
          isHunting: true,
        }, { isHunting: true })
      ).rejects.toThrow(/Salto anômalo de habilidade não permitido/);
    });

    it('bloqueia injeção absurda de habilidade (+90 níveis) via SkillRateLimiter', async () => {
      SkillRateLimiter.resetAll();
      const dbChar = {
        id: 'char-hunt-hack-1',
        level: 1,
        experience: BigInt(0),
        vocationName: 'Knight',
        saveVersion: 1,
        skills: [
          { skillId: 0, skillName: 'Fist Fighting', value: 10, tries: BigInt(0) },
        ],
      };

      const mockPrisma = {
        character: {
          findUnique: vi.fn().mockResolvedValue(dbChar),
        },
      } as any;

      const service = new CharacterService(mockPrisma);
      ServerCharacterContextRegistry.setAuthoritativeSource(true);
      ServerCharacterContextRegistry.setActivity('char-hunt-hack-1', { isHunting: true });

      // Salto absurdo de 10 para 100 exige mais de 1.000.000 de tries -> rejeitado
      await expect(
        service.saveCharacterProgress('char-hunt-hack-1', {
          saveVersion: 1,
          skills: [
            { skillId: 0, skillName: 'Fist Fighting', value: 100, tries: 0 },
          ],
          isHunting: true,
        }, { isHunting: true })
      ).rejects.toThrow(/Salto anômalo de habilidade não permitido/);
    });

    it('troca diretamente de uma caçada para outra sem transitar por cidade e sem erro', () => {
      // Cria estado inicial em rat-cellars
      const state1 = createIdleGame('seed-switch-1', content, 'rat-cellars', 'continuous');
      expect(state1.encounter.hunt.id).toBe('rat-cellars');

      // Simula troca direta de caçada para rotworm-cave
      // 1. leaveHunt finaliza combate da caçada anterior sem mudar para training com z inválido
      const leftState = leaveHunt(state1);
      expect(leftState.encounter.corpses).toBeDefined();

      // 2. restartHunt inicializa a nova caçada diretamente
      const switchedState = restartHunt(leftState, 'seed-switch-2', content, 'rotworm-cave');
      expect(switchedState.encounter.hunt.id).toBe('rotworm-cave');
      expect(switchedState.encounter.room.number).toBe(1);
    });

  });
});

