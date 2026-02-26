import { protocolSubmitSchema } from '@/lib/validators/protocol';
import { submitProtocol, submitProtocolForReturningUser, getPassphraseCredentials } from '@/lib/services/protocol';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const clientId = getClientId(request, 'protocolSubmit');
  if (isRateLimited(clientId, RATE_LIMITS.protocolSubmit)) {
    return Response.json(
      { error: 'Please wait before submitting another protocol.' },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Extract existingPassphrase before Zod validation of protocol fields
  const existingPassphrase = typeof body.existingPassphrase === 'string'
    ? body.existingPassphrase.trim().toLowerCase()
    : null;

  // Remove existingPassphrase from body before validating protocol data
  const { existingPassphrase: _, ...protocolBody } = body;

  // Validate with Zod
  const parsed = protocolSubmitSchema.safeParse(protocolBody);
  if (!parsed.success) {
    console.error('Protocol validation failed:', JSON.stringify(parsed.error.issues, null, 2));
    return Response.json(
      { error: 'Invalid protocol data.', details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    if (existingPassphrase) {
      // Returning user — verify their passphrase and reuse credentials
      const credentials = await getPassphraseCredentials(existingPassphrase);
      if (!credentials) {
        return Response.json(
          { error: 'Invalid passphrase. Could not verify ownership.' },
          { status: 403 }
        );
      }

      const result = submitProtocolForReturningUser(parsed.data, credentials.hash, credentials.prefix);
      return Response.json({
        protocolId: result.protocolId,
        isReturningUser: true,
      });
    } else {
      // New user — generate fresh passphrase
      const result = await submitProtocol(parsed.data);
      return Response.json({
        passphrase: result.passphrase,
        protocolId: result.protocolId,
      });
    }
  } catch (error) {
    console.error('Protocol submit error:', error);
    return Response.json(
      { error: 'Failed to save protocol. Please try again.' },
      { status: 500 }
    );
  }
}
