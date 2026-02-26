import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import adjectives from '../../../wordlists/adjectives.json';
import nouns from '../../../wordlists/nouns.json';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

function secureRandomIndex(max: number): number {
  return crypto.randomInt(0, max);
}

/**
 * Generate a memorable passphrase: adjective-noun-adjective-number
 * ~33 bits of entropy. With bcrypt + rate limiting, sufficient for this threat model.
 */
export function generatePassphrase(): string {
  const adj1 = adjectives[secureRandomIndex(adjectives.length)];
  const noun = nouns[secureRandomIndex(nouns.length)];
  const adj2 = adjectives[secureRandomIndex(adjectives.length)];
  const num = crypto.randomInt(10, 100);
  return `${adj1}-${noun}-${adj2}-${num}`;
}

/**
 * Hash a passphrase using bcrypt.
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  return bcrypt.hash(passphrase, SALT_ROUNDS);
}

/**
 * Compare a passphrase against a bcrypt hash.
 */
export async function comparePassphrase(
  passphrase: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(passphrase, hash);
}

/**
 * Compute a 4-character hex prefix from SHA-256 of the passphrase.
 * Used to accelerate lookups without revealing the passphrase.
 * 16^4 = 65,536 buckets — doesn't meaningfully reduce entropy.
 */
export function computePrefix(passphrase: string): string {
  const hash = crypto.createHash('sha256').update(passphrase).digest('hex');
  return hash.substring(0, 4);
}
