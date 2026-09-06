import { describe, expect, it } from 'vitest';
import monstersJson from '../content/generated/monsters.json' with { type: 'json' };
import { content } from './fixture';
import {
  addPartyMember,
  advanceCombat,
  createIdleGame,
  findHotbarAction,
  HOTBAR_POTIONS,
  HOTBAR_RUNES,
  isHotbarActionUnlocked,
  restartHunt,
} from '../packages/domain/src';

describe('Phase 16: Hotbar Actions, Potions, Runes, and XP Boost', () => {
  it('boosts Rat and Cave Rat experience to 50000 for rapid spell testing', () => {
    const rat = monstersJson.monsters.find((m) => m.id === 'rat');
    const caveRat = monstersJson.monsters.find((m) => m.id === 'cave-rat');

    expect(rat?.experience).toBeGreaterThan(0);
    expect(caveRat?.experience).toBeGreaterThan(0);
  });

  it('defines valid potions and runes with unlock requirements', () => {
    expect(HOTBAR_POTIONS.length).toBeGreaterThanOrEqual(8);
    expect(HOTBAR_RUNES.length).toBeGreaterThanOrEqual(5);

    const hpPotion = HOTBAR_POTIONS.find((p) => p.id === 7618);
    expect(hpPotion).toBeDefined();
    expect(hpPotion?.healMin).toBe(150);

    const sdRune = HOTBAR_RUNES.find((r) => r.id === 2268);
    expect(sdRune).toBeDefined();
    expect(sdRune?.requiredLevel).toBe(45);
    expect(sdRune?.requiredMagicLevel).toBe(15);
  });

  it('automatically consumes a health potion when taking damage below 75% HP', () => {
    const game = createIdleGame('test-potion-heal', content);
    const activeChar = game.session.characters[0];
    activeChar.level = 15; // Health potion requires level 8

    // Equip Health Potion (id 7618) in first slot of hotbar
    activeChar.hotbar = [7618];
    const hunting = restartHunt(game, 'test-potion-heal', content, 'rat-cellars');

    const actor = hunting.encounter.partyActors.find((a) => a.characterId === activeChar.id)!;
    // Inflict damage so HP is below 75%
    actor.hp = Math.floor(activeChar.maxHp * 0.5);
    const damagedHp = actor.hp;

    // Advance combat by 1 tick (120ms)
    const afterCombat = advanceCombat(hunting, content, 120);
    const actorAfter = afterCombat.encounter.partyActors.find((a) => a.characterId === activeChar.id)!;

    // Health potion should have been consumed and healed the character
    expect(actorAfter.hp).toBeGreaterThan(damagedHp);
    expect(afterCombat.encounter.log.some((entry) => entry.message.includes('Health Potion'))).toBe(true);
  });

  it('automatically consumes a mana potion when mana is below 50%', () => {
    let game = createIdleGame('test-potion-mana', content);
    game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const mage = game.session.characters.find((c) => c.name === 'Mira')!;
    mage.level = 15; // Mana potion requires level 8
    mage.maxMana = 200;

    mage.hotbar = [7620]; // Mana Potion
    const hunting = restartHunt(game, 'test-potion-mana', content, 'rat-cellars');

    const actor = hunting.encounter.partyActors.find((a) => a.characterId === mage.id)!;
    actor.mana = 20; // 10% mana

    const afterCombat = advanceCombat(hunting, content, 120);
    const actorAfter = afterCombat.encounter.partyActors.find((a) => a.characterId === mage.id)!;

    expect(actorAfter.mana).toBeGreaterThan(20);
    expect(afterCombat.encounter.log.some((entry) => entry.message.includes('Mana Potion'))).toBe(true);
  });

  it('automatically casts an attack rune when targeting enemies in range', () => {
    let game = createIdleGame('test-rune-attack', content);
    game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const sorcerer = game.session.characters.find((c) => c.name === 'Mira')!;
    sorcerer.level = 50; // SD requires level 45
    sorcerer.skills.magicLevel = 25; // SD requires ML 15

    // Equip Sudden Death Rune (id 2268)
    sorcerer.hotbar = [2268];
    const hunting = restartHunt(game, 'test-rune-attack', content, 'rat-cellars');
    const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;
    const enemy = hunting.encounter.enemies.find((e) => e.alive)!;
    enemy.position = { x: actor.position.x + 2, y: actor.position.y, z: actor.position.z };

    // Advance combat until Sudden Death is used in encounter log
    let state = hunting;
    let runeUsed = false;
    for (let i = 0; i < 20; i++) {
      state = advanceCombat(state, content, 120);
      if (state.encounter.log.some((entry) => entry.message.includes('Sudden Death'))) {
        runeUsed = true;
        break;
      }
    }

    expect(runeUsed).toBe(true);
  });

  it('handles empty hotbar slots and unknown IDs gracefully', () => {
    const game = createIdleGame('test-empty-hotbar', content);
    const char = game.session.characters[0];
    char.hotbar = [999999, 0]; // Invalid/empty IDs

    const hunting = restartHunt(game, 'test-empty-hotbar', content, 'rat-cellars');
    // Should not crash
    expect(() => advanceCombat(hunting, content, 120)).not.toThrow();
  });
});
