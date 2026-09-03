import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const DAT_PATH = 'C:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia 11/Tibia 11/Tibia 11/Tibia.dat';
const SPR_PATH = 'C:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia 11/Tibia 11/Tibia 11/Tibia.spr';
const OTB_PATH = 'C:/Users/desig/OneDrive/Documentos/TibiaWeb/realmap11/data/items/items.otb';

const START = 0xfe;
const END = 0xff;
const ESCAPE = 0xfd;

// PNG encoder helper
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}
function encodeRgbaPng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    scanlines[row] = 0;
    rgba.copy(scanlines, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function copySprite(target, targetWidth, source, targetX, targetY) {
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      const sourceOffset = (y * 32 + x) * 4;
      if (source[sourceOffset + 3] === 0) continue;
      const targetOffset = ((targetY + y) * targetWidth + targetX + x) * 4;
      source.copy(target, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

async function run() {
  console.log('--- Tibia 10.98 Thais Asset Extraction ---');
  console.log('1. Loading items.otb from realmap11...');
  const otbBuf = await readFile(OTB_PATH);

  function readNode(buf, start) {
    let off = start + 1;
    const node = { type: buf[off++], props: [], children: [] };
    let childrenStarted = false;
    while (off < buf.length) {
      const b = buf[off++];
      if (b === ESCAPE) node.props.push(buf[off++]);
      else if (b === START) {
        childrenStarted = true;
        const child = readNode(buf, off - 1);
        node.children.push(child.node);
        off = child.next;
      } else if (b === END) return { node, next: off };
      else if (!childrenStarted) node.props.push(b);
    }
  }

  const itemRoot = readNode(otbBuf, 4).node;
  const otbMap = new Map();
  for (const itemNode of itemRoot.children) {
    const p = Buffer.from(itemNode.props);
    if (p.length < 7) continue;
    const flags = p.readUInt32LE(0);
    let serverId, clientId;
    let o = 4;
    while (o + 3 <= p.length) {
      const attr = p[o];
      const len = p.readUInt16LE(o + 1);
      o += 3;
      if (attr === 0x10 && len === 2) serverId = p.readUInt16LE(o);
      if (attr === 0x11 && len === 2) clientId = p.readUInt16LE(o);
      o += len;
    }
    if (serverId !== undefined) {
      otbMap.set(serverId, {
        clientId,
        group: itemNode.type,
        flags,
        isGround: itemNode.type === 1,
        blockSolid: (flags & 1) !== 0,
        blockPathFind: (flags & 4) !== 0,
      });
    }
  }
  console.log(`Loaded ${otbMap.size} item mappings from items.otb`);

  console.log('2. Loading Tibia 10.98 Tibia.dat and Tibia.spr...');
  const datBuf = await readFile(DAT_PATH);
  const sprBuf = await readFile(SPR_PATH);

  let datOffset = 4;
  function u8() { return datBuf[datOffset++]; }
  function u16() { const v = datBuf.readUInt16LE(datOffset); datOffset += 2; return v; }
  function u32() { const v = datBuf.readUInt32LE(datOffset); datOffset += 4; return v; }
  function i8() { const v = datBuf.readInt8(datOffset); datOffset += 1; return v; }
  function i32() { const v = datBuf.readInt32LE(datOffset); datOffset += 4; return v; }
  function str() { const len = u16(); const s = datBuf.toString('utf8', datOffset, datOffset + len); datOffset += len; return s; }

  const itemCount = u16();
  const creatureCount = u16();
  const effectCount = u16();
  const missileCount = u16();

  console.log(`Parsing 10.98 DAT: ${itemCount} items, ${creatureCount} creatures...`);
  const datItems = new Map();
  for (let id = 100; id <= itemCount; id++) {
    const attrs = [];
    while (datOffset < datBuf.length) {
      let attr = u8();
      if (attr === 0xff) break;
      attrs.push(attr);
      if (attr === 16) attr = 999;
      else if (attr > 16) attr -= 1;
      if (attr === 24 || attr === 21) { u16(); u16(); }
      else if (attr === 33) { u16(); u16(); u16(); str(); u16(); u16(); }
      else if (attr === 25 || attr === 34 || attr === 0 || attr === 8 || attr === 9 || attr === 28 || attr === 32 || attr === 29) { u16(); }
    }
    const width = u8();
    const height = u8();
    if (width > 1 || height > 1) u8();
    const layers = u8();
    const patternX = u8();
    const patternY = u8();
    const patternZ = u8();
    const animPhases = u8();
    if (animPhases > 1) {
      u8(); i32(); i8();
      for (let p = 0; p < animPhases; p++) { u32(); u32(); }
    }
    const totalSprites = width * height * layers * patternX * patternY * patternZ * animPhases;
    const spriteIds = [];
    for (let s = 0; s < totalSprites; s++) spriteIds.push(u32());
    datItems.set(id, { id, width, height, layers, patternX, patternY, patternZ, animPhases, spriteIds, attributes: attrs });
  }

  // Tibia 10.98 SPR decompressor
  const sprHeaderCount = sprBuf.readUInt32LE(4);
  console.log(`10.98 SPR loaded with ${sprHeaderCount} sprites.`);

  function decodeSprite(spriteId) {
    const rgba = Buffer.alloc(32 * 32 * 4);
    if (!spriteId || spriteId > sprHeaderCount) return rgba;
    const offset = sprBuf.readUInt32LE(8 + (spriteId - 1) * 4);
    if (!offset || offset + 5 > sprBuf.length) return rgba;

    const dataSize = sprBuf.readUInt16LE(offset + 3);
    let readOff = offset + 5;
    const endOff = offset + 5 + dataSize;
    let writePixel = 0;

    while (readOff < endOff && writePixel < 1024) {
      const transparentPixels = sprBuf.readUInt16LE(readOff); readOff += 2;
      const coloredPixels = sprBuf.readUInt16LE(readOff); readOff += 2;
      writePixel += transparentPixels;
      for (let p = 0; p < coloredPixels; p++) {
        const pr = sprBuf[readOff++];
        const pg = sprBuf[readOff++];
        const pb = sprBuf[readOff++];
        if (writePixel < 1024) {
          const idx = writePixel * 4;
          rgba[idx] = pr;
          rgba[idx + 1] = pg;
          rgba[idx + 2] = pb;
          rgba[idx + 3] = 255;
        }
        writePixel++;
      }
    }
    return rgba;
  }

  // 3. Load thais-city.json
  const thaisCity = JSON.parse(await readFile('content/generated/thais-city.json', 'utf8'));
  const allServerIds = new Set(thaisCity.tiles.flatMap(t => t.serverItemIds));
  // Also add depot (2598, 3497, 3498) and dummies (5787)
  [2598, 3497, 3498, 5787, 405, 406, 407, 1448, 1515, 1481, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 1056, 1057].forEach(id => allServerIds.add(id));

  console.log(`Extracting sprites for ${allServerIds.size} unique Thais items...`);
  await mkdir('public/generated/tibia1098/items', { recursive: true });

  const extractedMap = {};
  let savedCount = 0;

  for (const serverId of allServerIds) {
    const otb = otbMap.get(serverId);
    if (!otb) continue;
    const datItem = datItems.get(otb.clientId);
    if (!datItem) continue;

    // Check if item has any visible sprites
    if (datItem.spriteIds.every(s => s === 0)) continue;

    const width = datItem.width * 32;
    const height = datItem.height * 32;
    const totalPhases = Math.max(1, datItem.animPhases);
    const animFrames = [];

    for (let f = 0; f < totalPhases; f++) {
      const rgba = Buffer.alloc(width * height * 4);

      function getSpriteId(tileW, tileH) {
        const idx = (((((f * datItem.patternZ + 0) * datItem.patternY + 0) * datItem.patternX + 0) * datItem.layers + 0) * datItem.height + tileH) * datItem.width + tileW;
        return datItem.spriteIds[idx] || 0;
      }

      for (let tileW = 0; tileW < datItem.width; tileW++) {
        for (let tileH = 0; tileH < datItem.height; tileH++) {
          const spriteId = getSpriteId(tileW, tileH);
          if (spriteId > 0) {
            const spriteRgba = decodeSprite(spriteId);
            copySprite(
              rgba,
              width,
              spriteRgba,
              (datItem.width - tileW - 1) * 32,
              (datItem.height - tileH - 1) * 32,
            );
          }
        }
      }

      const png = encodeRgbaPng(width, height, rgba);
      const fileName = totalPhases > 1 ? `item-${serverId}-frame-${f}.png` : `item-${serverId}.png`;
      const filePath = `public/generated/tibia1098/items/${fileName}`;
      await writeFile(filePath, png);
      const publicUrl = `/generated/tibia1098/items/${fileName}`;

      // Also ensure default item-${serverId}.png exists for frame 0
      if (totalPhases > 1 && f === 0) {
        const baseFilePath = `public/generated/tibia1098/items/item-${serverId}.png`;
        await writeFile(baseFilePath, png);
      }

      animFrames.push({
        frame: f,
        direction: 'static',
        pattern: { x: 0, y: 0, z: 0 },
        layer: 0,
        spriteIds: datItem.spriteIds,
        file: filePath,
        publicUrl,
        sha256: '',
        width,
        height,
      });
    }

    const defaultFrame = animFrames[0];
    extractedMap[String(serverId)] = {
      serverId,
      clientId: otb.clientId,
      group: otb.group,
      name: `OTBM 10.98 item ${serverId}`,
      resolved: true,
      source: {
        serverId,
        otb: 'realmap11/data/items/items.otb',
        dat: 'Tibia 11/Tibia 11/Tibia 11/Tibia.dat',
        spr: 'Tibia 11/Tibia 11/Tibia 11/Tibia.spr',
      },
      appearanceId: otb.clientId,
      isGround: otb.isGround,
      blockSolid: otb.blockSolid,
      appearance: {
        width: datItem.width,
        height: datItem.height,
        exactSize: 32,
        layers: datItem.layers,
        patternX: datItem.patternX,
        patternY: datItem.patternY,
        patternZ: datItem.patternZ,
        frames: datItem.animPhases,
        attributes: datItem.attributes,
        spriteIds: datItem.spriteIds,
      },
      extractedPattern: { x: 0, y: 0, z: 0 },
      extractedLayer: 0,
      frame: defaultFrame,
      frames: animFrames,
      animDurationMs: totalPhases > 1 ? 200 : 0,
      importWarnings: [],
    };
    savedCount++;
  }

  console.log(`Saved ${savedCount} item PNGs to public/generated/tibia1098/items/`);

  // Write catalog
  await writeFile(
    'content/generated/tibia1098-thais-assets.json',
    JSON.stringify({ generatedAt: new Date().toISOString(), itemsCount: savedCount, items: extractedMap }, null, 2),
  );

  // Also merge into content/generated/tibia860-assets.json mapItems so existing components benefit immediately
  const existingAssets = JSON.parse(await readFile('content/generated/tibia860-assets.json', 'utf8'));
  for (const [id, item] of Object.entries(extractedMap)) {
    existingAssets.mapItems[id] = item;
  }
  await writeFile('content/generated/tibia860-assets.json', JSON.stringify(existingAssets, null, 2));
  console.log(`Updated content/generated/tibia860-assets.json with 10.98 items!`);

  console.log('Extraction completed successfully!');
}

run().catch(err => {
  console.error('Error during extraction:', err);
  process.exit(1);
});
