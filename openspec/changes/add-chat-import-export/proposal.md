## Why

The original feature list (CLAUDE.md's Chat section: "import/export a
chat/workspace") calls for this, and tech.md's roadmap places it right
after the admin panel as the next small, self-contained feature — a
finishing touch on COS Assistant demonstrating data portability for a
workspace, using the existing `Workspace`/`Message` models with no schema
changes.

## What Changes

- Add `GET /chat/workspaces/:id/export`: returns the caller's workspace
  (must own it) serialized as a downloadable JSON document —
  `{ version, name, exportedAt, messages: [{ role, content, createdAt }] }`.
- Add `POST /chat/workspaces/import`: accepts that same JSON shape as the
  request body, validates it, and creates a **new** workspace (owned by the
  caller) with all its messages re-created from the payload — never reuses
  ids/ownership from the file, so importing is safe across users and across
  repeated imports of the same file.
- Imported messages do **not** count against the monthly message quota and
  do **not** trigger the simulated-reply pipeline — importing restores
  history, it isn't "sending" new messages to the assistant.
- Frontend: an Export icon button per workspace row (mirrors the existing
  Rename/Delete icon buttons in `Sidebar.tsx`) triggering a browser download
  via a `Blob`; an "Import chat" trigger using the same hidden-file-input
  pattern `AvatarMenu.tsx` already uses for avatar upload, reading the file
  client-side and POSTing its parsed JSON.

## Capabilities

### New Capabilities
(none — this extends the existing `chat` capability)

### Modified Capabilities
- `chat`: adds workspace export and import as new requirements; existing
  send/quota/reply/rename/delete requirements are unchanged and unaffected
  — import is a distinct data-restore path, not a message-send path.

## Impact

- **New files (backend)**: `apps/backend/src/chat/dto/import-workspace.dto.ts`
  (`ImportMessageDto` + `ImportWorkspaceDto`).
- **Modified files (backend)**: `apps/backend/src/chat/chat.controller.ts`
  (+2 routes), `apps/backend/src/chat/chat.service.ts`
  (+`exportWorkspace`, +`importWorkspace`), `chat.service.spec.ts` /
  `chat.controller.spec.ts`.
- **Modified files (frontend)**: `apps/frontend/lib/stores/chat.ts` (+2
  functions), `apps/frontend/components/dashboard/Sidebar.tsx` (+export
  button per row, +import trigger).
- **No schema/migration changes** — export/import use the existing
  `Workspace`/`Message` models as-is.
- **No new dependencies.**
