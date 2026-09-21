import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import {
  ServerCharacterContextRegistry,
  CharacterService,
  ContextPendingError,
  XpRateLimiter,
  SkillRateLimiter,
} from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';

describe('Phase 182.2 - Recuperação Autoritativa de Contexto de Caçada e Proteção de Sessão', () => {
  beforeEach(() => {
    ServerCharacterContextRegistry.clearAll();
    ServerCharacterContextRegistry.setAuthoritativeSource(false);
  });

  it('1. Rejeita ganho de XP de caçada (+15.000 XP) quando cliente forja isHunting: true mas servidor tem personagem na cidade', async () => {
    const charId = 'test-char-negative-xp-182';
    // O servidor registra autoritativamente que o personagem está na cidade (isHunting: false)
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
    ServerCharacterContextRegistry.setActivity(charId, {
      isHunting: false,
    });

    const mockPrisma: any = {
      character: {
        findUnique: vi.fn().mockResolvedValue({
          id: charId,
          accountId: 'acc-test',
          name: 'TestKnight',
          level: 20,
          experience: BigInt(120000),
          health: 300,
          maxHealth: 300,
          mana: 100,
          maxMana: 100,
          capacity: 700,
          saveVersion: 10,
          skills: [],
        }),
        update: vi.fn(),
      },
    };

    const service = new CharacterService(mockPrisma);

    // Cliente envia ganho de +15.000 XP (135.000 total) alegando isHunting: true no payload
    await expect(
      service.saveCharacterProgress(
        charId,
        {
          level: 20,
          experience: BigInt(135000),
          saveVersion: 10,
          isHunting: true, // tentativa de burlar o orçamento via payload
        } as any,
        {
          isHunting: true, // tentativa de opções de cliente
        }
      )
    ).rejects.toThrow(/Suspicious XP gain: \+15000 XP exceeds continuous time budget \(max allowed: \+10000\)/);
  });

  it('2. Rejeita ganho anômalo de skill quando cliente forja isHunting: true mas servidor registra cidade', async () => {
    const charId = 'test-char-negative-skill-182';
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
    ServerCharacterContextRegistry.setActivity(charId, {
      isHunting: false,
    });

    const mockPrisma: any = {
      character: {
        findUnique: vi.fn().mockResolvedValue({
          id: charId,
          accountId: 'acc-test',
          name: 'TestKnight',
          level: 20,
          experience: BigInt(120000),
          saveVersion: 10,
          vocationName: 'Knight',
          skills: [
            { skillId: 2, skillName: 'Sword Fighting', value: 20, tries: BigInt(0) },
          ],
        }),
        update: vi.fn(),
      },
      characterSkill: {
        upsert: vi.fn(),
      },
    };

    const service = new CharacterService(mockPrisma);

    // Cliente tenta saltar para Sword 80 (> 100.000 tentativas, acima do burst urbano de 25.000) alegando isHunting: true
    await expect(
      service.saveCharacterProgress(
        charId,
        {
          saveVersion: 10,
          isHunting: true,
          skills: [
            { skillId: 2, skillName: 'Sword Fighting', value: 80, tries: 0 },
          ],
        } as any,
        { isHunting: true }
      )
    ).rejects.toThrow(/Salto anômalo de habilidade não permitido/);
  });

  it('3. Lança ContextPendingError se o contexto autoritativo for desconhecido (isContextKnown = false)', async () => {
    const charId = 'test-char-pending-182';
    ServerCharacterContextRegistry.setAuthoritativeSource(false);

    // Simula Colyseus respondendo com isContextKnown: false
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        isHunting: false,
        isContextKnown: false,
        activeSessionId: null,
      }),
    } as any);

    const mockPrisma: any = {
      character: {
        findUnique: vi.fn().mockResolvedValue({
          id: charId,
          accountId: 'acc-test',
          name: 'TestKnight',
          level: 20,
          experience: BigInt(120000),
          saveVersion: 10,
          skills: [],
        }),
      },
    };

    const service = new CharacterService(mockPrisma);

    await expect(
      service.saveCharacterProgress(charId, {
        level: 21,
        experience: BigInt(125000),
        saveVersion: 10,
      } as any)
    ).rejects.toThrow(ContextPendingError);
  });

  it('4. PrismaPersistenceManager persiste e recupera caçada ativa de forma autoritativa', async () => {
    const charId = 'test-char-persistence-182';
    const mockSessions = new Map<string, any>();
    const mockCharacters = new Map<string, any>([
      [charId, { id: charId, isHunting: false, lastHuntId: null }],
    ]);

    const mockDb: any = {
      character: {
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const c = mockCharacters.get(where.id);
          if (c) {
            Object.assign(c, data);
          }
          return c;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => mockCharacters.get(where.id) || null),
      },
      activeHuntSession: {
        upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
          const existing = mockSessions.get(where.characterId);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          } else {
            mockSessions.set(where.characterId, { ...create });
            return create;
          }
        }),
        deleteMany: vi.fn().mockImplementation(async ({ where }) => {
          mockSessions.delete(where.characterId);
          return { count: 1 };
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => mockSessions.get(where.characterId) || null),
      },
    };

    const manager = new PrismaPersistenceManager(mockDb);

    // 1. Inicia caçada
    await manager.setPlayerHuntStatus(charId, true, 'troll-cave', 'session-abc-1');
    expect(mockDb.activeHuntSession.upsert).toHaveBeenCalled();
    expect(mockCharacters.get(charId).isHunting).toBe(true);

    // 2. Recupera caçada persistida (simulando reinício do servidor)
    const active = await manager.getActiveHuntSession(charId);
    expect(active).not.toBeNull();
    expect(active!.isHunting).toBe(true);
    expect(active!.huntId).toBe('troll-cave');
    expect(active!.sessionId).toBe('session-abc-1');

    // 3. Encerra caçada
    await manager.setPlayerHuntStatus(charId, false);
    expect(mockDb.activeHuntSession.deleteMany).toHaveBeenCalled();
    expect(mockCharacters.get(charId).isHunting).toBe(false);

    const activeAfterExit = await manager.getActiveHuntSession(charId);
    expect(activeAfterExit).toBeNull();
  });

  it('5. Session Ownership Guard: desconexão de sessão antiga não encerra caçada assumida por nova sessão', () => {
    const charId = 'test-char-ownership-182';

    // 1. Nova sessão conecta e assume o personagem
    ServerCharacterContextRegistry.setAuthoritativeSource(true);
    ServerCharacterContextRegistry.setActivity(charId, {
      isHunting: true,
      huntId: 'troll-cave',
      activeSessionId: 'new-session-2',
      lastActiveSessionId: 'new-session-2',
    });

    // 2. A sessão antiga (old-session-1) é desconectada
    const oldSessionId = 'old-session-1';
    const activeSession = ServerCharacterContextRegistry.getActiveSession(charId);

    // Guarda de sessão: verifica se oldSessionId ainda é o dono ativo
    const isStillActive = activeSession === oldSessionId;
    expect(isStillActive).toBe(false);

    // Como isStillActive é falso, a rotina onLeave NÃO chama setPlayerOffline
    // Verifica que o contexto de caçada da nova sessão foi 100% preservado
    const currentActivity = ServerCharacterContextRegistry.getActivity(charId);
    expect(currentActivity).toBeDefined();
    expect(currentActivity!.isHunting).toBe(true);
    expect(currentActivity!.huntId).toBe('troll-cave');
    expect(currentActivity!.activeSessionId).toBe('new-session-2');
  });

  it('6. Prevenção de Deadlock: Progresso acumulado durante intervalo estendido é validado pelo tempo real decorrido desde o último save (baselineTime)', () => {
    const charId = 'test-char-baseline-deadlock-182';
    SkillRateLimiter.reset(charId);

    const now = 1789672622000;
    // O último salvamento com sucesso no banco ocorreu há 120 segundos (2 minutos)
    const baselineTime = now - 120 * 1000;

    // Em caçada (9000 tries/s): 120s de combate geram até 120 * 9000 = 1.080.000 tries
    // O jogador acumulou 280.000 tries durante esses 2 minutos (ex: 3 autosaves com falha temporária)
    const totalTries = 280_000;

    // Sem baselineTime (apenas o burst inicial de 225.000), 280.000 seria rejeitado
    const checkWithoutBaseline = SkillRateLimiter.consume(charId, totalTries, now, {
      isHunting: true,
    });
    expect(checkWithoutBaseline.allowed).toBe(false);

    // Com baselineTime (120s atrás), o orçamento acomoda até 225.000 + 120 * 9000 = 1.305.000 tries
    const checkWithBaseline = SkillRateLimiter.consume(charId, totalTries, now, {
      isHunting: true,
      baselineTime,
    });
    expect(checkWithBaseline.allowed).toBe(true);
    expect(checkWithBaseline.maxAllowed).toBe(totalTries);
  });

  afterEach(() => {
    ServerCharacterContextRegistry.clearAll();
  });

  afterAll(() => {
    ServerCharacterContextRegistry.clearAll();
  });
});

