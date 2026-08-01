## ADDED Requirements

### Requirement: Google OAuth sign-in
The system SHALL allow a user to establish a session by authenticating with
Google, resolving the returned Google profile to a `User` account and
issuing the same access/refresh token pair that email/password login issues.

#### Scenario: Starting the Google sign-in flow
- **WHEN** a client navigates to `GET /auth/google`
- **THEN** the browser is redirected to Google's OAuth consent screen

#### Scenario: Successful Google callback issues a session
- **WHEN** Google redirects back to `GET /auth/google/callback` with a
  successful authorization
- **THEN** the system resolves or creates the corresponding `User`, issues an
  access token and refresh token exactly as `login`/`register` do, sets the
  refresh token as an httpOnly cookie, and redirects the browser to the
  frontend

#### Scenario: Failed or denied Google callback
- **WHEN** Google redirects back to `GET /auth/google/callback` with a
  denied or failed authorization
- **THEN** no session is issued and the browser is redirected to the
  frontend's login page with an error indicator, not a raw error response

### Requirement: Account linking by verified email
The system SHALL resolve a Google sign-in to an existing account when the
Google profile's verified email matches an existing user's email, linking
the two rather than creating a duplicate account.

#### Scenario: First Google sign-in for an existing password account
- **WHEN** a user completes Google sign-in with an email that already
  belongs to an existing password-based account with no linked Google
  identity
- **THEN** that existing account is linked to the Google identity (its
  password is unchanged) and the session is issued for that account

#### Scenario: Returning Google user
- **WHEN** a user completes Google sign-in with a Google identity already
  linked to an account
- **THEN** the session is issued for that same account without creating a
  new one or re-linking anything

#### Scenario: New Google-only account
- **WHEN** a user completes Google sign-in with an email that matches no
  existing account
- **THEN** a new account is created with no password, linked to the Google
  identity, with its email already marked verified

## MODIFIED Requirements

### Requirement: User login
The system SHALL authenticate a user by email and password, and upon
success issue an access token and a refresh token. An account with no
password set (created via an OAuth-only sign-in that was never linked to a
password) SHALL be treated as a non-match for password login, using the
same generic error as any other invalid credentials.

#### Scenario: Successful login
- **WHEN** a client submits `POST /auth/login` with a valid email and
  matching password
- **THEN** the endpoint returns an access token in the response body and
  sets a refresh token as an httpOnly cookie

#### Scenario: Invalid credentials
- **WHEN** a client submits `POST /auth/login` with an email that doesn't
  exist or a password that doesn't match
- **THEN** the endpoint returns an authentication error without revealing
  whether the email or password was the specific cause

#### Scenario: Login attempt against an OAuth-only account
- **WHEN** a client submits `POST /auth/login` with the email of an account
  that has no password set
- **THEN** the endpoint returns the same authentication error as any other
  invalid-credentials case, without revealing that the account has no
  password or is linked to Google
