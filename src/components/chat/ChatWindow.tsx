'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatWindowProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  emptyState?: React.ReactNode;
}

export function ChatWindow({ messages, isStreaming, emptyState }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0 && emptyState) {
    return <div className="h-full flex items-center justify-center p-8">{emptyState}</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
