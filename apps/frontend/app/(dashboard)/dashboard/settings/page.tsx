'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { UsageSummary } from '@/components/dashboard/UsageSummary';
import { useAuth } from '@/hooks/useAuth';
import { useResetOnBfcache } from '@/hooks/useResetOnBfcache';
import { logout, openBillingPortal } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function SettingsPage() {
  const { user } = useAuth();
  const tier = useAuthStore((s) => s.user?.tier);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [loggingOut, setLoggingOut] = useState(false);
  const [billingState, setBillingState] = useState<
    'idle' | 'loading' | 'error'
  >('idle');

  const isFree = !tier || tier === 'FREE';

  // Back from the Stripe portal restores this page frozen on "Opening…"; reset.
  useResetOnBfcache(() => setBillingState('idle'));

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // No explicit redirect — clearing the session flips the status to
      // 'unauthenticated' and <RequireAuth> sends the user to /login.
      useAuthStore.getState().clearSession();
    }
  }

  async function handleManageBilling() {
    setBillingState('loading');
    try {
      const { url } = await openBillingPortal(
        () => useAuthStore.getState().accessToken,
        ({ accessToken, user }) => setSession(accessToken, user),
        () => clearSession(),
      );
      window.location.href = url;
    } catch {
      setBillingState('error');
    }
  }

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Settings" />

      <div className="flex flex-1 flex-col gap-8 px-6 py-8">
        <section className="flex flex-col gap-1">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Account
          </h2>
          <p className="text-ink">{user?.name}</p>
          <p className="text-sm text-foreground/60">
            {user?.role}
            {tier && <span className="text-cosmic-light"> · {tier} plan</span>}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Plan &amp; usage
          </h2>
          <UsageSummary />
        </section>

        <section className="flex flex-col items-start gap-3">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Billing
          </h2>
          <p className="text-sm text-foreground/60">
            Current plan: <span className="text-ink">{tier ?? 'FREE'}</span>
          </p>
          {isFree ? (
            <Link
              href="/#pricing"
              className="text-sm font-medium text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
            >
              Choose a plan →
            </Link>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={billingState === 'loading'}
              onClick={handleManageBilling}
              className="border-2 border-muted-foreground/80"
            >
              {billingState === 'loading' ? 'Opening…' : 'Manage billing'}
            </Button>
          )}
          {billingState === 'error' && (
            <p className="text-xs text-destructive">
              Couldn’t open billing. Try again.
            </p>
          )}
        </section>

        <section className="flex flex-col items-start gap-2">
          <h2 className="text-xs tracking-widest text-foreground/50 uppercase">
            Session
          </h2>
          <Button
            variant="secondary"
            size="sm"
            disabled={loggingOut}
            onClick={handleLogout}
            className="border-2 border-muted-foreground/80"
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </section>
      </div>
    </div>
  );
}
