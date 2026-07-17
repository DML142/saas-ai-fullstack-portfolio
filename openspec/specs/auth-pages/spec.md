# auth-pages

## Purpose

Defines the frontend login/register pages, the client-side session store, silent-refresh-on-load, and route-guard UX that let a real user authenticate through the UI against the backend's `user-auth` API.

## Requirements

### Requirement: Login page
The system SHALL provide a `/login` page where a user submits email and password, and on success establishes an authenticated session.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials on `/login`
- **THEN** the client stores the returned access token and user in memory, the session status becomes `authenticated`, and the user is redirected away from `/login`

#### Scenario: Invalid credentials
- **WHEN** a user submits credentials the backend rejects
- **THEN** the page shows a single flat error message and does not indicate whether the email or the password was the specific cause

### Requirement: Register page
The system SHALL provide a `/register` page where a user submits email and password to create an account, and on success establishes an authenticated session.

#### Scenario: Successful registration
- **WHEN** a user submits an email and a password meeting the client-side validation rules
- **THEN** the account is created via the backend, the client stores the returned access token and user in memory, the session status becomes `authenticated`, and the user is redirected away from `/register`

#### Scenario: Registration rejected by the backend
- **WHEN** the backend rejects the submission (e.g. email already registered)
- **THEN** the page shows a single flat error message

#### Scenario: Client-side validation failure
- **WHEN** a user submits an email or password that fails the Zod schema before the request is sent
- **THEN** the page shows a field-level validation message and no request is sent to the backend

### Requirement: In-memory session store
The system SHALL hold the access token and current user only in memory (never in `localStorage`/`sessionStorage`), exposing a session status of `loading`, `authenticated`, or `unauthenticated`.

#### Scenario: Access token never persisted
- **WHEN** a user successfully logs in or registers
- **THEN** the access token exists only in the in-memory store and is not written to any persistent browser storage

### Requirement: Silent session recovery on load
The system SHALL attempt to recover a session on application mount by calling the refresh endpoint with credentials included, without requiring the user to re-enter credentials.

#### Scenario: Session recovered after reload
- **WHEN** the application mounts and a valid refresh cookie is present
- **THEN** the client obtains a new access token and user via the refresh endpoint and the session status becomes `authenticated`, without the user submitting a form

#### Scenario: No session to recover
- **WHEN** the application mounts and there is no valid refresh cookie
- **THEN** the refresh call fails and the session status becomes `unauthenticated`

### Requirement: Expired access token recovery
The system SHALL, on receiving a 401 from an authenticated request, attempt exactly one refresh-and-retry before treating the session as ended.

#### Scenario: Recoverable expiry
- **WHEN** an authenticated API call returns 401 and the subsequent refresh call succeeds
- **THEN** the original call is retried once with the new access token and its result is returned to the caller

#### Scenario: Unrecoverable expiry
- **WHEN** an authenticated API call returns 401 and the subsequent refresh call also fails
- **THEN** the session status becomes `unauthenticated` and the original call's failure is returned to the caller

### Requirement: Client-side route guard
The system SHALL provide a guard that prevents rendering of protected content until session status has resolved, redirecting unauthenticated users, while relying on backend guards as the actual authorization boundary.

#### Scenario: Guard waits during session recovery
- **WHEN** a protected route is loaded while session status is still `loading`
- **THEN** the guard does not yet render the protected content and does not yet redirect

#### Scenario: Guard redirects unauthenticated users
- **WHEN** session status resolves to `unauthenticated` on a protected route
- **THEN** the user is redirected to `/login`

#### Scenario: Guard allows authenticated users through
- **WHEN** session status resolves to `authenticated` on a protected route
- **THEN** the protected content renders
