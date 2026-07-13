'use client';

import { useSyncExternalStore } from 'react';

/** True once the page has scrolled past `thresholdPx`. Same
 * useSyncExternalStore pattern as useReducedMotion/useMediaQuery — reading
 * a value (scroll position) that changes outside React's control. */
export function useScrolled(thresholdPx: number) {
  function subscribe(callback: () => void) {
    window.addEventListener('scroll', callback, { passive: true });
    return () => window.removeEventListener('scroll', callback);
  }

  function getSnapshot() {
    return window.scrollY > thresholdPx;
  }

  function getServerSnapshot() {
    return false;
  }

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
