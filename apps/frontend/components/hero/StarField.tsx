'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP);

const STAR_POOL_SIZE = 26;

// Size correlates with speed and brightness to fake depth: small stars read
// as "far away" (slow, dim), big stars read as "close" (fast, bright white).
const SMALL_SIZE = [1.5, 3] as const;
const SMALL_DURATION_S = [14, 22] as const;
const SMALL_COLOR = '#b0b0b0';

const BIG_SIZE = [3.5, 6] as const;
const BIG_DURATION_S = [6, 10] as const;
const BIG_COLOR = '#ffffff';

const BIG_STAR_CHANCE = 0.3; // most stars are small/slow, a minority are big/fast

const MIN_DELAY_S = 1;
const MAX_DELAY_S = 10;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomStarProps() {
  const isBig = Math.random() < BIG_STAR_CHANCE;
  const [minSize, maxSize] = isBig ? BIG_SIZE : SMALL_SIZE;
  const [minDuration, maxDuration] = isBig ? BIG_DURATION_S : SMALL_DURATION_S;

  return {
    size: randomBetween(minSize, maxSize),
    duration: randomBetween(minDuration, maxDuration),
    color: isBig ? BIG_COLOR : SMALL_COLOR,
  };
}

export function StarField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    (_context, contextSafe) => {
      if (reducedMotion) return;

      const container = containerRef.current;
      if (!container || !contextSafe) return;

      // `spawn` recurses via GSAP's onComplete/delayedCall callbacks, which
      // fire *after* this effect's synchronous run — animations created
      // inside those callbacks aren't automatically tracked by useGSAP's
      // cleanup context. Wrapping with contextSafe re-registers each new
      // animation as it's created, so unmounting (or `reducedMotion`
      // changing) still reverts every in-flight star, not just the first.
      const spawn = contextSafe((star: HTMLDivElement) => {
        const { size, duration, color } = randomStarProps();
        const top = randomBetween(0, 100);
        const distance = container.clientWidth + size * 2;

        gsap.set(star, {
          width: size,
          height: size,
          top: `${top}%`,
          right: -size,
          backgroundColor: color,
          x: 0,
          autoAlpha: 1,
        });

        gsap.to(star, {
          x: -distance,
          duration,
          ease: 'none',
          onComplete: contextSafe(() => {
            gsap.set(star, { autoAlpha: 0 });
            const delay = randomBetween(MIN_DELAY_S, MAX_DELAY_S);
            gsap.delayedCall(
              delay,
              contextSafe(() => spawn(star)),
            );
          }),
        });
      });

      // On first mount, place every star already mid-journey across the
      // field (instead of queued off-screen right, waiting to spawn) so the
      // sky looks populated the instant the page loads, not empty-then-
      // filling-in. Each star still moves at the speed its size implies —
      // it just starts partway through that journey instead of at the start.
      const populateInitial = contextSafe((star: HTMLDivElement) => {
        const { size, duration, color } = randomStarProps();
        const top = randomBetween(0, 100);
        const distance = container.clientWidth + size * 2;
        const progress = Math.random(); // how far along its path it already is
        const startX = -distance * progress;
        const remainingDuration = duration * (1 - progress);

        gsap.set(star, {
          width: size,
          height: size,
          top: `${top}%`,
          right: -size,
          backgroundColor: color,
          x: startX,
          autoAlpha: 1,
        });

        gsap.to(star, {
          x: -distance,
          duration: remainingDuration,
          ease: 'none',
          onComplete: contextSafe(() => {
            gsap.set(star, { autoAlpha: 0 });
            const delay = randomBetween(MIN_DELAY_S, MAX_DELAY_S);
            gsap.delayedCall(
              delay,
              contextSafe(() => spawn(star)),
            );
          }),
        });
      });

      const stars = container.querySelectorAll<HTMLDivElement>('[data-star]');
      stars.forEach((star) => populateInitial(star));
    },
    { dependencies: [reducedMotion], scope: containerRef },
  );

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 isolate overflow-hidden"
      aria-hidden
    >
      {Array.from({ length: STAR_POOL_SIZE }).map((_, i) => (
        <div
          key={i}
          data-star
          className="absolute rounded-full opacity-0"
          style={{ mixBlendMode: 'difference' }}
        />
      ))}
    </div>
  );
}
