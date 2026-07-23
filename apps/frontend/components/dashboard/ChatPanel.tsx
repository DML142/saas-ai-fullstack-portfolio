'use client';

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useMessageStore } from '@/lib/stores/message.store';
import { DashboardHeader } from './DashboardHeader';
import { MessageBubble } from './MessageBubble';
import { useEffect, useRef, useState } from 'react';
import { getMessages, sendMessage, type ChatMessage } from '@/lib/stores/chat';

// One shared reference for the "no messages" case. Returning a fresh `[]` from
// the derivation below on every render would give `messages` a new identity
// each time, making it an unstable dependency for the auto-scroll effect (and
// tripping react-hooks/exhaustive-deps). A stable constant fixes that without
// a useMemo, since the non-empty case is already a stable Zustand reference.
const EMPTY: ChatMessage[] = [];

export function ChatPanel() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const status = useWorkspaceStore((s) => s.status);
  const active = workspaces.find((ws) => ws.id === activeId);
  // A user message is sent but the simulated reply hasn't arrived over the
  // socket yet — used to lock the input until the "assistant" answers.
  const pending = useMessageStore((s) => s.pending);
  const isPending = activeId ? pending.has(activeId) : false;
  // Whatever's already in the store for this workspace — pushed live via the
  // socket (section 6). Loading the full history on selection is section 8's
  // job; this just renders what's already there.
  //
  // Select the raw `byWorkspace` slice — a stable reference that only
  // changes when the store actually updates — and derive `messages` from it
  // here in the render body, not inside the selector. A selector that builds
  // a *new* `[]` on every call (e.g. `s.byWorkspace[id] ?? []`) breaks
  // useSyncExternalStore's snapshot-stability contract, since "empty" then
  // never compares equal to itself across renders — that's what triggers
  // React's "getSnapshot should be cached" infinite-loop warning.
  const byWorkspace = useMessageStore((s) => s.byWorkspace);
  const messages = activeId ? (byWorkspace[activeId] ?? EMPTY) : EMPTY;

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Keep the newest message in view — on send, on socket reply, and while the
  // "typing…" indicator is showing.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isPending]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      try {
        const history = await getMessages(activeId);
        if (!cancelled) {
          useMessageStore.getState().setMessages(activeId, history);
          useMessageStore.getState().markRead(activeId);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const locked = !active || sending || isPending;

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    try {
      const message = await sendMessage(activeId, content);
      useMessageStore.getState().addMessage(message);
      setInput('');
    } catch {
      // make it
    } finally {
      setSending(false);
    }
  }

  // Loading and "loaded but nothing selected" are different situations, not
  // the same empty state: the first is "hang on," the second is "there's
  // genuinely nothing here yet" (no workspaces, or none created).
  const emptyMessage =
    status === 'loading'
      ? 'Loading your workspaces…'
      : status === 'error'
        ? "Couldn't load your workspaces."
        : !active
          ? 'No workspace selected — create one to get started.'
          : 'Send message to start chatting.';

  return (
    // h-full + overflow-hidden bounds the panel to the (screen-height) layout
    // so only the messages region scrolls — header and composer stay put.
    <div className="flex h-full flex-col overflow-hidden">
      <DashboardHeader title={active?.name ?? ''} />

      {messages.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4"
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isPending && (
            <p className="px-1 text-sm text-foreground/40 italic">
              COS Assistant is typing…
            </p>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <MessageSquare
            className="text-foreground/30"
            size={32}
            strokeWidth={1.5}
          />
          <p className="text-sm text-foreground/50">{emptyMessage}</p>
        </div>
      )}

      <div className="shrink-0 border-t border-border/60 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={locked}
            placeholder={
              isPending ? 'Waiting for reply…' : 'Enter message here.'
            }
            className="flex-1"
          />
          <Button
            disabled={locked}
            type="submit"
            size="sm"
            className="border-2 border-primary/80 bg-primary/60"
          >
            Send
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-foreground/40">
          Replies are simulated — COS Assistant isn&apos;t a real AI model.
        </p>
      </div>
    </div>
  );
}
