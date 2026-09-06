import type { EquipmentDefinition, VocationDefinition } from '../../content-schema/src';
import type { CharacterSkills, CharacterState, TrainableSkill } from './types';
import { findEquipment } from './equipment';

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

  // Skill-based physical speed & interval reductions (uses character's highest physical fighting skill)
  const physicalSkillLevel = Math.max(skills.sword, skills.axe, skills.club, skills.distance, skills.fist);

  const attackSpeedBonusPercent = Number((physicalSkillLevel * 0.4).toFixed(1));
  const attackIntervalMs = Math.max(1000, Math.round(vocation.attackSpeedMs * (1 - attackSpeedBonusPercent / 100)));
  const movementSpeedBonus = Math.floor(physicalSkillLevel * 0.8);

  // Magic level & shielding resistance/mitigation
  const magicDamageResistancePercent = Number(Math.min(40, skills.magicLevel * 0.4).toFixed(1));
  const physicalDamageMitigationPercent = Number(Math.min(30, skills.shielding * 0.3).toFixed(1));

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

