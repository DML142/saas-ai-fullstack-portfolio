'use client';

import type { ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother);

/** How far the content lags the real scroll position, in seconds. */
const SMOOTH_SECONDS = 1.2;

/**
 * Page-wide smooth scrolling via GSAP's ScrollSmoother.
 *
 * ScrollSmoother keeps the *native* scrollbar as the source of truth — it sets
 * the body's height to the content height and then translates the content to
 * catch up. Two things follow from that, and both matter here:
 *
 *  - `window.scrollY` and the `scroll` event still behave normally, so
 *    `useScrolled` (the navbar's transition) keeps working untouched.
 *  - ScrollTrigger integrates with it natively, so the feature-star reveals and
 *    the ambient parallax need no changes.
 *
 * Anything `position: fixed` must stay OUTSIDE the wrapper — inside, it would
 * ride the content's transform and scroll away. The navbar is rendered as a
 * sibling in the root layout for exactly that reason.
 *
 * No CSS is authored for #smooth-wrapper / #smooth-content on purpose:
 * ScrollSmoother applies what it needs at create time, inside a layout effect
 * before paint. Authoring it in globals.css would strand the reduced-motion
 * path — where no smoother is created — with a fixed, overflow-hidden wrapper
 * and no way to scroll.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const smoother = ScrollSmoother.create({
        wrapper: '#smooth-wrapper',
        content: '#smooth-content',
        smooth: SMOOTH_SECONDS,
        // `effects` would scan the DOM for data-speed/data-lag attributes on
        // every refresh. Nothing uses them — the parallax we do have is a
        // plain ScrollTrigger inside AmbientStarField — so leave it off.
        effects: false,
      });
      return () => smoother.kill();
    },
    { dependencies: [reducedMotion] },
  );

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  );
}
