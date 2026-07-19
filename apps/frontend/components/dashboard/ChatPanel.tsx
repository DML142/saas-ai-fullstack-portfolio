'use client';

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { DashboardHeader } from './DashboardHeader';

export function ChatPanel() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const active = workspaces.find((ws) => ws.id === activeId);

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title={active?.name ?? ''} />

      {/* Empty state, deliberately not fake history — there's no real chat
          backend yet, so this has to read as "nothing here" rather than
          simulate a conversation that never happened. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <MessageSquare className="text-foreground/30" size={32} strokeWidth={1.5} />
        <p className="text-sm text-foreground/50">
          No messages yet — chat isn&apos;t wired up in this preview.
        </p>
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 px-6 py-4">
        <Input disabled placeholder="Chat is coming soon" className="flex-1" />
        <Button disabled size="sm" className="border-2 border-primary/80 bg-primary/60">
          Send
        </Button>
      </div>
    </div>
  );
}
