## ADDED Requirements

### Requirement: Base design tokens
The system SHALL define the site's design tokens (background, ink, cosmic-purple accent, and display font) as reusable Tailwind theme values, not hardcoded per-component.

#### Scenario: Tokens available across components
- **WHEN** any component references the theme's background, ink, cosmic-purple, or display-font tokens
- **THEN** it resolves to the values defined once in the shared theme configuration, not a locally hardcoded value

### Requirement: Hero word-cycler
The system SHALL display a fixed word (`BUILD`) alongside a second word that cycles through a defined list (`FASTER`, `SAFER`, `SMARTER`, `FEARLESSLY`) on a continuous loop, animated as a vertical slide transition.

#### Scenario: Words cycle continuously
- **WHEN** the hero is visible and motion is not reduced
- **THEN** the second word transitions through the full list on a loop, each transition sliding the outgoing word up and out while the incoming word slides in from below

#### Scenario: Reduced motion still conveys the words
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** the second word still cycles through the same list at the same interval, but changes instantly rather than sliding

### Requirement: Drifting star field with contact inversion
The system SHALL animate simple rounded stars drifting right-to-left across the hero at randomized intervals, and SHALL visually invert any hero text the star overlaps for the duration of the overlap.

#### Scenario: Star crosses text
- **WHEN** a drifting star's position overlaps hero text
- **THEN** the overlapping region of the text appears inverted (white text becomes black in that region) for as long as the overlap persists

#### Scenario: Stars disabled under reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** no stars are rendered or animated

### Requirement: Scoped chromatic aberration
The system SHALL apply a subtle, constant RGB channel-split visual effect to the hero section only, not to the rest of the page.

#### Scenario: Effect present in hero, absent elsewhere
- **WHEN** a user views the hero section
- **THEN** a slight, constant channel-split is visible on the hero's content, and no equivalent effect is applied to any content outside the hero section

#### Scenario: Effect removed under reduced motion
- **WHEN** the user's system has `prefers-reduced-motion: reduce` set
- **THEN** the chromatic aberration effect is not applied
