## Why

`apps/frontend` is currently the unmodified `create-next-app` scaffold — no design system, no product identity, nothing shipped. The hero is the first real frontend surface and establishes the visual language (palette, typography, effect vocabulary) the rest of the site builds on, per the COS Code design direction in `CLAUDE.md`. It needs to land before the 3D constellation section or the dashboard, since both extend patterns established here.

## What Changes

- Establish the base visual system: near-black background, white text, cosmic-purple accent, `Newsreader` (or equivalent) display typeface, wired into Tailwind config.
- Build the hero word-cycler: `BUILD` fixed, second word cycling `FASTER → SAFER → SMARTER → FEARLESSLY` via a vertical slide (GSAP timeline), with occasional brief per-letter Y-axis stretch.
- Build the drifting star field: rounded white stars drifting right-to-left across the hero at randomized 1–10s intervals, using `mix-blend-mode: difference` so overlapping hero text inverts (white → black) on contact — no canvas readback.
- Build the chromatic aberration effect: an SVG filter (`feOffset` + `feBlend`) producing a subtle, constant RGB channel-split, scoped to the hero section only, respecting `prefers-reduced-motion`.
- Wire these three effects together into one `Hero` section on the landing page.

## Capabilities

### New Capabilities
- `landing-hero`: Defines the hero section's visual/interactive behavior — word-cycling headline, blend-mode star field, and scoped chromatic aberration — and the base design tokens (palette, typography) it establishes for the rest of the site.

### Modified Capabilities
(none — no existing frontend specs yet)

## Impact

- Affected code: `apps/frontend` — Tailwind config/theme tokens, new `components/hero/` (`WordCycler`, `StarField`, `ChromaticAberration`), landing `page.tsx`.
- Dependencies: adds `gsap` to `apps/frontend`. No Three.js/`react-three-fiber` needed for this change (deferred to the constellation change).
- Out of scope: the 3D constellation section, dashboard/COS Assistant, Features/Pricing/FAQ/Contact sections below the hero — all separate follow-up changes.
- Per `CLAUDE.md`'s Frontend Exception: complex effect implementation (GSAP timelines, the SVG filter, blend-mode layering) is AI-authored with thorough explanation; page/route scaffolding and component wiring are implemented by the user.
