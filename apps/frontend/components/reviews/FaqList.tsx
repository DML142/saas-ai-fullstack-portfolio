'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { StarMark } from '@/components/features/starVisuals';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STAR_BOX = 28;
const STAR_CORE_R = 1.9;
const STAR_BLOOM_R = 8.5;
const STAR_SPIKE_R = 10;

/** Inline command, styled as a chip so it reads as something you'd type —
 * matches the treatment FeatureStars already uses for `cos init`. */
function Cmd({ children }: { children: string }) {
  return (
    <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  );
}

type Faq = { id: string; question: string; answer: ReactNode };

const FAQS: Faq[] = [
  {
    id: 'diy',
    question: 'Why not just install the tools myself?',
    answer: (
      <>
        You can — it&apos;s an afternoon of reading changelogs, picking MCP servers, writing{' '}
        <Cmd>.md</Cmd> context, and wiring up review tooling. Then the same afternoon again on the
        next repo, and again when a convention shifts. <Cmd>cos init</Cmd> is that afternoon,
        automated and kept current.
      </>
    ),
  },
  {
    id: 'why-this',
    question: 'Why this tooling and not something else?',
    answer: (
      <>
        COS Code doesn&apos;t replace your agent — it configures whatever you already use. The tools
        stay exactly the same. They just arrive already wired together instead of one{' '}
        <Cmd>npm install</Cmd> and one config file at a time.
      </>
    ),
  },
  {
    id: 'price',
    question: 'Why does it cost what it costs?',
    answer: (
      <>
        The CLI is free and stays free. Paid tiers cover what actually runs on our side: CodeRabbit
        review passes, COS Cloud workspace storage, and hosted agents. Real per-seat cost, priced at
        roughly what it costs us to serve.
      </>
    ),
  },
  {
    id: 'existing',
    question: 'Can I run it on an existing project?',
    answer: (
      <>
        That&apos;s the main case. <Cmd>cos init</Cmd> reads what&apos;s already there — your stack,
        existing configs, conventions living in <Cmd>.md</Cmd> files — and fills the gaps. It
        won&apos;t overwrite config you&apos;ve already committed.
      </>
    ),
  },
  {
    id: 'custom',
    question: 'How do I add a custom Skill or MCP server?',
    answer: (
      <>
        Drop it into the project&apos;s COS config and it&apos;s picked up on the next init. Custom
        entries are never clobbered by auto-detection — anything you declare yourself wins.
      </>
    ),
  },
];

export function FaqList() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const lines = lineRefs.current.filter(Boolean) as HTMLDivElement[];
      const rows = rowRefs.current.filter(Boolean) as HTMLDivElement[];

      lines.forEach((line) => {
        // A separator here is a plain rule between two fixed rows, so growing it
        // from the centre is one `scaleX` tween off a centred transform-origin —
        // no SVG, no measured endpoints. FeatureStars needed real
        // `stroke-dashoffset` draws only because its lines ran between two
        // independently-positioned stars; this shape doesn't.
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: line, start: 'top 92%', end: 'top 68%', scrub: true },
          },
        );
      });

      rows.forEach((row) => {
        // Each question fades up as its own top edge crosses the bottom of the
        // viewport — a discrete reveal, not scrubbed like the separators above.
        // `toggleActions` ends in `none`, not `reverse`: once a question has
        // been read, scrolling back up shouldn't hide it again — same
        // "never re-hide already-revealed content" rule the rest of the page
        // follows for scroll reveals.
        gsap.fromTo(
          row,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: row, start: 'top bottom', toggleActions: 'play none none none' },
          },
        );
      });
    },
    { dependencies: [reducedMotion], scope: scopeRef },
  );

  return (
    <div ref={scopeRef} className="flex w-full max-w-2xl flex-col">
      {FAQS.map((faq, i) => (
        <div key={faq.id}>
          {i > 0 && (
            <div
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              aria-hidden
              // Authored fully drawn and only shrunk by JS, so no-JS and any
              // failure to reach the effect leave the separators intact.
              className="my-10 h-px origin-center bg-cosmic-light/25"
            />
          )}
          <div
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            className="flex items-start gap-4"
          >
            <span className="mt-0.5 shrink-0">
              <svg
                width={STAR_BOX}
                height={STAR_BOX}
                viewBox={`${-STAR_BOX / 2} ${-STAR_BOX / 2} ${STAR_BOX} ${STAR_BOX}`}
                className="overflow-visible"
                aria-hidden
              >
                <StarMark coreR={STAR_CORE_R} bloomR={STAR_BLOOM_R} spikeR={STAR_SPIKE_R} />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg text-cosmic-light md:text-xl">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/80 md:text-base">{faq.answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
