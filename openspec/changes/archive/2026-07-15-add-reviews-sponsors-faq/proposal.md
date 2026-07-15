## Why

The landing page ends at Features. The navbar's `#reviews` link already exists and points at nothing — same dead-anchor pattern `#features` was in before the last change. This section fills it: social proof (reviews), ecosystem credibility (real integration partners), and objection-handling (FAQ), stacked as one continuous block so a visitor moving past Features lands in "why should I believe this" territory before ever reaching pricing.

## What Changes

Add one new section to the landing page, below Features, targeted by the navbar's existing `#reviews` anchor. Three stacked parts, one shared ambient star background (same dim/parallax treatment as `features-section`):

**Part 1 — Reviews**: Not a sliding card — a small, loose scatter of stars (no connecting lines; these aren't relationally wired like the constellation). One star is lit at a time — bloomed, bright, its review quote and fictional attribution shown beside it — while the others sit dimmed nearby. Cycling is a glow-transfer (current star dims, next brightens), reusing the glow-in language `FeatureStars` already established for its scroll reveal, not `WordCycler`'s slide. Reviewers are fictional individuals ("Jae T. — backend engineer" style), each with a small abstract avatar (initials-in-a-circle or similar) — **not photorealistic photos**, which would read as fabricated-testimonial-photo, a distinct and separate problem from the company-attribution question this replaces.

**Part 2 — Integrates with**: What was "Sponsors" is now framed honestly as the tools `cos init` actually wires in — the same real names already visualized in `features-section`'s Big Dipper constellation (CodeRabbit, MCP, OpenSpec, Agent, Skills, `.md` context). A horizontally auto-scrolling strip of text wordmarks (not logo images — see Impact), dimmed/desaturated by default, full-color and paused on hover. No CTA — "Integrates with" doesn't invite a click the way "Become our sponsor" did, and there's no sponsorship product in this project's plan to link it to.

**Part 3 — FAQ**: Five question/answer pairs, each with a small star mark on the left (continuing the star motif), question text in `--color-cosmic-light`, answer text in white. Every Q/A pair is separated by a line that draws outward from center to both edges on scroll.

## Capabilities

### New Capabilities
- `reviews-sponsors-faq`: Defines the combined section — an ignite-in-place review star cluster, a real-integrations wordmark strip, and a five-item FAQ with center-out line separators — sharing one ambient star background.

### Modified Capabilities
(none — the navbar's `#reviews` anchor requirement is already satisfied by the navbar spec; this just gives the anchor something to point at, same relationship `add-features-section` had to `#features`.)

## Impact

- Affected code: `apps/frontend` — new components (review star cluster, integrations marquee, FAQ list), landing `page.tsx` composition below `<FeaturesSection />`, reuse of `AmbientStarField` and `starVisuals` (`StarMark`) from `features-section`, first use of a hover-pause interaction pattern in this project, first component reusing `FeatureStars`' glow-in tween shape outside `features-section` itself.
- Per `CLAUDE.md`'s Frontend Exception: the effect-heavy pieces (star-cluster ignite cycling, integrations marquee with hover behavior, scroll-triggered center-out lines) are AI-authored with explanation; routine composition/layout can be handed off.
- Integration-partner names are real (CodeRabbit, MCP, OpenSpec, etc.) and rendered as text wordmarks, not logo image assets — this project has no rights to embed real brand-mark art regardless of whether the underlying claim is true, so the visual stays typographic even though the content is now honest.
- Review avatars are abstract (initials-in-a-circle or equivalent), not photos — a fictional face photo attached to a fabricated quote is a recognizable deceptive pattern independent of the earlier company-name concern, and isn't something this design defaults into.

## Resolved Questions

1. **Integration partners, not sponsors.** Real tool names already established by `features-section`'s constellation, framed as "Integrates with" — this replaces the earlier "fictional company" default entirely and removes the false-endorsement risk by making the claim true instead of disguising it.
2. **No "Become our sponsor" CTA.** There's no sponsorship product in this project's scope to send that click toward; the earlier open question about real-vs-fictional company names is moot once Sponsors is gone.
3. **Reviews are individual fictional people, not companies.** Sidesteps the endorsement question differently for Part 1 than Part 2 — a generic "Jae T., backend engineer" reads as illustrative, not as a specific real person's fabricated claim.
4. **Review avatars are abstract, not photographic.** Flagged independently in Impact — fake human photos on fake quotes is its own dark pattern, distinct from the naming question.
5. Q/A content: **five pairs, finalized during design** — why not self-install the tooling, why this AI over alternatives, why the pricing, whether it works on an existing project, and how to add custom Skills/MCP servers.
6. Section anchor: **`#reviews`** — the navbar link that already exists, covering all three parts (no new nav entry for Integrations or FAQ individually).
