import type {
  AppearanceCategory,
  AppearanceFrameGroup,
  ThingDisplacement,
  TibiaAppearance,
  TibiaDatFile,
} from './types.ts';

const DAT_LAST_ATTRIBUTE = 0xff;

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

  i8(): number {
    this.ensure(1);
    const value = this.buffer.readInt8(this.offset);
    this.offset += 1;
    return value;
  }

  i32(): number {
    this.ensure(4);
    const value = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  str(): string {
    const len = this.u16();
    this.ensure(len);
    const s = this.buffer.toString('utf8', this.offset, this.offset + len);
    this.offset += len;
    return s;
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

function readAttributes1098(
  cursor: BinaryCursor,
  category: AppearanceCategory,
  id: number
): { attributes: number[]; displacement?: ThingDisplacement } {
  const attributes: number[] = [];
  let displacement: ThingDisplacement | undefined;

  while (cursor.remaining > 0) {
    const rawAttr = cursor.u8();
    if (rawAttr === DAT_LAST_ATTRIBUTE) return { attributes, displacement };

    let attr = rawAttr;
    if (attr === 16) {
      attr = 253; // ThingAttrNoMoveAnimation
    } else if (attr > 16) {
      attr -= 1;
    }
    attributes.push(attr);

    if (attr === 24) {
      // ThingAttrDisplacement
      const x = cursor.u16();
      const y = cursor.u16();
      displacement = { x, y };
    } else if (attr === 21) {
      // ThingAttrLight
      cursor.u16();
      cursor.u16();
    } else if (attr === 33) {
      // ThingAttrMarket
      cursor.u16(); // category
      cursor.u16(); // tradeAs
      cursor.u16(); // showAs
      cursor.str(); // name
      cursor.u16(); // restrictVocation
      cursor.u16(); // requiredLevel
    } else if (attr === 25) {
      // ThingAttrElevation
      cursor.u16();
    } else if (
      attr === 34 || // ThingAttrUsable / DefaultAction
      attr === 0 ||  // ThingAttrGround (speed)
      attr === 8 ||  // ThingAttrWritable (maxLen)
      attr === 9 ||  // ThingAttrWritableOnce (maxLen)
      attr === 28 || // ThingAttrMinimapColor
      attr === 32 || // ThingAttrCloth
      attr === 29    // ThingAttrLensHelp
    ) {
      cursor.u16();
    }
  }
  return { attributes, displacement };
}

function readAppearance1098(
  cursor: BinaryCursor,
  category: AppearanceCategory,
  id: number,
): TibiaAppearance {
  const { attributes, displacement } = readAttributes1098(cursor, category, id);

  if (category === 'creature') {
    const groupCount = cursor.u8();
    const frameGroups: AppearanceFrameGroup[] = [];

    for (let g = 0; g < groupCount; g += 1) {
      const frameGroupType = cursor.u8();
      const rawWidth = cursor.u8();
      const rawHeight = cursor.u8();
      let exactSize = 32;
      if (rawWidth > 1 || rawHeight > 1) {
        exactSize = cursor.u8();
      }
      const width = Math.max(1, rawWidth);
      const height = Math.max(1, rawHeight);
      const layers = Math.max(1, cursor.u8());
      const patternX = Math.max(1, cursor.u8());
      const patternY = Math.max(1, cursor.u8());
      const patternZ = Math.max(1, cursor.u8());
      const frames = Math.max(1, cursor.u8());

      if (frames > 1) {
        cursor.u8(); // async
        cursor.i32(); // loopCount
        cursor.i8(); // startPhase
        for (let p = 0; p < frames; p += 1) {
          cursor.u32(); // minDuration
          cursor.u32(); // maxDuration
        }
      }

      const totalSprites = width * height * layers * patternX * patternY * patternZ * frames;
      const spriteIds: number[] = [];
      for (let s = 0; s < totalSprites; s += 1) {
        spriteIds.push(cursor.u32());
      }

      frameGroups.push({
        frameGroupType,
        width,
        height,
        exactSize,
        layers,
        patternX,
        patternY,
        patternZ,
        frames,
        spriteIds,
      });
    }

    // Default primary group: Moving (1) if available, otherwise Idle (0) or first
    const primary = frameGroups.find((grp) => grp.frameGroupType === 1) ?? frameGroups[0] ?? {
      frameGroupType: 0,
      width: 1,
      height: 1,
      exactSize: 32,
      layers: 1,
      patternX: 4,
      patternY: 1,
      patternZ: 1,
      frames: 1,
      spriteIds: [],
    };

    return {
      id,
      category,
      attributes,
      displacement,
      width: primary.width,
      height: primary.height,
      exactSize: primary.exactSize,
      layers: primary.layers,
      patternX: primary.patternX,
      patternY: primary.patternY,
      patternZ: primary.patternZ,
      frames: primary.frames,
      spriteIds: primary.spriteIds,
      frameGroups,
    };
  }

  // category === 'item' | 'effect' | 'missile'
  const rawWidth = cursor.u8();
  const rawHeight = cursor.u8();
  let exactSize = 32;
  if (rawWidth > 1 || rawHeight > 1) {
    exactSize = cursor.u8();
  }
  const width = Math.max(1, rawWidth);
  const height = Math.max(1, rawHeight);
  const layers = Math.max(1, cursor.u8());
  const patternX = Math.max(1, cursor.u8());
  const patternY = Math.max(1, cursor.u8());
  const patternZ = Math.max(1, cursor.u8());
  const frames = Math.max(1, cursor.u8());

  if (frames > 1 && category !== 'missile') {
    cursor.u8(); // async
    cursor.i32(); // loopCount
    cursor.i8(); // startPhase
    for (let p = 0; p < frames; p += 1) {
      cursor.u32(); // minDuration
      cursor.u32(); // maxDuration
    }
  }

  const spriteCount = width * height * layers * patternX * patternY * patternZ * frames;
  const spriteIds: number[] = [];
  for (let s = 0; s < spriteCount; s += 1) {
    spriteIds.push(cursor.u32());
  }

  return {
    id,
    category,
    attributes,
    displacement,
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

export function parseTibia1098Dat(buffer: Buffer): TibiaDatFile {
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
      if (cursor.remaining <= 0) {
        throw new Error(`Unexpected end of DAT buffer while reading ${category} ${id}`);
      }
      try {
        appearances[category].set(id, readAppearance1098(cursor, category, id));
      } catch (err: any) {
        throw new Error(`Failed reading ${category} ${id} at offset ${cursor.offset}: ${err.message}`);
      }
    }
  }

  return { signature, byteLength: buffer.length, counts, appearances, parsedBytes: cursor.offset };
}

export function spriteIndex(
  appearance: { width: number; height: number; layers: number; patternX: number; patternY: number; patternZ: number; frames: number },
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
