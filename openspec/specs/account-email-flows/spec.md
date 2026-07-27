# account-email-flows Specification

## Purpose

Defines account lifecycle flows that depend on transactional email: email verification (on registration and on demand) and password reset. These flows share a common concern — sending time-limited, single-use tokens by email asynchronously — so that user-facing requests are never blocked by mail delivery, and so that reset requests do not leak whether an email address is registered.

## Requirements

### Requirement: Transactional email delivery
The system SHALL send transactional emails (verification, password reset) asynchronously via a queued job, so that a slow or failing mail server does not block or fail the user-facing request that triggered it.

#### Scenario: Email send is decoupled from the request
- **WHEN** an action that sends an email is performed (registration, resend, forgot-password)
- **THEN** the request returns without waiting for the email to be delivered, and the actual send is performed by a background worker

#### Scenario: Transient send failures are retried
- **WHEN** a queued email send fails transiently
- **THEN** the job is retried rather than silently dropped

### Requirement: Email verification on registration
The system SHALL, on registration, mark the new account as unverified and send a verification email containing a single-use, time-limited link, without blocking the registration or the immediate session.

#### Scenario: Registration sends a verification email
- **WHEN** a user registers
- **THEN** the account is created with an unverified status, a session is issued as before, and a verification email is queued

#### Scenario: Verified status is exposed to the client
- **WHEN** an authenticated client requests its own profile
- **THEN** the response includes whether the account's email is verified

### Requirement: Verifying an email address
The system SHALL verify an email address when presented with a valid, unexpired verification token, mark the account verified, and invalidate the token so it cannot be reused.

#### Scenario: Valid token verifies the account
- **WHEN** a valid, unexpired verification token is submitted
- **THEN** the corresponding account is marked verified and the token is consumed

#### Scenario: Invalid or expired token is rejected
- **WHEN** an invalid, already-used, or expired verification token is submitted
- **THEN** the request is rejected and no account changes

### Requirement: Resending verification
The system SHALL allow an authenticated, still-unverified user to request a new verification email, issuing a fresh single-use token.

#### Scenario: Unverified user resends verification
- **WHEN** an authenticated user whose email is not yet verified requests a resend
- **THEN** a new verification token is issued and a verification email is queued

### Requirement: Requesting a password reset
The system SHALL accept a password-reset request for an email address and respond identically whether or not that address is registered, only sending a reset email when the address actually exists.

#### Scenario: Reset requested for a registered email
- **WHEN** a reset is requested for an email that belongs to an account
- **THEN** a single-use, time-limited reset token is issued and a reset email is queued

#### Scenario: Reset requested for an unknown email
- **WHEN** a reset is requested for an email that does not belong to any account
- **THEN** the response is the same success response as the registered case, and no email is sent

### Requirement: Resetting a password
The system SHALL, when presented with a valid, unexpired reset token and a new password, update the account's password, invalidate the token, and revoke the account's existing sessions.

#### Scenario: Valid token resets the password
- **WHEN** a valid, unexpired reset token is submitted with a new password meeting the password rules
- **THEN** the account's password hash is updated, the reset token is consumed, and existing refresh-token sessions for that account are revoked

#### Scenario: Invalid or expired reset token is rejected
- **WHEN** an invalid, already-used, or expired reset token is submitted
- **THEN** the request is rejected and the password is not changed

#### Scenario: New password is validated
- **WHEN** a reset is submitted with a new password that does not meet the password rules
- **THEN** the request is rejected as invalid and the password is not changed
