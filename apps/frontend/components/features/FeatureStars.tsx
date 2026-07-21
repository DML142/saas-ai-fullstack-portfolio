'use client';

import { useRef, type ReactNode } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { StarMark } from './starVisuals';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Inline command, styled as a chip so it reads as something you'd type. */
function Cmd({ children }: { children: string }) {
  return (
    <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  );
}

/** Points at a route that doesn't exist yet — same pattern as the navbar's
 * links, which already reach for /dashboard ahead of it being built. */
function FeatureLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-cosmic-light underline decoration-cosmic-light/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/60"
    >
      {children}
    </Link>
  );
}

type Feature = {
  id: string;
  /** Horizontal offset for this row, shifting the star and its text together.
   * Varied per-row with different magnitudes (not a strict left/right
   * alternation) so the chain reads as organically zigzagging rather than
   * mechanically bouncing between two fixed lanes. Omitted = the base
   * pillar position. */
  indentClass?: string;
  title: string;
  body: ReactNode;
};

const FEATURES: Feature[] = [
  {
    id: 'fast-init',
    title: 'Fast init',
    body: (
      <>
        One command. <Cmd>cos init</Cmd> reads the project, works out which
        agent tooling it actually needs, and wires it in — asking only about
        what it can&apos;t infer on its own.
      </>
    ),
  },
  {
    id: 'cli',
    indentClass: 'pl-8 md:pl-[76px]',
    title: 'CLI tool',
    body: (
      <>
        <Cmd>npm i -g coscode</Cmd> and you&apos;re set. No config format to
        learn, no plugin registry to browse. It runs where your code already
        lives.
      </>
    ),
  },
  {
    id: 'workspace',
    title: 'In-browser workspace / COS Cloud',
    body: (
      <>
        Every project you initialise shows up in COS Cloud. Watch usage limits,
        catch config that has drifted, and pick up where the CLI left off from
        the <FeatureLink href="/dashboard">COS Project Manager</FeatureLink>.
      </>
    ),
  },
  {
    id: 'import-export',
    // Pulled back in from an earlier, larger shift: at the bigger offset the
    // incoming line from `workspace` (which sits at the base position, no
    // offset of its own) ran close enough to this row's title to visually
    // overlap it. A smaller rightward shift keeps some variation from `cli`'s
    // offset while giving the line more clearance before it reaches the star.
    indentClass: 'pl-8 md:pl-[64px]',
    title: 'Import / export',
    body: (
      <>
        Take a workspace with you. Export a project&apos;s setup as a single
        file, import it on another machine, and land exactly where you left off.
      </>
    ),
  },
];

/**
 * A single chain, one star to the next: 1→2→3→4. No star reaches more than one
 * other, so the path never forks and there is only ever one line to follow.
 *
 * Stars 2 and 4 each step out to their own horizontal offset (star 3 sits back
 * on the base pillar), so the chain zigzags rather than running dead straight
 * — that keeps the skill-tree/git-graph read the design asked for without a
 * branch.
 */
const EDGES: [string, string][] = [
  ['fast-init', 'cli'],
  ['cli', 'workspace'],
  ['workspace', 'import-export'],
];

const STAR_CORE_R = 3.2;
const STAR_BLOOM_R = 16;
const STAR_SPIKE_R = 19;
/** Box the star mark sits in. Its height is matched to the title's
 * line-height (leading-9 / md:leading-10) so the star centres on the first
 * line of the title without any measuring or magic offsets. */
const STAR_BOX = 44;
/** Keeps an edge clear of the bloom at both ends instead of spearing it. */
const EDGE_TRIM = 15;

// Relative beats on the reveal timeline. The stars sit at roughly even
// intervals down the pillar, so weighting each beat equally makes timeline
// progress track scroll position closely enough that a star ignites about when
// it reaches the middle of the viewport.
const STAR_BEAT = 0.5;
const LINE_BEAT = 1;

export function FeatureStars() {
  const containerRef = useRef<HTMLOListElement>(null);
  const starRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const reducedMotion = useReducedMotion();

  const indexOf = (id: string) => FEATURES.findIndex((f) => f.id === id);

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      /** Edge geometry is measured, not laid out on a fixed grid: the rows are
       * flowing text whose height depends on copy, font loading and wrap
       * width, so there is no honest way to know where a star lands without
       * asking the DOM. Returns the trimmed endpoints in container-relative
       * pixels — the overlay SVG has no viewBox, so its user units are CSS px
       * and these drop straight in. */
      const geometry = (edgeIndex: number) => {
        const cRect = container.getBoundingClientRect();
        const [fromId, toId] = EDGES[edgeIndex];
        const aEl = starRefs.current[indexOf(fromId)];
        const bEl = starRefs.current[indexOf(toId)];
        if (!aEl || !bEl) return null;

        const centre = (el: HTMLSpanElement) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.left - cRect.left + r.width / 2,
            y: r.top - cRect.top + r.height / 2,
          };
        };
        const a = centre(aEl);
        const b = centre(bEl);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        return {
          x1: a.x + ux * EDGE_TRIM,
          y1: a.y + uy * EDGE_TRIM,
          x2: b.x - ux * EDGE_TRIM,
          y2: b.y - uy * EDGE_TRIM,
          drawLen: Math.max(len - EDGE_TRIM * 2, 0),
        };
      };

      const measure = () => {
        EDGES.forEach((_, i) => {
          const line = lineRefs.current[i];
          const g = geometry(i);
          if (!line || !g) return;
          line.setAttribute('x1', g.x1.toFixed(2));
          line.setAttribute('y1', g.y1.toFixed(2));
          line.setAttribute('x2', g.x2.toFixed(2));
          line.setAttribute('y2', g.y2.toFixed(2));
        });
      };

      measure();

      // Rows reflow on font load and on any width change, and neither is a
      // window resize — so ScrollTrigger's own refresh wouldn't catch them.
      const ro = new ResizeObserver(() => {
        measure();
        ScrollTrigger.refresh();
      });
      ro.observe(container);

      if (reducedMotion) return () => ro.disconnect();

      // One scrubbed timeline for the whole pillar, rather than a trigger per
      // element. Independent triggers overlap whenever two rows are close
      // together, which is exactly what must not happen here: each line has to
      // finish drawing before the next one starts. Appending the tweens to a
      // single timeline makes that ordering structural instead of something
      // that merely tends to hold at some viewport heights.
      //
      // Everything is authored in its final state and only hidden here, inside
      // a layout effect before paint — so no-JS, or any failure to reach this
      // code, leaves the pillar complete and readable rather than blank.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 75%',
          end: 'bottom 60%',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      FEATURES.forEach((f, i) => {
        const star = starRefs.current[i];
        if (star) {
          tl.fromTo(
            star,
            { autoAlpha: 0, scale: 0.4 },
            { autoAlpha: 1, scale: 1, duration: STAR_BEAT, ease: 'none' },
          );
        }

        // The edge leaving this star, drawn before the star it points at
        // ignites — the line reaches out, then the next star lights up.
        const edge = EDGES.findIndex(([fromId]) => fromId === f.id);
        const line = edge === -1 ? null : lineRefs.current[edge];
        if (line) {
          // Function-based values + invalidateOnRefresh: the dash length comes
          // from measured geometry, so it must be re-read whenever the rows
          // reflow rather than baked in once at creation.
          tl.fromTo(
            line,
            {
              strokeDasharray: () => geometry(edge)?.drawLen ?? 0,
              strokeDashoffset: () => geometry(edge)?.drawLen ?? 0,
            },
            { strokeDashoffset: 0, duration: LINE_BEAT, ease: 'none' },
          );
        }
      });

      return () => ro.disconnect();
    },
    { dependencies: [reducedMotion], scope: containerRef },
  );

  return (
    // flex+gap rather than space-y: the overlay <svg> below is the first child,
    // and space-y's sibling selector would hang a margin off the first <li>.
    // Out-of-flow children don't participate in gap, so this spaces only the rows.
    <ol
      ref={containerRef}
      className="relative flex w-full max-w-3xl flex-col gap-16 md:gap-24"
    >
      {/* No viewBox: the overlay matches the container's box exactly, so its
          user units are CSS pixels and measured coordinates need no mapping. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        {EDGES.map(([from, to], i) => (
          <line
            key={`${from}-${to}`}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            data-edge
            className="stroke-cosmic-light"
            strokeWidth={1}
            opacity={0.4}
          />
        ))}
      </svg>

      {FEATURES.map((f, i) => (
        <li
          key={f.id}
          // Perspective per row, so each feature warps around its own centre
          // rather than sharing one vanishing point down the whole column.
          className={cn('relative perspective-[1000px]', f.indentClass)}
        >
          <div className="flex items-start gap-4">
            <span
              ref={(el) => {
                starRefs.current[i] = el;
              }}
              // Deliberately outside the warped block: edges terminate here, and
              // a mark that stayed square to the viewer is easier to aim at
              // than one tilted in 3D.
              className="flex h-9 shrink-0 items-center justify-center md:h-10"
              style={{ width: STAR_BOX }}
            >
              <svg
                width={STAR_BOX}
                height={STAR_BOX}
                viewBox={`${-STAR_BOX / 2} ${-STAR_BOX / 2} ${STAR_BOX} ${STAR_BOX}`}
                className="overflow-visible"
                aria-hidden
              >
                <StarMark
                  coreR={STAR_CORE_R}
                  bloomR={STAR_BLOOM_R}
                  spikeR={STAR_SPIKE_R}
                />
              </svg>
            </span>

            {/* The fake-3D warp: one tilt across title and copy together, so
                the whole block reads as a single plane turned in space. Origin
                on the left edge keeps it anchored to the star while the far
                edge recedes. Dropped below md, where a narrow column has no
                width to spare on foreshortening. */}
            <div className="min-w-0 flex-1 md:transform-[rotateY(-7deg)] md:origin-[left_center]">
              <h3 className="font-display text-2xl leading-9 text-ink md:text-3xl md:leading-10">
                {f.title}
              </h3>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground/70 md:text-base">
                {f.body}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
