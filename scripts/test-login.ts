import { prisma } from '../packages/database/src/index.ts';
import { AccountService } from '../packages/auth/src/index.ts';

async function testLogin() {
  const accountService = new AccountService(prisma);
  try {
    const result = await accountService.login({
      email: 'teste@teste.com',
      password: 'qweqwe',
    });
    console.log('[TestLogin SUCCESS]:', result);
  } catch (err: any) {
    console.error('[TestLogin FAILED]:', err.message || err);
  }
}

testLogin();
