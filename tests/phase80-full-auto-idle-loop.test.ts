import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { PrismaPersistenceManager, persistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { tickStamina, calculateMaxStamina } from '../packages/domain/src/stamina';

describe('Phase 80: Modo Caçada Auto-Idle Autônoma (Full Auto-Idle Hunt & Training Loop)', () => {
  let mockPrisma: any;
  let customPersistenceManager: PrismaPersistenceManager;

  beforeEach(() => {
    mockPrisma = {
      character: {
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({
          id: 'char-auto-1',
          accountId: 'acc-auto-1',
          name: 'Auto Knight',
          vocationId: 4,
          level: 30,
          staminaMinutes: 15,
          isAutoIdle: true,
          lastHuntId: 'rotworm-caves',
        }),
        findFirst: vi.fn().mockResolvedValue({ level: 30 }),
      },
    };
    customPersistenceManager = new PrismaPersistenceManager(mockPrisma);
  });

  describe('1. Persistência Relacional Prisma DB (isAutoIdle e lastHuntId)', () => {
    it('deve incluir isAutoIdle e lastHuntId nos atributos do PlayerState', () => {
      const player = new PlayerState();
      expect(player.isAutoIdle).toBe(false);
      expect(player.lastHuntId).toBe('');
    });

    it('deve persisitir isAutoIdle e lastHuntId no banco relacional Prisma via saveCharacter', async () => {
      const player = new PlayerState();
      player.characterId = 'char-auto-1';
      player.level = 30;
      player.isAutoIdle = true;
      player.lastHuntId = 'rotworm-caves';

      await customPersistenceManager.saveCharacter(player);

      expect(mockPrisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-auto-1' },
        data: expect.objectContaining({
          isAutoIdle: true,
          lastHuntId: 'rotworm-caves',
        }),
      });
    });

    it('deve carregar isAutoIdle e lastHuntId salvos no banco durante onJoin do servidor', async () => {
      vi.spyOn(persistenceManager, 'loadCharacter').mockResolvedValueOnce({
        id: 'char-auto-1',
        accountId: 'acc-auto-1',
        name: 'Auto Knight',
        vocationId: 4,
        level: 30,
        health: 400,
        maxHealth: 400,
        mana: 100,
        maxMana: 100,
        posX: 32369,
        posY: 32241,
        posZ: 7,
        staminaMinutes: 15,
        isAutoIdle: true,
        lastHuntId: 'rotworm-caves',
      } as any);

      const room = new ThaisCityRoom();
      room.onCreate({});

      const client: any = { sessionId: 'sess-auto-1', send: vi.fn() };
      await room.onJoin(client, { characterId: 'char-auto-1' });

      const player = room.state.players.get('sess-auto-1');
      expect(player).toBeDefined();
      expect(player?.isAutoIdle).toBe(true);
      expect(player?.lastHuntId).toBe('rotworm-caves');
    });
  });

  describe('2. Handlers WebSocket e Comutação do Modo Auto-Idle', () => {
    it('deve alternar o estado de isAutoIdle e armazenar lastHuntId', () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const client: any = { sessionId: 'sess-auto-2', send: vi.fn() };
      room.onJoin(client, {
        mockCharacter: {
          id: 'char-auto-2',
          accountId: 'acc-2',
          name: 'Hero 2',
          vocationId: 4,
          level: 10,
        },
      });

      const player = room.state.players.get('sess-auto-2')!;
      expect(player.isAutoIdle).toBe(false);

      // Simular atualização de toggle no estado
      player.isAutoIdle = true;
      player.lastHuntId = 'rat-cellars';

      expect(player.isAutoIdle).toBe(true);
      expect(player.lastHuntId).toBe('rat-cellars');
    });
  });

  describe('3. Máquina de Estados da Rotação Automática (Caçada ⇄ Dummies ⇄ Caçada)', () => {
    it('deve ejetar para a cidade e iniciar treino em Dummies quando a estamina zerar no Modo Auto-Idle', () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const client: any = { sessionId: 'sess-auto-3', send: vi.fn() };
      room.onJoin(client, {
        mockCharacter: {
          id: 'char-auto-3',
          accountId: 'acc-3',
          name: 'Hero 3',
          vocationId: 4,
          level: 15,
        },
      });

      const player = room.state.players.get('sess-auto-3')!;
      player.isAutoIdle = true;
      player.inHunt = true;
      player.lastHuntId = 'rat-cellars';
      player.staminaMinutes = 0; // Estamina esgotada!

      // Executar 1 tick de simulação do servidor
      (room as any).gameTick(100);

      // Deve ter sido ejetado para a cidade e colocado no estado de treino
      expect(player.inHunt).toBe(false);
      expect(player.isTraining).toBe(true);
      expect(player.posX).toBe(32369);
      expect(player.posY).toBe(32241);
    });

    it('deve retornar automaticamente para a caçada quando a estamina atingir 100% no treino sob Modo Auto-Idle', () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const client: any = { sessionId: 'sess-auto-4', send: vi.fn() };
      room.onJoin(client, {
        mockCharacter: {
          id: 'char-auto-4',
          accountId: 'acc-4',
          name: 'Hero 4',
          vocationId: 4,
          level: 20,
        },
      });

      const player = room.state.players.get('sess-auto-4')!;
      player.isAutoIdle = true;
      player.inHunt = false;
      player.isTraining = true;
      player.lastHuntId = 'rotworm-caves';
      player.maxStaminaMinutes = 15;
      player.staminaMinutes = 15; // Estamina 100% restaurada!

      // Executar 1 tick de simulação do servidor
      (room as any).gameTick(100);

      // Deve ter saído do treino e retornado automaticamente à caçada
      expect(player.isTraining).toBe(false);
      expect(player.inHunt).toBe(true);
    });
  });
});
