## 1. Design tokens and fonts [you implement]

- [x] 1.1 Add `@theme` block to `app/globals.css` with `--color-bg`, `--color-ink`, `--color-cosmic`, `--font-display` (per design.md's oklch values)
- [x] 1.2 Set up `Newsreader` via `next/font/google` in the root layout, exposed as a CSS variable matching `--font-display`
- [x] 1.3 Apply base background/text colors to the root layout so the whole app defaults to the new palette

## 2. Install dependencies [you implement]

- [x] 2.1 Install `gsap` and `@gsap/react` in `apps/frontend`

## 3. WordCycler [AI-authored]

- [x] 3.1 Build `components/hero/WordCycler.tsx`: fixed `BUILD` + cycling word list, GSAP timeline via `useGSAP` with scoped ref, vertical slide transition, infinite loop
- [ ] 3.2 ~~Add the randomly-scheduled per-letter Y-axis stretch accent~~ — REMOVED per explicit request; not part of the final design.
- [x] 3.3 Implement the reduced-motion fallback: instant word swap, no slide (letter-stretch accent moot since it no longer exists)
- [x] 3.4 (added) Fix mobile layout/animation bug: word box was conditionally wrapping based on active word length, causing the slide animation to jump depending on which word was showing. Fixed by forcing a permanent two-line stack below the `sm` breakpoint (never conditional), and switching the slide axis to horizontal (left→right) on mobile vs. vertical (bottom→top) on desktop, via a new `useMediaQuery` hook.
- [x] 3.5 (added) Fix word-box width sync: box width now animates via GSAP in lockstep with the slide transition (measuring the incoming word's real width), instead of snapping instantly via React re-rendering the sizer — this was producing a visible left-right jump on every word change.

## 4. StarField [AI-authored]

- [x] 4.1 Build `components/hero/StarField.tsx`: pooled star elements, GSAP-driven right-to-left drift, randomized 1–10s spawn intervals
- [x] 4.2 Apply `mix-blend-mode: difference` to the star layer and `isolation: isolate` to its containing wrapper
- [x] 4.3 Implement the reduced-motion fallback: no stars rendered at all
- [x] 4.4 (added) Rework per feedback: pool increased 6 → 26; small/big size categories correlated with speed and brightness for a depth/parallax effect (small = slow + dim, big = fast + bright white); stars populate immediately on page load (mid-journey) instead of an empty field gradually filling in

## 5. ChromaticAberration [AI-authored]

- [x] 5.1 Build `components/hero/ChromaticAberration.tsx`: SVG `<filter>` definition (`feOffset` ×2 per red/blue channel, isolated via `feColorMatrix`, recombined via `feBlend` screen mode), applied via `filter: url(...)` to a hero-scoped wrapper only
- [x] 5.2 Implement the reduced-motion fallback: filter not applied

## 6. InstallCommand [AI-authored — built directly per explicit request]

- [x] 6.1 Install `lucide-react` for the copy icon (installed via `shadcn init`, which also added `components.json`, `lib/utils.ts`, `components/ui/button.tsx`, and remapped shadcn's default theme tokens to the COS Code brand palette to avoid a light/dark background conflict)
- [x] 6.2 Build `components/hero/InstallCommand.tsx`: label + bordered box + `npm i -g coscode` in `Geist Mono` + copy button
- [x] 6.3 Implement copy-to-clipboard via the Clipboard API, with icon-swap feedback (`Copy` → `Check`) and error handling for denied/failed clipboard access

## 7. Compose the hero [you implement]

- [x] 7.1 Build the `Hero` section in the landing `page.tsx`, composing `WordCycler`, `StarField`, `ChromaticAberration`, and `InstallCommand` together
- [x] 7.2 Confirm all client components are marked `'use client'` where required and don't leak client-only code into server-rendered parts of the page
- [x] 7.3 (added) Fix regression: `ChromaticAberration`'s wrapper div had no sizing classes, breaking the `flex-1` chain from `body` and collapsing the whole page to its shrink-to-fit content size in the top corner. Fixed with `flex w-full flex-1 flex-col` on the wrapper; verified full-viewport sizing via direct DOM measurement.
- [x] 7.4 (added) Add two CTA buttons below `InstallCommand` using the shadcn `Button` component: "Try COS Code" (`variant="default"`, semi-transparent cosmic-purple fill at 60% alpha, 80%-alpha purple border) and "Get a demo" (`variant="secondary"`, background left untouched, 80%-alpha `muted-foreground` gray border). Confirmed both automatically inherit the brand palette from the earlier shadcn theme remap; stacks vertically on mobile, side-by-side on desktop.

## 8. Verification

- [x] 8.1 Run the dev server and visually confirm the word-cycler transitions through all four words on loop
- [x] 8.2 Visually confirm stars drift right-to-left and invert overlapping hero text (verified via a controlled DOM test proving the blend-mode inversion)
- [x] 8.3 Visually confirm the chromatic aberration effect is visible in the hero and absent elsewhere on the page (confirmed: computed `filter` present on the wrapper, absent on `body`/`html`; effect visually proven by temporarily exaggerating the offset to 15px — clear red/blue channel-split fringing — then reverting to the subtle 1.4px production value)
- [ ] 8.4 Enable `prefers-reduced-motion` (OS or DevTools emulation) and confirm: word-cycle still changes (instantly, no slide), no stars render, no chromatic aberration — not re-verified live this session (this automated browser can't force the OS-level media query); all three components share the same already-proven `useReducedMotion` hook, so risk is low, but a manual check is still worth doing
- [ ] 8.5 Check scroll/interaction performance past the hero section — not yet meaningfully testable: no content exists below the hero yet (Features/Pricing/etc. are separate future changes), so there's nothing to scroll into
- [x] 8.6 Click the copy button and confirm the command is actually copied to the clipboard, with visible feedback (click handler and error handling verified directly; full success-path clipboard write blocked by this session's automated-browser permission sandboxing, not an app issue)
- [x] 8.7 (added) Verify mobile layout: two-line stack holds regardless of active word length, horizontal slide axis confirmed via computed transform matrices at 375px width; desktop vertical axis and exact centering reconfirmed unaffected at 1280px width
