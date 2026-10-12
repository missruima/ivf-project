import { describe, expect, it } from 'vitest';
import { readBoundedJson, RESEARCH_LIMITS, validateChatPayload } from './request-validation';

describe('validateChatPayload', () => {
  it('accepts bounded text messages', () => {
    expect(validateChatPayload({ messages: [{ role: 'user', content: 'IVF question' }] }, RESEARCH_LIMITS)).not.toBeNull();
  });

  it.each([
    { messages: [] },
    { messages: [{ role: 'system', content: 'x' }] },
    { messages: [{ role: 'user', content: ['x'] }] },
    { messages: [{ role: 'user', content: 'x', extra: true }] },
    { messages: [{ role: 'user', content: 'x'.repeat(4001) }] },
  ])('rejects malformed or oversized payload %#', (payload) => {
    expect(validateChatPayload(payload, RESEARCH_LIMITS)).toBeNull();
  });
});

describe('readBoundedJson', () => {
  it('rejects an oversized chunked body without Content-Length', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`{"messages":[{"role":"user","content":"${'x'.repeat(70000)}"}]}`));
        controller.close();
      },
    });
    const request = new Request('https://example.test', { method: 'POST', body, duplex: 'half' } as RequestInit & { duplex: 'half' });
    await expect(readBoundedJson(request)).rejects.toThrow('body_too_large');
  });

  it('rejects compressed request bodies', async () => {
    const request = new Request('https://example.test', { method: 'POST', body: '{}', headers: { 'content-encoding': 'gzip' } });
    await expect(readBoundedJson(request)).rejects.toThrow('unsupported_encoding');
  });
});
