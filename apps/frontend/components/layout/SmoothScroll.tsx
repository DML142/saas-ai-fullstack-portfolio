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
 * ScrollSmoother keeps the native scrollbar as the source of truth, so
 * `window.scrollY`/`scroll` (the navbar's `useScrolled`) and ScrollTrigger
 * both keep working untouched. Anything `position: fixed` must stay OUTSIDE
 * the wrapper or it rides the content transform — the navbar is a sibling in
 * the root layout for that reason.
 *
 * No CSS is authored for #smooth-wrapper / #smooth-content: ScrollSmoother
 * applies what it needs at create time. Authoring it in globals.css would
 * strand the reduced-motion path (no smoother) with an unscrollable wrapper.
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
        // `effects` scans the DOM for data-speed/data-lag attributes on every
        // refresh; nothing uses them (the parallax is a plain ScrollTrigger).
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
