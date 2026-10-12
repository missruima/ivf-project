/** Bounded, process-local rate limiting. IP values are never persisted. */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();
const MAX_KEYS = 8192;
let operations = 0;

export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export const RATE_LIMITS = {
  research: { maxRequests: 30, windowMs: 3600000 } as RateLimitConfig,     // 30/hr
  protocolExtract: { maxRequests: 20, windowMs: 3600000 } as RateLimitConfig,
  outcomeExtract: { maxRequests: 20, windowMs: 3600000 } as RateLimitConfig,
  protocolSubmit: { maxRequests: 3, windowMs: 3600000 } as RateLimitConfig, // 3/hr
  protocolLookup: { maxRequests: 10, windowMs: 3600000 } as RateLimitConfig, // 10/hr
  outcomeUpdate: { maxRequests: 5, windowMs: 3600000 } as RateLimitConfig,  // 5/hr
  protocolDelete: { maxRequests: 5, windowMs: 3600000 } as RateLimitConfig, // 5/hr
  admin: { maxRequests: 8, windowMs: 900000 } as RateLimitConfig,
  stats: { maxRequests: 60, windowMs: 3600000 } as RateLimitConfig,         // 60/hr
} as const;

function prune(now: number): void {
  operations += 1;
  if (operations % 128 === 0) {
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < 3600000);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }
  while (store.size >= MAX_KEYS) {
    const oldest = store.keys().next().value as string | undefined;
    if (!oldest) break;
    store.delete(oldest);
  }
}

/**
 * Check if a request is rate limited.
 * @param identifier - Typically derived from IP + endpoint (e.g., "192.168.1.1:research")
 * @param config - Rate limit configuration
 * @returns true if the request should be BLOCKED
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  prune(now);
  const entry = store.get(identifier) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    return true;
  }

  entry.timestamps.push(now);
  store.delete(identifier);
  store.set(identifier, entry);
  return false;
}

/**
 * Get a client identifier from a request.
 * Uses x-forwarded-for header (for proxied environments) or falls back to a generic key.
 * This is NEVER persisted — only held transiently in memory.
 */
export function getClientId(request: Request, endpoint: string): string {
  const validAddress = (value: string | null): string | null => {
    if (!value || value.length > 64 || !/^[0-9a-fA-F:.]+$/.test(value)) return null;
    return value;
  };
  // Caddy overwrites this header with the TCP peer address. The Next listener
  // binds to loopback, so a client cannot reach it directly and forge the key.
  // Common forwarding headers are intentionally ignored.
  const ip = validAddress(request.headers.get('x-rate-limit-ip')?.trim() ?? null) ?? 'unknown';
  return `${ip}:${endpoint}`;
}

export function rateLimitStoreSizeForTest(): number { return store.size; }
export function resetRateLimitStoreForTest(): void { store.clear(); operations = 0; }
