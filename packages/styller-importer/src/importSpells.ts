import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type {
  SpellCatalog,
  SpellCombatType,
  SpellDefinition,
  SpellFormulaDefinition,
  VocationName,
} from '../../content-schema/src/index.ts';

interface ImportOptions { projectRoot?: string; write?: boolean }

const SELECTED_SPELLS = new Set([
  'Light Healing', 'Intense Healing', 'Haste', 'Strong Haste', 'Magic Shield', 'Whirlwind Throw', 'Wound Cleansing', 'Berserk',
  'Ethereal Spear', 'Divine Healing', 'Divine Missile', 'Energy Strike', 'Flame Strike', 'Fire Wave',
  'Terra Strike', 'Ice Strike', 'Heal Friend', 'Ice Wave',
]);
const effectIds: Record<string, number> = {
  CONST_ME_HITAREA: 10, CONST_ME_MAGIC_BLUE: 13, CONST_ME_MAGIC_GREEN: 15,
  CONST_ME_HITBYFIRE: 16, CONST_ME_FIREATTACK: 37, CONST_ME_ENERGYAREA: 38,
  CONST_ME_HOLYDAMAGE: 40, CONST_ME_ICEAREA: 42, CONST_ME_ICEATTACK: 44, CONST_ME_CARNIPHILA: 47,
};
const projectileIds: Record<string, number | 'weapon-type'> = {
  CONST_ANI_FIRE: 4, CONST_ANI_ENERGY: 5, CONST_ANI_ETHEREALSPEAR: 28,
  CONST_ANI_SMALLICE: 37, CONST_ANI_SMALLHOLY: 38, CONST_ANI_SMALLEARTH: 39,
  CONST_ANI_WEAPONTYPE: 'weapon-type',
};
const combatTypes: Record<string, SpellCombatType> = {
  COMBAT_PHYSICALDAMAGE: 'physical', COMBAT_ENERGYDAMAGE: 'energy', COMBAT_FIREDAMAGE: 'fire',
  COMBAT_ICEDAMAGE: 'ice', COMBAT_EARTHDAMAGE: 'earth', COMBAT_HOLYDAMAGE: 'holy', COMBAT_HEALING: 'healing',
};
const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

function coefficient(line: string, variable: string): number {
  const match = line.match(new RegExp(`\\(${variable} \\* ([0-9.]+)\\)`));
  return match ? Number(match[1]) : 0;
}

function constantOf(line: string): number {
  const matches = [...line.matchAll(/\+\s*([0-9.]+)/g)];
  return matches.length > 0 ? Number(matches.at(-1)?.[1]) : 0;
}

function parseFormula(script: string, name: string): SpellFormulaDefinition {
  if (name === 'Haste' || name === 'Strong Haste') {
    const duration = Number(script.match(/CONDITION_PARAM_TICKS,\s*(\d+)/)?.[1]);
    const speed = script.match(/setFormula\(([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+),\s*([-0-9.]+)\)/);
    if (!duration || !speed) throw new Error(`${name} formula could not be normalized.`);
    return {
      kind: 'haste', min: { level: 0, constant: 0 }, max: { level: 0, constant: 0 }, durationMs: duration,
      speedFormula: [Number(speed[1]), Number(speed[2]), Number(speed[3]), Number(speed[4])],
    };
  }
  if (name === 'Magic Shield') {
    const duration = Number(script.match(/CONDITION_PARAM_TICKS,\s*(\d+)/)?.[1]) || 200000;
    return {
      kind: 'haste', min: { level: 0, constant: 0 }, max: { level: 0, constant: 0 }, durationMs: duration,
    };
  }
  const minLine = script.match(/local min = ([^\r\n]+)/)?.[1];
  const maxLine = script.match(/local max = ([^\r\n]+)/)?.[1];
  if (!minLine || !maxLine) throw new Error(`${name} formula could not be normalized.`);
  const level = minLine.includes('player:getLevel()') || minLine.includes('level / 5') ? 0.2 : 0;
  if (minLine.includes('distanceSkill')) {
    return {
      kind: 'distance-skill',
      min: { level, distanceSkill: coefficient(minLine, 'distanceSkill'), constant: constantOf(minLine) },
      max: { level, distanceSkill: maxLine.includes('distanceSkill +') ? 1 : coefficient(maxLine, 'distanceSkill'), constant: constantOf(maxLine) },
    };
  }
  if (minLine.includes('skill * attack')) {
    const skillAttack = (line: string) => Number(line.match(/skill \* attack \* ([0-9.]+)/)?.[1] ?? 0);
    const minSkill = name === 'Berserk' ? 0.07 : skillAttack(minLine);
    const maxSkill = name === 'Berserk' ? 0.09 : skillAttack(maxLine);
    return {
      kind: 'skill-attack',
      min: { level, skillAttack: minSkill, constant: constantOf(minLine) },
      max: { level, skillAttack: maxSkill, constant: constantOf(maxLine) },
    };
  }
  return {
    kind: 'level-magic',
    min: { level, magicLevel: coefficient(minLine, 'magicLevel'), constant: constantOf(minLine) },
    max: { level, magicLevel: coefficient(maxLine, 'magicLevel'), constant: constantOf(maxLine) },
  };
}

function constant(script: string, parameter: string): string | null {
  return script.match(new RegExp(`setParameter\\(${parameter},\\s*([A-Z0-9_]+)\\)`))?.[1] ?? null;
}

export async function importSpells(options: ImportOptions = {}): Promise<SpellCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const styllerRoot = resolve(projectRoot, '..', 'styller-master');
  const xmlPath = resolve(styllerRoot, 'data', 'spells', 'spells.xml');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });
  const parsed = parser.parse(await readFile(xmlPath, 'utf8')).spells as { instant: Array<Record<string, unknown>> };
  const spells = await Promise.all(asArray(parsed.instant).filter((raw) => SELECTED_SPELLS.has(String(raw.name))).map(async (raw) => {
    const scriptName = String(raw.script);
    const script = await readFile(resolve(styllerRoot, 'data', 'spells', 'scripts', scriptName), 'utf8');
    const effectConstant = constant(script, 'COMBAT_PARAM_EFFECT');
    const projectileConstant = constant(script, 'COMBAT_PARAM_DISTANCEEFFECT');
    const typeConstant = constant(script, 'COMBAT_PARAM_TYPE');
    const group = String(raw.group) as SpellDefinition['group'];
    const combatType = typeConstant ? combatTypes[typeConstant] : group === 'support' ? 'support' : undefined;
    if (!combatType) throw new Error(`${raw.name} has an unsupported combat type ${typeConstant}.`);
    const area = script.includes('AREA_WAVE4') ? 'wave-4'
      : script.includes('AREA_SQUARE1X1') ? 'square-1x1'
        : Number(raw.selftarget) === 1 ? 'self' : 'target';
    const warnings: string[] = [];
    if (projectileConstant === 'CONST_ANI_WEAPONTYPE') warnings.push('Projectile appearance is resolved from the equipped weapon at runtime.');
    return {
      spellId: Number(raw.spellid), name: String(raw.name), words: String(raw.words),
      vocations: asArray(raw.vocation as Record<string, unknown> | Record<string, unknown>[]).map((vocation) => String(vocation.name) as VocationName),
      requiredLevel: Number(raw.level), mana: Number(raw.mana ?? 0), cooldownMs: Number(raw.cooldown ?? 0),
      groupCooldownMs: Number(raw.groupcooldown ?? 0), group, range: Number(raw.range ?? (area === 'self' ? 0 : 1)),
      combatType, formula: parseFormula(script, String(raw.name)), area,
      aggressive: raw.aggressive === undefined ? group === 'attack' : Number(raw.aggressive) !== 0,
      runeId: raw.runeid === undefined ? null : Number(raw.runeid),
      visual: {
        effectId: effectConstant ? effectIds[effectConstant] ?? null : null,
        projectileId: projectileConstant ? projectileIds[projectileConstant] ?? null : null,
        effectConstant, projectileConstant,
      },
      sourceFiles: ['data/spells/spells.xml', `data/spells/scripts/${scriptName}`], importWarnings: warnings,
    } satisfies SpellDefinition;
  }));
  if (spells.length !== SELECTED_SPELLS.size) throw new Error(`Expected ${SELECTED_SPELLS.size} selected spells, imported ${spells.length}.`);
  const catalog: SpellCatalog = { importedAtBuildTime: true, spells: spells.sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name)) };
  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'spells.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
  return catalog;
}
