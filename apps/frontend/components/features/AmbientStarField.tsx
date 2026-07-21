'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STAR_COUNT = 160;

/**
 * Deterministic pseudo-random in [0, 1) from a seed — the classic
 * `fract(sin(x) * k)` hash. Using this instead of Math.random() for the
 * rendered star positions means the markup is identical on server and
 * client (no hydration mismatch), and the field is present at its final
 * positions even before JS runs — so the reduced-motion and no-JS cases
 * still show a proper static star field. Animation params (below) can use
 * Math.random freely since they only run client-side inside the effect.
 */
function hash(seed: number) {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Rounded to 3 decimals before it ever reaches JSX: the browser's CSSOM
 * serializes inline-style numbers to ~6 significant digits, so a
 * full-precision float like `25.375252397498116` round-trips back out of
 * `element.style.left` as `25.3753%` — different from the string React
 * rendered server-side, which reads as a hydration mismatch even though the
 * value is deterministic. Rounding here makes the authored string stable
 * under that round-trip.
 */
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  left: round(hash(i * 1.7) * 100),
  top: round(hash(i * 2.9) * 100),
  size: round(1 + hash(i * 4.1) * 1.6),
  // Floor raised from 0.12 and range widened from 0.32 — at the old values the
  // field read as almost empty against the near-black background instead of a
  // proper sky. Still capped at 0.55 (i.e., stays dimmer than the foreground's
  // cosmic-light content) so the figure/ground split holds.
  opacity: round(0.18 + hash(i * 6.3) * 0.37),
}));

export function AmbientStarField() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const layer = layerRef.current;
      const wrapper = wrapperRef.current;
      if (!layer || !wrapper) return;

      // Vertical parallax: the star layer lags behind page scroll, reading
      // as depth. Triggered off the wrapper (pinned to the section via
      // inset-0), transforming the *inner* layer — which is taller than the
      // wrapper with headroom top/bottom, so translating it never reveals an
      // uncovered edge. Non-circular: we measure/trigger on one element and
      // transform a different one.
      gsap.to(layer, {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: {
          trigger: wrapper,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Gentle per-star life: a slow positional sway + an opacity twinkle,
      // each with randomized duration/phase so the field never pulses in
      // unison. Random is safe here — this is inside the client-only effect,
      // so it never touches the server-rendered markup.
      const stars = layer.querySelectorAll<HTMLDivElement>(
        '[data-ambient-star]',
      );
      stars.forEach((star) => {
        gsap.to(star, {
          x: gsap.utils.random(-8, 8),
          y: gsap.utils.random(-8, 8),
          duration: gsap.utils.random(18, 34),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        gsap.to(star, {
          opacity: '+=0.15',
          duration: gsap.utils.random(3, 7),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: gsap.utils.random(0, 4),
        });
      });
    },
    { dependencies: [reducedMotion], scope: wrapperRef },
  );

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div ref={layerRef} className="absolute inset-x-0 top-[-15%] h-[130%]">
        {STARS.map((star, i) => (
          <div
            key={i}
            data-ambient-star
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}
