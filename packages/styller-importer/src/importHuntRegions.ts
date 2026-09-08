import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { HuntRegionCatalog, HuntRegionDefinition } from '../../content-schema/src/index.ts';
import { getServerDataRoot } from './helpers.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }

interface OtbItemMovementFlags {
  clientId: number | null;
  group: number;
  flags: number;
  blockSolid: boolean;
  blockPathFind: boolean;
}

interface OtbNode {
  type: number;
  props: number[];
  children: OtbNode[];
}

const OTB_ESCAPE = 0xfd;
const OTB_START = 0xfe;
const OTB_END = 0xff;

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

const regions: Array<{
  huntId: string;
  name: string;
  monsterName: string;
  recommendedLevel: number;
  center: [number, number, number, number];
  size: [number, number];
  monsterDensityRatio: number;
}> = [
  { huntId: 'rat-cellars', name: 'Rat Cellars', monsterName: 'Rat', recommendedLevel: 1, center: [566, 1092, 10, 12], size: [25, 25], monsterDensityRatio: 0.15 },
  { huntId: 'spider-burrow', name: 'Spider Burrow', monsterName: 'Spider', recommendedLevel: 4, center: [632, 1085, 10, 14], size: [30, 30], monsterDensityRatio: 0.2 },
  { huntId: 'troll-camp', name: 'Troll Camp', monsterName: 'Troll', recommendedLevel: 7, center: [528, 1132, 8, 16], size: [35, 35], monsterDensityRatio: 0.25 },
  { huntId: 'old-crypt', name: 'Old Crypt', monsterName: 'Skeleton', recommendedLevel: 10, center: [550, 1139, 9, 20], size: [40, 40], monsterDensityRatio: 0.3 },
  { huntId: 'rotworm-cave', name: 'Rotworm Cave', monsterName: 'Rotworm', recommendedLevel: 12, center: [967, 975, 8, 24], size: [50, 50], monsterDensityRatio: 0.35 },
  { huntId: 'dragon-lair', name: 'Dragon Lair', monsterName: 'Dragon', recommendedLevel: 45, center: [32741, 31294, 11, 20], size: [50, 50], monsterDensityRatio: 0.35 },
];

function readNode(buffer: Buffer, startOffset: number): { node: OtbNode; nextOffset: number } {
  if (buffer[startOffset] !== OTB_START) throw new Error('Invalid OTBM node start.');
  let offset = startOffset + 1;
  const node: OtbNode = { type: buffer[offset], props: [], children: [] };
  offset += 1;
  while (offset < buffer.length) {
    const byte = buffer[offset];
    offset += 1;
    if (byte === OTB_ESCAPE) {
      if (offset >= buffer.length) throw new Error('Invalid escaped OTBM byte.');
      node.props.push(buffer[offset]);
      offset += 1;
      continue;
    }
    if (byte === OTB_START) {
      const child = readNode(buffer, offset - 1);
      node.children.push(child.node);
      offset = child.nextOffset;
      continue;
    }
    if (byte === OTB_END) return { node, nextOffset: offset };
    node.props.push(byte);
  }
  throw new Error('Unterminated OTBM node.');
}

export function classifyTileWalkability(
  items: Array<number | OtbItemMovementFlags | undefined>,
  itemFlagsMap?: Map<number, OtbItemMovementFlags>,
): boolean {
  const flagsList = items.map((item) => {
    if (typeof item === 'number') return itemFlagsMap?.get(item);
    return item;
  });
  const known = flagsList.filter((item): item is OtbItemMovementFlags => item !== undefined);
  if (known.length !== items.length) return false;
  const hasGround = known.some((item) => item.group === 1);
  return hasGround && !known.some((item) => item.blockSolid || item.blockPathFind);
}

export async function importHuntRegions(options: ImportOptions = {}): Promise<HuntRegionCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const serverRoot = getServerDataRoot(projectRoot);
  const worldRoot = resolve(serverRoot, 'data', 'world');
  const generatedPath = resolve(projectRoot, 'content', 'generated', 'hunt-regions.json');

  let spawnPath = resolve(worldRoot, 'spawn.xml');
  if (!existsSync(spawnPath)) spawnPath = resolve(worldRoot, 'realmap-spawn.xml');
  
  let otbmPath = resolve(worldRoot, 'styller.otbm');
  if (!existsSync(otbmPath)) otbmPath = resolve(worldRoot, 'realmap.otbm');

  const itemsOtbPath = resolve(serverRoot, 'data', 'items', 'items.otb');

  if (!existsSync(spawnPath) || !existsSync(otbmPath) || !existsSync(itemsOtbPath)) {
    if (existsSync(generatedPath)) {
      const source = await readFile(generatedPath, 'utf8');
      return JSON.parse(source) as HuntRegionCatalog;
    }
  }

  const [spawnSource, otbm, itemsOtb] = await Promise.all([
    readFile(spawnPath, 'utf8'),
    readFile(otbmPath),
    readFile(itemsOtbPath),
  ]);

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });
  const spawnGroups = asArray<Record<string, unknown>>(parser.parse(spawnSource).spawns?.spawn ?? []);
  const root = readNode(otbm, 4).node;
  const itemRoot = readNode(itemsOtb, 4).node;
  const itemFlags = new Map<number, OtbItemMovementFlags>();

  for (const itemNode of itemRoot.children) {
    const props = Buffer.from(itemNode.props);
    if (props.length < 7) continue;
    const flags = props.readUInt32LE(0);
    let serverId: number | undefined;
    let clientId: number | null = null;
    let offset = 4;
    while (offset + 3 <= props.length) {
      const attribute = props[offset];
      const length = props.readUInt16LE(offset + 1);
      offset += 3;
      if (offset + length > props.length) break;
      if (attribute === 0x10 && length === 2) serverId = props.readUInt16LE(offset);
      if (attribute === 0x11 && length === 2) clientId = props.readUInt16LE(offset);
      offset += length;
    }
    if (serverId !== undefined) itemFlags.set(serverId, { clientId, group: itemNode.type, flags, blockSolid: (flags & 1) !== 0, blockPathFind: (flags & 4) !== 0 });
  }

  const mapData = root.children.find((child) => child.type === 2);
  if (!mapData) throw new Error('OTBM map-data node was not found.');

  const output: HuntRegionDefinition[] = regions.map((selection) => {
    const [centerX, centerY, centerZ] = selection.center;
    const [width, height] = selection.size;
    const x = centerX - Math.floor(width / 2);
    const y = centerY - Math.floor(height / 2);
    const tiles: HuntRegionDefinition['tiles'] = [];

    for (const area of mapData.children) {
      if (area.type !== 4 || area.props.length < 5) continue;
      const areaProps = Buffer.from(area.props);
      const baseX = areaProps.readUInt16LE(0);
      const baseY = areaProps.readUInt16LE(2);
      const z = areaProps[4];
      if (z !== centerZ) continue;
      for (const tile of area.children) {
        if (tile.props.length < 2) continue;
        const tileX = baseX + tile.props[0];
        const tileY = baseY + tile.props[1];
        if (tileX < x || tileX >= x + width || tileY < y || tileY >= y + height) continue;
        const itemIds: number[] = [];
        for (const child of tile.children) {
          if (child.props.length >= 2) itemIds.push(Buffer.from(child.props).readUInt16LE(0));
        }
        const walkable = classifyTileWalkability(itemIds.map((id) => itemFlags.get(id)));
        tiles.push({
          x: tileX,
          y: tileY,
          z,
          walkable,
          serverItemIds: itemIds,
          groundServerId: itemIds[0] ?? null,
          itemProperties: [],
        });
      }
    }

    const walkableCount = tiles.filter((tile) => tile.walkable).length;
    return {
      huntId: selection.huntId,
      name: selection.name,
      monsterName: selection.monsterName,
      recommendedLevel: selection.recommendedLevel,
      sourceCenter: { x: centerX, y: centerY, z: centerZ, radius: selection.center[3] },
      bounds: { x, y, z: centerZ, width, height },
      environment: {
        source: 'otbm',
        width,
        height,
        walkableCount,
        wallCount: tiles.length - walkableCount,
        densityRatio: Number((walkableCount / Math.max(1, width * height)).toFixed(4)),
      },
      spawnPositions: spawnGroups.filter((spawn) => {
        const sx = Number(spawn.centerx ?? spawn.x);
        const sy = Number(spawn.centery ?? spawn.y);
        const sz = Number(spawn.centerz ?? spawn.z);
        return sz === centerZ && sx >= x && sx < x + width && sy >= y && sy < y + height;
      }).map((spawn) => ({
        x: Number(spawn.centerx ?? spawn.x),
        y: Number(spawn.centery ?? spawn.y),
        z: Number(spawn.centerz ?? spawn.z),
        spawntime: Number(spawn.spawntime ?? 60),
      })),
      sourceFiles: ['data/world/spawn.xml', 'data/world/styller.otbm'],
      importWarnings: [],
      tiles: tiles.sort((left, right) => left.y - right.y || left.x - right.x),
    };
  });

  const catalog: HuntRegionCatalog = { importedAtBuildTime: true, regions: output };
  if (options.write !== false) {
    await mkdir(dirname(generatedPath), { recursive: true });
    await writeFile(generatedPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
  return catalog;
}
