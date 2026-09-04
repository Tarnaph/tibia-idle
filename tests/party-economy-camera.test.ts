import { describe, expect, it } from 'vitest';
import {
  addPartyMember, createIdleGame, findEquipment, restartHunt, sellAllLoot, sharedExperiencePerCharacter,
} from '../packages/domain/src';
import { calculatePixelCamera } from '../packages/presentation/src';
import { content } from './fixture';

describe('party creation', () => {
  it('allows four unique vocations and rejects a fifth member', () => {
    let state = createIdleGame('party-max', content);
    state = addPartyMember(state, 'Pala', 'Paladin', content);
    state = addPartyMember(state, 'Sorc', 'Sorcerer', content);
    state = addPartyMember(state, 'Druid', 'Druid', content);
    expect(state.session.characters).toHaveLength(4);
    expect(() => addPartyMember(state, 'Extra', 'Paladin', content)).toThrow('4 membros');
  });

  it('allows adding party members and creates independent state', () => {
    const base = createIdleGame('party-unique', content);
    const added = addPartyMember(base, 'Pala', 'Paladin', content);
    expect(added.session.characters[1]).not.toBe(added.session.characters[0]);
    expect(added.session.characters[1].vocation).toBe('Paladin');
  });

  it('gives every vocation a valid firstitems.lua starter loadout', () => {
    for (const starter of content.starterLoadouts) {
      for (const itemId of Object.values(starter.equipped).filter((id): id is number => id !== null)) {
        expect(findEquipment(content.equipment, itemId), `${starter.vocation} item ${itemId}`).toBeDefined();
      }
    }
  });

  it('places a newly created member in the next simulation', () => {
    const added = addPartyMember(createIdleGame('party-actor', content), 'Pala', 'Paladin', content);
    const hunt = restartHunt(added, 'party-actor', content);
    expect(hunt.encounter.partyActors.map((actor) => actor.characterId)).toEqual(added.session.characters.map((character) => character.id));
  });

  it('uses the exact unique-vocation shared XP multiplier rule', () => {
    let state = createIdleGame('party-xp', content);
    state = addPartyMember(state, 'Pala', 'Paladin', content);
    state = addPartyMember(state, 'Sorc', 'Sorcerer', content);
    state = addPartyMember(state, 'Druid', 'Druid', content);
    expect(sharedExperiencePerCharacter(40, state.session.characters)).toBe(20);
  });
});

describe('Loot Pouch economy', () => {
  it('uses the imported NPC sell price for Sword 2376', () => {
    const economy = content.economy.items.find((item) => item.itemId === 2376);
    expect(economy).toMatchObject({ canonicalSellPrice: 25, status: 'sellable' });
    expect(economy?.offers[0].sourceNpc).toBe('Mad');
  });

  it('sells quantity × price, raises gold and removes sold loot', () => {
    const state = createIdleGame('sell', content);
    state.session.loot = [{ itemId: 2376, name: 'sword', amount: 3 }];
    const result = sellAllLoot(state, content);
    expect(result.goldEarned).toBe(75); expect(result.state.session.gold).toBe(75); expect(result.state.session.loot).toEqual([]);
  });

  it('keeps items whose sell price is unknown', () => {
    const state = createIdleGame('unknown-price', content);
    state.session.loot = [{ itemId: 999999, name: 'mysterious artifact', amount: 2 }];
    const result = sellAllLoot(state, content);
    expect(result.goldEarned).toBe(0); expect(result.state.session.loot).toEqual(state.session.loot);
  });
});

describe('pixel-perfect camera', () => {
  it.each([[1920, 1080], [2560, 1080], [2560, 1440]])('covers %i×%i without fractional tile scaling', (width, height) => {
    const camera = calculatePixelCamera(width - 540, height - 102);
    expect(Number.isInteger(camera.scale)).toBe(true);
    expect(camera.tilePixelSize).toBe(32 * camera.scale);
    expect(camera.visibleColumns * camera.tilePixelSize).toBeGreaterThanOrEqual(width - 540);
    expect(camera.visibleRows * camera.tilePixelSize).toBeGreaterThanOrEqual(height - 102);
  });

  it('remains valid after resize and never distorts X/Y independently', () => {
    const small = calculatePixelCamera(900, 600); const large = calculatePixelCamera(1800, 1200);
    expect(small.scale).toBeGreaterThanOrEqual(1); expect(large.scale).toBeGreaterThanOrEqual(small.scale);
    expect(small.tilePixelSize / 32).toBe(small.scale); expect(large.tilePixelSize / 32).toBe(large.scale);
  });
});
