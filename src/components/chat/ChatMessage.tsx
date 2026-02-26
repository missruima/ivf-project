import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { CitationCard } from './CitationCard';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-1',
          isUser ? 'bg-primary/10 text-primary' : 'bg-sage-light/30 text-sage'
        )}
      >
        {isUser ? '👤' : '🌸'}
      </div>

      <div className={cn('flex-1 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-muted/70 text-foreground rounded-tl-md'
          )}
        >
          {message.content ? (
            isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div className="prose prose-sm max-w-none prose-headings:text-base prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5 prose-ul:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 space-y-2 w-full">
            <p className="text-xs font-medium text-muted-foreground">
              Referenced papers:
            </p>
            {message.citations.map((citation) => (
              <CitationCard key={citation.pmid} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
