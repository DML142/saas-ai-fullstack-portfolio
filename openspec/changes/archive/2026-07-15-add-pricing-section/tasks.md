## 1. Foundations [you implement]

- [x] 1.1 Add the `#pricing` section wrapper below `<ReviewsSection />` in `page.tsx`
- [x] 1.2 Refactor `ChromaticAberration` to generate its filter id via `useId()` instead of the hardcoded `FILTER_ID` constant, so it's safe to mount a second time on this section
- [x] 1.3 Finalize exact plan copy (feature bullet wording per tier) if the draft in proposal.md needs polish

## 2. Shared background [AI-authored]

- [x] 2.1 Mount `AmbientStarField` behind the section
- [x] 2.2 Wrap the section in `ChromaticAberration` (post-1.2 fix)

## 3. Plan cards [AI-authored]

- [x] 3.1 Build the three-card layout: DOM order Lite/Pro/Ultra (keyboard/reading order), CSS `order` reordering to Lite/Ultra/Pro visually on desktop; natural DOM order on mobile (single column, no reordering)
- [x] 3.2 Card content: plan name, price, feature list per tier (from proposal.md's feature breakdown)
- [x] 3.3 Tier-scaled `StarMark` above each card — size/brightness scaling Lite < Pro < Ultra

## 4. Ultra card glow system [AI-authored]

- [x] 4.1 Three-layer structure: glow layer (`z-index:0`) → glass ring with `backdrop-filter: blur()` (`z-index:1`) → opaque card body inset within the ring (`z-index:2`)
- [x] 4.2 Cloud-textured glow: static (non-animated) SVG `feTurbulence` + `feDisplacementMap` filter displacing a blurred cosmic-purple shape, scoped to the glow layer only
- [x] 4.3 Traveling border segment: small glowing element with `offset-path: border-box`, `offset-distance` animated `0% → 100%` via GSAP, `repeat: -1`, one direction, no yoyo
- [x] 4.4 `@supports (backdrop-filter: blur(1px))` fallback: plain semi-transparent border for browsers without `backdrop-filter`
- [x] 4.5 Reduced-motion fallback: static, evenly-present soft cosmic-purple ring — no traveling segment

## 5. Plan buttons [AI-authored]

- [x] 5.1 Build `PlanButton` (bespoke, local — not a `Button` variant): gradient fill, layered-shadow "popped forward" resting state
- [x] 5.2 Hover state: CSS `transition` compressing the shadow and nudging the button toward the surface (press-in on hover, not on `:active`)
- [x] 5.3 `:active`/click gets its own further, distinguishable pressed state layered on top of the hover-press
- [x] 5.4 `:focus-visible` gets an explicit ring independent of hover, for keyboard users

## 6. Composition [you implement]

- [x] 6.1 Sales contact link below the cards ("or contact our sales manager for other plans") pointing at `/contact`
- [x] 6.2 Confirm the navbar's `#pricing` link (via `useSmoothAnchor`) scrolls to the section

## 7. Verification

- [x] 7.1 Cards render: correct visual order (Lite, Ultra, Pro) on desktop, correct copy per tier, no console errors
- [x] 7.2 Keyboard tab order follows Lite → Pro → Ultra regardless of visual position
- [x] 7.3 Star marks scale correctly by tier
- [x] 7.4 Ultra glow: traveling segment visible and moving in one direction, cloud-textured glow behind the card in cosmic purple only, card interior unaffected by the glow, glass rim visibly shows glow bleeding through
- [x] 7.5 `ChromaticAberration` reused on this section without colliding with the hero's instance (two distinct filter ids, both rendering correctly)
- [x] 7.6 Buttons: popped-forward resting state, compress on hover, further-distinguishable state on click/`:active`, clear focus ring on keyboard tab — verified with a real mouse hover (`matches(':hover')`), resting/hover transforms are genuine `matrix3d` values matching the declared `-6deg`/`-10deg` tilts
- [x] 7.7 Sales contact link points at `/contact`; navbar `#pricing` link scrolls to the section
- [x] 7.8 Mobile: cards stack in natural (price-ascending) order at 375px, all content readable, no horizontal scroll
- [ ] 7.9 Reduced motion: Ultra's border is static (no traveling segment), button hover-press still works (CSS transition, not JS-driven, so unaffected by the motion preference) — nothing hidden
- [ ] 7.10 Scroll/paint performance: no visible jank with two SVG filters (chromatic aberration + turbulence glow) active in the same region (real-device check, same class of item carried from the last two sections)

## 8. Post-implementation fixes [surfaced by real-device review]

- [x] 8.1 Fixed a hard-edged background artifact: the cloud glow's radial-gradient was clipped by its own bounding box, producing a visible rectangle instead of a soft halo. Removed the standalone static glow layer entirely — the travelling line now carries all the light.
- [x] 8.2 Rebuilt the travelling border segment: `offset-path: border-box` moves a *rigid* element that only rotates to stay tangent, so it visibly pivoted like a stick at each rounded corner instead of bending around it. Replaced with a `stroke-dasharray` dash on the card's actual SVG outline path (three stacked strokes: cosmic bloom, cosmic-light, white-hot core) — a dash drawn *along* a path follows its corners for free.
- [x] 8.3 Made the cloud-noise glow genuinely dynamic: the `feTurbulence` `baseFrequency` now animates (`sine.inOut`, yoyo) rather than staying static, so the light's edge visibly deforms and breathes as it travels — animating frequency rather than `seed`, since `seed` jumps to an unrelated noise field on every change (visible popping) while frequency morphs continuously.
- [x] 8.4 Fixed the glass ring's `backdrop-filter`, which had been silently generating nothing: the `supports-[backdrop-filter]:` guard never actually applied it (confirmed `backdropFilter: "none"` before the fix). Replaced with plain `backdrop-blur-md`, and widened the rim from 2px to 5px.
- [x] 8.5 Made `ChromaticAberration`'s `offset` prop actually visible on Pricing: the initial `0.6` was confirmed — by exaggerating it live in the DOM to `6px` and seeing clear fringing — to be a real, working filter that was simply imperceptible at that value on this section's smaller text, not broken. Settled on `1.1`, close enough to the hero's proven-visible `1.4` default to read while still being gentler.
- [x] 8.6 Rebuilt the plan buttons' press effect as genuine 3D: plain `translate-y-*` reads as a flat slide, not a press into a surface. Replaced with a single explicit `transform: perspective(500px) rotateX(...) translateY(...)` chain per state (not mixed with Tailwind's separately-composed `translate-y-*` utility, which would risk the two fighting over the same property) — verified via real hover that the resting/hover computed transforms are genuine `matrix3d` values, not flat 2D `matrix`.

## 9. Second round of polish [requested after phone review]

- [x] 9.1 Ultra card sized up via a real layout change, not `transform: scale()`: grid track ratio changed from equal thirds to `1fr 1.2fr 1fr` (CSS `order` places items into visual track position, so the wider track always lands on whichever card is visually centred), plus a small `md:p-9` padding bump on the featured card only. `UltraGlow.tsx` was deliberately left untouched — its existing `ResizeObserver` measures the card directly and adapted automatically; verified its outline path resolves to the new, larger width with zero code changes there.
- [x] 9.2 Added a shimmering gradient treatment to the "Ultra" title (`UltraTitle` in `PlanCard.tsx`) and a "MOST POPULAR" label beside it, both only on the featured card.
- [x] 9.3 Fixed a visible loop reset in the gradient shimmer: the first version scrolled a single 220%-wide, non-repeating gradient from 0% to 200% and snapped back — those are genuinely different-looking states, so the restart was visible. Rebuilt as an actual tiling pattern: matching start/end gradient stops, sized via `ResizeObserver` to exactly the text's measured pixel width, animated in pixels (not percentages, whose `(container − image size) × percent` formula doesn't map cleanly onto "exactly one tile"). Same principle `IntegrationsMarquee` already uses for its seamless scroll (two identical copies, shift by exactly one copy width), applied to `background-position` instead of `translateX`. Verified: `backgroundSize` matches the measured text width bit-for-bit, and sampled position stays within `[0, tileWidth]` with clean wraps, never overshooting.
- [x] 9.4 Made the gradient's cosmic tones lighter: both anchor stops changed from the darker `--color-cosmic` to `--color-cosmic-light` — the same change that was required for 9.3's matching-end-colors fix, so both requests were satisfied by one edit.
