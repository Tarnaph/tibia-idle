import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseTibia1098Dat } from '../packages/tibia1098-assets/src/dat.ts';
import {
  extractItemVisualAsset,
  extractTibia1098Assets,
  validateTibia1098Manifest,
} from '../packages/tibia1098-assets/src/extractor.ts';
import { parseTibia1098Spr } from '../packages/tibia1098-assets/src/spr.ts';
import type { ExtractionResult } from '../packages/tibia1098-assets/src/types.ts';

const projectRoot = resolve(process.cwd());
const has1098Client = () => existsSync(resolve(projectRoot, 'Tibia 10', 'tibia', 'Tibia.dat'));

describe('tibia1098-assets', () => {
  it('parses Tibia 10.98 DAT file cleanly', async () => {
    if (!has1098Client()) return;
    const datBuffer = await readFile(resolve(projectRoot, 'Tibia 10', 'tibia', 'Tibia.dat'));
    const dat = parseTibia1098Dat(datBuffer);

    expect(dat.signature).toBe(0x4a10);
    expect(dat.counts.item).toBeGreaterThan(20000);
    expect(dat.appearances.creature.get(26)).toBeDefined();
  });

  it('parses Tibia 10.98 SPR file cleanly', async () => {
    if (!has1098Client()) return;
    const sprBuffer = await readFile(resolve(projectRoot, 'Tibia 10', 'tibia', 'Tibia.spr'));
    const spr = parseTibia1098Spr(sprBuffer);

    expect(spr.count).toBeGreaterThan(30000);
    const spriteBuffer = spr.decode(1);
    expect(spriteBuffer).toHaveLength(32 * 32 * 4);
  });

  it('runs full asset extraction for Tibia 10.98', async () => {
    if (!has1098Client()) return;
    const result = await extractTibia1098Assets({ projectRoot, write: false });

    expect(result.files.size).toBeGreaterThan(50);
    expect(() => validateTibia1098Manifest(result.manifest)).not.toThrow();
  });
});
