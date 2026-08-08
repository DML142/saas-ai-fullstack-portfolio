'use client';

import { useId, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** px per channel — subtle, constant, not interaction-driven. Callers can dial
 * it down for smaller text; defaulted so the hero's look is unchanged. */
const DEFAULT_OFFSET = 1.4;

/** Scoped to this subtree (not the whole page) so only the wrapped content
 * re-rasterizes. The filter id comes from `useId()`, not a module constant,
 * since this mounts more than once per page (hero + pricing). */
export function ChromaticAberration({
  children,
  offset = DEFAULT_OFFSET,
}: {
  children: ReactNode;
  offset?: number;
}) {
  const reducedMotion = useReducedMotion();
  // useId() emits colons, which need escaping inside url(#…) — strip them.
  const filterId = `chromatic-aberration-${useId().replace(/:/g, '')}`;

  return (
    <div
      className="relative w-full"
      style={reducedMotion ? undefined : { filter: `url(#${filterId})` }}
    >
      <svg
        className="absolute h-0 w-0 overflow-hidden"
        aria-hidden
        focusable="false"
      >
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            {/* isolate the red channel and shift it left */}
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="red"
            />
            <feOffset in="red" dx={-offset} dy="0" result="red" />

            {/* green channel stays put, unshifted */}
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="green"
            />

            {/* isolate the blue channel and shift it right */}
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="blue"
            />
            <feOffset in="blue" dx={offset} dy="0" result="blue" />

            {/* recombine via screen blending, which sums isolated channels
                without darkening the result */}
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" />
          </filter>
        </defs>
      </svg>
      {children}
    </div>
  );
}
