'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { getStats, type AdminStats } from '@/lib/stores/admin';

type LoadState = 'loading' | 'loaded' | 'error';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/10 p-4">
      <span className="text-xs tracking-widest text-foreground/50 uppercase">
        {label}
      </span>
      <span className="font-display text-2xl text-ink">{value}</span>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setStatus('loaded');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSubs =
    stats?.subscriptionsByTier.reduce((sum, t) => sum + t.count, 0) ?? 0;
  const adminCount =
    stats?.usersByRole.find((r) => r.role === 'ADMIN')?.count ?? 0;
  const totalSignups = stats?.signups.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const maxSignups = Math.max(
    1,
    ...(stats?.signups.map((s) => s.count) ?? [1]),
  );

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Admin overview" />

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-8">
        {status === 'error' && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load platform stats.
          </p>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total users"
            value={status === 'loading' ? '…' : (stats?.totalUsers ?? 0)}
          />
          <StatCard
            label="Admins"
            value={status === 'loading' ? '…' : adminCount}
          />
          <StatCard
            label="Active subscriptions"
            value={status === 'loading' ? '…' : activeSubs}
          />
          <StatCard
            label="Signups (30d)"
            value={status === 'loading' ? '…' : totalSignups}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Users by role
          </h2>
          <div className="flex flex-wrap gap-3">
            {stats?.usersByRole.map((r) => (
              <div
                key={r.role}
                className="rounded-lg border border-border/60 bg-card/10 px-4 py-2 text-sm"
              >
                <span className="text-foreground/60">{r.role}</span>{' '}
                <span className="text-ink">{r.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Subscriptions by tier
          </h2>
          <div className="flex flex-wrap gap-3">
            {stats?.subscriptionsByTier.map((t) => (
              <div
                key={t.tier}
                className="rounded-lg border border-border/60 bg-card/10 px-4 py-2 text-sm"
              >
                <span className="text-foreground/60">{t.tier}</span>{' '}
                <span className="text-ink">{t.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Signups — last 30 days
          </h2>
          {stats && stats.signups.length > 0 ? (
            <div className="flex h-32 items-end gap-1 rounded-xl border border-border/60 bg-card/10 p-4">
              {stats.signups.map((s) => (
                <div
                  key={s.day}
                  title={`${new Date(s.day).toLocaleDateString()}: ${s.count}`}
                  className="flex-1 rounded-t bg-cosmic-light/70"
                  style={{
                    height: `${Math.max(4, (s.count / maxSignups) * 100)}%`,
                  }}
                />
              ))}
            </div>
          ) : (
            status === 'loaded' && (
              <p className="text-sm text-foreground/50">
                No signups in this window.
              </p>
            )
          )}
        </section>
      </div>
    </div>
  );
}
