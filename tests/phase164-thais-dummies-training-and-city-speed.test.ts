import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  THAIS_TRAINING_DUMMIES,
  THAIS_TRAINING_APPROACH_POINT,
  findBestTrainingTile,
  calculateTrainingTimeEstimate,
  THAIS_CITY_FIXED_SPEED,
  calculateStepDurationMs,
  createCharacter,
  type CharacterState,
  type GameContent,
} from '../packages/domain/src';
import thaisCityJson from '../content/generated/thais-city.json';
import vocationsJson from '../content/generated/vocations.json';
import starterLoadoutsJson from '../content/generated/starter-loadouts.json';
import type { VocationCatalog } from '../packages/content-schema/src';

const mockContent: GameContent = {
  vocations: (vocationsJson as VocationCatalog).vocations,
  rateSkill: (vocationsJson as VocationCatalog).rateSkill,
  rateMagic: (vocationsJson as VocationCatalog).rateMagic,
  equipment: [],
  spells: [],
  monsters: [],
  hunts: [],
  starterLoadouts: (starterLoadoutsJson as any).loadouts || [],
  economy: { items: [] } as any,
  huntRegions: [],
};

const makeChar = (vocation: string, skillsOverrides = {}, skillTriesOverrides = {}): CharacterState => {
  const base = createCharacter('char-1', 'Test Character', vocation as any, mockContent);
  return {
    ...base,
    skills: {
      ...base.skills,
      sword: 30,
      distance: 25,
      shielding: 30,
      magicLevel: 5,
      ...skillsOverrides,
    },
    skillTries: {
      ...base.skillTries,
      sword: 0,
      distance: 0,
      shielding: 0,
      magicLevel: 0,
      ...skillTriesOverrides,
    },
  };
};

describe('Phase 164: Thais Dummies Training and City Speed', () => {
  it('1. Training dummies and approach point are precisely configured and present in map JSON', () => {
    expect(THAIS_TRAINING_DUMMIES).toHaveLength(3);
    expect(THAIS_TRAINING_DUMMIES[0].position).toEqual({ x: 32349, y: 32219, z: 7 });
    expect(THAIS_TRAINING_DUMMIES[1].position).toEqual({ x: 32349, y: 32221, z: 7 });
    expect(THAIS_TRAINING_DUMMIES[2].position).toEqual({ x: 32349, y: 32223, z: 7 });
    expect(THAIS_TRAINING_APPROACH_POINT).toEqual({ x: 32345, y: 32220, z: 7 });

    // Verify map JSON contains item 5787 at dummy coordinates
    const cityTiles = (thaisCityJson as any).tiles || [];
    for (const dummy of THAIS_TRAINING_DUMMIES) {
      const tile = cityTiles.find((t: any) => t.x === dummy.position.x && t.y === dummy.position.y && t.z === dummy.position.z);
      expect(tile).toBeDefined();
      const hasDummyItem = tile.serverItemIds?.includes(5787) || tile.clientItemIds?.includes(5787);
      expect(hasDummyItem).toBe(true);
    }
  });

  it('2. Dynamic spot allocation (findBestTrainingTile) assigns adjacent tiles, and pushes ranged to 2-3 tiles when full', () => {
    const dummy = THAIS_TRAINING_DUMMIES[0].position;
    const alwaysWalkable = () => true;

    // When all empty, allocates adjacent tile (distance 1)
    const emptyOccupied = new Set<string>();
    const adjacentSpot = findBestTrainingTile(dummy, 'Knight', emptyOccupied, alwaysWalkable);
    expect(adjacentSpot).not.toBeNull();
    const distAdjacent = Math.max(Math.abs(adjacentSpot!.x - dummy.x), Math.abs(adjacentSpot!.y - dummy.y));
    expect(distAdjacent).toBe(1);

    // Occupy all 8 adjacent spots
    const fullAdjacent = new Set<string>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx !== 0 || dy !== 0) {
          fullAdjacent.add(`${dummy.x + dx},${dummy.y + dy},${dummy.z}`);
        }
      }
    }

    // Knight in crowded dummy: spills over to nearest free spot at dist 2
    const knightSpot = findBestTrainingTile(dummy, 'Knight', fullAdjacent, alwaysWalkable);
    expect(knightSpot).not.toBeNull();
    const knightDist = Math.max(Math.abs(knightSpot!.x - dummy.x), Math.abs(knightSpot!.y - dummy.y));
    expect(knightDist).toBe(2);

    // Ranged vocations (Sorcerer / Paladin) in crowded dummy: positions at 2-3 tiles away
    const sorcSpot = findBestTrainingTile(dummy, 'Sorcerer', fullAdjacent, alwaysWalkable);
    expect(sorcSpot).not.toBeNull();
    const sorcDist = Math.max(Math.abs(sorcSpot!.x - dummy.x), Math.abs(sorcSpot!.y - dummy.y));
    expect(sorcDist).toBeGreaterThanOrEqual(2);
    expect(sorcDist).toBeLessThanOrEqual(3);

    const paladinSpot = findBestTrainingTile(dummy, 'Paladin', fullAdjacent, alwaysWalkable);
    expect(paladinSpot).not.toBeNull();
    const paladinDist = Math.max(Math.abs(paladinSpot!.x - dummy.x), Math.abs(paladinSpot!.y - dummy.y));
    expect(paladinDist).toBeGreaterThanOrEqual(2);
    expect(paladinDist).toBeLessThanOrEqual(3);
  });

  it('3. Training time and progress formulas accurately estimate time and scale with serverSkillRate', () => {
    const knightChar = makeChar('Knight', { sword: 30 }, { sword: 0 });
    const est1x = calculateTrainingTimeEstimate(knightChar, 'sword', mockContent, 1.0);
    expect(est1x.currentLevel).toBe(30);
    expect(est1x.targetLevel).toBe(31);
    expect(est1x.remainingSeconds).toBeGreaterThan(0);
    expect(est1x.progressPercent).toBe(0);
    expect(est1x.formattedTime).toMatch(/\d+(h|min|s)/);

    // 2x server rate cuts training time in half
    const est2x = calculateTrainingTimeEstimate(knightChar, 'sword', mockContent, 2.0);
    expect(est2x.remainingSeconds).toBe(Math.ceil(est1x.remainingSeconds / 2));

    // Progress updates with existing tries
    const halfTries = Math.floor(est1x.requiredTries / 2);
    const knightHalf = makeChar('Knight', { sword: 30 }, { sword: halfTries });
    const estHalf = calculateTrainingTimeEstimate(knightHalf, 'sword', mockContent, 1.0);
    expect(estHalf.progressPercent).toBeCloseTo(50, 0);
  });

  it('4. City speed is fixed at 500, utani hur blocked in city, and server anti-speedhack accommodates 500 speed', () => {
    expect(THAIS_CITY_FIXED_SPEED).toBe(500);

    // Step duration for speed 500 is 300ms on 150 groundSpeed (or 200ms on 100 groundSpeed)
    const stepDuration = calculateStepDurationMs(THAIS_CITY_FIXED_SPEED);
    expect(stepDuration).toBe(300);

    // Check GamePrototype source for fixed speed and haste blocking
    const protoPath = resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
    const protoSrc = readFileSync(protoPath, 'utf-8');
    expect(protoSrc).toContain('const cityPlayerSpeed = THAIS_CITY_FIXED_SPEED;');
    expect(protoSrc).toContain('Velocidade máxima da cidade (500) já está ativa. Haste desnecessário em Thais.');

    // Check BottomDock has training button and disabled during hunt
    const bottomDockPath = resolve(__dirname, '../apps/web/components/BottomDock.tsx');
    const bottomDockSrc = readFileSync(bottomDockPath, 'utf-8');
    expect(bottomDockSrc).toContain('className="quick-action-btn btn-training"');
    expect(bottomDockSrc).toContain('disabled={isHunting}');

    // Check ThaisCityRoom server anti-speedhack threshold is set to 75ms
    const roomPath = resolve(__dirname, '../packages/server/src/rooms/ThaisCityRoom.ts');
    const roomSrc = readFileSync(roomPath, 'utf-8');
    expect(roomSrc).toContain('player.lastStepTime < 75');
  });
});
