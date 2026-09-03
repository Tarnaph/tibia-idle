import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculatePlayerSpeed, calculateStepDurationMs } from '../packages/domain/src';
import { creatureVisualLayout } from '../packages/presentation/src';
import thaisCityJson from '../content/generated/thais-city.json';

describe('Phase 40: Velocidade Normal na Cidade, Bloqueio Estrito de Paredes e Âncora Canto Inferior Direito do SQM', () => {
  it('Bug 1: validates that city movement matches the character normal speed based on level formula', () => {
    // Level 1: base 550ms -> city 550ms
    const baseLvl1 = calculateStepDurationMs(calculatePlayerSpeed(1));
    expect(baseLvl1).toBe(550);

    // Level 20: base 500ms -> city 500ms
    const baseLvl20 = calculateStepDurationMs(calculatePlayerSpeed(20));
    expect(baseLvl20).toBe(500);

    // Level 50: base 400ms -> city 400ms
    const baseLvl50 = calculateStepDurationMs(calculatePlayerSpeed(50));
    expect(baseLvl50).toBe(400);

    const projectRoot = resolve(__dirname, '..');
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');

    // cityStepDurationMs is set to baseStepDurationMs
    expect(protoSrc).toContain('const cityStepDurationMs = baseStepDurationMs;');
    expect(protoSrc).toContain('lastStepTimeRef');
    expect(protoSrc).toContain('now - lastStepTimeRef.current >= cityStepDurationMs');
  });

  it('Bug 2: validates strict walkable checks in GamePrototype and pathfinding to prevent walking on walls or voids', () => {
    const projectRoot = resolve(__dirname, '..');
    const protoSrc = readFileSync(resolve(projectRoot, 'apps/web/components/GamePrototype.tsx'), 'utf8');
    const pathfindingSrc = readFileSync(resolve(projectRoot, 'packages/domain/src/spatial/pathfinding.ts'), 'utf8');

    // GamePrototype must strictly reject undefined or non-walkable tiles
    expect(protoSrc).toContain('if (!tile || !tile.walkable) return current;');
    expect(protoSrc).not.toContain('if (tile && !tile.walkable) return current;');

    // Pathfinding must strictly reject undefined or non-walkable tiles
    expect(pathfindingSrc).toContain('if (!tile || !tile.walkable) continue;');
    expect(pathfindingSrc).not.toContain('if (tile && !tile.walkable) continue;');

    // Verify house wall at 32352, 32210 (red brick wall with torch) is solid
    const wallTile = thaisCityJson.tiles.find((t) => t.x === 32352 && t.y === 32210);
    expect(wallTile).toBeDefined();
    expect(wallTile?.walkable).toBe(false);

    // Verify framework wall tile at 32351, 32210 is solid
    const frameworkTile = thaisCityJson.tiles.find((t) => t.x === 32351 && t.y === 32210);
    expect(frameworkTile).toBeDefined();
    expect(frameworkTile?.walkable).toBe(false);
  });

  it('Bug 3: validates that characters and dummies are anchored to the south-east / bottom-right corner of the tile/SQM', () => {
    expect(creatureVisualLayout.spriteAnchorX).toBe(1); // Right
    expect(creatureVisualLayout.spriteAnchorY).toBe(1); // Bottom
    expect(creatureVisualLayout.spriteOffsetX).toBe(16);
    expect(creatureVisualLayout.spriteOffsetY).toBe(16);

    const projectRoot = resolve(__dirname, '..');
    const thaisArenaSrc = readFileSync(resolve(projectRoot, 'apps/web/components/ThaisCityArena.tsx'), 'utf8');

    // ThaisCityArena uses creatureVisualLayout for sprite anchoring
    expect(thaisArenaSrc).toContain('sprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY)');
    expect(thaisArenaSrc).toContain('sprite.position.set(creatureVisualLayout.spriteOffsetX, creatureVisualLayout.spriteOffsetY)');
    expect(thaisArenaSrc).not.toContain('sprite.anchor.set(0.5, 0.78)');

    // Training dummy also uses bottom-right anchor
    expect(thaisArenaSrc).toContain('dummySprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY)');
    expect(thaisArenaSrc).toContain('dummySprite.position.set(dummyPos.x * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetX, dummyPos.y * TILE_SIZE + 16 + creatureVisualLayout.spriteOffsetY)');
  });
});
