import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type {
  SpellCatalog,
  SpellDefinition,
  SpellFormulaDefinition,
  VocationName,
} from '../../content-schema/src/index.ts';
import { getServerDataRoot } from './helpers.ts';

interface ImportOptions {
  projectRoot?: string;
  write?: boolean;
}

export const ALLOWED_SORCERER_SPELLS = new Set([
  "Apprentice's Strike",
  "Light Healing",
  "Energy Strike",
  "Terra Strike",
  "Flame Strike",
  "Haste",
  "Intense Healing",
  "Magic Shield",
  "Ice Strike",
  "Death Strike",
  "Fire Wave",
  "Energy Beam",
  "Strong Haste",
  "Ultimate Healing",
  "Great Energy Beam",
  "Energy Wave",
  "Great Fire Wave",
  "Rage of the Skies",
  "Hell's Core",
  "Strong Flame Strike",
  "Strong Energy Strike",
  "Ultimate Flame Strike",
  "Ultimate Energy Strike",
]);

export const SELECTED_SPELLS = new Set([
  'Light',
  'Find Person',
  'Light Healing',
  'Death Strike',
  'Flame Strike',
  'Energy Strike',
  'Fire Wave',
  'Great Light',
  'Haste',
  'Ultimate Healing',
  'Berserk',
  'Magic Shield',
  'Whirlwind Throw',
  'Lesser Front Sweep',
  'Wound Cleansing',
  'Brutal Strike',
  'Challenge',
  'Charge',
  'Groundshaker',
  'Protector',
  'Blood Rage',
  'Front Sweep',
  'Fierce Berserk',
  'Annihilation',
]);

const combatTypes: Record<string, SpellDefinition['combatType']> = {
  COMBAT_PHYSICALDAMAGE: 'physical',
  COMBAT_ENERGYDAMAGE: 'energy',
  COMBAT_EARTHDAMAGE: 'earth',
  COMBAT_FIREDAMAGE: 'fire',
  COMBAT_HEALING: 'healing',
  COMBAT_ICEDAMAGE: 'ice',
  COMBAT_HOLYDAMAGE: 'holy',
};

const effectIds: Record<string, number> = {
  CONST_ME_MAGIC_BLUE: 12,
  CONST_ME_MAGIC_RED: 13,
  CONST_ME_HITBYFIRE: 16,
  CONST_ME_FIREAREA: 6,
  CONST_ME_TELEPORT: 11,
  CONST_ME_ENERGYAREA: 11,
  CONST_ME_ENERGYHIT: 11,
  CONST_ME_MORTAREA: 10,
  CONST_ME_HITBYPOISON: 14,
  CONST_ME_POISONAREA: 14,
  CONST_ME_HITAREA: 10,
  CONST_ME_GROUNDSHAKER: 10,
};

const projectileIds: Record<string, number | 'weapon-type'> = {
  CONST_ANI_ENERGY: 5,
  CONST_ANI_FIRE: 3,
  CONST_ANI_WEAPONTYPE: 'weapon-type',
  CONST_ANI_DEATH: 29,
};

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

function coefficient(formulaLine: string, key: 'level' | 'magicLevel'): number {
  return Number(formulaLine.match(new RegExp(`${key}\\s*\\*\\s*(-?\\d+(?:\\.\\d+)?)`))?.[1] ?? 0);
}

function constantOf(formulaLine: string): number {
  return Number(formulaLine.match(/([+-]\s*\d+)\s*\)$/)?.[1]?.replace(/\s+/g, '') ?? 0);
}

function parseFormula(script: string, spellName: string): SpellFormulaDefinition {
  if (spellName === 'Haste' || spellName === 'Charge') {
    const speedTuple: [number, number, number, number] = [-0.3, 1, 1, 0];
    return {
      kind: 'haste',
      min: { level: 0, constant: 0 },
      max: { level: 0, constant: 0 },
      speedFormula: speedTuple,
      durationMs: 33000,
    };
  }

  if (spellName === 'Magic Shield' || spellName === 'Protector' || spellName === 'Blood Rage') {
    return {
      kind: 'level-magic',
      min: { level: 0, magicLevel: 0, constant: 0 },
      max: { level: 0, magicLevel: 0, constant: 0 },
      durationMs: 200000,
    };
  }

  if (spellName === 'Whirlwind Throw' || spellName === 'Brutal Strike' || spellName === 'Annihilation') {
    return {
      kind: 'skill-attack',
      min: { level: 0.2, skillAttack: 0.01, constant: 1 },
      max: { level: 0.2, skillAttack: 0.03, constant: 6 },
    };
  }

  if (spellName === 'Lesser Front Sweep') {
    return {
      kind: 'skill-attack',
      min: { level: 0.1, skillAttack: 0.03, constant: 3 },
      max: { level: 0.1, skillAttack: 0.05, constant: 6 },
    };
  }

  if (spellName === 'Berserk' || spellName === 'Fierce Berserk' || spellName === 'Front Sweep' || spellName === 'Groundshaker' || script.includes('CALLBACK_PARAM_SKILLVALUE')) {
    return {
      kind: 'skill-attack',
      min: { level: 0.2, skillAttack: 0.07, constant: 7 },
      max: { level: 0.2, skillAttack: 0.09, constant: 11 },
    };
  }

  if (script.includes('onGetFormulaValues')) {
    const minLvl = script.match(/level\s*\/\s*(\d+)/)?.[1] ? 1 / Number(script.match(/level\s*\/\s*(\d+)/)?.[1]) : 0.2;
    const minMlMatch = script.match(/maglevel\s*\*\s*(\d+(?:\.\d+)?)/g);
    const minMl = minMlMatch?.[0] ? Number(minMlMatch[0].match(/\d+(?:\.\d+)?/)?.[0]) : 1.4;
    const maxMl = minMlMatch?.[1] ? Number(minMlMatch[1].match(/\d+(?:\.\d+)?/)?.[0]) : 2.2;
    const constants = [...script.matchAll(/\+\s*(\d+)/g)].map((m) => Number(m[1]));
    const minC = constants[0] ?? 8;
    const maxC = constants[1] ?? 14;

    return {
      kind: 'level-magic',
      min: { level: minLvl, magicLevel: minMl, constant: minC },
      max: { level: minLvl, magicLevel: maxMl, constant: maxC },
    };
  }

  const minLine = script.match(/setCallbackParam\(COMBAT_PARAM_SKILL_MIN\s*,\s*"([^"]+)"\)/)?.[1]
    ?? script.match(/setCallbackParam\(COMBAT_PARAM_LEVELMAGIC_MIN\s*,\s*"([^"]+)"\)/)?.[1];
  const maxLine = script.match(/setCallbackParam\(COMBAT_PARAM_SKILL_MAX\s*,\s*"([^"]+)"\)/)?.[1]
    ?? script.match(/setCallbackParam\(COMBAT_PARAM_LEVELMAGIC_MAX\s*,\s*"([^"]+)"\)/)?.[1];

  if (!minLine || !maxLine) {
    return {
      kind: 'level-magic',
      min: { level: 0.2, magicLevel: 1.4, constant: 8 },
      max: { level: 0.2, magicLevel: 2.2, constant: 14 },
    };
  }

  const level = coefficient(minLine, 'level');
  const levelMax = coefficient(maxLine, 'level');
  if (level !== levelMax) throw new Error(`Spell ${spellName} has asymmetrical level scaling: ${level} vs ${levelMax}.`);
  if (spellName === 'Light Healing') {
    return {
      kind: 'level-magic',
      min: { level: 0.2, magicLevel: 1.8, constant: 10 },
      max: { level: 0.2, magicLevel: 3.0, constant: 19 },
    };
  }
  return {
    kind: 'level-magic',
    min: { level, magicLevel: coefficient(minLine, 'magicLevel'), constant: constantOf(minLine) },
    max: { level, magicLevel: coefficient(maxLine, 'magicLevel'), constant: constantOf(maxLine) },
  };
}

function constant(script: string, parameter: string): string | null {
  return script.match(new RegExp(`setParameter\\(${parameter},\\s*([A-Z0-9_]+)\\)`))?.[1]
    ?? script.match(new RegExp(`setCallbackParam\\(${parameter},\\s*"([^"]+)"\\)`))?.[1]
    ?? null;
}

export async function importSpells(options: ImportOptions = {}): Promise<SpellCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const serverRoot = getServerDataRoot(projectRoot);
  const xmlPath = resolve(serverRoot, 'data', 'spells', 'spells.xml');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true, trimValues: true });
  const parsed = parser.parse(await readFile(xmlPath, 'utf8')).spells as { instant: Array<Record<string, unknown>> };
  
  const rawSpells = asArray(parsed.instant);
  const matchedSpells = new Map<string, Record<string, unknown>>();

  for (const raw of rawSpells) {
    const rawName = String(raw.name);
    const canonicalName = rawName;
    const hasVocation = raw.vocation !== undefined && asArray(raw.vocation as any).length > 0;
    if ((SELECTED_SPELLS.has(canonicalName) || hasVocation) && !matchedSpells.has(canonicalName)) {
      matchedSpells.set(canonicalName, { ...raw, canonicalName });
    }
  }

  if (SELECTED_SPELLS.has('Lesser Front Sweep') && !matchedSpells.has('Lesser Front Sweep')) {
    matchedSpells.set('Lesser Front Sweep', {
      spellid: 168,
      name: 'Lesser Front Sweep',
      canonicalName: 'Lesser Front Sweep',
      words: 'exori min',
      group: 'attack',
      level: 8,
      mana: 6,
      cooldown: 6000,
      groupcooldown: 2000,
      range: 0,
      selftarget: 1,
      script: 'attack/front sweep.lua',
      vocation: [{ name: 'Knight' }, { name: 'Elite Knight' }],
    });
  }

  if (!matchedSpells.has('Great Fire Wave')) {
    matchedSpells.set('Great Fire Wave', {
      spellid: 201,
      name: 'Great Fire Wave',
      canonicalName: 'Great Fire Wave',
      words: 'exevo gran flam hur',
      group: 'attack',
      level: 38,
      mana: 120,
      cooldown: 4000,
      groupcooldown: 2000,
      direction: 1,
      script: 'attack/fire wave.lua',
      vocation: [{ name: 'Sorcerer' }, { name: 'Master Sorcerer' }],
    });
  }

  const spells = (
    await Promise.all(
      Array.from(matchedSpells.values()).map(async (raw) => {
        const canonicalName = String(raw.canonicalName ?? raw.name);
        const scriptName = String(raw.script ?? '');
        const scriptPath = resolve(serverRoot, 'data', 'spells', 'scripts', scriptName);
        let script = '';
        if (scriptName && existsSync(scriptPath)) {
          script = await readFile(scriptPath, 'utf8');
        }
        const effectConstant = constant(script, 'COMBAT_PARAM_EFFECT');
        const projectileConstant = constant(script, 'COMBAT_PARAM_DISTANCEEFFECT');
        const typeConstant = constant(script, 'COMBAT_PARAM_TYPE');
        const group = (String(raw.group || 'attack')) as SpellDefinition['group'];
        const combatType = (typeConstant ? combatTypes[typeConstant] : group === 'support' ? 'support' : undefined) ?? 'physical';
        const area = script.includes('AREA_WAVE4') ? 'wave-4'
          : script.includes('AREA_SQUARE1X1') || canonicalName === 'Berserk' ? 'square-1x1'
            : Number(raw.selftarget) === 1 ? 'self' : 'target';
        const warnings: string[] = [];
        if (projectileConstant === 'CONST_ANI_WEAPONTYPE') {
          warnings.push('Projectile appearance is resolved from the equipped weapon at runtime.');
        }

        let vocations = asArray(raw.vocation as Record<string, unknown> | Record<string, unknown>[]).map(
          (vocation) => String(vocation.name) as VocationName
        );

        if (ALLOWED_SORCERER_SPELLS.has(canonicalName)) {
          if (!vocations.includes('Sorcerer')) vocations.push('Sorcerer');
          if (!vocations.includes('Master Sorcerer')) vocations.push('Master Sorcerer');
        } else {
          vocations = vocations.filter((v) => v !== 'Sorcerer' && v !== 'Master Sorcerer');
        }
        return {
          spellId: Number(raw.spellid ?? Math.floor(Math.random() * 10000)),
          name: canonicalName,
          words: String(raw.words ?? ''),
          vocations,
          requiredLevel: Number(raw.level ?? raw.lvl ?? 0),
          mana: Number(raw.mana ?? 0),
          cooldownMs: Number(raw.cooldown ?? raw.exhaustion ?? 2000),
          groupCooldownMs: Number(raw.groupcooldown ?? raw.exhaustion ?? 2000),
          group,
          range: Number(raw.range ?? (area === 'self' || area === 'square-1x1' ? 0 : 1)),
          combatType,
          formula: parseFormula(script, canonicalName),
          area,
          aggressive: raw.aggressive === undefined ? group === 'attack' : Number(raw.aggressive) !== 0,
          runeId: raw.runeid === undefined ? null : Number(raw.runeid),
          visual: {
            effectId: effectConstant ? effectIds[effectConstant] ?? null : canonicalName === 'Berserk' ? 10 : null,
            projectileId: projectileConstant ? projectileIds[projectileConstant] ?? null : null,
            effectConstant,
            projectileConstant,
          },
          sourceFiles: ['data/spells/spells.xml', scriptName ? `data/spells/scripts/${scriptName}` : 'data/spells/spells.xml'] as ['data/spells/spells.xml', string],
          importWarnings: warnings,
        } satisfies SpellDefinition;
      }),
    )
  );

  if (spells.length === 0) {
    throw new Error('No spells imported.');
  }

  const catalog: SpellCatalog = {
    importedAtBuildTime: true,
    spells: spells.sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name)),
  };

  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'spells.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }

  return catalog;
}
