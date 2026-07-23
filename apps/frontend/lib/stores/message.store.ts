import { create } from 'zustand';
import { ChatMessage } from './chat';
import { useWorkspaceStore } from './workspace.store';

interface MessageState {
  byWorkspace: Record<string, ChatMessage[]>;
  unread: Set<string>;
  /** Workspaces awaiting an assistant reply — a user message has been sent but
   * the simulated reply hasn't come back over the socket yet. Drives the
   * "generating…" input lock in ChatPanel. */
  pending: Set<string>;
  setMessages: (workspaceId: string, messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  markRead: (workspaceId: string) => void;
  /** Forget everything about a workspace — call after it's deleted server-side.
   * Without this, its messages linger in `byWorkspace` forever (a slow leak),
   * and a future workspace that reused the id would inherit stale history. */
  dropWorkspace: (workspaceId: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  byWorkspace: {},
  unread: new Set(),
  pending: new Set(),
  setMessages: (workspaceId, messages) =>
    set((s) => ({
      byWorkspace: { ...s.byWorkspace, [workspaceId]: messages },
    })),
  addMessage: (message) =>
    set((s) => {
      const existing = s.byWorkspace[message.workspaceId] ?? [];
      const isActive =
        useWorkspaceStore.getState().activeId === message.workspaceId;
      const unread = new Set(s.unread);
      if (!isActive) unread.add(message.workspaceId);
      // A USER message going through addMessage is always this tab's own send
      // (history uses setMessages; the socket only ever pushes ASSISTANT), so
      // it opens the pending window; the ASSISTANT reply closes it.
      const pending = new Set(s.pending);
      if (message.role === 'USER') pending.add(message.workspaceId);
      else pending.delete(message.workspaceId);
      return {
        byWorkspace: {
          ...s.byWorkspace,
          [message.workspaceId]: [...existing, message],
        },
        unread,
        pending,
      };
    }),
  markRead: (workspaceId) =>
    set((s) => {
      const unread = new Set(s.unread);
      unread.delete(workspaceId);
      return { unread };
    }),
  dropWorkspace: (workspaceId) =>
    set((s) => {
      // Rebuild `byWorkspace` without the key rather than mutating/deleting in
      // place — the object identity has to change for subscribers to re-render.
      const { [workspaceId]: _removed, ...byWorkspace } = s.byWorkspace;
      const unread = new Set(s.unread);
      unread.delete(workspaceId);
      const pending = new Set(s.pending);
      pending.delete(workspaceId);
      return { byWorkspace, unread, pending };
    }),
}));
