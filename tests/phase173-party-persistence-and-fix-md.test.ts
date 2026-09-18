import { describe, it, expect } from 'vitest';
import {
  addPartyMember,
  createIdleGame,
  restartHunt,
  triggerManualHotbarAction,
  calculateTrainingTimeEstimate,
  addTrainingTries,
  selectCharacter,
} from '../packages/domain/src';
import { content } from './fixture';
import { resolveSkillKey } from '../apps/web/lib/characterHydration';

describe('Phase 173 - FIX.md Resolutions', () => {
  describe('1. Duplicação de Magia (Spell Speech Deduplication)', () => {
    it('emits speech on only ONE spell-cast event when an area spell hits multiple targets', () => {
      let game = createIdleGame('test-p173-spell', content);
      game = addPartyMember(game, 'Pyromancer', 'Sorcerer', content);
      const sorcerer = game.session.characters.find((c) => c.name === 'Pyromancer')!;
      sorcerer.level = 50;
      sorcerer.currentMana = 300;
      sorcerer.maxMana = 300;
      sorcerer.skills.magicLevel = 45;
      sorcerer.hotbar = [19]; // Fire Wave (exevo flam hur)

      const hunting = restartHunt(game, 'test-p173-spell', content, 'rat-cellars');
      const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;

      // Position two living enemies south of actor in wave path
      const aliveEnemies = hunting.encounter.enemies.filter((e) => e.alive);
      expect(aliveEnemies.length).toBeGreaterThanOrEqual(2);

      actor.direction = 'south';
      actor.targetId = aliveEnemies[0].id;
      aliveEnemies[0].position = { x: actor.position.x, y: actor.position.y + 1, z: actor.position.z };
      aliveEnemies[1].position = { x: actor.position.x, y: actor.position.y + 2, z: actor.position.z };

      hunting.encounter.enemies = [aliveEnemies[0], aliveEnemies[1]];

      const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 19, content);
      expect(triggered).toBe(true);

      const spellCasts = hunting.encounter.events.filter(
        (e) => e.type === 'spell-cast' && e.spellId === 19
      ) as any[];

      // Both enemies took damage
      expect(spellCasts.length).toBe(2);
      // But only the FIRST target event carries speech!
      const withSpeech = spellCasts.filter((e) => Boolean(e.speech));
      expect(withSpeech.length).toBe(1);
      expect(withSpeech[0].speech).toBe('Exevo Flam Hur');
    });

    it('emits speech on only ONE spell-cast event when an area rune hits multiple targets', () => {
      let game = createIdleGame('test-p173-gfb', content);
      game = addPartyMember(game, 'RuneMaster', 'Sorcerer', content);
      const sorcerer = game.session.characters.find((c) => c.name === 'RuneMaster')!;
      sorcerer.level = 50;
      sorcerer.skills.magicLevel = 45;
      sorcerer.hotbar = [2304]; // Great Fireball Rune

      const hunting = restartHunt(game, 'test-p173-gfb', content, 'rat-cellars');
      const actor = hunting.encounter.partyActors.find((a) => a.characterId === sorcerer.id)!;

      const aliveEnemies = hunting.encounter.enemies.filter((e) => e.alive);
      expect(aliveEnemies.length).toBeGreaterThanOrEqual(2);

      const primary = aliveEnemies[0];
      primary.position = { x: actor.position.x + 2, y: actor.position.y, z: actor.position.z };
      aliveEnemies[1].position = { x: primary.position.x + 1, y: primary.position.y, z: primary.position.z };

      const triggered = triggerManualHotbarAction(hunting, sorcerer.id, 2304, content);
      expect(triggered).toBe(true);

      const gfbCasts = hunting.encounter.events.filter(
        (e) => e.type === 'spell-cast' && e.spellId === 2304
      ) as any[];

      expect(gfbCasts.length).toBe(2);
      const withSpeech = gfbCasts.filter((e) => Boolean(e.speech));
      expect(withSpeech.length).toBe(1);
      expect(withSpeech[0].speech).toBe('Great Fireball');
    });
  });

  describe('2. Persistência de Alts da Party & Deserialização de Skills', () => {
    it('resolveSkillKey correctly maps numeric skillIds and string skillNames to domain keys', () => {
      expect(resolveSkillKey({ skillId: 0 })).toBe('fist');
      expect(resolveSkillKey({ skillId: 1 })).toBe('club');
      expect(resolveSkillKey({ skillId: 2 })).toBe('sword');
      expect(resolveSkillKey({ skillId: 3 })).toBe('axe');
      expect(resolveSkillKey({ skillId: 4 })).toBe('distance');
      expect(resolveSkillKey({ skillId: 5 })).toBe('shielding');
      expect(resolveSkillKey({ skillId: 6 })).toBe('fishing');
      expect(resolveSkillKey({ skillId: 7 })).toBe('magicLevel');

      expect(resolveSkillKey({ skillName: 'Sword Fighting' })).toBe('sword');
      expect(resolveSkillKey({ skillName: 'Club Fighting' })).toBe('club');
      expect(resolveSkillKey({ skillName: 'Magic Level' })).toBe('magicLevel');
      expect(resolveSkillKey({ skillName: 'Distance Fighting' })).toBe('distance');
    });

    it('correctly deserializes skills array into CharacterSkills and CharacterSkillTries', () => {
      let game = createIdleGame('test-p173-skills', content);
      game = addPartyMember(game, 'AltKnight', 'Knight', content);
      const ch = game.session.characters.find((c) => c.name === 'AltKnight')!;

      const rawDbSkills = [
        { skillId: 2, skillName: 'Sword Fighting', value: 85, tries: 450 },
        { skillId: 5, skillName: 'Shielding', value: 80, tries: 210 },
        { skillId: 7, skillName: 'Magic Level', value: 9, tries: 99 },
      ];

      rawDbSkills.forEach((sk) => {
        const key = resolveSkillKey(sk);
        if (key && ch.skills[key] !== undefined) {
          ch.skills[key] = sk.value;
          if (key !== 'fishing' && ch.skillTries && ch.skillTries[key] !== undefined) {
            ch.skillTries[key] = Number(sk.tries);
          }
        }
      });

      expect(ch.skills.sword).toBe(85);
      expect(ch.skillTries.sword).toBe(450);
      expect(ch.skills.shielding).toBe(80);
      expect(ch.skillTries.shielding).toBe(210);
      expect(ch.skills.magicLevel).toBe(9);
      expect(ch.skillTries.magicLevel).toBe(99);
    });

    it('selectCharacter switches active character and camera target', () => {
      let game = createIdleGame('test-p173-select', content);
      game = addPartyMember(game, 'HeroA', 'Knight', content);
      game = addPartyMember(game, 'HeroB', 'Sorcerer', content);

      const charB = game.session.characters.find((c) => c.name === 'HeroB')!;
      const selected = selectCharacter(game, charB.id);

      expect(selected.session.selectedCharacterId).toBe(charB.id);
      expect(selected.session.cameraTargetCharacterId).toBe(charB.id);
    });
  });

  describe('3. Treino de Skill (Continuous Auto-Leveling & No "Pronto para upar!")', () => {
    it('immediately levels up skill in calculateTrainingTimeEstimate when currentTries >= requiredTries', () => {
      let game = createIdleGame('test-p173-training-auto', content);
      game = addPartyMember(game, 'Trainee', 'Knight', content);
      const knight = game.session.characters.find((c) => c.name === 'Trainee')!;

      knight.skills.sword = 15;
      // Set tries way above requirement to simulate pending level
      knight.skillTries.sword = 99999;

      const estimate = calculateTrainingTimeEstimate(knight, 'sword', content);
      // Sword level should have immediately advanced beyond 15!
      expect(knight.skills.sword).toBeGreaterThan(15);
      expect(estimate.currentLevel).toBe(knight.skills.sword);
      expect(estimate.targetLevel).toBe(knight.skills.sword + 1);
    });

    it('formats time as "< 1s" instead of "Pronto para upar!" when remainingSeconds <= 0', () => {
      let game = createIdleGame('test-p173-training-label', content);
      game = addPartyMember(game, 'MageTrainee', 'Sorcerer', content);
      const sorcerer = game.session.characters.find((c) => c.name === 'MageTrainee')!;

      sorcerer.skills.magicLevel = 10;
      sorcerer.skillTries.magicLevel = 0;

      const estimate = calculateTrainingTimeEstimate(sorcerer, 'magicLevel', content);
      expect(estimate.formattedTime).not.toBe('Pronto para upar!');
      if (estimate.remainingSeconds <= 0) {
        expect(estimate.formattedTime).toBe('< 1s');
      } else {
        expect(estimate.formattedTime).toMatch(/\d+/);
      }
    });
  });
});
