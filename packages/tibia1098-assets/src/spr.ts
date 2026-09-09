export interface TibiaSprFile {
  signature: number;
  count: number;
  byteLength: number;
  decode(spriteId: number): Buffer;
}

const SPRITE_SIZE = 32;

export function parseTibia1098Spr(buffer: Buffer): TibiaSprFile {
  if (buffer.length < 8) throw new Error('SPR file is too small.');
  const signature = buffer.readUInt32LE(0);
  const count = buffer.readUInt32LE(4);
  const headerOffset = 8;
  const offsetTableEnd = headerOffset + count * 4;
  if (offsetTableEnd > buffer.length) throw new Error('SPR offset table exceeds the file length.');

  return {
    signature,
    count,
    byteLength: buffer.length,
    decode(spriteId: number): Buffer {
      let realId = spriteId;
      if (realId === 0) return Buffer.alloc(SPRITE_SIZE * SPRITE_SIZE * 4);
      if (!Number.isInteger(realId) || realId < 0 || realId > count) {
        return Buffer.alloc(SPRITE_SIZE * SPRITE_SIZE * 4);
      }
      const address = buffer.readUInt32LE(headerOffset + (realId - 1) * 4);
      const pixels = Buffer.alloc(SPRITE_SIZE * SPRITE_SIZE * 4);
      if (address === 0) return pixels;
      if (address + 5 > buffer.length) return pixels;

      const payloadSize = buffer.readUInt16LE(address + 3);
      let readOffset = address + 5;
      const payloadEnd = readOffset + payloadSize;
      if (payloadEnd > buffer.length) return pixels;
      let pixel = 0;

      while (readOffset < payloadEnd && pixel < SPRITE_SIZE * SPRITE_SIZE) {
        if (readOffset + 4 > payloadEnd) break;
        const transparentPixels = buffer.readUInt16LE(readOffset);
        const coloredPixels = buffer.readUInt16LE(readOffset + 2);
        readOffset += 4;
        pixel += transparentPixels;
        if (pixel + coloredPixels > SPRITE_SIZE * SPRITE_SIZE) break;

        const colorBytes = coloredPixels * 3;
        if (readOffset + colorBytes > payloadEnd) break;

        for (let index = 0; index < coloredPixels; index += 1) {
          const target = pixel * 4;
          pixels[target] = buffer[readOffset];
          pixels[target + 1] = buffer[readOffset + 1];
          pixels[target + 2] = buffer[readOffset + 2];
          pixels[target + 3] = 0xff;
          readOffset += 3;
          pixel += 1;
        }
      }

      return pixels;
    },
  };
}

// Alias for backwards compatibility
