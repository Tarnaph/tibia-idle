import { describe, expect, it, beforeEach } from 'vitest';
import { CharacterService, AccountService } from '../packages/auth/src';
import { PrismaPersistenceManager } from '../packages/server/src/persistence/PrismaPersistenceManager';
import { ThaisCityRoom } from '../packages/server/src/rooms/ThaisCityRoom';
import { PlayerState } from '../packages/server/src/schemas/PlayerState';

describe('Phase 68: Complete Server Persistence Audit & Crash Recovery Test Suite', () => {
  let mockAccounts: Map<string, any>;
  let mockCharacters: Map<string, any>;
  let mockSkills: Map<string, any>;
  let mockInventory: Map<string, any>;
  let mockPrisma: any;
  let characterService: CharacterService;
  let accountService: AccountService;
  let persistenceManager: PrismaPersistenceManager;

  beforeEach(() => {
    mockAccounts = new Map();
    mockCharacters = new Map();
    mockSkills = new Map();
    mockInventory = new Map();

    mockPrisma = {
      account: {
        findUnique: async ({ where }: any) => {
          if (where.id) return mockAccounts.get(where.id) || null;
          if (where.email) {
            for (const acc of mockAccounts.values()) {
              if (acc.email === where.email) return acc;
            }
          }
          return null;
        },
        create: async ({ data }: any) => {
          const id = data.id || `acc-${Date.now()}-${Math.random()}`;
          const acc = { id, ...data, characters: [] };
          mockAccounts.set(id, acc);
          return acc;
        },
        update: async ({ where, data }: any) => {
          const acc = mockAccounts.get(where.id);
          if (acc) {
            Object.assign(acc, data);
          }
          return acc;
        },
      },
      character: {
        findFirst: async ({ where }: any) => {
          const searchName = (where?.name?.equals || where?.name || '').toLowerCase();
          for (const char of mockCharacters.values()) {
            if (char.name.toLowerCase() === searchName) return char;
          }
          return null;
        },
        findUnique: async ({ where }: any) => {
          const char = mockCharacters.get(where.id);
          if (!char) return null;
          const skills = Array.from(mockSkills.values()).filter((s: any) => s.characterId === where.id);
          const inventory = Array.from(mockInventory.values()).filter((i: any) => i.characterId === where.id);
          return {
            ...char,
            skills,
            inventory,
            account: mockAccounts.get(char.accountId) || null,
          };
        },
        findMany: async ({ where }: any) => {
          const list = [];
          for (const char of mockCharacters.values()) {
            if (where?.accountId && char.accountId === where.accountId) {
              const skills = Array.from(mockSkills.values()).filter((s: any) => s.characterId === char.id);
              const inventory = Array.from(mockInventory.values()).filter((i: any) => i.characterId === char.id);
              list.push({ ...char, skills, inventory });
            }
          }
          return list;
        },
        create: async ({ data }: any) => {
          const id = data.id || `char-${Date.now()}-${Math.random()}`;
          const char = {
            id,
            accountId: data.accountId,
            name: data.name,
            vocationId: data.vocationId || 4,
            vocationName: data.vocationName || 'Knight',
            level: data.level || 1,
            experience: data.experience !== undefined ? BigInt(data.experience) : BigInt(0),
            health: data.health || 150,
            maxHealth: data.maxHealth || 150,
            mana: data.mana || 35,
            maxMana: data.maxMana || 35,
            capacity: data.capacity || 400,
            staminaMinutes: 15,
            outfitLookType: data.outfitLookType || 131,
            outfitHead: data.outfitHead || 0,
            outfitBody: data.outfitBody || 0,
            outfitLegs: data.outfitLegs || 0,
            outfitFeet: data.outfitFeet || 0,
            posX: data.posX || 32369,
            posY: data.posY || 32241,
            posZ: data.posZ || 7,
            direction: 'south',
            isOnline: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockCharacters.set(id, char);

          if (data.skills?.create) {
            for (const s of data.skills.create) {
              const skId = `sk-${id}-${s.skillId}`;
              mockSkills.set(skId, { id: skId, characterId: id, ...s });
            }
          }

          if (data.inventory?.create) {
            for (const item of data.inventory.create) {
              const invId = `inv-${id}-${item.slot}-${Math.random()}`;
              mockInventory.set(invId, { id: invId, characterId: id, ...item });
            }
          }

          return mockCharacters.get(id) || null;
        },
        update: async ({ where, data }: any) => {
          const char = mockCharacters.get(where.id);
          if (char) {
            Object.assign(char, data);
            char.updatedAt = new Date();
          }
          return mockCharacters.get(where.id) || null;
        },
      },
      characterSkill: {
        upsert: async ({ where, update, create }: any) => {
          const key = `${create.characterId}-${create.skillId}`;
          let existing = null;
          for (const s of mockSkills.values()) {
            if (s.characterId === create.characterId && s.skillId === create.skillId) {
              existing = s;
              break;
            }
          }
          if (existing) {
            Object.assign(existing, update);
            return existing;
          } else {
            const skId = `sk-${key}`;
            const created = { id: skId, ...create };
            mockSkills.set(skId, created);
            return created;
          }
        },
      },
      inventoryItem: {
        deleteMany: async ({ where }: any) => {
          for (const [key, item] of mockInventory.entries()) {
            if (item.characterId === where.characterId) {
              mockInventory.delete(key);
            }
          }
        },
        createMany: async ({ data }: any) => {
          for (const item of data) {
            const invId = `inv-${item.characterId}-${item.slot}-${Math.random()}`;
            mockInventory.set(invId, { id: invId, ...item });
          }
        },
      },
    };

    accountService = new AccountService(mockPrisma);
    characterService = new CharacterService(mockPrisma);
    persistenceManager = new PrismaPersistenceManager(mockPrisma);
  });

  it('Requirement 1: Persists character Level, Experience, HP, MP, and Map Coordinates across sessions', async () => {
    const acc = await accountService.register({ email: 'persistence.hero@tibia.test', password: 'password123!' });
    const char = await characterService.createCharacter({ accountId: acc.account.id, name: 'Knight Legend', vocationId: 4 });

    expect(char.level).toBe(1);
    expect(Number(char.experience)).toBe(0);

    // Update character progress to level 50, 125,000 XP, 450 HP, 600 MP at coordinates (32369, 32241, 7)
    await characterService.saveCharacterProgress(char.id, {
      level: 50,
      experience: BigInt(125000),
      health: 450,
      maxHealth: 450,
      mana: 600,
      maxMana: 600,
      posX: 32369,
      posY: 32241,
      posZ: 7,
    });

    // Simulate player in Colyseus room
    const player = new PlayerState();
    player.characterId = char.id;
    player.level = 50;
    player.experience = 125000;
    player.hp = 450;
    player.maxHp = 450;
    player.mp = 600;
    player.maxMp = 600;
    player.posX = 32369;
    player.posY = 32241;
    player.posZ = 7;

    await persistenceManager.saveCharacter(player);

    // Reload character from database after disconnect
    const loaded = await characterService.getCharacterById(char.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.level).toBe(50);
    expect(Number(loaded!.experience)).toBe(125000);
    expect(loaded!.health).toBe(450);
    expect(loaded!.maxHealth).toBe(450);
    expect(loaded!.mana).toBe(600);
    expect(loaded!.maxMana).toBe(600);
    expect(loaded!.posX).toBe(32369);
    expect(loaded!.posY).toBe(32241);
    expect(loaded!.posZ).toBe(7);
  });

  it('Requirement 2: Persists full Equipment slots and Backpack Container items with exact counts and tiers', async () => {
    const acc = await accountService.register({ email: 'inventory.hero@tibia.test', password: 'password123!' });
    const char = await characterService.createCharacter({ accountId: acc.account.id, name: 'Paladin Master', vocationId: 3 });

    const fullInventory = [
      { slot: 'head', serverId: 2493, name: 'Demon Helmet', count: 1 },
      { slot: 'armor', serverId: 2472, name: 'Magic Plate Armor', count: 1 },
      { slot: 'legs', serverId: 2470, name: 'Golden Legs', count: 1 },
      { slot: 'boots', serverId: 2195, name: 'Boots of Haste', count: 1 },
      { slot: 'rightHand', serverId: 2514, name: 'Mastermind Shield', count: 1 },
      { slot: 'leftHand', serverId: 2400, name: 'Magic Sword', count: 1 },
      { slot: 'backpack', serverId: 1988, name: 'Backpack', count: 1 },
      { slot: 'backpack_0', serverId: 7618, name: 'Health Potion', count: 50 },
      { slot: 'backpack_1', serverId: 7620, name: 'Mana Potion', count: 100 },
      { slot: 'backpack_2', serverId: 2268, name: 'Sudden Death Rune', count: 100 },
    ];

    await characterService.saveCharacterProgress(char.id, {
      inventory: fullInventory,
    });

    const loaded = await characterService.getCharacterById(char.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.inventory.length).toBe(10);

    const demonHelmet = loaded!.inventory.find((i: any) => i.slot === 'head');
    expect(demonHelmet?.name).toBe('Demon Helmet');
    expect(demonHelmet?.serverId).toBe(2493);

    const healthPotions = loaded!.inventory.find((i: any) => i.slot === 'backpack_0');
    expect(healthPotions?.name).toBe('Health Potion');
    expect(healthPotions?.count).toBe(50);

    const sdRunes = loaded!.inventory.find((i: any) => i.slot === 'backpack_2');
    expect(sdRunes?.name).toBe('Sudden Death Rune');
    expect(sdRunes?.count).toBe(100);
  });

  it('Requirement 3: Persists Gold Coins, Platinum Coins, and Monster Drop Loot across sessions', async () => {
    const acc = await accountService.register({ email: 'loot.hero@tibia.test', password: 'password123!' });
    const char = await characterService.createCharacter({ accountId: acc.account.id, name: 'Loot Collector', vocationId: 1 });

    const lootInventory = [
      { slot: 'backpack_0', serverId: 2148, name: 'Gold Coin', count: 8500 },
      { slot: 'backpack_1', serverId: 2152, name: 'Platinum Coin', count: 42 },
      { slot: 'backpack_2', serverId: 2671, name: 'Dragon Ham', count: 15 },
      { slot: 'backpack_3', serverId: 2498, name: 'Royal Helmet', count: 1 },
    ];

    await characterService.saveCharacterProgress(char.id, {
      inventory: lootInventory,
    });

    const loaded = await characterService.getCharacterById(char.id);

    const goldCoins = loaded!.inventory.find((i: any) => i.name === 'Gold Coin');
    expect(goldCoins?.count).toBe(8500);

    const platinumCoins = loaded!.inventory.find((i: any) => i.name === 'Platinum Coin');
    expect(platinumCoins?.count).toBe(42);

    const royalHelmet = loaded!.inventory.find((i: any) => i.name === 'Royal Helmet');
    expect(royalHelmet?.count).toBe(1);
  });

  it('Requirement 4: Recovers 100% of character state after a Simulated Server Crash and Cold Restart', async () => {
    const acc = await accountService.register({ email: 'crash.hero@tibia.test', password: 'password123!' });
    const char = await characterService.createCharacter({ accountId: acc.account.id, name: 'Crash Survivor', vocationId: 2 });

    // Initial server room state before crash
    let room1: ThaisCityRoom | null = new ThaisCityRoom();
    room1.onCreate({});

    const playerState = new PlayerState();
    playerState.id = 'session-player-1';
    playerState.characterId = char.id;
    playerState.name = 'Crash Survivor';
    playerState.level = 35;
    playerState.experience = 80000;
    playerState.hp = 320;
    playerState.maxHp = 320;
    playerState.mp = 450;
    playerState.maxMp = 450;
    playerState.posX = 32369;
    playerState.posY = 32241;
    playerState.posZ = 7;

    room1.state.players.set(playerState.id, playerState);

    // Save character progress to DB before crash
    await characterService.saveCharacterProgress(char.id, {
      level: 35,
      experience: BigInt(80000),
      health: 320,
      maxHealth: 320,
      mana: 450,
      maxMana: 450,
      inventory: [
        { slot: 'backpack_0', serverId: 2152, name: 'Platinum Coin', count: 50 },
        { slot: 'leftHand', serverId: 2182, name: 'Snakebit Rod', count: 1 },
      ],
    });

    // Trigger emergency batch save & server shutdown (dispose)
    await persistenceManager.saveBatch(room1.state.players.values());
    await room1.onDispose();

    // CRASH SIMULATION: Completely destroy room1 in memory
    (room1 as any) = null;

    // COLD RESTART: Instantiate a brand new room server instance
    const room2 = new ThaisCityRoom();
    room2.onCreate({});

    // Player reconnects to the new room server instance after crash
    const mockClient: any = { sessionId: 'session-player-reconnect', send: () => {} };
    await room2.onJoin(mockClient, {
      characterId: char.id,
      mockCharacter: { id: char.id, accountId: acc.account.id, name: char.name, vocationId: 2, level: 35 },
    });

    const reconnectedPlayer = room2.state.players.get('session-player-reconnect');
    expect(reconnectedPlayer).toBeDefined();
    expect(reconnectedPlayer?.level).toBe(35);

    // Verify DB record loaded by new room instance
    const dbLoaded = await characterService.getCharacterById(char.id);
    expect(dbLoaded?.level).toBe(35);
    expect(Number(dbLoaded?.experience)).toBe(80000);
    expect(dbLoaded?.health).toBe(320);
    expect(dbLoaded?.mana).toBe(450);

    const reconnectedPlatinum = dbLoaded?.inventory.find((i: any) => i.name === 'Platinum Coin');
    expect(reconnectedPlatinum?.count).toBe(50);
  });

  it('Requirement 5: Correctly saves and restores active character Gold Coins and equipment payload across disconnects', async () => {
    const acc = await accountService.register({ email: 'gold.hero@tibia.test', password: 'password123!' });
    const char = await characterService.createCharacter({ accountId: acc.account.id, name: 'Gold Rich', vocationId: 4 });

    // Client state payload generated after hunting (e.g., accumulated 12,500 gold coins)
    const clientPayload = {
      level: char.level,
      experience: BigInt(char.experience),
      health: char.health,
      maxHealth: char.maxHealth,
      mana: char.mana,
      maxMana: char.maxMana,
      posX: 32369,
      posY: 32241,
      posZ: 7,
      inventory: [
        { slot: 'head', serverId: 2493, name: 'Demon Helmet', count: 1 },
        { slot: 'gold', serverId: 2148, name: 'Gold Coin', count: 12500 },
        { slot: 'backpack_loot_0', serverId: 2152, name: 'Platinum Coin', count: 20 },
      ],
    };

    // Save character progress via character service (simulating /api/characters/[id]/save)
    await characterService.saveCharacterProgress(char.id, clientPayload);

    // Fetch character from database upon relogin
    const loadedChar = await characterService.getCharacterById(char.id);
    expect(loadedChar).not.toBeNull();
    expect(loadedChar?.inventory).toHaveLength(3);

    // Verify gold coins in loaded inventory
    const goldCoins = loadedChar?.inventory.find((item) => item.slot === 'gold' || item.serverId === 2148);
    expect(goldCoins).toBeDefined();
    expect(goldCoins?.count).toBe(12500);

    // Verify platinum coins in loaded inventory
    const platinumCoins = loadedChar?.inventory.find((item) => item.name === 'Platinum Coin');
    expect(platinumCoins).toBeDefined();
    expect(platinumCoins?.count).toBe(20);

    // Verify total gold calculation (12500 gold + 20 * 100 platinum = 14500 total gold)
    let totalGold = 0;
    loadedChar?.inventory.forEach((item) => {
      if (item.slot === 'gold' || item.serverId === 2148 || item.name === 'Gold Coin') {
        totalGold += item.count;
      } else if (item.serverId === 2152 || item.name === 'Platinum Coin') {
        totalGold += item.count * 100;
      }
    });
    expect(totalGold).toBe(14500);
  });

  it('Requirement 6: Unequipped equipment stored in backpack stays in backpack and does not re-equip default starter item on reload', async () => {
    const acc = await accountService.register({ email: 'backpack.hero@tibia.test', password: 'password123!' });
    const char = await characterService.createCharacter({ accountId: acc.account.id, name: 'Backpack Wearer', vocationId: 1 });

    // Player unequips head armor into backpack_0 and leaves head slot EMPTY (no item with slot: 'head')
    const unequippedPayload = {
      level: char.level,
      experience: BigInt(char.experience),
      health: char.health,
      maxHealth: char.maxHealth,
      mana: char.mana,
      maxMana: char.maxMana,
      posX: 32369,
      posY: 32241,
      posZ: 7,
      inventory: [
        { slot: 'armor', serverId: 2463, name: 'Plate Armor', count: 1 },
        { slot: 'backpack_0', serverId: 2493, name: 'Demon Helmet', count: 1 },
      ],
    };

    await characterService.saveCharacterProgress(char.id, unequippedPayload);

    const loadedChar = await characterService.getCharacterById(char.id);
    expect(loadedChar).not.toBeNull();

    // Verify database records
    const headItem = loadedChar?.inventory.find((i: any) => i.slot === 'head');
    expect(headItem).toBeUndefined();

    const backpackItem = loadedChar?.inventory.find((i: any) => i.slot === 'backpack_0');
    expect(backpackItem).toBeDefined();
    expect(backpackItem?.serverId).toBe(2493);

    // Simulate handleSelectCharacter hydration logic from GamePrototype
    const mockUserChar: any = {
      equipment: { head: 2493, armor: 2463, legs: 2647, boots: 2643, leftHand: 2525, rightHand: 2376 },
      inventory: { equipmentIds: [2493, 2463, 2647, 2643, 2525, 2376] },
    };

    // Hydration logic matching updated GamePrototype.tsx
    const dbInventory = loadedChar?.inventory || [];
    if (Array.isArray(dbInventory)) {
      mockUserChar.equipment = { head: null, armor: null, legs: null, boots: null, leftHand: null, rightHand: null };
      mockUserChar.inventory.equipmentIds = [];

      dbInventory.forEach((item: any) => {
        if (['head', 'armor', 'legs', 'boots', 'leftHand', 'rightHand'].includes(item.slot)) {
          mockUserChar.equipment[item.slot] = item.serverId;
          if (!mockUserChar.inventory.equipmentIds.includes(item.serverId)) {
            mockUserChar.inventory.equipmentIds.push(item.serverId);
          }
        } else if (item.serverId) {
          if (!mockUserChar.inventory.equipmentIds.includes(item.serverId)) {
            mockUserChar.inventory.equipmentIds.push(item.serverId);
          }
        }
      });
    }

    // Assert head slot is strictly null (empty) and backpack contains Demon Helmet (2493)
    expect(mockUserChar.equipment.head).toBeNull();
    expect(mockUserChar.equipment.armor).toBe(2463);
    expect(mockUserChar.inventory.equipmentIds).toContain(2493);
  });

  it('Requirement 7: Persists items placed in the Bag (Bolsa) across logout and login sessions', async () => {
    const acc = await accountService.register({ email: 'bolsa.hero@tibia.test', password: 'password123!' });
    const char = await characterService.createCharacter({ accountId: acc.account.id, name: 'Bolsa Holder', vocationId: 3 });

    // Client saves payload containing items in Bag (slot: 'bag_0', 'bag_1')
    const bagPayload = {
      level: char.level,
      experience: BigInt(char.experience),
      health: char.health,
      maxHealth: char.maxHealth,
      mana: char.mana,
      maxMana: char.maxMana,
      posX: 32369,
      posY: 32241,
      posZ: 7,
      inventory: [
        { slot: 'bag_0', serverId: 2671, name: 'Dragon Ham', count: 10 },
        { slot: 'bag_1', serverId: 2493, name: 'Demon Helmet', count: 1 },
      ],
    };

    await characterService.saveCharacterProgress(char.id, bagPayload);

    const loadedChar = await characterService.getCharacterById(char.id);
    expect(loadedChar).not.toBeNull();
    expect(loadedChar?.inventory).toHaveLength(2);

    // Simulate handleSelectCharacter hydration logic for Bag items
    const loadedBag: Array<{ itemId?: number; name: string; amount: number }> = [];
    const dbInventory = loadedChar?.inventory || [];

    dbInventory.forEach((item: any) => {
      if (item.slot.startsWith('bag_') || item.slot.startsWith('backpack_bag_')) {
        loadedBag.push({
          itemId: item.serverId,
          name: item.name,
          amount: item.count,
        });
      }
    });

    expect(loadedBag).toHaveLength(2);
    expect(loadedBag[0].name).toBe('Dragon Ham');
    expect(loadedBag[0].amount).toBe(10);
    expect(loadedBag[1].name).toBe('Demon Helmet');
    expect(loadedBag[1].amount).toBe(1);
  });
});
