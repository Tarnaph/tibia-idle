import { describe, expect, it } from 'vitest';
import { createIdleGame, restartHunt, advanceCombat, synchronizeEncounterOccupancy } from '../packages/domain/src';
import { content } from './fixture';

describe('Phase 196: Hunt Pacing and Zone Spacing', () => {
  it('spaces respawn zones along the path so only pull-sized enemies are near the entrance', () => {
    const game = restartHunt(createIdleGame('cyclops-pacing', content, 'cyclops-camp'), 'cyclops-pacing', content, 'cyclops-camp', 'cauteloso');
    
    // Total zones should be 6
    expect(game.encounter.huntRoute?.respawnZones).toHaveLength(6);
    
    const playerPos = game.encounter.partyActors[0].position;
    
    // Nearby enemies within 8 tiles of entrance must only be from Zone 0 (pull size 2-3)
    const nearbyEnemies = game.encounter.enemies.filter(e => 
      Math.abs(e.position.x - playerPos.x) + Math.abs(e.position.y - playerPos.y) <= 8
    );
    expect(nearbyEnemies.length).toBeLessThanOrEqual(3);
    expect(nearbyEnemies.length).toBeGreaterThanOrEqual(2);
    expect(nearbyEnemies.every(e => e.respawnZoneId === 'cyclops-camp-respawn-1')).toBe(true);

    // Verify that all 6 zones have distinct spaced centers along the dungeon
    const zones = game.encounter.huntRoute!.respawnZones;
    for (let i = 1; i < zones.length; i++) {
      const distFromPrev = Math.abs(zones[i].center.x - zones[i - 1].center.x) + Math.abs(zones[i].center.y - zones[i - 1].center.y);
      expect(distFromPrev).toBeGreaterThanOrEqual(5);
    }
  });

  it('enemies have 6-tile detection range in dungeons and 50 in pvp-arena', () => {
    const cyclopsGame = restartHunt(createIdleGame('cyclops-pacing', content, 'cyclops-camp'), 'cyclops-pacing', content, 'cyclops-camp', 'cauteloso');
    for (const enemy of cyclopsGame.encounter.enemies) {
      expect(enemy.detectionRange).toBe(6);
    }

    const arenaGame = restartHunt(createIdleGame('arena-pacing', content, 'pvp-arena'), 'arena-pacing', content, 'pvp-arena');
    for (const enemy of arenaGame.encounter.enemies) {
      expect(enemy.detectionRange).toBe(50);
    }
  });

  it('advances from Zone 0 to Zone 1 when Zone 0 enemies are cleared', () => {
    let game = restartHunt(createIdleGame('cyclops-advance', content, 'cyclops-camp'), 'cyclops-advance', content, 'cyclops-camp', 'cauteloso');
    expect(game.encounter.continuousProgress?.currentZoneIndex).toBe(0);

    // Defeat Zone 0 enemies
    const zone0Id = game.encounter.huntRoute!.respawnZones[0].id;
    for (const enemy of game.encounter.enemies.filter(e => e.respawnZoneId === zone0Id)) {
      enemy.hp = 0;
      enemy.alive = false;
    }
    synchronizeEncounterOccupancy(game.encounter);

    // Advance combat 1 tick to register zone clear
    game = advanceCombat(game, content, 120);

    // Zone index should advance to 1
    expect(game.encounter.continuousProgress?.currentZoneIndex).toBe(1);
    expect(game.encounter.continuousProgress?.zones[0].activeEnemyIds).toHaveLength(0);
    expect(game.encounter.continuousProgress?.zones[0].lastClearedAt).not.toBeNull();
  });
});
