'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getUsage, type Usage } from '@/lib/stores/chat';

const TIER_LABEL: Record<string, string> = {
  FREE: 'Free',
  LITE: 'Lite',
  PRO: 'Pro',
  ULTRA: 'Ultra',
};

/** Storage metering has no backend yet — stays illustrative. */
const STORAGE = { label: 'COS Cloud storage', used: 1.2, limit: 5, unit: 'GB' };

export function UsageSummary() {
  const tier = useAuthStore((s) => s.user?.tier);
  const tierName = TIER_LABEL[tier ?? 'FREE'] ?? 'Free';
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUsage()
      .then((data) => {
        if (!cancelled) setUsage(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const storagePct = Math.min(
    100,
    Math.round((STORAGE.used / STORAGE.limit) * 100),
  );
  const messagesPct =
    usage && usage.limit !== null
      ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
      : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/10 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">{tierName} plan</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-cosmic-light">
          Preview
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>{STORAGE.label}</span>
            <span>
              {STORAGE.used}
              {STORAGE.unit} / {STORAGE.limit}
              {STORAGE.unit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-card/40">
            <div
              className="h-full rounded-full bg-cosmic-light"
              style={{ width: `${storagePct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Messages this month</span>
            <span>
              {usage
                ? usage.limit === null
                  ? `${usage.used} sent · Unlimited`
                  : `${usage.used} / ${usage.limit}`
                : 'Loading…'}
            </span>
          </div>
          {messagesPct !== null && (
            <div className="h-1.5 rounded-full bg-card/40">
              <div
                className="h-full rounded-full bg-cosmic-light"
                style={{ width: `${messagesPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-foreground/40">
        Cloud storage is illustrative preview data — message usage above is
        real.
      </p>
    </div>
  );
}
