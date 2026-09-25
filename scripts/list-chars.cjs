const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chars = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      vocationName: true,
      adminTitle: true,
      account: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Total characters:', chars.length);
  for (const c of chars) {
    console.log(`[${c.id}] name: "${c.name}", level: ${c.level}, voc: "${c.vocationName}", admin: ${c.adminTitle}, email: "${c.account?.email}", role: "${c.account?.role}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
