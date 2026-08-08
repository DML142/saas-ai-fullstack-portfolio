'use client';

import { useSyncExternalStore } from 'react';

/** Tracks an arbitrary media query via useSyncExternalStore — same
 * rationale as useReducedMotion. */
export function useMediaQuery(query: string) {
  function subscribe(callback: () => void) {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
  }

  function getSnapshot() {
    return window.matchMedia(query).matches;
  }

  function getServerSnapshot() {
    return false;
  }

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
