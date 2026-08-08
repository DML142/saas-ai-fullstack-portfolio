'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startCheckout, type PaidTier } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useResetOnBfcache } from '@/hooks/useResetOnBfcache';
import { PlanButton } from './PlanButton';

// Kept separate from PlanCard so the card stays presentational and the one
// backend-touching call site is isolated. Guests get bounced to /login.
export function CheckoutButton({
  tier,
  name,
}: {
  tier: PaidTier;
  name: string;
}) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  // Back from Stripe restores this page frozen on "Redirecting…"; reset it.
  useResetOnBfcache(() => setState('idle'));

  async function handleChoose() {
    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }

    setState('loading');
    try {
      const { url } = await startCheckout(
        tier,
        // Read the token fresh at click time — it may have refreshed since mount.
        () => useAuthStore.getState().accessToken,
        ({ accessToken, user }) => setSession(accessToken, user),
        () => clearSession(),
      );
      window.location.href = url; // full navigation — Stripe's hosted page is an external origin
    } catch {
      setState('error');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <PlanButton onClick={handleChoose} disabled={state === 'loading'}>
        {state === 'loading' ? 'Redirecting…' : `Choose ${name}`}
      </PlanButton>
      {state === 'error' && (
        <p className="text-center text-xs text-destructive">
          Couldn’t start checkout. Try again.
        </p>
      )}
    </div>
  );
}
