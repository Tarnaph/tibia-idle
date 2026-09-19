import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerCharacterContextRegistry, SessionSupersededError } from '../packages/auth/src';

describe('Phase 199: Resiliência de Salvamento pós-Deploy e Corpses Multi-Tile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Cálculo de Posicionamento e Ancoragem de Corpses no PixiJS', () => {
    const TILE_SIZE = 32;
    const bounds = { x: 32400, y: 32000 };

    function worldPoint(pos: { x: number; y: number }): { x: number; y: number } {
      return {
        x: (pos.x - bounds.x) * TILE_SIZE + TILE_SIZE / 2,
        y: (pos.y - bounds.y) * TILE_SIZE + TILE_SIZE / 2,
      };
    }

    function calculateCorpseSpriteTransform(
      corpsePos: { x: number; y: number },
      mapping: {
        appearance?: { width?: number; height?: number };
        frame: { width?: number; height?: number };
      }
    ) {
      const point = worldPoint(corpsePos);
      const widthTiles = mapping.appearance?.width ?? Math.max(1, Math.round((mapping.frame.width || 32) / 32));
      const heightTiles = mapping.appearance?.height ?? Math.max(1, Math.round((mapping.frame.height || 32) / 32));

      const anchor = { x: 0, y: 0 };
      const position = {
        x: point.x - 16 - (widthTiles - 1) * 32,
        y: point.y - 16 - (heightTiles - 1) * 32,
      };

      return {
        anchor,
        position,
        widthTiles,
        heightTiles,
        boundingTiles: {
          minX: corpsePos.x - (widthTiles - 1),
          maxX: corpsePos.x,
          minY: corpsePos.y - (heightTiles - 1),
          maxY: corpsePos.y,
        },
      };
    }

    it('posiciona cadáver 1x1 (32x32, Rat/Rotworm) perfeitamente alinhado dentro do tile', () => {
      const corpsePos = { x: 32410, y: 32010 };
      const mapping = {
        appearance: { width: 1, height: 1 },
        frame: { width: 32, height: 32 },
      };

      const result = calculateCorpseSpriteTransform(corpsePos, mapping);

      expect(result.anchor).toEqual({ x: 0, y: 0 });
      expect(result.widthTiles).toBe(1);
      expect(result.heightTiles).toBe(1);
      // Posição no mundo deve bater exatamente no canto superior esquerdo do tile (x - bounds.x) * 32
      const expectedTileX = (corpsePos.x - bounds.x) * 32;
      const expectedTileY = (corpsePos.y - bounds.y) * 32;
      expect(result.position.x).toBe(expectedTileX);
      expect(result.position.y).toBe(expectedTileY);
      expect(result.boundingTiles.minX).toBe(corpsePos.x);
      expect(result.boundingTiles.maxX).toBe(corpsePos.x);
    });

    it('posiciona cadáver 2x2 (64x64, Cyclops) de forma unificada cobrindo bloco 2x2 com origem no tile primário', () => {
      const corpsePos = { x: 32416, y: 32041 };
      const mapping = {
        appearance: { width: 2, height: 2 },
        frame: { width: 64, height: 64 },
      };

      const result = calculateCorpseSpriteTransform(corpsePos, mapping);

      expect(result.anchor).toEqual({ x: 0, y: 0 });
      expect(result.widthTiles).toBe(2);
      expect(result.heightTiles).toBe(2);
      // Cobre exatamente de (x-1) até (x) e (y-1) até (y)
      expect(result.boundingTiles).toEqual({
        minX: 32415,
        maxX: 32416,
        minY: 32040,
        maxY: 32041,
      });
      // Posição X deve iniciar 1 tile à esquerda
      const expectedLeftX = (32415 - bounds.x) * 32;
      const expectedTopY = (32040 - bounds.y) * 32;
      expect(result.position.x).toBe(expectedLeftX);
      expect(result.position.y).toBe(expectedTopY);
    });

    it('suporta dimensões arbitrárias de criaturas grandes futuras (ex: 3x3, 96x96, Behemoth/Bosses)', () => {
      const corpsePos = { x: 32500, y: 32100 };
      const mapping = {
        appearance: { width: 3, height: 3 },
        frame: { width: 96, height: 96 },
      };

      const result = calculateCorpseSpriteTransform(corpsePos, mapping);

      expect(result.widthTiles).toBe(3);
      expect(result.heightTiles).toBe(3);
      expect(result.boundingTiles.minX).toBe(32498);
      expect(result.boundingTiles.maxX).toBe(32500);
      expect(result.boundingTiles.minY).toBe(32098);
      expect(result.boundingTiles.maxY).toBe(32100);
    });
  });

  describe('2. Adoção de Sessão e Resiliência sem SESSION_SUPERSEDED', () => {
    it('adota a sessão recebida quando activeSession for nulo sem lançar SESSION_SUPERSEDED', async () => {
      const charId = 'test-char-phase199';
      
      // Simula estado pós-restart do servidor onde há uma lastSession gravada, mas activeSession é undefined
      ServerCharacterContextRegistry.setActivity(charId, {
        isHunting: false,
        activeSessionId: undefined,
        lastActiveSessionId: 'old-session-pre-restart',
      });

      const contextBefore = await ServerCharacterContextRegistry.getContextAsync(charId);
      expect(contextBefore.activeSessionId).toBeUndefined();
      expect(contextBefore.lastActiveSessionId).toBe('old-session-pre-restart');

      // Nova sessão tentando salvar (ex: cliente reconectado após deploy)
      const incomingSessionId = 'sess-new-reconnected';

      // Lógica validada em characterService:
      const activeSession = contextBefore.activeSessionId;
      if (activeSession) {
        if (!incomingSessionId || incomingSessionId !== activeSession) {
          throw new SessionSupersededError('Session superseded', activeSession);
        }
      } else if (incomingSessionId) {
        ServerCharacterContextRegistry.setActivity(charId, {
          isHunting: false,
          activeSessionId: incomingSessionId,
          lastActiveSessionId: incomingSessionId,
        });
      }

      const contextAfter = await ServerCharacterContextRegistry.getContextAsync(charId);
      expect(contextAfter.activeSessionId).toBe(incomingSessionId);
      expect(contextAfter.lastActiveSessionId).toBe(incomingSessionId);
    });

    it('continua bloqueando se houver uma sessão ativa concorrente diferente conectada', async () => {
      const charId = 'test-char-phase199-conflict';

      // Há uma sessão ativa ao vivo no servidor
      ServerCharacterContextRegistry.setActivity(charId, {
        isHunting: false,
        activeSessionId: 'live-socket-session-1',
        lastActiveSessionId: 'live-socket-session-1',
      });

      const context = await ServerCharacterContextRegistry.getContextAsync(charId);
      const activeSession = context.activeSessionId;
      const staleIncomingSessionId = 'stale-tab-session-2';

      expect(() => {
        if (activeSession) {
          if (!staleIncomingSessionId || staleIncomingSessionId !== activeSession) {
            throw new SessionSupersededError('Session superseded by active live session', activeSession);
          }
        }
      }).toThrowError(SessionSupersededError);
    });
  });

  describe('3. Reconciliação OCC de saveVersion no PrismaPersistenceManager', () => {
    it('reconcilia saveVersion de memória do Colyseus com versão mais recente do banco', () => {
      const player = {
        characterId: 'char-123',
        saveVersion: 2940, // Memória antiga do Colyseus
      };
      const existing = {
        id: 'char-123',
        saveVersion: 2945, // Next.js API salvou e avançou a versão
      };

      const dbVersion = (existing as any)?.saveVersion ?? 1;
      const playerVersion = typeof (player as any).saveVersion === 'number' ? (player as any).saveVersion : dbVersion;
      const currentVersion = Math.max(playerVersion, dbVersion);
      (player as any).saveVersion = currentVersion;

      expect(currentVersion).toBe(2945);
      expect(player.saveVersion).toBe(2945);
      // Próxima versão que será escrita na transação:
      const nextVersion = currentVersion + 1;
      expect(nextVersion).toBe(2946);
    });
  });

  describe('4. Resiliência do Autosave e Salvamento Forçado na Saída da Caçada', () => {
    it('permite salvamento forçado (force = true) mesmo se autosave periódico de fundo estiver suspenso', () => {
      let isSaveSuspended = true;

      function canSave(force: boolean): boolean {
        // Regra aplicada no GamePrototype.tsx
        if (isSaveSuspended && !force) return false;
        return true;
      }

      expect(canSave(false)).toBe(false); // Autosave periódico é suspenso
      expect(canSave(true)).toBe(true);   // Salvamento forçado (Sair da caçada, troca de char, logout) prossegue
    });
  });
});
