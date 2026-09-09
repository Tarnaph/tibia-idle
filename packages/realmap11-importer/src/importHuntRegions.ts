import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { HuntRegionCatalog, HuntRegionDefinition, HuntRegionTileDefinition } from '../../content-schema/src/index.ts';
import { getServerDataRoot } from './helpers.ts';

interface ImportOptions {
  projectRoot?: string;
  write?: boolean;
}

const START = 0xfe;
const END = 0xff;
const ESCAPE = 0xfd;

interface OtbItemFlag {
  clientId: number | null;
  group: number;
  flags: number;
  blockSolid: boolean;
  blockPathFind: boolean;
}

function itemIdsOf(tileNode: any): number[] {
  const props = Buffer.from(tileNode.props);
  let offset = tileNode.type === 14 ? 6 : 2;
  const ids: number[] = [];
  while (offset < props.length) {
    const attribute = props[offset++];
    if (attribute === 3 && offset + 4 <= props.length) { offset += 4; continue; }
    if (attribute === 9 && offset + 2 <= props.length) { ids.push(props.readUInt16LE(offset)); offset += 2; continue; }
    break;
  }
  for (const item of tileNode.children) {
    const itemProps = Buffer.from(item.props);
    if (itemProps.length >= 2) ids.push(itemProps.readUInt16LE(0));
  }
  return ids;
}

function readNode(buf: Buffer, start: number): { node: any; next: number } {
  if (buf[start] !== START) throw new Error(`Invalid node at ${start}`);
  let off = start + 1;
  const node: any = { type: buf[off++], props: [], children: [] };
  let childrenStarted = false;
  while (off < buf.length) {
    const b = buf[off++];
    if (b === ESCAPE) {
      node.props.push(buf[off++]);
    } else if (b === START) {
      childrenStarted = true;
      const child = readNode(buf, off - 1);
      node.children.push(child.node);
      off = child.next;
    } else if (b === END) {
      return { node, next: off };
    } else if (!childrenStarted) {
      node.props.push(b);
    }
  }
  throw new Error('Unterminated node in OTBM');
}

function skipNode(buf: Buffer, start: number): number {
  let depth = 1;
  let o = start + 2;
  while (o < buf.length && depth > 0) {
    const b = buf[o++];
    if (b === ESCAPE) { o++; }
    else if (b === START) { depth++; o++; }
    else if (b === END) { depth--; }
  }
  return o;
}

const huntConfigs = [
  { huntId: 'rat-cellars', name: 'Rat Cellars', monsterName: 'Rat', recommendedLevel: 1, center: [32102, 32205, 8] as const, radius: 25, available: true },
  { huntId: 'spider-burrow', name: 'Spider Burrow', monsterName: 'Spider', recommendedLevel: 4, center: [0, 0, 0] as const, radius: 0, available: false },
  { huntId: 'troll-camp', name: 'Troll Camp', monsterName: 'Troll', recommendedLevel: 7, center: [32389, 31819, 9] as const, radius: 25, available: true },
  { huntId: 'old-crypt', name: 'Old Crypt', monsterName: 'Skeleton', recommendedLevel: 10, center: [32132, 32198, 10] as const, radius: 25, available: true },
  { huntId: 'rotworm-cave', name: 'Rotworm Cave', monsterName: 'Rotworm', recommendedLevel: 12, center: [32336, 31842, 10] as const, radius: 25, available: true },
  { huntId: 'dragon-lair', name: 'Dragon Lair', monsterName: 'Dragon', recommendedLevel: 45, center: [32741, 31294, 11] as const, radius: 25, available: true },
];

export async function importHuntRegions(options: ImportOptions = {}): Promise<HuntRegionCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const serverRoot = getServerDataRoot(projectRoot);

  const otbPath = resolve(serverRoot, 'data', 'items', 'items.otb');
  const otbmCandidate1 = resolve(serverRoot, 'data', 'world', 'world', 'realmap.otbm');
  const otbmCandidate2 = resolve(serverRoot, 'data', 'world', 'realmap.otbm');
  const otbmPath = existsSync(otbmCandidate1) ? otbmCandidate1 : otbmCandidate2;

  if (!existsSync(otbPath)) throw new Error(`items.otb not found at ${otbPath}`);
  if (!existsSync(otbmPath)) throw new Error(`realmap.otbm not found at ${otbmPath}`);

  const [otbBuf, otbmBuf] = await Promise.all([
    readFile(otbPath),
    readFile(otbmPath),
  ]);

  // Parse items.otb
  const itemRoot = readNode(otbBuf, 4).node;
  const itemFlags = new Map<number, OtbItemFlag>();
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
    if (serverId !== undefined) {
      itemFlags.set(serverId, {
        clientId,
        group: itemNode.type,
        flags,
        blockSolid: (flags & 1) !== 0,
        blockPathFind: (flags & 4) !== 0,
      });
    }
  }

  // Stream realmap.otbm
  let off = 4;
  if (otbmBuf[off++] !== START) throw new Error('Not START');
  off++; // root
  while (otbmBuf[off] !== START && off < otbmBuf.length) {
    if (otbmBuf[off] === ESCAPE) off += 2; else off++;
  }
  if (otbmBuf[off++] !== START) throw new Error('Not mapData START');
  off++; // mapData
  while (otbmBuf[off] !== START && off < otbmBuf.length) {
    if (otbmBuf[off] === ESCAPE) off += 2; else off++;
  }

  const huntTiles = new Map<string, HuntRegionTileDefinition[]>();
  for (const h of huntConfigs) huntTiles.set(h.huntId, []);

  const activeConfigs = huntConfigs.filter((h) => h.available && h.radius > 0);

  while (off < otbmBuf.length) {
    const b = otbmBuf[off];
    if (b === END) { off++; break; }
    if (b === START) {
      const nodeStart = off;
      const nodeType = otbmBuf[off + 1];
      if (nodeType === 4) {
        let po = off + 2;
        const props: number[] = [];
        while (po < otbmBuf.length && otbmBuf[po] !== START && otbmBuf[po] !== END) {
          if (otbmBuf[po] === ESCAPE) { props.push(otbmBuf[po + 1]); po += 2; }
          else { props.push(otbmBuf[po]); po++; }
        }
        if (props.length >= 5) {
          const areaProps = Buffer.from(props);
          const baseX = areaProps.readUInt16LE(0);
          const baseY = areaProps.readUInt16LE(2);
          const baseZ = areaProps[4];

          const matchingHunts = activeConfigs.filter((h) => {
            const [cx, cy, cz] = h.center;
            if (baseZ !== cz) return false;
            return baseX <= cx + h.radius && baseX + 256 >= cx - h.radius &&
                   baseY <= cy + h.radius && baseY + 256 >= cy - h.radius;
          });

          if (matchingHunts.length > 0) {
            const area = readNode(otbmBuf, nodeStart);
            for (const tile of area.node.children) {
              if ((tile.type !== 5 && tile.type !== 14) || tile.props.length < 2) continue;
              const tileX = baseX + tile.props[0];
              const tileY = baseY + tile.props[1];
              for (const h of matchingHunts) {
                const [cx, cy, cz] = h.center;
                if (tileX >= cx - h.radius && tileX <= cx + h.radius &&
                    tileY >= cy - h.radius && tileY <= cy + h.radius) {
                  const serverItemIds = itemIdsOf(tile);
                  const known = serverItemIds.map((id) => itemFlags.get(id)).filter(Boolean) as OtbItemFlag[];
                  const ground = known.find((i) => i.group === 1);
                  const walkable = Boolean(ground) && !known.some((i) => i.blockSolid || i.blockPathFind);
                  const groundServerId = ground ? serverItemIds.find((id) => itemFlags.get(id)?.group === 1) ?? null : null;

                  huntTiles.get(h.huntId)!.push({
                    x: tileX,
                    y: tileY,
                    z: cz,
                    serverItemIds,
                    walkable,
                    groundServerId,
                    itemProperties: serverItemIds.map((id) => {
                      const k = itemFlags.get(id);
                      return {
                        serverId: id,
                        clientId: k?.clientId ?? null,
                        group: k?.group ?? 0,
                        flags: k?.flags ?? 0,
                        blockSolid: k?.blockSolid ?? false,
                        blockPathFind: k?.blockPathFind ?? false,
                      };
                    }),
                  });
                }
              }
            }
            off = area.next;
            continue;
          }
        }
      }
      off = skipNode(otbmBuf, nodeStart);
    } else {
      off++;
    }
  }

  const resultRegions: HuntRegionDefinition[] = huntConfigs.map((cfg) => {
    if (!cfg.available || cfg.radius === 0) {
      return {
        huntId: cfg.huntId,
        name: cfg.name,
        monsterName: cfg.monsterName,
        available: false,
        sourceCenter: { x: 0, y: 0, z: 0, radius: 0 },
        bounds: { x: 0, y: 0, z: 0, width: 0, height: 0 },
        spawnPositions: [],
        tiles: [],
        sourceFiles: ['realmap11/data/world/world/realmap.otbm'],
        importWarnings: [],
      };
    }

    const [cx, cy, cz] = cfg.center;
    const radius = cfg.radius;
    const width = radius * 2 + 1;
    const height = radius * 2 + 1;
    const minX = cx - radius;
    const minY = cy - radius;
    const rawTiles = huntTiles.get(cfg.huntId) ?? [];

    const byPosition = new Map(rawTiles.map((t) => [`${t.x},${t.y}`, t]));
    const tiles: HuntRegionTileDefinition[] = [];

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const x = minX + dx;
        const y = minY + dy;
        const source = byPosition.get(`${x},${y}`);
        if (source) {
          tiles.push(source);
        } else {
          // Out of OTBM bounds void tile
          tiles.push({
            x,
            y,
            z: cz,
            serverItemIds: [],
            walkable: false,
            groundServerId: null,
            itemProperties: [],
          });
        }
      }
    }

    const walkable = tiles.filter((t) => t.walkable);
    const nearestWalkable = (pos: { x: number; y: number }) => ({
      ...walkable.reduce((best, tile) => {
        const d = Math.abs(tile.x - pos.x) + Math.abs(tile.y - pos.y);
        const bd = Math.abs(best.x - pos.x) + Math.abs(best.y - pos.y);
        return d < bd ? tile : best;
      }, walkable[0] ?? { x: cx, y: cy, z: cz }),
    });

    const localEntrance = nearestWalkable({ x: cx, y: cy });
    const walkableKeys = new Set(walkable.map((t) => `${t.x},${t.y}`));
    const componentKeys = new Set<string>();
    const queue = [{ x: localEntrance.x, y: localEntrance.y }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      if (componentKeys.has(key) || !walkableKeys.has(key)) continue;
      componentKeys.add(key);
      queue.push(
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      );
    }

    const component = walkable.filter((t) => componentKeys.has(`${t.x},${t.y}`));

    // Only tiles connected to the main dungeon room remain walkable; isolated pockets are blocked
    for (const tile of tiles) {
      tile.walkable = componentKeys.has(`${tile.x},${tile.y}`);
    }

    const spawnPositions: Array<{ x: number; y: number; z: number; spawntime: number }> = [];

    if (component.length > 0) {
      const nearby = component.filter((t) => {
        const d = Math.hypot(t.x - cx, t.y - cy);
        return d >= 3 && d <= 13;
      });
      const pool = nearby.length >= 6 ? nearby : component;
      const sorted = [...pool].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
      const step = Math.max(1, Math.floor(sorted.length / 6));
      for (let i = 0; i < 6; i++) {
        const p = sorted[Math.min(sorted.length - 1, i * step + Math.floor(step / 2))];
        spawnPositions.push({ x: p.x, y: p.y, z: cz, spawntime: 60 });
      }
    }

    return {
      huntId: cfg.huntId,
      name: cfg.name,
      monsterName: cfg.monsterName,
      available: true,
      sourceCenter: { x: cx, y: cy, z: cz, radius },
      bounds: { x: minX, y: minY, z: cz, width, height },
      spawnPositions,
      tiles,
      sourceFiles: ['realmap11/data/world/world/realmap.otbm'],
      importWarnings: [],
    };
  });

  const catalog: HuntRegionCatalog = { importedAtBuildTime: true, regions: resultRegions };
  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'hunt-regions.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }

  return catalog;
}
