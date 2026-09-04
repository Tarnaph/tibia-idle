import { describe, expect, it, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createAuthToken,
  verifyAuthToken,
  validateEmail,
  validateCharacterName,
  VOCATION_CONFIGS,
  THAIS_TEMPLE_SPAWN,
  AccountService,
  CharacterService,
} from '../packages/auth/src';

describe('Phase 42: Arquitetura PostgreSQL + Prisma ORM e Autenticação Multi-Role', () => {
  describe('Password Hashing & Verification (bcryptjs)', () => {
    it('generates a secure bcrypt hash and verifies matching plaintext passwords', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
      expect(hash).not.toBe(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('rejects passwords shorter than 6 characters', async () => {
      await expect(hashPassword('12345')).rejects.toThrow('at least 6 characters');
    });
  });

  describe('JWT Generation & Role Claims Verification', () => {
    it('creates and verifies valid JWT tokens for PLAYER and ADMIN roles', () => {
      const playerToken = createAuthToken({
        accountId: 'acc-player-123',
        email: 'player@tibia.test',
        role: 'player',
        isPremium: true,
      });

      expect(playerToken).toBeDefined();
      const decodedPlayer = verifyAuthToken(playerToken);
      expect(decodedPlayer.accountId).toBe('acc-player-123');
      expect(decodedPlayer.email).toBe('player@tibia.test');
      expect(decodedPlayer.role).toBe('player');
      expect(decodedPlayer.isPremium).toBe(true);

      const adminToken = createAuthToken({
        accountId: 'acc-admin-999',
        email: 'god@tibia.test',
        role: 'admin',
        isPremium: true,
      });

      const decodedAdmin = verifyAuthToken(adminToken);
      expect(decodedAdmin.accountId).toBe('acc-admin-999');
      expect(decodedAdmin.role).toBe('admin');
    });

    it('rejects malformed or tampered tokens', () => {
      expect(() => verifyAuthToken('invalid.jwt.token')).toThrow('Invalid or expired');
    });
  });

  describe('Input Validations (Email & Character Name)', () => {
    it('validates email format correctly', () => {
      expect(validateEmail('player@tibia.com')).toBe(true);
      expect(validateEmail('admin.user+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('player@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('validates character names according to official rules (3-20 letters)', () => {
      expect(validateCharacterName('Bubble')).toBe(true);
      expect(validateCharacterName('Eternal Oblivion')).toBe(true);
      expect(validateCharacterName('Cachero')).toBe(true);
      expect(validateCharacterName('Ed')).toBe(false); // Too short
      expect(validateCharacterName('A'.repeat(21))).toBe(false); // Too long
      expect(validateCharacterName('Player123')).toBe(false); // Numbers
      expect(validateCharacterName('Knight_Hero')).toBe(false); // Underscores
      expect(validateCharacterName('!Mage!')).toBe(false); // Symbols
    });
  });

  describe('Vocation Starter Loadouts & Thais Temple Spawn Configuration', () => {
    it('configures Knight with authentic TFS firstitems and formulas', () => {
      const knight = VOCATION_CONFIGS[4];
      expect(knight).toBeDefined();
      expect(knight.name).toBe('Knight');
      expect(knight.baseHp).toBe(185);
      expect(knight.baseMp).toBe(35);
      expect(knight.capacity).toBe(470);
      expect(knight.outfitLookType).toBe(131);
      expect(knight.spells).toContain('exori');
      expect(knight.spells).toContain('exura-ico');

      const swordSkill = knight.skills.find((s) => s.skillName === 'Sword Fighting');
      expect(swordSkill?.value).toBe(15);

      const weapon = knight.equipment.find((e) => e.slot === 'rightHand');
      expect(weapon?.name).toBe('Jagged Sword');
      expect(weapon?.serverId).toBe(8602);
    });

    it('configures Paladin with Bow, Arrows and Distance skill', () => {
      const paladin = VOCATION_CONFIGS[3];
      expect(paladin).toBeDefined();
      expect(paladin.name).toBe('Paladin');
      expect(paladin.baseHp).toBe(165);
      expect(paladin.baseMp).toBe(35);
      expect(paladin.capacity).toBe(450);
      expect(paladin.outfitLookType).toBe(129);
      expect(paladin.spells).toContain('exori-san');

      const distSkill = paladin.skills.find((s) => s.skillName === 'Distance Fighting');
      expect(distSkill?.value).toBe(15);

      const ammo = paladin.equipment.find((e) => e.slot === 'leftHand');
      expect(ammo?.name).toBe('Arrow');
      expect(ammo?.count).toBe(100);
    });

    it('configures Sorcerer and Druid with authentic elemental rods/wands and wave spells', () => {
      const sorc = VOCATION_CONFIGS[1];
      expect(sorc.name).toBe('Sorcerer');
      expect(sorc.baseHp).toBe(145);
      expect(sorc.baseMp).toBe(30);
      expect(sorc.spells).toContain('exevo-vis-hur');
      expect(sorc.equipment.find((e) => e.slot === 'rightHand')?.name).toBe('Wand of Vortex');

      const druid = VOCATION_CONFIGS[2];
      expect(druid.name).toBe('Druid');
      expect(druid.baseHp).toBe(145);
      expect(druid.baseMp).toBe(30);
      expect(druid.spells).toContain('exevo-tera-hur');
      expect(druid.spells).toContain('exura-gran');
      expect(druid.equipment.find((e) => e.slot === 'rightHand')?.name).toBe('Snakebite Rod');
    });

    it('spawns characters at authentic Thais Temple coordinates (32369, 32241, 7)', () => {
      expect(THAIS_TEMPLE_SPAWN.posX).toBe(32369);
      expect(THAIS_TEMPLE_SPAWN.posY).toBe(32241);
      expect(THAIS_TEMPLE_SPAWN.posZ).toBe(7);
      expect(THAIS_TEMPLE_SPAWN.townId).toBe(1);
    });
  });

  describe('Relational Account & Character Service Workflows (In-Memory Repository Mock)', () => {
    let mockAccounts: Map<string, any>;
    let mockCharacters: Map<string, any>;
    let mockPrisma: any;
    let accountService: AccountService;
    let characterService: CharacterService;

    beforeEach(() => {
      mockAccounts = new Map();
      mockCharacters = new Map();

      mockPrisma = {
        account: {
          findUnique: async ({ where }: any) => {
            if (where.id) return mockAccounts.get(where.id) || null;
            if (where.email) {
              for (const acc of mockAccounts.values()) {
                if (acc.email.toLowerCase() === where.email.toLowerCase()) return acc;
              }
            }
            return null;
          },
          create: async ({ data }: any) => {
            const id = `acc-${Date.now()}-${Math.random()}`;
            const account = { id, ...data, createdAt: new Date(), updatedAt: new Date(), characters: [] };
            mockAccounts.set(id, account);
            return account;
          },
          update: async ({ where, data }: any) => {
            const acc = mockAccounts.get(where.id);
            if (!acc) throw new Error('Not found');
            const updated = { ...acc, ...data, updatedAt: new Date() };
            mockAccounts.set(where.id, updated);
            return updated;
          },
        },
        character: {
          findUnique: async ({ where }: any) => {
            const char = mockCharacters.get(where.id);
            if (!char) return null;
            const account = mockAccounts.get(char.accountId);
            return { ...char, account };
          },
          findFirst: async ({ where }: any) => {
            const searchName = where.name?.equals?.toLowerCase();
            for (const char of mockCharacters.values()) {
              if (char.name.toLowerCase() === searchName) return char;
            }
            return null;
          },
          findMany: async ({ where }: any) => {
            const list = [];
            for (const char of mockCharacters.values()) {
              if (char.accountId === where.accountId) list.push(char);
            }
            return list;
          },
          create: async ({ data }: any) => {
            const id = `char-${Date.now()}-${Math.random()}`;
            const skills = data.skills?.create || [];
            const inventory = data.inventory?.create || [];
            const spells = data.spells?.create || [];
            const char = {
              id,
              ...data,
              skills,
              inventory,
              spells,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockCharacters.set(id, char);

            // Update account's character array
            const acc = mockAccounts.get(data.accountId);
            if (acc) {
              acc.characters = acc.characters || [];
              acc.characters.push(char);
            }
            return char;
          },
          delete: async ({ where }: any) => {
            const char = mockCharacters.get(where.id);
            if (char) {
              mockCharacters.delete(where.id);
              const acc = mockAccounts.get(char.accountId);
              if (acc && acc.characters) {
                acc.characters = acc.characters.filter((c: any) => c.id !== where.id);
              }
            }
            return char;
          },
        },
      };

      accountService = new AccountService(mockPrisma);
      characterService = new CharacterService(mockPrisma);
    });

    it('executes full account lifecycle: register, login, role upgrade and ban', async () => {
      const reg = await accountService.register({
        email: 'tibia.hero@mail.com',
        password: 'securePassword123',
      });

      expect(reg.token).toBeDefined();
      expect(reg.account.email).toBe('tibia.hero@mail.com');
      expect(reg.account.role).toBe('player');

      // Duplicate registration must fail
      await expect(
        accountService.register({ email: 'tibia.hero@mail.com', password: 'password123' })
      ).rejects.toThrow('já está cadastrado');

      // Successful login
      const login = await accountService.login({
        email: 'tibia.hero@mail.com',
        password: 'securePassword123',
      });
      expect(login.token).toBeDefined();

      // Wrong password login must fail
      await expect(
        accountService.login({ email: 'tibia.hero@mail.com', password: 'wrong' })
      ).rejects.toThrow('E-mail ou senha incorretos');

      // Admin role upgrade
      await accountService.setRole(reg.account.id, 'admin');
      const updated = await accountService.getAccountById(reg.account.id);
      expect(updated?.role).toBe('admin');

      // Banned account cannot log in
      await accountService.setBanned(reg.account.id, true);
      await expect(
        accountService.login({ email: 'tibia.hero@mail.com', password: 'securePassword123' })
      ).rejects.toThrow('banida');
    });

    it('executes full character creation and relational link with account', async () => {
      const { account } = await accountService.register({
        email: 'guild.leader@tibia.com',
        password: 'guildPassword2026',
      });

      // Create Knight character
      const knight = await characterService.createCharacter({
        accountId: account.id,
        name: 'Sir Philip',
        vocationId: 4,
      });

      expect(knight.id).toBeDefined();
      expect(knight.name).toBe('Sir Philip');
      expect(knight.vocationName).toBe('Knight');
      expect(knight.posX).toBe(32369);
      expect(knight.posY).toBe(32241);
      expect(knight.skills.length).toBe(8);
      expect(knight.inventory.length).toBe(7);
      expect(knight.spells.length).toBe(3);

      // Duplicate character name must be rejected
      await expect(
        characterService.createCharacter({
          accountId: account.id,
          name: 'sir philip', // Case-insensitive duplicate
          vocationId: 1,
        })
      ).rejects.toThrow('já está em uso');

      // List characters for account
      const chars = await characterService.getCharactersByAccountId(account.id);
      expect(chars.length).toBe(1);
      expect(chars[0].name).toBe('Sir Philip');

      // Delete character
      await characterService.deleteCharacter(account.id, knight.id);
      const afterDelete = await characterService.getCharactersByAccountId(account.id);
      expect(afterDelete.length).toBe(0);
    });
  });
});
