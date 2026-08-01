## ADDED Requirements

### Requirement: Role assignment is uniform across auth methods
The system SHALL apply the same default-role rule to accounts created via
Google OAuth sign-in as it does to accounts created via registration: a
`role` of `USER`.

#### Scenario: New Google-only account defaults to USER role
- **WHEN** a new `User` is created as part of a first-time Google sign-in
  (no existing account to link)
- **THEN** their stored `role` is `USER`, identical to a password
  registration

#### Scenario: Linking an existing account does not change its role
- **WHEN** an existing password-based account is linked to a Google identity
  on first Google sign-in
- **THEN** that account's `role` is unchanged by the linking
