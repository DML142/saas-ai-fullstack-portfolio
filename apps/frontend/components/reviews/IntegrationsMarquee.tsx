'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(useGSAP);

/** Pixels the track travels per second — resolution-independent, so the speed
 * stays constant regardless of how many copies a screen width needs. */
const SPEED_PX_S = 55;

/**
 * The tools `cos init` wires in — the same names plotted in the Big Dipper
 * above. `tint` is the colour each wordmark reveals on hover; wordmarks are
 * typographic (names, not logo art) since the project has no rights to embed
 * real brand marks.
 */
const INTEGRATIONS = [
  { name: 'CodeRabbit', tint: '#ff7043' },
  { name: 'MCP', tint: '#7c9cff' },
  { name: 'OpenSpec', tint: '#4ec9b0' },
  { name: 'Agent', tint: '#c586c0' },
  { name: 'Skills', tint: '#ffd479' },
  { name: '.md context', tint: '#8fd3ff' },
];

/** Dim at rest, full colour on hover. The tint rides in as a CSS variable so
 * the hover stays pure CSS — no per-wordmark JS listeners. */
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
 * How many list copies fill the track so it never runs dry before the loop
 * wraps. +2 beyond the minimum absorbs measurement jitter during resize.
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

  // Safe default so the first paint isn't empty; corrected once widths are known.
  const [copies, setCopies] = useState(3);
  const [copyWidth, setCopyWidth] = useState<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const scope = scopeRef.current;
    const first = firstCopyRef.current;
    if (!scope || !first) return;

    // Measure a copy's real width and render as many copies as the screen
    // needs, so the track never runs dry before the loop wraps.
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

      // A remeasure rebuilds this tween — reset to a known start first.
      gsap.set(track, { x: 0 });

      // Shift by exactly one copy's pixel width so the wrap point is
      // indistinguishable from the start, however many copies rendered.
      const loop = gsap.to(track, {
        x: -copyWidth,
        duration: copyWidth / SPEED_PX_S,
        ease: 'none',
        repeat: -1,
      });

      // Pause the shared tween on hover so a name doesn't slide away while
      // you read it. Listeners sit on the track, so crossing between names
      // doesn't flicker pause/resume.
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
    // Masked at both edges so wordmarks dissolve instead of being cut off.
    <div
      ref={scopeRef}
      className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <div ref={trackRef} className="flex w-max">
        {Array.from({ length: copies }, (_, copyIndex) => (
          // Only the first copy is real for assistive tech; the rest just
          // fill the track and are hidden from screen readers.
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
