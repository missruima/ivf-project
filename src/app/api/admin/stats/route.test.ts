import { afterEach, describe, expect, it } from 'vitest';
import { resetRateLimitStoreForTest } from '@/lib/rate-limit';
import { GET } from './route';

afterEach(() => {
  delete process.env.ADMIN_SECRET;
  resetRateLimitStoreForTest();
});

describe('admin stats authorization', () => {
  it('fails closed when no strong server secret is configured', async () => {
    const response = await GET(new Request('https://example.test/api/admin/stats'));
    expect(response.status).toBe(503);
  });

  it('rejects a wrong bearer secret before reading stats', async () => {
    process.env.ADMIN_SECRET = 'correct-secret-with-more-than-24-chars';
    const response = await GET(new Request('https://example.test/api/admin/stats', {
      headers: { authorization: 'Bearer wrong-secret-with-more-than-24-chars' },
    }));
    expect(response.status).toBe(401);
  });
});
