'use client';

import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMediaQuery } from '@/hooks/useMediaQuery';

gsap.registerPlugin(useGSAP);

const WORDS = ['FASTER', 'SAFER', 'SMARTER', 'FEARLESSLY'];
const HOLD_MS = 2600;
const TRANSITION_S = 0.6;

// Below this width, "BUILD" and the cycling word always stack on two lines
// (see the JSX: flex-col below `sm`, flex-row at/above it) instead of
// wrapping conditionally based on the active word's length. Letting it wrap
// conditionally was the actual bug: a short word fit inline next to "BUILD"
// while a long one dropped to its own line, so the word box's position in
// the flex layout jumped depending on which word was showing — breaking
// the slide animation, which has no idea the layout itself just changed.
// This query matches Tailwind's `sm` breakpoint exactly so the CSS layout
// switch and the JS animation-axis switch always flip at the same width.
const MOBILE_QUERY = '(max-width: 639px)';

export function WordCycler() {
  const scopeRef = useRef<HTMLSpanElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const prevIndexRef = useRef(0);
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % WORDS.length);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, []);

  useGSAP(
    () => {
      const prevIndex = prevIndexRef.current;
      const container = scopeRef.current;
      const activeEl = wordRefs.current[index];
      if (!container || !activeEl) return;

      // Desktop motion direction is upward (enter from below, exit above).
      // Mobile motion direction is rightward (enter from left, exit right),
      // per request. Every branch sets *both* axes explicitly so switching
      // between them (e.g. resizing across the breakpoint mid-cycle) always
      // resets the other axis to 0 instead of leaving a stale offset.
      const restingAxis = isMobile ? { xPercent: -100, yPercent: 0 } : { xPercent: 0, yPercent: 100 };
      const enterFrom = isMobile ? { xPercent: -100, yPercent: 0 } : { xPercent: 0, yPercent: 100 };
      const exitTo = isMobile ? { xPercent: 100, yPercent: 0 } : { xPercent: 0, yPercent: -100 };
      const settled = { xPercent: 0, yPercent: 0 };

      WORDS.forEach((_, i) => {
        const el = wordRefs.current[i];
        if (!el) return;

        if (i === index) {
          // the word becoming active
          if (reducedMotion || prevIndex === index) {
            gsap.set(el, { ...settled, autoAlpha: 1 });
          } else {
            gsap.fromTo(
              el,
              { ...enterFrom, autoAlpha: 0 },
              { ...settled, autoAlpha: 1, duration: TRANSITION_S, ease: 'power3.inOut' },
            );
          }
        } else if (i === prevIndex && prevIndex !== index) {
          // the word stepping out
          if (reducedMotion) {
            gsap.set(el, { ...exitTo, autoAlpha: 0 });
          } else {
            gsap.to(el, { ...exitTo, autoAlpha: 0, duration: TRANSITION_S, ease: 'power3.inOut' });
          }
        } else {
          // resting, waiting its turn, parked at the point it will enter from
          gsap.set(el, { ...restingAxis, autoAlpha: 0 });
        }
      });

      // Measure the incoming word's natural width (the spans are absolute
      // + left/top only, not stretched via inset-0, so each keeps its own
      // intrinsic width regardless of current visibility) and animate the
      // container to match. Without this, the box's width would snap
      // instantly to the new word's width via React re-rendering the
      // invisible sizer, completely out of sync with the 0.6s slide —
      // which is exactly the left-right "jump" this replaces.
      const targetWidth = activeEl.getBoundingClientRect().width;
      if (reducedMotion || prevIndex === index) {
        gsap.set(container, { width: targetWidth });
      } else {
        gsap.to(container, { width: targetWidth, duration: TRANSITION_S, ease: 'power3.inOut' });
      }

      prevIndexRef.current = index;
    },
    { dependencies: [index, reducedMotion, isMobile], scope: scopeRef },
  );

  return (
    <h1 className="font-display flex w-full flex-col items-center justify-center gap-2 text-center text-6xl text-ink sm:flex-row sm:items-baseline sm:gap-4 md:text-8xl">
      <span>BUILD</span>
      <span
        ref={scopeRef}
        className="relative inline-block h-[1.1em] overflow-hidden text-left align-bottom"
      >
        {/* invisible sizer: gives the box a correct width via pure CSS on
            first paint (before GSAP mounts and takes over with an explicit,
            animated width) */}
        <span className="invisible whitespace-nowrap" aria-hidden>
          {WORDS[index]}
        </span>
        {WORDS.map((word, i) => (
          <span
            key={word}
            ref={(el) => {
              wordRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 whitespace-nowrap"
            style={{ opacity: i === 0 ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            {word}
          </span>
        ))}
      </span>
    </h1>
  );
}
