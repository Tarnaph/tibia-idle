import type {
  AppearanceCategory,
  TibiaAppearance,
  TibiaDatFile,
} from './types.ts';

const DAT_LAST_ATTRIBUTE = 0xff;
const U16_ATTRIBUTES = new Set([0, 8, 9, 25, 28, 29, 32]);
const U32_ATTRIBUTES = new Set([21, 24]);

class BinaryCursor {
  offset = 0;
  private readonly buffer: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  get remaining(): number {
    return this.buffer.length - this.offset;
  }

  u8(): number {
    this.ensure(1);
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  u16(): number {
    this.ensure(2);
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  u32(): number {
    this.ensure(4);
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  skip(bytes: number): void {
    this.ensure(bytes);
    this.offset += bytes;
  }

  private ensure(bytes: number): void {
    if (this.offset + bytes > this.buffer.length) {
      throw new Error(`Unexpected DAT end at byte ${this.offset}; requested ${bytes} more byte(s).`);
    }
  }
}

function readAttributes(cursor: BinaryCursor, category: AppearanceCategory, id: number): number[] {
  const attributes: number[] = [];
  for (let count = 0; count < 256; count += 1) {
    const attribute = cursor.u8();
    if (attribute === DAT_LAST_ATTRIBUTE) return attributes;
    if (attribute > 32) {
      throw new Error(`Unsupported Tibia 8.60 DAT attribute ${attribute} at ${category} ${id}.`);
    }
    attributes.push(attribute);
    if (U16_ATTRIBUTES.has(attribute)) cursor.skip(2);
    if (U32_ATTRIBUTES.has(attribute)) cursor.skip(4);
  }
  throw new Error(`DAT attributes did not terminate for ${category} ${id}.`);
}

function readAppearance(
  cursor: BinaryCursor,
  category: AppearanceCategory,
  id: number,
): TibiaAppearance {
  const attributes = readAttributes(cursor, category, id);
  const width = cursor.u8();
  const height = cursor.u8();
  if (width < 1 || height < 1 || width > 4 || height > 4) {
    throw new Error(`Invalid DAT dimensions ${width}x${height} at ${category} ${id}.`);
  }
  const exactSize = width > 1 || height > 1 ? cursor.u8() : 32;
  const layers = cursor.u8();
  const patternX = cursor.u8();
  const patternY = cursor.u8();
  const patternZ = cursor.u8();
  const frames = cursor.u8();
  const factors = [layers, patternX, patternY, patternZ, frames];
  if (factors.some((factor) => factor < 1)) {
    throw new Error(`Invalid zero DAT sprite dimension at ${category} ${id}.`);
  }
  const spriteCount = width * height * layers * patternX * patternY * patternZ * frames;
  if (spriteCount > 4096) {
    throw new Error(`Appearance ${category} ${id} references ${spriteCount} sprites.`);
  }
  const spriteIds = Array.from({ length: spriteCount }, () => cursor.u16());
  return {
    id,
    category,
    attributes,
    width,
    height,
    exactSize,
    layers,
    patternX,
    patternY,
    patternZ,
    frames,
    spriteIds,
  };
}

export function parseTibia860Dat(buffer: Buffer): TibiaDatFile {
  const cursor = new BinaryCursor(buffer);
  const signature = cursor.u32();
  const counts: Record<AppearanceCategory, number> = {
    item: cursor.u16(),
    creature: cursor.u16(),
    effect: cursor.u16(),
    missile: cursor.u16(),
  };
  const appearances: TibiaDatFile['appearances'] = {
    item: new Map(),
    creature: new Map(),
    effect: new Map(),
    missile: new Map(),
  };

  const ranges: Array<[AppearanceCategory, number, number]> = [
    ['item', 100, counts.item],
    ['creature', 1, counts.creature],
    ['effect', 1, counts.effect],
    ['missile', 1, counts.missile],
  ];
  for (const [category, firstId, lastId] of ranges) {
    for (let id = firstId; id <= lastId; id += 1) {
      appearances[category].set(id, readAppearance(cursor, category, id));
    }
  }

  if (cursor.remaining !== 0) {
    throw new Error(`DAT parser stopped at ${cursor.offset} with ${cursor.remaining} trailing byte(s).`);
  }
  return { signature, byteLength: buffer.length, counts, appearances, parsedBytes: cursor.offset };
}

export function spriteIndex(
  appearance: TibiaAppearance,
  coordinates: { width: number; height: number; layer: number; x: number; y: number; z: number; frame: number },
): number {
  const { width, height, layer, x, y, z, frame } = coordinates;
  return ((((((frame % appearance.frames) * appearance.patternZ + z)
    * appearance.patternY + y)
    * appearance.patternX + x)
    * appearance.layers + layer)
    * appearance.height + height)
    * appearance.width + width;
}
