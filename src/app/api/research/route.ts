import Anthropic from '@anthropic-ai/sdk';
import { searchAndFetchArticles } from '@/lib/services/pubmed';
import { getResearchSystemPrompt } from '@/lib/prompts/research-system';
import { getCommunityDataContext } from '@/lib/services/community-stats-context';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';
import { checkTopicRelevance } from '@/lib/topic-guard';
import type { PubMedCitation } from '@/types/chat';
import { readBoundedJson, RESEARCH_LIMITS, validateChatPayload } from '@/lib/request-validation';

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

  let rawBody: unknown;
  try {
    rawBody = await readBoundedJson(request);
  } catch (error) {
    const status = error instanceof Error && error.message === 'body_too_large' ? 413 : 400;
    return Response.json({ error: status === 413 ? 'Request body is too large.' : 'Invalid request body.' }, { status });
  }

  const body = validateChatPayload(rawBody, RESEARCH_LIMITS);
  if (!body) {
    return Response.json({ error: 'Invalid or oversized messages.' }, { status: 400 });
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
        }, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(60000)]) });

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

        // Send citations at the end
        if (citations.length > 0) {
          const citationData = JSON.stringify({
            type: 'citations',
            papers: citations.map(({ abstract, ...rest }) => {
              void abstract;
              return rest;
            }),
          });
          controller.enqueue(encoder.encode(`data: ${citationData}\n\n`));
        }

        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));

      } catch (error) {
        console.error('[research] AI service error:', error instanceof Error ? error.name : 'unknown');
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

  return new Response(stream, { headers: { ...SSE_HEADERS, 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' } });
}
