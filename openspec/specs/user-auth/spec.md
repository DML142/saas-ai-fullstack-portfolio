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
The system SHALL authenticate a user by email and password, and upon success issue an access token and a refresh token.

#### Scenario: Successful login
- **WHEN** a client submits `POST /auth/login` with a valid email and matching password
- **THEN** the endpoint returns an access token in the response body and sets a refresh token as an httpOnly cookie

#### Scenario: Invalid credentials
- **WHEN** a client submits `POST /auth/login` with an email that doesn't exist or a password that doesn't match
- **THEN** the endpoint returns an authentication error without revealing whether the email or password was the specific cause

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
