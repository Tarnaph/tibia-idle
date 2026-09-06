import { describe, expect, it } from 'vitest';
import {
  createIdleGame,
  unequipSlotToBag,
  equipItemFromContainer,
  setActorTarget,
  advanceCombat,
  experienceForLevel,
  startGame,
  findMeleeApproachTiles,
  synchronizeEncounterOccupancy,
  type GameContent,
} from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 27: Unequip to Bag, Strict Target Lock, and Level Up Announcement', () => {
  it('unequips an equipped item directly into game.session.bag without losing it', () => {
    const game = createIdleGame('phase27-test-1', content);
    const knight = game.session.characters.find((c) => c.vocation.includes('Knight'))!;

    // Knight starts with a weapon or armor equipped
    expect(knight.equipment.leftHand).not.toBeNull();
    const weaponId = knight.equipment.leftHand!;

    // Initial bag count
    const initialBagCount = game.session.bag?.length ?? 0;

    // Unequip weapon
    const afterUnequip = unequipSlotToBag(game, knight.id, 'leftHand', content);
    const updatedKnight = afterUnequip.session.characters.find((c) => c.id === knight.id)!;

    // Slot is now null
    expect(updatedKnight.equipment.leftHand).toBeNull();

    // Item was placed into bag
    expect(afterUnequip.session.bag).toBeDefined();
    expect(afterUnequip.session.bag!.length).toBe(initialBagCount + 1);

    const unequippedItem = afterUnequip.session.bag!.find((item) => item.itemId === weaponId);
    expect(unequippedItem).toBeDefined();
    expect(unequippedItem?.amount).toBe(1);
    expect(unequippedItem?.name).toBeTruthy();
  });

  it('equips an item from the bag, returning any previous item in that slot back to the bag', () => {
    let game = createIdleGame('phase27-test-2', content);
    const knight = game.session.characters.find((c) => c.vocation.includes('Knight'))!;
    const originalWeaponId = knight.equipment.leftHand!;

    // Pick Sword (itemId 2376)
    const testWeaponDef = content.equipment.find((eq) => eq.id === 2376)!;

    game = {
      ...game,
      session: {
        ...game.session,
        bag: [
          ...(game.session.bag ?? []),
          {
            itemId: testWeaponDef.id,
            name: testWeaponDef.name,
            amount: 1,
          },
        ],
      },
    };

    const bagCountBefore = game.session.bag!.length;

    // Equip the new weapon from container
    const afterEquip = equipItemFromContainer(game, knight.id, testWeaponDef.id, content);
    const updatedKnight = afterEquip.session.characters.find((c) => c.id === knight.id)!;

    // New weapon is now equipped in leftHand
    expect(updatedKnight.equipment.leftHand).toBe(testWeaponDef.id);

    // The original weapon was swapped back to the bag
    const swappedBack = afterEquip.session.bag!.find((item) => item.itemId === originalWeaponId);
    expect(swappedBack).toBeDefined();
    expect(swappedBack?.amount).toBe(1);

    // The test weapon is no longer in the bag
    const inBag = afterEquip.session.bag!.find((item) => item.itemId === testWeaponDef.id);
    expect(inBag).toBeUndefined();

    // Bag total count remains consistent (swapped 1 for 1)
    expect(afterEquip.session.bag!.length).toBe(bagCountBefore);
  });

  it('strictly targets and attacks the locked target (actor.targetId) without switching to other enemies', () => {
    let state = startGame(createIdleGame('test-target-locked', content, 'rat-cellars'), content);
    const actor = state.encounter.partyActors[0];

    const approaches = findMeleeApproachTiles(state.encounter.room.map, actor.position, new Set(state.encounter.room.occupancy.keys()));
    expect(approaches.length).toBeGreaterThan(1);
    const tileA = approaches[0];
    const tileB = approaches[1];

    const ratA = state.encounter.enemies[0];
    ratA.alive = true;
    ratA.position = { ...tileA };
    ratA.previousPosition = { ...tileA };

    const ratB = state.encounter.enemies[1];
    ratB.alive = true;
    ratB.position = { ...tileB };
    ratB.previousPosition = { ...tileB };

    // Both rats are adjacent in melee range. Player explicitly targets ratB:
    actor.targetId = ratB.id;
    actor.attackIntervalMs = 100;
    actor.nextAttackAt = 0;

    synchronizeEncounterOccupancy(state.encounter);

    // Advance combat: player should target and attack ratB
    state = advanceCombat(state, content, 200);

    // Actor targetId remains ratB and attack hits ratB
    expect(state.encounter.partyActors[0].targetId).toBe(ratB.id);
    expect(state.encounter.partyActors[0].pendingAttack?.targetId).toBe(ratB.id);
  });

  it('allows setActorTarget to update the active target', () => {
    const game = createIdleGame('phase27-test-3', content);
    const knight = game.session.characters[0];

    const updated = setActorTarget(game, knight.id, 'monster-target-99');
    const actor = updated.encounter.partyActors.find((a) => a.characterId === knight.id);
    const char = updated.session.characters.find((c) => c.id === knight.id);

    expect(actor?.targetId).toBe('monster-target-99');
    expect(char?.combatState.targetId).toBe('monster-target-99');
  });

  it('emits level-up event with previousLevel and authentic announcement message format', () => {
    let state = startGame(createIdleGame('test-target-levelup', content, 'rat-cellars'), content);
    const char = state.session.characters[0];
    const initialLevel = char.level;
    const actor = state.encounter.partyActors[0];

    const approaches = findMeleeApproachTiles(state.encounter.room.map, actor.position, new Set(state.encounter.room.occupancy.keys()));
    const frontTile = approaches[0];

    const targetRat = state.encounter.enemies[0];
    targetRat.alive = true;
    targetRat.position = { ...frontTile };
    targetRat.previousPosition = { ...frontTile };
    targetRat.hp = 1;
    targetRat.maxHp = 1;
    const ratDef = content.monsters.find((m) => m.id === targetRat.monsterId);
    if (ratDef) ratDef.experience = 50000;
    (targetRat as any).experience = 50000;

    actor.targetId = targetRat.id;
    actor.attackIntervalMs = 100;
    actor.nextAttackAt = 0;

    synchronizeEncounterOccupancy(state.encounter);

    // Advance combat: attack starts and impacts
    state = advanceCombat(state, content, 200);
    state = advanceCombat(state, content, 200);

    const updatedChar = state.session.characters.find((c) => c.id === char.id)!;
    expect(updatedChar.level).toBeGreaterThan(initialLevel);

    const levelUpEvent = state.encounter.events.find((e) => e.type === 'level-up');
    expect(levelUpEvent).toBeDefined();
    expect(levelUpEvent?.previousLevel).toBe(initialLevel);
    expect(levelUpEvent?.message).toBe(`You advanced from Level ${initialLevel} to Level ${initialLevel + 1}.`);
  });
});
