'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { cn } from '@/lib/utils';
import { getQueues, type QueueHealth } from '@/lib/stores/admin';

type LoadState = 'loading' | 'loaded' | 'error';

const COUNT_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  active: 'Active',
  completed: 'Completed',
  failed: 'Failed',
  delayed: 'Delayed',
  paused: 'Paused',
};

export default function AdminQueuesPage() {
  const [queues, setQueues] = useState<QueueHealth[]>([]);
  const [status, setStatus] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    getQueues()
      .then((data) => {
        if (!cancelled) {
          setQueues(data);
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

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Queues" />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
        {status === 'loading' && (
          <p className="text-sm text-foreground/50">Loading…</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load queue health.
          </p>
        )}

        {status === 'loaded' &&
          queues.map((q) => (
            <section key={q.name} className="flex flex-col gap-3">
              <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
                {q.name}
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(q.counts).map(([key, value]) => {
                  const isFailedWithJobs = key === 'failed' && value > 0;
                  return (
                    <div
                      key={key}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm',
                        isFailedWithJobs
                          ? 'border-destructive/40 bg-destructive/10'
                          : 'border-border/60 bg-card/10',
                      )}
                    >
                      <span className="text-foreground/60">
                        {COUNT_LABELS[key] ?? key}
                      </span>{' '}
                      <span
                        className={
                          isFailedWithJobs ? 'text-destructive' : 'text-ink'
                        }
                      >
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
