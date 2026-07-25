## Context

`add-chat` (archived) built workspace create/list/message endpoints with an ownership pattern of read-then-check: `findUnique` by id, compare `userId`, throw `NotFoundException`. Rename and delete were deferred but then implemented in the same push. This documents the design as built.

## Goals / Non-Goals

**Goals:**
- Let a user rename and delete their own workspaces, and only their own.
- Reuse the enumeration-safe 404 behavior the other chat endpoints already have.
- Keep client and server state consistent after a delete (no dangling active workspace, no orphaned cached messages).

**Non-Goals:**
- Soft delete / trash / undo — deletion is immediate and permanent.
- Bulk operations, archiving, or workspace sharing.
- Schema changes — the message cascade already exists.

## Decisions

**Ownership enforced inside the write query via `updateMany`/`deleteMany`.**
Prisma's `update`/`delete` only accept a *unique* `where` (just `id`), which forces the read-then-check pattern and its time-of-check/time-of-use gap. The `*Many` variants accept a non-unique `where`, so the write is scoped to `{ id, userId }` atomically — the row is only touched if it exists *and* belongs to the caller. `result.count === 0` then means "not found **or** not yours", and both throw `NotFoundException`. This is a deliberate improvement over the read-then-check pattern used by the older endpoints, and it yields the 404-not-403 enumeration-safety for free (a 403 would confirm a workspace id is real to a non-owner).

**Message cleanup on delete relies on the database cascade, not application code.**
`Message.workspace` already has `onDelete: Cascade` (set in `add-chat`'s schema), so deleting a workspace row removes its messages in the same operation. No manual `message.deleteMany` — the constraint is the single source of truth.

**Frontend delete reassigns the active selection.**
Deleting the currently-viewed workspace would leave `activeId` pointing at a row that no longer exists, rendering a blank panel. The workspace-store `deleteWorkspace` action reassigns `activeId` to the first remaining workspace (or `null` if none remain) only when the deleted id was active.

**Message store gets a `dropWorkspace` cleanup.**
The server cascade removes messages server-side, but the client's `message.store` caches them under `byWorkspace` (plus `unread`/`pending` sets). `dropWorkspace` deletes those client-side so a deleted workspace leaves no stale state, and a future workspace reusing an id can't inherit old history.

**Delete is guarded by a confirmation modal.**
Deletion cascades all messages and is irreversible, so the UI requires an explicit confirm step (a small dialog naming the workspace) rather than deleting on a single click.

## Risks / Trade-offs

- **[Risk] Permanent deletion with no undo** → **Mitigation:** confirmation modal that states messages go too and it can't be undone; acceptable for a preview product.
- **[Risk] Client store and server drift if a delete request fails after optimistic local removal** → **Mitigation:** local store updates happen only *after* the server call resolves (not optimistically), so a failed delete leaves the workspace in place.
