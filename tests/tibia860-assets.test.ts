import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseTibia860Dat } from '../packages/tibia860-assets/src/dat.ts';
import {
  extractItemVisualAsset,
  extractTibia860Assets,
  validateTibia860Manifest,
} from '../packages/tibia860-assets/src/extractor.ts';
import { parseTibia860Spr } from '../packages/tibia860-assets/src/spr.ts';
import type { ExtractionResult } from '../packages/tibia860-assets/src/types.ts';

const projectRoot = resolve(process.cwd());
const readonlyFiles = [
  resolve(projectRoot, '..', 'tibia-860-client', 'Tibia.dat'),
  resolve(projectRoot, '..', 'tibia-860-client', 'Tibia.spr'),
  resolve(projectRoot, '..', 'styller-master', 'data', 'monster', 'monsters', 'rotworm.xml'),
  resolve(projectRoot, '..', 'styller-master', 'data', 'items', 'items.otb'),
];

async function fingerprint(path: string) {
  const [contents, details] = await Promise.all([readFile(path), stat(path)]);
  return {
    hash: createHash('sha256').update(contents).digest('hex'),
    size: details.size,
    modified: details.mtimeMs,
  };
}

function resultFileHashes(files: Map<string, Buffer>): Record<string, string> {
  return Object.fromEntries(
    [...files.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([path, contents]) => [
      path,
      createHash('sha256').update(contents).digest('hex'),
    ]),
  );
}

let extractedFirst: ExtractionResult;
let extractedSecond: ExtractionResult;

beforeAll(async () => {
  [extractedFirst, extractedSecond] = await Promise.all([
    extractTibia860Assets({ projectRoot, write: false }),
    extractTibia860Assets({ projectRoot, write: false }),
  ]);
}, 20_000);

describe('Tibia 8.60 asset spike', () => {
  it('parses the complete DAT and the legacy SPR headers', async () => {
    const [datBuffer, sprBuffer] = await Promise.all([
      readFile(resolve(projectRoot, '..', 'tibia-860-client', 'Tibia.dat')),
      readFile(resolve(projectRoot, '..', 'tibia-860-client', 'Tibia.spr')),
    ]);
    const dat = parseTibia860Dat(datBuffer);
    const spr = parseTibia860Spr(sprBuffer);

    expect(dat.signature).toBe(0x4c28b721);
    expect(dat.parsedBytes).toBe(datBuffer.length);
    expect(dat.counts).toEqual({ item: 11703, creature: 367, effect: 70, missile: 42 });
    expect(spr.signature).toBe(0x4c220594);
    expect(spr.count).toBe(36386);
  });

  it('reads client and STYLLER sources without modifying them', async () => {
    const before = await Promise.all(readonlyFiles.map(fingerprint));
    await extractTibia860Assets({ projectRoot, write: false });
    const after = await Promise.all(readonlyFiles.map(fingerprint));
    expect(after).toEqual(before);
  });

  it('resolves Rotworm lookType 26 consistently to the same sprite frames', async () => {
    const first = extractedFirst;
    const second = extractedSecond;
    const firstRotworm = first.manifest.assets.rotworm;
    const secondRotworm = second.manifest.assets.rotworm;

    expect(firstRotworm.relationship).toBe('direct-look-type');
    expect(firstRotworm.sourceId).toBe(26);
    expect(firstRotworm.appearanceId).toBe(26);
    expect(firstRotworm.frames.filter((frame) => frame.direction === 'north').map((frame) => frame.spriteIds)).toEqual([
      [3412, 3413, 0, 0],
      [3414, 3415, 0, 0],
    ]);
    expect(new Set(firstRotworm.frames.map((frame) => frame.direction))).toEqual(
      new Set(['south', 'east', 'north', 'west']),
    );
    expect(secondRotworm.frames).toEqual(firstRotworm.frames);
  });

  it('produces byte-for-byte reproducible PNGs and metadata', async () => {
    const first = extractedFirst;
    const second = extractedSecond;
    expect(resultFileHashes(second.files)).toEqual(resultFileHashes(first.files));
    expect(second.manifest).toEqual(first.manifest);
  });

  it('resolves every selected equipment and loot item deterministically', async () => {
    const first = extractedFirst;
    const second = extractedSecond;
    const expectedServerIds = [2148, 2182, 2190, 2376, 2389, 2457, 2463, 2525, 2643, 2647, 8601];
    expect(Object.keys(first.manifest.items).length).toBeGreaterThanOrEqual(50);
    for (const serverId of expectedServerIds) {
      const item = first.manifest.items[String(serverId)];
      expect(item.resolved).toBe(true);
      expect(item.clientId).toBeTypeOf('number');
      expect(item.frame?.spriteIds.some((spriteId) => spriteId > 0)).toBe(true);
      expect(second.manifest.items[String(serverId)]).toEqual(item);
    }
  });

  it('resolves every selected monster, outfit and corpse through the proven pipelines', async () => {
    const result = extractedFirst;
    expect(Object.keys(result.manifest.creatures)).toHaveLength(12);
    expect(Object.keys(result.manifest.outfits).sort()).toEqual(['Druid', 'Knight', 'Paladin', 'Sorcerer']);
    expect(Object.keys(result.manifest.corpses)).toHaveLength(12);
    expect(result.manifest.corpses.rotworm).toMatchObject({ serverId: 5967, resolved: true });
    expect(result.manifest.corpses.rotworm.frame?.spriteIds.some((id) => id > 0)).toBe(true);
  });

  it('resolves the manually curated Training Room scenery through OTB client ids', async () => {
    const result = extractedFirst;
    const expected = {
      trainingFloor: { serverId: 405, clientId: 408 },
      trainingWall: { serverId: 1100, clientId: 1345 },
      trainingRug: { serverId: 1798, clientId: 2576 },
      trainingDummy: { serverId: 5787, clientId: 5787 },
      trainingDecor: { serverId: 5852, clientId: 5852 },
    } as const;

    for (const [key, identity] of Object.entries(expected)) {
      const asset = result.manifest.assets[key as keyof typeof expected];
      expect(asset.relationship).toBe('otb-client-id');
      expect(asset.sourceId).toBe(identity.serverId);
      expect(asset.appearanceId).toBe(identity.clientId);
      expect(asset.frames[0].spriteIds.some((spriteId) => spriteId > 0)).toBe(true);
    }
  });

  it('keeps an explicit warning and fallback when an item cannot resolve', async () => {
    const [datBuffer, sprBuffer, otbBuffer] = await Promise.all([
      readFile(resolve(projectRoot, '..', 'tibia-860-client', 'Tibia.dat')),
      readFile(resolve(projectRoot, '..', 'tibia-860-client', 'Tibia.spr')),
      readFile(resolve(projectRoot, '..', 'styller-master', 'data', 'items', 'items.otb')),
    ]);
    const fallback = extractItemVisualAsset(
      65_535,
      'unresolvable fixture',
      otbBuffer,
      parseTibia860Dat(datBuffer),
      parseTibia860Spr(sprBuffer),
    );

    expect(fallback.mapping.resolved).toBe(false);
    expect(fallback.mapping.frame).toBeNull();
    expect(fallback.mapping.importWarnings[0]).toContain('not found in items.otb');
    expect(fallback.files.size).toBe(0);
  });

  it('generates a valid manifest whose PNG hashes match the output files', async () => {
    const result = extractedFirst;
    expect(() => validateTibia860Manifest(result.manifest)).not.toThrow();
    for (const asset of Object.values(result.manifest.assets)) {
      for (const frame of asset.frames) {
        const png = result.files.get(frame.file);
        expect(png?.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        expect(createHash('sha256').update(png!).digest('hex').toUpperCase()).toBe(frame.sha256);
      }
    }
    for (const item of Object.values(result.manifest.items)) {
      if (!item.resolved || !item.frame) continue;
      const png = result.files.get(item.frame.file);
      expect(png?.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(createHash('sha256').update(png!).digest('hex').toUpperCase()).toBe(item.frame.sha256);
    }
  });
});
