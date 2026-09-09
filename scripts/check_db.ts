import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../prisma/dev.db').replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${dbPath}`;

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const info: any = await prisma.$queryRawUnsafe('PRAGMA table_info(characters)');
  console.log(info.map((col: any) => col.name));
}

main().finally(() => prisma.$disconnect());
