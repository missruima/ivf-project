import { deleteByPassphrase, deleteProtocolById } from '@/lib/services/protocol';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const clientId = getClientId(request, 'protocolDelete');
  if (isRateLimited(clientId, RATE_LIMITS.protocolDelete)) {
    return Response.json(
      { error: 'Too many attempts. Please wait before trying again.' },
      { status: 429 }
    );
  }

  let body: { passphrase: string; protocolId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.passphrase || typeof body.passphrase !== 'string') {
    return Response.json({ error: 'Passphrase is required.' }, { status: 400 });
  }

  const parts = body.passphrase.trim().toLowerCase().split('-');
  if (parts.length < 3) {
    return Response.json(
      { error: 'Invalid passphrase format.' },
      { status: 400 }
    );
  }

  try {
    const passphrase = body.passphrase.trim().toLowerCase();

    let deleted: boolean;
    if (body.protocolId) {
      // Delete a single specific cycle
      deleted = await deleteProtocolById(body.protocolId, passphrase);
    } else {
      // Delete ALL cycles for this passphrase
      deleted = await deleteByPassphrase(passphrase);
    }

    if (!deleted) {
      // Same delay as lookup to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500));
      return Response.json({ deleted: false });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error('Delete error:', error);
    return Response.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
