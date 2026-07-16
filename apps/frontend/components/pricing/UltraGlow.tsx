'use client';

import { useEffect, useId, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP);

/** Seconds for the segment to travel the full perimeter once. */
const TRAVEL_S = 5.5;
/** Card corner radius — must match the card's `rounded-3xl` (1.5rem). */
const RADIUS = 24;
/**
 * Segment length as a percentage of the perimeter. `pathLength={100}`
 * normalises the path, so this is a true percentage regardless of the card's
 * measured size — the dash math never has to know the real pixel perimeter.
 */
const DASH = 22;

/** Traces the card's outline as a real path, so a stroke drawn along it turns
 * the corners instead of cutting across them. */
function roundedRectPath(w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M ${rr},0`,
    `H ${w - rr}`,
    `A ${rr},${rr} 0 0 1 ${w},${rr}`,
    `V ${h - rr}`,
    `A ${rr},${rr} 0 0 1 ${w - rr},${h}`,
    `H ${rr}`,
    `A ${rr},${rr} 0 0 1 0,${h - rr}`,
    `V ${rr}`,
    `A ${rr},${rr} 0 0 1 ${rr},0`,
    'Z',
  ].join(' ');
}

/**
 * The Ultra card's glow — the one bespoke effect in an otherwise calm section.
 *
 * The travelling light is a dashed stroke on the card's own outline path, not
 * an element riding `offset-path`. The first attempt used `offset-path:
 * border-box`, which is elegant on paper — but an element on a motion path
 * stays a rigid straight box that merely *rotates* to stay tangent, so at every
 * rounded corner the segment visibly pivoted like a stick instead of bending
 * around the curve. A `stroke-dasharray` dash is drawn *along* the path itself,
 * so it follows the corners exactly, for free. Animating `stroke-dashoffset`
 * moves it.
 *
 * There is deliberately no separate static halo behind the card: the earlier
 * version had one, and a radial-gradient clipped by its own box produced a hard
 * rectangular edge — a visible box, not a glow. The travelling line now carries
 * all the light.
 */
export function UltraGlow() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const dashRefs = useRef<(SVGPathElement | null)[]>([]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const reducedMotion = useReducedMotion();

  // Same id-collision reasoning as ChromaticAberration's — see that component.
  const uid = useId().replace(/:/g, '');
  const warpId = `ultra-warp-${uid}`;

  useEffect(() => {
    const el = scopeRef.current;
    if (!el) return;
    // The path needs real pixel dimensions, and the card's height depends on its
    // content and the viewport — so it gets measured, the same way FeatureStars
    // and IntegrationsMarquee already measure what CSS alone can't tell them.
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      if (reducedMotion || !size) return;
      const dashes = dashRefs.current.filter(Boolean) as SVGPathElement[];
      if (!dashes.length) return;

      // Negative offset drives the dash forward along the path. One direction,
      // no yoyo.
      gsap.fromTo(
        dashes,
        { strokeDashoffset: 0 },
        { strokeDashoffset: -100, duration: TRAVEL_S, ease: 'none', repeat: -1 },
      );

      // The "dynamic cloud mask": the noise driving the displacement is itself
      // animated, so the light's edge wobbles and breathes as it travels rather
      // than being a rigid extruded tube. baseFrequency is animated rather than
      // `seed`, because seed jumps to a completely different noise field on
      // every change (visible popping) while frequency morphs continuously.
      const turbulence = turbulenceRef.current;
      if (turbulence) {
        gsap.to(turbulence, {
          attr: { baseFrequency: 0.042 },
          duration: 6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }
    },
    { dependencies: [reducedMotion, size], scope: scopeRef },
  );

  const path = size ? roundedRectPath(size.w, size.h, RADIUS) : '';
  const dashArray = `${DASH} ${100 - DASH}`;

  return (
    <div ref={scopeRef} className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {/* overflow-visible so the blurred halo isn't clipped at the card's edge */}
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <defs>
          <filter id={warpId} x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.022"
              numOctaves={2}
              seed={5}
              result="noise"
            />
            {/* Small scale on purpose — this deforms the light's edge, it
                doesn't tear it off the border. */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={9}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {size && !reducedMotion && (
          <>
            {/* Three passes, widest and softest first: the outer bloom, the
                cosmic body, then a hot near-white core. Stacking them is what
                makes it read as light rather than a coloured line. Only the two
                outer passes are warped — the core stays crisp, so the segment
                keeps a defined centre while its glow breathes. */}
            <path
              ref={(el) => {
                dashRefs.current[0] = el;
              }}
              d={path}
              fill="none"
              stroke="var(--color-cosmic)"
              strokeWidth={14}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={dashArray}
              opacity={0.55}
              // Warp and blur chained in one CSS `filter`, not split across the
              // SVG `filter` attribute and CSS — the CSS property overrides the
              // attribute outright, so the warp would be silently dropped.
              style={{ filter: `url(#${warpId}) blur(9px)` }}
            />
            <path
              ref={(el) => {
                dashRefs.current[1] = el;
              }}
              d={path}
              fill="none"
              stroke="var(--color-cosmic-light)"
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={dashArray}
              style={{ filter: `url(#${warpId}) blur(2.5px)` }}
            />
            <path
              ref={(el) => {
                dashRefs.current[2] = el;
              }}
              d={path}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.6}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${DASH * 0.55} ${100 - DASH * 0.55}`}
              opacity={0.9}
            />
          </>
        )}

        {/* Reduced motion keeps Ultra's visual weight and drops only the
            movement: the same light, evenly present around the whole border,
            rather than a segment frozen at some arbitrary point. */}
        {size && reducedMotion && (
          <path
            d={path}
            fill="none"
            stroke="var(--color-cosmic-light)"
            strokeWidth={2}
            opacity={0.8}
            style={{ filter: 'blur(1px)' }}
          />
        )}
      </svg>
    </div>
  );
}
