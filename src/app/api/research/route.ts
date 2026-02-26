import Anthropic from '@anthropic-ai/sdk';
import { searchAndFetchArticles } from '@/lib/services/pubmed';
import { getResearchSystemPrompt } from '@/lib/prompts/research-system';
import { getCommunityDataContext } from '@/lib/services/community-stats-context';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';
import { checkTopicRelevance } from '@/lib/topic-guard';
import { lookupCache, writeCache, purgeExpiredCache } from '@/lib/services/cache';
import type { PubMedCitation } from '@/types/chat';

const anthropic = new Anthropic();

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
};

export async function POST(request: Request) {
  // Rate limit check
  const clientId = getClientId(request, 'research');
  if (isRateLimited(clientId, RATE_LIMITS.research)) {
    return Response.json(
      { error: 'Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  // Probabilistic cache cleanup (~1% of requests)
  if (Math.random() < 0.01) {
    try { purgeExpiredCache(); } catch { /* non-critical */ }
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

  // Topic relevance check — blocks obviously off-topic messages before spending tokens
  const topicCheck = checkTopicRelevance(body.messages);
  if (!topicCheck.allowed) {
    return Response.json({ error: topicCheck.reason }, { status: 422 });
  }

  // Get the latest user message for PubMed search
  const latestUserMessage = [...body.messages]
    .reverse()
    .find((m) => m.role === 'user');
  if (!latestUserMessage) {
    return Response.json({ error: 'No user message found.' }, { status: 400 });
  }

  // ── Cache lookup (first-turn only) ──
  // Multi-turn conversations depend on context and can't be reliably cached.
  const isFirstTurn = body.messages.filter((m) => m.role === 'user').length === 1;

  if (isFirstTurn) {
    const cached = lookupCache(latestUserMessage.content);
    if (cached) {
      return streamCachedResponse(cached.responseText, cached.citations);
    }
  }

  // Search PubMed for relevant articles
  let citations: PubMedCitation[] = [];
  try {
    citations = await searchAndFetchArticles(latestUserMessage.content, 5);
  } catch {
    // Continue without citations if PubMed fails
  }

  // Build the PubMed context for the system prompt
  const pubmedContext = citations.length > 0
    ? citations
        .map(
          (c, i) =>
            `[${i + 1}] ${c.authors} (${c.year}). "${c.title}". ${c.journal}. PMID: ${c.pmid}\nAbstract: ${c.abstract || 'Not available'}`
        )
        .join('\n\n')
    : '';

  // Fetch community data context (synchronous, fast)
  const communityContext = getCommunityDataContext();

  const systemPrompt = getResearchSystemPrompt(pubmedContext, communityContext);

  // Stream Claude response
  const encoder = new TextEncoder();
  let fullResponseText = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          system: systemPrompt,
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
            fullResponseText += event.delta.text;
            const data = JSON.stringify({
              type: 'text',
              content: event.delta.text,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Send citations at the end
        if (citations.length > 0) {
          const citationData = JSON.stringify({
            type: 'citations',
            papers: citations.map(({ abstract: _abstract, ...rest }) => rest),
          });
          controller.enqueue(encoder.encode(`data: ${citationData}\n\n`));
        }

        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));

        // ── Cache write (first-turn, non-trivial responses only) ──
        if (isFirstTurn && fullResponseText.length > 50) {
          try {
            writeCache(
              latestUserMessage.content,
              fullResponseText,
              citations.length > 0 ? citations : null,
              'live'
            );
          } catch {
            // Cache write failure is non-critical
          }
        }
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          error: 'An error occurred while generating a response. Please try again.',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * Stream a cached response back to the client using the same SSE format.
 * Sent as a single text chunk for instant display.
 */
function streamCachedResponse(
  responseText: string,
  citations: PubMedCitation[] | null
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const textData = JSON.stringify({ type: 'text', content: responseText });
      controller.enqueue(encoder.encode(`data: ${textData}\n\n`));

      if (citations && citations.length > 0) {
        const citationData = JSON.stringify({ type: 'citations', papers: citations });
        controller.enqueue(encoder.encode(`data: ${citationData}\n\n`));
      }

      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
