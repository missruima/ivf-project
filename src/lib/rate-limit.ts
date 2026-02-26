/**
 * Simple in-memory sliding window rate limiter.
 * IP addresses are only held transiently in memory — never persisted to disk.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3600000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 300000);

export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export const RATE_LIMITS = {
  research: { maxRequests: 30, windowMs: 3600000 } as RateLimitConfig,     // 30/hr
  protocolSubmit: { maxRequests: 3, windowMs: 3600000 } as RateLimitConfig, // 3/hr
  protocolLookup: { maxRequests: 10, windowMs: 3600000 } as RateLimitConfig, // 10/hr
  outcomeUpdate: { maxRequests: 5, windowMs: 3600000 } as RateLimitConfig,  // 5/hr
  protocolDelete: { maxRequests: 5, windowMs: 3600000 } as RateLimitConfig, // 5/hr
  stats: { maxRequests: 60, windowMs: 3600000 } as RateLimitConfig,         // 60/hr
} as const;

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
  const entry = store.get(identifier) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    return true;
  }

  entry.timestamps.push(now);
  store.set(identifier, entry);
  return false;
}

/**
 * Get a client identifier from a request.
 * Uses x-forwarded-for header (for proxied environments) or falls back to a generic key.
 * This is NEVER persisted — only held transiently in memory.
 */
export function getClientId(request: Request, endpoint: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${ip}:${endpoint}`;
}
