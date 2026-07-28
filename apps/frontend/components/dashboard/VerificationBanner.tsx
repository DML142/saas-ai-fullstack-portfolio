'use client';

import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { resendVerification } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

type State = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Soft gate for unverified accounts: the app stays usable, but a persistent
 * bar nudges the user to verify and lets them re-request the email.
 *
 * Reads `emailVerified` from the auth store directly (not `useAuth()`, which
 * drops the flag). The bar clears itself once verified, since /verify-email
 * writes the new state back into this same store.
 */
export function VerificationBanner() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [state, setState] = useState<State>('idle');

  // Only unverified, fully-authenticated sessions see the bar.
  if (status !== 'authenticated' || !user || user.emailVerified) return null;

  async function handleResend() {
    setState('sending');
    try {
      await resendVerification(
        // Read the token fresh at click time — it may have refreshed since mount.
        () => useAuthStore.getState().accessToken,
        // On a 401 refresh, persist the rotated session so the app keeps the
        // new token.
        ({ accessToken, user }) => setSession(accessToken, user),
        // Refresh failed — clear the session; RequireAuth bounces to /login.
        () => clearSession(),
      );
      setState('sent');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-cosmic/30 bg-cosmic/10 px-6 py-2.5 text-sm">
      <MailWarning size={16} className="shrink-0 text-cosmic-light" />

      <p className="text-ink/80">
        {state === 'sent'
          ? 'Verification email sent — check your inbox.'
          : 'Your email isn’t verified yet.'}
      </p>

      {state !== 'sent' && (
        <button
          type="button"
          onClick={handleResend}
          disabled={state === 'sending'}
          className="font-medium text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Resend verification email'}
        </button>
      )}

      {state === 'error' && (
        <span className="text-destructive">Couldn’t send. Try again.</span>
      )}
    </div>
  );
}
