import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Generates a secure bcrypt hash for user account passwords.
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || plainText.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}
