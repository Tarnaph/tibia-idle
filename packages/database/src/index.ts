import { PrismaClient } from '@prisma/client';

let prismaGlobal: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient cannot be instantiated in browser environments');
  }

  if (!prismaGlobal) {
    prismaGlobal = new PrismaClient();
  }

  return prismaGlobal;
}

export const prisma = typeof window === 'undefined' ? getPrismaClient() : (null as unknown as PrismaClient);

export * from '@prisma/client';
