import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { HuntRegionCatalog, HuntRegionDefinition } from '../../content-schema/src/index.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }
interface OtbmNode { type: number; props: number[]; children: OtbmNode[] }
export interface OtbItemMovementFlags { clientId: number | null; group: number; flags: number; blockSolid: boolean; blockPathFind: boolean }

const START = 0xfe;
const END = 0xff;
const ESCAPE = 0xfd;
const regions = [
  { huntId: 'rat-cellars', monsterName: 'Rat', center: [566, 1092, 10, 3], size: [50, 34] },
  { huntId: 'spider-burrow', monsterName: 'Spider', center: [632, 1085, 10, 1], size: [50, 34] },
  { huntId: 'troll-camp', monsterName: 'Troll', center: [528, 1132, 8, 1], size: [50, 34] },
  { huntId: 'old-crypt', monsterName: 'Skeleton', center: [550, 1139, 9, 4], size: [50, 34] },
  { huntId: 'rotworm-cave', monsterName: 'Rotworm', center: [967, 975, 8, 16], size: [48, 32] },
] as const;
const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

function readNode(buffer: Buffer, start: number): { node: OtbmNode; next: number } {
  if (buffer[start] !== START) throw new Error(`Invalid OTBM node at ${start}.`);
  let offset = start + 1;
  const node: OtbmNode = { type: buffer[offset], props: [], children: [] };
  offset += 1;
  let childrenStarted = false;
  while (offset < buffer.length) {
    const byte = buffer[offset++];
    if (byte === ESCAPE) {
      if (childrenStarted) throw new Error('Escaped property found after OTBM child node.');
      node.props.push(buffer[offset++]);
    } else if (byte === START) {
      childrenStarted = true;
      const child = readNode(buffer, offset - 1);
      node.children.push(child.node);
      offset = child.next;
    } else if (byte === END) {
      return { node, next: offset };
    } else if (!childrenStarted) {
      node.props.push(byte);
    }
  }
  throw new Error('Unterminated OTBM node.');
}

function itemIdsOf(tile: OtbmNode): number[] {
  const props = Buffer.from(tile.props);
  let offset = tile.type === 14 ? 6 : 2;
  const ids: number[] = [];
  while (offset < props.length) {
    const attribute = props[offset++];
    if (attribute === 3 && offset + 4 <= props.length) { offset += 4; continue; }
    if (attribute === 9 && offset + 2 <= props.length) { ids.push(props.readUInt16LE(offset)); offset += 2; continue; }
    // Unknown tile attributes cannot be scanned byte-by-byte: their payload may
    // contain 0x09 and create a phantom item. Stop conservatively.
    break;
  }
  for (const item of tile.children) {
    const itemProps = Buffer.from(item.props);
    if (item.type === 6 && itemProps.length >= 2) ids.push(itemProps.readUInt16LE(0));
  }
  return [...new Set(ids)];
}

export function classifyTileWalkability(serverItemIds: number[], itemFlags: ReadonlyMap<number, OtbItemMovementFlags>): boolean {
  if (serverItemIds.length === 0) return false;
  const items = serverItemIds.map((serverId) => itemFlags.get(serverId));
  if (items.some((item) => item === undefined)) return false;
  const known = items.filter((item): item is OtbItemMovementFlags => item !== undefined);
  const hasGround = known.some((item) => item.group === 1);
  return hasGround && !known.some((item) => item.blockSolid || item.blockPathFind);
}

export async function importHuntRegions(options: ImportOptions = {}): Promise<HuntRegionCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const worldRoot = resolve(projectRoot, '..', 'styller-master', 'data', 'world');
  const [spawnSource, otbm, itemsOtb] = await Promise.all([
    readFile(resolve(worldRoot, 'spawn.xml'), 'utf8'),
    readFile(resolve(worldRoot, 'styller.otbm')),
    readFile(resolve(projectRoot, '..', 'styller-master', 'data', 'items', 'items.otb')),
  ]);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });
  const spawnGroups = asArray<Record<string, unknown>>(parser.parse(spawnSource).spawns.spawn);
  const root = readNode(otbm, 4).node;
  const itemRoot = readNode(itemsOtb, 4).node;
  const itemFlags = new Map<number, OtbItemMovementFlags>();
  for (const itemNode of itemRoot.children) {
    const props = Buffer.from(itemNode.props);
    if (props.length < 7) continue;
    const flags = props.readUInt32LE(0);
    let serverId: number | undefined; let clientId: number | null = null;
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
    const [centerX, centerY, centerZ, radius] = selection.center;
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
        if ((tile.type !== 5 && tile.type !== 14) || tile.props.length < 2) continue;
        const absoluteX = baseX + tile.props[0];
        const absoluteY = baseY + tile.props[1];
        if (absoluteX < x || absoluteY < y || absoluteX >= x + width || absoluteY >= y + height) continue;
        const serverItemIds = itemIdsOf(tile);
        const walkable = classifyTileWalkability(serverItemIds, itemFlags);
        const itemProperties = serverItemIds.flatMap((serverId) => {
          const item = itemFlags.get(serverId); return item ? [{ serverId, ...item }] : [];
        });
        tiles.push({ x: absoluteX, y: absoluteY, z, serverItemIds, walkable, groundServerId: itemProperties.find((item) => item.group === 1)?.serverId ?? null, itemProperties });
      }
    }
    const spawnPositions = spawnGroups.flatMap((group) => {
      const groupX = Number(group.centerx); const groupY = Number(group.centery); const groupZ = Number(group.centerz);
      if (groupZ !== centerZ) return [];
      return asArray<Record<string, unknown>>(group.monster as Record<string, unknown> | Record<string, unknown>[] | undefined)
        .filter((monster) => String(monster.name).toLowerCase() === selection.monsterName.toLowerCase())
        .map((monster) => ({ x: groupX + Number(monster.x), y: groupY + Number(monster.y), z: Number(monster.z), spawntime: Number(monster.spawntime ?? 60) }))
        .filter((spawn) => spawn.x >= x && spawn.y >= y && spawn.x < x + width && spawn.y < y + height);
    });
    if (tiles.length === 0 || spawnPositions.length === 0) throw new Error(`${selection.monsterName} region did not resolve to OTBM tiles and XML spawns.`);
    const warnings: string[] = [];
    if (tiles.length < width * height) warnings.push('The OTBM recorte contains void coordinates; these remain non-walkable in Cavebound.');
    return {
      huntId: selection.huntId, monsterName: selection.monsterName,
      sourceCenter: { x: centerX, y: centerY, z: centerZ, radius }, bounds: { x, y, z: centerZ, width, height },
      spawnPositions, tiles: tiles.sort((left, right) => left.y - right.y || left.x - right.x),
      sourceFiles: ['data/world/spawn.xml', 'data/world/styller.otbm'], importWarnings: warnings,
    };
  });
  const catalog: HuntRegionCatalog = { importedAtBuildTime: true, regions: output };
  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'hunt-regions.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
  return catalog;
}
