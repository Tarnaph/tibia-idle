import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../prisma/dev.db').replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${dbPath}`;

import { PrismaClient } from '@prisma/client';
import { experienceForLevel, levelForExperience } from '../packages/domain/src/experience';

const prisma = new PrismaClient();

async function main() {
  console.log('[RECONCILE] Inspecting database characters for level/experience consistency...');
  const characters = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      experience: true,
    },
  });

  let reconciledCount = 0;

  for (const c of characters) {
    const originalLevel = c.level || 1;
    const originalExp = Number(c.experience ?? 0);

    const levelFromExp = levelForExperience(originalExp);
    const targetLevel = Math.max(originalLevel, levelFromExp);
    const targetExp = Math.max(originalExp, experienceForLevel(targetLevel));

    if (targetLevel !== originalLevel || targetExp !== originalExp) {
      await prisma.character.update({
        where: { id: c.id },
        data: {
          level: targetLevel,
          experience: BigInt(targetExp),
        },
      });

      console.log(
        `[RECONCILE] Updated "${c.name}": Level ${originalLevel} -> ${targetLevel}, Experience ${originalExp} -> ${targetExp}`
      );
      reconciledCount++;
    } else {
      console.log(`[RECONCILE] "${c.name}" is already consistent (Level ${originalLevel}, Exp ${originalExp}).`);
    }
  }

  console.log(`[RECONCILE] Completed! ${reconciledCount} characters updated.`);
}

main()
  .catch((err) => {
    console.error('[RECONCILE] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
