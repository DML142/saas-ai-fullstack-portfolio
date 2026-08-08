'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { StarMark } from '@/components/features/starVisuals';

gsap.registerPlugin(useGSAP);

const HOLD_MS = 5200;
const FADE_S = 0.7;

/** Resting is dimmed, never hidden — not so dim it reads as the ambient
 * field rather than a review waiting its turn. */
const LIT = { scale: 1, autoAlpha: 1 };
const RESTING = { scale: 0.6, autoAlpha: 0.5 };

const STAR_BOX = 44;
const STAR_CORE_R = 2.6;
const STAR_BLOOM_R = 13;
const STAR_SPIKE_R = 15;

type Review = {
  id: string;
  quote: string;
  /** Deliberately generic and fictional — reads as illustrative rather than as
   * a specific real person's fabricated claim. */
  name: string;
  role: string;
  /** Percent-of-container position in the scatter. */
  x: number;
  y: number;
};

/** Five reviews, five stars. Positions are irregular on both axes so the
 * scatter reads as sky, not as a five-star rating. */
const REVIEWS: Review[] = [
  {
    id: 'jae',
    quote:
      'It read the repo and wired in exactly what I would have picked by hand. Took about four seconds.',
    name: 'Jae T.',
    role: 'Backend engineer',
    x: 9,
    y: 30,
  },
  {
    id: 'priya',
    quote:
      'We stopped arguing about which MCP servers to standardise on. It detects what the project needs and configures them.',
    name: 'Priya N.',
    role: 'Staff engineer',
    x: 30,
    y: 74,
  },
  {
    id: 'marc',
    quote:
      'I start a lot of projects. The setup tax is what kills most of them. This removes the tax.',
    name: 'Marc D.',
    role: 'Indie developer',
    x: 52,
    y: 18,
  },
  {
    id: 'rin',
    quote:
      'Onboarding used to mean a day of tooling config before anyone wrote a line. Now it is one command in the README.',
    name: 'Rin O.',
    role: 'Platform lead',
    x: 73,
    y: 66,
  },
  {
    id: 'sam',
    quote:
      'The part I did not expect: it only asks about the things it genuinely cannot work out on its own.',
    name: 'Sam K.',
    role: 'Tech lead',
    x: 92,
    y: 26,
  },
];

/** Initials in a circle — never a photograph, since a fabricated face on a
 * fabricated quote would be its own deceptive pattern. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('');
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cosmic-light/40 bg-cosmic/20 font-mono text-xs text-cosmic-light"
    >
      {initials}
    </span>
  );
}

function Star({ box = STAR_BOX }: { box?: number }) {
  return (
    <svg
      width={box}
      height={box}
      viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
      className="overflow-visible"
      aria-hidden
    >
      <StarMark
        coreR={STAR_CORE_R}
        bloomR={STAR_BLOOM_R}
        spikeR={STAR_SPIKE_R}
      />
    </svg>
  );
}

function Quote({ review }: { review: Review }) {
  return (
    <>
      <p className="font-display text-lg leading-relaxed text-ink md:text-2xl">
        &ldquo;{review.quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Avatar name={review.name} />
        <span className="text-sm text-foreground/60">
          {review.name} — {review.role}
        </span>
      </div>
    </>
  );
}

export function ReviewStars() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const starRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const quoteRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const prevIndexRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % REVIEWS.length);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const prev = prevIndexRef.current;

      REVIEWS.forEach((_, i) => {
        const star = starRefs.current[i];
        if (!star) return;
        const target = i === index ? LIT : RESTING;
        // Glow-transfer, not a slide: the outgoing star eases to resting while
        // the incoming one blooms up. Nothing translates or leaves the stage.
        if (prev === index) {
          gsap.set(star, target);
        } else {
          gsap.to(star, { ...target, duration: FADE_S, ease: 'sine.inOut' });
        }
      });

      const quote = quoteRef.current;
      if (quote && prev !== index) {
        gsap.fromTo(
          quote,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: FADE_S, ease: 'sine.out' },
        );
      }

      prevIndexRef.current = index;
    },
    { dependencies: [index, reducedMotion], scope: scopeRef },
  );

  // Reduced motion gets a different layout, not a frozen frame: a plain
  // stacked list showing every review at once, all stars lit.
  if (reducedMotion) {
    return (
      <ul className="flex w-full max-w-2xl flex-col gap-10">
        {REVIEWS.map((review) => (
          <li key={review.id} className="flex items-start gap-4">
            <span className="mt-1 shrink-0">
              <Star box={36} />
            </span>
            <div className="min-w-0 text-left">
              <Quote review={review} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={scopeRef} className="relative w-full max-w-3xl">
      {/* Scatter band. Stars sit in the upper region and the quote below them,
          so the quote never moves as the active star changes. */}
      <div className="relative h-28 md:h-32">
        {REVIEWS.map((review, i) => (
          // Two spans: the outer owns the centring transform, the inner is
          // GSAP's target — collapsed into one, `scale` would fight `-50%`.
          <span
            key={review.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${review.x}%`, top: `${review.y}%` }}
          >
            <span
              ref={(el) => {
                starRefs.current[i] = el;
              }}
              className="block"
              // Authored at rest, so the scatter is visible even if the GSAP
              // effect never runs.
              style={{
                transform: `scale(${i === 0 ? LIT.scale : RESTING.scale})`,
                opacity: i === 0 ? LIT.autoAlpha : RESTING.autoAlpha,
              }}
            >
              <Star />
            </span>
          </span>
        ))}
      </div>

      <div ref={quoteRef} className="mx-auto max-w-2xl px-2 text-center">
        <Quote review={REVIEWS[index]} />
      </div>
    </div>
  );
}
