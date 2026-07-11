# rbac Specification

## Purpose

Defines role-based authorization on top of user-auth: a fixed USER/PREMIUM/ADMIN role assigned per user, embedded in access tokens, and enforced on routes via a Roles decorator and guard.

## Requirements

### Requirement: User role assignment
The system SHALL assign every newly registered user a `role` of `USER` by default, selected from a fixed set of roles: `USER`, `PREMIUM`, `ADMIN`.

#### Scenario: New registration defaults to USER role
- **WHEN** a new user completes registration
- **THEN** their stored `role` is `USER`

### Requirement: Role embedded in access token
The system SHALL embed the user's role in the access token payload at the time it is issued (on login, registration, and token refresh), so that role information is available without a database lookup.

#### Scenario: Access token contains role claim
- **WHEN** a user logs in, registers, or refreshes their tokens
- **THEN** the issued access token's payload includes the user's current `role`

### Requirement: Role-restricted routes
The system SHALL provide a mechanism to mark a route as requiring one or more specific roles, and SHALL reject requests from authenticated users whose role does not match.

#### Scenario: Authorized role allowed through
- **WHEN** a request to a role-restricted route includes a valid access token whose embedded role matches one of the route's required roles
- **THEN** the request is allowed through to the route handler

#### Scenario: Unauthorized role rejected
- **WHEN** a request to a role-restricted route includes a valid access token whose embedded role does not match any of the route's required roles
- **THEN** the request is rejected with a `403 Forbidden` error, without reaching the route handler

#### Scenario: Unauthenticated request to a role-restricted route
- **WHEN** a request to a role-restricted route has no valid access token at all
- **THEN** the request is rejected with `401 Unauthorized` (authentication failure takes precedence over role authorization)
