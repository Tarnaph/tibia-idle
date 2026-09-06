import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  startGame,
  respawnInTemple,
  experienceForLevel,
  levelForExperience,
} from '../packages/domain/src';
import { serverConfigManager } from '../packages/server/src/config/ServerConfigManager';
import { content } from './fixture';

describe('Phase 68: Death Modal, Death Penalty System, and Admin Controls', () => {
  it('correctly calculates levelForExperience and inverse experienceForLevel', () => {
    expect(levelForExperience(0)).toBe(1);
    expect(levelForExperience(50)).toBe(1);
    expect(levelForExperience(99)).toBe(1);

    // Level 2 threshold (100 XP)
    expect(experienceForLevel(2)).toBe(100);
    expect(levelForExperience(100)).toBe(2);
    expect(levelForExperience(150)).toBe(2);

    // Level 5 threshold (800 XP)
    expect(experienceForLevel(5)).toBe(800);
    expect(levelForExperience(800)).toBe(5);
    expect(levelForExperience(799)).toBe(4);

    // Level 10 threshold (9,000 XP)
    const expLv10 = experienceForLevel(10);
    expect(levelForExperience(expLv10)).toBe(10);
    expect(levelForExperience(expLv10 + 500)).toBe(10);
    expect(levelForExperience(experienceForLevel(11) - 1)).toBe(10);
    expect(levelForExperience(experienceForLevel(11))).toBe(11);
  });

  it('applies default 10% XP penalty, 10% skill penalty, and clears hunt loot on respawn', () => {
    let game = createIdleGame('test-death-penalty', content);
    game = startGame(game, content);

    const char = game.session.characters[0];
    char.level = 10;
    char.experience = 10000;
    char.skills.sword = 50;
    char.skills.shielding = 40;
    char.skills.magicLevel = 10;

    // Add some loot in the session
    game.session.loot = [
      { itemId: 2148, name: 'gold coin', amount: 150 },
      { itemId: 3976, name: 'worm', amount: 5 },
    ];

    // Trigger respawn in temple with default settings
    const respawned = respawnInTemple(game, undefined, content);
    const updatedChar = respawned.session.characters[0];

    // 10% XP loss: 10,000 - 1,000 = 9,000
    expect(updatedChar.experience).toBe(9000);

    // 10% Skill loss: 50 -> 45, 40 -> 36, 10 -> 9
    expect(updatedChar.skills.sword).toBe(45);
    expect(updatedChar.skills.shielding).toBe(36);
    expect(updatedChar.skills.magicLevel).toBe(9);

    // Hunt loot should be cleared
    expect(respawned.session.loot.length).toBe(0);

    // HP and Mana should be fully restored to max
    expect(updatedChar.currentHp).toBe(updatedChar.maxHp);
    expect(updatedChar.currentMana).toBe(updatedChar.maxMana);

    // Encounter status should be completed
    expect(respawned.encounter.status).toBe('completed');
  });

  it('triggers authentic de-level when XP penalty drops experience below level threshold', () => {
    let game = createIdleGame('test-delevel', content);
    game = startGame(game, content);

    const char = game.session.characters[0];
    // Level 5 requires 800 XP. Suppose character has barely reached level 5 (810 XP)
    char.level = 5;
    char.experience = 810;

    // 10% loss will take away 81 XP, leaving 729 XP (which is Level 4 since Level 5 requires 800 XP)
    const respawned = respawnInTemple(game, undefined, content);
    const updatedChar = respawned.session.characters[0];

    expect(updatedChar.experience).toBe(729);
    expect(updatedChar.level).toBe(4);
    expect(updatedChar.level).toBeLessThan(5);
  });

  it('respects custom death penalty options (e.g. 0% penalty or custom rates)', () => {
    let game = createIdleGame('test-custom-penalty', content);
    game = startGame(game, content);

    const char = game.session.characters[0];
    char.level = 20;
    char.experience = 50000;
    char.skills.sword = 60;
    game.session.loot = [{ itemId: 2148, name: 'gold coin', amount: 500 }];

    // No penalty mode
    const noPenalty = respawnInTemple(game, { expLossPercent: 0, skillLossPercent: 0, loseLoot: false }, content);
    expect(noPenalty.session.characters[0].experience).toBe(50000);
    expect(noPenalty.session.characters[0].skills.sword).toBe(60);
    expect(noPenalty.session.loot.length).toBe(1);

    // High penalty mode (20% XP, 15% skills, lose loot true)
    const highPenalty = respawnInTemple(game, { expLossPercent: 20, skillLossPercent: 15, loseLoot: true }, content);
    expect(highPenalty.session.characters[0].experience).toBe(40000);
    expect(highPenalty.session.characters[0].skills.sword).toBe(51); // 60 - 9 = 51
    expect(highPenalty.session.loot.length).toBe(0);
  });

  it('integrates with ServerConfigManager for global penalty rates', () => {
    const originalConfig = serverConfigManager.getConfig();

    expect(originalConfig.deathPenaltyExpPercent).toBe(10);
    expect(originalConfig.deathPenaltySkillPercent).toBe(10);
    expect(originalConfig.deathPenaltyLoseLoot).toBe(true);

    // Update via ServerConfigManager
    serverConfigManager.updateConfig({
      deathPenaltyExpPercent: 15,
      deathPenaltySkillPercent: 5,
      deathPenaltyLoseLoot: false,
    });

    const updated = serverConfigManager.getConfig();
    expect(updated.deathPenaltyExpPercent).toBe(15);
    expect(updated.deathPenaltySkillPercent).toBe(5);
    expect(updated.deathPenaltyLoseLoot).toBe(false);

    // Reset back
    serverConfigManager.updateConfig({
      deathPenaltyExpPercent: 10,
      deathPenaltySkillPercent: 10,
      deathPenaltyLoseLoot: true,
    });
  });
});
