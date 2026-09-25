import { describe, expect, it } from 'vitest';
import {
  createContinuousHuntRoute,
  getPullSizeCounts,
  getPullSizeMonsterPool,
  initialHunts,
  restartHunt,
  type GameContent,
  type GameState,
  type HuntPullSize,
} from '../packages/domain/src';
import { createRoomState } from '../packages/domain/src/spatial/rooms';

describe('Phase 195: Hunt Pull Size Difficulties & Monster Variants', () => {
  it('correctly maps pull sizes to spawn counts (cauteloso [2,3], ousado [4,4], agressivo [5,6])', () => {
    expect(getPullSizeCounts('elf-sanctuary', 'cauteloso')).toEqual([2, 3]);
    expect(getPullSizeCounts('elf-sanctuary', 'ousado')).toEqual([4, 4]);
    expect(getPullSizeCounts('elf-sanctuary', 'agressivo')).toEqual([5, 6]);

    // PvP Arena always maintains 1v1
    expect(getPullSizeCounts('pvp-arena', 'cauteloso')).toEqual([1, 1]);
    expect(getPullSizeCounts('pvp-arena', 'ousado')).toEqual([1, 1]);
    expect(getPullSizeCounts('pvp-arena', 'agressivo')).toEqual([1, 1]);
  });

  it('correctly applies monster composition variants based on difficulty', () => {
    // Elf Fortress: cauteloso -> elf | ousado -> elf + elf-scout | agressivo -> elf + elf-scout + elf-arcanist
    expect(getPullSizeMonsterPool('elf-sanctuary', 'cauteloso')).toEqual(['elf']);
    expect(getPullSizeMonsterPool('elf-sanctuary', 'ousado')).toEqual(['elf', 'elf-scout']);
    expect(getPullSizeMonsterPool('elf-sanctuary', 'agressivo')).toEqual(['elf', 'elf-scout', 'elf-arcanist']);

    // Rat Cellars: cauteloso -> rat | ousado -> rat + cave-rat | agressivo -> rat + cave-rat
    expect(getPullSizeMonsterPool('rat-cellars', 'cauteloso')).toEqual(['rat']);
    expect(getPullSizeMonsterPool('rat-cellars', 'ousado')).toEqual(['rat', 'cave-rat']);
    expect(getPullSizeMonsterPool('rat-cellars', 'agressivo')).toEqual(['rat', 'cave-rat']);

    // Cyclops Camp: cauteloso -> cyclops | ousado/agressivo -> cyclops + cyclops-smith
    expect(getPullSizeMonsterPool('cyclops-camp', 'cauteloso')).toEqual(['cyclops']);
    expect(getPullSizeMonsterPool('cyclops-camp', 'ousado')).toEqual(['cyclops', 'cyclops-smith']);
    expect(getPullSizeMonsterPool('cyclops-camp', 'agressivo')).toEqual(['cyclops', 'cyclops-smith']);

    // Dragon Lair: cauteloso/ousado -> dragon | agressivo -> dragon + dragon-lord
    expect(getPullSizeMonsterPool('dragon-lair', 'cauteloso')).toEqual(['dragon']);
    expect(getPullSizeMonsterPool('dragon-lair', 'ousado')).toEqual(['dragon']);
    expect(getPullSizeMonsterPool('dragon-lair', 'agressivo')).toEqual(['dragon', 'dragon-lord']);

    // Coryms: D1 -> vanguard | D2 -> vanguard + skirmisher | D3 -> vanguard + skirmisher + charlatan
    expect(getPullSizeMonsterPool('corym-mine', 'cauteloso')).toEqual(['corym-vanguard']);
    expect(getPullSizeMonsterPool('corym-mine', 'ousado')).toEqual(['corym-vanguard', 'corym-skirmisher']);
    expect(getPullSizeMonsterPool('corym-mine', 'agressivo')).toEqual(['corym-vanguard', 'corym-skirmisher', 'corym-charlatan']);

    // Giant Spider: D1 -> tarantula + giant-spider | D2/D3 -> giant-spider
    expect(getPullSizeMonsterPool('giant-spider-lair', 'cauteloso')).toEqual(['tarantula', 'giant-spider']);
    expect(getPullSizeMonsterPool('giant-spider-lair', 'ousado')).toEqual(['giant-spider']);
    expect(getPullSizeMonsterPool('giant-spider-lair', 'agressivo')).toEqual(['giant-spider']);

    // Hero: D1 -> hero | D2 -> hero + renegade-knight | D3 -> hero + renegade-knight + vicious-squire
    expect(getPullSizeMonsterPool('hero-cave', 'cauteloso')).toEqual(['hero']);
    expect(getPullSizeMonsterPool('hero-cave', 'ousado')).toEqual(['hero', 'renegade-knight']);
    expect(getPullSizeMonsterPool('hero-cave', 'agressivo')).toEqual(['hero', 'renegade-knight', 'vicious-squire']);

    // Hydra: D1 -> hydra | D2/D3 -> hydra + bog-raider
    expect(getPullSizeMonsterPool('hydra-lair', 'cauteloso')).toEqual(['hydra']);
    expect(getPullSizeMonsterPool('hydra-lair', 'ousado')).toEqual(['hydra', 'bog-raider']);
    expect(getPullSizeMonsterPool('hydra-lair', 'agressivo')).toEqual(['hydra', 'bog-raider']);

    // Other hunts preserve base monster pool
    expect(getPullSizeMonsterPool('rotworm-cave', 'cauteloso', ['rotworm'])).toEqual(['rotworm']);
    expect(getPullSizeMonsterPool('rotworm-cave', 'agressivo', ['rotworm'])).toEqual(['rotworm']);
  });

  it('generates continuous hunt routes with pull size pack counts and compositions', () => {
    const elfHunt = initialHunts.find((h) => h.id === 'elf-sanctuary')!;
    const room = createRoomState(elfHunt, 0);

    const cautelosoRoute = createContinuousHuntRoute(elfHunt, room, undefined, 'cauteloso');
    expect(cautelosoRoute.pullSize).toBe('cauteloso');
    expect(cautelosoRoute.respawnZones[0].minCount).toBe(2);
    expect(cautelosoRoute.respawnZones[0].maxCount).toBe(3);
    expect(cautelosoRoute.respawnZones[0].monsterPool).toEqual(['elf']);

    const ousadoRoute = createContinuousHuntRoute(elfHunt, room, undefined, 'ousado');
    expect(ousadoRoute.pullSize).toBe('ousado');
    expect(ousadoRoute.respawnZones[0].minCount).toBe(4);
    expect(ousadoRoute.respawnZones[0].maxCount).toBe(4);
    expect(ousadoRoute.respawnZones[0].monsterPool).toEqual(['elf', 'elf-scout']);

    const agressivoRoute = createContinuousHuntRoute(elfHunt, room, undefined, 'agressivo');
    expect(agressivoRoute.pullSize).toBe('agressivo');
    expect(agressivoRoute.respawnZones[0].minCount).toBe(5);
    expect(agressivoRoute.respawnZones[0].maxCount).toBe(6);
    expect(agressivoRoute.respawnZones[0].monsterPool).toEqual(['elf', 'elf-scout', 'elf-arcanist']);
  });
});
