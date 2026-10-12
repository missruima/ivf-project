export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatLimits {
  maxMessages: number;
  maxMessageChars: number;
  maxTotalChars: number;
}

export const RESEARCH_LIMITS: ChatLimits = {
  maxMessages: 12,
  maxMessageChars: 4000,
  maxTotalChars: 12000,
};

export const EXTRACTION_LIMITS: ChatLimits = {
  maxMessages: 30,
  maxMessageChars: 3000,
  maxTotalChars: 16000,
};

export function validateChatPayload(
  value: unknown,
  limits: ChatLimits,
): { messages: ChatMessageInput[] } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.messages) || record.messages.length === 0 || record.messages.length > limits.maxMessages) return null;
  let total = 0;
  const messages: ChatMessageInput[] = [];
  for (const item of record.messages) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const message = item as Record<string, unknown>;
    if (message.role !== 'user' && message.role !== 'assistant') return null;
    if (typeof message.content !== 'string' || message.content.length === 0 || message.content.length > limits.maxMessageChars) return null;
    if (Object.keys(message).some((key) => key !== 'role' && key !== 'content')) return null;
    total += message.content.length;
    if (total > limits.maxTotalChars) return null;
    messages.push({ role: message.role, content: message.content });
  }
  return { messages };
}

export function hasOversizedBody(request: Request, maxBytes = 65536): boolean {
  const raw = request.headers.get('content-length');
  if (!raw) return false;
  const length = Number(raw);
  return !Number.isFinite(length) || length < 0 || length > maxBytes;
}

export async function readBoundedJson(request: Request, maxBytes = 65536): Promise<unknown> {
  const encoding = request.headers.get('content-encoding');
  if (encoding && encoding.toLowerCase() !== 'identity') throw new Error('unsupported_encoding');
  if (hasOversizedBody(request, maxBytes)) throw new Error('body_too_large');
  if (!request.body) throw new Error('invalid_json');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('body_too_large');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('invalid_json');
  }
}
