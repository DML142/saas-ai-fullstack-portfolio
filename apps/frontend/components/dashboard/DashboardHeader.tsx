'use client';

import { Menu } from 'lucide-react';
import { useDashboardUiStore } from '@/lib/stores/dashboard-ui.store';
import { AccountBadge } from './AccountBadge';

/** Shared header row for every dashboard page — chat panel and settings
 * alike — so the mobile sidebar toggle and account badge don't have to be
 * rebuilt (and kept in sync) per page. */
export function DashboardHeader({ title }: { title: string }) {
  const toggleSidebar = useDashboardUiStore((s) => s.toggleSidebar);

  return (
    <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          className="-ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-card/20 hover:text-ink md:hidden"
        >
          <Menu size={18} />
        </button>
        <p className="font-display text-lg text-ink">{title}</p>
      </div>
      <AccountBadge />
    </div>
  );
}
