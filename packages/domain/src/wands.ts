// Canonical Wands and Rods definitions generated from realmap11/data/weapons/weapons.xml
import type { CharacterState } from './types';

export type MagicElement = 'energy' | 'fire' | 'death' | 'earth' | 'ice';

export interface WandDefinition {
  id: number;
  name: string;
  level: number;
  mana: number;
  min: number;
  max: number;
  element: MagicElement;
  vocations: string[];
  projectileId: number;
  effectId: number;
  range: number;
}

export const CANONICAL_WANDS: Record<number, WandDefinition> = {
  "2181": {
    "id": 2181,
    "name": "terra rod",
    "level": 26,
    "mana": 8,
    "min": 42,
    "max": 48,
    "element": "earth",
    "vocations": [
      "Druid"
    ],
    "projectileId": 15,
    "effectId": 17,
    "range": 4
  },
  "2182": {
    "id": 2182,
    "name": "snakebite rod",
    "level": 7,
    "mana": 2,
    "min": 8,
    "max": 18,
    "element": "earth",
    "vocations": [
      "Druid"
    ],
    "projectileId": 15,
    "effectId": 17,
    "range": 4
  },
  "2183": {
    "id": 2183,
    "name": "hailstorm rod",
    "level": 33,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "2185": {
    "id": 2185,
    "name": "necrotic rod",
    "level": 19,
    "mana": 5,
    "min": 27,
    "max": 33,
    "element": "death",
    "vocations": [
      "Druid"
    ],
    "projectileId": 11,
    "effectId": 18,
    "range": 4
  },
  "2186": {
    "id": 2186,
    "name": "moonlight rod",
    "level": 13,
    "mana": 3,
    "min": 13,
    "max": 25,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "2187": {
    "id": 2187,
    "name": "wand of inferno",
    "level": 33,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "fire",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 4,
    "effectId": 16,
    "range": 4
  },
  "2188": {
    "id": 2188,
    "name": "wand of decay",
    "level": 19,
    "mana": 5,
    "min": 27,
    "max": 33,
    "element": "death",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 11,
    "effectId": 18,
    "range": 4
  },
  "2189": {
    "id": 2189,
    "name": "wand of cosmic energy",
    "level": 26,
    "mana": 8,
    "min": 42,
    "max": 48,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "2190": {
    "id": 2190,
    "name": "wand of vortex",
    "level": 7,
    "mana": 2,
    "min": 8,
    "max": 18,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "2191": {
    "id": 2191,
    "name": "wand of dragonbreath",
    "level": 13,
    "mana": 3,
    "min": 13,
    "max": 25,
    "element": "fire",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 4,
    "effectId": 16,
    "range": 4
  },
  "8910": {
    "id": 8910,
    "name": "underworld rod",
    "level": 42,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "death",
    "vocations": [
      "Druid"
    ],
    "projectileId": 11,
    "effectId": 18,
    "range": 4
  },
  "8911": {
    "id": 8911,
    "name": "northwind rod",
    "level": 22,
    "mana": 5,
    "min": 27,
    "max": 33,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "8912": {
    "id": 8912,
    "name": "springsprout rod",
    "level": 37,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "earth",
    "vocations": [
      "Druid"
    ],
    "projectileId": 15,
    "effectId": 17,
    "range": 4
  },
  "8920": {
    "id": 8920,
    "name": "wand of starstorm",
    "level": 37,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "8921": {
    "id": 8921,
    "name": "wand of draconia",
    "level": 22,
    "mana": 5,
    "min": 27,
    "max": 33,
    "element": "fire",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 4,
    "effectId": 16,
    "range": 4
  },
  "8922": {
    "id": 8922,
    "name": "wand of voodoo",
    "level": 42,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "death",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 11,
    "effectId": 18,
    "range": 4
  },
  "13760": {
    "id": 13760,
    "name": "wand of dimensions",
    "level": 37,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "death",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 11,
    "effectId": 18,
    "range": 4
  },
  "13872": {
    "id": 13872,
    "name": "shimmer rod",
    "level": 40,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "13880": {
    "id": 13880,
    "name": "shimmer wand",
    "level": 40,
    "mana": 13,
    "min": 55,
    "max": 75,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "18390": {
    "id": 18390,
    "name": "wand of defiance",
    "level": 65,
    "mana": 17,
    "min": 70,
    "max": 100,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "18409": {
    "id": 18409,
    "name": "wand of everblazing",
    "level": 65,
    "mana": 17,
    "min": 70,
    "max": 100,
    "element": "fire",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 4,
    "effectId": 16,
    "range": 4
  },
  "18411": {
    "id": 18411,
    "name": "muck rod",
    "level": 65,
    "mana": 17,
    "min": 70,
    "max": 100,
    "element": "earth",
    "vocations": [
      "Druid"
    ],
    "projectileId": 15,
    "effectId": 17,
    "range": 4
  },
  "18412": {
    "id": 18412,
    "name": "glacial rod",
    "level": 65,
    "mana": 17,
    "min": 70,
    "max": 100,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "23719": {
    "id": 23719,
    "name": "the scorcher",
    "level": 1,
    "mana": 1,
    "min": 3,
    "max": 7,
    "element": "fire",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 4,
    "effectId": 16,
    "range": 4
  },
  "23721": {
    "id": 23721,
    "name": "the chiller",
    "level": 1,
    "mana": 1,
    "min": 3,
    "max": 7,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "24839": {
    "id": 24839,
    "name": "ogre scepta",
    "level": 37,
    "mana": 13,
    "min": 55,
    "max": 70,
    "element": "earth",
    "vocations": [
      "Druid"
    ],
    "projectileId": 15,
    "effectId": 17,
    "range": 4
  },
  "25421": {
    "id": 25421,
    "name": "Ferumbras' Staff (Failed)",
    "level": 65,
    "mana": 17,
    "min": 70,
    "max": 80,
    "element": "energy",
    "vocations": [
      "Sorcerer",
      "Druid"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "25887": {
    "id": 25887,
    "name": "wand of mayhem",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "25888": {
    "id": 25888,
    "name": "rod of mayhem",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "25951": {
    "id": 25951,
    "name": "wand of remedy",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "25955": {
    "id": 25955,
    "name": "rod of remedy",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "25991": {
    "id": 25991,
    "name": "wand of carving",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "25995": {
    "id": 25995,
    "name": "rod of carving",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "29004": {
    "id": 29004,
    "name": "dream blossom staff",
    "level": 80,
    "mana": 17,
    "min": 63,
    "max": 77,
    "element": "energy",
    "vocations": [
      "Sorcerer",
      "Druid"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "29059": {
    "id": 29059,
    "name": "Wand of Darkness",
    "level": 41,
    "mana": 20,
    "min": 80,
    "max": 100,
    "element": "death",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 11,
    "effectId": 18,
    "range": 4
  },
  "30724": {
    "id": 30724,
    "name": "wand of destruction",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "30725": {
    "id": 30725,
    "name": "rod of destruction",
    "level": 100,
    "mana": 18,
    "min": 70,
    "max": 105,
    "element": "ice",
    "vocations": [
      "Druid"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "31985": {
    "id": 31985,
    "name": "falcon rod",
    "level": 300,
    "mana": 20,
    "min": 87,
    "max": 101,
    "element": "earth",
    "vocations": [
      "Druid"
    ],
    "projectileId": 15,
    "effectId": 17,
    "range": 4
  },
  "31986": {
    "id": 31986,
    "name": "falcon wand",
    "level": 300,
    "mana": 21,
    "min": 86,
    "max": 102,
    "element": "energy",
    "vocations": [
      "Sorcerer"
    ],
    "projectileId": 5,
    "effectId": 12,
    "range": 4
  },
  "32094": {
    "id": 32094,
    "name": "deepling ceremonial dagger",
    "level": 300,
    "mana": 23,
    "min": 86,
    "max": 93,
    "element": "ice",
    "vocations": [
      "Druid",
      "Sorcerer"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  },
  "32095": {
    "id": 32095,
    "name": "deepling fork",
    "level": 300,
    "mana": 23,
    "min": 80,
    "max": 120,
    "element": "ice",
    "vocations": [
      "Druid",
      "Sorcerer"
    ],
    "projectileId": 29,
    "effectId": 43,
    "range": 4
  }
};

export function findWandDefinition(itemId: number): WandDefinition | undefined {
  return CANONICAL_WANDS[itemId];
}

export function canUseWand(
  character: CharacterState,
  wand: WandDefinition
): { ok: boolean; reason?: string } {
  // Starter wands/rods (level requirement <= 8) are usable by level 1 characters of the vocation
  const effectiveMinLevel = wand.level <= 8 ? 1 : wand.level;
  if (character.level < effectiveMinLevel) {
    return { ok: false, reason: `${character.name} precisa de nível ${wand.level} para usar ${wand.name}.` };
  }

  const base = character.baseVocation || character.vocation;
  const isVocationOk = wand.vocations.length === 0 || wand.vocations.some((v) => {
    const vLower = v.toLowerCase();
    const baseLower = base.toLowerCase();
    const fullLower = character.vocation.toLowerCase();
    return fullLower.includes(vLower) || baseLower.includes(vLower);
  });

  if (!isVocationOk) {
    return {
      ok: false,
      reason: `${character.name} não pode empunhar ${wand.name} (exclusivo para ${wand.vocations.join(', ')}).`,
    };
  }

  return { ok: true };
}
