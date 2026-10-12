import { describe, expect, it } from 'vitest';
import adjectives from '../../wordlists/adjectives.json';
import nouns from '../../wordlists/nouns.json';
import { generatePassphrase, normalizePassphrase } from './services/passphrase';

describe('passphrase issuance', () => {
  it('provides more than 80 bits using the bundled lists', () => {
    const entropy = 4 * Math.log2(adjectives.length) + 3 * Math.log2(nouns.length) + Math.log2(90000000);
    expect(entropy).toBeGreaterThan(80);
    const passphrase = generatePassphrase();
    expect(passphrase.split('-')).toHaveLength(8);
    expect(Buffer.byteLength(passphrase, 'utf8')).toBeLessThanOrEqual(72);
  });

  it('continues accepting the legacy format for verification', () => {
    expect(normalizePassphrase('calm-river-bright-42')).toBe('calm-river-bright-42');
  });
});
