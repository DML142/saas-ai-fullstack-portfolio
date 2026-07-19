'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useDashboardUiStore } from '@/lib/stores/dashboard-ui.store';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Matches Tailwind's `md` — same breakpoint the landing page's own
 * mobile/desktop JS switches already use, so this doesn't drift from CSS. */
const MOBILE_QUERY = '(max-width: 767px)';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const sidebarOpen = useDashboardUiStore((s) => s.sidebarOpen);
  const closeSidebar = useDashboardUiStore((s) => s.closeSidebar);
  const isMobile = useMediaQuery(MOBILE_QUERY);

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
          'md:static md:z-auto md:min-h-screen md:translate-x-0 md:bg-card/10',
        )}
      >
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Image src="/cosico.png" alt="COS Code" width={28} height={28} />
          <span className="font-display text-sm text-ink">COS Assistant</span>
        </Link>

        <p className="mb-2 px-3 text-xs tracking-widest text-foreground/50 uppercase">
          Workspaces
        </p>
        <nav className="flex flex-col gap-1">
          {workspaces.map((ws) => {
            const active = pathname === '/dashboard' && ws.id === activeId;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => selectWorkspace(ws.id)}
                className={cn(
                  'truncate rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-primary/15 text-ink'
                    : 'text-foreground/70 hover:bg-card/20 hover:text-ink',
                )}
              >
                {ws.name}
              </button>
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
    </>
  );
}
