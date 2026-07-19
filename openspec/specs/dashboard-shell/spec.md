# dashboard-shell

## Purpose

Defines the protected dashboard route and its chrome — sidebar, workspace/chat switcher, profile display, settings, and the workspace usage/quota view. Does not include real chat functionality (message persistence, simulated replies) or real subscription-tier gating, both of which are separate future changes.

## Requirements

### Requirement: Protected dashboard route
The system SHALL serve `/dashboard` only to authenticated users, reusing the existing route-guard mechanism, and SHALL NOT introduce any new authentication or authorization logic.

#### Scenario: Authenticated user reaches the dashboard
- **WHEN** an authenticated user navigates to `/dashboard`
- **THEN** the dashboard shell renders

#### Scenario: Unauthenticated user is redirected
- **WHEN** an unauthenticated user navigates to `/dashboard`
- **THEN** they are redirected to `/login`, per the existing route-guard behavior

### Requirement: Sidebar navigation
The system SHALL provide a persistent sidebar within the dashboard for navigating between dashboard sections (workspace switcher, settings).

#### Scenario: Sidebar visible on every dashboard route
- **WHEN** a user is on any route under `/dashboard`
- **THEN** the sidebar is visible and its navigation entries are reachable

### Requirement: Workspace/chat switcher
The system SHALL provide a Claude-Desktop-style switcher listing available workspaces/chats, allowing the user to select one as active, without requiring any backend-persisted chat data.

#### Scenario: Switcher lists placeholder workspaces
- **WHEN** the dashboard loads
- **THEN** the switcher displays a list of workspace entries and one is selected as active by default

#### Scenario: Selecting a workspace updates the active selection
- **WHEN** a user selects a different workspace entry in the switcher
- **THEN** the main panel reflects the newly selected workspace as active

### Requirement: Empty/placeholder chat panel
The system SHALL render the main chat panel in a clearly non-functional placeholder state, since no chat backend exists yet.

#### Scenario: Chat panel shows no fabricated history
- **WHEN** a user views the main panel for any workspace
- **THEN** no chat messages are displayed as if they were real conversation history, and the panel visually communicates that sending is not yet available

### Requirement: Profile display
The system SHALL display the authenticated user's real session data (email, role) in the dashboard, without inventing data the backend doesn't provide.

#### Scenario: Profile shows real session data
- **WHEN** an authenticated user views their profile in the dashboard
- **THEN** their email and role are displayed, sourced from the existing session store

### Requirement: Settings section
The system SHALL provide a settings section accessible from the dashboard, limited to controls backed by real, already-existing functionality.

#### Scenario: Settings includes logout
- **WHEN** a user opens the settings section
- **THEN** they can log out from it, using the existing logout flow

### Requirement: Workspace usage/quota view
The system SHALL provide a workspace modal or view showing usage limits and quota information as clearly-labeled placeholder data, since no real usage-tracking or billing system exists yet.

#### Scenario: Usage view is visibly illustrative
- **WHEN** a user opens the workspace usage/quota view
- **THEN** the displayed limits and quota are placeholder values, and nothing in the UI claims they reflect real enforcement or billing state

### Requirement: Dashboard visual treatment
The system SHALL style the dashboard consistently with the landing page's palette and typography, while omitting the landing page's heavy effect layer (chromatic aberration, 3D/star-field elements).

#### Scenario: No hero-style effects in the dashboard
- **WHEN** a user views any dashboard route
- **THEN** no chromatic aberration filter or 3D/particle effects are present
