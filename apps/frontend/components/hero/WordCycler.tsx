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

// Matches Tailwind's `sm` so the CSS layout (flex-col/flex-row) and the JS
// animation axis flip at the same width.
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

      // Desktop moves upward, mobile moves rightward — every branch sets both
      // axes so resizing across the breakpoint never leaves a stale offset.
      const restingAxis = isMobile
        ? { xPercent: -100, yPercent: 0 }
        : { xPercent: 0, yPercent: 100 };
      const enterFrom = isMobile
        ? { xPercent: -100, yPercent: 0 }
        : { xPercent: 0, yPercent: 100 };
      const exitTo = isMobile
        ? { xPercent: 100, yPercent: 0 }
        : { xPercent: 0, yPercent: -100 };
      const settled = { xPercent: 0, yPercent: 0 };

      WORDS.forEach((_, i) => {
        const el = wordRefs.current[i];
        if (!el) return;

        if (i === index) {
          if (reducedMotion || prevIndex === index) {
            gsap.set(el, { ...settled, autoAlpha: 1 });
          } else {
            gsap.fromTo(
              el,
              { ...enterFrom, autoAlpha: 0 },
              {
                ...settled,
                autoAlpha: 1,
                duration: TRANSITION_S,
                ease: 'power3.inOut',
              },
            );
          }
        } else if (i === prevIndex && prevIndex !== index) {
          if (reducedMotion) {
            gsap.set(el, { ...exitTo, autoAlpha: 0 });
          } else {
            gsap.to(el, {
              ...exitTo,
              autoAlpha: 0,
              duration: TRANSITION_S,
              ease: 'power3.inOut',
            });
          }
        } else {
          gsap.set(el, { ...restingAxis, autoAlpha: 0 });
        }
      });

      // Animate the container to the incoming word's width so it resizes in
      // sync with the slide instead of snapping instantly.
      const targetWidth = activeEl.getBoundingClientRect().width;
      if (reducedMotion || prevIndex === index) {
        gsap.set(container, { width: targetWidth });
      } else {
        gsap.to(container, {
          width: targetWidth,
          duration: TRANSITION_S,
          ease: 'power3.inOut',
        });
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
        {/* invisible sizer: gives the box a correct width on first paint,
            before GSAP takes over with an animated width */}
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
