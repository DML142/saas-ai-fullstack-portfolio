## ADDED Requirements

### Requirement: Continue with Google control
The system SHALL provide a "Continue with Google" control on `/login` and
`/register` that navigates the browser (not a background request) to the
backend's Google sign-in route, and SHALL rely on the existing silent
session-recovery mechanism to pick up the resulting session after the
backend redirects back.

#### Scenario: Starting Google sign-in from the login or register page
- **WHEN** a user activates the "Continue with Google" control on `/login`
  or `/register`
- **THEN** the browser navigates to the backend's `/auth/google` route,
  leaving the page (no fetch request is made and no client-side session
  state changes yet)

#### Scenario: Returning from a successful Google sign-in
- **WHEN** the backend redirects the browser back to the frontend after a
  successful Google sign-in
- **THEN** the app mounts fresh and the existing silent session-recovery
  behavior establishes the `authenticated` session from the refresh cookie,
  without any Google-specific frontend code

#### Scenario: Returning from a failed or denied Google sign-in
- **WHEN** the backend redirects the browser back to `/login` with an error
  indicator after a failed or denied Google sign-in
- **THEN** the login page shows a flat error message and the session status
  resolves to `unauthenticated`
