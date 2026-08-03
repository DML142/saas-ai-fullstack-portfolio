'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useDashboardUiStore } from '@/lib/stores/dashboard-ui.store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  createWorkspace,
  deleteWorkspace,
  exportWorkspace,
  importWorkspace,
  renameWorkspace,
  type Workspace,
} from '@/lib/stores/chat';
import { useMessageStore } from '@/lib/stores/message.store';
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from './Modal';

/** Matches Tailwind's `md` — same breakpoint the landing page's own
 * mobile/desktop JS switches already use, so this doesn't drift from CSS. */
const MOBILE_QUERY = '(max-width: 767px)';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const status = useWorkspaceStore((s) => s.status);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const sidebarOpen = useDashboardUiStore((s) => s.sidebarOpen);
  const closeSidebar = useDashboardUiStore((s) => s.closeSidebar);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  // Which workspace each dialog acts on. Holding the whole object (not the id)
  // keeps the dialog copy stable if the list re-renders.
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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
      // Drop the workspace and its cached messages — the server already
      // cascade-deleted them, so keeping them here would be stale.
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
    } catch {}
  }

  async function handleExport(ws: Workspace) {
    try {
      const data = await exportWorkspace(ws.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ws.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // best-effort — no per-row error slot to surface this in
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportError(null);
    try {
      // Strip extra fields (e.g. `exportedAt`) so re-importing a file exactly
      // as exported doesn't trip the API's forbidNonWhitelisted validation.
      const { version, name, messages } = JSON.parse(await file.text());
      const workspace = await importWorkspace({ version, name, messages });
      useWorkspaceStore.getState().addWorkspace(workspace);
      setActive(workspace.id);
      if (pathname !== '/dashboard') router.push('/dashboard');
      closeSidebar();
    } catch {
      setImportError('Import failed. Check the file and try again.');
    }
  }

  function selectWorkspace(id: string) {
    setActive(id);
    // Picking a workspace from anywhere (e.g. settings) lands back on the
    // main chat view.
    if (pathname !== '/dashboard') router.push('/dashboard');
    closeSidebar();
  }

  return (
    <>
      {/* Backdrop: mobile only (md:hidden), dims the chat behind the open
          drawer and doubles as a tap-to-close target. */}
      <div
        onClick={closeSidebar}
        aria-hidden
        className={cn(
          'fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        // `inert` blocks focus into the off-screen drawer, but only on mobile:
        // on desktop the sidebar is always visible and must stay focusable.
        inert={isMobile && !sidebarOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border/60 bg-bg px-4 py-6 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: back in normal flow, always visible. h-screen gives the
          // nav's flex-1 a definite height to scroll within.
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
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className={cn(
            'flex items-center justify-start gap-2 truncate rounded-lg bg-white/5 px-3 py-2 mb-1 text-left text-sm transition-colors text-foreground/70 hover:bg-white/10 hover:text-ink',
          )}
        >
          <Upload className="w-5" />
          Import chat.
        </button>
        {importError && (
          <p className="mb-2 px-3 text-xs text-destructive">{importError}</p>
        )}
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
              // A row, not one button: name + two actions are three separate
              // controls, and nesting buttons is invalid HTML.
              <div
                key={ws.id}
                className={cn(
                  // shrink-0 so rows keep their height and the nav scrolls
                  // instead of compressing every row to fit.
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
                  aria-label={`Export ${ws.name}`}
                  onClick={() => handleExport(ws)}
                  className="shrink-0 rounded p-1.5 text-foreground/40 transition-colors hover:bg-card/40 hover:text-ink"
                >
                  <Download size={14} />
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
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              className="mb-1 block rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-card/20 hover:text-ink"
            >
              Admin
            </Link>
          )}
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

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFile}
      />

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
            {/* Explicit trailing space inside the span — JSX drops the
                newline here, giving "…nameand all of its messages". */}
            Delete <span className="text-ink">{deleteTarget?.name} </span>and
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
