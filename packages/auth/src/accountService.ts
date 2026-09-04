import type { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from './password';
import { createAuthToken, type TokenPayload } from './jwt';
import type { AccountRole } from './types';

export interface RegisterAccountInput {
  email: string;
  password: string;
  role?: AccountRole;
}

export interface LoginAccountInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  account: {
    id: string;
    email: string;
    role: AccountRole;
    coins: number;
    isPremium: boolean;
    createdAt: Date;
  };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export class AccountService {
  constructor(private prisma: PrismaClient) {}

  async register(input: RegisterAccountInput): Promise<AuthResult> {
    const trimmedEmail = input.email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      throw new Error('Formato de e-mail inválido.');
    }

    if (!input.password || input.password.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    const existing = await this.prisma.account.findUnique({
      where: { email: trimmedEmail },
    });

    if (existing) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const passwordHash = await hashPassword(input.password);
    const role = input.role === 'admin' ? 'ADMIN' : 'PLAYER';

    const account = await this.prisma.account.create({
      data: {
        email: trimmedEmail,
        passwordHash,
        role,
        isPremium: true,
        coins: 0,
      },
    });

    const accountRole: AccountRole = account.role === 'ADMIN' ? 'admin' : 'player';
    const token = createAuthToken({
      accountId: account.id,
      email: account.email,
      role: accountRole,
      isPremium: account.isPremium,
    });

    return {
      token,
      account: {
        id: account.id,
        email: account.email,
        role: accountRole,
        coins: account.coins,
        isPremium: account.isPremium,
        createdAt: account.createdAt,
      },
    };
  }

  async login(input: LoginAccountInput): Promise<AuthResult> {
    const trimmedEmail = input.email.trim().toLowerCase();
    const account = await this.prisma.account.findUnique({
      where: { email: trimmedEmail },
    });

    if (!account) {
      throw new Error('E-mail ou senha incorretos.');
    }

    if (account.isBanned) {
      throw new Error('Esta conta foi banida. Entre em contato com a administração.');
    }

    const passwordMatches = await verifyPassword(input.password, account.passwordHash);
    if (!passwordMatches) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const accountRole: AccountRole = account.role === 'ADMIN' ? 'admin' : 'player';
    const token = createAuthToken({
      accountId: account.id,
      email: account.email,
      role: accountRole,
      isPremium: account.isPremium,
    });

    return {
      token,
      account: {
        id: account.id,
        email: account.email,
        role: accountRole,
        coins: account.coins,
        isPremium: account.isPremium,
        createdAt: account.createdAt,
      },
    };
  }

  async getAccountById(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        characters: {
          select: {
            id: true,
            name: true,
            vocationName: true,
            level: true,
            health: true,
            maxHealth: true,
            mana: true,
            maxMana: true,
            outfitLookType: true,
            isOnline: true,
            lastLogin: true,
          },
        },
      },
    });

    if (!account) return null;

    const accountRole: AccountRole = account.role === 'ADMIN' ? 'admin' : 'player';
    return {
      id: account.id,
      email: account.email,
      role: accountRole,
      coins: account.coins,
      isPremium: account.isPremium,
      isBanned: account.isBanned,
      characters: account.characters,
      createdAt: account.createdAt,
    };
  }

  async setRole(accountId: string, role: AccountRole) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: { role: role === 'admin' ? 'ADMIN' : 'PLAYER' },
    });
  }

  async setBanned(accountId: string, isBanned: boolean) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: { isBanned },
    });
  }
}
