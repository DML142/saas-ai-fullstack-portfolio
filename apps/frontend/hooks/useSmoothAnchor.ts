'use client';

import { useCallback, type MouseEvent } from 'react';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

/** Height of the fixed navbar — scrolled-to sections land this far below the
 * viewport top. Keep in sync with the header's `h-20` in Navbar.tsx. */
const NAV_OFFSET_PX = 80;

/**
 * Click handler for an in-page `#hash` link that scrolls via ScrollSmoother.
 *
 * A native hash jump races the smoother's eased scroll loop: clicking a second
 * link mid-glide computes the target from the current layout while the smoother
 * is still tweening from an old position, so the landing spot is off. Routing
 * through the smoother's own `scrollTo()` removes the race.
 *
 * Falls back to the native jump when there's no smoother (the reduced-motion
 * case, where `SmoothScroll` never creates one).
 */
export function useSmoothAnchor() {
  return useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href');
    if (!href?.startsWith('#')) return;

    const target = document.querySelector(href);
    if (!target) return;

    const smoother = ScrollSmoother.get();
    if (!smoother) return; // reduced motion: let the native jump happen

    event.preventDefault();
    smoother.scrollTo(target, true, `top ${NAV_OFFSET_PX}px`);
  }, []);
}
