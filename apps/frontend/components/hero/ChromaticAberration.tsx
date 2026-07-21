'use client';

import { useId, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** px per channel — subtle, constant, not interaction-driven. The hero's big
 * display type carries this happily; smaller UI text needs less, so callers can
 * dial it down. Defaulted rather than required so the hero's established look
 * is unchanged by this becoming configurable. */
const DEFAULT_OFFSET = 1.4;

/**
 * Wraps its children in a subtle, constant RGB channel-split effect,
 * implemented as a single SVG <filter> applied via CSS `filter: url(...)`.
 * Scoped to just this subtree (not body/:root) so the browser only has to
 * re-rasterize the wrapped content, not the whole page — the actual reason
 * this is cheap enough to leave running constantly, unlike a naive
 * whole-page WebGL post-process.
 *
 * The filter id comes from `useId()` rather than a module constant: this is
 * mounted more than once per page now (hero + pricing), and a hardcoded id
 * would put duplicate ids in the document — invalid, and it leaves which
 * filter `url(#…)` actually resolves to up to the browser. Deriving it per
 * instance keeps every usage collision-free without callers having to pass
 * (and remember to vary) an id prop.
 */
export function ChromaticAberration({
  children,
  offset = DEFAULT_OFFSET,
}: {
  children: ReactNode;
  offset?: number;
}) {
  const reducedMotion = useReducedMotion();
  // useId() emits colons, which are valid in an id attribute but need escaping
  // inside a url(#…) reference — strip them instead of fighting the escaping.
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
