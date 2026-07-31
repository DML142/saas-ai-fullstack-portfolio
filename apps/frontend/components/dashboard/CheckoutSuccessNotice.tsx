'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { me } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

type Phase = 'finalizing' | 'done' | 'slow';

/**
 * Shown when Stripe redirects back to /dashboard?checkout=success.
 *
 * The tier flips only once the Stripe webhook lands, which can lag the redirect
 * by a moment — so access is never granted from this redirect. We just poll
 * /auth/me until it reports the paid tier (the webhook-synced source of truth),
 * refreshing the store as we go, then strip the query param.
 */
export function CheckoutSuccessNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const tier = useAuthStore((s) => s.user?.tier);

  const isSuccess = params.get('checkout') === 'success';
  const [phase, setPhase] = useState<Phase>('finalizing');
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isSuccess || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    void (async () => {
      for (let i = 0; i < 10 && !cancelled; i++) {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          try {
            const user = await me(token);
            setSession(token, user);
            if (user.tier !== 'FREE') {
              setPhase('done');
              return;
            }
          } catch {
            // Transient — keep polling.
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) setPhase('slow');
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuccess, setSession]);

  // Once terminal, drop the query param so a refresh doesn't replay the notice.
  useEffect(() => {
    if (phase === 'done' || phase === 'slow') {
      const t = setTimeout(() => router.replace('/dashboard'), 4000);
      return () => clearTimeout(t);
    }
  }, [phase, router]);

  if (!isSuccess) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl border border-cosmic/40 bg-card/95 px-4 py-2.5 text-sm shadow-lg backdrop-blur">
        {phase === 'finalizing' && (
          <>
            <span className="size-2 animate-pulse rounded-full bg-cosmic-light" />
            <span className="text-ink/80">Finalizing your subscription…</span>
          </>
        )}
        {phase === 'done' && (
          <span className="text-ink">
            🎉 You’re on the <span className="text-cosmic-light">{tier}</span>{' '}
            plan.
          </span>
        )}
        {phase === 'slow' && (
          <span className="text-ink/80">
            Payment received — your plan will update here shortly.
          </span>
        )}
      </div>
    </div>
  );
}
