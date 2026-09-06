import type { PrismaClient } from '@prisma/client';

export interface CreateCharacterInput {
  accountId: string;
  name: string;
  vocationId: number; // 1: Sorcerer, 2: Druid, 3: Paladin, 4: Knight
}

export interface VocationStarterConfig {
  vocationId: number;
  name: string;
  baseHp: number;
  baseMp: number;
  capacity: number;
  outfitLookType: number;
  spells: string[];
  skills: Array<{ skillId: number; skillName: string; value: number }>;
  equipment: Array<{ slot: string; serverId: number; name: string; count: number }>;
}

export const VOCATION_CONFIGS: Record<number, VocationStarterConfig> = {
  0: {
    vocationId: 0,
    name: 'None',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 128,
    spells: ['exura'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 10 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 0 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2382, name: 'Dagger', count: 1 },
      { slot: 'leftHand', serverId: 2512, name: 'Wooden Shield', count: 1 },
      { slot: 'armor', serverId: 2651, name: 'Jacket', count: 1 },
      { slot: 'legs', serverId: 2649, name: 'Leather Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  1: {
    vocationId: 1,
    name: 'Sorcerer',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 130,
    spells: ['exura', 'exevo-vis-hur'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 10 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 5 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2190, name: 'Wand of Vortex', count: 1 },
      { slot: 'leftHand', serverId: 2175, name: 'Spellbook', count: 1 },
      { slot: 'head', serverId: 8820, name: "Mage's Cap", count: 1 },
      { slot: 'armor', serverId: 8819, name: "Magician's Robe", count: 1 },
      { slot: 'legs', serverId: 2468, name: 'Studded Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  2: {
    vocationId: 2,
    name: 'Druid',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 130,
    spells: ['exura', 'exura-gran', 'exevo-tera-hur'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 10 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 5 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2182, name: 'Snakebite Rod', count: 1 },
      { slot: 'leftHand', serverId: 2175, name: 'Spellbook', count: 1 },
      { slot: 'head', serverId: 8820, name: "Mage's Cap", count: 1 },
      { slot: 'armor', serverId: 8819, name: "Magician's Robe", count: 1 },
      { slot: 'legs', serverId: 2468, name: 'Studded Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  3: {
    vocationId: 3,
    name: 'Paladin',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 129,
    spells: ['exura', 'exori-san'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 10 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 15 },
      { skillId: 5, skillName: 'Shielding', value: 12 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 1 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 2456, name: 'Bow', count: 1 },
      { slot: 'leftHand', serverId: 2544, name: 'Arrow', count: 100 },
      { slot: 'head', serverId: 2461, name: 'Leather Helmet', count: 1 },
      { slot: 'armor', serverId: 2467, name: 'Leather Armor', count: 1 },
      { slot: 'legs', serverId: 2649, name: 'Leather Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
  4: {
    vocationId: 4,
    name: 'Knight',
    baseHp: 150,
    baseMp: 35,
    capacity: 400,
    outfitLookType: 131,
    spells: ['exura-ico', 'exori', 'exori-ico'],
    skills: [
      { skillId: 0, skillName: 'Fist Fighting', value: 10 },
      { skillId: 1, skillName: 'Club Fighting', value: 10 },
      { skillId: 2, skillName: 'Sword Fighting', value: 15 },
      { skillId: 3, skillName: 'Axe Fighting', value: 10 },
      { skillId: 4, skillName: 'Distance Fighting', value: 10 },
      { skillId: 5, skillName: 'Shielding', value: 15 },
      { skillId: 6, skillName: 'Fishing', value: 10 },
      { skillId: 7, skillName: 'Magic Level', value: 1 },
    ],
    equipment: [
      { slot: 'rightHand', serverId: 8602, name: 'Jagged Sword', count: 1 },
      { slot: 'leftHand', serverId: 2509, name: 'Steel Shield', count: 1 },
      { slot: 'head', serverId: 2481, name: 'Soldier Helmet', count: 1 },
      { slot: 'armor', serverId: 2465, name: 'Brass Armor', count: 1 },
      { slot: 'legs', serverId: 2478, name: 'Brass Legs', count: 1 },
      { slot: 'boots', serverId: 2643, name: 'Leather Boots', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
    ],
  },
};

export const THAIS_TEMPLE_SPAWN = {
  posX: 32369,
  posY: 32241,
  posZ: 7,
  townId: 1,
};

export function validateCharacterName(name: string): boolean {
  if (!name || name.trim().length < 3 || name.trim().length > 20) {
    return false;
  }
  // Letters and single spaces between words only
  return /^[a-zA-Z]+( [a-zA-Z]+)*$/.test(name.trim());
}

export class CharacterService {
  constructor(private prisma: PrismaClient) {}

  async createCharacter(input: CreateCharacterInput) {
    const trimmedName = input.name.trim();
    if (!validateCharacterName(trimmedName)) {
      throw new Error('O nome do personagem deve ter entre 3 e 20 caracteres e conter apenas letras.');
    }

    const config = VOCATION_CONFIGS[input.vocationId];
    if (!config) {
      throw new Error('Vocação selecionada inválida.');
    }

    // Check account existence and character limit
    const account = await this.prisma.account.findUnique({
      where: { id: input.accountId },
      include: { characters: true },
    });

    if (!account) {
      throw new Error('Conta não encontrada.');
    }

    if (account.characters.length >= 6) {
      throw new Error('Limite máximo de 6 personagens por conta atingido.');
    }

    const existingChar = await this.prisma.character.findFirst({
      where: { name: { equals: trimmedName } },
    });

    if (existingChar) {
      throw new Error(`O nome "${trimmedName}" já está em uso por outro aventureiro.`);
    }

    // Create character with relational starter kit
    return this.prisma.character.create({
      data: {
        accountId: input.accountId,
        name: trimmedName,
        vocationId: config.vocationId,
        vocationName: config.name,
        level: 1,
        experience: BigInt(0),
        health: config.baseHp,
        maxHealth: config.baseHp,
        mana: config.baseMp,
        maxMana: config.baseMp,
        capacity: config.capacity,
        outfitLookType: config.outfitLookType,
        posX: THAIS_TEMPLE_SPAWN.posX,
        posY: THAIS_TEMPLE_SPAWN.posY,
        posZ: THAIS_TEMPLE_SPAWN.posZ,
        townId: THAIS_TEMPLE_SPAWN.townId,
        skills: {
          create: config.skills.map((s) => ({
            skillId: s.skillId,
            skillName: s.skillName,
            value: s.value,
            tries: BigInt(0),
          })),
        },
        inventory: {
          create: config.equipment.map((eq) => ({
            slot: eq.slot,
            serverId: eq.serverId,
            name: eq.name,
            count: eq.count,
            tier: 0,
          })),
        },
        spells: {
          create: config.spells.map((spellId) => ({
            spellId,
          })),
        },
      },
      include: {
        skills: true,
        inventory: true,
        spells: true,
      },
    });
  }

  async getCharactersByAccountId(accountId: string) {
    return this.prisma.character.findMany({
      where: { accountId },
      orderBy: { level: 'desc' },
      include: {
        skills: true,
        inventory: true,
        spells: true,
      },
    });
  }

  async getCharacterById(characterId: string) {
    return this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        account: { select: { id: true, email: true, role: true, isPremium: true } },
        skills: true,
        inventory: true,
        depot: true,
        spells: true,
      },
    });
  }

  async deleteCharacter(accountId: string, characterId: string) {
    const char = await this.prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!char || char.accountId !== accountId) {
      throw new Error('Personagem não encontrado ou você não tem permissão para deletá-lo.');
    }

    return this.prisma.character.delete({
      where: { id: characterId },
    });
  }

  async saveCharacterProgress(
    characterId: string,
    data: {
      level?: number;
      experience?: bigint;
      health?: number;
      maxHealth?: number;
      mana?: number;
      maxMana?: number;
      capacity?: number;
      posX?: number;
      posY?: number;
      posZ?: number;
      outfitLookType?: number;
      skills?: Array<{ skillId: number; skillName: string; value: number; tries?: bigint }>;
      inventory?: Array<{ slot: string; serverId: number; name: string; count: number }>;
    }
  ) {
    const updateData: any = {};
    if (data.level !== undefined) updateData.level = data.level;
    if (data.experience !== undefined) updateData.experience = data.experience;
    if (data.health !== undefined) updateData.health = data.health;
    if (data.maxHealth !== undefined) updateData.maxHealth = data.maxHealth;
    if (data.mana !== undefined) updateData.mana = data.mana;
    if (data.maxMana !== undefined) updateData.maxMana = data.maxMana;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.posX !== undefined) updateData.posX = data.posX;
    if (data.posY !== undefined) updateData.posY = data.posY;
    if (data.posZ !== undefined) updateData.posZ = data.posZ;
    if (data.outfitLookType !== undefined) updateData.outfitLookType = data.outfitLookType;

    // Update skills if provided
    if (data.skills && data.skills.length > 0) {
      for (const sk of data.skills) {
        await this.prisma.characterSkill.upsert({
          where: {
            characterId_skillId: {
              characterId,
              skillId: sk.skillId,
            },
          },
          update: {
            value: sk.value,
            tries: sk.tries !== undefined ? sk.tries : undefined,
          },
          create: {
            characterId,
            skillId: sk.skillId,
            skillName: sk.skillName,
            value: sk.value,
            tries: sk.tries !== undefined ? sk.tries : BigInt(0),
          },
        });
      }
    }

    // Update inventory items if provided
    if (data.inventory !== undefined) {
      await this.prisma.inventoryItem.deleteMany({
        where: { characterId },
      });
      if (data.inventory.length > 0) {
        await this.prisma.inventoryItem.createMany({
          data: data.inventory.map((eq) => ({
            characterId,
            slot: eq.slot,
            serverId: eq.serverId,
            name: eq.name,
            count: eq.count,
            tier: 0,
          })),
        });
      }
    }

    return this.prisma.character.update({
      where: { id: characterId },
      data: updateData,
      include: {
        skills: true,
        inventory: true,
        spells: true,
      },
    });
  }

  async calculateOfflineProgress(characterId: string): Promise<{ offlineSeconds: number; triesGained: number } | null> {
    const char = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: { skills: true },
    });
    if (!char) return null;

    const now = Date.now();
    const lastSaved = new Date(char.updatedAt).getTime();
    const offlineSeconds = Math.floor((now - lastSaved) / 1000);

    if (offlineSeconds < 60) return { offlineSeconds, triesGained: 0 };

    // Max 12 hours cap of offline progress (43,200 seconds)
    const cappedSeconds = Math.min(offlineSeconds, 43200);
    // Offline training rate: 1 try every 2 seconds
    const triesGained = Math.floor(cappedSeconds / 2);

    if (triesGained > 0 && char.skills.length > 0) {
      const primarySkill = char.skills.find((s) => s.skillId === 2 || s.skillId === 7) || char.skills[0];
      if (primarySkill) {
        const newTries = primarySkill.tries + BigInt(triesGained);
        let newValue = primarySkill.value;
        if (newTries >= BigInt(100)) {
          newValue += Math.floor(Number(newTries) / 100);
        }
        await this.prisma.characterSkill.update({
          where: { id: primarySkill.id },
          data: { tries: newTries, value: newValue },
        });
      }
    }

    await this.prisma.character.update({
      where: { id: characterId },
      data: { updatedAt: new Date() },
    });

    return { offlineSeconds, triesGained };
  }
}
