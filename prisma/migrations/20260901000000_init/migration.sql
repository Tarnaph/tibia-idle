-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "coins" INTEGER NOT NULL DEFAULT 0,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "characters" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "characters_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "skillId" INTEGER NOT NULL,
    "skillName" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 10,
    "tries" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "character_skills_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "serverId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "attributesJson" TEXT,
    CONSTRAINT "inventory_items_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "depot_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "depotBox" INTEGER NOT NULL DEFAULT 1,
    "slotIndex" INTEGER NOT NULL,
    "serverId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "attributesJson" TEXT,
    CONSTRAINT "depot_items_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "learned_spells" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "spellId" TEXT NOT NULL,
    "learnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "learned_spells_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "server_configs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "expRate" REAL NOT NULL DEFAULT 1.0,
    "lootRate" REAL NOT NULL DEFAULT 1.0,
    "skillRate" REAL NOT NULL DEFAULT 1.0,
    "regenRate" REAL NOT NULL DEFAULT 1.0,
    "maxClientsPerRoom" INTEGER NOT NULL DEFAULT 100,
    "periodicSaveIntervalMs" INTEGER NOT NULL DEFAULT 20000,
    "allowReconnectionSec" INTEGER NOT NULL DEFAULT 20,
    "localChatRadius" INTEGER NOT NULL DEFAULT 8,
    "yellChatRadius" INTEGER NOT NULL DEFAULT 30,
    "deathPenaltyExpPercent" REAL NOT NULL DEFAULT 10,
    "deathPenaltySkillPercent" REAL NOT NULL DEFAULT 10,
    "deathPenaltyLoseLoot" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "characters_name_key" ON "characters"("name");

-- CreateIndex
CREATE INDEX "characters_accountId_idx" ON "characters"("accountId");

-- CreateIndex
CREATE INDEX "character_skills_characterId_idx" ON "character_skills"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "character_skills_characterId_skillId_key" ON "character_skills"("characterId", "skillId");

-- CreateIndex
CREATE INDEX "inventory_items_characterId_idx" ON "inventory_items"("characterId");

-- CreateIndex
CREATE INDEX "depot_items_characterId_idx" ON "depot_items"("characterId");

-- CreateIndex
CREATE INDEX "learned_spells_characterId_idx" ON "learned_spells"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "learned_spells_characterId_spellId_key" ON "learned_spells"("characterId", "spellId");
