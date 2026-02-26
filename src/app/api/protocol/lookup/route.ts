import { lookupByPassphrase } from '@/lib/services/protocol';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const clientId = getClientId(request, 'protocolLookup');
  if (isRateLimited(clientId, RATE_LIMITS.protocolLookup)) {
    return Response.json(
      { error: 'Too many lookup attempts. Please wait before trying again.' },
      { status: 429 }
    );
  }

  let body: { passphrase: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.passphrase || typeof body.passphrase !== 'string') {
    return Response.json({ error: 'Passphrase is required.' }, { status: 400 });
  }

  // Basic format validation
  const parts = body.passphrase.trim().toLowerCase().split('-');
  if (parts.length < 3) {
    return Response.json(
      { error: 'Invalid passphrase format. It should look like: word-word-word-number' },
      { status: 400 }
    );
  }

  try {
    const result = await lookupByPassphrase(body.passphrase.trim().toLowerCase());

    if (!result) {
      // Add a small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500));
      return Response.json({ found: false });
    }

    // Don't return the passphrase hash or prefix
    return Response.json({
      found: true,
      protocol: result,
    });
  } catch (error) {
    console.error('Lookup error:', error);
    return Response.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
