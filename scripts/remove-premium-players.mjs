import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== ATUALIZANDO STATUS PREMIUM DAS CONTAS ===');

  const accounts = await prisma.account.findMany({
    include: {
      characters: {
        select: {
          name: true,
          adminTitle: true,
        },
      },
    },
  });

  console.log(`Total de contas encontradas: ${accounts.length}`);

  let updatedCount = 0;
  let adminCount = 0;

  for (const acc of accounts) {
    const isStaffAccount =
      acc.role === 'ADMIN' ||
      acc.characters.some((c) => c.adminTitle === 'GOD' || c.adminTitle === 'GM');

    if (isStaffAccount) {
      adminCount++;
      // Garante que a conta Admin/Staff permaneça como Premium
      if (!acc.isPremium) {
        await prisma.account.update({
          where: { id: acc.id },
          data: { isPremium: true },
        });
      }
      console.log(`[STAFF/ADMIN PRESERVADO] ${acc.email} (Role: ${acc.role}, Chars: ${acc.characters.map((c) => c.name + (c.adminTitle ? ` [${c.adminTitle}]` : '')).join(', ')}) -> isPremium: true`);
    } else {
      // Jogador normal: retira o premium
      if (acc.isPremium) {
        await prisma.account.update({
          where: { id: acc.id },
          data: { isPremium: false },
        });
        updatedCount++;
        console.log(`[PREMIUM REMOVIDO] ${acc.email} (Chars: ${acc.characters.map((c) => c.name).join(', ')}) -> isPremium: false`);
      } else {
        console.log(`[JÁ FREE] ${acc.email}`);
      }
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Resultado: ${updatedCount} contas de players tiveram o Premium retirado.`);
  console.log(`Total de ${adminCount} contas de Admin/Staff foram mantidas com Premium ativo.`);
}

main()
  .catch((err) => {
    console.error('Erro na execução:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
