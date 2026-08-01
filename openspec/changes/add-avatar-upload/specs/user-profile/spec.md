## ADDED Requirements

### Requirement: Avatar upload
The system SHALL allow an authenticated user to upload an image file as their
avatar via `POST /users/me/avatar`. The uploaded file SHALL be validated
server-side for MIME type (image formats only) and maximum size before being
stored. On success, the user's `avatarUrl` SHALL be updated to point at the
stored file.

#### Scenario: Successful avatar upload
- **WHEN** an authenticated user submits `POST /users/me/avatar` with a valid
  image file under the configured size limit
- **THEN** the file is stored on disk, the user's `avatarUrl` is updated, and
  the endpoint returns the new `avatarUrl`

#### Scenario: Rejected file type
- **WHEN** an authenticated user submits `POST /users/me/avatar` with a file
  whose MIME type is not an accepted image type
- **THEN** the endpoint returns a validation error and no file is stored, and
  the user's `avatarUrl` is left unchanged

#### Scenario: File exceeds size limit
- **WHEN** an authenticated user submits `POST /users/me/avatar` with a file
  larger than the configured maximum size
- **THEN** the endpoint returns a validation error and no file is stored, and
  the user's `avatarUrl` is left unchanged

#### Scenario: Unauthenticated upload attempt
- **WHEN** a client submits `POST /users/me/avatar` without a valid access
  token
- **THEN** the endpoint returns an authentication error and no file is stored

#### Scenario: Replacing an existing avatar
- **WHEN** an authenticated user who already has an `avatarUrl` submits
  `POST /users/me/avatar` with a new valid image file
- **THEN** the previous file is removed from disk, the user's `avatarUrl` is
  updated to point at the new file, and the endpoint returns the new
  `avatarUrl`

### Requirement: Avatar removal
The system SHALL allow an authenticated user to remove their current avatar
via `DELETE /users/me/avatar`, clearing `avatarUrl` and deleting the stored
file.

#### Scenario: Successful avatar removal
- **WHEN** an authenticated user with an existing `avatarUrl` submits
  `DELETE /users/me/avatar`
- **THEN** the stored file is deleted from disk and the user's `avatarUrl` is
  set to `null`

#### Scenario: Removal with no avatar set
- **WHEN** an authenticated user with no `avatarUrl` submits
  `DELETE /users/me/avatar`
- **THEN** the endpoint returns success without error and `avatarUrl` remains
  `null`
