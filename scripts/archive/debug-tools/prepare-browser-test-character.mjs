import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  const email = 'browsere2e@cavebound.local';
  let acc = await prisma.account.findUnique({ where: { email } });
  const hash = await bcrypt.hash('testpass123', 10);
  if (!acc) {
    acc = await prisma.account.create({
      data: {
        email,
        passwordHash: hash,
        role: 'PLAYER',
        isPremium: true,
        coins: 100,
      }
    });
  }

  let char = await prisma.character.findFirst({ where: { accountId: acc.id, name: 'BrowserHero182' } });
  if (!char) {
    char = await prisma.character.create({
      data: {
        accountId: acc.id,
        name: 'BrowserHero182',
        vocationName: 'Knight',
        vocationId: 1,
        gender: 'male',
        level: 1,
        experience: 0n,
        health: 150,
        maxHealth: 150,
        mana: 0,
        maxMana: 0,
        capacity: 400,
        posX: 32369,
        posY: 32241,
        posZ: 7,
        saveVersion: 1,
      }
    });
  } else {
    // Reset to level 1, 0 XP
    await prisma.character.update({
      where: { id: char.id },
      data: {
        level: 1,
        experience: 0n,
        health: 150,
        maxHealth: 150,
        mana: 0,
        maxMana: 0,
        saveVersion: 1,
      }
    });
    // Remove any gold
    await prisma.characterInventory.deleteMany({ where: { characterId: char.id, slot: 'gold' } });
  }

  console.log('Test character ready:', char.name, 'ID:', char.id, 'Account:', email);
}

run().catch(console.error).finally(() => prisma.$disconnect());
