import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { content } from './fixture';
import {
  createIdleGame,
  triggerEmergencyAutoPotion,
} from '../packages/domain/src';

const projectRoot = resolve(__dirname, '..');

describe('Phase 197 - FIX.md Items Comprehensive Suite', () => {
  describe('1. Highscores & Ranking Categories & Test Character Filtering', () => {
    it('verifies that Highscores API filters out test/dummy characters and accounts', () => {
      const routeSrc = readFileSync(resolve(projectRoot, 'app/api/highscores/route.ts'), 'utf8');
      expect(routeSrc).toContain('isTestCharacter');
      expect(routeSrc).toContain('test');
      expect(routeSrc).toContain('teste');
      expect(routeSrc).toContain('browserhero');
      expect(routeSrc).toContain('atlashero');
    });

    it('verifies that Highscores API only allows the strict 8 categories without generic melee or auxiliary categories', () => {
      const routeSrc = readFileSync(resolve(projectRoot, 'app/api/highscores/route.ts'), 'utf8');
      // Allowed categories: level, magic, fist, sword, axe, club, distance, shielding
      expect(routeSrc).toContain('SKILL_CATEGORY_MAP');
      expect(routeSrc).toContain("magic: 7");
      expect(routeSrc).toContain("fist: 0");
      expect(routeSrc).toContain("club: 1");
      expect(routeSrc).toContain("sword: 2");
      expect(routeSrc).toContain("axe: 3");
      expect(routeSrc).toContain("distance: 4");
      expect(routeSrc).toContain("shielding: 5");

      // Verify removal of melee, bosses, and bestiary from highscores API
      expect(routeSrc).not.toContain("if (category === 'melee')");
      expect(routeSrc).not.toContain("if (category === 'bosses')");
      expect(routeSrc).not.toContain("if (category === 'bestiary')");
    });

    it('verifies HighscoresModal strictly lists the 8 categories', () => {
      const modalSrc = readFileSync(resolve(projectRoot, 'apps/web/components/HighscoresModal.tsx'), 'utf8');
      expect(modalSrc).toContain("'level'");
      expect(modalSrc).toContain("'magic'");
      expect(modalSrc).toContain("'fist'");
      expect(modalSrc).toContain("'sword'");
      expect(modalSrc).toContain("'axe'");
      expect(modalSrc).toContain("'club'");
      expect(modalSrc).toContain("'distance'");
      expect(modalSrc).toContain("'shielding'");

      // Disallowed categories should not be in the CATEGORIES array
      expect(modalSrc).not.toContain("key: 'bosses'");
      expect(modalSrc).not.toContain("key: 'bestiary'");
      expect(modalSrc).not.toContain("key: 'melee'");
      expect(modalSrc).not.toContain("key: 'guild'");
      expect(modalSrc).not.toContain("key: 'speedrun'");
      expect(modalSrc).not.toContain("key: 'hunt'");
      expect(modalSrc).not.toContain("key: 'achievements'");
      expect(modalSrc).not.toContain("key: 'deaths'");
    });

    it('verifies HighscoresModal adopts the Arena PvP modal visual styling', () => {
      const modalSrc = readFileSync(resolve(projectRoot, 'apps/web/components/HighscoresModal.tsx'), 'utf8');
      expect(modalSrc).toContain('#1e2022');
      expect(modalSrc).toContain('#4a4d52');
      expect(modalSrc).toContain('#f3c769');
      expect(modalSrc).toContain('Georgia, serif');
    });
  });

  describe('2. Patio de Treino & HuntSelector Tab Synchronization', () => {
    it('verifies HuntSelector synchronizes activeTab with initialTab when opened or prop changes', () => {
      const huntSelectorSrc = readFileSync(resolve(projectRoot, 'apps/web/components/HuntSelector.tsx'), 'utf8');
      expect(huntSelectorSrc).toContain('useEffect');
      expect(huntSelectorSrc).toContain('setActiveTab(initialTab);');
    });
  });

  describe('3. Potion Consumption Constraint (Hotbar Requirement)', () => {
    it('does NOT consume potion when character hotbar is empty or lacks healing potion', () => {
      const game = createIdleGame('test-potion-empty-hotbar', content, 'rat-cellars');
      const actor = game.encounter.partyActors[0];
      const character = game.session.characters[0];

      actor.hp = 15;
      character.maxHp = 200;
      character.hotbar = []; // No potions on hotbar
      game.session.loot = [{ itemId: 7618, name: 'Health Potion', amount: 10 }];

      triggerEmergencyAutoPotion(game, actor, character, content, 20);

      // HP should NOT change, and inventory potion should NOT be consumed
      expect(actor.hp).toBe(15);
      expect(game.session.loot[0].amount).toBe(10);
    });

    it('consumes potion ONLY when a valid healing potion is configured on the hotbar', () => {
      const game = createIdleGame('test-potion-valid-hotbar', content, 'rat-cellars');
      const actor = game.encounter.partyActors[0];
      const character = game.session.characters[0];

      actor.hp = 15;
      character.maxHp = 200;
      character.hotbar = [7618]; // Health Potion on hotbar
      game.session.loot = [{ itemId: 7618, name: 'Health Potion', amount: 10 }];

      triggerEmergencyAutoPotion(game, actor, character, content, 20);

      // HP should increase and loot should decrease
      expect(actor.hp).toBeGreaterThan(15);
      expect(game.session.loot[0].amount).toBe(9);
    });

    it('does NOT consume potion if the hotbar slot is disabled in hotbarConfigs', () => {
      const game = createIdleGame('test-potion-disabled-slot', content, 'rat-cellars');
      const actor = game.encounter.partyActors[0];
      const character = game.session.characters[0];

      actor.hp = 15;
      character.maxHp = 200;
      character.hotbar = [7618];
      character.hotbarConfigs = {
        0: { enabled: false },
      };
      game.session.loot = [{ itemId: 7618, name: 'Health Potion', amount: 10 }];

      triggerEmergencyAutoPotion(game, actor, character, content, 20);

      expect(actor.hp).toBe(15);
      expect(game.session.loot[0].amount).toBe(10);
    });
  });

  describe('4. Context Menu Set Outfit & Topbar Clean Up', () => {
    it('CharacterContextMenu supports onSetOutfit and renders it conditionally', () => {
      const menuSrc = readFileSync(resolve(projectRoot, 'apps/web/components/CharacterContextMenu.tsx'), 'utf8');
      expect(menuSrc).toContain('onSetOutfit?: () => void;');
      expect(menuSrc).toContain('{onSetOutfit && (');
      expect(menuSrc).toContain('Set Outfit');
    });

    it('GamePrototype only passes onSetOutfit when right-clicking on self', () => {
      const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');
      expect(protoSrc).toContain('const isSelf = char?.id === activeCharacter?.id || charContextMenu.characterId === activeCharacter?.id;');
      expect(protoSrc).toContain('onSetOutfit={isSelf ? () => gameModal.openOutfit(activeCharacter.id) : undefined}');
    });

    it('WindowDockBar removed outfit button and added Ranking and PvP Arena buttons', () => {
      const dockSrc = readFileSync(resolve(projectRoot, 'apps/web/components/window/WindowDockBar.tsx'), 'utf8');
      expect(dockSrc).toContain('onOpenRanking');
      expect(dockSrc).toContain('onOpenPvP');
      expect(dockSrc).toContain('ranking-btn');
      expect(dockSrc).toContain('pvp-btn');
      expect(dockSrc).toContain('Highscores e Ranking Geral');
      expect(dockSrc).toContain('Arena PvP Ranqueada');
    });

    it('BottomDock removed Ranking and Arena PvP buttons from the bottom dock', () => {
      const bottomDockSrc = readFileSync(resolve(projectRoot, 'apps/web/components/BottomDock.tsx'), 'utf8');
      expect(bottomDockSrc).not.toContain('RANKING');
      expect(bottomDockSrc).not.toContain('ARENA PVP');
    });
  });

  describe('5. Turn Body with Ctrl + Direction Keys', () => {
    it('GamePrototype intercepts Ctrl + Arrow / WASD keys and triggers turn without moving', () => {
      const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');
      expect(protoSrc).toContain('isTurnArrow');
      expect(protoSrc).toContain('(e.ctrlKey || e.metaKey) && isTurnArrow');
      expect(protoSrc).toContain('gameNetwork.sendTurn(turnDir)');
      expect(protoSrc).toContain('setCityDirection(turnDir)');
    });

    it('ThaisCityArena accepts playerDirection prop and updates direction when stationary', () => {
      const arenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');
      expect(arenaSrc).toContain("playerDirection?: 'north' | 'south' | 'east' | 'west';");
      expect(arenaSrc).toContain('latestRef.current.playerDirection');
      expect(arenaSrc).toContain('playerDirection = latestRef.current.playerDirection;');
    });
  });
});
