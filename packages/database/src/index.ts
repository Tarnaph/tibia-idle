if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = '/';
}

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPragmasConfigured?: boolean;
};

export function getPrismaClient(): PrismaClient {
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient cannot be instantiated in browser environments');
  }

  if (!globalForPrisma.prisma) {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./dev.db';
    }
    const client = new PrismaClient();

    // Configure SQLite for resilient concurrency, WAL mode and 10s busy timeout
    if (!globalForPrisma.prismaPragmasConfigured) {
      globalForPrisma.prismaPragmasConfigured = true;
      void (async () => {
        try {
          await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
          await client.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
          await client.$queryRawUnsafe('PRAGMA busy_timeout = 10000;');
        } catch {}
      })();
    }

    globalForPrisma.prisma = client;
  }

  return globalForPrisma.prisma;
}

export const prisma = typeof window === 'undefined' ? getPrismaClient() : (null as unknown as PrismaClient);

export * from '@prisma/client';
