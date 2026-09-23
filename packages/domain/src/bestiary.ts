/**
 * Canonical Bestiary kills needed and bonus EXP calculation.
 * Each completed monster entry (kills >= killsNeeded) grants +1% (+0.01) permanent EXP.
 */

export const CANONICAL_BESTIARY_KILLS_NEEDED: Record<string, number> = {
  // Easy / 250 kills
  'rat': 250,
  'cave-rat': 250,
  'caverat': 250,
  'snake': 250,
  'spider': 250,
  'poison-spider': 250,
  'poisonspider': 250,
  'wolf': 250,
  'troll': 250,
  'swamp-troll': 250,
  'swamptroll': 250,
  'frost-troll': 250,
  'frosttroll': 250,
  'furious-troll': 250,
  'furioustroll': 250,
  'skeleton': 250,
  'rotworm': 250,
  'carrion-worm': 250,
  'carrionworm': 250,
  'ghoul': 250,
  'elf': 250,
  'elf-scout': 250,
  'elfscout': 250,
  'minotaur': 250,
  'larva': 250,
  'wasp': 250,
  'goblin': 250,

  // Medium / 500 kills
  'cyclops': 500,
  'cyclops-drone': 500,
  'cyclopsdrone': 500,
  'cyclops-smith': 500,
  'cyclopssmith': 500,
  'elf-arcanist': 500,
  'elfarcanist': 500,
  'minotaur-archer': 500,
  'minotaurarcher': 500,
  'minotaur-mage': 500,
  'minotaurmage': 500,
  'minotaur-guard': 500,
  'minotaurguard': 500,
  'beholder': 500,
  'bonelord': 500,
  'elder-bonelord': 500,
  'elderbonelord': 500,
  'dragon-hatchling': 500,
  'dragonhatchling': 500,
  'dragon-lord-hatchling': 500,
  'dragonlordhatchling': 500,
  'mummy': 500,
  'vampire': 500,
  'scarab': 500,

  // Hard / 1000 kills
  'dragon': 1000,
  'dragon-lord': 1000,
  'dragonlord': 1000,
  'giant-spider': 1000,
  'giantspider': 1000,
  'hydra': 1000,
  'hero': 1000,
  'black-knight': 1000,
  'blackknight': 1000,
  'necromancer': 1000,
  'warlock': 1000,

  // Extreme / 2500 kills
  'demon': 2500,
  'behemoth': 2500,
};

/**
 * Returns the kills needed to complete the bestiary for a given monster.
 * Falls back to 250 if uncataloged.
 */
export function getBestiaryKillsNeeded(monsterId: string): number {
  if (!monsterId) return 250;
  const norm = monsterId.toLowerCase().trim().replace(/\s+/g, '-');
  const simple = norm.replace(/[^a-z0-9]/g, '');
  return CANONICAL_BESTIARY_KILLS_NEEDED[norm] ?? CANONICAL_BESTIARY_KILLS_NEEDED[simple] ?? 250;
}

/**
 * Calculates how many monsters have been completed in the bestiary (kills >= killsNeeded).
 */
export function getCompletedBestiaryCount(bestiaryKills: Record<string, number> = {}): number {
  if (!bestiaryKills || typeof bestiaryKills !== 'object') return 0;
  let completed = 0;
  const counted = new Set<string>();

  for (const [key, kills] of Object.entries(bestiaryKills)) {
    if (typeof kills !== 'number' || kills <= 0) continue;
    const norm = key.toLowerCase().trim().replace(/\s+/g, '-');
    if (counted.has(norm)) continue;
    counted.add(norm);

    const needed = getBestiaryKillsNeeded(norm);
    if (kills >= needed) {
      completed++;
    }
  }
  return completed;
}

/**
 * Returns the permanent EXP bonus multiplier from completed Bestiary entries.
 * Each completed monster grants +1% (+0.01) EXP.
 * E.g., 3 completed monsters = 0.03 (+3% EXP bonus).
 */
export function getBestiaryExpBonusPercent(bestiaryKills: Record<string, number> = {}): number {
  return getCompletedBestiaryCount(bestiaryKills) * 0.01;
}
