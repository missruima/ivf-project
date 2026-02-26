'use client';

import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type { ChatMessage, PubMedCitation } from '@/types/chat';

interface UseChatOptions {
  endpoint: string;
  onExtractedData?: (data: Record<string, unknown>) => void;
  extraBody?: Record<string, unknown>;
}

export function useChat({ endpoint, onExtractedData, extraBody }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || !content.trim()) return;

      setError(null);
      setIsStreaming(true);

      const userMessage: ChatMessage = {
        id: uuid(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      const assistantMessage: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Build conversation history for the API (exclude the empty assistant message)
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, ...extraBody }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let citations: PubMedCitation[] | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'text') {
                accumulatedText += event.content;

                // Check for extracted data blocks
                const extractedMatch = accumulatedText.match(
                  /<extracted_data>([\s\S]*?)<\/extracted_data>/
                );
                if (extractedMatch && onExtractedData) {
                  try {
                    const data = JSON.parse(extractedMatch[1]);
                    onExtractedData(data);
                  } catch {
                    // Invalid JSON in extraction block, ignore
                  }
                }

                // Update the assistant message (strip extracted_data blocks from display)
                const displayText = accumulatedText
                  // Strip complete blocks
                  .replace(/<extracted_data>[\s\S]*?<\/extracted_data>/g, '')
                  // Strip incomplete block still streaming in (opening tag but no closing tag yet)
                  .replace(/<extracted_data[\s\S]*$/g, '')
                  // Strip partial opening tag at the very end (e.g., "<extract", "<extracted_d")
                  .replace(/<extracted?(?:_data?)?\s*$/g, '')
                  .trim();

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: displayText }
                      : m
                  )
                );
              } else if (event.type === 'citations') {
                citations = event.papers;
              } else if (event.type === 'error') {
                setError(event.error);
              }
            } catch {
              // Skip malformed SSE data
            }
          }
        }

        // Finalize: attach citations to the assistant message
        if (citations) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, citations } : m
            )
          );
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled, do nothing
        } else {
          const message =
            err instanceof Error ? err.message : 'Something went wrong';
          setError(message);
          // Remove the empty assistant message on error
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantMessage.id)
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [endpoint, isStreaming, messages, onExtractedData, extraBody]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
