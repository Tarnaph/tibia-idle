import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const RCC_PATH = 'c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia 11/Tibia 11/Tibia 11/bin/graphics_resources.rcc';
const OUTPUT_DIR = path.resolve('public', 'spells');
const CANONICAL_DIR = path.resolve('public', 'spells', 'canonical');

if (!fs.existsSync(RCC_PATH)) {
  throw new Error(`graphics_resources.rcc not found at: ${RCC_PATH}`);
}

const rccBuf = fs.readFileSync(RCC_PATH);

const treeOffset = rccBuf.readUInt32BE(8);
const dataOffset = rccBuf.readUInt32BE(12);
const namesOffset = rccBuf.readUInt32BE(16);

function getName(offset) {
  const len = rccBuf.readUInt16BE(namesOffset + offset);
  const strBuf = rccBuf.slice(namesOffset + offset + 6, namesOffset + offset + 6 + len * 2);
  let str = '';
  for (let i = 0; i < strBuf.length; i += 2) {
    str += String.fromCharCode(strBuf.readUInt16BE(i));
  }
  return str;
}

const nodeSize = 14;

function parseNode(nodeIndex, parentPath = '') {
  const offset = treeOffset + nodeIndex * nodeSize;
  const nameOff = rccBuf.readUInt32BE(offset);
  const flags = rccBuf.readUInt16BE(offset + 4);
  const isDir = Boolean(flags & 0x02);
  const isCompressed = Boolean(flags & 0x01);
  const name = getName(nameOff);
  const currentPath = parentPath ? (parentPath + '/' + name) : name;

  if (isDir) {
    const childCount = rccBuf.readUInt32BE(offset + 6);
    const childOffset = rccBuf.readUInt32BE(offset + 10);
    const children = [];
    for (let i = 0; i < childCount; i++) {
      children.push(parseNode(childOffset + i, currentPath));
    }
    return { name, path: currentPath, isDir: true, children };
  } else {
    const fileDataOff = rccBuf.readUInt32BE(offset + 10);
    const len = rccBuf.readUInt32BE(dataOffset + fileDataOff);
    return { name, path: currentPath, isDir: false, isCompressed, len, dataOffset: dataOffset + fileDataOff + 4 };
  }
}

function findNodes(node, filterFn, list = []) {
  if (filterFn(node)) list.push(node);
  if (node.children) {
    for (const ch of node.children) findNodes(ch, filterFn, list);
  }
  return list;
}

const root = parseNode(0);
const targetNode = findNodes(root, n => !n.isDir && n.name === 'spell-icons-32x32.png')[0];

if (!targetNode) {
  throw new Error('spell-icons-32x32.png not found in graphics_resources.rcc');
}

console.log(`Found ${targetNode.name} in RCC (${targetNode.len} bytes)`);
const pngBytes = rccBuf.slice(targetNode.dataOffset, targetNode.dataOffset + targetNode.len);

// Decode PNG IDAT scanlines
let offset = 8;
const idatChunks = [];
let width = 0, height = 0, bitDepth = 0, colorType = 0;

while (offset < pngBytes.length) {
  const len = pngBytes.readUInt32BE(offset);
  const type = pngBytes.slice(offset + 4, offset + 8).toString('ascii');
  if (type === 'IHDR') {
    width = pngBytes.readUInt32BE(offset + 8);
    height = pngBytes.readUInt32BE(offset + 12);
    bitDepth = pngBytes[offset + 16];
    colorType = pngBytes[offset + 17];
  } else if (type === 'IDAT') {
    idatChunks.push(pngBytes.slice(offset + 8, offset + 8 + len));
  }
  offset += 12 + len;
}

const rawIdat = Buffer.concat(idatChunks);
const decompressed = zlib.inflateSync(rawIdat);

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

const bytesPerPixel = colorType === 6 ? 4 : 3;
const stride = width * bytesPerPixel;
const unfilterData = Buffer.alloc(width * height * bytesPerPixel);

let srcOffset = 0;
for (let y = 0; y < height; y++) {
  const filterType = decompressed[srcOffset++];
  const prevRowOffset = (y - 1) * stride;
  const currRowOffset = y * stride;

  for (let x = 0; x < stride; x++) {
    const raw = decompressed[srcOffset++];
    const a = (x >= bytesPerPixel) ? unfilterData[currRowOffset + x - bytesPerPixel] : 0;
    const b = (y > 0) ? unfilterData[prevRowOffset + x] : 0;
    const c = (y > 0 && x >= bytesPerPixel) ? unfilterData[prevRowOffset + x - bytesPerPixel] : 0;

    let val = 0;
    if (filterType === 0) val = raw;
    else if (filterType === 1) val = (raw + a) & 0xff;
    else if (filterType === 2) val = (raw + b) & 0xff;
    else if (filterType === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
    else if (filterType === 4) val = (raw + paethPredictor(a, b, c)) & 0xff;
    unfilterData[currRowOffset + x] = val;
  }
}

// Convert to RGBA
const rgbaSheet = Buffer.alloc(width * height * 4);
for (let i = 0; i < width * height; i++) {
  if (bytesPerPixel === 4) {
    rgbaSheet[i * 4] = unfilterData[i * 4];
    rgbaSheet[i * 4 + 1] = unfilterData[i * 4 + 1];
    rgbaSheet[i * 4 + 2] = unfilterData[i * 4 + 2];
    rgbaSheet[i * 4 + 3] = unfilterData[i * 4 + 3];
  } else {
    rgbaSheet[i * 4] = unfilterData[i * 3];
    rgbaSheet[i * 4 + 1] = unfilterData[i * 3 + 1];
    rgbaSheet[i * 4 + 2] = unfilterData[i * 3 + 2];
    rgbaSheet[i * 4 + 3] = 255;
  }
}

// CRC32 and PNG encoder
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}

function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ crcTable[(c ^ b[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, toCrc, crcBuf]);
}

function encodePng(w, h, rgbaBuf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rawScanlines = Buffer.alloc((w * 4 + 1) * h);
  let dOffset = 0;
  for (let y = 0; y < h; y++) {
    rawScanlines[dOffset++] = 0; // Filter None
    const sOffset = y * w * 4;
    rgbaBuf.copy(rawScanlines, dOffset, sOffset, sOffset + w * 4);
    dOffset += w * 4;
  }
  const idatData = zlib.deflateSync(rawScanlines, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

if (!fs.existsSync(CANONICAL_DIR)) fs.mkdirSync(CANONICAL_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const numIcons = Math.floor(width / 32);
console.log(`Extracting ${numIcons} 32x32 icons from spritesheet...`);

const extractedIcons = [];
for (let i = 0; i < numIcons; i++) {
  const iconRgba = Buffer.alloc(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const srcIdx = ((y * width) + (i * 32 + x)) * 4;
      const dstIdx = ((y * 32) + x) * 4;
      iconRgba[dstIdx] = rgbaSheet[srcIdx];
      iconRgba[dstIdx + 1] = rgbaSheet[srcIdx + 1];
      iconRgba[dstIdx + 2] = rgbaSheet[srcIdx + 2];
      iconRgba[dstIdx + 3] = rgbaSheet[srcIdx + 3];
    }
  }
  const iconPng = encodePng(32, 32, iconRgba);
  fs.writeFileSync(path.join(CANONICAL_DIR, `spell-${i}.png`), iconPng);
  extractedIcons.push({ index: i, png: iconPng });
}

// Canonical Sorcerer spell mapping derived from client.exe and client.en.qm
const SORCERER_CANONICAL_ICONS = {
  'exori-min-flam.png': 126,        // Apprentice's Strike
  'apprentices-strike.png': 126,    // Apprentice's Strike alias
  'exura.png': 5,                   // Light Healing
  'exori-vis.png': 28,              // Energy Strike
  'exori-tera.png': 34,             // Terra Strike
  'exori-flam.png': 25,             // Flame Strike
  'utani-hur.png': 100,             // Haste
  'utamo-vita.png': 123,            // Magic Shield
  'exori-frigo.png': 31,            // Ice Strike
  'exori-mort.png': 37,             // Death Strike
  'exevo-flam-hur.png': 43,         // Fire Wave
  'exura-gran.png': 6,              // Intense Healing
  'utani-gran-hur.png': 101,        // Strong Haste
  'exevo-vis-lux.png': 40,          // Energy Beam
  'energy-beam.png': 40,            // Energy Beam alias
  'exevo-gran-vis-lux.png': 41,     // Great Energy Beam
  '4g.png': 41,                     // Great Energy Beam alias
  'exura-vita.png': 0,              // Ultimate Healing
  'exevo-vis-hur.png': 42,          // Energy Wave
  'exevo-gran-flam-hur.png': 43,    // Great Fire Wave
  '3g.png': 43,                     // Great Fire Wave alias
  'exevo-gran-mas-vis.png': 51,     // Rage of the Skies
  'exevo-gran-mas-flam.png': 48,    // Hell's Core
  'exori-gran-flam.png': 26,        // Strong Flame Strike
  '3h.png': 26,                     // Strong Flame Strike alias
  'exori-gran-vis.png': 29,         // Strong Energy Strike
  '4h.png': 29,                     // Strong Energy Strike alias
  'exori-max-flam.png': 27,         // Ultimate Flame Strike
  '3i.png': 27,                     // Ultimate Flame Strike alias
  'exori-max-vis.png': 30,          // Ultimate Energy Strike
  '4j.png': 30,                     // Ultimate Energy Strike alias
  'exori-gran-tera.png': 35,        // Strong Terra Strike
  '3l.png': 35,                     // Strong Terra Strike alias
  'exori-max-tera.png': 36,         // Ultimate Terra Strike
  '3j.png': 36,                     // Ultimate Terra Strike alias
  'exori-gran-frigo.png': 32,       // Strong Ice Strike
  '2h.png': 32,                     // Strong Ice Strike alias
  'exori-max-frigo.png': 33,        // Ultimate Ice Strike
  '2i.png': 33,                     // Ultimate Ice Strike alias
  'exevo-frigo-hur.png': 44,        // Ice Wave
  'exevo-gran-frigo-hur.png': 45,   // Ultimate Ice Wave
  '2g.png': 45,                     // Ultimate Ice Wave alias
  'exevo-tera-hur.png': 46,         // Terra Wave
  'exevo-gran-mas-tera.png': 47,    // Wrath of Nature
  'exevo-gran-mas-frigo.png': 49,   // Eternal Winter
};

console.log('Writing canonical spell icons to public/spells/...');
for (const [filename, iconIdx] of Object.entries(SORCERER_CANONICAL_ICONS)) {
  const iconData = extractedIcons[iconIdx];
  if (!iconData) {
    console.warn(`Icon index ${iconIdx} not found for ${filename}`);
    continue;
  }
  const destPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(destPath, iconData.png);
  console.log(`Wrote ${filename} (from icon #${iconIdx}, ${iconData.png.length} bytes)`);
}

console.log('Done extracting and updating all official Tibia 11 spell icons!');
