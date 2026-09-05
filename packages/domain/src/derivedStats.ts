import type { EquipmentDefinition, VocationDefinition } from '../../content-schema/src';
import type { CharacterSkills, CharacterState, TrainableSkill } from './types';
import { findEquipment } from './equipment';

export interface DerivedStats {
  attack: number;
  defense: number;
  armor: number;
  activeSkill: TrainableSkill;
  activeSkillLevel: number;
  weaponAttack: number;
  defenseValue: number;
  effectiveSkills: CharacterSkills;
  weaponName: string;
}

export function getEquippedItems(
  character: CharacterState,
  catalog: EquipmentDefinition[],
): EquipmentDefinition[] {
  const ids = new Set(Object.values(character.equipment).filter((id): id is number => id !== null));
  return [...ids].flatMap((id) => {
    const item = findEquipment(catalog, id);
    return item ? [item] : [];
  });
}

function effectiveSkills(character: CharacterState, items: EquipmentDefinition[]): CharacterSkills {
  const result = { ...character.skills };
  for (const item of items) {
    for (const [skill, bonus] of Object.entries(item.skillBonuses)) {
      if (skill in result && typeof bonus === 'number') {
        const key = skill as keyof CharacterSkills;
        result[key] += bonus;
      }
    }
    if (item.magicLevelBonus !== null) result.magicLevel += item.magicLevelBonus;
  }
  return result;
}

function activeWeapon(items: EquipmentDefinition[]): EquipmentDefinition | undefined {
  return items.find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));
}

function skillForWeapon(character: CharacterState, weapon: EquipmentDefinition | undefined): TrainableSkill {
  if (weapon?.weaponType === 'sword') return 'sword';
  if (weapon?.weaponType === 'axe') return 'axe';
  if (weapon?.weaponType === 'club') return 'club';
  if (weapon?.weaponType === 'distance') return 'distance';
  if (weapon?.weaponType === 'wand' || character.baseVocation === 'Sorcerer' || character.baseVocation === 'Druid') return 'magicLevel';
  return 'fist';
}

export function deriveStats(
  character: CharacterState,
  catalog: EquipmentDefinition[],
  vocation: VocationDefinition,
): DerivedStats {
  const items = getEquippedItems(character, catalog);
  const skills = effectiveSkills(character, items);
  const weapon = activeWeapon(items);
  const shield = items
    .filter((item) => item.weaponType === 'shield')
    .sort((left, right) => right.defense - left.defense)[0];
  const activeSkill = skillForWeapon(character, weapon);
  const activeSkillLevel = skills[activeSkill];
  const weaponAttack = weapon?.weaponType === 'wand'
    ? Math.max(13, weapon?.attack || 13)
    : weapon?.attack ?? 7;
  const attackFactor = 1;

  const baseMaxDamage = Math.round(
    character.level / 5 + ((((activeSkillLevel / 4) + 1) * (weaponAttack / 3)) * 1.03) / attackFactor,
  );
  const damageMultiplier = weapon?.weaponType === 'distance'
    ? vocation.distanceDamageMultiplier
    : weapon?.weaponType === 'wand'
    ? 1.0
    : vocation.meleeDamageMultiplier;
  const attack = Math.trunc(baseMaxDamage * damageMultiplier);

  let defenseSkill = activeSkill === 'magicLevel' ? skills.shielding : activeSkillLevel;
  let defenseValue = weapon ? weapon.defense + weapon.extraDefense : 7;
  if (shield) {
    defenseSkill = skills.shielding;
    defenseValue = shield.defense + (weapon?.extraDefense ?? 0);
  }
  const defenseFactor = 1;
  const defense = Math.trunc(
    ((defenseSkill / 4) + 2.23) * defenseValue * 0.15 * defenseFactor * vocation.defenseMultiplier,
  );
  const armor = Math.trunc(
    items.reduce((total, item) => total + item.armor, 0) * vocation.armorMultiplier,
  );

  return {
    attack,
    defense,
    armor,
    activeSkill,
    activeSkillLevel,
    weaponAttack,
    defenseValue,
    effectiveSkills: skills,
    weaponName: weapon?.name ?? 'fists',
  };
}
