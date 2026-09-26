import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const wolfy = await prisma.character.findFirst({
    where: { name: 'Wolfy' },
    include: { account: true }
  });
  console.log('Wolfy character:');
  console.log({
    id: wolfy?.id,
    name: wolfy?.name,
    level: wolfy?.level,
    vocation: wolfy?.vocation,
    gender: wolfy?.gender,
    outfit: wolfy?.outfit,
    mount: wolfy?.mount,
    mountActive: wolfy?.mountActive,
    adminTitle: wolfy?.adminTitle,
    inHunt: wolfy?.inHunt,
    posX: wolfy?.posX,
    posY: wolfy?.posY,
    posZ: wolfy?.posZ,
    accountEmail: wolfy?.account?.email,
    accountRole: wolfy?.account?.role,
  });
}

main().finally(() => prisma.$disconnect());
