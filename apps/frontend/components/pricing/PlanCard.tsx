'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import { StarMark } from '@/components/features/starVisuals';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { UltraGlow } from './UltraGlow';
import { PlanButton } from './PlanButton';

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
 * continuously. `background-clip: text` + transparent fill lets the gradient
 * paint the glyphs; animating `backgroundPositionX` moves that paint across
 * them.
 *
 * The gradient's start and end stops are the *same* color, and the tile is
 * sized to exactly the text's own measured width — the same trick
 * `IntegrationsMarquee` uses for its seamless loop (there: two identical
 * copies, shift by exactly one copy's width; here: one repeating gradient
 * tile, shift by exactly one tile's width), just applied to
 * `background-position` instead of `translateX`. The first version scrolled a
 * single 220%-wide gradient from 0% to 200% and then snapped back — visible,
 * because position 0 and position 200% are genuinely different-looking
 * states. With matching end colors and an exact-width tile, position 0 and
 * position "one tile width" render identically, so the loop reset is
 * invisible.
 *
 * Reduced motion needs no separate branch — skipping the tween just leaves
 * the authored `0px` position in place, a static (but still gradient) title. */
function UltraTitle({ name }: { name: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const [tileWidth, setTileWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Percentage-based background-position can't be trusted to land on an
    // exact one-tile shift (its formula scales by `container - image size`,
    // not by the image size alone), so this measures the real pixel width and
    // drives the tween in pixels instead — deterministic, no formula to get
    // subtly wrong.
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
          // Same color at both ends (cosmic-light, not the darker cosmic) —
          // that match is what makes the tile repeat seamlessly, and it's
          // also the "lighter" fix: the old version anchored one end on the
          // darker `--color-cosmic` token.
          backgroundImage:
            'linear-gradient(90deg, var(--color-cosmic-light) 0%, #ffffff 50%, var(--color-cosmic-light) 100%)',
          // One tile exactly as wide as the text itself, tiled by the browser
          // via the default `repeat` — this, plus matching end colors, is
          // what the pixel-measured animation above relies on for a seamless
          // loop.
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
  const { name, price, tagline, features, star, orderClass, featured } = plan;

  return (
    <li className={cn('relative flex flex-col items-center', orderClass)}>
      {/* Star sits above the card, scaling with the tier — the continuity
          thread the previous two sections established. */}
      <div className="flex h-16 items-center justify-center">
        <PlanStar star={star} />
      </div>

      {/* flex-1 is load-bearing: the <li> stretches to the tallest card via the
          grid's items-stretch, but without this the wrapper would size to its
          own content and the card body's h-full would resolve against nothing —
          leaving each card a different height and the CTAs unaligned. */}
      <div className="relative flex w-full flex-1">
        {/* Layer 0 — the glow, behind everything. Ultra only. */}
        {featured && <UltraGlow />}

        {/* Layer 1 — the glass ring. Translucent and blurred, so the glow
            behind it bleeds through. Only its rim is ever visible, because the
            opaque body below covers the middle; that rim is the whole point.
            The `supports-[backdrop-filter]:` guard this originally carried
            silently generated nothing, leaving the ring with no blur at all —
            plain `backdrop-blur-md` is used instead, which Tailwind already
            emits with the right prefixes and every target browser supports. */}
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
              // The inset IS the visible glass rim's width — widened from 2px
              // so there's enough of it to actually read as frosted glass
              // rather than a hairline.
              'm-[5px] rounded-[calc(1.5rem-5px)]',
              // A little extra breathing room, on top of the wider grid track
              // — real padding, not a transform. Because every card's height
              // is already unified (see the flex-1 note above), this also
              // pulls Lite and Pro slightly taller to match, the same way
              // Pro's longer feature list already set the row's height before
              // this change.
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
            <PlanButton>Choose {name}</PlanButton>
          </div>
        </div>
      </div>
    </li>
  );
}
