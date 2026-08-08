'use client';

import { useCallback, type MouseEvent } from 'react';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

/** Height of the fixed navbar — scrolled-to sections land this far below the
 * viewport top. Keep in sync with the header's `h-20` in Navbar.tsx. */
const NAV_OFFSET_PX = 80;

// A native hash jump races the smoother's eased scroll loop — a second click
// mid-glide would land off-target, so this routes through `scrollTo()` instead.
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
