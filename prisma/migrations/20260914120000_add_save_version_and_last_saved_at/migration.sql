-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'male',
    "vocationId" INTEGER NOT NULL DEFAULT 4,
    "vocationName" TEXT NOT NULL DEFAULT 'Knight',
    "promotion" TEXT,
    "avatarId" INTEGER NOT NULL DEFAULT 1,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" BIGINT NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 150,
    "maxHealth" INTEGER NOT NULL DEFAULT 150,
    "mana" INTEGER NOT NULL DEFAULT 35,
    "maxMana" INTEGER NOT NULL DEFAULT 35,
    "capacity" INTEGER NOT NULL DEFAULT 400,
    "staminaMinutes" INTEGER NOT NULL DEFAULT 15,
    "isAutoIdle" BOOLEAN NOT NULL DEFAULT false,
    "lastHuntId" TEXT,
    "hotbarJson" TEXT,
    "bestiaryKillsJson" TEXT,
    "trackedBestiaryId" TEXT,
    "bossPoints" INTEGER NOT NULL DEFAULT 0,
    "outfitLookType" INTEGER NOT NULL DEFAULT 131,
    "outfit" TEXT DEFAULT 'Knight',
    "outfitHead" INTEGER NOT NULL DEFAULT 0,
    "outfitBody" INTEGER NOT NULL DEFAULT 0,
    "outfitLegs" INTEGER NOT NULL DEFAULT 0,
    "outfitFeet" INTEGER NOT NULL DEFAULT 0,
    "outfitAddons" INTEGER NOT NULL DEFAULT 0,
    "mount" TEXT DEFAULT 'none',
    "mountActive" BOOLEAN NOT NULL DEFAULT false,
    "posX" INTEGER NOT NULL DEFAULT 32369,
    "posY" INTEGER NOT NULL DEFAULT 32241,
    "posZ" INTEGER NOT NULL DEFAULT 7,
    "direction" TEXT NOT NULL DEFAULT 'south',
    "townId" INTEGER NOT NULL DEFAULT 1,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" DATETIME,
    "saveVersion" INTEGER NOT NULL DEFAULT 1,
    "lastSavedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "characters_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_characters" ("accountId", "avatarId", "bestiaryKillsJson", "bossPoints", "capacity", "createdAt", "direction", "experience", "gender", "health", "hotbarJson", "id", "isAutoIdle", "isOnline", "lastHuntId", "lastLogin", "level", "mana", "maxHealth", "maxMana", "mount", "mountActive", "name", "outfit", "outfitAddons", "outfitBody", "outfitFeet", "outfitHead", "outfitLegs", "outfitLookType", "posX", "posY", "posZ", "promotion", "staminaMinutes", "townId", "trackedBestiaryId", "updatedAt", "vocationId", "vocationName", "saveVersion", "lastSavedAt")
SELECT "accountId", "avatarId", "bestiaryKillsJson", "bossPoints", "capacity", "createdAt", "direction", "experience", "gender", "health", "hotbarJson", "id", "isAutoIdle", "isOnline", "lastHuntId", "lastLogin", "level", "mana", "maxHealth", "maxMana", "mount", "mountActive", "name", "outfit", "outfitAddons", "outfitBody", "outfitFeet", "outfitHead", "outfitLegs", "outfitLookType", "posX", "posY", "posZ", "promotion", "staminaMinutes", "townId", "trackedBestiaryId", "updatedAt", "vocationId", "vocationName", 1, CURRENT_TIMESTAMP FROM "characters";

DROP TABLE "characters";

ALTER TABLE "new_characters" RENAME TO "characters";

CREATE UNIQUE INDEX "characters_name_key" ON "characters"("name");
CREATE INDEX "characters_accountId_idx" ON "characters"("accountId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
