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

  it('supports full 12 F1-F12 slots configuration and handles mixed spells, potions and runes', () => {
    const game = createIdleGame('tibia11-f1-f12-test', content);
    const knight = game.session.characters[0];
    knight.level = 200;

    // Configure matching the screenshot: F2 Potion (26030), F3 Heal (1), F4 Ice (2274), rest empty or configured
    const hotbarConfig: (number | undefined)[] = [
      undefined, // F1
      26030,     // F2: Ultimate Spirit Potion
      1,         // F3: Light Healing / Healing
      2274,      // F4: Avalanche / Ice
      undefined, // F5
      undefined, // F6
      undefined, // F7
      8888,      // F8: Token / Coin
      undefined, // F9
      undefined, // F10
      undefined, // F11
      undefined, // F12
    ];

    knight.hotbar = hotbarConfig as number[];

    // Validate resolution of F2, F3, F4
    const f2Action = findHotbarAction(knight.hotbar[1], content);
    expect(f2Action?.kind).toBe('potion');
    if (f2Action?.kind === 'potion') {
      expect(f2Action.potion.name).toBe('Ultimate Spirit Potion');
    }

    const f3Action = findHotbarAction(knight.hotbar[2], content);
    expect(f3Action?.kind).toBe('spell');

    const f4Action = findHotbarAction(knight.hotbar[3], content);
    expect(f4Action?.kind).toBe('rune');
    if (f4Action?.kind === 'rune') {
      expect(f4Action.rune.name).toBe('Avalanche');
    }

    // Validate empty slot is undefined
    expect(knight.hotbar[0]).toBeUndefined();
    expect(knight.hotbar[4]).toBeUndefined();
  });

  it('Phase 19: supports dual-deck 20 slots hotbar across two action rows and vital stats calculations', () => {
    const game = createIdleGame('tibia11-hud-test', content);
    const knight = game.session.characters[0];
    knight.currentHp = 2495;
    knight.maxHp = 2555;
    knight.currentMana = 298;
    knight.maxMana = 840;

    // HP & Mana ratio calculations
    const hpRatio = (knight.currentHp / knight.maxHp) * 100;
    expect(hpRatio).toBeCloseTo(97.65, 1);

    const manaRatio = (knight.currentMana / knight.maxMana) * 100;
    expect(manaRatio).toBeCloseTo(35.47, 1);

    // 20-slot dual action bar
    const dualDeckHotbar: number[] = new Array(20).fill(0);
    dualDeckHotbar[0] = 7618;  // Row 1 Slot 0: Health potion
    dualDeckHotbar[1] = 1;     // Row 1 Slot 1: Spell
    dualDeckHotbar[11] = 8472; // Row 2 Slot 1: Spirit potion
    dualDeckHotbar[18] = 26031;// Row 2 Slot 8: Supreme health

    knight.hotbar = dualDeckHotbar;
    expect(knight.hotbar.length).toBe(20);

    const potionAction = findHotbarAction(knight.hotbar[0], content);
    expect(potionAction?.kind).toBe('potion');

    const spiritAction = findHotbarAction(knight.hotbar[11], content);
    expect(spiritAction?.kind).toBe('potion');

    const supremeAction = findHotbarAction(knight.hotbar[18], content);
    expect(supremeAction?.kind).toBe('potion');
  });

  it('Phase 20: resolves authentic CipSoft official sprites for spells, runes and potions', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { resolveActionImagePath } = await import('../apps/web/components/Tibia11ActionIcon');

    // Spells
    const exuraPath = resolveActionImagePath(1, 'spell', 'Light Healing');
    expect(exuraPath).toBe('/spells/exura.png');
    expect(fs.existsSync(path.resolve('public', exuraPath!.slice(1)))).toBe(true);

    const exoriGranPath = resolveActionImagePath(10, 'spell', 'Fierce Berserk');
    expect(exoriGranPath).toBe('/spells/exori-gran.png');
    expect(fs.existsSync(path.resolve('public', exoriGranPath!.slice(1)))).toBe(true);

    const utaniHurPath = resolveActionImagePath(16, 'spell', 'Haste');
    expect(utaniHurPath).toBe('/spells/utani-hur.png');
    expect(fs.existsSync(path.resolve('public', utaniHurPath!.slice(1)))).toBe(true);

    const utitoTempoPath = resolveActionImagePath(15, 'spell', 'Blood Rage');
    expect(utitoTempoPath).toBe('/spells/utito-tempo.png');
    expect(fs.existsSync(path.resolve('public', utitoTempoPath!.slice(1)))).toBe(true);

    // Potions
    const healthPotionPath = resolveActionImagePath(7618, 'potion', 'Health Potion');
    expect(healthPotionPath).toBe('/potions/small-health-potion.png');
    expect(fs.existsSync(path.resolve('public', healthPotionPath!.slice(1)))).toBe(true);

    const supremePotionPath = resolveActionImagePath(26031, 'potion', 'Supreme Health Potion');
    expect(supremePotionPath).toBe('/potions/supreme-health-potion.png');
    expect(fs.existsSync(path.resolve('public', supremePotionPath!.slice(1)))).toBe(true);

    const ultimateSpiritPath = resolveActionImagePath(26030, 'potion', 'Ultimate Spirit Potion');
    expect(ultimateSpiritPath).toBe('/potions/ultimate-spirit-potion.png');
    expect(fs.existsSync(path.resolve('public', ultimateSpiritPath!.slice(1)))).toBe(true);
  });
});
