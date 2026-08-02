# admin Specification

## Purpose
TBD - created by archiving change add-admin-panel. Update Purpose after archive.
## Requirements
### Requirement: ADMIN-only access to the admin surface
The system SHALL restrict every admin endpoint to authenticated users whose
role is `ADMIN`, rejecting all others.

#### Scenario: Non-authenticated request
- **WHEN** a request to any `/admin/*` endpoint arrives without a valid access
  token
- **THEN** the request is rejected as unauthorized (401)

#### Scenario: Authenticated non-admin request
- **WHEN** an authenticated user whose role is `USER` or `PREMIUM` requests any
  `/admin/*` endpoint
- **THEN** the request is rejected as forbidden (403)

#### Scenario: Authenticated admin request
- **WHEN** an authenticated user whose role is `ADMIN` requests an `/admin/*`
  endpoint
- **THEN** the request is authorized and handled

### Requirement: Paginated, searchable user listing
The system SHALL return a paginated list of users, optionally filtered by an
email search term, including each user's effective subscription tier and status.

#### Scenario: Default page
- **WHEN** an admin requests the user list with no pagination parameters
- **THEN** the first page is returned as `{ data, total, page, limit }` using
  the default page size

#### Scenario: Search by email
- **WHEN** an admin requests the user list with a search term
- **THEN** only users whose email contains that term (case-insensitive) are
  returned, still paginated

#### Scenario: Page size is bounded
- **WHEN** an admin requests a page size above the allowed maximum
- **THEN** the request is rejected as a validation error (the page size cannot
  be unbounded)

### Requirement: Single-user detail
The system SHALL return the full detail of one user by id, including their
subscription (if any) and a count of their workspaces.

#### Scenario: Existing user
- **WHEN** an admin requests a user by an id that exists
- **THEN** that user's detail, subscription, and workspace count are returned

#### Scenario: Missing user
- **WHEN** an admin requests a user by an id that does not exist
- **THEN** the request is rejected as not found (404)

### Requirement: Role change with self-modification blocked
The system SHALL allow an admin to change another user's role, and SHALL refuse
to let an admin change their own role.

#### Scenario: Changing another user's role
- **WHEN** an admin changes the role of a user who is not themselves
- **THEN** that user's role is updated to the requested role

#### Scenario: Attempting to change one's own role
- **WHEN** an admin attempts to change their own role
- **THEN** the request is rejected as forbidden (403) and no role is changed

#### Scenario: Invalid role value
- **WHEN** an admin submits a role value outside the `Role` enum
- **THEN** the request is rejected as a validation error

### Requirement: Paginated subscription listing
The system SHALL return a paginated list of subscriptions read from the
database, each associated with its user's email.

#### Scenario: Listing subscriptions
- **WHEN** an admin requests the subscription list
- **THEN** a page of subscriptions is returned as `{ data, total, page, limit }`,
  each including the owning user's email, tier, status, and period end

### Requirement: Cancel a subscription at period end via Stripe
The system SHALL cancel a user's subscription at period end by instructing
Stripe, and SHALL NOT write the subscription's tier or status directly — the
database is updated only by the resulting webhook.

#### Scenario: Cancelling an existing subscription
- **WHEN** an admin cancels a user's subscription
- **THEN** Stripe is instructed to cancel that subscription at period end, and
  the endpoint returns success without writing the subscription's tier/status
  directly

#### Scenario: Database reflects the cancellation via webhook
- **WHEN** Stripe subsequently delivers the `customer.subscription.updated`
  event for that cancellation
- **THEN** the existing webhook sync updates the stored subscription's
  `cancelAtPeriodEnd` and `status`

#### Scenario: User without a subscription
- **WHEN** an admin attempts to cancel a subscription for a user who has none
- **THEN** the request is rejected as not found (404)

### Requirement: Platform statistics
The system SHALL return aggregate platform statistics derived from existing
data: total users, a breakdown of users by role, a breakdown of subscriptions
by tier, and a signups-over-time series for a recent window.

#### Scenario: Requesting stats
- **WHEN** an admin requests platform statistics
- **THEN** total user count, user-by-role counts, subscription-by-tier counts,
  and a daily signup series for the recent window are returned

### Requirement: Queue health
The system SHALL return the current BullMQ job counts for each application
queue.

#### Scenario: Requesting queue health
- **WHEN** an admin requests queue health
- **THEN** for each application queue (`email`, `chat-reply`) the current job
  counts (waiting, active, completed, failed, delayed) are returned

### Requirement: ADMIN-gated admin UI
The frontend SHALL expose an `/admin` route tree accessible only to signed-in
users whose role is `ADMIN`, redirecting all others away.

#### Scenario: Admin visits the admin area
- **WHEN** a signed-in `ADMIN` navigates to `/admin`
- **THEN** the admin area renders

#### Scenario: Non-admin visits the admin area
- **WHEN** a signed-in non-admin navigates to any `/admin` route
- **THEN** they are redirected to `/dashboard`

#### Scenario: Admin navigation entry visibility
- **WHEN** the dashboard renders for a signed-in user
- **THEN** the link to the admin area is shown only if that user's role is
  `ADMIN`
