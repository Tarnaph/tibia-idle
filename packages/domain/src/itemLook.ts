import type { EquipmentDefinition, EquipmentSkill } from '../../content-schema/src/index.ts';

export interface FormattedItemLook {
  title: string;
  lines: string[];
  canonicalText: string;
  vocationNames: string[];
  minLevel?: number;
  weightOunces?: number;
  description?: string;
  twoHanded?: boolean;
}

export interface ItemLookInput {
  id?: number;
  name?: string;
  article?: string;
  description?: string;
  attack?: number;
  defense?: number;
  extraDefense?: number;
  armor?: number;
  range?: number;
  weaponType?: string;
  slot?: string;
  twoHanded?: boolean;
  weight?: { hundredthsOfOunce: number; ounces: number } | null;
  weightOunces?: number;
  requirements?: { level?: number; magicLevel?: number; vocations?: string[] };
  skillBonuses?: Partial<Record<EquipmentSkill, number>>;
  magicLevelBonus?: number | null;
  elementalAbsorption?: Record<string, number>;
  amount?: number;
}

function getArticleForName(name: string, article?: string): string {
  if (article) return article;
  const firstChar = name.trim().charAt(0).toLowerCase();
  if (['a', 'e', 'i', 'o', 'u'].includes(firstChar)) {
    return 'an';
  }
  return 'a';
}

function formatVocationsRequirement(vocations: string[], level?: number): string {
  const normalized = vocations.map((v) => v.toLowerCase().replace(/^(elite|royal|master|elder)\s+/, ''));
  const uniqueVocations = Array.from(new Set(normalized));

  let vocText = 'players';
  const hasKnight = uniqueVocations.includes('knight');
  const hasPaladin = uniqueVocations.includes('paladin');
  const hasSorcerer = uniqueVocations.includes('sorcerer');
  const hasDruid = uniqueVocations.includes('druid');

  if (hasKnight && hasPaladin && hasSorcerer && hasDruid) {
    vocText = 'players';
  } else if (hasKnight && hasPaladin && !hasSorcerer && !hasDruid) {
    vocText = 'knights and paladins';
  } else if (!hasKnight && !hasPaladin && hasSorcerer && hasDruid) {
    vocText = 'sorcerers and druids';
  } else if (hasKnight && !hasPaladin && !hasSorcerer && !hasDruid) {
    vocText = 'knights';
  } else if (!hasKnight && hasPaladin && !hasSorcerer && !hasDruid) {
    vocText = 'paladins';
  } else if (!hasKnight && !hasPaladin && hasSorcerer && !hasDruid) {
    vocText = 'sorcerers';
  } else if (!hasKnight && !hasPaladin && !hasSorcerer && hasDruid) {
    vocText = 'druids';
  } else if (uniqueVocations.length > 0) {
    vocText = uniqueVocations.join('s and ') + 's';
  }

  if (level && level > 0) {
    return `It can only be wielded properly by ${vocText} of level ${level} or higher.`;
  }
  return `It can only be wielded properly by ${vocText}.`;
}

export function formatTibiaLookText(
  item: ItemLookInput | EquipmentDefinition,
  amountOverride?: number,
): FormattedItemLook {
  const input = item as ItemLookInput;
  const name = item.name || 'unnamed item';
  const amount = amountOverride ?? input.amount ?? 1;
  const attack = item.attack ?? 0;
  const defense = item.defense ?? 0;
  const extraDefense = item.extraDefense ?? 0;
  const armor = item.armor ?? 0;
  const range = item.range ?? 1;
  const isDistance = item.weaponType === 'distance' || item.slot === 'ammo';
  const twoHanded = Boolean(item.twoHanded);

  // 1. Title with Article and Stats
  const statParts: string[] = [];
  if (range > 1 && attack > 0) {
    statParts.push(`Range:${range}`);
    statParts.push(`Atk:${attack}`);
  } else if (attack > 0 && defense > 0) {
    statParts.push(`Atk:${attack}`);
    let defStr = `Def:${defense}`;
    if (extraDefense > 0) defStr += ` +${extraDefense}`;
    else if (extraDefense < 0) defStr += ` ${extraDefense}`;
    statParts.push(defStr);
  } else if (attack > 0) {
    statParts.push(`Atk:${attack}`);
  } else if (defense > 0) {
    let defStr = `Def:${defense}`;
    if (extraDefense > 0) defStr += ` +${extraDefense}`;
    else if (extraDefense < 0) defStr += ` ${extraDefense}`;
    statParts.push(defStr);
  }

  if (armor > 0) {
    statParts.push(`Arm:${armor}`);
  }

  const statClause = statParts.length > 0 ? ` (${statParts.join(', ')})` : '';
  let title = '';

  if (amount > 1) {
    title = `You see ${amount} ${name.endsWith('s') ? name : `${name}s`}${statClause}.`;
  } else {
    const art = getArticleForName(name, item.article);
    title = `You see ${art ? `${art} ` : ''}${name}${statClause}.`;
  }

  const lines: string[] = [];

  // 2. Skill bonuses & Magic Level
  const bonusParts: string[] = [];
  if (item.skillBonuses) {
    for (const [skill, val] of Object.entries(item.skillBonuses)) {
      if (typeof val === 'number' && val !== 0) {
        const sign = val > 0 ? `+${val}` : `${val}`;
        const skillName = skill === 'shielding' ? 'shielding' : `${skill} fighting`;
        bonusParts.push(`${skillName} ${sign}`);
      }
    }
  }
  if (item.magicLevelBonus) {
    const sign = item.magicLevelBonus > 0 ? `+${item.magicLevelBonus}` : `${item.magicLevelBonus}`;
    bonusParts.push(`magic level ${sign}`);
  }
  if (bonusParts.length > 0) {
    lines.push(`It increases ${bonusParts.join(', ')}.`);
  }

  // 3. Vocation and Level Requirements
  const reqs = item.requirements;
  const vocations = reqs?.vocations ?? [];
  const minLevel = reqs?.level;

  if ((vocations.length > 0) || (minLevel !== undefined && minLevel > 0)) {
    lines.push(formatVocationsRequirement(vocations, minLevel));
  }

  // 4. Canonical XML Description
  const description = item.description?.trim();
  if (description) {
    lines.push(description);
  }

  // 5. Weight
  const weightOz =
    item.weight?.ounces ??
    (item.weight?.hundredthsOfOunce ? item.weight.hundredthsOfOunce / 100 : undefined) ??
    input.weightOunces;

  if (weightOz !== undefined && weightOz > 0) {
    const totalWeight = (weightOz * (amount > 0 ? amount : 1)).toFixed(2);
    lines.push(`It weighs ${totalWeight} oz.`);
  }

  const canonicalText = [title, ...lines].join(' ');

  return {
    title,
    lines,
    canonicalText,
    vocationNames: vocations,
    minLevel,
    weightOunces: weightOz,
    description,
    twoHanded,
  };
}
