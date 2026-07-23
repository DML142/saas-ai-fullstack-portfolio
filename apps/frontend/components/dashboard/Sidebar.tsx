'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useDashboardUiStore } from '@/lib/stores/dashboard-ui.store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  createWorkspace,
  deleteWorkspace,
  renameWorkspace,
  type Workspace,
} from '@/lib/stores/chat';
import { useMessageStore } from '@/lib/stores/message.store';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from './Modal';

/** Matches Tailwind's `md` — same breakpoint the landing page's own
 * mobile/desktop JS switches already use, so this doesn't drift from CSS. */
const MOBILE_QUERY = '(max-width: 767px)';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const status = useWorkspaceStore((s) => s.status);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const sidebarOpen = useDashboardUiStore((s) => s.sidebarOpen);
  const closeSidebar = useDashboardUiStore((s) => s.closeSidebar);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  // Which workspace (if any) each dialog is acting on. Holding the whole
  // object, not just the id, keeps the dialog copy stable even if the list
  // re-renders underneath.
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const name = renameDraft.trim();
    if (!renameTarget || !name || busy) return;
    setBusy(true);
    try {
      const updated = await renameWorkspace(renameTarget.id, name);
      useWorkspaceStore.getState().updateWorkspace(updated.id, updated.name);
      setRenameTarget(null);
    } catch {
      // leave the dialog open so the typed name isn't lost
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      await deleteWorkspace(deleteTarget.id);
      // Drop the workspace *and* its cached messages — the server cascade
      // already removed them, so leaving them in the store would be stale.
      useWorkspaceStore.getState().deleteWorkspace(deleteTarget.id);
      useMessageStore.getState().dropWorkspace(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // keep the dialog open
    } finally {
      setBusy(false);
    }
  }

  async function handleNewChat() {
    try {
      const workspace = await createWorkspace('New chat');

      useWorkspaceStore.getState().addWorkspace(workspace);

      if (pathname !== '/dashboard') router.push('/dashboard');
      closeSidebar();
    } catch {
      //error here
    }
  }

  function selectWorkspace(id: string) {
    setActive(id);
    // Picking a workspace from anywhere (e.g. from /dashboard/settings)
    // should land back on the main chat view, same as clicking a chat in
    // Claude Desktop's sidebar switches both the selection and the view.
    if (pathname !== '/dashboard') router.push('/dashboard');
    closeSidebar();
  }

  return (
    <>
      {/* Backdrop: mobile only (md:hidden), dims the chat behind the open
          drawer and doubles as a tap-to-close target. Not `isMobile`-gated
          in JS — md:hidden already removes it from layout/paint on desktop
          regardless of `sidebarOpen`, so no extra condition needed here. */}
      <div
        onClick={closeSidebar}
        aria-hidden
        className={cn(
          'fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        // `inert` blocks keyboard/AT focus into an off-screen drawer — but
        // only on mobile. On desktop the sidebar is always visible and must
        // stay focusable regardless of `sidebarOpen` (that flag is mobile-only
        // state), hence the `isMobile` gate rather than using `!sidebarOpen`
        // directly.
        inert={isMobile && !sidebarOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border/60 bg-bg px-4 py-6 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: back in normal flow, always visible, transform reset.
          // h-screen (definite height) so the nav's flex-1 has something to
          // resolve against and can scroll internally instead of overflowing.
          'md:static md:z-auto md:h-screen md:translate-x-0 md:bg-card/10',
        )}
      >
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Image src="/cosico.png" alt="COS Code" width={28} height={28} />
          <span className="font-display text-sm text-ink">COS Assistant</span>
        </Link>

        <p className="mb-2 px-3 text-xs tracking-widest text-foreground/50 uppercase">
          Workspaces
        </p>
        <button
          type="button"
          onClick={() => handleNewChat()}
          className={cn(
            'flex items-center justify-around truncate rounded-lg bg-white/5 px-3 py-2 mb-3 text-left text-sm transition-colors text-foreground/70 hover:bg-white/10 hover:text-ink',
          )}
        >
          <Plus className="w-5" />
          Create new workspace.
        </button>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {status === 'loading' && (
            <p className="px-3 py-2 text-sm text-foreground/50">Loading…</p>
          )}
          {status === 'error' && (
            <p className="px-3 py-2 text-sm text-destructive">
              Couldn&apos;t load workspaces.
            </p>
          )}
          {status === 'loaded' && workspaces.length === 0 && (
            <p className="px-3 py-2 text-sm text-foreground/50">
              No workspaces yet.
            </p>
          )}
          {workspaces.map((ws) => {
            const active = pathname === '/dashboard' && ws.id === activeId;
            return (
              // A row, not a single button: the name and the two actions are
              // three separate controls, and nesting buttons is invalid HTML.
              <div
                key={ws.id}
                className={cn(
                  // shrink-0 so items keep their natural height and the nav
                  // actually overflows (and scrolls) instead of compressing
                  // every row to fit — the default flex-shrink:1 behaviour.
                  'group flex shrink-0 items-center rounded-lg pr-1 transition-colors',
                  active ? 'bg-primary/15' : 'hover:bg-card/20',
                )}
              >
                <button
                  type="button"
                  onClick={() => selectWorkspace(ws.id)}
                  className={cn(
                    'min-w-0 flex-1 truncate px-3 py-2 text-left text-sm transition-colors',
                    active ? 'text-ink' : 'text-foreground/70 hover:text-ink',
                  )}
                >
                  {ws.name}
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${ws.name}`}
                  onClick={() => {
                    setRenameDraft(ws.name);
                    setRenameTarget(ws);
                  }}
                  className="shrink-0 rounded p-1.5 text-foreground/40 transition-colors hover:bg-card/40 hover:text-ink"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${ws.name}`}
                  onClick={() => setDeleteTarget(ws)}
                  className="shrink-0 rounded p-1.5 text-foreground/40 transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/60 pt-4">
          <Link
            href="/dashboard/settings"
            onClick={closeSidebar}
            className={cn(
              'block rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === '/dashboard/settings'
                ? 'bg-primary/15 text-ink'
                : 'text-foreground/70 hover:bg-card/20 hover:text-ink',
            )}
          >
            Settings
          </Link>
        </div>
      </aside>

      <Modal
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename workspace"
      >
        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <Input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            maxLength={100}
            placeholder="Workspace name"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || renameDraft.trim().length === 0}
              className="border-2 border-primary/80 bg-primary/60"
            >
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete workspace"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground/70">
            {/* Explicit {' '} rather than relying on the newline after
                </span> — JSX drops that space here, which renders as
                "…workspaceNameand all of its messages". */}
            Delete <span className="text-ink">{deleteTarget?.name}</span> and
            all of its messages? This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={handleDelete}
            >
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
