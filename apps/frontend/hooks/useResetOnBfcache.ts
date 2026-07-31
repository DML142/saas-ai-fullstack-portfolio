'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `reset` when the page is restored from the browser's back-forward cache.
 *
 * After a `window.location` redirect (e.g. to Stripe Checkout or the billing
 * portal), pressing Back restores this page from the bfcache with React state
 * frozen — leaving a loading button stuck on "Redirecting…" / "Opening…". The
 * `pageshow` event with `persisted === true` is exactly that restore.
 *
 * `reset` is kept in a ref so callers can pass an inline closure without the
 * listener re-subscribing every render.
 */
export function useResetOnBfcache(reset: () => void) {
  const resetRef = useRef(reset);

  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetRef.current();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
}
