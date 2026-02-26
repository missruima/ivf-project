import Anthropic from '@anthropic-ai/sdk';
import { EXTRACTION_SYSTEM_PROMPT } from '@/lib/prompts/extraction-system';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';
import { checkTopicRelevance } from '@/lib/topic-guard';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const clientId = getClientId(request, 'research');
  if (isRateLimited(clientId, RATE_LIMITS.research)) {
    return Response.json(
      { error: 'Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  let body: { messages: { role: 'user' | 'assistant'; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'Messages are required.' }, { status: 400 });
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
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: body.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

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
      } catch (error) {
        console.error('[protocol/extract] Anthropic API error:', error);
        const msg = error instanceof Error ? error.message : 'An error occurred.';
        const errorData = JSON.stringify({
          type: 'error',
          error: `An error occurred: ${msg}`,
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
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
