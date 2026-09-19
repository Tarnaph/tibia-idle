const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Pruning test characters and accounts ===');
  const allChars = await prisma.character.findMany({
    include: { account: true },
  });

  const testChars = allChars.filter((c) => {
    const name = (c.name || '').toLowerCase();
    const email = (c.account?.email || '').toLowerCase();
    return (
      name.includes('teste') ||
      name.includes('test') ||
      name.includes('browserhero') ||
      name.includes('atlashero') ||
      name.startsWith('dummy') ||
      email.includes('teste@') ||
      email.includes('browsere2e') ||
      email.includes('test@') ||
      email.includes('e2e')
    );
  });

  console.log(`Found ${testChars.length} test character(s) to remove:`);
  for (const c of testChars) {
    console.log(`- Deleting character: "${c.name}" (id: ${c.id}, email: "${c.account?.email}")`);
    await prisma.character.delete({ where: { id: c.id } });
  }

  // Remove orphaned test accounts
  const testAccounts = await prisma.account.findMany({
    where: {
      OR: [
        { email: { contains: 'teste@' } },
        { email: { contains: 'browsere2e' } },
        { email: { contains: 'test@' } },
        { email: { contains: 'e2e' } },
      ],
    },
    include: { characters: true },
  });

  for (const acc of testAccounts) {
    if (acc.characters.length === 0) {
      console.log(`- Deleting empty test account: "${acc.email}" (id: ${acc.id})`);
      await prisma.account.delete({ where: { id: acc.id } });
    }
  }

  const remaining = await prisma.character.findMany({
    select: { id: true, name: true, level: true, vocationName: true, account: { select: { email: true } } },
  });
  console.log(`=== Remaining real characters: ${remaining.length} ===`);
  for (const r of remaining) {
    console.log(`  * ${r.name} (Lv. ${r.level} ${r.vocationName}) - ${r.account?.email}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
