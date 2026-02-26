import { outcomeSubmitSchema } from '@/lib/validators/outcome';
import { lookupByPassphrase, upsertOutcome } from '@/lib/services/protocol';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const clientId = getClientId(request, 'outcomeUpdate');
  if (isRateLimited(clientId, RATE_LIMITS.outcomeUpdate)) {
    return Response.json(
      { error: 'Please wait before updating again.' },
      { status: 429 }
    );
  }

  let body: { passphrase: string; outcome: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.passphrase || typeof body.passphrase !== 'string') {
    return Response.json({ error: 'Passphrase is required.' }, { status: 400 });
  }

  // Validate outcome data
  const parsed = outcomeSubmitSchema.safeParse(body.outcome);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid outcome data.', details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    // Verify passphrase ownership
    const record = await lookupByPassphrase(body.passphrase.trim().toLowerCase());
    if (!record) {
      return Response.json({ error: 'No matching record found.' }, { status: 404 });
    }

    upsertOutcome(record.id, parsed.data);

    return Response.json({ updated: true });
  } catch (error) {
    console.error('Outcome update error:', error);
    return Response.json(
      { error: 'Failed to update outcomes. Please try again.' },
      { status: 500 }
    );
  }
}
