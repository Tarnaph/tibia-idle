import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const characters = await prisma.character.findMany({
    where: {
      name: {
        contains: 'Wolfy',
      },
    },
    include: {
      account: true,
    },
  });

  console.log('Characters found matching Wolfy:', JSON.stringify(characters, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  if (characters.length === 0) {
    const all = await prisma.character.findMany({
      take: 10,
      select: { id: true, name: true, accountId: true, account: { select: { id: true, email: true, role: true } } },
    });
    console.log('Sample characters in db:', JSON.stringify(all, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
