import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/**
 * Generates a secure hash for user account passwords using Node native scrypt.
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || plainText.length < 6) {
    throw new Error('A senha deve conter no mínimo 6 caracteres.');
  }
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(plainText, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Compares a plaintext password against a stored hash.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;

  if (hash.includes(':')) {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    const derivedKey = (await scryptAsync(plainText, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return timingSafeEqual(derivedKey, keyBuffer);
  }

  // Fallback for bcrypt hashes if any exist
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(plainText, hash);
  } catch (err) {
    return false;
  }
}
