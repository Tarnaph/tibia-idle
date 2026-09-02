import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  validateEquipmentDefinition,
  type EquipmentCatalog,
  type EquipmentDefinition,
  type EquipmentItemSlot,
  type EquipmentSkill,
  type EquipmentWeaponType,
} from '../../content-schema/src/index.ts';

interface ImportOptions {
  projectRoot?: string;
  write?: boolean;
}

interface OtbNode {
  type: number;
  props: number[];
  children: OtbNode[];
}

interface OtbItemIdentity {
  serverId: number;
  clientId: number;
  group: number;
  flags: number;
}

interface LuaItemRecord {
  line: number;
  properties: Map<string, string | number | boolean>;
}

export const SELECTED_EQUIPMENT_IDS = [
  2376, 2388, 2398,
  2512, 2526,
  2458, 2461,
  2464, 2467,
  2648, 2649,
  2643, 2645,
  2457, 2463, 2647, 2525,
  8601, 2389, 2190, 2182,
] as const;

const OTB_ESCAPE = 0xfd;
const OTB_START = 0xfe;
const OTB_END = 0xff;
const OTB_ATTR_SERVER_ID = 0x10;
const OTB_ATTR_CLIENT_ID = 0x11;

const weaponTypeByConstant: Record<string, EquipmentWeaponType> = {
  WEAPON_SWORD: 'sword',
  WEAPON_AXE: 'axe',
  WEAPON_CLUB: 'club',
  WEAPON_SHIELD: 'shield',
  WEAPON_DISTANCE: 'distance',
  WEAPON_WAND: 'wand',
  WEAPON_AMMO: 'ammo',
};

const slotByConstant: Record<string, EquipmentItemSlot> = {
  SLOTP_HEAD: 'head',
  SLOTP_ARMOR: 'armor',
  SLOTP_LEGS: 'legs',
  SLOTP_FEET: 'boots',
  SLOTP_TWO_HAND: 'hand',
  SLOTP_AMMO: 'ammo',
};

function parseOtbNode(buffer: Buffer, startOffset: number): { node: OtbNode; nextOffset: number } {
  if (buffer[startOffset] !== OTB_START) throw new Error('Invalid OTB node start.');

  let offset = startOffset + 1;
  const node: OtbNode = { type: buffer[offset], props: [], children: [] };
  offset += 1;

  while (offset < buffer.length) {
    const byte = buffer[offset];
    offset += 1;

    if (byte === OTB_ESCAPE) {
      if (offset >= buffer.length) throw new Error('Invalid escaped OTB byte.');
      node.props.push(buffer[offset]);
      offset += 1;
      continue;
    }

    if (byte === OTB_START) {
      const child = parseOtbNode(buffer, offset - 1);
      node.children.push(child.node);
      offset = child.nextOffset;
      continue;
    }

    if (byte === OTB_END) return { node, nextOffset: offset };
    node.props.push(byte);
  }

  throw new Error('Unterminated OTB node.');
}

function readOtbIdentities(buffer: Buffer): Map<number, OtbItemIdentity> {
  const identifier = buffer.subarray(0, 4).toString('ascii');
  if (identifier !== 'OTBI' && !buffer.subarray(0, 4).every((byte) => byte === 0)) {
    throw new Error(`Unsupported OTB identifier: ${identifier}.`);
  }

  const root = parseOtbNode(buffer, 4).node;
  const identities = new Map<number, OtbItemIdentity>();

  for (const child of root.children) {
    const props = Buffer.from(child.props);
    if (props.length < 4) continue;
    const flags = props.readUInt32LE(0);
    let serverId: number | undefined;
    let clientId: number | undefined;
    let offset = 4;

    while (offset + 3 <= props.length) {
      const attribute = props[offset];
      const length = props.readUInt16LE(offset + 1);
      offset += 3;
      if (offset + length > props.length) throw new Error('Invalid OTB attribute length.');
      if (attribute === OTB_ATTR_SERVER_ID && length === 2) serverId = props.readUInt16LE(offset);
      if (attribute === OTB_ATTR_CLIENT_ID && length === 2) clientId = props.readUInt16LE(offset);
      offset += length;
    }

    if (serverId !== undefined && clientId !== undefined) {
      identities.set(serverId, { serverId, clientId, group: child.type, flags });
    }
  }

  return identities;
}

function parseLuaScalar(raw: string, quoted: string | undefined): string | number | boolean {
  if (quoted !== undefined) return quoted;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : raw;
}

function readLuaRecords(source: string): Map<number, LuaItemRecord> {
  const records = new Map<number, LuaItemRecord>();
  const propertyPattern = /(\w+)\s*=\s*(?:"([^"]*)"|(-?\d+(?:\.\d+)?)|([A-Z][A-Z0-9_]*|true|false))/g;
  const lineAt = (offset: number) => source.slice(0, offset).split(/\r?\n/).length;
  let cursor = 0;
  while (cursor < source.length) {
    const startMatch = /\{\s*id\s*=\s*\d+\s*,/g;
    startMatch.lastIndex = cursor;
    const found = startMatch.exec(source);
    if (!found) break;
    const start = found.index;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    let end = start;
    for (; end < source.length; end += 1) {
      const character = source[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quoted = false;
        continue;
      }
      if (character === '"') quoted = true;
      else if (character === '{') depth += 1;
      else if (character === '}' && --depth === 0) { end += 1; break; }
    }
    const block = source.slice(start, end);
    const properties = new Map<string, string | number | boolean>();
    for (const match of block.matchAll(propertyPattern)) {
      const raw = match[2] ?? match[3] ?? match[4];
      properties.set(match[1], parseLuaScalar(raw, match[2]));
    }
    const id = properties.get('id');
    if (typeof id === 'number') records.set(id, { line: lineAt(start), properties });
    cursor = Math.max(end, start + 1);
  }

  return records;
}

function numberProperty(record: LuaItemRecord, key: string, fallback = 0): number {
  const value = record.properties.get(key);
  return typeof value === 'number' ? value : fallback;
}

function stringProperty(record: LuaItemRecord, key: string): string | undefined {
  const value = record.properties.get(key);
  return typeof value === 'string' ? value : undefined;
}

function readSkillBonuses(record: LuaItemRecord): Partial<Record<EquipmentSkill, number>> {
  const keys: Array<[string, EquipmentSkill]> = [
    ['skillFist', 'fist'],
    ['skillClub', 'club'],
    ['skillSword', 'sword'],
    ['skillAxe', 'axe'],
    ['skillDist', 'distance'],
    ['skillShield', 'shielding'],
  ];
  return Object.fromEntries(
    keys.flatMap(([sourceKey, skill]) => {
      const value = record.properties.get(sourceKey);
      return typeof value === 'number' ? [[skill, value]] : [];
    }),
  );
}

function normalizeEquipment(
  id: number,
  otb: OtbItemIdentity,
  lua: LuaItemRecord,
): EquipmentDefinition {
  const weaponConstant = stringProperty(lua, 'weaponType');
  const weaponType = weaponConstant ? weaponTypeByConstant[weaponConstant] : 'none';
  const slotConstant = stringProperty(lua, 'slotPosition');
  const slot = slotConstant ? slotByConstant[slotConstant] : weaponType !== 'none' ? 'hand' : undefined;
  if (!slot) throw new Error(`Unable to determine equipment slot for item ${id}.`);

  const weightValue = lua.properties.get('weight');
  const importWarnings: string[] = [];
  if (!slotConstant && slot === 'hand') {
    importWarnings.push('slotPosition is absent in items.lua; using the ItemType engine default SLOTP_HAND.');
  }
  if (!lua.properties.has('extraDefense')) {
    importWarnings.push('extraDefense is absent in items.lua; using the ItemType engine default 0.');
  }
  importWarnings.push(
    'No level, vocation, skill bonus, magic-level bonus or absorption fields are declared by this Lua entry; normalized as unrestricted/empty.',
  );

  return validateEquipmentDefinition({
    id,
    name: String(lua.properties.get('name') ?? ''),
    weaponType,
    attack: numberProperty(lua, 'attack'),
    defense: numberProperty(lua, 'defense'),
    extraDefense: numberProperty(lua, 'extraDefense'),
    armor: numberProperty(lua, 'armor'),
    slot,
    twoHanded: slotConstant === 'SLOTP_TWO_HAND',
    range: numberProperty(lua, 'range', weaponType === 'distance' ? 3 : 1),
    weight: typeof weightValue === 'number'
      ? { hundredthsOfOunce: weightValue, ounces: weightValue / 100 }
      : null,
    requirements: {},
    skillBonuses: readSkillBonuses(lua),
    magicLevelBonus: typeof lua.properties.get('magicLevelPoints') === 'number'
      ? numberProperty(lua, 'magicLevelPoints')
      : null,
    elementalAbsorption: {},
    sourceFile: ['data/items/items.otb', 'data/items/items.lua'],
    sourceId: id,
    source: {
      otb: {
        sourceFile: 'data/items/items.otb',
        serverId: otb.serverId,
        clientId: otb.clientId,
        group: otb.group,
        flags: otb.flags,
      },
      lua: {
        sourceFile: 'data/items/items.lua',
        sourceId: id,
        line: lua.line,
      },
    },
    importWarnings,
  });
}

export async function importEquipment(options: ImportOptions = {}): Promise<EquipmentCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const styllerRoot = resolve(projectRoot, '..', 'styller-master');
  const otbPath = resolve(styllerRoot, 'data', 'items', 'items.otb');
  const luaPath = resolve(styllerRoot, 'data', 'items', 'items.lua');
  const [otbBuffer, luaSource] = await Promise.all([readFile(otbPath), readFile(luaPath, 'utf8')]);
  const otbItems = readOtbIdentities(otbBuffer);
  const luaItems = readLuaRecords(luaSource);

  const items = SELECTED_EQUIPMENT_IDS.map((id) => {
    const otb = otbItems.get(id);
    const lua = luaItems.get(id);
    if (!otb) throw new Error(`Selected item ${id} does not exist in items.otb.`);
    if (!lua) throw new Error(`Selected item ${id} does not have a simple authoritative entry in items.lua.`);
    return normalizeEquipment(id, otb, lua);
  });

  const catalog: EquipmentCatalog = {
    importedAtBuildTime: true,
    selectionReason: 'Curated Knight development set plus four vocation starter loadouts, verified in items.otb and enriched from items.lua.',
    items,
  };

  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'equipment.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }

  return catalog;
}
