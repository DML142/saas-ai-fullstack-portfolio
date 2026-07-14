'use client';

import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const FILTER_ID = 'hero-chromatic-aberration';
const OFFSET = 1.4; // px per channel — subtle, constant, not interaction-driven

/**
 * Wraps its children in a subtle, constant RGB channel-split effect,
 * implemented as a single SVG <filter> applied via CSS `filter: url(...)`.
 * Scoped to just this subtree (not body/:root) so the browser only has to
 * re-rasterize the wrapped content, not the whole page — the actual reason
 * this is cheap enough to leave running constantly, unlike a naive
 * whole-page WebGL post-process.
 */
export function ChromaticAberration({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="relative w-full"
      style={reducedMotion ? undefined : { filter: `url(#${FILTER_ID})` }}
    >
      <svg className="absolute h-0 w-0 overflow-hidden" aria-hidden focusable="false">
        <defs>
          <filter id={FILTER_ID} colorInterpolationFilters="sRGB">
            {/* isolate the red channel and shift it left */}
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="red"
            />
            <feOffset in="red" dx={-OFFSET} dy="0" result="red" />

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
            <feOffset in="blue" dx={OFFSET} dy="0" result="blue" />

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
