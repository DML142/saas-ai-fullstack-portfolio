# user-auth

## Purpose

Defines core authentication for the backend: registration, login, JWT access/refresh token issuance with rotation-based reuse detection, and route protection via guards.

## Requirements

### Requirement: User registration
The system SHALL allow a new user to register with an email and password, storing only a hashed password, and reject registration with an email that already exists. The registration endpoint SHALL be rate-limited per client IP address.

#### Scenario: Successful registration
- **WHEN** a client submits `POST /auth/register` with a unique email and a password, within their current rate-limit allowance
- **THEN** a new `User` record is created with a hashed password (not plaintext) and the endpoint returns a success response

#### Scenario: Duplicate email rejected
- **WHEN** a client submits `POST /auth/register` with an email that already belongs to an existing user, within their current rate-limit allowance
- **THEN** the endpoint returns an error response and no new user is created

#### Scenario: Registration rate limit exceeded
- **WHEN** a client submits `POST /auth/register` after exceeding the configured request limit for that route within the current window
- **THEN** the endpoint returns `429 Too Many Requests` and no new user is created

### Requirement: User login
The system SHALL authenticate a user by email and password, and upon success issue an access token and a refresh token. The login endpoint SHALL be rate-limited per client IP address.

#### Scenario: Successful login
- **WHEN** a client submits `POST /auth/login` with a valid email and matching password, within their current rate-limit allowance
- **THEN** the endpoint returns an access token in the response body and sets a refresh token as an httpOnly cookie

#### Scenario: Invalid credentials
- **WHEN** a client submits `POST /auth/login` with an email that doesn't exist or a password that doesn't match, within their current rate-limit allowance
- **THEN** the endpoint returns an authentication error without revealing whether the email or password was the specific cause

#### Scenario: Login rate limit exceeded
- **WHEN** a client submits `POST /auth/login` after exceeding the configured request limit for that route within the current window
- **THEN** the endpoint returns `429 Too Many Requests` without evaluating the submitted credentials

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

### Requirement: Email verification and password reset request rate limiting
The system SHALL rate-limit, per client IP address, the endpoints that trigger a transactional email (`resend-verification`, `forgot-password`) and the endpoints that consume a single-use token (`verify-email`, `reset-password`), rejecting excess requests before any email is queued or token is checked.

#### Scenario: Resend-verification rate limit exceeded
- **WHEN** a client submits `POST /auth/resend-verification` after exceeding the configured request limit for that route within the current window
- **THEN** the endpoint returns `429 Too Many Requests` and no verification email is queued

#### Scenario: Forgot-password rate limit exceeded
- **WHEN** a client submits `POST /auth/forgot-password` after exceeding the configured request limit for that route within the current window
- **THEN** the endpoint returns `429 Too Many Requests` and no reset email is queued

#### Scenario: Verify-email rate limit exceeded
- **WHEN** a client submits `POST /auth/verify-email` after exceeding the configured request limit for that route within the current window
- **THEN** the endpoint returns `429 Too Many Requests` without checking the submitted token

#### Scenario: Reset-password rate limit exceeded
- **WHEN** a client submits `POST /auth/reset-password` after exceeding the configured request limit for that route within the current window
- **THEN** the endpoint returns `429 Too Many Requests` without checking the submitted token
