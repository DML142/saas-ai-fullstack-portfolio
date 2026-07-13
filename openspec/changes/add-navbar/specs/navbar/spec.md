## ADDED Requirements

### Requirement: Persistent site navigation
The system SHALL render a navigation bar containing the site logo, navigation links (Features, Pricing, FAQ), and a call-to-action button, present on every page via the root layout.

#### Scenario: Navbar present across routes
- **WHEN** a user visits any page in the application
- **THEN** the navbar (logo, links, CTA) is rendered above the page content, not re-implemented per-page

### Requirement: Scroll-based background transition
The navbar SHALL remain visible while scrolling (sticky positioning) and SHALL transition its background from transparent to a solid/blurred surface once the user scrolls past a threshold.

#### Scenario: At the top of the page
- **WHEN** the page is scrolled to the top (or the threshold hasn't been crossed)
- **THEN** the navbar's background is transparent

#### Scenario: Scrolled past the threshold
- **WHEN** the user scrolls past the defined threshold
- **THEN** the navbar's background transitions to a solid/blurred dark surface, keeping nav content legible against arbitrary page content scrolling beneath it

### Requirement: Mobile navigation menu
On viewports too narrow for the full inline nav links, the system SHALL provide a hamburger toggle that opens a menu containing the same navigation links.

#### Scenario: Opening the mobile menu
- **WHEN** a user on a narrow viewport taps the hamburger toggle
- **THEN** a menu appears containing the same links available in the desktop nav

#### Scenario: Closing the mobile menu
- **WHEN** a user taps the toggle again (or selects a link) while the mobile menu is open
- **THEN** the menu closes
