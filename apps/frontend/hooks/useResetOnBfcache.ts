'use client';

import { useEffect, useRef } from 'react';

// After a `window.location` redirect (Stripe Checkout, billing portal),
// pressing Back restores this page from the bfcache with React state frozen —
// `pageshow` with `persisted === true` catches that restore.
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
