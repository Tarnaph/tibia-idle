const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG encoder helper
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
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
  if (rgba.length !== width * height * 4) throw new Error('RGBA buffer unexpected length: ' + rgba.length + ' vs ' + (width * height * 4));
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
    pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function unfilterPng(buffer) {
  let offset = 8;
  let width = 0, height = 0;
  const idatChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') break;
    offset += 12 + length;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = width * bpp;
  const rgba = Buffer.alloc(width * height * 4);
  let srcPos = 0;

  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    const rowStart = y * stride;
    const priorStart = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = decompressed[srcPos++];
      const left = x >= bpp ? rgba[rowStart + x - bpp] : 0;
      const above = y > 0 ? rgba[priorStart + x] : 0;
      const leftAbove = (y > 0 && x >= bpp) ? rgba[priorStart + x - bpp] : 0;
      let val = rawByte;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = (rawByte + left) & 0xff;
      else if (filter === 2) val = (rawByte + above) & 0xff;
      else if (filter === 3) val = (rawByte + Math.floor((left + above) / 2)) & 0xff;
      else if (filter === 4) {
        const p = left + above - leftAbove;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - above);
        const pc = Math.abs(p - leftAbove);
        let pr = leftAbove;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = above;
        val = (rawByte + pr) & 0xff;
      }
      rgba[rowStart + x] = val;
    }
  }
  return { width, height, rgba };
}

function cropRgba(srcRgba, srcW, srcH, cropX, cropY, cropW, cropH) {
  const dest = Buffer.alloc(cropW * cropH * 4);
  for (let dy = 0; dy < cropH; dy++) {
    const sy = cropY + dy;
    if (sy < 0 || sy >= srcH) continue;
    for (let dx = 0; dx < cropW; dx++) {
      const sx = cropX + dx;
      if (sx < 0 || sx >= srcW) continue;
      const srcIdx = (sy * srcW + sx) * 4;
      const destIdx = (dy * cropW + dx) * 4;
      dest[destIdx] = srcRgba[srcIdx];
      dest[destIdx + 1] = srcRgba[srcIdx + 1];
      dest[destIdx + 2] = srcRgba[srcIdx + 2];
      dest[destIdx + 3] = srcRgba[srcIdx + 3];
    }
  }
  return dest;
}

// 1. EXTRACT SPELL ICONS FROM CIPSOFT SHEET
const spellSheetPath = 'C:/Users/desig/.gemini/antigravity-ide/brain/897680f6-8d91-4c69-aa75-f4c650caea80/.user_uploaded/media_1788442953441.png';
const potionsSheetPath = 'C:/Users/desig/.gemini/antigravity-ide/brain/897680f6-8d91-4c69-aa75-f4c650caea80/.user_uploaded/media_1788442984277.png';

const spellsDir = path.resolve('public/spells');
const potionsDir = path.resolve('public/potions');
fs.mkdirSync(spellsDir, { recursive: true });
fs.mkdirSync(potionsDir, { recursive: true });

console.log('Decoding official CipSoft Spell Icons sheet...');
const spellSheet = unfilterPng(fs.readFileSync(spellSheetPath));

// Spell names mapping: [row (0-4)][col (0-11)]
const spellNames = [
  // Row 1 (A-L)
  ['exura', 'exura-gran', 'exura-sio', 'exura-gran-mas-res', 'exana-mort', 'exura-san', 'exura-vita', 'exeta-res', 'party-buff', 'exana-pox', 'exana-vis', 'exana-kor'],
  // Row 2 (A-L)
  ['exana-flam', 'exana-frigo', 'utamo-vita', 'utana-vid', 'exori-mas', 'exori-frigo', 'exori-hur', 'exori', 'exori-gran', 'utito-tempo', 'exori-ico', 'exori-min'],
  // Row 3 (A-L)
  ['physical-strike', 'exori-flam', 'exevo-flam-hur', 'exevo-gran-mas-flam', 'exori-mort', 'sd-rune', 'death-wave', 'ice-strike', 'exevo-frigo-hur', 'exevo-gran-mas-frigo', 'exori-tera', 'exevo-tera-hur'],
  // Row 4 (A-L)
  ['exevo-gran-mas-tera', 'undead-legion', 'exori-san', 'exevo-mas-san', 'exori-vis', 'exevo-vis-hur', 'exevo-gran-mas-vis', 'fire-storm', 'ice-storm', 'energy-storm', 'utevo-res', 'poison-storm'],
  // Row 5 (A-L)
  ['soul-fire', 'utani-hur', 'utani-gran-hur', 'energy-beam', 'adori-blank', 'hmm-rune', 'gfb-rune', 'explosion-rune', 'fireball-rune', 'cure-curse', 'utani-tempo-hur', 'ultimate-ice-wave']
];

let extractedSpellsCount = 0;
const iconSize = 34; // 34x34 px

for (let r = 0; r < 5; r++) {
  const y = 84 + r * 48;
  for (let c = 0; c < 12; c++) {
    const x = 38 + c * 48;
    const name = spellNames[r]?.[c] || `spell-${r+1}${String.fromCharCode(97+c)}`;
    const cropped = cropRgba(spellSheet.rgba, spellSheet.width, spellSheet.height, x, y, iconSize, iconSize);
    const png = encodeRgbaPng(iconSize, iconSize, cropped);
    fs.writeFileSync(path.join(spellsDir, `${name}.png`), png);
    // Also save grid code (e.g. 1a.png, 2h.png)
    fs.writeFileSync(path.join(spellsDir, `${r+1}${String.fromCharCode(97+c)}.png`), png);
    extractedSpellsCount++;
  }
}
console.log(`Successfully extracted ${extractedSpellsCount} official spell icons to public/spells/!`);

// 2. EXTRACT POTIONS FROM POTIONS SHEET
console.log('Decoding official Potions sheet...');
const potionSheet = unfilterPng(fs.readFileSync(potionsSheetPath));

// Potion bounding boxes from scan:
const potionBoxes = [
  { name: 'small', x: 33, y: 52, w: 19, h: 17 },
  { name: 'strong', x: 59, y: 52, w: 19, h: 17 },
  { name: 'great', x: 86, y: 50, w: 23, h: 20 },
  { name: 'ultimate', x: 115, y: 47, w: 31, h: 25 },
  { name: 'supreme', x: 154, y: 42, w: 31, h: 31 },
];

function makeTransparentAndCenter(srcRgba, srcW, srcH, box, targetSize = 32) {
  const dest = Buffer.alloc(targetSize * targetSize * 4); // all zeros = transparent
  const offsetX = Math.floor((targetSize - box.w) / 2);
  const offsetY = Math.floor((targetSize - box.h) / 2);

  for (let dy = 0; dy < box.h; dy++) {
    const sy = box.y + dy;
    for (let dx = 0; dx < box.w; dx++) {
      const sx = box.x + dx;
      const srcIdx = (sy * srcW + sx) * 4;
      const red = srcRgba[srcIdx];
      const grn = srcRgba[srcIdx + 1];
      const blu = srcRgba[srcIdx + 2];

      // If near white (r > 245, g > 245, b > 245), leave transparent
      if (red > 245 && grn > 245 && blu > 245) continue;

      const destX = offsetX + dx;
      const destY = offsetY + dy;
      const destIdx = (destY * targetSize + destX) * 4;
      dest[destIdx] = red;
      dest[destIdx + 1] = grn;
      dest[destIdx + 2] = blu;
      dest[destIdx + 3] = 255;
    }
  }
  return dest;
}

// Tint helper for Health (Red) and Mana (Blue) while preserving Spirit (Original Purple)
function tintPotion(rgba, targetSize, type) {
  const dest = Buffer.from(rgba);
  if (type === 'spirit') return dest; // Keep original purple!

  for (let i = 0; i < targetSize * targetSize; i++) {
    const idx = i * 4;
    const a = dest[idx + 3];
    if (a === 0) continue;
    const r = dest[idx];
    const g = dest[idx + 1];
    const b = dest[idx + 2];

    // Don't tint golden/cork bands (gold has r > 150, g > 100, b < 60)
    const isGold = (r > 150 && g > 90 && b < 60) || (r > 200 && g > 150);
    if (isGold) continue;

    // Dark outlines (r < 40, g < 40, b < 40)
    if (r < 40 && g < 40 && b < 40) continue;

    if (type === 'health') {
      // Shift purple to brilliant crimson red
      dest[idx] = Math.min(255, Math.floor(Math.max(r, b) * 1.25));
      dest[idx + 1] = Math.floor(g * 0.4);
      dest[idx + 2] = Math.floor(b * 0.25);
    } else if (type === 'mana') {
      // Shift purple to brilliant sapphire blue
      dest[idx] = Math.floor(r * 0.25);
      dest[idx + 1] = Math.floor(Math.max(g, r * 0.4) * 0.9);
      dest[idx + 2] = Math.min(255, Math.floor(Math.max(r, b) * 1.3));
    }
  }
  return dest;
}

const potionCategories = ['health', 'mana', 'spirit'];
let extractedPotionsCount = 0;

potionBoxes.forEach((box) => {
  const baseRgba = makeTransparentAndCenter(potionSheet.rgba, potionSheet.width, potionSheet.height, box, 32);

  potionCategories.forEach((cat) => {
    const tinted = tintPotion(baseRgba, 32, cat);
    const png = encodeRgbaPng(32, 32, tinted);
    const fileName = `${box.name}-${cat}-potion.png`;
    fs.writeFileSync(path.join(potionsDir, fileName), png);
    extractedPotionsCount++;
  });
});

// Create canonical aliases matching domain item IDs
const copyAlias = (src, dest) => {
  fs.copyFileSync(path.join(potionsDir, src), path.join(potionsDir, dest));
};

copyAlias('small-health-potion.png', 'health-potion.png');
copyAlias('small-mana-potion.png', 'mana-potion.png');
copyAlias('ultimate-spirit-potion.png', 'spirit-potion.png');

console.log(`Successfully extracted ${extractedPotionsCount} official potion variants to public/potions/!`);
