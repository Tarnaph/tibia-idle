import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import {
  validateMonsterDefinition,
  type LootDefinition,
  type MonsterCatalog,
  type MonsterDefinition,
} from '../../content-schema/src/index.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }

export const SELECTED_MONSTER_FILES = [
  'rat', 'cave_rat', 'spider', 'bug', 'poison_spider', 'troll', 'swamp_troll',
  'rotworm', 'skeleton', 'minotaur', 'dwarf', 'carrion_worm',
] as const;

const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const numberValue = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};

function itemIndexes(items: unknown[]) {
  const namesById = new Map<number, string>();
  const idsByName = new Map<string, number[]>();
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const name = String(item.name ?? '').trim();
    const fromId = numberValue(item.id ?? item.fromid, -1);
    const toId = numberValue(item.id ?? item.toid, fromId);
    if (!name || fromId < 0) continue;
    for (let id = fromId; id <= toId; id += 1) namesById.set(id, name);
    const ids = idsByName.get(name.toLowerCase()) ?? [];
    ids.push(fromId);
    idsByName.set(name.toLowerCase(), ids);
  }
  return { namesById, idsByName };
}

function normalizeMonster(
  monster: Record<string, unknown>,
  monsterPath: string,
  styllerRoot: string,
  namesById: Map<number, string>,
  idsByName: Map<string, number[]>,
): MonsterDefinition {
  const lootEntries = asRecord(monster.loot).item as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const attackEntries = asRecord(monster.attacks).attack as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const health = asRecord(monster.health);
  const defenses = asRecord(monster.defenses);
  const look = asRecord(monster.look);
  const elementEntries = asRecord(monster.elements).element as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const immunityEntries = asRecord(monster.immunities).immunity as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const loot: LootDefinition[] = asArray<Record<string, unknown>>(lootEntries).map((entry) => {
    const explicitId = entry.id === undefined ? undefined : numberValue(entry.id);
    const explicitName = String(entry.name ?? '').trim();
    const itemId = explicitId ?? idsByName.get(explicitName.toLowerCase())?.[0];
    return {
      itemId,
      name: explicitName || (itemId === undefined ? '' : namesById.get(itemId)) || `item ${itemId}`,
      chance: numberValue(entry.chance ?? entry.chance1, 100_000),
      maxCount: Math.max(1, numberValue(entry.countmax, 1)),
    };
  });
  const attacks = asArray<Record<string, unknown>>(attackEntries)
    .filter((attack) => String(attack.name).toLowerCase() === 'melee')
    .map((attack) => ({
      kind: 'melee' as const,
      intervalMs: numberValue(attack.interval ?? attack.speed, 2_000),
      minDamage: Math.abs(numberValue(attack.min)),
      maxDamage: Math.abs(numberValue(attack.max)),
    }));
  return validateMonsterDefinition({
    id: String(monster.name).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
    source: { format: 'styller-monster-xml', relativePath: relative(styllerRoot, monsterPath).replaceAll('\\', '/') },
    name: String(monster.name),
    description: String(monster.nameDescription ?? monster.name),
    race: String(monster.race ?? 'unknown'),
    experience: ['rat', 'cave-rat'].includes(String(monster.name).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')) ? 50_000 : numberValue(monster.experience),
    speed: numberValue(monster.speed), maxHp: numberValue(health.max),
    armor: numberValue(defenses.armor), defense: numberValue(defenses.defense),
    lookType: look.type === undefined ? undefined : numberValue(look.type),
    corpseId: look.corpse === undefined ? undefined : numberValue(look.corpse),
    attacks, loot,
    elementalPercent: Object.assign({}, ...asArray<Record<string, unknown>>(elementEntries).map((entry) => (
      Object.fromEntries(Object.entries(entry).map(([key, value]) => [key.replace(/Percent$/i, '').toLowerCase(), numberValue(value)]))
    ))),
    immunities: asArray<Record<string, unknown>>(immunityEntries).flatMap((entry) => (
      Object.entries(entry).filter(([, value]) => numberValue(value) === 1).map(([key]) => key.toLowerCase())
    )),
  });
}

export async function importMonsters(options: ImportOptions = {}): Promise<MonsterCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const styllerRoot = resolve(projectRoot, '..', 'styller-master');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });
  const itemsXml = await readFile(resolve(styllerRoot, 'data', 'items', 'items.xml'), 'utf8');
  const { namesById, idsByName } = itemIndexes(asArray(parser.parse(itemsXml).items.item));
  const monsters = await Promise.all(SELECTED_MONSTER_FILES.map(async (file) => {
    const monsterPath = resolve(styllerRoot, 'data', 'monster', 'monsters', `${file}.xml`);
    return normalizeMonster(parser.parse(await readFile(monsterPath, 'utf8')).monster, monsterPath, styllerRoot, namesById, idsByName);
  }));
  const catalog: MonsterCatalog = { importedAtBuildTime: true, monsters };
  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'monsters.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    const rotworm = monsters.find((monster) => monster.id === 'rotworm');
    if (!rotworm) throw new Error('Rotworm is missing from the selected catalog.');
    await writeFile(resolve(projectRoot, 'content', 'generated', 'rotworm.json'), `${JSON.stringify(rotworm, null, 2)}\n`, 'utf8');
  }
  return catalog;
}
