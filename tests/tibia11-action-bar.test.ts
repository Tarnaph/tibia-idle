import { describe, expect, it } from 'vitest';
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

describe('Phase 17: Tibia 11 Migration, Potions, Runes and Action Bar', () => {
  it('incorporates official Tibia 11 potions into HOTBAR_POTIONS catalog', () => {
    const supremeHealth = HOTBAR_POTIONS.find((p) => p.id === 26031);
    expect(supremeHealth).toBeDefined();
    expect(supremeHealth?.name).toBe('Supreme Health Potion');
    expect(supremeHealth?.requiredLevel).toBe(200);
    expect(supremeHealth?.healMin).toBe(900);
    expect(supremeHealth?.healMax).toBe(1200);

    const ultimateMana = HOTBAR_POTIONS.find((p) => p.id === 26029);
    expect(ultimateMana).toBeDefined();
    expect(ultimateMana?.name).toBe('Ultimate Mana Potion');
    expect(ultimateMana?.requiredLevel).toBe(130);
    expect(ultimateMana?.manaMin).toBe(400);

    const ultimateSpirit = HOTBAR_POTIONS.find((p) => p.id === 26030);
    expect(ultimateSpirit).toBeDefined();
    expect(ultimateSpirit?.name).toBe('Ultimate Spirit Potion');
    expect(ultimateSpirit?.healMin).toBe(400);
    expect(ultimateSpirit?.manaMin).toBe(350);
  });

  it('enforces Tibia 11 level requirement (level 200 for Supreme Health Potion)', () => {
    const game = createIdleGame('tibia11-req-test', content);
    const knight = game.session.characters[0];
    const supremeHealth = findHotbarAction(26031, content)!;

    knight.level = 150;
    expect(isHotbarActionUnlocked(knight, supremeHealth)).toBe(false);

    knight.level = 200;
    expect(isHotbarActionUnlocked(knight, supremeHealth)).toBe(true);
  });

  it('automatically consumes Tibia 11 Supreme Health Potion when damaged below 75%', () => {
    const game = createIdleGame('tibia11-supreme-test', content);
    const knight = game.session.characters[0];
    knight.level = 250;
    knight.maxHp = 2000;
    knight.currentHp = 2000;

    // Equip Supreme Health Potion (id 26031) in slot 0
    knight.hotbar = [26031];
    const hunting = restartHunt(game, 'tibia11-supreme-test', content, 'rat-cellars');

    const actor = hunting.encounter.partyActors.find((a) => a.characterId === knight.id)!;
    actor.hp = 800; // 40% HP
    const startHp = actor.hp;

    const afterCombat = advanceCombat(hunting, content, 120);
    const actorAfter = afterCombat.encounter.partyActors.find((a) => a.characterId === knight.id)!;

    expect(actorAfter.hp).toBeGreaterThanOrEqual(startHp + 900);
    expect(afterCombat.encounter.log.some((entry) => entry.message.includes('Supreme Health Potion'))).toBe(true);
  });

  it('automatically consumes Tibia 11 Ultimate Mana Potion when mana is low', () => {
    let game = createIdleGame('tibia11-ump-test', content);
    game = addPartyMember(game, 'Mira', 'Sorcerer', content);
    const mage = game.session.characters.find((c) => c.name === 'Mira')!;
    mage.level = 150;
    mage.maxMana = 1500;

    mage.hotbar = [26029]; // Ultimate Mana Potion
    const hunting = restartHunt(game, 'tibia11-ump-test', content, 'rat-cellars');

    const actor = hunting.encounter.partyActors.find((a) => a.characterId === mage.id)!;
    actor.mana = 200; // ~13% mana

    const afterCombat = advanceCombat(hunting, content, 120);
    const actorAfter = afterCombat.encounter.partyActors.find((a) => a.characterId === mage.id)!;

    expect(actorAfter.mana).toBeGreaterThanOrEqual(600);
    expect(afterCombat.encounter.log.some((entry) => entry.message.includes('Ultimate Mana Potion'))).toBe(true);
  });
});
