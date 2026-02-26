import Anthropic from '@anthropic-ai/sdk';
import { searchAndFetchArticles } from '@/lib/services/pubmed';
import { getResearchSystemPrompt } from '@/lib/prompts/research-system';
import { isRateLimited, getClientId, RATE_LIMITS } from '@/lib/rate-limit';
import { checkTopicRelevance } from '@/lib/topic-guard';
import type { PubMedCitation } from '@/types/chat';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  // Rate limit check
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

  const systemPrompt = getResearchSystemPrompt(pubmedContext);

  // Stream Claude response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
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

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
