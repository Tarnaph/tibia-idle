import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createIdleGame, addPartyMember, initialHunts, type GameState, type GameContent } from '../packages/domain/src';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { HuntDungeonRoom } from '../packages/server/src/rooms/HuntDungeonRoom';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';

const content: GameContent = {
  equipment: (equipmentJson as any).items,
  monsters: (monstersJson as any).monsters,
  starterLoadouts: (startersJson as any).loadouts,
  vocations: (vocationsJson as any).vocations,
  spells: (spellsJson as any).spells,
  huntRegions: (huntRegionsJson as any).regions,
  economy: economyJson as any,
  hunts: initialHunts,
  rateSkill: (vocationsJson as any).rateSkill,
  rateMagic: (vocationsJson as any).rateMagic,
};

describe('Phase 244: Blindagem Total de Persistência (UUID Reconciliação & Graceful Shutdown)', () => {
  let game: GameState;

  beforeEach(() => {
    game = createIdleGame('test-seed-phase244', content);
  });

  describe('1. Reconciliação de UUID em addPartyMember', () => {
    it('deve usar o UUID oficial do banco quando explicitId for fornecido', () => {
      const canonicalUuid = 'c7a8b9f0-1234-5678-9abc-def012345678';
      const updated = addPartyMember(game, 'Valiant Mage', 'Sorcerer', content, 'male', canonicalUuid);

      const created = updated.session.characters.find((c) => c.name === 'Valiant Mage');
      expect(created).toBeDefined();
      expect(created?.id).toBe(canonicalUuid);
      expect(created?.id).not.toBe('sorcerer-valiant-mage');
    });

    it('deve manter comportamento padrão de ID sintético quando explicitId não for fornecido', () => {
      const updated = addPartyMember(game, 'Valiant Druid', 'Druid', content, 'female');

      const created = updated.session.characters.find((c) => c.name === 'Valiant Druid');
      expect(created).toBeDefined();
      expect(created?.id).toBe('druid-valiant-druid');
    });

    it('deve impedir criação com ID duplicado caso o UUID já exista na party', () => {
      const canonicalUuid = 'c7a8b9f0-1234-5678-9abc-def012345678';
      const step1 = addPartyMember(game, 'Mage A', 'Sorcerer', content, 'male', canonicalUuid);

      expect(() => {
        addPartyMember(step1, 'Mage B', 'Druid', content, 'male', canonicalUuid);
      }).toThrow('Nome já utilizado.');
    });
  });

  describe('2. Graceful Shutdown & Flush estático no Servidor Colyseus', () => {
    it('deve expor o método estático flushActiveInstanceSaves em ThaisCityRoom sem lançar exceção', async () => {
      expect(typeof ThaisCityRoom.flushActiveInstanceSaves).toBe('function');
      // Quando não há instância ativa em teste, não deve falhar
      await expect(ThaisCityRoom.flushActiveInstanceSaves()).resolves.toBeUndefined();
    });

    it('deve rastrear masmorras ativas e expor flushAllActiveRooms em HuntDungeonRoom', async () => {
      expect(HuntDungeonRoom.activeRooms).toBeDefined();
      expect(typeof HuntDungeonRoom.flushAllActiveRooms).toBe('function');

      const initialCount = HuntDungeonRoom.activeRooms.size;
      const room = new HuntDungeonRoom();
      room.onCreate({ huntId: 'cyclops-camp' });

      expect(HuntDungeonRoom.activeRooms.size).toBe(initialCount + 1);

      // Simula saveAllPlayers mockado
      const saveSpy = vi.spyOn(room, 'saveAllPlayers').mockResolvedValue(undefined as any);

      await HuntDungeonRoom.flushAllActiveRooms();
      expect(saveSpy).toHaveBeenCalled();

      // Ao descartar a sala, remove do registro estático
      await room.onDispose();
      expect(HuntDungeonRoom.activeRooms.has(room)).toBe(false);
    });
  });
});
