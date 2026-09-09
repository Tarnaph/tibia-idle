import { deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodeScanlines(width: number, height: number, rgba: Buffer): Buffer {
  const scanlineLength = width * 4 + 1;
  const scanlines = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * scanlineLength;
    scanlines[rowOffset] = 0;
    rgba.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return deflateSync(scanlines, { level: 9 });
}

export function encodeRgbaPng(width: number, height: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const idatData = encodeScanlines(width, height, rgba);

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function encodeRgbaApng(
  width: number,
  height: number,
  framesRgba: Buffer[],
  delayMs = 120,
): Buffer {
  if (framesRgba.length <= 1) {
    return encodeRgbaPng(width, height, framesRgba[0] ?? Buffer.alloc(width * height * 4));
  }

  const chunks: Buffer[] = [PNG_SIGNATURE];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  chunks.push(chunk('IHDR', ihdr));

  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(framesRgba.length, 0);
  actl.writeUInt32BE(0, 4); // 0 = infinite loop
  chunks.push(chunk('acTL', actl));

  let seq = 0;
  for (let i = 0; i < framesRgba.length; i += 1) {
    const fctl = Buffer.alloc(26);
    fctl.writeUInt32BE(seq, 0);
    seq += 1;
    fctl.writeUInt32BE(width, 4);
    fctl.writeUInt32BE(height, 8);
    fctl.writeUInt32BE(0, 12); // x_offset
    fctl.writeUInt32BE(0, 16); // y_offset
    fctl.writeUInt16BE(delayMs, 20); // delay_num
    fctl.writeUInt16BE(1000, 22);   // delay_den
    fctl[24] = 0; // APNG_DISPOSE_OP_NONE
    fctl[25] = 0; // APNG_BLEND_OP_SOURCE
    chunks.push(chunk('fcTL', fctl));

    const deflated = encodeScanlines(width, height, framesRgba[i]);
    if (i === 0) {
      chunks.push(chunk('IDAT', deflated));
    } else {
      const fdat = Buffer.alloc(4 + deflated.length);
      fdat.writeUInt32BE(seq, 0);
      seq += 1;
      deflated.copy(fdat, 4);
      chunks.push(chunk('fdAT', fdat));
    }
  }

  chunks.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

export function generateSparkleApng(
  width: number,
  height: number,
  baseRgba: Buffer,
  delayMs = 120,
): Buffer {
  let maxBri = 0;
  let hx = Math.floor(width / 2);
  let hy = Math.floor(height / 2);

  // Find the brightest highlight pixel on the bottle body
  const minY = Math.floor(height * 0.25);
  const maxY = Math.floor(height * 0.75);
  const minX = Math.floor(width * 0.25);
  const maxX = Math.floor(width * 0.75);

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const idx = (y * width + x) * 4;
      if (baseRgba[idx + 3] > 180) {
        const bri = baseRgba[idx] + baseRgba[idx + 1] + baseRgba[idx + 2];
        if (bri > maxBri) {
          maxBri = bri;
          hx = x;
          hy = y;
        }
      }
    }
  }

  const sparkleFrames: Buffer[] = [];
  for (let f = 0; f < 12; f += 1) {
    const buf = Buffer.from(baseRgba);
    if (f >= 3 && f <= 6) {
      const step = f - 3;
      const sparklePattern: Array<Array<[number, number, number]>> = [
        [[0, 0, 160]],
        [[0, 0, 255], [-1, 0, 180], [1, 0, 180], [0, -1, 180], [0, 1, 180]],
        [[0, 0, 255], [-1, -1, 140], [1, 1, 140], [-1, 1, 140], [1, -1, 140], [-2, 0, 100], [2, 0, 100], [0, -2, 100], [0, 2, 100]],
        [[0, 0, 140], [1, 1, 90]],
      ];
      for (const [dx, dy, bri] of sparklePattern[step] || []) {
        const px = hx + dx;
        const py = hy + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const pidx = (py * width + px) * 4;
          if (buf[pidx + 3] > 50) {
            buf[pidx] = Math.min(255, buf[pidx] + bri);
            buf[pidx + 1] = Math.min(255, buf[pidx + 1] + bri);
            buf[pidx + 2] = Math.min(255, buf[pidx + 2] + bri);
          }
        }
      }
    }
    sparkleFrames.push(buf);
  }

  return encodeRgbaApng(width, height, sparkleFrames, delayMs);
}

