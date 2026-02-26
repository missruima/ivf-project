'use client';

import { useChat } from '@/hooks/useChat';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';

const SUGGESTED_QUESTIONS = [
  'What does recent research say about AMH levels and IVF outcomes?',
  'How does age affect the number of eggs retrieved in IVF?',
  'What are the average outcomes for women aged 35-37?',
  'Which protocol type has the best blast rate?',
];

export default function ResearchClient() {
  const { messages, isStreaming, error, sendMessage, stopStreaming } = useChat({
    endpoint: '/api/research',
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-semibold">IVF Explorer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask questions about IVF — answers combine published research and community data
        </p>
      </div>

      <Disclaimer text={DISCLAIMERS.research} variant="info" className="mb-4" />

      {/* Chat area */}
      <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden" style={{ height: 'min(60vh, 500px)' }}>
        <ChatWindow
          messages={messages}
          isStreaming={isStreaming}
          emptyState={
            <EmptyState onSelect={sendMessage} />
          }
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="mt-3">
        <ChatInput
          onSend={sendMessage}
          isStreaming={isStreaming}
          onStop={stopStreaming}
          placeholder="Ask about IVF research..."
        />
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="text-center max-w-md">
      <p className="text-3xl mb-3">📚</p>
      <p className="text-sm font-medium text-foreground mb-1">
        Ask anything about IVF research
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Answers combine published PubMed papers with anonymized data from our community
      </p>
      <div className="space-y-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="block w-full text-left text-xs px-4 py-2.5 rounded-lg border border-border/60 hover:bg-muted/50 hover:border-primary/20 transition-colors text-muted-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
