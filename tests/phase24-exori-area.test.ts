import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  startGame,
  triggerManualHotbarAction,
  advanceCombat,
  synchronizeEncounterOccupancy,
  findMeleeApproachTiles,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 24: Área Autêntica da Magia Exori (SQUARE1X1 3x3 e Efeito Visual)', () => {

  it('configures Berserk (exori) with official realmap11 formula and square-1x1 area', () => {
    const berserk = content.spells.find((s) => s.name === 'Berserk');
    expect(berserk).toBeDefined();
    expect(berserk?.words).toBe('exori');
    expect(berserk?.area).toBe('square-1x1');
    expect(berserk?.visual.effectId).toBe(10); // CONST_ME_HITAREA
    expect(berserk?.formula.kind).toBe('skill-attack');
    expect(berserk?.formula.min.skillAttack).toBe(0.07);
    expect(berserk?.formula.max.skillAttack).toBe(0.09);
  });

  it('projects spell-visual events across all 8 surrounding tiles when exori is cast', () => {
    const state = startGame(createIdleGame('test-exori-area-visual', content, 'rat-cellars'), content);
    const actor = state.encounter.partyActors[0];
    const character = state.session.characters.find((c) => c.id === actor.characterId)!;

    // Put Berserk (spellId: 80) in hotbar slot 1
    character.hotbar[0] = 80;
    character.level = 50;
    actor.mana = 200;

    // Clear initial events
    state.encounter.events = [];

    // Manually trigger Berserk
    const success = triggerManualHotbarAction(state, actor.characterId, 80, content);
    expect(success).toBe(true);

    // Filter spell-visual events with effectId 10
    const areaVisuals = state.encounter.events.filter(
      (e) => e.type === 'spell-visual' && e.spellId === 80 && e.effectId === 10 && e.targetPosition,
    );

    expect(areaVisuals.length).toBe(8);

    // Verify all 8 surrounding offsets exist:
    const offsets = areaVisuals.map((v) => {
      const pos = (v as { targetPosition: { x: number; y: number } }).targetPosition;
      return `${pos.x - actor.position.x},${pos.y - actor.position.y}`;
    });

    const expectedOffsets = new Set([
      '-1,-1', '0,-1', '1,-1',
      '-1,0',          '1,0',
      '-1,1',  '0,1',  '1,1',
    ]);

    expect(new Set(offsets)).toEqual(expectedOffsets);
  });

  it('damages all enemies in the 3x3 square area simultaneously when exori hits', () => {
    let state = startGame(createIdleGame('test-exori-multi-damage', content, 'rat-cellars'), content);
    const actor = state.encounter.partyActors[0];
    const character = state.session.characters.find((c) => c.id === actor.characterId)!;

    character.hotbar[0] = 80; // Berserk
    character.level = 80;
    actor.mana = 300;

    const approaches = findMeleeApproachTiles(state.encounter.room.map, actor.position, new Set(state.encounter.room.occupancy.keys()));
    expect(approaches.length).toBeGreaterThanOrEqual(2);

    // Position 2 enemies adjacent to the player (in different tiles of the 3x3 square)
    const rat1 = state.encounter.enemies[0];
    rat1.alive = true;
    rat1.hp = 100;
    rat1.maxHp = 100;
    rat1.position = { ...approaches[0] };
    rat1.previousPosition = { ...approaches[0] };

    const rat2 = state.encounter.enemies[1];
    rat2.alive = true;
    rat2.hp = 100;
    rat2.maxHp = 100;
    rat2.position = { ...approaches[1] };
    rat2.previousPosition = { ...approaches[1] };

    synchronizeEncounterOccupancy(state.encounter);

    // Manually trigger Berserk
    const success = triggerManualHotbarAction(state, actor.characterId, 80, content);
    expect(success).toBe(true);

    // Both rats must have taken damage
    expect(rat1.hp).toBeLessThan(100);
    expect(rat2.hp).toBeLessThan(100);

    // Combat log must mention both targets
    const spellLogs = state.encounter.log.filter((l) => l.message.includes('usou Berserk em'));
    expect(spellLogs.length).toBe(2);
  });

  it('allows manual casting of exori even with no enemies in range, playing the full 3x3 animation', () => {
    const state = startGame(createIdleGame('test-exori-empty-cast', content, 'rat-cellars'), content);
    const actor = state.encounter.partyActors[0];
    const character = state.session.characters.find((c) => c.id === actor.characterId)!;

    character.hotbar[0] = 80;
    character.level = 50;
    actor.mana = 200;

    // Mark all enemies inactive to test empty casting
    for (const enemy of state.encounter.enemies) {
      enemy.alive = false;
    }
    synchronizeEncounterOccupancy(state.encounter);

    state.encounter.events = [];
    const initialMana = actor.mana;

    const success = triggerManualHotbarAction(state, actor.characterId, 80, content);
    expect(success).toBe(true);
    expect(actor.mana).toBeLessThan(initialMana);

    // 8-tile visual events still generated
    const areaVisuals = state.encounter.events.filter(
      (e) => e.type === 'spell-visual' && e.spellId === 80 && e.effectId === 10 && e.targetPosition,
    );
    expect(areaVisuals.length).toBe(8);
  });
});
