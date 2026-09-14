-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- AlterTable
ALTER TABLE "characters" ADD COLUMN "saveVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "characters" ADD COLUMN "lastSavedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
