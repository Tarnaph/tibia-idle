export interface TibiaSprFile {
  signature: number;
  count: number;
  byteLength: number;
  decode(spriteId: number): Buffer;
}

const SPRITE_SIZE = 32;

export function parseTibia860Spr(buffer: Buffer): TibiaSprFile {
  if (buffer.length < 6) throw new Error('SPR file is too small.');
  const signature = buffer.readUInt32LE(0);
  const count = buffer.readUInt16LE(4);
  const offsetTableEnd = 6 + count * 4;
  if (offsetTableEnd > buffer.length) throw new Error('SPR offset table exceeds the file length.');

  return {
    signature,
    count,
    byteLength: buffer.length,
    decode(spriteId: number): Buffer {
      if (spriteId === 0) return Buffer.alloc(SPRITE_SIZE * SPRITE_SIZE * 4);
      if (!Number.isInteger(spriteId) || spriteId < 0 || spriteId > count) {
        throw new Error(`SPR sprite id ${spriteId} is outside 1..${count}.`);
      }
      const address = buffer.readUInt32LE(6 + (spriteId - 1) * 4);
      const pixels = Buffer.alloc(SPRITE_SIZE * SPRITE_SIZE * 4);
      if (address === 0) return pixels;
      if (address + 5 > buffer.length) throw new Error(`SPR sprite ${spriteId} has an invalid address.`);

      const payloadSize = buffer.readUInt16LE(address + 3);
      let readOffset = address + 5;
      const payloadEnd = readOffset + payloadSize;
      if (payloadEnd > buffer.length) throw new Error(`SPR sprite ${spriteId} payload exceeds the file.`);
      let pixel = 0;

      while (readOffset < payloadEnd && pixel < SPRITE_SIZE * SPRITE_SIZE) {
        if (readOffset + 4 > payloadEnd) throw new Error(`SPR sprite ${spriteId} has a truncated RLE run.`);
        const transparentPixels = buffer.readUInt16LE(readOffset);
        const coloredPixels = buffer.readUInt16LE(readOffset + 2);
        readOffset += 4;
        pixel += transparentPixels;
        if (pixel + coloredPixels > SPRITE_SIZE * SPRITE_SIZE) {
          throw new Error(`SPR sprite ${spriteId} RLE exceeds 1024 pixels.`);
        }
        const colorBytes = coloredPixels * 3;
        if (readOffset + colorBytes > payloadEnd) {
          throw new Error(`SPR sprite ${spriteId} has truncated RGB data.`);
        }
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

      if (readOffset !== payloadEnd) {
        throw new Error(`SPR sprite ${spriteId} left ${payloadEnd - readOffset} undecoded payload byte(s).`);
      }
      return pixels;
    },
  };
}
