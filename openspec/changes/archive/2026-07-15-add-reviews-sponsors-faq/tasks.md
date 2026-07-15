## 1. Foundations [you implement]

- [x] 1.1 Add the `#reviews` section wrapper below `<FeaturesSection />` in `page.tsx`, with headings for the three parts ("They trust our product", "Integrates with", and an FAQ heading)
- [x] 1.2 Finalize the five fictional reviewer names/roles + the five FAQ answers' exact copy — content decision this whole change depends on

## 2. Shared star background [AI-authored]

- [x] 2.1 Mount `AmbientStarField` once behind all three parts of the section (reused as-is — no new variant needed)

## 3. Part 1 — Review star cluster [AI-authored]

- [x] 3.1 Build the fixed, unconnected 5-star scatter layout (fixed coordinate stage, same discipline as `InitConstellation` — no measured DOM positions)
- [x] 3.2 Ignite-in-place cycling: `setInterval`-driven active index; on change, dim the outgoing star to a resting brightness (not zero) and bloom the incoming star, reusing `FeatureStars`' glow-in tween shape (`scale` + `autoAlpha`) in both directions
- [x] 3.3 Active star's quote + attribution display beside it; abstract avatar (initials-in-a-circle or equivalent — no photorealistic images) per reviewer
- [x] 3.4 Reduced-motion fallback: all five stars rendered lit with all five quotes visible simultaneously — no cycling, nothing hidden
- [x] 3.5 Mobile check: scatter and quote text readable at 375px on a single shared stage (add a dedicated mobile stage only if this doesn't hold up)

## 4. Part 2 — Integration partner marquee [AI-authored]

- [x] 4.1 Build the wordmark strip using real integration names from `features-section`'s constellation (CodeRabbit, MCP, OpenSpec, Agent, Skills, `.md` context): doubled track, `gsap.to(track, { xPercent: -50, ease: 'none', repeat: -1 })` for a seamless loop
- [x] 4.2 At-rest styling: dimmed/desaturated via CSS `filter`; full original color on `:hover` via a filter transition
- [x] 4.3 Hover pauses the shared tween (pause on track `pointerenter`, resume on track `pointerleave`, using `contextSafe` per the project's established `useGSAP` discipline)
- [x] 4.4 "Integrates with" label above the strip — no CTA link
- [x] 4.5 Reduced-motion fallback: static, non-scrolling row of wordmarks

## 5. Part 3 — FAQ [AI-authored]

- [x] 5.1 Build the five Q/A rows: `StarMark` on the left (reusing `starVisuals.tsx`, no new gradient defs), question text in `--color-cosmic-light`, answer text in white
- [x] 5.2 Center-out separator lines between each pair: `scaleX` tween from `transform-origin: 50%`, driven by `ScrollTrigger`
- [x] 5.3 Reduced-motion fallback: all separator lines rendered fully drawn (`scaleX: 1`), static

## 6. Composition [you implement]

- [x] 6.1 Compose all three parts + shared bg into `page.tsx`, confirming the navbar's `#reviews` link (via `useSmoothAnchor`) scrolls to the section
- [x] 6.2 Final copy pass on reviews, reviewer names/roles, and FAQ answers

## 7. Verification

- [x] 7.1 Part 1 renders: 5-star scatter, one lit at a time with quote + attribution + abstract avatar, glow-transfer (not slide) between stars, no console errors
- [x] 7.2 Part 2 renders: wordmark strip loops with no visible seam, hover pauses the strip and reveals full color, real integration names match `features-section`'s constellation
- [x] 7.3 Part 3 renders: five Q/A pairs with star marks and correct colors, separator lines draw outward from center on scroll
- [x] 7.4 Navbar `#reviews` link scrolls to the section
- [x] 7.5 Mobile: all three parts usable/readable at 375px
- [x] 7.6 Reduced motion: Part 1 shows all five reviews at once (not one frozen frame), marquee stops, FAQ lines render static and fully drawn — nothing hidden behind motion
- [x] 7.7 Scroll performance: no visible jank with three animated parts on screen at once (real-device check — same class of item left open at the end of `add-features-section`; confirmed on real device)

## 8. Post-implementation fixes [surfaced by real-device review]

- [x] 8.1 `AmbientStarField` density: count 48 → 160, opacity floor/range widened — the field read as almost empty against the near-black background at the original values. A shared component, so `features-section` gets the denser sky too.
- [x] 8.2 `IntegrationsMarquee` seam on wide screens: the original two-copy/`xPercent:-50%` loop assumed the viewport is narrower than one copy of the (short, six-word) content — false on a wide monitor, where the track ran out of content before the loop wrapped. Replaced with `ResizeObserver`-driven measurement: render exactly as many copies as the current viewport needs, shift by one copy's measured pixel width instead of a fixed percentage. Verified mathematically zero-gap across a full cycle at 2200px and correctly bounds down to fewer copies on mobile.
- [x] 8.3 FAQ questions gained a GSAP fade-up reveal (`autoAlpha`+`y`, triggered per-row on `start: 'top bottom'`, non-reversing) alongside the existing center-out separator lines — evaluated and rejected AOS in favor of extending the existing `ScrollTrigger` setup already covering the rest of the page.
