'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardUiStore } from '@/lib/stores/dashboard-ui.store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  ArrowLeft,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Users,
} from 'lucide-react';

/** Matches Tailwind's `md` — same breakpoint the dashboard Sidebar's
 * mobile/desktop split already uses, so this doesn't drift from CSS. */
const MOBILE_QUERY = '(max-width: 767px)';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/queues', label: 'Queues', icon: ListChecks },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const sidebarOpen = useDashboardUiStore((s) => s.sidebarOpen);
  const closeSidebar = useDashboardUiStore((s) => s.closeSidebar);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  return (
    <>
      <div
        onClick={closeSidebar}
        aria-hidden
        className={cn(
          'fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        inert={isMobile && !sidebarOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border/60 bg-bg px-4 py-6 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:static md:z-auto md:h-screen md:translate-x-0 md:bg-card/10',
        )}
      >
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Image src="/cosico.png" alt="COS Code" width={28} height={28} />
          <span className="font-display text-sm text-ink">Admin</span>
        </Link>

        <p className="mb-2 px-3 text-xs tracking-widest text-foreground/50 uppercase">
          Management
        </p>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/15 text-ink'
                    : 'text-foreground/70 hover:bg-card/20 hover:text-ink',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/60 pt-4">
          <Link
            href="/dashboard"
            onClick={closeSidebar}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-card/20 hover:text-ink"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </div>
      </aside>
    </>
  );
}
