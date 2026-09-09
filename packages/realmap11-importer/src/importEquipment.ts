import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import {
  validateEquipmentDefinition,
  type EquipmentCatalog,
  type EquipmentDefinition,
  type EquipmentItemSlot,
  type EquipmentSkill,
  type EquipmentWeaponType,
} from '../../content-schema/src/index.ts';
import { getServerDataRoot } from './helpers.ts';

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

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const numberValue = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

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
      if (offset + length > props.length) break;

      if (attribute === 0x10 && length === 2) {
        serverId = props.readUInt16LE(offset);
      } else if (attribute === 0x11 && length === 2) {
        clientId = props.readUInt16LE(offset);
      }

      offset += length;
    }

    if (serverId !== undefined && clientId !== undefined) {
      identities.set(serverId, {
        serverId,
        clientId,
        group: child.type,
        flags,
      });
    }
  }

  return identities;
}

function readLuaRecords(source: string): Map<number, LuaItemRecord> {
  const records = new Map<number, LuaItemRecord>();
  let cursor = 0;
  const lineAt = (index: number) => source.slice(0, index).split('\n').length;

  while (cursor < source.length) {
    const start = source.indexOf('ItemType(', cursor);
    if (start === -1) break;

    const end = source.indexOf(')', start);
    if (end === -1) break;

    const block = source.slice(start, end + 1);
    const idMatch = block.match(/^ItemType\((\d+),/);
    if (!idMatch) {
      cursor = start + 1;
      continue;
    }

    const id = Number(idMatch[1]);
    const properties = new Map<string, string | number | boolean>();

    for (const match of block.matchAll(/([a-zA-Z0-9]+)\s*=\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*"|[A-Z0-9_]+)/g)) {
      const [, key, rawValue] = match;
      if (key === 'ItemType') continue;

      let parsed: string | number | boolean = rawValue;
      if (rawValue === 'true') parsed = true;
      else if (rawValue === 'false') parsed = false;
      else if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) parsed = Number(rawValue);
      else if (rawValue.startsWith('"') && rawValue.endsWith('"')) parsed = rawValue.slice(1, -1);

      properties.set(key, parsed);
    }

    if (typeof id === 'number') records.set(id, { line: lineAt(start), properties });
    cursor = Math.max(end, start + 1);
  }

  return records;
}

function readXmlItemRecords(xmlSource: string): Map<number, LuaItemRecord> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true });
  const parsed = parser.parse(xmlSource);
  const items = asArray(parsed.items?.item);
  const records = new Map<number, LuaItemRecord>();

  for (const item of items) {
    const id = numberValue(item.id);
    if (id <= 0) continue;
    const props = new Map<string, string | number | boolean>();
    props.set('name', String(item.name ?? ''));

    const attrs = asArray(item.attribute);
    for (const attr of attrs) {
      const key = String(attr.key ?? '');
      const val = attr.value;
      if (key === 'weight') props.set('weight', numberValue(val));
      if (key === 'attack') props.set('attack', numberValue(val));
      if (key === 'defense') props.set('defense', numberValue(val));
      if (key === 'extradef') props.set('extraDefense', numberValue(val));
      if (key === 'armor') props.set('armor', numberValue(val));
      if (key === 'weaponType') {
        const w = String(val).toLowerCase();
        if (w === 'sword') props.set('weaponType', 'WEAPON_SWORD');
        else if (w === 'axe') props.set('weaponType', 'WEAPON_AXE');
        else if (w === 'club') props.set('weaponType', 'WEAPON_CLUB');
        else if (w === 'shield') props.set('weaponType', 'WEAPON_SHIELD');
        else if (w === 'distance') props.set('weaponType', 'WEAPON_DISTANCE');
        else if (w === 'wand') props.set('weaponType', 'WEAPON_WAND');
        else if (w === 'ammunition' || w === 'ammo') props.set('weaponType', 'WEAPON_AMMO');
      }
      if (key === 'slotType') {
        const s = String(val).toLowerCase();
        if (s === 'head') props.set('slotPosition', 'SLOTP_HEAD');
        else if (s === 'body' || s === 'armor') props.set('slotPosition', 'SLOTP_ARMOR');
        else if (s === 'legs') props.set('slotPosition', 'SLOTP_LEGS');
        else if (s === 'feet') props.set('slotPosition', 'SLOTP_FEET');
        else if (s === 'two-handed') props.set('slotPosition', 'SLOTP_TWO_HAND');
        else if (s === 'ammo') props.set('slotPosition', 'SLOTP_AMMO');
      }
    }
    records.set(id, { line: 1, properties: props });
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
    sourceFile: ['data/items/items.otb', 'data/items/items.lua'] as ['data/items/items.otb', 'data/items/items.lua'],
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
  const serverRoot = getServerDataRoot(projectRoot);
  const otbPath = resolve(serverRoot, 'data', 'items', 'items.otb');
  const luaPath = resolve(serverRoot, 'data', 'items', 'items.lua');
  const xmlPath = resolve(serverRoot, 'data', 'items', 'items.xml');

  const otbBuffer = await readFile(otbPath);
  const otbItems = readOtbIdentities(otbBuffer);

  let itemRecords: Map<number, LuaItemRecord>;
  if (existsSync(luaPath)) {
    const luaSource = await readFile(luaPath, 'utf8');
    itemRecords = readLuaRecords(luaSource);
  } else if (existsSync(xmlPath)) {
    const xmlSource = await readFile(xmlPath, 'utf8');
    itemRecords = readXmlItemRecords(xmlSource);
  } else {
    throw new Error('Neither items.lua nor items.xml found in data/items.');
  }

  const items = SELECTED_EQUIPMENT_IDS.map((id) => {
    const otb = otbItems.get(id);
    const lua = itemRecords.get(id);
    if (!otb) throw new Error(`Selected item ${id} does not exist in items.otb.`);
    if (!lua) throw new Error(`Selected item ${id} does not have a simple authoritative entry in item records.`);
    return normalizeEquipment(id, otb, lua);
  });

  const catalog: EquipmentCatalog = {
    importedAtBuildTime: true,
    selectionReason: 'Curated Knight development set plus four vocation starter loadouts, verified in items.otb.',
    items,
  };

  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'equipment.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }

  return catalog;
}
