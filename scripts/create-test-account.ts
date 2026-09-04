import { prisma } from '../packages/database/src/index.ts';
import { AccountService, CharacterService } from '../packages/auth/src/index.ts';

async function main() {
  const email = 'teste@teste.com';
  const password = 'qweqwe';

  console.log(`[Script] Tentando criar conta ${email}...`);

  const accountService = new AccountService(prisma);
  const characterService = new CharacterService(prisma);

  try {
    // Check if account already exists
    const existing = await prisma.account.findUnique({ where: { email } });
    let accountId: string;

    if (existing) {
      console.log(`[Script] Conta ${email} já existe (ID: ${existing.id}).`);
      accountId = existing.id;
    } else {
      const authResult = await accountService.register({
        email,
        password,
        role: 'admin',
      });
      console.log(`[Script] Conta criada com sucesso! ID: ${authResult.account.id}`);
      accountId = authResult.account.id;
    }

    // Check if character exists
    const chars = await characterService.getCharactersByAccountId(accountId);
    if (chars.length === 0) {
      const char = await characterService.createCharacter({
        accountId,
        name: 'Knight Teste',
        vocationId: 1, // Knight
      });
      console.log(`[Script] Personagem 'Knight Teste' criado com sucesso! ID: ${char.id}`);
    } else {
      console.log(`[Script] Conta já possui ${chars.length} personagem(ns): ${chars.map((c) => c.name).join(', ')}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error(`[Script] Erro ao criar conta/personagem:`, err.message || err);
    process.exit(1);
  }
}

main();
