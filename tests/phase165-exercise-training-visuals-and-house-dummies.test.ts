import { describe, it, expect } from 'vitest';
import {
  CANONICAL_TRAINING_DUMMIES,
  EXERCISE_DUMMY_ITEM_IDS,
  isTrainingDummyId,
  getTrainingDummyDefinition,
  resolveTrainingVisualAction,
  advanceTraining,
  createIdleGame,
  createCharacter,
  initialHunts,
  type CharacterState,
  type GameContent,
} from '../packages/domain/src';
import equipmentJson from '../content/generated/equipment.json';
import monstersJson from '../content/generated/monsters.json';
import startersJson from '../content/generated/starter-loadouts.json';
import vocationsJson from '../content/generated/vocations.json';
import spellsJson from '../content/generated/spells.json';
import huntRegionsJson from '../content/generated/hunt-regions.json';
import economyJson from '../content/generated/item-economy.json';

const content: GameContent = {
  monsters: (monstersJson as any).monsters || [],
  equipment: (equipmentJson as any).items || [],
  vocations: (vocationsJson as any).vocations || [],
  starterLoadouts: (startersJson as any).loadouts || [],
  spells: (spellsJson as any).spells || [],
  huntRegions: (huntRegionsJson as any).regions || [],
  hunts: initialHunts,
  economy: economyJson as any,
  rateSkill: 1,
  rateMagic: 1,
};

describe('Phase 165: Exercise Training Visuals & House Dummies Catalog', () => {
  describe('Canonical Training Dummies & House Dummies Catalog', () => {
    it('includes all canonical depot and house exercise dummies', () => {
      expect(CANONICAL_TRAINING_DUMMIES[5787]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[5787].name).toBe('Training Dummy');
      expect(CANONICAL_TRAINING_DUMMIES[5787].isHouseDummy).toBe(false);

      expect(CANONICAL_TRAINING_DUMMIES[31827]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[31827].kind).toBe('exercise');
      expect(CANONICAL_TRAINING_DUMMIES[31827].isHouseDummy).toBe(true);

      expect(CANONICAL_TRAINING_DUMMIES[31828]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[31828].kind).toBe('ferumbras');
      expect(CANONICAL_TRAINING_DUMMIES[31828].isHouseDummy).toBe(true);

      expect(CANONICAL_TRAINING_DUMMIES[31829]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[31829].kind).toBe('ferumbras');

      expect(CANONICAL_TRAINING_DUMMIES[31830]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[31830].kind).toBe('demon');
      expect(CANONICAL_TRAINING_DUMMIES[31830].isHouseDummy).toBe(true);

      expect(CANONICAL_TRAINING_DUMMIES[31831]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[31831].kind).toBe('demon');

      expect(CANONICAL_TRAINING_DUMMIES[31832]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[31832].kind).toBe('monk');
      expect(CANONICAL_TRAINING_DUMMIES[31832].isHouseDummy).toBe(true);

      expect(CANONICAL_TRAINING_DUMMIES[31833]).toBeDefined();
      expect(CANONICAL_TRAINING_DUMMIES[31833].kind).toBe('monk');
    });

    it('EXERCISE_DUMMY_ITEM_IDS contains all registered item IDs', () => {
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(5787);
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(31827);
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(31828);
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(31829);
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(31830);
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(31831);
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(31832);
      expect(EXERCISE_DUMMY_ITEM_IDS).toContain(31833);
    });

    it('isTrainingDummyId and getTrainingDummyDefinition correctly validate IDs', () => {
      expect(isTrainingDummyId(5787)).toBe(true);
      expect(isTrainingDummyId(31827)).toBe(true);
      expect(isTrainingDummyId(31830)).toBe(true);
      expect(isTrainingDummyId(2160)).toBe(false);
      expect(isTrainingDummyId(99999)).toBe(false);

      const def = getTrainingDummyDefinition(31832);
      expect(def).toBeDefined();
      expect(def?.name).toBe('Monk Exercise Dummy');
      expect(getTrainingDummyDefinition(12345)).toBeUndefined();
    });
  });

  describe('Vocational Visual Action Resolution (Projectiles & Hit Effects)', () => {
    function makeTestChar(vocation: any): CharacterState {
      const char = createCharacter('char-1', 'TestHero', vocation, content);
      char.level = 50;
      return char;
    }

    it('resolves Knight melee training to hit effect 10 and no missile', () => {
      const knight = makeTestChar('Knight');
      const action = resolveTrainingVisualAction(knight, 'sword');
      expect(action.style).toBe('melee');
      expect(action.projectileId).toBeNull();
      expect(action.effectId).toBe(10); // CONST_ME_HITAREA
    });

    it('resolves Paladin distance training to arrow missile 3 and hit effect 10', () => {
      const paladin = makeTestChar('Paladin');
      const action = resolveTrainingVisualAction(paladin, 'distance');
      expect(action.style).toBe('distance');
      expect(action.projectileId).toBe(3); // CONST_ANI_ARROW
      expect(action.effectId).toBe(10);    // CONST_ME_HITAREA
    });

    it('resolves Sorcerer magic level training to fire missile 4 and fire hit effect 16', () => {
      const sorcerer = makeTestChar('Sorcerer');
      const action = resolveTrainingVisualAction(sorcerer, 'magicLevel');
      expect(action.style).toBe('magic');
      expect(action.projectileId).toBe(4); // CONST_ANI_FIRE
      expect(action.effectId).toBe(16);    // CONST_ME_HITBYFIRE
    });

    it('resolves Druid magic level training to ice missile 29 and ice hit effect 44', () => {
      const druid = makeTestChar('Druid');
      const action = resolveTrainingVisualAction(druid, 'magicLevel');
      expect(action.style).toBe('magic');
      expect(action.projectileId).toBe(29); // CONST_ANI_ICE
      expect(action.effectId).toBe(44);     // CONST_ME_ICEATTACK
    });
  });

  describe('advanceTraining Visual Events Generation', () => {
    it('produces training-action visualEvent on weapon attack action tick', () => {
      const game = createIdleGame('test-seed', content);
      game.session.characters[0].vocation = 'Knight';
      game.session.characters[0].baseVocation = 'Knight';

      // Advance by 2000ms (1 weapon attack action interval)
      const updated = advanceTraining(game, content, 2000, 'sword');
      expect(updated.encounter.visualEvents.length).toBeGreaterThan(0);
      const actionEv = updated.encounter.visualEvents.find((e) => e.type === 'training-action');
      expect(actionEv).toBeDefined();
      expect((actionEv as any).style).toBe('melee');
      expect((actionEv as any).effectId).toBe(10);
      expect((actionEv as any).projectileId).toBeNull();
    });

    it('produces training-action visualEvent for Paladin distance training with arrow missile 3', () => {
      const game = createIdleGame('test-seed-paladin', content);
      game.session.characters[0].vocation = 'Paladin';
      game.session.characters[0].baseVocation = 'Paladin';

      const updated = advanceTraining(game, content, 2000, 'distance');
      expect(updated.encounter.visualEvents.length).toBeGreaterThan(0);
      const actionEv = updated.encounter.visualEvents.find((e) => e.type === 'training-action');
      expect(actionEv).toBeDefined();
      expect((actionEv as any).style).toBe('distance');
      expect((actionEv as any).effectId).toBe(10);
      expect((actionEv as any).projectileId).toBe(3);
    });
  });
});
