import type { HuntRegionDefinition } from '../../content-schema/src';
import type { GameContent, HuntDefinition, MonsterVariantDefinition, WaveDefinition } from './types';

function rooms(id: string): string[] {
  return Array.from({ length: 10 }, (_, index) => `${id}-wave-${index + 1}`);
}

function boss(baseMonsterId: string, name: string): MonsterVariantDefinition {
  return {
    baseMonsterId, name, hpMultiplier: 4, damageMultiplier: 1.5, defenseMultiplier: 1.25,
    xpMultiplier: 3, lootMultiplier: 2, scale: 1.15, visualModifier: 'boss-aura',
  };
}

function waves(monsterId: string, counts: number[], bossName: string, bossAdds: number): WaveDefinition[] {
  return counts.map((count, index) => index === 9
    ? { number: 10, monsterId, count: bossAdds, boss: boss(monsterId, bossName) }
    : { number: index + 1, monsterId, count });
}

export const initialHunts: HuntDefinition[] = [
  {
    id: 'rat-cellars', name: 'Rat Cellars', displayName: 'Porões Infestados',
    description: 'Porão e esgoto extraídos de um spawn real de Rat.', shortDescription: 'Ratos famintos infestam os porões.',
    recommendedLevel: 1, minimumLevel: 1, monsters: ['rat', 'cave-rat'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('rat-cellars'), environment: { regionId: 'rat-cellars', label: 'Porão / esgoto', source: 'realmap11-otbm' },
    waves: waves('rat', [2, 2, 3, 3, 4, 4, 5, 5, 6, 0], 'Gnawmaw', 3),
  },
  {
    id: 'spider-burrow', name: 'Spider Burrow', displayName: 'Toca Enredada',
    description: 'Caverna orgânica extraída de um spawn real de Spider.', shortDescription: 'Teias cobrem esta toca esquecida.',
    recommendedLevel: 8, minimumLevel: 1, monsters: ['spider'], rewardProfile: 'xp', status: 'unavailable',
    roomDefinitions: rooms('spider-burrow'), environment: { regionId: 'spider-burrow', label: 'Caverna úmida', source: 'realmap11-otbm' },
    waves: waves('spider', [2, 2, 3, 3, 3, 4, 4, 5, 5, 0], 'Silkfang', 2),
  },
  {
    id: 'troll-camp', name: 'Troll Camp', displayName: 'Covil dos Trolls',
    description: 'Camp subterrâneo extraído de um spawn real de Troll.', shortDescription: 'Uma pequena tribo protege estes túneis.',
    recommendedLevel: 15, minimumLevel: 1, monsters: ['troll'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('troll-camp'), environment: { regionId: 'troll-camp', label: 'Troll cave / camp', source: 'realmap11-otbm' },
    waves: waves('troll', [1, 2, 2, 2, 3, 3, 3, 4, 4, 0], 'Grubskull', 2),
  },
  {
    id: 'old-crypt', name: 'Old Crypt', displayName: 'Cripta Inquieta',
    description: 'Cripta extraída de um spawn real de Skeleton.', shortDescription: 'Os mortos se recusam a permanecer enterrados.',
    recommendedLevel: 22, minimumLevel: 1, monsters: ['skeleton'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('old-crypt'), environment: { regionId: 'old-crypt', label: 'Cripta / cemitério', source: 'realmap11-otbm' },
    waves: waves('skeleton', [1, 2, 2, 2, 3, 3, 3, 4, 4, 0], 'Ossuary Warden', 2),
  },
  {
    id: 'rotworm-cave', name: 'Rotworm Cave', displayName: 'Túneis Escavados',
    description: 'Galeria extraída do grupo real de treze Rotworms.', shortDescription: 'Rotworms se escondem sob a terra.',
    recommendedLevel: 28, minimumLevel: 1, monsters: ['rotworm'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('rotworm-cave'), environment: { regionId: 'rotworm-cave', label: 'Rotworm cave', source: 'realmap11-otbm' },
    waves: waves('rotworm', [1, 1, 2, 2, 2, 3, 3, 3, 4, 0], 'The Burrower', 2),
  },
  {
    id: 'dragon-lair', name: 'Dragon Lair', displayName: 'Profundezas Chamuscadas',
    description: 'Caverna profunda extraída de um lair real habitado por Dragons.', shortDescription: 'Um dragão antigo domina estas profundezas.',
    recommendedLevel: 45, minimumLevel: 25, monsters: ['dragon'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('dragon-lair'), environment: { regionId: 'dragon-lair', label: 'Dragon lair', source: 'realmap11-otbm' },
    waves: waves('dragon', [1, 1, 2, 2, 2, 3, 3, 3, 4, 0], 'Dragon Lord', 1),
  },
];

export const rotwormCave = initialHunts.find((hunt) => hunt.id === 'rotworm-cave')!;

export function huntById(hunts: HuntDefinition[], huntId: string): HuntDefinition {
  const hunt = hunts.find((candidate) => candidate.id === huntId);
  if (!hunt) throw new Error(`Unknown hunt ${huntId}.`);
  return hunt;
}

export function isHuntUnlocked(hunt: HuntDefinition, level: number): boolean {
  return level >= hunt.minimumLevel;
}

export function isHuntAvailable(hunt: HuntDefinition, region?: HuntRegionDefinition): boolean {
  if (hunt.status === 'unavailable' || (hunt as any).status === 'disabled') return false;
  if (region) {
    if (region.available === false || !region.tiles || region.tiles.length === 0) return false;
    const walkable = region.tiles.filter((t) => t.walkable).length;
    if (walkable < 8) return false;
  }
  return true;
}

export function getHuntWorldEntrance(
  huntId: string,
  content: GameContent
): {
  worldPosition: { x: number; y: number; z: number };
  localPosition: { x: number; y: number; z: number };
  bounds: { x: number; y: number; z: number; width: number; height: number };
  isInsideMap: boolean;
  isWalkable: boolean;
} {
  const hunt = content.hunts.find((h) => h.id === huntId) ?? content.hunts[0];
  const region = content.huntRegions.find((r) => r.huntId === hunt.id);

  if (!region || region.available === false || !region.tiles || region.tiles.length === 0) {
    const defaultCenter = region?.sourceCenter ?? { x: 0, y: 0, z: 0 };
    return {
      worldPosition: { x: defaultCenter.x, y: defaultCenter.y, z: defaultCenter.z },
      localPosition: { x: 0, y: 0, z: defaultCenter.z },
      bounds: region?.bounds ?? { x: 0, y: 0, z: 0, width: 0, height: 0 },
      isInsideMap: false,
      isWalkable: false,
    };
  }

  const { bounds, sourceCenter, tiles } = region;
  const configuredWorldEntrance = {
    x: sourceCenter.x,
    y: sourceCenter.y,
    z: sourceCenter.z ?? bounds.z,
  };

  const walkableTiles = tiles.filter((t) => t.walkable);
  const exactMatch = walkableTiles.find(
    (t) => t.x === configuredWorldEntrance.x && t.y === configuredWorldEntrance.y && t.z === configuredWorldEntrance.z
  );

  let finalWalkableWorld: { x: number; y: number; z: number };
  let isWalkable = false;

  if (exactMatch) {
    finalWalkableWorld = { x: exactMatch.x, y: exactMatch.y, z: exactMatch.z };
    isWalkable = true;
  } else if (walkableTiles.length > 0) {
    const closest = walkableTiles.reduce((best, tile) => {
      const dist = Math.abs(tile.x - configuredWorldEntrance.x) + Math.abs(tile.y - configuredWorldEntrance.y);
      const bestDist = Math.abs(best.x - configuredWorldEntrance.x) + Math.abs(best.y - configuredWorldEntrance.y);
      return dist < bestDist ? tile : best;
    }, walkableTiles[0]);

    finalWalkableWorld = { x: closest.x, y: closest.y, z: closest.z };
    isWalkable = true;
  } else {
    finalWalkableWorld = configuredWorldEntrance;
    isWalkable = false;
  }

  const isInsideMap =
    finalWalkableWorld.x >= bounds.x &&
    finalWalkableWorld.x < bounds.x + bounds.width &&
    finalWalkableWorld.y >= bounds.y &&
    finalWalkableWorld.y < bounds.y + bounds.height;

  const localPosition = {
    x: finalWalkableWorld.x - bounds.x,
    y: finalWalkableWorld.y - bounds.y,
    z: finalWalkableWorld.z,
  };

  return {
    worldPosition: finalWalkableWorld,
    localPosition,
    bounds,
    isInsideMap,
    isWalkable,
  };
}

