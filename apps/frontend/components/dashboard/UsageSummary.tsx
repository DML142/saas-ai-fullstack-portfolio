'use client';

import { useAuthStore } from '@/lib/stores/auth.store';

/** The plan name is now real (webhook-synced tier); the usage numbers below are
 * still illustrative — there's no usage-metering backend yet. */
const TIER_LABEL: Record<string, string> = {
  FREE: 'Free',
  LITE: 'Lite',
  PRO: 'Pro',
  ULTRA: 'Ultra',
};

const USAGE = [
  { label: 'COS Cloud storage', used: 1.2, limit: 5, unit: 'GB' },
  { label: 'Messages this month', used: 340, limit: 1000, unit: '' },
];

export function UsageSummary() {
  const tier = useAuthStore((s) => s.user?.tier);
  const tierName = TIER_LABEL[tier ?? 'FREE'] ?? 'Free';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/10 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">{tierName} plan</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-cosmic-light">
          Preview
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {USAGE.map((item) => {
          const pct = Math.min(100, Math.round((item.used / item.limit) * 100));
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>{item.label}</span>
                <span>
                  {item.used}
                  {item.unit} / {item.limit}
                  {item.unit}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-card/40">
                <div
                  className="h-full rounded-full bg-cosmic-light"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-foreground/40">
        Illustrative preview data — not connected to real billing or usage
        tracking.
      </p>
    </div>
  );
}
