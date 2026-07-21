'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { StarMark } from '@/components/features/starVisuals';

gsap.registerPlugin(useGSAP);

const HOLD_MS = 5200;
const FADE_S = 0.7;

/** Lit vs. resting appearance of a star. The resting star is dimmed, never
 * hidden — a review that has already had its turn stays visibly present in the
 * scatter, waiting to come round again.
 *
 * Resting can't go much below this: the ambient star field sits behind these,
 * and a review star dimmed too far stops reading as "a review waiting its turn"
 * and starts reading as background noise. It has to stay unmistakably foreground
 * while still losing clearly to the lit one. */
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

/**
 * Five reviews, five stars.
 *
 * Positions are irregular on BOTH axes on purpose. Five stars evenly spaced on
 * one line above a testimonial reads unmistakably as a five-star *rating*,
 * which is a claim this section isn't making — the scatter has to look like
 * sky, not like a score.
 */
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

/** Initials in a circle — never a photograph. A fabricated face attached to a
 * fabricated quote is its own deceptive pattern, independent of the name being
 * generic, so there is no photorealistic path here to fall into by accident. */
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
        // Glow-transfer, not a slide: the outgoing star eases down to resting
        // while the incoming one blooms up. Nothing translates, nothing leaves
        // the stage — the same `scale`+`autoAlpha` shape FeatureStars uses for
        // its scroll reveal, just run in both directions.
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

  // Reduced motion gets a genuinely different layout, not a frozen frame of the
  // cycling one. Freezing would leave four of five reviews hidden behind a
  // mechanism that no longer runs — the opposite of the point. A plain stacked
  // list shows every review at once, all stars lit.
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
      {/* Scatter band. Stars live in the upper region; the quote sits below
          them, so the quote's position never moves as the active star changes —
          a testimonial that jumps around the stage every few seconds is a
          testimonial nobody finishes reading. */}
      <div className="relative h-28 md:h-32">
        {REVIEWS.map((review, i) => (
          // Two spans on purpose. The outer one owns the centring transform
          // (`-translate-*`) and never animates; the inner one is GSAP's target.
          // Collapsed into one element, GSAP would take ownership of `transform`
          // and its `scale` writes would fight the `-50%` centring — the same
          // split InitConstellation uses for its parallax groups.
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
              // Authored at rest, so a failure to reach the GSAP effect leaves
              // the scatter visible rather than blank.
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
