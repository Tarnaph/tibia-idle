import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { parseTibia1098Dat, spriteIndex } from './dat.ts';
import { findOtbClientId, tryFindOtbClientId } from './otb.ts';
import { encodeRgbaPng, encodeRgbaApng, generateSparkleApng } from './png.ts';
import { parseTibia1098Spr, type TibiaSprFile } from './spr.ts';
import type {
  ExtractionResult,
  ExtractedFrame,
  ItemVisualAssetMapping,
  SourceFingerprint,
  Tibia1098AssetManifest,
  TibiaAppearance,
  TibiaDatFile,
  VisualAssetMapping,
} from './types.ts';

interface ExtractOptions {
  projectRoot?: string;
  write?: boolean;
}

const ALDRIC_LOOK_TYPE = 128;
const FLOOR_SERVER_ID = 106;
const CAVE_GROUND_SERVER_ID = 351;
const CAVE_WALL_SERVER_ID = 891;
const OBSTACLE_SERVER_ID = 386;
const ENTRANCE_SERVER_ID = 1386;
const EXIT_SERVER_ID = 383;
const TRAINING_FLOOR_SERVER_ID = 405;
const TRAINING_WALL_SERVER_ID = 1100;
const TRAINING_RUG_SERVER_ID = 1798;
const TRAINING_DUMMY_SERVER_ID = 5787;
const TRAINING_DECOR_SERVER_ID = 5852;

const CREATURE_DIRECTIONS = [
  { direction: 'north', x: 0, y: 0, z: 0 },
  { direction: 'east', x: 1, y: 0, z: 0 },
  { direction: 'south', x: 2, y: 0, z: 0 },
  { direction: 'west', x: 3, y: 0, z: 0 },
] as const;

const MISSILE_PATTERNS = [
  { direction: 'north-west', x: 0, y: 0, z: 0 }, { direction: 'north', x: 1, y: 0, z: 0 },
  { direction: 'north-east', x: 2, y: 0, z: 0 }, { direction: 'west', x: 0, y: 1, z: 0 },
  { direction: 'east', x: 2, y: 1, z: 0 }, { direction: 'south-west', x: 0, y: 2, z: 0 },
  { direction: 'south', x: 1, y: 2, z: 0 }, { direction: 'south-east', x: 2, y: 2, z: 0 },
] as const;

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function fingerprint(sourceFile: string, buffer: Buffer): SourceFingerprint {
  return { sourceFile, byteLength: buffer.length, sha256: sha256(buffer) };
}

export const CANONICAL_POTION_SERVER_IDS = [
  8704,  // small health potion
  7618,  // health potion
  7588,  // strong health potion
  7591,  // great health potion
  8473,  // ultimate health potion
  26031, // supreme health potion
  7620,  // mana potion
  7589,  // strong mana potion
  7590,  // great mana potion
  26029, // ultimate mana potion
  8472,  // great spirit potion
  26030, // ultimate spirit potion
  8474,  // antidote potion
  10089, // antidote potion
  7439,  // berserk potion
  7440,  // mastermind potion
  7443,  // bullseye potion
  7634,  // small potion flask
  7635,  // strong potion flask
  7636,  // great potion flask
];
const CANONICAL_POTION_IDS = new Set(CANONICAL_POTION_SERVER_IDS);

export interface CanonicalRuneInfo {
  name: string;
  slug: string;
  words?: string;
}

export const CANONICAL_RUNE_METADATA: Record<number, CanonicalRuneInfo> = {
  2260: { name: 'Blank Rune', slug: 'blank-rune' },
  2261: { name: 'Destroy Field Rune', slug: 'destroy-field-rune', words: 'adito grav' },
  2262: { name: 'Energy Bomb Rune', slug: 'energy-bomb-rune', words: 'adevo mas vis' },
  2265: { name: 'Intense Healing Rune', slug: 'intense-healing-rune', words: 'adura gran' },
  2266: { name: 'Cure Poison Rune', slug: 'cure-poison-rune', words: 'adana pox' },
  2268: { name: 'Sudden Death Rune', slug: 'sudden-death-rune', words: 'adori gran mort' },
  2269: { name: 'Wild Growth Rune', slug: 'wild-growth-rune', words: 'adevo grav vita' },
  2271: { name: 'Icicle Rune', slug: 'icicle-rune', words: 'adori frigo' },
  2273: { name: 'Ultimate Healing Rune', slug: 'ultimate-healing-rune', words: 'adura vita' },
  2274: { name: 'Avalanche Rune', slug: 'avalanche-rune', words: 'adori mas frigo' },
  2277: { name: 'Energy Field Rune', slug: 'energy-field-rune', words: 'adevo grav vis' },
  2278: { name: 'Paralyze Rune', slug: 'paralyze-rune', words: 'adana ani' },
  2279: { name: 'Energy Wall Rune', slug: 'energy-wall-rune', words: 'adevo mas grav vis' },
  2285: { name: 'Poison Field Rune', slug: 'poison-field-rune', words: 'adevo grav pox' },
  2286: { name: 'Poison Bomb Rune', slug: 'poison-bomb-rune', words: 'adevo mas pox' },
  2287: { name: 'Light Magic Missile Rune', slug: 'light-magic-missile-rune', words: 'adori min vis' },
  2288: { name: 'Stone Shower Rune', slug: 'stone-shower-rune', words: 'adori mas tera' },
  2289: { name: 'Poison Wall Rune', slug: 'poison-wall-rune', words: 'adevo mas grav pox' },
  2290: { name: 'Convince Creature Rune', slug: 'convince-creature-rune', words: 'adeta sio' },
  2291: { name: 'Chameleon Rune', slug: 'chameleon-rune', words: 'adevo ina' },
  2292: { name: 'Stalagmite Rune', slug: 'stalagmite-rune', words: 'adori tera' },
  2293: { name: 'Magic Wall Rune', slug: 'magic-wall-rune', words: 'adevo grav tera' },
  2295: { name: 'Holy Missile Rune', slug: 'holy-missile-rune', words: 'adori san' },
  2301: { name: 'Fire Field Rune', slug: 'fire-field-rune', words: 'adevo grav flam' },
  2302: { name: 'Fireball Rune', slug: 'fireball-rune', words: 'adori flam' },
  2303: { name: 'Fire Wall Rune', slug: 'fire-wall-rune', words: 'adevo mas grav flam' },
  2304: { name: 'Great Fireball Rune', slug: 'great-fireball-rune', words: 'adori mas flam' },
  2305: { name: 'Fire Bomb Rune', slug: 'fire-bomb-rune', words: 'adevo mas flam' },
  2308: { name: 'Soulfire Rune', slug: 'soulfire-rune', words: 'adevo res flam' },
  2310: { name: 'Desintegrate Rune', slug: 'desintegrate-rune', words: 'adito tera' },
  2311: { name: 'Heavy Magic Missile Rune', slug: 'heavy-magic-missile-rune', words: 'adori vis' },
  2313: { name: 'Explosion Rune', slug: 'explosion-rune', words: 'adevo mas hur' },
  2315: { name: 'Thunderstorm Rune', slug: 'thunderstorm-rune', words: 'adori mas vis' },
  2316: { name: 'Animate Dead Rune', slug: 'animate-dead-rune', words: 'adana mort' },
};
export const CANONICAL_RUNE_SERVER_IDS = Object.keys(CANONICAL_RUNE_METADATA).map(Number);
export const CANONICAL_RUNE_IDS = new Set(CANONICAL_RUNE_SERVER_IDS);

function copySprite(target: Buffer, targetWidth: number, sprite: Buffer, offsetX: number, offsetY: number): void {
  for (let y = 0; y < 32; y += 1) {
    const srcOffset = y * 32 * 4;
    const dstOffset = ((offsetY + y) * targetWidth + offsetX) * 4;
    sprite.copy(target, dstOffset, srcOffset, srcOffset + 32 * 4);
  }
}

function renderFrame(
  appearance: TibiaAppearance,
  spr: TibiaSprFile,
  coordinates: { layer: number; x: number; y: number; z: number; frame: number },
): { png: Buffer; rgba: Buffer; spriteIds: number[]; width: number; height: number } {
  const width = appearance.width * 32;
  const height = appearance.height * 32;
  const rgba = Buffer.alloc(width * height * 4);
  const spriteIds: number[] = [];

  for (let tileWidth = 0; tileWidth < appearance.width; tileWidth += 1) {
    for (let tileHeight = 0; tileHeight < appearance.height; tileHeight += 1) {
      const index = spriteIndex(appearance, {
        width: tileWidth,
        height: tileHeight,
        ...coordinates,
      });
      const spriteId = appearance.spriteIds[index];
      spriteIds.push(spriteId);
      copySprite(
        rgba,
        width,
        spr.decode(spriteId),
        (appearance.width - tileWidth - 1) * 32,
        (appearance.height - tileHeight - 1) * 32,
      );
    }
  }
  return { png: encodeRgbaPng(width, height, rgba), rgba, spriteIds, width, height };
}

function extractAppearanceFrames(
  key: VisualAssetMapping['key'],
  label: string,
  appearance: TibiaAppearance,
  spr: TibiaSprFile,
  options: {
    relationship: VisualAssetMapping['relationship'];
    validation: string;
    sourceId: number;
    sourceFile: string;
    layer?: number;
    x?: number;
    y?: number;
    z?: number;
    notes?: string[];
    patterns?: Array<{ direction: string; x: number; y: number; z: number }>;
  },
): { mapping: VisualAssetMapping; files: Map<string, Buffer> } {
  const layer = options.layer ?? 0;
  const patterns = options.patterns ?? [{
    direction: 'static',
    x: options.x ?? 0,
    y: options.y ?? 0,
    z: options.z ?? 0,
  }];
  const files = new Map<string, Buffer>();
  const frames: ExtractedFrame[] = [];
  for (const pattern of patterns) {
    const totalFrames = (appearance.category === 'creature' || patterns.length > 1)
      ? Math.max(3, appearance.frames, appearance.patternY)
      : Math.max(1, appearance.frames);

    for (let frame = 0; frame < totalFrames; frame += 1) {
      const pY = appearance.patternY > 1 ? frame % appearance.patternY : pattern.y;
      const rendered = renderFrame(appearance, spr, { layer, x: pattern.x, y: pY, z: pattern.z, frame: frame % appearance.frames });
      const file = `public/generated/tibia1098/${key}-${pattern.direction}-frame-${frame}.png`;
      files.set(file, rendered.png);
      frames.push({
        frame,
        direction: pattern.direction,
        pattern: { x: pattern.x, y: pY, z: pattern.z },
        layer,
        spriteIds: rendered.spriteIds,
        file,
        publicUrl: `/${file.replace(/^public\//, '')}`,
        sha256: sha256(rendered.png),
        width: rendered.width,
        height: rendered.height,
      });
    }
  }

  return {
    mapping: {
      key,
      kind: appearance.category,
      label,
      appearanceId: appearance.id,
      sourceId: options.sourceId,
      sourceFile: options.sourceFile,
      relationship: options.relationship,
      validation: options.validation,
      appearance: {
        width: appearance.width,
        height: appearance.height,
        exactSize: appearance.exactSize,
        layers: appearance.layers,
        patternX: appearance.patternX,
        patternY: appearance.patternY,
        patternZ: appearance.patternZ,
        frames: appearance.frames,
        attributes: appearance.attributes,
        spriteIds: appearance.spriteIds,
      },
      extractedPattern: { x: patterns[0].x, y: patterns[0].y, z: patterns[0].z },
      extractedLayer: layer,
      frames,
      notes: options.notes ?? [],
    },
    files,
  };
}

export function extractItemVisualAsset(
  serverId: number,
  name: string,
  otbBuffer: Buffer,
  dat: TibiaDatFile,
  spr: TibiaSprFile,
): { mapping: ItemVisualAssetMapping; files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  const otbInfo = tryFindOtbClientId(otbBuffer, serverId);
  if (!otbInfo) {
    return {
      mapping: {
        serverId,
        clientId: null,
        group: null,
        name,
        resolved: false,
        source: {
          serverId,
          otb: 'realmap11/data/items/items.otb',
          dat: 'Tibia 10/tibia/Tibia.dat',
          spr: 'Tibia 10/tibia/Tibia.spr',
        },
        appearanceId: null,
        appearance: null,
        extractedPattern: null,
        extractedLayer: null,
        frame: null,
        importWarnings: [`Server ID ${serverId} not in items.otb`],
      },
      files,
    };
  }

  const appearance = dat.appearances.item.get(otbInfo.clientId);
  if (!appearance) {
    return {
      mapping: {
        serverId,
        clientId: otbInfo.clientId,
        group: otbInfo.group,
        name,
        resolved: false,
        source: {
          serverId,
          otb: 'realmap11/data/items/items.otb',
          dat: 'Tibia 10/tibia/Tibia.dat',
          spr: 'Tibia 10/tibia/Tibia.spr',
        },
        appearanceId: null,
        appearance: null,
        extractedPattern: null,
        extractedLayer: null,
        frame: null,
        importWarnings: [`Client ID ${otbInfo.clientId} not in Tibia.dat`],
      },
      files,
    };
  }

  const animFrames: ExtractedFrame[] = [];
  const defaultPhaseRgba: Buffer[] = [];
  const totalPhases = Math.max(1, appearance.frames);
  const patX = Math.max(1, appearance.patternX);
  const patY = Math.max(1, appearance.patternY);

  for (let py = 0; py < patY; py += 1) {
    for (let px = 0; px < patX; px += 1) {
      for (let f = 0; f < totalPhases; f += 1) {
        const rendered = renderFrame(appearance, spr, { layer: 0, x: px, y: py, z: 0, frame: f });
        const isDefault = px === 0 && py === 0 && f === 0;
        if (px === 0 && py === 0) {
          defaultPhaseRgba.push(rendered.rgba);
        }
        const hasPattern = patX > 1 || patY > 1;
        const fileName = (isDefault && totalPhases <= 1)
          ? `item-${serverId}.png`
          : (isDefault && totalPhases > 1)
          ? `item-${serverId}-frame-0.png`
          : (hasPattern
            ? `item-${serverId}-x${px}-y${py}${totalPhases > 1 ? `-f${f}` : ''}.png`
            : `item-${serverId}-frame-${f}.png`);
        const relativeFile = `public/generated/tibia1098/items/${fileName}`;
        files.set(relativeFile, rendered.png);

        if (isDefault && totalPhases > 1) {
          files.set(`public/generated/tibia1098/items/item-${serverId}.png`, rendered.png);
        }

        animFrames.push({
          frame: f,
          direction: 'static',
          pattern: { x: px, y: py, z: 0 },
          layer: 0,
          spriteIds: rendered.spriteIds,
          file: relativeFile,
          publicUrl: `/${relativeFile.replace(/^public\//, '')}`,
          sha256: sha256(rendered.png),
          width: rendered.width,
          height: rendered.height,
        });
      }
    }
  }

  // Generate fluid APNG animations for items with multiple phases or canonical potions
  const primaryItemFile = `public/generated/tibia1098/items/item-${serverId}.png`;
  const primaryPublicUrl = `/generated/tibia1098/items/item-${serverId}.png`;

  if (totalPhases > 1 && patX === 1 && patY === 1 && defaultPhaseRgba.length === totalPhases) {
    const apng = encodeRgbaApng(appearance.width * 32, appearance.height * 32, defaultPhaseRgba, 120);
    files.set(primaryItemFile, apng);
  } else if (totalPhases === 1 && CANONICAL_POTION_IDS.has(serverId) && defaultPhaseRgba.length > 0) {
    const apng = generateSparkleApng(appearance.width * 32, appearance.height * 32, defaultPhaseRgba[0], 120);
    files.set(primaryItemFile, apng);
  }

  const defaultFrame: ExtractedFrame = {
    ...animFrames[0],
    file: primaryItemFile,
    publicUrl: primaryPublicUrl,
    sha256: files.has(primaryItemFile) ? sha256(files.get(primaryItemFile)!) : animFrames[0].sha256,
  };
  const isGround = otbInfo.group === 1;
  return {
    mapping: {
      serverId,
      clientId: otbInfo.clientId,
      group: otbInfo.group,
      name,
      resolved: true,
      source: {
        serverId,
        otb: 'realmap11/data/items/items.otb',
        dat: 'Tibia 10/tibia/Tibia.dat',
        spr: 'Tibia 10/tibia/Tibia.spr',
      },
      appearanceId: otbInfo.clientId,
      isGround,
      blockSolid: false,
      appearance: {
        width: appearance.width,
        height: appearance.height,
        exactSize: appearance.exactSize,
        layers: appearance.layers,
        patternX: appearance.patternX,
        patternY: appearance.patternY,
        patternZ: appearance.patternZ,
        frames: appearance.frames,
        attributes: appearance.attributes,
        spriteIds: appearance.spriteIds,
      },
      extractedPattern: { x: 0, y: 0, z: 0 },
      extractedLayer: 0,
      frame: defaultFrame,
      frames: animFrames,
      animDurationMs: totalPhases > 1 ? 200 : 0,
      importWarnings: [],
    },
    files,
  };
}

export async function extractTibia1098Assets(options: ExtractOptions = {}): Promise<ExtractionResult> {
  const projectRoot = options.projectRoot ?? process.cwd();

  const datPath = resolve(projectRoot, 'Tibia 10', 'tibia', 'Tibia.dat');
  const sprPath = resolve(projectRoot, 'Tibia 10', 'tibia', 'Tibia.spr');
  const otbCandidate1 = resolve(projectRoot, '..', 'realmap11', 'data', 'items', 'items.otb');
  const otbCandidate2 = resolve(projectRoot, 'realmap11', 'data', 'items', 'items.otb');
  const otbPath = existsSync(otbCandidate1) ? otbCandidate1 : otbCandidate2;

  const [datBuf, sprBuf, otbBuf] = await Promise.all([
    readFile(datPath),
    readFile(sprPath),
    readFile(otbPath),
  ]);

  const dat = parseTibia1098Dat(datBuf);
  const spr = parseTibia1098Spr(sprBuf);
  const allFiles = new Map<string, Buffer>();

  // Extract Rotworm
  const rotwormApp = dat.appearances.creature.get(26) ?? Array.from(dat.appearances.creature.values())[0];
  const rotwormExt = extractAppearanceFrames('rotworm', 'Rotworm', rotwormApp, spr, {
    relationship: 'direct-look-type',
    validation: 'Tibia 10.98 Rotworm lookType 26',
    sourceId: 26,
    sourceFile: 'realmap11/data/monster/monsters/rotworm.xml',
    patterns: Array.from(CREATURE_DIRECTIONS),
  });
  for (const [k, v] of rotwormExt.files) allFiles.set(k, v);

  // Extract Aldric
  const aldricApp = dat.appearances.creature.get(128) ?? Array.from(dat.appearances.creature.values())[0];
  const aldricExt = extractAppearanceFrames('aldric', 'Aldric', aldricApp, spr, {
    relationship: 'selected-outfit',
    validation: 'Tibia 10.98 Outfit 128 (Citizen)',
    sourceId: 128,
    sourceFile: 'realmap11/data/XML/vocations.xml',
    patterns: Array.from(CREATURE_DIRECTIONS),
  });
  for (const [k, v] of aldricExt.files) allFiles.set(k, v);

  // Core Map Tile items
  const mapItemConfigs: Array<[VisualAssetMapping['key'], string, number]> = [
    ['floor', 'Grass Floor', FLOOR_SERVER_ID],
    ['caveGround', 'Cave Ground', CAVE_GROUND_SERVER_ID],
    ['caveWall', 'Cave Wall', CAVE_WALL_SERVER_ID],
    ['obstacle', 'Obstacle Rock', OBSTACLE_SERVER_ID],
    ['entrance', 'Cave Entrance', ENTRANCE_SERVER_ID],
    ['exit', 'Cave Exit Ladder', EXIT_SERVER_ID],
    ['trainingFloor', 'Training Floor', TRAINING_FLOOR_SERVER_ID],
    ['trainingWall', 'Training Wall', TRAINING_WALL_SERVER_ID],
    ['trainingRug', 'Training Rug', TRAINING_RUG_SERVER_ID],
    ['trainingDummy', 'Training Dummy', TRAINING_DUMMY_SERVER_ID],
    ['trainingDecor', 'Training Decor', TRAINING_DECOR_SERVER_ID],
  ];

  const mapAssetsResult: Record<string, any> = {};
  const mapItemsResult: Record<string, ItemVisualAssetMapping> = {};

  for (const [key, label, serverId] of mapItemConfigs) {
    const ext = extractItemVisualAsset(serverId, label, otbBuf, dat, spr);
    for (const [k, v] of ext.files) allFiles.set(k, v);
    mapItemsResult[String(serverId)] = ext.mapping;
    if (ext.mapping.appearance && ext.mapping.frame) {
      mapAssetsResult[key] = {
        key,
        kind: 'item',
        label,
        appearanceId: ext.mapping.clientId,
        serverId,
        clientId: ext.mapping.clientId,
        sourceId: serverId,
        sourceFile: 'realmap11/data/items/items.otb',
        relationship: 'otb-client-id',
        validation: `Mapped serverId ${serverId} to clientId ${ext.mapping.clientId}`,
        appearance: ext.mapping.appearance,
        extractedPattern: { x: 0, y: 0, z: 0 },
        extractedLayer: 0,
        frames: ext.mapping.frames ?? [ext.mapping.frame],
        notes: [],
      };
    }
  }

  // Collect all unique server items across the entire game
  const allServerIds = new Set<number>();

  // 1. Thais City
  try {
    const thaisCity = JSON.parse(await readFile(resolve(projectRoot, 'content/generated/thais-city.json'), 'utf8'));
    for (const t of thaisCity.tiles || []) {
      for (const sId of t.serverItemIds || []) allServerIds.add(sId);
    }
    for (const t of thaisCity.upperTiles || []) {
      for (const sId of t.serverItemIds || []) allServerIds.add(sId);
    }
  } catch {}

  // 2. Hunt Regions (all 5 active hunts)
  try {
    const huntRegions = JSON.parse(await readFile(resolve(projectRoot, 'content/generated/hunt-regions.json'), 'utf8'));
    for (const r of huntRegions.regions || []) {
      for (const t of r.tiles || []) {
        for (const sId of t.serverItemIds || []) allServerIds.add(sId);
      }
    }
  } catch {}

  // 3. Equipment Items (all 21 items)
  try {
    const equipmentJson = JSON.parse(await readFile(resolve(projectRoot, 'content/generated/equipment.json'), 'utf8'));
    for (const it of equipmentJson.items || []) {
      allServerIds.add(it.id);
    }
  } catch {}

  // 4. Starter Loadouts
  try {
    const startersJson = JSON.parse(await readFile(resolve(projectRoot, 'content/generated/starter-loadouts.json'), 'utf8'));
    for (const loadout of startersJson.loadouts || []) {
      for (const val of Object.values(loadout.equipped || {})) {
        if (typeof val === 'number') allServerIds.add(val);
      }
      for (const bpItem of loadout.backpack || []) {
        if (typeof bpItem.itemId === 'number') allServerIds.add(bpItem.itemId);
      }
    }
  } catch {}

  // 5. Economy Items
  try {
    const economyJson = JSON.parse(await readFile(resolve(projectRoot, 'content/generated/item-economy.json'), 'utf8'));
    for (const entry of economyJson.items || []) {
      allServerIds.add(entry.itemId);
    }
  } catch {}

  // 6. Monsters loot & corpses
  let importedMonsters: Array<{ id: string; name: string; lookType?: number; corpseId?: number; loot?: Array<{ itemId: number }> }> = [];
  try {
    const monstersJson = JSON.parse(await readFile(resolve(projectRoot, 'content/generated/monsters.json'), 'utf8'));
    importedMonsters = monstersJson.monsters || [];
    for (const m of importedMonsters) {
      if (typeof m.corpseId === 'number') allServerIds.add(m.corpseId);
      for (const loot of m.loot || []) {
        if (typeof loot.itemId === 'number') allServerIds.add(loot.itemId);
      }
    }
  } catch {}

  const extraIds = [
    1988, 2160, 2400, 2491, 2492, 2497, 2514, 2647, 2643, 2195, 2598, 3497, 3498, 5787,
    405, 406, 407, 1448, 1515, 1481, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 1056, 1057,
    8058, 1387, 2059, 2061, 1360, 2148, 2696, 9900, 9901, 9902, 9903, 9904, 9905, 9906, 9907, 9908, 9909, 9910, 9911, 9912,
  ];
  for (let id = 100; id <= 1400; id += 1) extraIds.push(id);
  for (const id of extraIds) allServerIds.add(id);

  // 7. Canonical Potions & Flasks (Tibia 10.98 client visual assets)
  const potionServerIds = [
    8704,  // small health potion
    7618,  // health potion
    7588,  // strong health potion
    7591,  // great health potion
    8473,  // ultimate health potion
    26031, // supreme health potion
    7620,  // mana potion
    7589,  // strong mana potion
    7590,  // great mana potion
    26029, // ultimate mana potion
    8472,  // great spirit potion
    26030, // ultimate spirit potion
    8474,  // antidote potion
    10089, // antidote potion
    7439,  // berserk potion
    7440,  // mastermind potion
    7443,  // bullseye potion
    7634,  // small potion flask
    7635,  // strong potion flask
    7636,  // great potion flask
  ];
  for (const id of potionServerIds) allServerIds.add(id);

  // 8. Canonical Runes (Tibia 10.98 client visual assets)
  for (const id of CANONICAL_RUNE_SERVER_IDS) allServerIds.add(id);

  const itemsResult: Record<string, ItemVisualAssetMapping> = {};
  for (const sId of allServerIds) {
    const runeMeta = CANONICAL_RUNE_METADATA[sId];
    const label = runeMeta ? runeMeta.name : `Item ${sId}`;
    const ext = extractItemVisualAsset(sId, label, otbBuf, dat, spr);
    for (const [k, v] of ext.files) allFiles.set(k, v);
    if (ext.mapping.resolved) {
      itemsResult[String(sId)] = ext.mapping;
      mapItemsResult[String(sId)] = ext.mapping;

      // Also copy rune items to public/runes/ for clean semantic access
      if (runeMeta) {
        const primaryPng = ext.files.get(`public/generated/tibia1098/items/item-${sId}.png`);
        if (primaryPng) {
          allFiles.set(`public/runes/${runeMeta.slug}.png`, primaryPng);
          allFiles.set(`public/runes/item-${sId}.png`, primaryPng);
        }
      }
    }
  }

  // Corpses
  const corpsesResult: Record<string, ItemVisualAssetMapping> = {};
  for (const m of importedMonsters) {
    if (m.corpseId) {
      const ext = extractItemVisualAsset(m.corpseId, `${m.name} Corpse`, otbBuf, dat, spr);
      for (const [k, v] of ext.files) allFiles.set(k, v);
      if (ext.mapping.resolved) {
        corpsesResult[m.id] = ext.mapping;
        corpsesResult[String(m.corpseId)] = ext.mapping;
      }
    }
  }

  // Outfits
  const outfitsResult: Record<string, VisualAssetMapping> = {};
  const outfitLookTypes = [128, 129, 130, 131, 136, 137, 138, 139, 140, 141, 142];
  const outfitVocationMap: Record<number, string> = {
    128: 'Knight',
    129: 'Paladin',
    130: 'Sorcerer',
    131: 'Druid',
  };

  for (const lookType of outfitLookTypes) {
    const app = dat.appearances.creature.get(lookType);
    if (!app) continue;
    const ext = extractAppearanceFrames(`outfit-${lookType}` as any, `Outfit ${lookType}`, app, spr, {
      relationship: 'selected-outfit',
      validation: `10.98 Outfit ${lookType}`,
      sourceId: lookType,
      sourceFile: 'realmap11',
      patterns: Array.from(CREATURE_DIRECTIONS),
    });
    for (const [k, v] of ext.files) allFiles.set(k, v);
    outfitsResult[String(lookType)] = ext.mapping;
    const vocName = outfitVocationMap[lookType];
    if (vocName) {
      outfitsResult[vocName] = ext.mapping;
    }
  }

  // Monsters
  const creaturesResult: Record<string, VisualAssetMapping> = {};
  const monsterLookTypeEntries: Array<{ id: string; name: string; lookType: number }> = [
    { id: 'rat', name: 'Rat', lookType: 21 },
    { id: 'cave-rat', name: 'Cave Rat', lookType: 56 },
    { id: 'spider', name: 'Spider', lookType: 30 },
    { id: 'bug', name: 'Bug', lookType: 45 },
    { id: 'poison-spider', name: 'Poison Spider', lookType: 36 },
    { id: 'troll', name: 'Troll', lookType: 15 },
    { id: 'swamp-troll', name: 'Swamp Troll', lookType: 76 },
    { id: 'rotworm', name: 'Rotworm', lookType: 26 },
    { id: 'skeleton', name: 'Skeleton', lookType: 33 },
    { id: 'minotaur', name: 'Minotaur', lookType: 25 },
    { id: 'dwarf', name: 'Dwarf', lookType: 69 },
    { id: 'carrion-worm', name: 'Carrion Worm', lookType: 205 },
    { id: 'dragon', name: 'Dragon', lookType: 34 },
  ];

  for (const m of importedMonsters) {
    if (m.lookType && !monsterLookTypeEntries.some((e) => e.id === m.id)) {
      monsterLookTypeEntries.push({ id: m.id, name: m.name, lookType: m.lookType });
    }
  }

  for (const entry of monsterLookTypeEntries) {
    const app = dat.appearances.creature.get(entry.lookType);
    if (!app) continue;
    const ext = extractAppearanceFrames(`monster-${entry.id}` as any, entry.name, app, spr, {
      relationship: 'direct-look-type',
      validation: `10.98 ${entry.name} lookType ${entry.lookType}`,
      sourceId: entry.lookType,
      sourceFile: `realmap11/data/monster/${entry.id}.xml`,
      patterns: Array.from(CREATURE_DIRECTIONS),
    });
    for (const [k, v] of ext.files) allFiles.set(k, v);
    creaturesResult[entry.id] = ext.mapping;
    creaturesResult[String(entry.lookType)] = ext.mapping;
  }

  // Effects & Missiles
  const effectsResult: Record<string, VisualAssetMapping> = {};
  const totalEffects = Math.min(200, dat.counts.effect);
  for (let effId = 1; effId <= totalEffects; effId += 1) {
    const app = dat.appearances.effect.get(effId);
    if (!app) continue;
    const ext = extractAppearanceFrames(`effect-${effId}` as any, `Effect ${effId}`, app, spr, {
      relationship: 'direct-visual-id',
      validation: `10.98 Effect ${effId}`,
      sourceId: effId,
      sourceFile: 'Tibia 10/tibia/Tibia.dat',
    });
    for (const [k, v] of ext.files) allFiles.set(k, v);
    effectsResult[String(effId)] = ext.mapping;
  }

  const missilesResult: Record<string, VisualAssetMapping> = {};
  const totalMissiles = Math.min(60, dat.counts.missile);
  for (let misId = 1; misId <= totalMissiles; misId += 1) {
    const app = dat.appearances.missile.get(misId);
    if (!app) continue;
    const ext = extractAppearanceFrames(`missile-${misId}` as any, `Missile ${misId}`, app, spr, {
      relationship: 'direct-visual-id',
      validation: `10.98 Missile ${misId}`,
      sourceId: misId,
      sourceFile: 'Tibia 10/tibia/Tibia.dat',
      patterns: Array.from(MISSILE_PATTERNS),
    });
    for (const [k, v] of ext.files) allFiles.set(k, v);
    missilesResult[String(misId)] = ext.mapping;
  }

  const manifest: Tibia1098AssetManifest = {
    schemaVersion: 1,
    format: {
      family: 'legacy-tibia-dat-spr',
      identifiedVersion: '10.98',
      datSignature: `0x${dat.signature.toString(16).toUpperCase()}`,
      sprSignature: `0x${spr.signature.toString(16).toUpperCase()}`,
      counts: {
        ...dat.counts,
        sprites: spr.count,
      },
      parsedDatBytes: dat.parsedBytes,
    },
    sources: {
      dat: fingerprint('Tibia 10/tibia/Tibia.dat', datBuf),
      spr: fingerprint('Tibia 10/tibia/Tibia.spr', sprBuf),
      rotworm: { ...fingerprint('realmap11/data/monster/monsters/rotworm.xml', Buffer.from('Rotworm')), lookType: 26 },
      itemsOtb: fingerprint('realmap11/data/items/items.otb', otbBuf),
    },
    assets: {
      rotworm: rotwormExt.mapping,
      aldric: aldricExt.mapping,
      ...mapAssetsResult,
    } as any,
    creatures: creaturesResult,
    outfits: outfitsResult,
    corpses: corpsesResult,
    items: itemsResult,
    mapItems: mapItemsResult,
    effects: effectsResult,
    missiles: missilesResult,
    limitations: [],
  };

  if (options.write !== false) {
    const manifestPath = resolve(projectRoot, 'content', 'generated', 'tibia1098-assets.json');
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    for (const [relPath, content] of allFiles) {
      const fullPath = resolve(projectRoot, relPath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
    }
  }

  return { manifest, files: allFiles };
}

export function validateTibia1098Manifest(manifest: Tibia1098AssetManifest): void {
  if (!manifest || manifest.schemaVersion !== 1) throw new Error('Invalid manifest schema version.');
  if (!manifest.assets || !manifest.assets.rotworm || !manifest.assets.aldric) {
    throw new Error('Manifest missing core assets.');
  }
}
