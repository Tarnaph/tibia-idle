import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import {
  validateMonsterDefinition,
  type LootDefinition,
  type MonsterCatalog,
  type MonsterDefinition,
} from '../../content-schema/src/index.ts';
import { getServerDataRoot } from './helpers.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }

export const SELECTED_MONSTER_FILES = [
  'rat', 'cave_rat', 'spider', 'bug', 'poison_spider', 'troll', 'swamp_troll',
  'rotworm', 'skeleton', 'minotaur', 'dwarf', 'carrion_worm', 'dragon',
] as const;

const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const numberValue = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};

function findFileRecursively(dir: string, fileName: string): string | null {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursively(fullPath, fileName);
      if (found) return found;
    } else if (entry.name.toLowerCase() === fileName.toLowerCase()) {
      return fullPath;
    }
  }
  return null;
}

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
  serverRoot: string,
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
    const rawChance = numberValue(entry.chance ?? entry.chance1, 100_000);
    const safeChance = Math.min(100_000, Math.max(1, rawChance));
    return {
      itemId,
      name: explicitName || (itemId === undefined ? '' : namesById.get(itemId)) || `item ${itemId}`,
      chance: safeChance,
      maxCount: Math.max(1, numberValue(entry.countmax, 1)),
    };
  });

  const parsedAttacks = asArray<Record<string, unknown>>(attackEntries)
    .filter((attack) => String(attack.name).toLowerCase() === 'melee')
    .map((attack) => ({
      kind: 'melee' as const,
      intervalMs: numberValue(attack.interval ?? attack.speed, 2_000),
      minDamage: Math.abs(numberValue(attack.min)),
      maxDamage: Math.abs(numberValue(attack.max)),
    }));

  const maxHp = Math.max(1, numberValue(health.max ?? health.now, 100));

  // Fallback attack for monsters without explicit melee tag (e.g. bosses using spells/scripts)
  const attacks = parsedAttacks.length > 0 ? parsedAttacks : [{
    kind: 'melee' as const,
    intervalMs: 2_000,
    minDamage: 1,
    maxDamage: Math.max(10, Math.floor(maxHp / 20)),
  }];

  return validateMonsterDefinition({
    id: String(monster.name).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
    source: { format: 'realmap11-monster-xml' as any, relativePath: relative(serverRoot, monsterPath).replaceAll('\\', '/') },
    name: String(monster.name),
    description: String(monster.nameDescription ?? monster.name),
    race: String(monster.race ?? 'unknown'),
    experience: numberValue(monster.experience),
    speed: numberValue(monster.speed, 100),
    maxHp,
    armor: numberValue(defenses.armor),
    defense: numberValue(defenses.defense),
    lookType: look.type === undefined ? undefined : numberValue(look.type),
    corpseId: look.corpse === undefined ? undefined : numberValue(look.corpse),
    attacks,
    loot,
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
  const serverRoot = getServerDataRoot(projectRoot);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });
  const itemsXml = await readFile(resolve(serverRoot, 'data', 'items', 'items.xml'), 'utf8');
  const { namesById, idsByName } = itemIndexes(asArray(parser.parse(itemsXml).items.item));

  const monstersMap = new Map<string, MonsterDefinition>();

  // 1. First ensure all authoritative SELECTED_MONSTER_FILES are imported with primary IDs
  for (const file of SELECTED_MONSTER_FILES) {
    const fileName = `${file.replace('_', ' ')}.xml`;
    const fileNameUnderscore = `${file}.xml`;
    let monsterPath = resolve(serverRoot, 'data', 'monster', 'monsters', `${file}.xml`);
    if (!existsSync(monsterPath)) {
      const monsterDir = resolve(serverRoot, 'data', 'monster');
      const found = findFileRecursively(monsterDir, fileNameUnderscore) || findFileRecursively(monsterDir, fileName);
      if (found) monsterPath = found;
    }
    if (existsSync(monsterPath)) {
      try {
        const rawContent = await readFile(monsterPath, 'utf8');
        const monsterRaw = parser.parse(rawContent).monster;
        if (monsterRaw) {
          const def = normalizeMonster(monsterRaw, monsterPath, serverRoot, namesById, idsByName);
          monstersMap.set(def.id, def);
        }
      } catch {
        // Graceful fallback
      }
    }
  }

  // 2. Process all additional monsters listed in monsters.xml
  const monstersXmlPath = resolve(serverRoot, 'data', 'monster', 'monsters.xml');
  if (existsSync(monstersXmlPath)) {
    const monstersXmlContent = await readFile(monstersXmlPath, 'utf8');
    const monsterEntries = asArray(parser.parse(monstersXmlContent).monsters?.monster);

    for (const entry of monsterEntries) {
      const fileRel = String(entry.file ?? '');
      if (!fileRel) continue;

      let monsterPath = resolve(serverRoot, 'data', 'monster', fileRel);
      if (!existsSync(monsterPath)) {
        const parts = fileRel.split('/');
        const fileName = parts[parts.length - 1];
        const monsterDir = resolve(serverRoot, 'data', 'monster');
        const found = findFileRecursively(monsterDir, fileName);
        if (found) monsterPath = found;
      }

      if (!existsSync(monsterPath)) continue;

      try {
        const rawContent = await readFile(monsterPath, 'utf8');
        const monsterRaw = parser.parse(rawContent).monster;
        if (!monsterRaw || !monsterRaw.name) continue;

        // If entry specifies custom variant name (e.g. SpiderOld), apply it
        if (entry.name && entry.name !== monsterRaw.name && fileRel.includes('other/nostalgia')) {
          monsterRaw.name = entry.name;
        }

        const def = normalizeMonster(monsterRaw, monsterPath, serverRoot, namesById, idsByName);
        if (!monstersMap.has(def.id)) {
          monstersMap.set(def.id, def);
        }
      } catch {
        // Skip malformed individual monster file gracefully
      }
    }
  }

  const monsters = Array.from(monstersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const catalog: MonsterCatalog = { importedAtBuildTime: true, monsters };

  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'monsters.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    const rotworm = monsters.find((monster) => monster.id === 'rotworm');
    if (!rotworm) throw new Error('Rotworm is missing from the imported catalog.');
    await writeFile(resolve(projectRoot, 'content', 'generated', 'rotworm.json'), `${JSON.stringify(rotworm, null, 2)}\n`, 'utf8');
  }

  return catalog;
}
