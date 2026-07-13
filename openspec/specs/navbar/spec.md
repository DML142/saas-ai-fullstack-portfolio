# navbar Specification

## Purpose

Defines the site's persistent navigation: logo, nav links, auth-conditional controls (mocked for now), scroll-based background transition, and mobile menu behavior.

## Requirements

### Requirement: Persistent site navigation
The system SHALL render a navigation bar containing the site logo, navigation links (Home, Features, Reviews, Pricing), and auth-conditional controls, present on every page via the root layout.

#### Scenario: Navbar present across routes
- **WHEN** a user visits any page in the application
- **THEN** the navbar (logo, links, auth controls) is rendered above the page content, not re-implemented per-page

### Requirement: Auth-conditional right-side controls
The navbar SHALL display different right-side controls depending on mocked auth state: logged-out users see Register and Login buttons; logged-in users see an "Open Chat" button and their name. A user avatar icon is always visible regardless of auth state.

#### Scenario: Logged out
- **WHEN** the mocked auth state reports the user as logged out
- **THEN** the navbar shows Register and Login buttons, no user name, and the generic user avatar icon

#### Scenario: Logged in
- **WHEN** the mocked auth state reports the user as logged in
- **THEN** the navbar shows an "Open Chat" button, the user's name (positioned left of the avatar), and the user avatar icon

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
