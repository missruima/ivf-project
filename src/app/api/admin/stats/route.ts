import { getAdminStats } from '@/lib/services/admin-stats';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = getAdminStats();
    return Response.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    return Response.json(
      { error: 'Failed to load admin statistics.' },
      { status: 500 }
    );
  }
}
