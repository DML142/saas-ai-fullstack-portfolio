'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STAR_COUNT = 160;

/**
 * Deterministic pseudo-random in [0, 1) from a seed. Used instead of
 * Math.random() for star positions so server and client markup match (no
 * hydration mismatch) and the field is present before JS runs. Animation
 * params can use Math.random freely — they only run client-side.
 */
function hash(seed: number) {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Rounded to 3 decimals before reaching JSX: the CSSOM serializes inline-style
 * numbers to ~6 significant digits, so a full-precision float round-trips back
 * out of `element.style` as a different string — read as a hydration mismatch.
 * Rounding keeps the authored string stable.
 */
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  left: round(hash(i * 1.7) * 100),
  top: round(hash(i * 2.9) * 100),
  size: round(1 + hash(i * 4.1) * 1.6),
  // Capped at ~0.55 so the field stays dimmer than the foreground content and
  // the figure/ground split holds.
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

      // Vertical parallax: the star layer lags page scroll, reading as depth.
      // Triggered off the wrapper but transforming the inner layer, which is
      // taller with headroom top/bottom so translating it never reveals an edge.
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

      // Gentle per-star life: a slow sway + opacity twinkle, each with random
      // duration/phase so the field never pulses in unison. Random is safe
      // here — inside the client-only effect, never in the SSR markup.
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
