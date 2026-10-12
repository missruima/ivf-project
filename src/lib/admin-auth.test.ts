import { describe, expect, it } from 'vitest';
import { isValidAdminToken } from './admin-auth';

describe('admin token checks', () => {
  it('fails closed without a sufficiently strong configured secret', () => {
    expect(isValidAdminToken('anything', undefined)).toBe(false);
    expect(isValidAdminToken('short', 'short')).toBe(false);
  });

  it('accepts only an exact strong secret', () => {
    const secret = 'correct-secret-with-more-than-24-chars';
    expect(isValidAdminToken(secret, secret)).toBe(true);
    expect(isValidAdminToken('wrong-secret-with-more-than-24-chars', secret)).toBe(false);
  });
});
