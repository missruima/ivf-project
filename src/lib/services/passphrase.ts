import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import adjectives from '../../../wordlists/adjectives.json';
import nouns from '../../../wordlists/nouns.json';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

function secureRandomIndex(max: number): number {
  return crypto.randomInt(0, max);
}

/**
 * Generate a memorable high-entropy passphrase.
 *
 * The bundled lists contain 293 adjectives and 311 nouns. Four adjective and
 * three noun picks plus an eight-digit suffix provide about 84 bits of entropy. Existing
 * shorter passphrases remain valid because verification does not enforce this
 * issuance format.
 */
export function generatePassphrase(): string {
  while (true) {
    const words: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      words.push(adjectives[secureRandomIndex(adjectives.length)]);
      words.push(nouns[secureRandomIndex(nouns.length)]);
    }
    words.push(adjectives[secureRandomIndex(adjectives.length)]);
    words.push(String(crypto.randomInt(10000000, 100000000)));
    const passphrase = words.join('-');
    if (Buffer.byteLength(passphrase, 'utf8') <= 72) return passphrase;
  }
}

export const MAX_PASSPHRASE_LENGTH = 160;

export function normalizePassphrase(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 5 || normalized.length > MAX_PASSPHRASE_LENGTH || Buffer.byteLength(normalized, 'utf8') > 72) return null;
  return normalized;
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
