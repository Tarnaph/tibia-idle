import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 151: Texture Atlases, Decoupled JSONs, and Instant World Loading', () => {
  it('verifies thais-atlas.png and thais-atlas.json exist and are well-formed', () => {
    const pngPath = path.resolve('public/generated/atlases/thais-atlas.png');
    const jsonPath = path.resolve('public/generated/atlases/thais-atlas.json');

    expect(fs.existsSync(pngPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const pngStat = fs.statSync(pngPath);
    expect(pngStat.size).toBeGreaterThan(1024 * 1024); // Over 1MB

    const atlasData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(atlasData.frames).toBeDefined();
    expect(atlasData.meta).toBeDefined();
    expect(atlasData.meta.image).toBe('thais-atlas.png');
    expect(atlasData.meta.size.w).toBe(2048);
    expect(atlasData.meta.size.h).toBe(2048);

    // Verify key assets are packed
    expect(atlasData.frames['asset-trainingFloor']).toBeDefined();
    expect(atlasData.frames['asset-trainingDummy']).toBeDefined();
    expect(atlasData.frames['effect-11-f0']).toBeDefined();
  });

  it('verifies creatures-atlas.png and creatures-atlas.json exist and are well-formed', () => {
    const pngPath = path.resolve('public/generated/atlases/creatures-atlas.png');
    const jsonPath = path.resolve('public/generated/atlases/creatures-atlas.json');

    expect(fs.existsSync(pngPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const atlasData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(atlasData.frames).toBeDefined();
    expect(atlasData.frames['monster-rat']).toBeDefined();
    expect(atlasData.frames['thumb-citizen']).toBeDefined();
    expect(atlasData.frames['thumb-knight']).toBeDefined();
  });

  it('verifies thais-item-metadata.json covers all 1082 items in Thais', () => {
    const metaPath = path.resolve('content/generated/thais-item-metadata.json');
    expect(fs.existsSync(metaPath)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const keys = Object.keys(meta);
    expect(keys.length).toBeGreaterThanOrEqual(1082);

    // Marble floor in Temple (406, 407)
    expect(meta['406']).toBeDefined();
    expect(meta['406'].isGround).toBe(true);
    expect(meta['406'].frames.length).toBeGreaterThan(0);
  });

  it('verifies thais-collision.json provides lightweight Z7 and Z6 walkable grids', () => {
    const colPath = path.resolve('content/generated/thais-collision.json');
    expect(fs.existsSync(colPath)).toBe(true);

    const col = JSON.parse(fs.readFileSync(colPath, 'utf8'));
    expect(col.z7).toBeDefined();
    expect(col.z6).toBeDefined();

    // Spawn at 32369, 32241 on Z7 must be walkable
    expect(col.z7['32369,32241']).toBe(1);
    // File size must be under 300KB (massive reduction from 5.58MB)
    const sizeKb = fs.statSync(colPath).size / 1024;
    expect(sizeKb).toBeLessThan(300);
  });

  it('verifies tibia1098-combat-assets.json is compact and contains essential combat data', () => {
    const combatPath = path.resolve('content/generated/tibia1098-combat-assets.json');
    expect(fs.existsSync(combatPath)).toBe(true);

    const combat = JSON.parse(fs.readFileSync(combatPath, 'utf8'));
    expect(combat.outfits).toBeDefined();
    expect(combat.effects).toBeDefined();
    expect(combat.missiles).toBeDefined();
    expect(combat.items).toBeDefined();

    // Must NOT contain the 12MB mapItems
    expect((combat as any).mapItems).toBeUndefined();

    const sizeMb = fs.statSync(combatPath).size / (1024 * 1024);
    expect(sizeMb).toBeLessThan(5.0); // Less than 5MB (massive reduction from 13.55MB)
  });

  it('verifies client components in apps/web do NOT statically import the 13.5MB tibia1098-assets.json', () => {
    const filesToCheck = [
      'apps/web/components/ThaisCityArena.tsx',
      'apps/web/components/GamePrototype.tsx',
      'apps/web/lib/assetPreloader.ts',
      'apps/web/components/PixiArena.tsx',
      'apps/web/components/TrainingArena.tsx',
      'apps/web/components/PartyMemberModal.tsx',
      'apps/web/components/VocationChoiceModal.tsx',
      'apps/web/components/hunts/HuntCard.tsx',
      'apps/web/components/ItemSprite.tsx',
    ];

    for (const rel of filesToCheck) {
      const full = path.resolve(rel);
      const content = fs.readFileSync(full, 'utf8');
      expect(content).not.toContain('tibia1098-assets.json');
    }
  });

  it('verifies GamePrototype and assetPreloader do NOT statically import the 5.58MB thais-city.json', () => {
    const filesToCheck = [
      'apps/web/components/GamePrototype.tsx',
      'apps/web/lib/assetPreloader.ts',
    ];

    for (const rel of filesToCheck) {
      const full = path.resolve(rel);
      const content = fs.readFileSync(full, 'utf8');
      expect(content).not.toContain('thais-city.json');
    }
  });
});
