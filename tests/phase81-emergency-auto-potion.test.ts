import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import {
  createIdleGame,
  advanceCombat,
  ensureHealthPotionInHotbar,
  getBestHealthPotionForCharacter,
  triggerEmergencyAutoPotion,
} from '../packages/domain/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';

describe('Phase 81 - Emergency Auto-Potion & Auto Hotbar System', () => {
  it('automatically picks and assigns the best unlocked health potion to hotbar if hotbar has no potion', () => {
    const game = createIdleGame('seed-auto-hotbar', content, 'rat-cellars');
    const character = game.session.characters[0];
    character.hotbar = []; // empty hotbar

    const potionId = ensureHealthPotionInHotbar(character, content);
    expect(potionId).toBeDefined();
    expect(character.hotbar).toContain(potionId);

    // For level 1 character or level 8+, it should pick Health Potion (7618)
    const potionDef = getBestHealthPotionForCharacter(character);
    expect(potionDef?.id).toBe(7618);
  });

  it('selects higher tier potions for higher level characters', () => {
    const game = createIdleGame('seed-high-lvl-potion', content, 'rat-cellars');
    const knight = game.session.characters[0];
    knight.level = 200;
    knight.vocation = 'Knight';

    const bestPotion = getBestHealthPotionForCharacter(knight);
    expect(bestPotion).toBeDefined();
    expect(bestPotion?.id).toBe(26031); // Supreme Health Potion

    knight.hotbar = [];
    ensureHealthPotionInHotbar(knight, content);
    expect(knight.hotbar).toContain(26031);
  });

  it('triggers emergency auto-potion before lethal damage resolves, saving the character from death', () => {
    const game = createIdleGame('seed-lethal-rescue', content, 'rat-cellars');
    const actor = game.encounter.partyActors[0];
    const character = game.session.characters[0];

    // Set actor HP to a dangerously low level
    actor.hp = 10;
    character.maxHp = 200;
    character.hotbar = []; // hotbar empty, should auto-assign potion

    // Enemy deals 30 damage, which is lethal (10 - 30 <= 0)
    const lethalDamage = 30;

    triggerEmergencyAutoPotion(game, actor, character, content, lethalDamage);

    // Actor should have drunk the emergency potion and healed HP
    expect(actor.hp).toBeGreaterThan(10);
    expect(character.hotbar.length).toBeGreaterThan(0);

    // Log should record the emergency rescue
    const emergencyLog = game.encounter.log.find((l) => l.message.includes('poção de emergência'));
    expect(emergencyLog).toBeDefined();
  });

  it('deducts potion item count from inventory when consumed and enforces 50% HP threshold', () => {
    const game = createIdleGame('seed-potion-count', content, 'rat-cellars');
    const actor = game.encounter.partyActors[0];
    const character = game.session.characters[0];

    character.maxHp = 200;
    // Set HP to 150 (75% HP) - should NOT trigger potion because threshold is <= 50%
    actor.hp = 150;
    game.session.loot = [{ itemId: 7618, name: 'Health Potion', amount: 10 }];

    triggerEmergencyAutoPotion(game, actor, character, content, 5); // 145/200 = 72.5% (> 50%)
    expect(game.session.loot[0].amount).toBe(10); // Not consumed at > 50% HP

    // Set HP to 90 (45% HP <= 50%) - SHOULD consume potion
    actor.hp = 90;
    triggerEmergencyAutoPotion(game, actor, character, content, 5);
    expect(game.session.loot[0].amount).toBe(9); // Decremented from 10 to 9!
  });

  it('persists hotbar configuration permanently via PrismaPersistenceManager', async () => {
    const mockPrisma = {
      character: {
        update: async (args: any) => args,
        findUnique: async () => ({
          id: 'char-persistence-1',
          name: 'Aldric',
          level: 50,
          hotbarJson: JSON.stringify([7618, 7620, 2268]),
        }),
      },
    } as any;

    const manager = new PrismaPersistenceManager(mockPrisma);
    const loaded = await manager.loadCharacter('char-persistence-1');
    expect(loaded).toBeDefined();
    expect(loaded?.hotbar).toEqual([7618, 7620, 2268]);
  });
});
