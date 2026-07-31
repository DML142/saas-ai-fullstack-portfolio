'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import { StarMark } from '@/components/features/starVisuals';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { UltraGlow } from './UltraGlow';
import { CheckoutButton } from './CheckoutButton';
import type { PaidTier } from '@/lib/stores/auth';

gsap.registerPlugin(useGSAP);

export type Plan = {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  /** Star grows and brightens with the tier. */
  star: { box: number; coreR: number; bloomR: number; spikeR: number };
  /** Visual column on desktop only — see PricingSection for why this is
   * decoupled from DOM order. */
  orderClass: string;
  featured?: boolean;
};

/** Ultra's name only: a cosmic-light-to-white gradient that sweeps
 * continuously via `background-clip: text` + animated `backgroundPositionX`.
 *
 * The gradient's end stops are the same color and the tile is sized to the
 * text's measured width, so shifting by exactly one tile width loops
 * seamlessly (the same trick `IntegrationsMarquee` uses). Reduced motion
 * just skips the tween, leaving a static gradient title. */
function UltraTitle({ name }: { name: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const [tileWidth, setTileWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Measure the real pixel width and drive the tween in pixels: percentage
    // background-position scales by `container - image size`, so it can't be
    // trusted to land on an exact one-tile shift.
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setTileWidth(Math.round(w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      if (reducedMotion || !tileWidth) return;
      const el = textRef.current;
      if (!el) return;
      gsap.fromTo(
        el,
        { backgroundPositionX: '0px' },
        {
          backgroundPositionX: `${tileWidth}px`,
          duration: 3.5,
          ease: 'none',
          repeat: -1,
        },
      );
    },
    { dependencies: [reducedMotion, tileWidth] },
  );

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        ref={textRef}
        className="font-display bg-clip-text text-2xl text-transparent"
        style={{
          // Same color at both ends, so the tile repeats seamlessly.
          backgroundImage:
            'linear-gradient(90deg, var(--color-cosmic-light) 0%, #ffffff 50%, var(--color-cosmic-light) 100%)',
          // One tile exactly as wide as the text, tiled by the default
          // `repeat` — what the pixel-measured animation loops against.
          backgroundSize: tileWidth ? `${tileWidth}px 100%` : '100% 100%',
          backgroundPositionX: '0px',
        }}
      >
        {name}
      </span>
      <span className="text-cosmic-light/80 text-[10px] font-semibold tracking-widest uppercase">
        Most Popular
      </span>
    </span>
  );
}

function PlanStar({ star }: { star: Plan['star'] }) {
  const { box, coreR, bloomR, spikeR } = star;
  return (
    <svg
      width={box}
      height={box}
      viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
      className="overflow-visible"
      aria-hidden
    >
      <StarMark coreR={coreR} bloomR={bloomR} spikeR={spikeR} />
    </svg>
  );
}

export function PlanCard({ plan }: { plan: Plan }) {
  const { id, name, price, tagline, features, star, orderClass, featured } =
    plan;

  return (
    <li className={cn('relative flex flex-col items-center', orderClass)}>
      {/* Star sits above the card, scaling with the tier — the continuity
          thread the previous two sections established. */}
      <div className="flex h-16 items-center justify-center">
        <PlanStar star={star} />
      </div>

      {/* flex-1 is load-bearing: it stretches the wrapper to the tallest card
          (via the grid's items-stretch) so every card matches height and the
          CTAs align. */}
      <div className="relative flex w-full flex-1">
        {/* Layer 0 — the glow, behind everything. Ultra only. */}
        {featured && <UltraGlow />}

        {/* Layer 1 — the glass ring. Translucent and blurred so the glow
            behind it bleeds through; only its rim shows, since the opaque body
            below covers the middle. */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-10 rounded-3xl',
            featured
              ? 'border-cosmic-light/40 border-2 bg-cosmic-light/[0.04] backdrop-blur-md'
              : 'border-border border',
          )}
          aria-hidden
        />

        {/* Layer 2 — the card body. Opaque and inset by the ring's width, so
            the glow never touches the readable surface. */}
        <div
          className={cn(
            'relative z-20 flex w-full flex-col rounded-3xl bg-card p-8',
            featured && [
              // The inset IS the visible glass rim's width — wide enough to
              // read as frosted glass rather than a hairline.
              'm-[5px] rounded-[calc(1.5rem-5px)]',
              // Extra padding (real padding, not a transform) on top of the
              // wider grid track.
              'md:p-9',
            ],
          )}
        >
          {featured ? (
            <UltraTitle name={name} />
          ) : (
            <h3 className="font-display text-2xl text-ink">{name}</h3>
          )}
          <p className="mt-1 text-sm text-foreground/55">{tagline}</p>

          <p className="mt-6 flex items-baseline gap-1">
            <span className="font-display text-5xl text-ink">${price}</span>
            <span className="text-sm text-foreground/55">/mo</span>
          </p>

          <ul className="mt-8 flex flex-col gap-3 text-sm">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-cosmic-light"
                  aria-hidden
                />
                <span className="text-ink/80">{feature}</span>
              </li>
            ))}
          </ul>

          {/* mt-auto pins the CTA to the bottom, so buttons line up across
              cards whose feature lists differ in length. */}
          <div className="mt-auto pt-8">
            {/* Plan ids are the paid tiers lowercased; map to the PaidTier the
                checkout endpoint expects. */}
            <CheckoutButton tier={id.toUpperCase() as PaidTier} name={name} />
          </div>
        </div>
      </div>
    </li>
  );
}
