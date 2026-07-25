## Why

`add-chat` explicitly scoped renaming and deleting workspaces *out* — but they were built and verified during that work anyway (a chat feature with no way to rename or remove a workspace felt incomplete once the switcher was real). This change exists to close the resulting gap: shipped, working code with no spec behind it. It documents the rename/delete capability so the `chat` spec matches what actually runs.

*(Retroactive: the implementation already exists and was verified end-to-end via curl and in-browser. This change captures the spec delta; its tasks are verification records, not new work.)*

## What Changes

- Add `PATCH /chat/workspaces/:id` — rename a workspace the caller owns.
- Add `DELETE /chat/workspaces/:id` — delete a workspace the caller owns; its messages are removed by database cascade.
- Both enforce ownership *inside the query* (`updateMany`/`deleteMany` scoped by `{ id, userId }`), returning 404 — not 403 — for a workspace that doesn't exist or isn't the caller's, consistent with the enumeration-safe behavior of the existing chat endpoints.
- Frontend: rename/delete client functions, workspace-store actions (`updateWorkspace`, `deleteWorkspace`) with active-selection reassignment on delete, a message-store `dropWorkspace` cleanup, and sidebar UI — per-row pencil/trash icons opening confirmation modals.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `chat`: adds two requirements — workspace rename and workspace deletion (with message cascade) — to the existing chat capability.

## Impact

- Backend: `chat.controller.ts` (two routes), `chat.service.ts` (`renameWorkspace`/`deleteWorkspace`), new `dto/update-workspace.dto.ts`
- Frontend: `lib/stores/chat.ts` (two client functions), `workspace.store.ts` (`updateWorkspace`/`deleteWorkspace`), `message.store.ts` (`dropWorkspace`), `Sidebar.tsx` (row actions + modals), new `Modal.tsx`
- No schema change — relies on the `onDelete: Cascade` already set on `Message.workspace` in `add-chat`
