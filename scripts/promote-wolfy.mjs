import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wolfy = await prisma.character.findFirst({
    where: { name: 'Wolfy' },
    include: { account: true },
  });

  if (!wolfy) {
    throw new Error('Personagem Wolfy não encontrado no banco de dados!');
  }

  console.log('Encontrado Wolfy:', {
    id: wolfy.id,
    name: wolfy.name,
    accountId: wolfy.accountId,
    accountEmail: wolfy.account.email,
    currentRole: wolfy.account.role,
    currentAdminTitle: wolfy.adminTitle,
  });

  // 1. Promover a conta de Wolfy para ADMIN
  await prisma.account.update({
    where: { id: wolfy.accountId },
    data: { role: 'ADMIN' },
  });

  // 2. Atribuir o título GOD ao personagem Wolfy
  const updatedChar = await prisma.character.update({
    where: { id: wolfy.id },
    data: { adminTitle: 'GOD' },
    include: { account: true },
  });

  console.log('✅ Wolfy promovido com sucesso:', {
    characterName: updatedChar.name,
    adminTitle: updatedChar.adminTitle,
    accountEmail: updatedChar.account.email,
    accountRole: updatedChar.account.role,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
