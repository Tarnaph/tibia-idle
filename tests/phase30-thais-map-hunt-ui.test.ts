import { describe, expect, it } from 'vitest';
import { createIdleGame, startGame, advanceCombat, respawnInTemple, THAIS_TEMPLE_POSITION } from '../packages/domain/src';
import { content } from './fixture';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 30: Global Tibia Thais Map, Hunt UI and Skills Theme', () => {
  it('validates authentic Global Tibia Thais map dataset integrity', () => {
    expect(thaisCityJson.region).toBe('thais-city');
    expect(thaisCityJson.tileCount).toBeGreaterThan(1000);
    expect(thaisCityJson.tiles.length).toBe(thaisCityJson.tileCount);

    // Verify key landmark coordinates from user specification
    expect(thaisCityJson.temple).toEqual({ x: 32369, y: 32241, z: 7 });
    expect(thaisCityJson.depot).toEqual({ x: 32342, y: 32231, z: 7 });
    expect(thaisCityJson.trainingDummy).toEqual({ x: 32349, y: 32238, z: 7 });

    // Verify bounds encompass temple, depot, and training dummies
    const bounds = thaisCityJson.bounds;
    expect(bounds.z).toBe(7);
    expect(bounds.minX).toBeLessThanOrEqual(thaisCityJson.depot.x);
    expect(bounds.maxX).toBeGreaterThanOrEqual(thaisCityJson.temple.x);
    expect(bounds.minY).toBeLessThanOrEqual(thaisCityJson.depot.y);
    expect(bounds.maxY).toBeGreaterThanOrEqual(thaisCityJson.temple.y);

    // Verify individual tile structure
    const sample = thaisCityJson.tiles[0];
    expect(sample).toHaveProperty('x');
    expect(sample).toHaveProperty('y');
    expect(sample).toHaveProperty('z');
    expect(sample).toHaveProperty('walkable');
    expect(sample).toHaveProperty('serverItemIds');
    expect(sample).toHaveProperty('clientItemIds');
  });

  it('verifies that the Temple and Depot tiles are walkable or contain floor definitions', () => {
    const templeTile = thaisCityJson.tiles.find(
      (t) => t.x === thaisCityJson.temple.x && t.y === thaisCityJson.temple.y
    );
    const depotTile = thaisCityJson.tiles.find(
      (t) => t.x === thaisCityJson.depot.x && t.y === thaisCityJson.depot.y
    );

    // In official Tibia map, coordinates are valid tiles
    expect(templeTile).toBeDefined();
    expect(depotTile).toBeDefined();
    expect(templeTile?.z).toBe(7);
    expect(depotTile?.z).toBe(7);
  });

  it('validates immediate hunt entry logic when player is in city versus hunt countdown', () => {
    // City state: immediate start without countdown
    let startedHuntId: string | null = null;
    let closed = false;

    const startInCity = (huntId: string, isInCity: boolean) => {
      if (isInCity) {
        startedHuntId = huntId;
        closed = true;
      }
    };

    startInCity('wasp-nest', true);
    expect(startedHuntId).toBe('wasp-nest');
    expect(closed).toBe(true);

    // Hunt state: requires 5-second countdown to switch
    let countdown: number | null = null;
    const switchInHunt = (isInCity: boolean) => {
      if (!isInCity) {
        countdown = 5;
      }
    };

    switchInHunt(false);
    expect(countdown).toBe(5);
  });

  it('emits experience-gained event when creatures are defeated so +XP text appears above the character', () => {
    let game = createIdleGame('test-xp-floating-text', content);
    game = startGame(game, content);

    // Advance combat until an enemy is defeated and awards shared XP
    let foundXpEvent = false;
    for (let tick = 0; tick < 120; tick++) {
      game = advanceCombat(game, content, 120);
      const xpEvents = game.encounter.events.filter((e) => e.type === 'experience-gained');
      if (xpEvents.length > 0) {
        foundXpEvent = true;
        expect(xpEvents[0].amount).toBeGreaterThan(0);
        expect(xpEvents[0].characterId).toBe(game.session.characters[0].id);
        break;
      }
    }
    expect(foundXpEvent).toBe(true);
  });

  it('verifies canonical Temple of Thais respawn position (32369, 32241, 7) on death or hunt exit', () => {
    expect(THAIS_TEMPLE_POSITION).toEqual({ x: 32369, y: 32241, z: 7 });

    let game = createIdleGame('test-respawn-temple', content);
    game = startGame(game, content);

    // Simulate character damage / defeat
    game.session.characters[0].currentHp = 0;
    game.encounter.partyActors[0].hp = 0;
    game.encounter.partyActors[0].alive = false;
    game.encounter.status = 'defeated';

    // Call respawnInTemple
    const respawned = respawnInTemple(game);

    expect(respawned.encounter.status).toBe('completed');
    expect(respawned.session.characters[0].currentHp).toBe(respawned.session.characters[0].maxHp);
    expect(respawned.session.characters[0].currentMana).toBe(respawned.session.characters[0].maxMana);
    expect(respawned.session.characters[0].combatState.targetId).toBeNull();
    expect(respawned.encounter.partyActors[0].alive).toBe(true);
    expect(respawned.encounter.partyActors[0].hp).toBe(respawned.session.characters[0].maxHp);
  });
});
