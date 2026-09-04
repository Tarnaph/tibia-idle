import jwt from 'jsonwebtoken';
import type { AccountRole } from './types';

const DEFAULT_SECRET = process.env.JWT_SECRET || 'cavebound-tibia-secret-key-2026';
const TOKEN_EXPIRATION = '7d';

export interface TokenPayload {
  accountId: string;
  email: string;
  role: AccountRole;
  isPremium: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Creates a signed JWT for an authenticated account.
 */
export function createAuthToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string = DEFAULT_SECRET): string {
  return jwt.sign(
    {
      accountId: payload.accountId,
      email: payload.email,
      role: payload.role,
      isPremium: payload.isPremium,
    },
    secret,
    { expiresIn: TOKEN_EXPIRATION }
  );
}

/**
 * Verifies and decodes a signed JWT.
 */
export function verifyAuthToken(token: string, secret: string = DEFAULT_SECRET): TokenPayload {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (err) {
    throw new Error('Invalid or expired authentication token');
  }
}
