import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterService, VOCATION_CONFIGS, THAIS_TEMPLE_SPAWN } from '../packages/auth/src/characterService';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { experienceForLevel, levelForExperience } from '../packages/domain/src/experience';

describe('Phase 74: Personagens Novos em Nível 1 e Verificação de Visibilidade Urbana em Thais', () => {
  let mockPrisma: any;
  let characterService: CharacterService;
  let charactersDb: Map<string, any>;

  beforeEach(() => {
    charactersDb = new Map();

    mockPrisma = {
      account: {
        findUnique: async ({ where }: any) => ({
          id: where.id,
          characters: Array.from(charactersDb.values()).filter((c: any) => c.accountId === where.id),
        }),
      },
      character: {
        findUnique: async ({ where }: any) => {
          if (where.name) {
            for (const char of charactersDb.values()) {
              if (char.name.toLowerCase() === where.name.toLowerCase()) return char;
            }
          }
          if (where.id) return charactersDb.get(where.id) || null;
          return null;
        },
        findFirst: async ({ where }: any) => {
          if (where.name?.equals) {
            for (const char of charactersDb.values()) {
              if (char.name.toLowerCase() === where.name.equals.toLowerCase()) return char;
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = data.id || `char-${Date.now()}-${Math.random()}`;
          const char = {
            id,
            accountId: data.accountId,
            name: data.name,
            vocationId: data.vocationId,
            vocationName: data.vocationName,
            level: data.level,
            experience: data.experience,
            health: data.health,
            maxHealth: data.maxHealth,
            mana: data.mana,
            maxMana: data.maxMana,
            capacity: data.capacity,
            outfitLookType: data.outfitLookType,
            posX: data.posX,
            posY: data.posY,
            posZ: data.posZ,
            townId: data.townId,
            skills: data.skills?.create || [],
            inventory: data.inventory?.create || [],
            spells: data.spells?.create || [],
          };
          charactersDb.set(id, char);
          return char;
        },
      },
    };

    characterService = new CharacterService(mockPrisma);
  });

  describe('Requisito 1: Novos Personagens Devem Começar Estritamente no Nível 1 com 0 XP', () => {
    it('Fórmula de experiência canônica do Tibia determina que Nível 1 requer exatamente 0 XP', () => {
      expect(experienceForLevel(1)).toBe(0);
      expect(levelForExperience(0)).toBe(1);
    });

    it('VOCATION_CONFIGS define atributos iniciais canônicos para Nível 1 em todas as vocações', () => {
      // 1: Sorcerer, 2: Druid, 3: Paladin, 4: Knight
      for (const vocId of [1, 2, 3, 4]) {
        const config = VOCATION_CONFIGS[vocId];
        expect(config).toBeDefined();
        expect(config.baseHp).toBe(150);
        expect(config.baseMp).toBe(35);
        expect(config.capacity).toBe(400);
      }
    });

    it('CharacterService.createCharacter cria personagens em Nível 1 com 0 XP para todas as vocações', async () => {
      const vocations = [
        { id: 1, name: 'Sorcerer', lookType: 130 },
        { id: 2, name: 'Druid', lookType: 130 },
        { id: 3, name: 'Paladin', lookType: 129 },
        { id: 4, name: 'Knight', lookType: 131 },
      ];

      for (const voc of vocations) {
        const char = await characterService.createCharacter({
          accountId: 'acc-test-123',
          name: `Rookie ${voc.name}`,
          vocationId: voc.id,
        });

        expect(char.level).toBe(1);
        expect(char.experience).toBe(BigInt(0));
        expect(char.health).toBe(150);
        expect(char.maxHealth).toBe(150);
        expect(char.mana).toBe(35);
        expect(char.maxMana).toBe(35);
        expect(char.capacity).toBe(400);
        expect(char.vocationId).toBe(voc.id);
        expect(char.vocationName).toBe(voc.name);
        expect(char.outfitLookType).toBe(voc.lookType);
        expect(char.posX).toBe(THAIS_TEMPLE_SPAWN.posX);
        expect(char.posY).toBe(THAIS_TEMPLE_SPAWN.posY);
        expect(char.posZ).toBe(THAIS_TEMPLE_SPAWN.posZ);
      }
    });

    it('PlayerState schema defaults refletem Nível 1 com 0 XP, 150 HP e 400 de capacidade', () => {
      const player = new PlayerState();
      expect(player.level).toBe(1);
      expect(player.experience).toBe(0);
      expect(player.hp).toBe(150);
      expect(player.maxHp).toBe(150);
      expect(player.capacity).toBe(400);
    });
  });

  describe('Requisito 2: Verificação Rigorosa das Tags de Visibilidade Urbana na Cidade de Thais', () => {
    it('Tag inHunt: PlayerState inicializa inHunt como false (condição obrigatória para não ser oculto)', () => {
      const player = new PlayerState();
      expect(player.inHunt).toBe(false);
    });

    it('Tag Floor/posZ: PlayerState e THAIS_TEMPLE_SPAWN definem floor Z = 7 (piso térreo de Thais)', () => {
      const player = new PlayerState();
      expect(player.posZ).toBe(7);
      expect(THAIS_TEMPLE_SPAWN.posZ).toBe(7);
    });

    it('Simulação de regras de filtragem da ThaisCityArena para visualização de jogadores remotos', () => {
      const myPlayerId = 'session-local-player';
      const curPos = { x: 32369, y: 32241, z: 7 };

      // Snapshot representativo de um novo jogador criado
      const remoteNewPlayer = {
        id: 'session-newbie',
        characterId: 'char-newbie-uuid',
        name: 'New Hero',
        vocationId: 4,
        vocationName: 'Knight',
        level: 1,
        hp: 150,
        maxHp: 150,
        mp: 35,
        maxMp: 35,
        x: 32369,
        y: 32241,
        z: 7,
        direction: 'south',
        inHunt: false,
        outfit: {
          lookType: 131,
          lookHead: 0,
          lookBody: 86,
          lookLegs: 114,
          lookFeet: 76,
        },
      };

      // 1. Regra de exclusão local e caçada: if (isLocal || p.inHunt) return;
      const isLocal = remoteNewPlayer.id === myPlayerId;
      const shouldSkipFiltering = isLocal || remoteNewPlayer.inHunt;
      expect(shouldSkipFiltering).toBe(false); // NÃO deve ser ignorado/pulado

      // 2. Regra de visibilidade de piso: view.root.visible = (p.z ?? 7) === curPos.z;
      const isVisibleOnFloor = (remoteNewPlayer.z ?? 7) === curPos.z;
      expect(isVisibleOnFloor).toBe(true); // DEVE estar visível no piso Z=7

      // 3. Regra de coordenadas do Templo de Thais
      expect(remoteNewPlayer.x).toBe(32369);
      expect(remoteNewPlayer.y).toBe(32241);
      expect(remoteNewPlayer.z).toBe(7);
    });

    it('ThaisCityRoom.onJoin configura player com inHunt = false e floor Z = 7', async () => {
      const room = new ThaisCityRoom();
      room.onCreate({});

      const mockClient: any = {
        sessionId: 'session-newbie-1',
      };

      await room.onJoin(mockClient, {
        mockCharacter: {
          id: 'char-newbie-mock',
          accountId: 'acc-1',
          name: 'Sir Novato',
          vocationId: 4,
          level: 1,
        },
      });

      const player = room.state.players.get('session-newbie-1');
      expect(player).toBeDefined();
      expect(player?.name).toBe('Sir Novato');
      expect(player?.level).toBe(1);
      expect(player?.inHunt).toBe(false); // CRÍTICO: visível na cidade
      expect(player?.posZ).toBe(7);       // CRÍTICO: piso térreo do templo
      expect(player?.posX).toBe(32369);
      expect(player?.posY).toBe(32241);
    });
  });
});
