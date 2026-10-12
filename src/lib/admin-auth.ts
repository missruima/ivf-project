import { createHash, timingSafeEqual } from 'crypto';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function isValidAdminToken(presented: string | null, configured = process.env.ADMIN_SECRET): boolean {
  if (!configured || configured.length < 24 || !presented) return false;
  return timingSafeEqual(digest(presented), digest(configured));
}
