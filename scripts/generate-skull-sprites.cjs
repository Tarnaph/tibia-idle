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

// 12x12 classic Tibia skull pixel art template
// '.' = transparent
// 'B' = black border / shadow
// 'M' = main fill color
// 'H' = highlight / light color
// 'S' = shadow color
// 'E' = eye socket
// 'T' = teeth separator
const SKULL_MATRIX = [
  '....BBBB....',
  '..BBMMHHBB..',
  '.BMMMMHHHHB.',
  'BMMBEEHHBEHB',
  'BMMBEEHHBEHB',
  'BMMMMHHHHHHB',
  '.BMMMBBHHHB.',
  '..BMMBBHHB..',
  '..BMBMTMBB..',
  '..BMBMTMBB..',
  '..BBBBBBBB..',
  '............',
];

const SKULL_CONFIGS = {
  green: {
    main: [34, 197, 94, 255],     // #22c55e
    highlight: [134, 239, 172, 255],// #86efac
    shadow: [21, 128, 61, 255],    // #15803d
    border: [10, 40, 20, 255],     // dark green border
    eye: [5, 25, 10, 255],
    teeth: [15, 60, 30, 255],
  },
  yellow: {
    main: [234, 179, 8, 255],     // #eab308
    highlight: [254, 240, 138, 255],// #fef08a
    shadow: [161, 98, 7, 255],     // #a16207
    border: [60, 35, 5, 255],
    eye: [40, 20, 0, 255],
    teeth: [80, 45, 5, 255],
  },
  white: {
    main: [226, 232, 240, 255],   // #e2e8f0
    highlight: [255, 255, 255, 255],// #ffffff
    shadow: [148, 163, 184, 255],  // #94a3b8
    border: [30, 41, 59, 255],     // #1e293b
    eye: [15, 23, 42, 255],
    teeth: [51, 65, 85, 255],
  },
  red: {
    main: [239, 68, 68, 255],     // #ef4444
    highlight: [252, 165, 165, 255],// #fca5a5
    shadow: [153, 27, 27, 255],    // #991b1b
    border: [69, 10, 10, 255],
    eye: [40, 5, 5, 255],
    teeth: [120, 15, 15, 255],
  },
  black: {
    main: [38, 38, 38, 255],       // #262626
    highlight: [82, 82, 82, 255],  // #525252
    shadow: [10, 10, 10, 255],     // #0a0a0a
    border: [0, 0, 0, 255],
    eye: [239, 68, 68, 255],       // Glowing red eyes for Black Skull!
    teeth: [20, 20, 20, 255],
  },
  orange: {
    main: [249, 115, 22, 255],    // #f97316
    highlight: [253, 186, 116, 255],// #fdba74
    shadow: [194, 65, 12, 255],    // #c2410c
    border: [67, 20, 7, 255],
    eye: [40, 10, 0, 255],
    teeth: [124, 45, 18, 255],
  },
};

function generateSkullPng(type, scale = 1) {
  const config = SKULL_CONFIGS[type];
  if (!config) throw new Error('Unknown skull type: ' + type);

  const baseW = SKULL_MATRIX[0].length;
  const baseH = SKULL_MATRIX.length;
  const width = baseW * scale;
  const height = baseH * scale;
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < baseH; y += 1) {
    const row = SKULL_MATRIX[y];
    for (let x = 0; x < baseW; x += 1) {
      const char = row[x];
      let color = [0, 0, 0, 0]; // transparent default
      if (char === 'B') color = config.border;
      else if (char === 'M') color = config.main;
      else if (char === 'H') color = config.highlight;
      else if (char === 'S') color = config.shadow;
      else if (char === 'E') color = config.eye;
      else if (char === 'T') color = config.teeth;

      // Fill scale x scale block
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const px = x * scale + sx;
          const py = y * scale + sy;
          const offset = (py * width + px) * 4;
          rgba[offset] = color[0];
          rgba[offset + 1] = color[1];
          rgba[offset + 2] = color[2];
          rgba[offset + 3] = color[3];
        }
      }
    }
  }

  return encodeRgbaPng(width, height, rgba);
}

const outDir = path.resolve(__dirname, '../public/assets/skulls');
fs.mkdirSync(outDir, { recursive: true });

for (const type of Object.keys(SKULL_CONFIGS)) {
  // 1x scale (12x12)
  const png1x = generateSkullPng(type, 1);
  fs.writeFileSync(path.join(outDir, `skull-${type}.png`), png1x);
  
  // 2x scale (24x24) for high-dpi UI / modals
  const png2x = generateSkullPng(type, 2);
  fs.writeFileSync(path.join(outDir, `skull-${type}-2x.png`), png2x);

  console.log(`Generated skull-${type}.png (12x12 & 24x24)`);
}

console.log('All skull sprites generated successfully in public/assets/skulls');
