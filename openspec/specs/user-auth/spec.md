# user-auth

## Purpose

Defines core authentication for the backend: registration, login, JWT access/refresh token issuance with rotation-based reuse detection, and route protection via guards.

## Requirements

### Requirement: User registration
The system SHALL allow a new user to register with an email and password, storing only a hashed password, and reject registration with an email that already exists.

#### Scenario: Successful registration
- **WHEN** a client submits `POST /auth/register` with a unique email and a password
- **THEN** a new `User` record is created with a hashed password (not plaintext) and the endpoint returns a success response

#### Scenario: Duplicate email rejected
- **WHEN** a client submits `POST /auth/register` with an email that already belongs to an existing user
- **THEN** the endpoint returns an error response and no new user is created

### Requirement: User login
The system SHALL authenticate a user by email and password, and upon success issue an access token and a refresh token. An account with no password set (created via an OAuth-only sign-in that was never linked to a password) SHALL be treated as a non-match for password login, using the same generic error as any other invalid credentials.

#### Scenario: Successful login
- **WHEN** a client submits `POST /auth/login` with a valid email and matching password
- **THEN** the endpoint returns an access token in the response body and sets a refresh token as an httpOnly cookie

#### Scenario: Invalid credentials
- **WHEN** a client submits `POST /auth/login` with an email that doesn't exist or a password that doesn't match
- **THEN** the endpoint returns an authentication error without revealing whether the email or password was the specific cause

#### Scenario: Login attempt against an OAuth-only account
- **WHEN** a client submits `POST /auth/login` with the email of an account that has no password set
- **THEN** the endpoint returns the same authentication error as any other invalid-credentials case, without revealing that the account has no password or is linked to Google

### Requirement: Google OAuth sign-in
The system SHALL allow a user to establish a session by authenticating with Google, resolving the returned Google profile to a `User` account and issuing the same access/refresh token pair that email/password login issues.

#### Scenario: Starting the Google sign-in flow
- **WHEN** a client navigates to `GET /auth/google`
- **THEN** the browser is redirected to Google's OAuth consent screen

#### Scenario: Successful Google callback issues a session
- **WHEN** Google redirects back to `GET /auth/google/callback` with a successful authorization
- **THEN** the system resolves or creates the corresponding `User`, issues an access token and refresh token exactly as `login`/`register` do, sets the refresh token as an httpOnly cookie, and redirects the browser to the frontend

#### Scenario: Failed or denied Google callback
- **WHEN** Google redirects back to `GET /auth/google/callback` with a denied or failed authorization
- **THEN** no session is issued and the browser is redirected to the frontend's login page with an error indicator, not a raw error response

### Requirement: Account linking by verified email
The system SHALL resolve a Google sign-in to an existing account when the Google profile's verified email matches an existing user's email, linking the two rather than creating a duplicate account.

#### Scenario: First Google sign-in for an existing password account
- **WHEN** a user completes Google sign-in with an email that already belongs to an existing password-based account with no linked Google identity
- **THEN** that existing account is linked to the Google identity (its password is unchanged) and the session is issued for that account

#### Scenario: Returning Google user
- **WHEN** a user completes Google sign-in with a Google identity already linked to an account
- **THEN** the session is issued for that same account without creating a new one or re-linking anything

#### Scenario: New Google-only account
- **WHEN** a user completes Google sign-in with an email that matches no existing account
- **THEN** a new account is created with no password, linked to the Google identity, with its email already marked verified

### Requirement: Access token validation via guard
The system SHALL provide a reusable guard that protects routes by requiring a valid, non-expired access token in the `Authorization` header.

#### Scenario: Accessing a protected route with a valid token
- **WHEN** a client sends a request to a guarded route with a valid, non-expired access token
- **THEN** the request is allowed through and the decoded user identity is available to the route handler

#### Scenario: Accessing a protected route without a token
- **WHEN** a client sends a request to a guarded route with no token or an invalid/expired token
- **THEN** the request is rejected with an unauthorized error before reaching the route handler

### Requirement: Refresh token rotation
The system SHALL rotate refresh tokens on each use: invalidating the presented token and issuing a new one, and SHALL treat reuse of an already-invalidated refresh token as a signal to revoke the entire token family.

#### Scenario: Successful token refresh
- **WHEN** a client submits `POST /auth/refresh` with a valid, not-yet-used refresh token
- **THEN** the system issues a new access token and a new refresh token, and the previous refresh token becomes invalid

#### Scenario: Reused refresh token detected
- **WHEN** a client submits `POST /auth/refresh` with a refresh token that was already rotated (previously used)
- **THEN** the system rejects the request and invalidates every refresh token issued under that same token family, requiring the user to log in again

### Requirement: Logout
The system SHALL allow a user to log out, invalidating their current refresh token so it can no longer be used to obtain new access tokens.

#### Scenario: Successful logout
- **WHEN** an authenticated client submits `POST /auth/logout` with a valid refresh token
- **THEN** that refresh token is invalidated and the httpOnly cookie is cleared
