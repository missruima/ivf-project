import { protocolSubmitSchema } from '@/lib/validators/protocol';
import { submitProtocol } from '@/lib/services/protocol';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const clientId = getClientId(request, 'protocolSubmit');
  if (isRateLimited(clientId, RATE_LIMITS.protocolSubmit)) {
    return Response.json(
      { error: 'Please wait before submitting another protocol.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Validate with Zod
  const parsed = protocolSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid protocol data.', details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await submitProtocol(parsed.data);
    return Response.json({
      passphrase: result.passphrase,
      protocolId: result.protocolId,
    });
  } catch (error) {
    console.error('Protocol submit error:', error);
    return Response.json(
      { error: 'Failed to save protocol. Please try again.' },
      { status: 500 }
    );
  }
}
