import { existsSync, readFileSync } from 'node:fs';
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

interface ItemRecordProps {
  name: string;
  article?: string;
  description?: string;
  weight?: number;
  attack?: number;
  defense?: number;
  extraDefense?: number;
  armor?: number;
  range?: number;
  weaponType?: EquipmentWeaponType;
  slot?: EquipmentItemSlot;
  twoHanded?: boolean;
  reqLevel?: number;
  vocations?: string[];
  skillBonuses?: Partial<Record<EquipmentSkill, number>>;
  magicLevelBonus?: number | null;
  elementalAbsorption?: Record<string, number>;
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

interface ItemRequirement {
  level?: number;
  vocations?: string[];
}

function readRequirements(serverRoot: string): Map<number, ItemRequirement> {
  const requirements = new Map<number, ItemRequirement>();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });

  // 1. Parse Weapons XML
  const weaponsPath = resolve(serverRoot, 'data', 'weapons', 'weapons.xml');
  if (existsSync(weaponsPath)) {
    try {
      const parsed = parser.parse(readFileSync(weaponsPath, 'utf8'));
      const weapons = parsed.weapons ?? {};
      for (const groupKey of Object.keys(weapons)) {
        const list = asArray(weapons[groupKey]);
        for (const item of list) {
          const fromId = numberValue(item.id ?? item.fromid, -1);
          const toId = numberValue(item.id ?? item.toid, fromId);
          if (fromId <= 0) continue;
          const level = item.level !== undefined ? numberValue(item.level) : item.lvl !== undefined ? numberValue(item.lvl) : undefined;
          const vocs = asArray(item.vocation).map((v: any) => String(v.name ?? '')).filter(Boolean);
          for (let id = fromId; id <= toId; id++) {
            const existing = requirements.get(id) ?? {};
            requirements.set(id, {
              level: level ?? existing.level,
              vocations: vocs.length > 0 ? vocs : existing.vocations,
            });
          }
        }
      }
    } catch {
      // Non-fatal if weapons.xml has minor malformations
    }
  }

  // 2. Parse Movements XML
  const movementsPath = resolve(serverRoot, 'data', 'movements', 'movements.xml');
  if (existsSync(movementsPath)) {
    try {
      const parsed = parser.parse(readFileSync(movementsPath, 'utf8'));
      const movevents = asArray(parsed.movements?.movevent);
      for (const m of movevents) {
        if (m.event === 'Equip') {
          const fromId = numberValue(m.itemid ?? m.fromid, -1);
          const toId = numberValue(m.itemid ?? m.toid, fromId);
          if (fromId <= 0) continue;
          const level = m.level !== undefined ? numberValue(m.level) : undefined;
          const vocs = asArray(m.vocation).map((v: any) => String(v.name ?? '')).filter(Boolean);
          for (let id = fromId; id <= toId; id++) {
            const existing = requirements.get(id) ?? {};
            requirements.set(id, {
              level: level ?? existing.level,
              vocations: vocs.length > 0 ? vocs : existing.vocations,
            });
          }
        }
      }
    } catch {
      // Non-fatal if movements.xml has minor malformations
    }
  }

  return requirements;
}

function parseItemsXml(xmlSource: string, requirementsMap: Map<number, ItemRequirement>): Map<number, ItemRecordProps> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });
  const parsed = parser.parse(xmlSource);
  const items = asArray(parsed.items?.item);
  const records = new Map<number, ItemRecordProps>();

  for (const item of items) {
    const fromId = numberValue(item.id ?? item.fromid, -1);
    const toId = numberValue(item.id ?? item.toid, fromId);
    if (fromId <= 0) continue;

    const baseName = String(item.name ?? '').trim();
    if (!baseName) continue;

    const article = item.article ? String(item.article).trim() : undefined;
    let description: string | undefined;
    let weight: number | undefined;
    let attack: number | undefined;
    let defense: number | undefined;
    let extraDefense: number | undefined;
    let armor: number | undefined;
    let range: number | undefined;
    let weaponType: EquipmentWeaponType = 'none';
    let slot: EquipmentItemSlot | undefined;
    let twoHanded = false;
    let reqLevel: number | undefined;
    const skillBonuses: Partial<Record<EquipmentSkill, number>> = {};
    let magicLevelBonus: number | null = null;
    const elementalAbsorption: Record<string, number> = {};

    const attrs = asArray(item.attribute);
    for (const attr of attrs) {
      const key = String(attr.key ?? '').toLowerCase();
      const val = attr.value;

      if (key === 'description') description = String(val);
      if (key === 'weight') weight = numberValue(val);
      if (key === 'attack') attack = numberValue(val);
      if (key === 'defense') defense = numberValue(val);
      if (key === 'extradef') extraDefense = numberValue(val);
      if (key === 'armor') armor = numberValue(val);
      if (key === 'range') range = numberValue(val);
      if (key === 'reqlevel' || key === 'level') reqLevel = numberValue(val);

      if (key === 'weapontype') {
        const w = String(val).toLowerCase();
        if (w === 'sword') weaponType = 'sword';
        else if (w === 'axe') weaponType = 'axe';
        else if (w === 'club') weaponType = 'club';
        else if (w === 'shield') weaponType = 'shield';
        else if (w === 'distance') weaponType = 'distance';
        else if (w === 'wand') weaponType = 'wand';
        else if (w === 'ammunition' || w === 'ammo') weaponType = 'ammo';
      }

      if (key === 'slottype') {
        const s = String(val).toLowerCase();
        if (s === 'head') slot = 'head';
        else if (s === 'body' || s === 'armor') slot = 'armor';
        else if (s === 'legs') slot = 'legs';
        else if (s === 'feet') slot = 'boots';
        else if (s === 'two-handed') { slot = 'hand'; twoHanded = true; }
        else if (s === 'ammo' || s === 'ammunition') slot = 'ammo';
        else if (s === 'ring') slot = 'ring';
        else if (s === 'necklace' || s === 'amulet') slot = 'necklace';
        else if (s === 'backpack' || s === 'container') slot = 'backpack';
        else if (s === 'hand' || s === 'shield') slot = 'hand';
      }

      // Skill bonuses
      if (key === 'skillsword') skillBonuses.sword = numberValue(val);
      if (key === 'skillaxe') skillBonuses.axe = numberValue(val);
      if (key === 'skillclub') skillBonuses.club = numberValue(val);
      if (key === 'skilldist') skillBonuses.distance = numberValue(val);
      if (key === 'skillshield') skillBonuses.shielding = numberValue(val);
      if (key === 'skillfist') skillBonuses.fist = numberValue(val);
      if (key === 'magiclevelpoints') magicLevelBonus = numberValue(val);

      // Absorption
      if (key.startsWith('absorbpercent')) {
        const element = key.replace('absorbpercent', '');
        elementalAbsorption[element] = numberValue(val);
      }
    }

    if (!slot) {
      if (weaponType !== 'none') slot = 'hand';
      else if (armor && armor > 0) slot = 'armor';
      else slot = 'other';
    }

    for (let id = fromId; id <= toId; id++) {
      const req = requirementsMap.get(id);
      records.set(id, {
        name: baseName,
        article,
        description,
        weight,
        attack,
        defense,
        extraDefense,
        armor,
        range,
        weaponType,
        slot,
        twoHanded,
        reqLevel: req?.level ?? reqLevel,
        vocations: req?.vocations,
        skillBonuses: Object.keys(skillBonuses).length > 0 ? skillBonuses : undefined,
        magicLevelBonus,
        elementalAbsorption: Object.keys(elementalAbsorption).length > 0 ? elementalAbsorption : undefined,
      });
    }
  }

  return records;
}

function normalizeEquipment(
  id: number,
  otb: OtbItemIdentity,
  itemProps: ItemRecordProps,
): EquipmentDefinition {
  const weaponType = itemProps.weaponType ?? 'none';
  const slot = itemProps.slot ?? (weaponType !== 'none' ? 'hand' : 'other');
  const weightValue = itemProps.weight;
  const importWarnings: string[] = [];

  const requirements: { level?: number; magicLevel?: number; vocations?: string[] } = {};
  if (itemProps.reqLevel !== undefined && itemProps.reqLevel > 0) {
    requirements.level = itemProps.reqLevel;
  }
  if (itemProps.vocations && itemProps.vocations.length > 0) {
    requirements.vocations = itemProps.vocations;
  }

  return validateEquipmentDefinition({
    id,
    name: itemProps.name,
    article: itemProps.article,
    description: itemProps.description,
    weaponType,
    attack: itemProps.attack ?? 0,
    defense: itemProps.defense ?? 0,
    extraDefense: itemProps.extraDefense ?? 0,
    armor: itemProps.armor ?? 0,
    slot,
    twoHanded: Boolean(itemProps.twoHanded),
    range: itemProps.range ?? (weaponType === 'distance' ? 3 : 1),
    weight: typeof weightValue === 'number'
      ? { hundredthsOfOunce: weightValue, ounces: weightValue / 100 }
      : null,
    requirements,
    skillBonuses: itemProps.skillBonuses ?? {},
    magicLevelBonus: itemProps.magicLevelBonus ?? null,
    elementalAbsorption: itemProps.elementalAbsorption ?? {},
    sourceFile: ['data/items/items.otb', 'data/items/items.xml'],
    sourceId: id,
    source: {
      otb: {
        sourceFile: 'data/items/items.otb',
        serverId: otb.serverId,
        clientId: otb.clientId,
        group: otb.group,
        flags: otb.flags,
      },
      xml: {
        sourceFile: 'data/items/items.xml',
        sourceId: id,
        line: 1,
      },
    },
    importWarnings,
  });
}

export async function importEquipment(options: ImportOptions = {}): Promise<EquipmentCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const serverRoot = getServerDataRoot(projectRoot);
  const otbPath = resolve(serverRoot, 'data', 'items', 'items.otb');
  const xmlPath = resolve(serverRoot, 'data', 'items', 'items.xml');

  const otbBuffer = await readFile(otbPath);
  const otbItems = readOtbIdentities(otbBuffer);

  const requirementsMap = readRequirements(serverRoot);
  const xmlSource = await readFile(xmlPath, 'utf8');
  const itemRecords = parseItemsXml(xmlSource, requirementsMap);

  const items: EquipmentDefinition[] = [];

  // Import all named items with valid OTB identities
  for (const [id, record] of itemRecords.entries()) {
    const otb = otbItems.get(id);
    if (!otb) continue;
    if (!record.name) continue;

    try {
      const def = normalizeEquipment(id, otb, record);
      items.push(def);
    } catch {
      // Skip invalid items gracefully
    }
  }

  // Ensure all SELECTED_EQUIPMENT_IDS are present
  for (const id of SELECTED_EQUIPMENT_IDS) {
    if (!items.some((i) => i.id === id)) {
      const otb = otbItems.get(id);
      const record = itemRecords.get(id);
      if (otb && record) {
        items.push(normalizeEquipment(id, otb, record));
      }
    }
  }

  // Sort by id for deterministic generation
  items.sort((a, b) => a.id - b.id);

  const catalog: EquipmentCatalog = {
    importedAtBuildTime: true,
    selectionReason: `Authoritative RealMap 11 items catalog: ${items.length} items imported from items.otb, items.xml, weapons.xml and movements.xml.`,
    items,
  };

  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'equipment.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }

  return catalog;
}
