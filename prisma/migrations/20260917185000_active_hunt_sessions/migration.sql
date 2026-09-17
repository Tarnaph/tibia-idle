-- AlterTable
ALTER TABLE "characters" ADD COLUMN "isHunting" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "active_hunt_sessions" (
    "characterId" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "huntId" TEXT NOT NULL,
    "isHunting" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
