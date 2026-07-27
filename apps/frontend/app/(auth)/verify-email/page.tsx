'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/stores/auth';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP);

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailInner() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    // Guard against React 18 StrictMode's double-invoke in dev: the token is
    // single-use, so a second fire would 400 a token the first call already
    // consumed and flip a real success into a spurious error.
    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        // If this user is the one currently signed in, reflect the new
        // verified state in the store so the unverified banner clears without
        // a reload. (No session? Nothing to update — the link still works.)
        if (accessToken && user && !user.emailVerified) {
          setSession(accessToken, { ...user, emailVerified: true });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // Intentionally keyed only on `token`: store values are read as a snapshot
    // inside the effect and must not re-trigger the single-use verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const groups = rootRef.current?.querySelectorAll('[data-anim]');
      if (!groups?.length) return;
      // Re-runs on each status change (see dependencies) so whichever state
      // block is mounted fades in cleanly.
      gsap.fromTo(
        groups,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
          stagger: 0.12,
          clearProps: 'visibility,opacity,transform',
        },
      );
    },
    { dependencies: [reducedMotion, status], scope: rootRef },
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-ink">Email verification</h1>

      {status === 'verifying' && (
        <p data-anim className="text-sm text-ink/70">
          Verifying your email...
        </p>
      )}

      {status === 'success' && (
        <>
          <p data-anim className="text-sm text-ink/70">
            Your email is verified. You&apos;re all set.
          </p>
          <Link
            data-anim
            href="/login"
            className="text-sm text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
          >
            Continue to login
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <p data-anim className="text-sm text-destructive">
            This verification link is invalid or has expired. Request a new one
            from your account, then try again.
          </p>
          <Link
            data-anim
            href="/login"
            className="text-sm text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
          >
            Back to login
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink/70">Loading...</p>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
