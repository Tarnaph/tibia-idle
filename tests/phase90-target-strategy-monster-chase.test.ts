import { describe, expect, it } from 'vitest';
import {
  advanceCombat,
  createIdleGame,
  initialHunts,
  moveEnemiesTowardParty,
  movePartyTowardTargets,
  setCharacterTargetStrategy,
  synchronizeEncounterOccupancy,
  isTileWalkable,
  surroundingPositions,
  type GameContent,
  type TargetSelectionStrategy,
} from '@/packages/domain/src';
import economyJson from '@/content/generated/item-economy.json';
import equipmentJson from '@/content/generated/equipment.json';
import monstersJson from '@/content/generated/monsters.json';
import startersJson from '@/content/generated/starter-loadouts.json';
import vocationsJson from '@/content/generated/vocations.json';
import spellsJson from '@/content/generated/spells.json';
import huntRegionsJson from '@/content/generated/hunt-regions.json';
import type { EquipmentCatalog, HuntRegionCatalog, ItemEconomyCatalog, MonsterCatalog, SpellCatalog, StarterLoadoutCatalog, VocationCatalog } from '@/packages/content-schema/src';

const content: GameContent = {
  monsters: (monstersJson as MonsterCatalog).monsters,
  equipment: (equipmentJson as EquipmentCatalog).items,
  vocations: (vocationsJson as VocationCatalog).vocations,
  starterLoadouts: (startersJson as StarterLoadoutCatalog).loadouts,
  spells: (spellsJson as unknown as SpellCatalog).spells,
  huntRegions: (huntRegionsJson as HuntRegionCatalog).regions,
  economy: economyJson as ItemEconomyCatalog,
  hunts: initialHunts,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
};

describe('Phase 90: Universal Monster Chase & Target Selection Strategy (ALVO)', () => {
  it('ensures monsters at any distance in the room aggressively chase the player', () => {
    const game = createIdleGame('chase-seed', content);
    const encounter = game.encounter;
    const player = encounter.partyActors[0];

    // Place monster at (26, 23, 8) which is distance 2.236 away from player at (25, 25, 8)
    encounter.enemies = [
      {
        id: 'far-rat-1',
        monsterId: 'rat',
        name: 'Rat',
        variant: null,
        hp: 20,
        maxHp: 20,
        attackMax: 5,
        defense: 2,
        armor: 1,
        alive: true,
        position: { x: player.position.x + 1, y: player.position.y - 2, z: player.position.z },
        previousPosition: { x: player.position.x + 1, y: player.position.y - 2, z: player.position.z },
        direction: 'south',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'idle',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 50,
      },
    ];

    // Sync occupancy with our custom spawned enemy
    synchronizeEncounterOccupancy(encounter);

    const initialDistance = Math.hypot(encounter.enemies[0].position.x - player.position.x, encounter.enemies[0].position.y - player.position.y);
    expect(initialDistance).toBeGreaterThan(2);

    moveEnemiesTowardParty(encounter);

    // Enemy should have detected the player and moved closer
    const newDistance = Math.hypot(encounter.enemies[0].position.x - player.position.x, encounter.enemies[0].position.y - player.position.y);
    expect(encounter.enemies[0].targetId).toBe(player.characterId);
    expect(encounter.enemies[0].behavior).toBe('chase');
    expect(newDistance).toBeLessThan(initialDistance);
  });

  it('selects lowest-hp target first when targetStrategy is set to lowest-hp ("Menor vida")', () => {
    let game = createIdleGame('strategy-test-1', content);
    const initialPlayer = game.encounter.partyActors[0];

    // Spawn 2 enemies at identical distances, but with different HP values
    game.encounter.enemies = [
      {
        id: 'enemy-full-hp',
        monsterId: 'rat',
        name: 'Rat Full HP',
        variant: null,
        hp: 100,
        maxHp: 100,
        attackMax: 5,
        defense: 2,
        armor: 1,
        alive: true,
        position: { x: initialPlayer.position.x + 1, y: initialPlayer.position.y, z: initialPlayer.position.z },
        previousPosition: { x: initialPlayer.position.x + 1, y: initialPlayer.position.y, z: initialPlayer.position.z },
        direction: 'west',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'idle',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 50,
      },
      {
        id: 'enemy-lowest-hp',
        monsterId: 'rat',
        name: 'Rat Low HP',
        variant: null,
        hp: 15,
        maxHp: 100,
        attackMax: 5,
        defense: 2,
        armor: 1,
        alive: true,
        position: { x: initialPlayer.position.x, y: initialPlayer.position.y + 1, z: initialPlayer.position.z },
        previousPosition: { x: initialPlayer.position.x, y: initialPlayer.position.y + 1, z: initialPlayer.position.z },
        direction: 'north',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'idle',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 50,
      },
    ];

    // Set strategy to 'lowest-hp' ("Menor vida")
    game = setCharacterTargetStrategy(game, initialPlayer.characterId, 'lowest-hp');
    expect(game.session.characters[0].targetStrategy).toBe('lowest-hp');

    // Run movement / targeting engine
    const ranges = new Map([[initialPlayer.characterId, 1]]);
    movePartyTowardTargets(game.encounter, ranges, undefined, initialPlayer.characterId, 'lowest-hp');

    const updatedPlayer = game.encounter.partyActors.find((a) => a.characterId === initialPlayer.characterId)!;
    // The player should select enemy-lowest-hp as target
    expect(updatedPlayer.targetId).toBe('enemy-lowest-hp');
  });

  it('selects highest-hp target first when targetStrategy is set to highest-hp ("Maior vida")', () => {
    let game = createIdleGame('strategy-test-2', content);
    const initialPlayer = game.encounter.partyActors[0];

    // Spawn 2 enemies at identical distances with different HP
    game.encounter.enemies = [
      {
        id: 'enemy-low-hp',
        monsterId: 'rat',
        name: 'Rat Low HP',
        variant: null,
        hp: 20,
        maxHp: 100,
        attackMax: 5,
        defense: 2,
        armor: 1,
        alive: true,
        position: { x: initialPlayer.position.x + 1, y: initialPlayer.position.y, z: initialPlayer.position.z },
        previousPosition: { x: initialPlayer.position.x + 1, y: initialPlayer.position.y, z: initialPlayer.position.z },
        direction: 'west',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'idle',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 50,
      },
      {
        id: 'enemy-highest-hp',
        monsterId: 'rat',
        name: 'Rat High HP',
        variant: null,
        hp: 95,
        maxHp: 100,
        attackMax: 5,
        defense: 2,
        armor: 1,
        alive: true,
        position: { x: initialPlayer.position.x, y: initialPlayer.position.y + 1, z: initialPlayer.position.z },
        previousPosition: { x: initialPlayer.position.x, y: initialPlayer.position.y + 1, z: initialPlayer.position.z },
        direction: 'north',
        path: [],
        targetId: null,
        nextAttackAt: 0,
        attackIntervalMs: 2000,
        speed: 100,
        behavior: 'idle',
        nextRoamAt: 0,
        nextMoveAt: 0,
        detectionRange: 50,
      },
    ];

    // Set strategy to 'highest-hp' ("Maior vida")
    game = setCharacterTargetStrategy(game, initialPlayer.characterId, 'highest-hp');
    expect(game.session.characters[0].targetStrategy).toBe('highest-hp');

    // Run movement / targeting engine
    const ranges = new Map([[initialPlayer.characterId, 1]]);
    movePartyTowardTargets(game.encounter, ranges, undefined, initialPlayer.characterId, 'highest-hp');

    const updatedPlayer = game.encounter.partyActors.find((a) => a.characterId === initialPlayer.characterId)!;
    // The player should select enemy-highest-hp as target
    expect(updatedPlayer.targetId).toBe('enemy-highest-hp');
  });
});
