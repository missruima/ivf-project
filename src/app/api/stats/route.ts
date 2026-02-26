import { getAggregateStats } from '@/lib/services/stats';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const clientId = getClientId(request, 'stats');
  if (isRateLimited(clientId, RATE_LIMITS.stats)) {
    return Response.json(
      { error: 'Please wait before refreshing.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get('groupBy') || 'age_bracket';

  const filters = {
    ageBracket: searchParams.get('ageBracket') || undefined,
    protocolType: searchParams.get('protocolType') || undefined,
    amhRange: searchParams.get('amhRange') || undefined,
  };

  try {
    const stats = getAggregateStats(groupBy, filters);
    return Response.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return Response.json(
      { error: 'Failed to load statistics.' },
      { status: 500 }
    );
  }
}
