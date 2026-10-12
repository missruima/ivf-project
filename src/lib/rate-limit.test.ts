import { describe, expect, it, beforeEach } from 'vitest';
import { getClientId, isRateLimited, rateLimitStoreSizeForTest, resetRateLimitStoreForTest } from './rate-limit';

describe('bounded rate limiter', () => {
  beforeEach(resetRateLimitStoreForTest);

  it('ignores forged forwarding headers without the private proxy token', () => {
    const request = new Request('https://example.test', { headers: { 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' } });
    expect(getClientId(request, 'test')).toBe('unknown:test');
  });

  it('uses only the dedicated Caddy-overwritten limiter header', () => {
    const request = new Request('https://example.test', { headers: { 'x-rate-limit-ip': '1.2.3.4', 'cf-connecting-ip': '9.9.9.9' } });
    expect(getClientId(request, 'test')).toBe('1.2.3.4:test');
  });

  it('blocks after the configured limit', () => {
    expect(isRateLimited('a', { maxRequests: 1, windowMs: 1000 })).toBe(false);
    expect(isRateLimited('a', { maxRequests: 1, windowMs: 1000 })).toBe(true);
  });

  it('keeps the store bounded under unique-key pressure', () => {
    for (let i = 0; i < 8300; i += 1) isRateLimited(`key-${i}`, { maxRequests: 1, windowMs: 3600000 });
    expect(rateLimitStoreSizeForTest()).toBeLessThanOrEqual(8192);
  });
});
