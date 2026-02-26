'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isStreaming,
  onStop,
  placeholder = 'Type your question...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  return (
    <div className="flex gap-2 items-end">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/50"
        disabled={isStreaming}
      />
      {isStreaming ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onStop}
          className="h-[44px] px-4 shrink-0"
        >
          Stop
        </Button>
      ) : (
        <Button
          onClick={handleSubmit}
          disabled={!input.trim()}
          size="sm"
          className="h-[44px] px-4 shrink-0"
        >
          Send
        </Button>
      )}
    </div>
  );
}
