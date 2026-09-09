import { describe, expect, it } from 'vitest';
import { content } from './fixture';
import { createIdleGame, reorderHotbar } from '../packages/domain/src';

describe('Phase 114 - Hotbar Drag-and-Drop Skill Reordering & Swapping', () => {
  function createTestCharacter() {
    const game = createIdleGame('seed-p114-hotbar-drag', content, 'rat-cellars');
    const character = structuredClone(game.session.characters[0]);
    character.spells = [6, 80, 107];
    character.hotbar = [6, 80, 107];
    character.hotbarConfigs = {
      0: {
        enabled: true,
        healingTarget: 'self',
        conditions: [
          { id: 'c1', target: 'self', metric: 'hp', operator: 'lte', value: 60, isPercent: true },
        ],
      },
      1: {
        enabled: true,
        healingTarget: 'self',
        conditions: [
          { id: 'c2', target: 'self', metric: 'hp', operator: 'lte', value: 30, isPercent: true },
        ],
      },
    };
    return character;
  }

  it('swaps two adjacent occupied hotbar slots (F1 <-> F2)', () => {
    const baseCharacter = createTestCharacter();
    const updated = reorderHotbar(baseCharacter, 0, 1);

    expect(updated.hotbar[0]).toBe(80);
    expect(updated.hotbar[1]).toBe(6);
    expect(updated.hotbar[2]).toBe(107);
  });

  it('swaps two non-adjacent hotbar slots without displacing intermediate slots (F1 <-> F3)', () => {
    const baseCharacter = createTestCharacter();
    const updated = reorderHotbar(baseCharacter, 0, 2);

    expect(updated.hotbar[0]).toBe(107);
    expect(updated.hotbar[1]).toBe(80); // F2 remains untouched!
    expect(updated.hotbar[2]).toBe(6);
  });

  it('moves a skill to an empty slot and clears the source slot', () => {
    const baseCharacter = createTestCharacter();
    // Slot 5 is empty (0)
    const updated = reorderHotbar(baseCharacter, 0, 5);

    expect(updated.hotbar[0]).toBe(0); // Source becomes empty
    expect(updated.hotbar[1]).toBe(80);
    expect(updated.hotbar[2]).toBe(107);
    expect(updated.hotbar[5]).toBe(6); // Moved to F6
  });

  it('swaps hotbarConfigs along with the skills between slots', () => {
    const baseCharacter = createTestCharacter();
    const updated = reorderHotbar(baseCharacter, 0, 1);

    expect(updated.hotbarConfigs?.[0]?.conditions?.[0]?.value).toBe(30);
    expect(updated.hotbarConfigs?.[1]?.conditions?.[0]?.value).toBe(60);
  });

  it('migrates hotbarConfig when moving to an empty slot with no prior config', () => {
    const baseCharacter = createTestCharacter();
    const updated = reorderHotbar(baseCharacter, 0, 4);

    expect(updated.hotbarConfigs?.[0]).toBeUndefined();
    expect(updated.hotbarConfigs?.[4]?.conditions?.[0]?.value).toBe(60);
  });

  it('pads the hotbar array to standard 20 slots when dragging to a distant slot', () => {
    const baseCharacter = createTestCharacter();
    const updated = reorderHotbar(baseCharacter, 0, 15);

    expect(updated.hotbar.length).toBeGreaterThanOrEqual(20);
    expect(updated.hotbar[0]).toBe(0);
    expect(updated.hotbar[15]).toBe(6);
  });

  it('returns unchanged character if fromIndex === toIndex or indices are out of bounds', () => {
    const baseCharacter = createTestCharacter();
    const same = reorderHotbar(baseCharacter, 1, 1);
    expect(same).toBe(baseCharacter);

    const negative = reorderHotbar(baseCharacter, -1, 2);
    expect(negative).toBe(baseCharacter);

    const outOfBounds = reorderHotbar(baseCharacter, 0, 99);
    expect(outOfBounds).toBe(baseCharacter);
  });
});
