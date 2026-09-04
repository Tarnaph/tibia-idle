import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AccountRole } from './types';

const DEFAULT_SECRET = process.env.JWT_SECRET || 'cavebound-tibia-secret-key-2026';
const TOKEN_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface TokenPayload {
  accountId: string;
  email: string;
  role: AccountRole;
  isPremium: boolean;
  iat?: number;
  exp?: number;
}

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === 'string' ? Buffer.from(str, 'utf8') : str;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Creates a signed JWT for an authenticated account using Node native HMAC-SHA256 (zero eval).
 */
export function createAuthToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string = DEFAULT_SECRET): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRATION_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies and decodes a signed JWT.
 */
export function verifyAuthToken(token: string, secret: string = DEFAULT_SECRET): TokenPayload {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token structure');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const expectedSignature = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();

    let actualSignature: Buffer;
    try {
      let b64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      actualSignature = Buffer.from(b64, 'base64');
    } catch {
      throw new Error('Invalid signature format');
    }

    if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (err) {
    throw new Error('Invalid or expired authentication token');
  }
}
