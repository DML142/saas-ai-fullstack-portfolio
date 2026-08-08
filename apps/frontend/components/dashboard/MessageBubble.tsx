import type { ChatMessage } from '@/lib/stores/chat';
import { cn } from '@/lib/utils';
import { MessageContent } from './MessageContent';

/** Left/right + color split, the same convention most chat UIs use, so the
 * distinction reads at a glance without needing a label. */
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
