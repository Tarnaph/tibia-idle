import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import equipmentCatalog from '../../../content/generated/equipment.json' with { type: 'json' };
import monsterCatalog from '../../../content/generated/monsters.json' with { type: 'json' };
import rotwormDefinition from '../../../content/generated/rotworm.json' with { type: 'json' };
import spellCatalog from '../../../content/generated/spells.json' with { type: 'json' };
import huntRegionCatalog from '../../../content/generated/hunt-regions.json' with { type: 'json' };
import { parseTibia860Dat, spriteIndex } from './dat.ts';
import { findOtbClientId, tryFindOtbClientId } from './otb.ts';
import { encodeRgbaPng } from './png.ts';
import { parseTibia860Spr, type TibiaSprFile } from './spr.ts';
import type {
  ExtractionResult,
  ExtractedFrame,
  ItemVisualAssetMapping,
  SourceFingerprint,
  Tibia860AssetManifest,
  TibiaAppearance,
  TibiaDatFile,
  VisualAssetMapping,
} from './types.ts';

interface ExtractOptions {
  projectRoot?: string;
  write?: boolean;
}

const EXPECTED_DAT_SIGNATURE = 0x4c28b721;
const EXPECTED_SPR_SIGNATURE = 0x4c220594;
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
const SELECTED_ITEM_NAMES = new Map<number, string>([
  ...equipmentCatalog.items.map((item) => [item.id, item.name] as const),
  ...monsterCatalog.monsters.flatMap((monster) => monster.loot.flatMap((item) => (
    item.itemId === undefined ? [] : [[item.itemId, item.name] as const]
  ))),
]);
const PARTY_OUTFITS = { Knight: 128, Paladin: 129, Sorcerer: 130, Druid: 131 } as const;
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

function copySprite(target: Buffer, targetWidth: number, source: Buffer, targetX: number, targetY: number): void {
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      const sourceOffset = (y * 32 + x) * 4;
      if (source[sourceOffset + 3] === 0) continue;
      const targetOffset = ((targetY + y) * targetWidth + targetX + x) * 4;
      source.copy(target, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

function renderFrame(
  appearance: TibiaAppearance,
  spr: TibiaSprFile,
  coordinates: { layer: number; x: number; y: number; z: number; frame: number },
): { png: Buffer; spriteIds: number[]; width: number; height: number } {
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
  return { png: encodeRgbaPng(width, height, rgba), spriteIds, width, height };
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
    for (let frame = 0; frame < appearance.frames; frame += 1) {
      const rendered = renderFrame(appearance, spr, { layer, x: pattern.x, y: pattern.y, z: pattern.z, frame });
      const file = `public/generated/tibia860/${key}-${pattern.direction}-frame-${frame}.png`;
      files.set(file, rendered.png);
      frames.push({
        frame,
        direction: pattern.direction,
        pattern: { x: pattern.x, y: pattern.y, z: pattern.z },
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
  const source = {
    serverId,
    otb: 'styller-master/data/items/items.otb' as const,
    dat: 'tibia-860-client/Tibia.dat' as const,
    spr: 'tibia-860-client/Tibia.spr' as const,
  };
  const fallback = (
    warning: string,
    clientId: number | null = null,
    group: number | null = null,
  ): { mapping: ItemVisualAssetMapping; files: Map<string, Buffer> } => ({
    mapping: {
      serverId,
      clientId,
      group,
      name,
      resolved: false,
      source,
      appearanceId: clientId,
      appearance: null,
      extractedPattern: null,
      extractedLayer: null,
      frame: null,
      importWarnings: [warning],
    },
    files: new Map(),
  });

  const identity = tryFindOtbClientId(otbBuffer, serverId);
  if (!identity) {
    return fallback(`Server item ${serverId} was not found in items.otb; the UI must use its explicit fallback.`);
  }
  const appearance = dat.appearances.item.get(identity.clientId);
  if (!appearance) {
    return fallback(
      `Client appearance ${identity.clientId} was not found in Tibia.dat; the UI must use its explicit fallback.`,
      identity.clientId,
      identity.group,
    );
  }

  const rendered = renderFrame(appearance, spr, { layer: 0, x: 0, y: 0, z: 0, frame: 0 });
  if (!rendered.spriteIds.some((spriteId) => spriteId > 0)) {
    return fallback(
      `Client appearance ${identity.clientId} resolved only transparent sprite ids for the selected frame.`,
      identity.clientId,
      identity.group,
    );
  }

  const file = `public/generated/tibia860/items/item-${serverId}.png`;
  const frame: ExtractedFrame = {
    frame: 0,
    direction: 'static',
    pattern: { x: 0, y: 0, z: 0 },
    layer: 0,
    spriteIds: rendered.spriteIds,
    file,
    publicUrl: `/${file.replace(/^public\//, '')}`,
    sha256: sha256(rendered.png),
    width: rendered.width,
    height: rendered.height,
  };
  const importWarnings: string[] = [];
  if (appearance.layers > 1) importWarnings.push('Only DAT layer 0 is rendered for this inventory icon.');
  if (appearance.patternX > 1 || appearance.patternY > 1 || appearance.patternZ > 1) {
    importWarnings.push('Only DAT pattern 0/0/0 is rendered; stack/subtype variations are deferred.');
  }
  if (appearance.frames > 1) importWarnings.push('Only animation frame 0 is rendered for this inventory icon.');

  return {
    mapping: {
      serverId,
      clientId: identity.clientId,
      group: identity.group,
      name,
      resolved: true,
      source,
      appearanceId: identity.clientId,
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
      frame,
      importWarnings,
    },
    files: new Map([[file, rendered.png]]),
  };
}

function requireAppearance(
  map: Map<number, TibiaAppearance>,
  id: number,
  category: string,
): TibiaAppearance {
  const appearance = map.get(id);
  if (!appearance) throw new Error(`${category} appearance ${id} was not found in Tibia.dat.`);
  return appearance;
}

function mergeFiles(target: Map<string, Buffer>, source: Map<string, Buffer>): void {
  for (const [path, contents] of source) target.set(path, contents);
}

function ensureWritableTarget(projectRoot: string, path: string): void {
  const relation = relative(projectRoot, path);
  if (relation.startsWith('..') || relation === '') {
    throw new Error(`Refusing to write outside mmorpg-web: ${path}`);
  }
}

export function validateTibia860Manifest(manifest: Tibia860AssetManifest): void {
  if (manifest.schemaVersion !== 1) throw new Error('Unexpected asset manifest version.');
  if (manifest.format.parsedDatBytes !== manifest.sources.dat.byteLength) {
    throw new Error('DAT was not parsed to its exact end.');
  }
  for (const asset of Object.values(manifest.assets)) {
    if (asset.frames.length === 0) throw new Error(`${asset.key} has no extracted frames.`);
    for (const frame of asset.frames) {
      if (!frame.publicUrl.startsWith('/generated/tibia860/')) throw new Error('Invalid public sprite URL.');
      if (
        frame.spriteIds.length === 0
        || !frame.spriteIds.some((id) => id > 0)
        || frame.spriteIds.some((id) => id < 0 || id > manifest.format.counts.sprites)
      ) {
        throw new Error(`${asset.key} has an invalid sprite reference.`);
      }
    }
  }
  for (const asset of [...Object.values(manifest.creatures), ...Object.values(manifest.outfits)]) {
    if (asset.frames.length === 0) throw new Error(`${asset.key} has no extracted frames.`);
    if (!asset.frames.every((frame) => frame.spriteIds.some((id) => id > 0))) {
      throw new Error(`${asset.key} has an empty extracted frame.`);
    }
  }
  for (const asset of [...Object.values(manifest.effects), ...Object.values(manifest.missiles)]) {
    if (asset.frames.length === 0 || !asset.frames.every((frame) => frame.spriteIds.some((id) => id > 0))) {
      throw new Error(`${asset.key} has an invalid visual frame.`);
    }
  }
  for (const [serverId, item] of Object.entries(manifest.items)) {
    if (String(item.serverId) !== serverId) throw new Error(`Item asset key ${serverId} does not match its server id.`);
    if (!item.resolved) {
      if (item.importWarnings.length === 0 || item.frame !== null) {
        throw new Error(`Unresolved item ${serverId} must carry a warning and no frame.`);
      }
      continue;
    }
    if (!item.frame || item.clientId === null || item.appearanceId !== item.clientId) {
      throw new Error(`Resolved item ${serverId} has incomplete OTB/DAT metadata.`);
    }
    if (!item.frame.publicUrl.startsWith('/generated/tibia860/items/')) {
      throw new Error(`Resolved item ${serverId} has an invalid public sprite URL.`);
    }
    if (!item.frame.spriteIds.some((spriteId) => spriteId > 0)) {
      throw new Error(`Resolved item ${serverId} has no real SPR sprite id.`);
    }
  }
  for (const [serverId, item] of Object.entries(manifest.mapItems)) {
    if (String(item.serverId) !== serverId) throw new Error(`Map item key ${serverId} does not match its server id.`);
    if (item.resolved && !item.frame) throw new Error(`Resolved map item ${serverId} has no frame.`);
    if (!item.resolved && item.importWarnings.length === 0) throw new Error(`Unresolved map item ${serverId} needs a warning.`);
  }
  for (const [monsterId, corpse] of Object.entries(manifest.corpses)) {
    if (!corpse.resolved || !corpse.frame) throw new Error(`Corpse for ${monsterId} did not resolve.`);
  }
}

export async function extractTibia860Assets(options: ExtractOptions = {}): Promise<ExtractionResult> {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const clientRoot = resolve(projectRoot, '..', 'tibia-860-client');
  const styllerRoot = resolve(projectRoot, '..', 'styller-master');
  const datPath = resolve(clientRoot, 'Tibia.dat');
  const sprPath = resolve(clientRoot, 'Tibia.spr');
  const rotwormPath = resolve(styllerRoot, 'data', 'monster', 'monsters', 'rotworm.xml');
  const otbPath = resolve(styllerRoot, 'data', 'items', 'items.otb');
  const [datBuffer, sprBuffer, rotwormBuffer, otbBuffer] = await Promise.all([
    readFile(datPath),
    readFile(sprPath),
    readFile(rotwormPath),
    readFile(otbPath),
  ]);
  const dat = parseTibia860Dat(datBuffer);
  const spr = parseTibia860Spr(sprBuffer);
  if (dat.signature !== EXPECTED_DAT_SIGNATURE) {
    throw new Error(`Unexpected Tibia.dat signature 0x${dat.signature.toString(16)}.`);
  }
  if (spr.signature !== EXPECTED_SPR_SIGNATURE) {
    throw new Error(`Unexpected Tibia.spr signature 0x${spr.signature.toString(16)}.`);
  }
  const rotwormLookType = Number(rotwormDefinition.lookType);
  if (rotwormLookType !== 26) throw new Error(`Expected imported Rotworm lookType 26, got ${rotwormLookType}.`);

  const rotwormAppearance = requireAppearance(dat.appearances.creature, rotwormLookType, 'Creature');
  const aldricAppearance = requireAppearance(dat.appearances.creature, ALDRIC_LOOK_TYPE, 'Creature');
  const floorIdentity = findOtbClientId(otbBuffer, FLOOR_SERVER_ID);
  if (floorIdentity.group !== 1) {
    throw new Error(`Selected floor server id ${FLOOR_SERVER_ID} is not in the OTB ground group.`);
  }
  const floorAppearance = requireAppearance(dat.appearances.item, floorIdentity.clientId, 'Item');

  const scenerySelections = {
    caveGround: { serverId: CAVE_GROUND_SERVER_ID, label: 'Dirt cave floor', expectedGroup: 1 },
    caveWall: { serverId: CAVE_WALL_SERVER_ID, label: 'Cave rocks' },
    obstacle: { serverId: OBSTACLE_SERVER_ID, label: 'Stalagmites' },
    entrance: { serverId: ENTRANCE_SERVER_ID, label: 'Ladder entrance' },
    exit: { serverId: EXIT_SERVER_ID, label: 'Dungeon hole exit', layer: 1 },
    trainingFloor: { serverId: TRAINING_FLOOR_SERVER_ID, label: 'Wooden training-room floor', expectedGroup: 1 },
    trainingWall: { serverId: TRAINING_WALL_SERVER_ID, label: 'Stone training-room wall' },
    trainingRug: { serverId: TRAINING_RUG_SERVER_ID, label: 'Red training rug' },
    trainingDummy: { serverId: TRAINING_DUMMY_SERVER_ID, label: 'Training dummy' },
    trainingDecor: { serverId: TRAINING_DECOR_SERVER_ID, label: 'Weapon rack' },
  } as const;
  const scenery = Object.fromEntries(Object.entries(scenerySelections).map(([key, selection]) => {
    const identity = findOtbClientId(otbBuffer, selection.serverId);
    if ('expectedGroup' in selection && identity.group !== selection.expectedGroup) {
      throw new Error(`${selection.label} server id ${selection.serverId} is not in the expected OTB group.`);
    }
    const appearance = requireAppearance(dat.appearances.item, identity.clientId, 'Item');
    const extracted = extractAppearanceFrames(
      key as VisualAssetMapping['key'],
      selection.label,
      appearance,
      spr,
      {
        relationship: 'otb-client-id',
        validation: `STYLLER server item ${selection.serverId} maps through items.otb to client appearance ${identity.clientId}.`,
        sourceId: selection.serverId,
        sourceFile: 'styller-master/data/items/items.otb',
        layer: 'layer' in selection ? selection.layer : 0,
        notes: ['Selected explicitly for a manually composed room; no OTBM data is read.'],
      },
    );
    return [key, { ...extracted, identity }];
  })) as Record<Exclude<VisualAssetMapping['key'], 'rotworm' | 'aldric' | 'floor'>, {
    mapping: VisualAssetMapping;
    files: Map<string, Buffer>;
    identity: { clientId: number; group: number };
  }>;

  const rotworm = extractAppearanceFrames('rotworm', 'Rotworm', rotwormAppearance, spr, {
    relationship: 'direct-look-type',
    validation: 'lookType 26 resolves directly to creature appearance 26; the generated pixels are visually verified as Rotworm for this spike.',
    sourceId: rotwormLookType,
    sourceFile: 'styller-master/data/monster/monsters/rotworm.xml',
    patterns: [...CREATURE_DIRECTIONS],
    notes: ['Creature direction patternX 0 is rendered as north.'],
  });
  const aldric = extractAppearanceFrames('aldric', 'Aldric prototype outfit', aldricAppearance, spr, {
    relationship: 'selected-outfit',
    validation: 'lookType 128 is a valid human outfit used by the STYLLER content and selected explicitly for Aldric.',
    sourceId: ALDRIC_LOOK_TYPE,
    sourceFile: 'tibia-860-client/Tibia.dat',
    patterns: [...CREATURE_DIRECTIONS],
    notes: [
      'Only base layer 0 and addon patternY 0 are extracted.',
      'Layer 1 is the outfit color mask; runtime palette recoloring is intentionally outside this spike.',
    ],
  });
  const floor = extractAppearanceFrames('floor', 'Grass floor', floorAppearance, spr, {
    relationship: 'otb-client-id',
    validation: `STYLLER server item ${FLOOR_SERVER_ID} maps through items.otb to client appearance ${floorIdentity.clientId} in the ground group.`,
    sourceId: FLOOR_SERVER_ID,
    sourceFile: 'styller-master/data/items/items.otb',
    notes: ['The floor uses the OTB server-id to DAT client-id mapping instead of assuming the IDs are equal.'],
  });

  const files = new Map<string, Buffer>();
  mergeFiles(files, rotworm.files);
  mergeFiles(files, aldric.files);
  mergeFiles(files, floor.files);
  for (const asset of Object.values(scenery)) mergeFiles(files, asset.files);
  const creatures = Object.fromEntries(monsterCatalog.monsters.map((monster) => {
    if (monster.lookType === undefined) throw new Error(`${monster.name} has no lookType.`);
    const extracted = extractAppearanceFrames(
      `monster-${monster.id}`,
      monster.name,
      requireAppearance(dat.appearances.creature, monster.lookType, 'Creature'),
      spr,
      {
        relationship: 'direct-look-type',
        validation: `${monster.source.relativePath} lookType ${monster.lookType} resolves directly to creature appearance ${monster.lookType}.`,
        sourceId: monster.lookType,
        sourceFile: `styller-master/${monster.source.relativePath}`,
        patterns: [...CREATURE_DIRECTIONS],
      },
    );
    mergeFiles(files, extracted.files);
    return [monster.id, extracted.mapping];
  }));
  const outfits = Object.fromEntries(Object.entries(PARTY_OUTFITS).map(([vocation, lookType]) => {
    const extracted = extractAppearanceFrames(
      `outfit-${vocation.toLowerCase()}`,
      `${vocation} prototype outfit`,
      requireAppearance(dat.appearances.creature, lookType, 'Creature'),
      spr,
      {
        relationship: 'selected-outfit',
        validation: `Creature appearance ${lookType} is a valid human outfit selected explicitly for the ${vocation} prototype.`,
        sourceId: lookType,
        sourceFile: 'tibia-860-client/Tibia.dat',
        patterns: [...CREATURE_DIRECTIONS],
        notes: ['Base layer only; addons and palette recoloring remain deferred.'],
      },
    );
    mergeFiles(files, extracted.files);
    return [vocation, extracted.mapping];
  }));
  const corpses = Object.fromEntries(monsterCatalog.monsters.map((monster) => {
    if (monster.corpseId === undefined) throw new Error(`${monster.name} has no corpseId.`);
    const extracted = extractItemVisualAsset(monster.corpseId, `${monster.name} corpse`, otbBuffer, dat, spr);
    mergeFiles(files, extracted.files);
    return [monster.id, extracted.mapping];
  }));
  const itemAssets = Object.fromEntries(
    [...SELECTED_ITEM_NAMES.entries()]
      .sort(([left], [right]) => left - right)
      .map(([serverId, name]) => {
        const extracted = extractItemVisualAsset(serverId, name, otbBuffer, dat, spr);
        mergeFiles(files, extracted.files);
        return [String(serverId), extracted.mapping];
      }),
  );
  const regionItemIds = [...new Set(huntRegionCatalog.regions.flatMap((region) => region.tiles.flatMap((tile) => tile.serverItemIds)))].sort((a, b) => a - b);
  const mapItems = Object.fromEntries(regionItemIds.map((serverId) => {
    const extracted = extractItemVisualAsset(serverId, `OTBM map item ${serverId}`, otbBuffer, dat, spr);
    mergeFiles(files, extracted.files);
    return [String(serverId), extracted.mapping];
  }));
  const effectIds = [...new Set(spellCatalog.spells.flatMap((spell) => spell.visual.effectId === null ? [] : [spell.visual.effectId]))].sort((a, b) => a - b);
  const effects = Object.fromEntries(effectIds.map((effectId) => {
    const extracted = extractAppearanceFrames(`effect-${effectId}`, `Magic effect ${effectId}`, requireAppearance(dat.appearances.effect, effectId, 'Effect'), spr, {
      relationship: 'direct-visual-id', validation: `STYLLER effect constant ${effectId} resolves to Tibia.dat effect appearance ${effectId}.`,
      sourceId: effectId, sourceFile: 'styller-master/src/const.h', notes: ['Effect frame timing is driven by the Pixi presentation clock.'],
    });
    mergeFiles(files, extracted.files);
    return [String(effectId), extracted.mapping];
  }));
  const missileIds = [...new Set(spellCatalog.spells.flatMap((spell) => typeof spell.visual.projectileId === 'number' ? [spell.visual.projectileId] : []))].sort((a, b) => a - b);
  const missiles = Object.fromEntries(missileIds.map((missileId) => {
    const extracted = extractAppearanceFrames(`missile-${missileId}`, `Projectile ${missileId}`, requireAppearance(dat.appearances.missile, missileId, 'Missile'), spr, {
      relationship: 'direct-visual-id', validation: `STYLLER projectile constant ${missileId} resolves to Tibia.dat missile appearance ${missileId}.`,
      sourceId: missileId, sourceFile: 'styller-master/src/const.h', patterns: [...MISSILE_PATTERNS],
    });
    mergeFiles(files, extracted.files);
    return [String(missileId), extracted.mapping];
  }));
  const manifest: Tibia860AssetManifest = {
    schemaVersion: 1,
    format: {
      family: 'legacy-tibia-dat-spr',
      identifiedVersion: '8.60',
      datSignature: `0x${dat.signature.toString(16).toUpperCase()}`,
      sprSignature: `0x${spr.signature.toString(16).toUpperCase()}`,
      counts: { ...dat.counts, sprites: spr.count },
      parsedDatBytes: dat.parsedBytes,
    },
    sources: {
      dat: fingerprint('tibia-860-client/Tibia.dat', datBuffer),
      spr: fingerprint('tibia-860-client/Tibia.spr', sprBuffer),
      rotworm: { ...fingerprint('styller-master/data/monster/monsters/rotworm.xml', rotwormBuffer), lookType: rotwormLookType },
      itemsOtb: fingerprint('styller-master/data/items/items.otb', otbBuffer),
    },
    assets: {
      rotworm: rotworm.mapping,
      aldric: aldric.mapping,
      floor: { ...floor.mapping, serverId: FLOOR_SERVER_ID, clientId: floorIdentity.clientId },
      caveGround: {
        ...scenery.caveGround.mapping,
        serverId: CAVE_GROUND_SERVER_ID,
        clientId: scenery.caveGround.identity.clientId,
      },
      caveWall: {
        ...scenery.caveWall.mapping,
        serverId: CAVE_WALL_SERVER_ID,
        clientId: scenery.caveWall.identity.clientId,
      },
      obstacle: {
        ...scenery.obstacle.mapping,
        serverId: OBSTACLE_SERVER_ID,
        clientId: scenery.obstacle.identity.clientId,
      },
      entrance: {
        ...scenery.entrance.mapping,
        serverId: ENTRANCE_SERVER_ID,
        clientId: scenery.entrance.identity.clientId,
      },
      exit: {
        ...scenery.exit.mapping,
        serverId: EXIT_SERVER_ID,
        clientId: scenery.exit.identity.clientId,
      },
      trainingFloor: {
        ...scenery.trainingFloor.mapping,
        serverId: TRAINING_FLOOR_SERVER_ID,
        clientId: scenery.trainingFloor.identity.clientId,
      },
      trainingWall: {
        ...scenery.trainingWall.mapping,
        serverId: TRAINING_WALL_SERVER_ID,
        clientId: scenery.trainingWall.identity.clientId,
      },
      trainingRug: {
        ...scenery.trainingRug.mapping,
        serverId: TRAINING_RUG_SERVER_ID,
        clientId: scenery.trainingRug.identity.clientId,
      },
      trainingDummy: {
        ...scenery.trainingDummy.mapping,
        serverId: TRAINING_DUMMY_SERVER_ID,
        clientId: scenery.trainingDummy.identity.clientId,
      },
      trainingDecor: {
        ...scenery.trainingDecor.mapping,
        serverId: TRAINING_DECOR_SERVER_ID,
        clientId: scenery.trainingDecor.identity.clientId,
      },
    },
    creatures,
    outfits,
    corpses,
    items: itemAssets,
    mapItems,
    effects,
    missiles,
    limitations: [
      'Creature appearances export four directions, one addon pattern and the available frame phases.',
      'Outfit addons and palette recoloring are not implemented; Aldric uses the raw base layer.',
      'The floor is one proven OTB-to-DAT mapping, not a map or tileset importer.',
      'Cave scenery is a curated OTB-to-DAT selection composed manually; it is not derived from styller.otbm.',
      'Training-room scenery is a curated OTB-to-DAT selection composed manually; it does not imply an OTBM map import.',
      'Selected early-game monsters and their corpse items are extracted only for six manual hunts.',
      'OTBM terrain extraction is limited to the five selected rectangular regions; unresolved complex items retain explicit fallbacks.',
      'Only visual effects and projectiles referenced by the selected normalized spell set are extracted.',
      'Inventory icons use layer 0, pattern 0/0/0 and frame 0; subtype/stack variations are recorded as warnings and deferred.',
    ],
  };
  validateTibia860Manifest(manifest);

  const manifestBuffer = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  files.set('content/generated/tibia860-assets.json', manifestBuffer);
  if (options.write !== false) {
    for (const [file, contents] of files) {
      const outputPath = resolve(projectRoot, file);
      ensureWritableTarget(projectRoot, outputPath);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, contents);
    }
  }
  return { manifest, files };
}
