import Anthropic from '@anthropic-ai/sdk';
import { OUTCOME_SYSTEM_PROMPT } from '@/lib/prompts/outcome-system';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';
import { checkTopicRelevance } from '@/lib/topic-guard';
import { EXTRACTION_LIMITS, readBoundedJson, validateChatPayload } from '@/lib/request-validation';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const clientId = getClientId(request, 'outcomeExtract');
  if (isRateLimited(clientId, RATE_LIMITS.outcomeExtract)) {
    return Response.json(
      { error: 'Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await readBoundedJson(request);
  } catch (error) {
    const status = error instanceof Error && error.message === 'body_too_large' ? 413 : 400;
    return Response.json({ error: status === 413 ? 'Request body is too large.' : 'Invalid request body.' }, { status });
  }

  const body = validateChatPayload(rawBody, EXTRACTION_LIMITS);
  if (!body) {
    return Response.json({ error: 'Invalid or oversized messages.' }, { status: 400 });
  }

  // Topic relevance check
  const topicCheck = checkTopicRelevance(body.messages);
  if (!topicCheck.allowed) {
    return Response.json({ error: topicCheck.reason }, { status: 422 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system: OUTCOME_SYSTEM_PROMPT,
          messages: body.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]) });

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({
              type: 'text',
              content: event.delta.text,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      } catch {
        const errorData = JSON.stringify({
          type: 'error',
          error: 'An error occurred. Please try again.',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
