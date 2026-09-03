import { readFile, writeFile } from 'node:fs/promises';

const START = 0xfe;
const END = 0xff;
const ESCAPE = 0xfd;

// Types:
// 1 = OTBM_ROOT
// 2 = OTBM_MAP_DATA
// 3 = OTBM_ITEM
// 4 = OTBM_TILE_AREA
// 5 = OTBM_TILE
// 14 = OTBM_HOUSETILE

function itemIdsOf(tileNode) {
  const props = Buffer.from(tileNode.props);
  let offset = tileNode.type === 14 ? 6 : 2;
  const ids = [];
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

async function run() {
  console.log('Loading items.otb...');
  const itemsOtbBuf = await readFile('C:/Users/desig/OneDrive/Documentos/TibiaWeb/realmap11/data/items/items.otb');
  
  // Parse items.otb
  function readNode(buf, start) {
    if (buf[start] !== START) throw new Error(`Invalid node at ${start}`);
    let off = start + 1;
    const node = { type: buf[off++], props: [], children: [] };
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
    throw new Error('Unterminated');
  }

  const itemRoot = readNode(itemsOtbBuf, 4).node;
  const itemFlags = new Map();
  for (const itemNode of itemRoot.children) {
    const props = Buffer.from(itemNode.props);
    if (props.length < 7) continue;
    const flags = props.readUInt32LE(0);
    let serverId;
    let clientId = null;
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
  console.log(`Loaded ${itemFlags.size} item definitions from items.otb`);

  console.log('Loading realmap.otbm (145MB)...');
  const otbm = await readFile('C:/Users/desig/OneDrive/Documentos/TibiaWeb/realmap11/data/realmap.otbm');
  console.log('Parsing realmap.otbm stream...');

  // Bounds for Thais:
  // Temple: 32369, 32241, 7
  // Depot: 32342, 32231, 7
  // Dummy: 32349, 32238, 7
  const minX = 32280;
  const maxX = 32430;
  const minY = 32170;
  const maxY = 32290;
  const targetZ = 7;

  // Let's use a stack-based parser that only expands children if area overlaps Thais!
  let off = 4; // skip 4-byte header

  const thaisTiles = [];

  function skipNode(buf, start) {
    let depth = 1;
    let o = start + 2; // skip START and type
    while (o < buf.length && depth > 0) {
      const b = buf[o++];
      if (b === ESCAPE) {
        o++; // skip escaped byte
      } else if (b === START) {
        depth++;
        o++; // skip type
      } else if (b === END) {
        depth--;
      }
    }
    return o;
  }

  function parseOverlappingArea(buf, start) {
    const area = readNode(buf, start);
    const areaProps = Buffer.from(area.node.props);
    if (areaProps.length < 5) return area.next;
    const baseX = areaProps.readUInt16LE(0);
    const baseY = areaProps.readUInt16LE(2);
    const baseZ = areaProps[4];

    if (baseZ !== targetZ) return area.next;

    for (const tile of area.node.children) {
      if ((tile.type !== 5 && tile.type !== 14) || tile.props.length < 2) continue;
      const tileX = baseX + tile.props[0];
      const tileY = baseY + tile.props[1];

      if (tileX >= minX && tileX <= maxX && tileY >= minY && tileY <= maxY) {
        const serverItemIds = itemIdsOf(tile);
        const known = serverItemIds.map(id => itemFlags.get(id)).filter(Boolean);
        const hasGround = known.some(i => i.group === 1);
        const walkable = hasGround && !known.some(i => i.blockSolid || i.blockPathFind);
        const ground = known.find(i => i.group === 1);

        thaisTiles.push({
          x: tileX,
          y: tileY,
          z: targetZ,
          walkable,
          groundClientId: ground?.clientId ?? null,
          serverItemIds,
          clientItemIds: known.map(k => k.clientId).filter(Boolean),
        });
      }
    }

    return area.next;
  }

  // Scan through root and mapData
  // Read root node header
  if (otbm[off++] !== START) throw new Error('Not START');
  const rootType = otbm[off++];
  // Read props of root until mapData START
  while (otbm[off] !== START && off < otbm.length) {
    if (otbm[off] === ESCAPE) off += 2;
    else off++;
  }

  // Now off is at mapData START
  if (otbm[off++] !== START) throw new Error('Not mapData START');
  const mapDataType = otbm[off++]; // type 2
  // Read props of mapData until child START
  while (otbm[off] !== START && off < otbm.length) {
    if (otbm[off] === ESCAPE) off += 2;
    else off++;
  }

  // Now we are iterating children of mapData (tile areas)
  console.log('Iterating tile areas...');
  let areaCount = 0;
  let matchingAreas = 0;

  while (off < otbm.length) {
    const b = otbm[off];
    if (b === END) {
      off++;
      break; // end of mapData
    }
    if (b === START) {
      const nodeStart = off;
      const nodeType = otbm[off + 1];
      if (nodeType === 4) {
        // Read props of area (starts at off + 2)
        let po = off + 2;
        const props = [];
        while (po < otbm.length && otbm[po] !== START && otbm[po] !== END) {
          if (otbm[po] === ESCAPE) {
            props.push(otbm[po + 1]);
            po += 2;
          } else {
            props.push(otbm[po]);
            po++;
          }
        }
        if (props.length >= 5) {
          const areaProps = Buffer.from(props);
          const baseX = areaProps.readUInt16LE(0);
          const baseY = areaProps.readUInt16LE(2);
          const baseZ = areaProps[4];

          // Check if this area overlaps Thais target box:
          // A tile area is 256x256 max
          const overlaps =
            baseZ === targetZ &&
            baseX <= maxX &&
            baseX + 256 >= minX &&
            baseY <= maxY &&
            baseY + 256 >= minY;

          if (overlaps) {
            matchingAreas++;
            off = parseOverlappingArea(otbm, nodeStart);
            continue;
          }
        }
      }
      // Skip this node
      off = skipNode(otbm, nodeStart);
      areaCount++;
      if (areaCount % 2000 === 0) {
        console.log(`Scanned ${areaCount} areas...`);
      }
    } else {
      off++;
    }
  }

  console.log(`Scan complete. Found ${thaisTiles.length} tiles in Thais bounding box from ${matchingAreas} areas.`);

  // Write out thais-city-region.json
  const output = {
    region: 'thais-city',
    bounds: { minX, maxX, minY, maxY, z: targetZ },
    temple: { x: 32369, y: 32241, z: 7 },
    depot: { x: 32342, y: 32231, z: 7 },
    trainingDummy: { x: 32349, y: 32238, z: 7 },
    tileCount: thaisTiles.length,
    tiles: thaisTiles,
  };

  await writeFile('content/generated/thais-city.json', JSON.stringify(output, null, 2));
  console.log('Saved to content/generated/thais-city.json');
}

run().catch(console.error);
