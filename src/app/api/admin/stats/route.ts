import { getAdminStats } from '@/lib/services/admin-stats';
import { isValidAdminToken } from '@/lib/admin-auth';
import { getClientId, isRateLimited, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  if (isRateLimited(getClientId(request, 'admin'), RATE_LIMITS.admin)) {
    return Response.json({ error: 'Too many attempts.' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.length < 24) {
    return Response.json({ error: 'Admin access is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!isValidAdminToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const stats = getAdminStats();
    return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin stats error:', error);
    return Response.json(
      { error: 'Failed to load admin statistics.' },
      { status: 500 }
    );
  }
}
