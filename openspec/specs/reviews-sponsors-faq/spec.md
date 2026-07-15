# reviews-sponsors-faq Specification

## Purpose

Defines the landing page's social-proof section — the block below Features that gives a visitor "why should I believe this" before Pricing. Three parts, one shared ambient star background: a cycling review star cluster, a real-integrations wordmark marquee, and a five-item FAQ with center-out separators and a per-question fade-up reveal.

## Requirements

### Requirement: Review star cluster (Part 1)
The system SHALL render a section headed "They trust our product" containing five unconnected stars in a fixed scatter, where exactly one star is active (bloomed, bright, showing its review quote and attribution) at any time, cycling via a glow-transfer between stars rather than a sliding card.

#### Scenario: Ignite-in-place cycling
- **WHEN** a user views the reviews section and motion is not reduced
- **THEN** on a fixed interval, the active star dims to a resting brightness (remaining visible, not hidden) while the next star in sequence brightens and its quote appears

#### Scenario: Reduced motion shows all reviews at once
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** all five stars render at their lit brightness with all five quotes visible simultaneously — no cycling, and no review hidden behind the mechanism that would otherwise reveal it

### Requirement: Fictional reviewer identities with abstract avatars
Each review SHALL be attributed to a fictional individual (not a real person, not a real company) and paired with an abstract avatar (e.g. initials in a colored circle), never a photorealistic photo.

#### Scenario: No real people or photos
- **WHEN** a user reads a review's attribution
- **THEN** the name reads as a generic, illustrative individual and the accompanying avatar is an abstract mark, not an image of a human face

### Requirement: Integration partner marquee (Part 2)
The system SHALL render a section headed "Integrates with" containing a horizontally auto-scrolling, seamlessly looping strip of real integration-partner names (the tools `cos init` wires in, matching `features-section`'s constellation) rendered as text wordmarks, dimmed and desaturated at rest.

#### Scenario: Continuous loop
- **WHEN** a user views the integrations strip and motion is not reduced
- **THEN** the wordmarks scroll horizontally without a visible seam or reset jump

#### Scenario: Hover reveals and pauses
- **WHEN** a user hovers any wordmark in the strip
- **THEN** the entire strip stops scrolling and the hovered wordmark displays in full original color, while other wordmarks remain dimmed

#### Scenario: Reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** the wordmarks render as a static, non-scrolling row

### Requirement: FAQ list (Part 3)
The system SHALL render a FAQ section with five question/answer pairs, each preceded by a star mark on the left, with question text in `--color-cosmic-light` and answer text in white.

#### Scenario: FAQ content and styling
- **WHEN** a user views the FAQ section
- **THEN** five question/answer pairs are visible, each with a star mark, cosmic-light question text, and white answer text

### Requirement: Center-out FAQ separators
Each FAQ pair SHALL be separated from the next by a horizontal line that draws outward from its center to both edges as the user scrolls it into view.

#### Scenario: Scroll-linked draw
- **WHEN** a user scrolls a separator line into view and motion is not reduced
- **THEN** the line grows from a point at its center simultaneously toward both the left and right edges

#### Scenario: Reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** all separator lines render fully drawn and static, with no scroll-linked growth

### Requirement: FAQ fade-up reveal
Each FAQ question/answer pair SHALL fade up into view as its top edge crosses the bottom of the viewport while scrolling down, and SHALL remain visible if the user scrolls back up past it.

#### Scenario: Reveal on scroll
- **WHEN** a user scrolls down and a FAQ pair's top edge crosses the bottom of the viewport, with motion not reduced
- **THEN** that pair fades and slides up into its resting position, independently of the other pairs

#### Scenario: Does not re-hide
- **WHEN** a user scrolls back up past a FAQ pair that has already been revealed
- **THEN** that pair remains visible rather than fading back out

#### Scenario: Reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** all FAQ pairs are visible immediately, with no scroll-linked fade

### Requirement: Shared ambient star background
The section SHALL display the same dim, parallaxing ambient star background used by the features section behind all three parts.

#### Scenario: Background present across all parts
- **WHEN** a user scrolls through the reviews, integrations, and FAQ parts
- **THEN** the dim ambient star field remains visible behind the content in all three, without re-triggering or resetting between parts
