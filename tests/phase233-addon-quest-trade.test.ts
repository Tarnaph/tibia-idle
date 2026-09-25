import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterService } from '../packages/auth/src/characterService';
import {
  CITIZEN_ADDON_1_QUEST,
  getAddonQuestFor,
  isAddonUnlockedFor,
} from '../packages/domain/src/appearancePermissions';

describe('Phase 233: Citizen Addon 1 Quest and Atomic Trade System', () => {
  it('has valid canonical quest configuration for Primeiros Passos de um Cidadão', () => {
    expect(CITIZEN_ADDON_1_QUEST.id).toBe('citizen-addon-1');
    expect(CITIZEN_ADDON_1_QUEST.outfit).toBe('citizen');
    expect(CITIZEN_ADDON_1_QUEST.addon).toBe(1);
    expect(CITIZEN_ADDON_1_QUEST.materials).toHaveLength(4);

    const trollHair = CITIZEN_ADDON_1_QUEST.materials.find((m) => m.itemId === 10606);
    expect(trollHair).toBeDefined();
    expect(trollHair?.count).toBe(5);

    const spiderFangs = CITIZEN_ADDON_1_QUEST.materials.find((m) => m.itemId === 8859);
    expect(spiderFangs).toBeDefined();
    expect(spiderFangs?.count).toBe(3);

    const bone = CITIZEN_ADDON_1_QUEST.materials.find((m) => m.itemId === 2230);
    expect(bone).toBeDefined();
    expect(bone?.count).toBe(50);

    const lumpOfDirt = CITIZEN_ADDON_1_QUEST.materials.find((m) => m.itemId === 10609);
    expect(lumpOfDirt).toBeDefined();
    expect(lumpOfDirt?.count).toBe(20);

    expect(getAddonQuestFor('citizen', 1)).toEqual(CITIZEN_ADDON_1_QUEST);
    expect(getAddonQuestFor('citizen', 2)).toBeUndefined();
  });

  describe('tradeAddonQuest atomic transaction', () => {
    let mockPrisma: any;
    let service: CharacterService;

    beforeEach(() => {
      mockPrisma = {
        character: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        inventoryItem: {
          delete: vi.fn(),
          update: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      };
      service = new CharacterService(mockPrisma);
    });

    it('rejects trade if player does not have all required materials', async () => {
      // Player only has 2 Troll Hair (needs 5) and 0 of other items
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-1',
        accountId: 'acc-1',
        name: 'TestCitizen',
        saveVersion: 1,
        unlockedAddonsJson: null,
        completedQuestsJson: null,
        inventory: [
          { id: 'inv-1', serverId: 10606, name: 'Bunch of Troll Hair', count: 2 },
        ],
      });

      await expect(
        service.tradeAddonQuest('char-1', 'citizen-addon-1', 'acc-1')
      ).rejects.toThrow(/Materiais insuficientes/);

      expect(mockPrisma.inventoryItem.delete).not.toHaveBeenCalled();
      expect(mockPrisma.character.update).not.toHaveBeenCalled();
    });

    it('successfully consumes materials, unlocks Citizen Addon 1, and marks quest as complete', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-1',
        accountId: 'acc-1',
        name: 'TestCitizen',
        saveVersion: 3,
        unlockedAddonsJson: null,
        completedQuestsJson: null,
        inventory: [
          { id: 'inv-hair', serverId: 10606, name: 'Bunch of Troll Hair', count: 5 },
          { id: 'inv-fangs', serverId: 8859, name: 'Spider Fangs', count: 10 }, // 10 available, only 3 needed
          { id: 'inv-bone', serverId: 2230, name: 'Bone', count: 50 },
          { id: 'inv-dirt', serverId: 10609, name: 'Lump of Dirt', count: 20 },
        ],
      });

      mockPrisma.character.update.mockResolvedValue({
        id: 'char-1',
        saveVersion: 4,
        unlockedAddonsJson: JSON.stringify({ citizen: [1] }),
        completedQuestsJson: JSON.stringify(['citizen-addon-1']),
        inventory: [
          { id: 'inv-fangs', serverId: 8859, name: 'Spider Fangs', count: 7 },
        ],
        skills: [],
      });

      const result = await service.tradeAddonQuest('char-1', 'citizen-addon-1', 'acc-1');

      expect(result.success).toBe(true);
      expect(result.questId).toBe('citizen-addon-1');
      expect(result.unlockedAddons).toEqual({ citizen: [1] });
      expect(result.completedQuests).toEqual(['citizen-addon-1']);
      expect(result.saveVersion).toBe(4);

      // Verify exact consumption:
      // inv-hair (count 5) deleted
      expect(mockPrisma.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 'inv-hair' } });
      // inv-bone (count 50) deleted
      expect(mockPrisma.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 'inv-bone' } });
      // inv-dirt (count 20) deleted
      expect(mockPrisma.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 'inv-dirt' } });
      // inv-fangs (count 10 - 3 = 7) updated
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'inv-fangs' },
        data: { count: 7 },
      });
    });

    it('rejects duplicate trade attempt if quest was already completed', async () => {
      mockPrisma.character.findUnique.mockResolvedValue({
        id: 'char-1',
        accountId: 'acc-1',
        name: 'TestCitizen',
        saveVersion: 4,
        unlockedAddonsJson: JSON.stringify({ citizen: [1] }),
        completedQuestsJson: JSON.stringify(['citizen-addon-1']),
        inventory: [
          { id: 'inv-hair', serverId: 10606, name: 'Bunch of Troll Hair', count: 5 },
          { id: 'inv-fangs', serverId: 8859, name: 'Spider Fangs', count: 3 },
          { id: 'inv-bone', serverId: 2230, name: 'Bone', count: 50 },
          { id: 'inv-dirt', serverId: 10609, name: 'Lump of Dirt', count: 20 },
        ],
      });

      await expect(
        service.tradeAddonQuest('char-1', 'citizen-addon-1', 'acc-1')
      ).rejects.toThrow(/já foi concluída/);

      expect(mockPrisma.inventoryItem.delete).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryItem.update).not.toHaveBeenCalled();
    });
  });
});
