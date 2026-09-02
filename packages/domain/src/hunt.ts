import type { HuntDefinition, MonsterVariantDefinition, WaveDefinition } from './types';

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
    id: 'rat-cellars', name: 'Rat Cellars', description: 'Porão e esgoto extraídos de um spawn real de Rat.',
    recommendedLevel: 1, minimumLevel: 1, monsters: ['rat'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('rat-cellars'), environment: { regionId: 'rat-cellars', label: 'Porão / esgoto', source: 'styller-otbm' },
    waves: waves('rat', [2, 2, 3, 3, 4, 4, 5, 5, 6, 0], 'Gnawmaw', 3),
  },
  {
    id: 'spider-burrow', name: 'Spider Burrow', description: 'Caverna orgânica extraída de um spawn real de Spider.',
    recommendedLevel: 4, minimumLevel: 1, monsters: ['spider'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('spider-burrow'), environment: { regionId: 'spider-burrow', label: 'Caverna úmida', source: 'styller-otbm' },
    waves: waves('spider', [2, 2, 3, 3, 3, 4, 4, 5, 5, 0], 'Silkfang', 2),
  },
  {
    id: 'troll-camp', name: 'Troll Camp', description: 'Camp subterrâneo extraído de um spawn real de Troll.',
    recommendedLevel: 7, minimumLevel: 1, monsters: ['troll'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('troll-camp'), environment: { regionId: 'troll-camp', label: 'Troll cave / camp', source: 'styller-otbm' },
    waves: waves('troll', [1, 2, 2, 2, 3, 3, 3, 4, 4, 0], 'Grubskull', 2),
  },
  {
    id: 'old-crypt', name: 'Old Crypt', description: 'Cripta extraída de um spawn real de Skeleton.',
    recommendedLevel: 10, minimumLevel: 1, monsters: ['skeleton'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('old-crypt'), environment: { regionId: 'old-crypt', label: 'Cripta / cemitério', source: 'styller-otbm' },
    waves: waves('skeleton', [1, 2, 2, 2, 3, 3, 3, 4, 4, 0], 'Ossuary Warden', 2),
  },
  {
    id: 'rotworm-cave', name: 'Rotworm Cave', description: 'Galeria extraída do grupo real de treze Rotworms.',
    recommendedLevel: 12, minimumLevel: 1, monsters: ['rotworm'], rewardProfile: 'xp', status: 'available',
    roomDefinitions: rooms('rotworm-cave'), environment: { regionId: 'rotworm-cave', label: 'Rotworm cave', source: 'styller-otbm' },
    waves: waves('rotworm', [1, 1, 2, 2, 2, 3, 3, 3, 4, 0], 'The Burrower', 2),
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
