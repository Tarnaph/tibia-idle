import type { EquipmentDefinition, VocationDefinition } from '../../content-schema/src';
import type { CharacterEquipmentSlot, CharacterSkills, CharacterState, TrainableSkill } from './types';
import { findEquipment } from './equipment';
import { findWandDefinition } from './wands';
import { calculateImbuementBonuses, type ActiveImbuementSlot, type AggregatedImbuementBonuses } from './imbuements';

export interface SkillTooltipInfo {
  name: string;
  level: number;
  description: string;
  currentPerks: string[];
  nextLevelPerks: string[];
}

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
  attackSpeedBonusPercent: number;
  attackIntervalMs: number;
  movementSpeedBonus: number;
  magicDamageResistancePercent: number;
  physicalDamageMitigationPercent: number;
  imbuementBonuses?: AggregatedImbuementBonuses;
  lifeLeechPercent?: number;
  manaLeechPercent?: number;
  criticalDamagePercent?: number;
  criticalChancePercent?: number;
  elementalProtections?: {
    earth: number;
    fire: number;
    ice: number;
    energy: number;
    death: number;
    holy: number;
  };
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

function effectiveSkills(
  character: CharacterState,
  items: EquipmentDefinition[],
  imbuementBonuses?: AggregatedImbuementBonuses,
): CharacterSkills {
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
  if (imbuementBonuses) {
    result.sword += imbuementBonuses.skillSword;
    result.axe += imbuementBonuses.skillAxe;
    result.club += imbuementBonuses.skillClub;
    result.distance += imbuementBonuses.skillDist;
    result.shielding += imbuementBonuses.skillShield;
    result.magicLevel += imbuementBonuses.magicLevel;
  }
  return result;
}

function activeWeapon(items: EquipmentDefinition[]): EquipmentDefinition | undefined {
  return items.find((item) => ['sword', 'axe', 'club', 'distance', 'wand'].includes(item.weaponType));
}

export function skillForWeapon(character: CharacterState, weapon: EquipmentDefinition | undefined): TrainableSkill {
  if (weapon) {
    const wandDef = findWandDefinition(weapon.id);
    if (wandDef || weapon.weaponType === 'wand') return 'magicLevel';
  }
  if (weapon?.weaponType === 'sword') return 'sword';
  if (weapon?.weaponType === 'axe') return 'axe';
  if (weapon?.weaponType === 'club') return 'club';
  if (weapon?.weaponType === 'distance') return 'distance';
  if (character.baseVocation === 'Sorcerer' || character.baseVocation === 'Druid') return 'magicLevel';
  return 'fist';
}

export function deriveStats(
  character: CharacterState,
  catalog: EquipmentDefinition[],
  vocation: VocationDefinition,
  customAttributes?: Partial<Record<CharacterEquipmentSlot, any>>,
): DerivedStats {
  const items = getEquippedItems(character, catalog);

  // Extrair imbuements ativos exclusivamente dos slots que estão atualmente equipados
  const activeImbuements: ActiveImbuementSlot[] = [];
  const attributesSource = customAttributes || character.equipmentAttributes;
  if (attributesSource) {
    for (const [slot, attr] of Object.entries(attributesSource)) {
      if (character.equipment[slot as CharacterEquipmentSlot] && attr && Array.isArray(attr.imbuements)) {
        activeImbuements.push(...attr.imbuements);
      }
    }
  }
  const imbuementBonuses = calculateImbuementBonuses(activeImbuements);
  const skills = effectiveSkills(character, items, imbuementBonuses);
  const weapon = activeWeapon(items);
  const wandDef = weapon ? findWandDefinition(weapon.id) : undefined;
  const isWand = Boolean(wandDef || weapon?.weaponType === 'wand');
  const shield = items
    .filter((item) => item.weaponType === 'shield')
    .sort((left, right) => right.defense - left.defense)[0];
  const activeSkill = skillForWeapon(character, weapon);
  const activeSkillLevel = skills[activeSkill];
  const weaponAttack = wandDef
    ? Math.max(wandDef.max, 13)
    : isWand
    ? Math.max(13, weapon?.attack || 13)
    : weapon?.attack ?? 7;
  const attackFactor = 1;

  const baseMaxDamage = isWand
    ? Math.round((wandDef?.max ?? 18) + (activeSkillLevel * 0.6) + (character.level / 5))
    : Math.round(
        character.level / 5 + ((((activeSkillLevel / 4) + 1) * (weaponAttack / 3)) * 1.03) / attackFactor,
      );
  const damageMultiplier = weapon?.weaponType === 'distance'
    ? vocation.distanceDamageMultiplier
    : isWand
    ? 1.0
    : vocation.meleeDamageMultiplier;
  const attack = Math.trunc(baseMaxDamage * damageMultiplier);

  let defenseSkill = activeSkill === 'magicLevel' ? skills.shielding : activeSkillLevel;
  let defenseValue = weapon ? weapon.defense + weapon.extraDefense : 0;
  if (shield) {
    defenseSkill = skills.shielding;
    defenseValue = shield.defense + (weapon?.extraDefense ?? 0);
  }

  // Fórmula autêntica de bloqueio de escudo do Tibia (CipSoft / TFS 1.x):
  // maxDefBlock = (skill * (defense * 0.05)) + (defense * 0.04)
  const defense = (!shield && !weapon) || defenseValue <= 0
    ? 0
    : Math.max(1, Math.round(((defenseSkill * (defenseValue * 0.05)) + (defenseValue * 0.04)) * vocation.defenseMultiplier));
  const armor = items.reduce((acc, item) => acc + item.armor, 0);

  const activeWeaponSkill = skills[activeSkill];
  const attackSpeedBonusPercent = Number(Math.min(50, activeWeaponSkill * 0.4).toFixed(1));
  const attackIntervalMs = Math.round(2000 / (1 + attackSpeedBonusPercent / 100));

  const movementSpeedBonus = (character.skills.fist * 0.25) + imbuementBonuses.speed;
  const magicDamageResistancePercent = Number(Math.min(25, skills.magicLevel * 0.5).toFixed(1));
  const itemPhysicalProtection = items.reduce((acc, item) => acc + (item.elementalAbsorption?.physical ?? 0), 0);
  const physicalDamageMitigationPercent = Number(Math.min(50, itemPhysicalProtection).toFixed(1));


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
    attackSpeedBonusPercent,
    attackIntervalMs,
    movementSpeedBonus,
    magicDamageResistancePercent,
    physicalDamageMitigationPercent,
    imbuementBonuses,
    lifeLeechPercent: imbuementBonuses.lifeLeechPercent,
    manaLeechPercent: imbuementBonuses.manaLeechPercent,
    criticalDamagePercent: imbuementBonuses.criticalDamagePercent,
    criticalChancePercent: imbuementBonuses.criticalChancePercent,
    elementalProtections: imbuementBonuses.elementalProtections,
  };
}

export function getSkillTooltipInfo(
  skills: CharacterSkills,
  skillName: keyof CharacterSkills | 'fishing' | 'level',
  level = 1,
): SkillTooltipInfo {
  const currentVal = skillName === 'level' ? level : skillName === 'fishing' ? (skills.fishing ?? 10) : skills[skillName];
  const nextVal = currentVal + 1;

  switch (skillName) {
    case 'level':
      return {
        name: 'Level',
        level: currentVal,
        description: 'Define o nível do personagem, aumentando a vida, mana, capacidade e poder total de combate.',
        currentPerks: [
          `+${currentVal * 2} Vel. de Movimento base`,
          `+${Math.round(currentVal / 5)} Dano físico mínimo em ataques`,
          `Desbloqueia magias e equipamentos mais poderosos`,
        ],
        nextLevelPerks: [
          `+2 Vel. de Movimento`,
          `+1/5 de Dano base adicional`,
          `Aumenta HP/MP máximos`,
        ],
      };
    case 'magicLevel': {
      const currentRes = (currentVal * 0.4).toFixed(1);
      const nextRes = (nextVal * 0.4).toFixed(1);
      return {
        name: 'Magic Level',
        level: currentVal,
        description: 'Aumenta a potência de magias, runas, cura e concede resistência contra danos mágicos.',
        currentPerks: [
          `+${currentRes}% Resistência Mágica e Elemental`,
          `+${(currentVal * 1.5).toFixed(0)}% Poder em Magias de Dano/Cura`,
          `Desbloqueia runas e magias avançadas`,
        ],
        nextLevelPerks: [
          `+0.4% Resistência Mágica`,
          `+1.5% Poder Mágico adicional`,
        ],
      };
    }
    case 'shielding': {
      const currentMit = (currentVal * 0.3).toFixed(1);
      const nextMit = (nextVal * 0.3).toFixed(1);
      return {
        name: 'Shielding',
        level: currentVal,
        description: 'Determina a eficiência no uso de escudos e reduz o dano físico sofrido em combate.',
        currentPerks: [
          `+${currentMit}% Mitigação Passiva de Dano Físico`,
          `+${Math.round(currentVal * 0.38)} Defesa Total com Escudo`,
          `Absorve golpes corporais de múltiplos monstros`,
        ],
        nextLevelPerks: [
          `+0.3% Mitigação de Dano Físico`,
          `+0.38 de Defesa com Escudo`,
        ],
      };
    }
    case 'sword':
    case 'axe':
    case 'club':
    case 'distance': {
      const labelMap = { sword: 'Sword Fighting', axe: 'Axe Fighting', club: 'Club Fighting', distance: 'Distance Fighting' };
      const currentSpd = (currentVal * 0.4).toFixed(1);
      const currentMov = Math.floor(currentVal * 0.8);
      const nextMov = Math.floor(nextVal * 0.8);
      return {
        name: labelMap[skillName],
        level: currentVal,
        description: `Especialização de combate físico. Concede velocidade de ataque, movimentação e dano com armas do tipo ${skillName}.`,
        currentPerks: [
          `+${currentSpd}% Velocidade de Ataque (-${(currentVal * 8).toFixed(0)}ms de intervalo)`,
          `+${currentMov} Velocidade de Movimentação em combate`,
          `+${Math.round(currentVal * 0.8)} Dano Físico Máximo`,
        ],
        nextLevelPerks: [
          `+0.4% Velocidade de Ataque`,
          `+${nextMov - currentMov > 0 ? '1' : '0'} Vel. de Movimento`,
          `+0.8 Dano Físico Máximo`,
        ],
      };
    }
    case 'fist': {
      const currentSpd = (currentVal * 0.4).toFixed(1);
      const currentMov = Math.floor(currentVal * 0.8);
      return {
        name: 'Fist Fighting',
        level: currentVal,
        description: 'Arte de combate desarmado. Concede agilidade, velocidade de ataque, esquiva e defesa corporal.',
        currentPerks: [
          `+${currentSpd}% Velocidade de Ataque Desarmado`,
          `+${currentMov} Velocidade de Movimentação`,
          `+${Math.round(currentVal * 0.4)} Defesa sem Escudo`,
        ],
        nextLevelPerks: [
          `+0.4% Velocidade de Ataque`,
          `+0.4 Defesa Desarmada`,
        ],
      };
    }
    case 'fishing':
      return {
        name: 'Fishing',
        level: currentVal,
        description: 'Habilidade de pesca e coleta de peixes em águas.',
        currentPerks: [
          `Habilidade de Pesca Nível ${currentVal}`,
          `Chance de apanhar peixes raros em águas de Thais`,
        ],
        nextLevelPerks: [
          `+1 Nível de Pesca`,
          `Maior taxa de sucesso ao pescar`,
        ],
      };
  }
}

