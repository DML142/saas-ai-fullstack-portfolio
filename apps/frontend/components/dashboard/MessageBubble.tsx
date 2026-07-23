import type { ChatMessage } from '@/lib/stores/chat';
import { cn } from '@/lib/utils';
import { MessageContent } from './MessageContent';

/** User messages align right in the primary color, matching the accent used
 * everywhere else in the dashboard; assistant replies align left in a
 * neutral card tone — the same left/right + color split most chat UIs use,
 * so the distinction reads at a glance without needing a label. */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary/60 text-ink'
            : 'border border-border/60 bg-card/20 text-ink',
        )}
      >
        <MessageContent content={message.content} />
      </div>
    </div>
  );
}
