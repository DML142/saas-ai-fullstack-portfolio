'use client';

import { useCallback, type MouseEvent } from 'react';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

/** Height of the fixed navbar — scrolled-to sections land this far below the
 * viewport top instead of directly under it. Keep in sync with the header's
 * `h-20` in Navbar.tsx. */
const NAV_OFFSET_PX = 80;

/**
 * Click handler for an in-page `#hash` link that goes through ScrollSmoother
 * instead of the browser's native anchor jump.
 *
 * Why native anchor navigation isn't enough: ScrollSmoother drives the
 * visible scroll position with an eased `requestAnimationFrame` loop, not a
 * 1:1 mapping to `window.scrollY`. A native hash click still *works* — the
 * browser sets `scrollTop` and the smoother's own scroll listener picks that
 * up — but only when nothing is already easing. Click a second link mid-glide
 * and the browser computes the jump target using the DOM's current, correct
 * layout offset while the smoother is mid-tween from an old position; the two
 * updates race, and the landing spot ends up off by whatever distance the
 * smoother hadn't yet caught up on. That's the intermittent behaviour
 * reported ("sometimes not working"). Routing every click through the
 * smoother's own `scrollTo()` — which owns both the target calculation and
 * the animation — removes the race entirely.
 *
 * Falls back to the native anchor jump when there's no active smoother, which
 * is the reduced-motion case (`SmoothScroll` never creates one there).
 */
export function useSmoothAnchor() {
  return useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href');
    if (!href?.startsWith('#')) return;

    const target = document.querySelector(href);
    if (!target) return; // dead anchor (e.g. #reviews, #pricing) — not built yet

    const smoother = ScrollSmoother.get();
    if (!smoother) return; // reduced motion: let the native jump happen

    event.preventDefault();
    smoother.scrollTo(target, true, `top ${NAV_OFFSET_PX}px`);
  }, []);
}
