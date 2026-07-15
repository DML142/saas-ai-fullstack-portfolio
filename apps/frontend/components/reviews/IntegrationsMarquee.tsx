'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP);

/** Pixels the track travels per second. Resolution-independent on purpose —
 * a fixed *duration* would make the marquee visibly speed up or slow down
 * depending on how many copies a given screen width ends up needing. */
const SPEED_PX_S = 55;

/**
 * The tools `cos init` actually wires in — the same names already plotted as
 * stars in the Big Dipper two sections up. These are real projects and the
 * integration claim is real, which is why this strip can say "Integrates with"
 * instead of inventing companies to stand in for a claim we can't make.
 *
 * `tint` is the brand-ish colour each wordmark reveals on hover. Wordmarks are
 * typographic, never logo art: the *names* are fair to use, but this project
 * has no rights to embed anyone's actual brand marks.
 */
const INTEGRATIONS = [
  { name: 'CodeRabbit', tint: '#ff7043' },
  { name: 'MCP', tint: '#7c9cff' },
  { name: 'OpenSpec', tint: '#4ec9b0' },
  { name: 'Agent', tint: '#c586c0' },
  { name: 'Skills', tint: '#ffd479' },
  { name: '.md context', tint: '#8fd3ff' },
];

/** Dim at rest, full colour on hover. These are text, not images, so "dim and
 * desaturated" is just a muted colour — a `grayscale` filter would cost a
 * compositing layer to do nothing a colour token can't. The tint rides in as a
 * CSS variable so the hover stays pure CSS, no JS listeners per wordmark. */
function Wordmark({ name, tint }: { name: string; tint: string }) {
  return (
    <span
      className="shrink-0 px-8 font-display text-2xl whitespace-nowrap text-ink/40 transition-colors duration-300 hover:text-[var(--tint)] md:text-3xl"
      style={{ '--tint': tint } as React.CSSProperties}
    >
      {name}
    </span>
  );
}

/**
 * How many times the list needs to repeat so the track never runs out of
 * content before the loop wraps. A generous margin (+2 copies beyond the
 * minimum) rather than the exact fencepost value — this only costs a few
 * repeated text nodes, and the margin absorbs measurement jitter during
 * resize instead of needing to land exactly on the theoretical minimum.
 */
function copiesNeeded(containerWidth: number, copyWidth: number) {
  if (copyWidth <= 0) return 3;
  return Math.max(2, Math.ceil(containerWidth / copyWidth) + 2);
}

export function IntegrationsMarquee() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstCopyRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  // Starts at a safe-looking default so the first paint (before measurement
  // runs) isn't empty; corrected as soon as real widths are known.
  const [copies, setCopies] = useState(3);
  const [copyWidth, setCopyWidth] = useState<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const scope = scopeRef.current;
    const first = firstCopyRef.current;
    if (!scope || !first) return;

    // The original version rendered exactly two copies and shifted by -50%,
    // reasoning that two identical halves guarantee a seamless loop point
    // without ever measuring a pixel. That's true of the loop point, but it
    // silently assumed the viewport is narrower than one copy of six short
    // words — false on a wide screen, where the track ran dry before the
    // loop wrapped: a chunk vanished off the left edge while new content
    // popped in on the right, instead of the two ends meeting invisibly.
    // Measuring the real width and rendering exactly as many copies as the
    // screen needs removes that assumption instead of hoping it holds.
    const measure = () => {
      const w = first.getBoundingClientRect().width;
      if (w > 0) {
        setCopyWidth(w);
        setCopies(copiesNeeded(scope.getBoundingClientRect().width, w));
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scope);
    ro.observe(first);
    return () => ro.disconnect();
  }, [reducedMotion]);

  useGSAP(
    (_context, contextSafe) => {
      if (reducedMotion || !copyWidth) return;
      const track = trackRef.current;
      if (!track || !contextSafe) return;

      // A remeasure (resize, font load) rebuilds this tween from scratch —
      // reset to a known start so the new target is never chasing wherever
      // the previous tween happened to be sitting.
      gsap.set(track, { x: 0 });

      // Shift by exactly one copy's pixel width, not a percentage of the
      // (now variable-length) track. That's what makes the wrap point land on
      // a frame indistinguishable from the start regardless of how many
      // copies got rendered.
      const loop = gsap.to(track, {
        x: -copyWidth,
        duration: copyWidth / SPEED_PX_S,
        ease: 'none',
        repeat: -1,
      });

      // Pause the shared tween rather than the hovered wordmark: a name that
      // slides away while you are reading it defeats the reveal. Listeners
      // sit on the track, not each wordmark, so crossing the gap between two
      // names doesn't flicker pause/resume.
      const onEnter = contextSafe(() => loop.pause());
      const onLeave = contextSafe(() => loop.play());
      track.addEventListener('pointerenter', onEnter);
      track.addEventListener('pointerleave', onLeave);

      return () => {
        track.removeEventListener('pointerenter', onEnter);
        track.removeEventListener('pointerleave', onLeave);
      };
    },
    { dependencies: [reducedMotion, copyWidth, copies], scope: scopeRef },
  );

  if (reducedMotion) {
    return (
      <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-3">
        {INTEGRATIONS.map((item) => (
          <Wordmark key={item.name} {...item} />
        ))}
      </div>
    );
  }

  return (
    // Masked at both edges so wordmarks dissolve instead of being guillotined
    // by the container — without this the "infinite" read breaks at the seam.
    <div
      ref={scopeRef}
      className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <div ref={trackRef} className="flex w-max">
        {Array.from({ length: copies }, (_, copyIndex) => (
          // Only the first copy is real content for assistive tech; every
          // repeat beyond it exists purely to fill the track and is hidden so
          // a screen reader doesn't read the same six names N times.
          <span
            key={copyIndex}
            ref={copyIndex === 0 ? firstCopyRef : undefined}
            aria-hidden={copyIndex > 0}
            className="flex shrink-0"
          >
            {INTEGRATIONS.map((item) => (
              <Wordmark key={`${copyIndex}-${item.name}`} {...item} />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
