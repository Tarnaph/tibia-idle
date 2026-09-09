import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type {
  BaseVocationName,
  ProgressionSkill,
  VocationCatalog,
  VocationDefinition,
  VocationName,
} from '../../content-schema/src/index.ts';
import { getServerDataRoot } from './helpers.ts';

interface ImportOptions {
  projectRoot?: string;
  write?: boolean;
}

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});
const skillNames: ProgressionSkill[] = ['fist', 'club', 'sword', 'axe', 'distance', 'shielding'];

export async function importVocations(options: ImportOptions = {}): Promise<VocationCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const serverRoot = getServerDataRoot(projectRoot);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true });

  let vocationsXmlPath = resolve(serverRoot, 'data', 'XML', 'vocations.xml');
  if (!existsSync(vocationsXmlPath)) {
    vocationsXmlPath = resolve(serverRoot, 'data', 'vocations.xml');
  }

  const source = await readFile(vocationsXmlPath, 'utf8');
  const vocationEntries = asRecord(asRecord(parser.parse(source)).vocations).vocation as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const byId = new Map(asArray<Record<string, unknown>>(vocationEntries).map((vocation) => [Number(vocation.id), vocation]));
  const selected: Array<[number, VocationName, BaseVocationName]> = [
    [1, 'Sorcerer', 'Sorcerer'],
    [2, 'Druid', 'Druid'],
    [3, 'Paladin', 'Paladin'],
    [4, 'Knight', 'Knight'],
    [5, 'Master Sorcerer', 'Sorcerer'],
    [6, 'Elder Druid', 'Druid'],
    [7, 'Royal Paladin', 'Paladin'],
    [8, 'Elite Knight', 'Knight'],
  ];

  const vocations: VocationDefinition[] = selected.map(([id, name, baseVocation]) => {
    const raw = byId.get(id);
    if (!raw || raw.name !== name) throw new Error(`${name} vocation id ${id} was not found.`);
    const rawSkillEntries = raw.skill as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const rawSkills = new Map(asArray<Record<string, unknown>>(rawSkillEntries).map((skill) => [Number(skill.id), Number(skill.multiplier)]));
    const formula = asRecord(raw.formula);
    return {
      id,
      name,
      baseVocation,
      promoted: id >= 5,
      fromVocationId: Number(raw.fromvoc ?? 0),
      gainHp: Number(raw.gainhp ?? raw.gainHp ?? 5),
      gainMana: Number(raw.gainmana ?? raw.gainMana ?? 5),
      gainCap: Number(raw.gaincap ?? raw.gainCap ?? 10),
      healthGainTicks: Number(raw.gainhpticks ?? raw.gainHpTicks ?? 12),
      healthGainAmount: 1,
      manaGainTicks: Number(raw.gainmanaticks ?? raw.gainManaTicks ?? 6),
      manaGainAmount: 2,
      manaMultiplier: Number(raw.manamultiplier ?? raw.manaMultiplier ?? 4),
      attackSpeedMs: Number(raw.attackspeed ?? raw.attackSpeed ?? 2000),
      baseSpeed: Number(raw.basespeed ?? raw.baseSpeed ?? 220),
      meleeDamageMultiplier: Number(formula.meleeDamage ?? 1),
      distanceDamageMultiplier: Number(formula.distDamage ?? 1),
      defenseMultiplier: Number(formula.defense ?? 1),
      armorMultiplier: Number(formula.armor ?? 1),
      skillMultipliers: Object.fromEntries(skillNames.map((skill, index) => [skill, rawSkills.get(index) ?? 1])) as Record<ProgressionSkill, number>,
      sourceFile: 'data/XML/vocations.xml',
      sourceId: id,
    };
  });

  let configSource = 'rateSkill = 1\nrateMagic = 1';
  const configLuaPath = resolve(serverRoot, 'config.lua');
  const configLuaDistPath = resolve(serverRoot, 'config.lua.dist');
  if (existsSync(configLuaPath)) {
    configSource = await readFile(configLuaPath, 'utf8');
  } else if (existsSync(configLuaDistPath)) {
    configSource = await readFile(configLuaDistPath, 'utf8');
  }

  const readRate = (key: string) => Number(configSource.match(new RegExp(`^${key}\\s*=\\s*(\\d+)`, 'm'))?.[1] ?? 1);
  const catalog: VocationCatalog = { importedAtBuildTime: true, rateSkill: readRate('rateSkill'), rateMagic: readRate('rateMagic'), vocations };

  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'vocations.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
    const knight = vocations.find((vocation) => vocation.name === 'Knight');
    await writeFile(resolve(projectRoot, 'content', 'generated', 'knight-vocation.json'), `${JSON.stringify(knight, null, 2)}\n`, 'utf8');
  }

  return catalog;
}
