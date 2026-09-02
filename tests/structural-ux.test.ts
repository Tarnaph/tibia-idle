import { describe, expect, it } from 'vitest';
import regionsJson from '../content/generated/hunt-regions.json';
import {
  addPartyMember, advanceCombat, availableOwnedEquipmentIds, characterCapacity, createIdleGame,
  inventoryWeight, itemLootPreference, reorderOwnedEquipment, resolveNextHuntObjective, selectCharacter,
  sellAllLoot, sellLootStack, startGame, updateItemLootPreference,
} from '../packages/domain/src';
import type { HuntRegionCatalog } from '../packages/content-schema/src';
import { content } from './fixture';

describe('structural hunt and inventory UX', () => {
  it('keeps every real hunt region large, populated and almost fully backed by OTBM tiles', () => {
    const regions = (regionsJson as HuntRegionCatalog).regions;
    expect(regions).toHaveLength(5);
    for (const region of regions) {
      expect(region.bounds.width).toBeGreaterThanOrEqual(45);
      expect(region.bounds.height).toBeGreaterThanOrEqual(30);
      expect(region.spawnPositions.length).toBeGreaterThanOrEqual(6);
      expect(region.tiles.length / (region.bounds.width * region.bounds.height)).toBeGreaterThan(0.98);
      expect(region.tiles.filter((tile) => tile.walkable).length).toBeGreaterThan(100);
    }
  });

  it('always resolves a continuous objective and completes a route loop without becoming idle', () => {
    let state = startGame(createIdleGame('continuous-objective', content), content);
    expect(resolveNextHuntObjective(state)).not.toBeNull();
    for (let tick = 0; tick < 5_000 && (state.encounter.continuousProgress?.loopCount ?? 0) === 0; tick += 1) {
      state = advanceCombat(state, content, 720);
      expect(resolveNextHuntObjective(state)).not.toBeNull();
    }
    expect(state.encounter.continuousProgress?.loopCount).toBeGreaterThan(0);
    expect(state.encounter.status).toBe('running');
  }, 30_000);

  it('selects the party member and camera target atomically', () => {
    const party = addPartyMember(createIdleGame('party-selection', content), 'Lyra', 'Paladin', content);
    const selected = selectCharacter(party, party.session.characters[1].id);
    expect(selected.session.selectedCharacterId).toBe(party.session.characters[1].id);
    expect(selected.session.cameraTargetCharacterId).toBe(party.session.characters[1].id);
  });

  it('derives capacity and weight and preserves backpack reorder', () => {
    const state = createIdleGame('inventory-order', content);
    const before = availableOwnedEquipmentIds(state);
    const reordered = reorderOwnedEquipment(state, 0, 2);
    expect(reordered.session.characters[0].inventory.equipmentIds[2]).toBe(state.session.characters[0].inventory.equipmentIds[0]);
    expect(availableOwnedEquipmentIds(reordered)).not.toEqual(before);
    expect(characterCapacity(state.session.characters[0], content)).toBe(400);
    expect(inventoryWeight(state.session.characters[0], content.equipment)).toBeGreaterThan(0);
  });

  it('persists loot preferences, protects locked stacks and sells an eligible whole stack', () => {
    let state = createIdleGame('loot-preferences', content);
    state = { ...state, session: { ...state.session, loot: [{ itemId: 2464, name: 'chain armor', amount: 2 }, { itemId: 2376, name: 'sword', amount: 1 }] } };
    state = updateItemLootPreference(state, 2464, { autoLoot: false, lockSell: true, quickSell: true });
    expect(itemLootPreference(state, 2464)).toMatchObject({ autoLoot: false, lockSell: true, quickSell: true });
    const all = sellAllLoot(state, content);
    expect(all.state.session.loot.some((stack) => stack.itemId === 2464)).toBe(true);
    expect(sellLootStack(state, content, 2464).goldEarned).toBe(0);
    const unlocked = updateItemLootPreference(state, 2464, { lockSell: false });
    const sold = sellLootStack(unlocked, content, 2464);
    expect(sold.soldStacks).toBe(1);
    expect(sold.state.session.loot.some((stack) => stack.itemId === 2464)).toBe(false);
  });
});
