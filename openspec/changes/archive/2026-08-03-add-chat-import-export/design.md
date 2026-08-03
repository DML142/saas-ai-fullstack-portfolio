## Context

`Workspace`/`Message` (`apps/backend/prisma/schema.prisma`) are the only
data involved: `Workspace { id, userId, name, messages[], createdAt }`,
`Message { id, workspaceId, role, content, createdAt }`. `ChatService`/
`ChatController` already implement ownership-scoped CRUD for workspaces
(`listWorkspaces`, `postWorkspace`, `renameWorkspace`, `deleteWorkspace`,
`getMessages`, `sendMessage`) — ownership is always checked as
`workspace.userId !== userId` → `NotFoundException` (never a `403`, so a
request never reveals whether a workspace exists — see the `chat` capability
spec's existing rename/delete scenarios). `SendMessageDto`/
`CreateWorkspaceDto` set the precedent field limits this change reuses
(`content` ≤ 100000 chars, `name` ≤ 100 chars). On the frontend,
`Sidebar.tsx` already has a precedent for a per-row icon-button action
(Pencil/Trash2), and `AvatarMenu.tsx` already has the hidden-
`<input type="file">` + ref + `.click()` pattern for a file picker triggered
from a styled `Button`.

## Goals / Non-Goals

**Goals:**
- Let a user download one of their workspaces as a self-contained JSON
  file, and later re-import it (same account, another account, after a
  delete — doesn't matter) as a new workspace.
- Reuse existing ownership-check, DTO-validation, and file-picker patterns
  exactly — nothing novel introduced.

**Non-Goals:**
- No bulk/"export everything" — one workspace per export, matching the
  per-row action model rename/delete already use.
- No non-JSON export format (Markdown transcript, etc.).
- No import quota beyond a hard per-import message cap (below) — imported
  messages don't count toward the monthly send quota, so there's no need to
  reconcile import against `TIER_MESSAGE_LIMITS`.
- No overwrite/merge-into-existing-workspace import — every import creates
  a fresh workspace, sidestepping id-collision and merge-conflict questions
  entirely.

## Decisions

**Export response includes a `version` field.**
`{ version: 1, name, exportedAt, messages: [...] }`. A bare array or
unversioned object can't reject a malformed/future-format file cleanly on
import — `@IsIn([1])` on import gives a clear validation error instead of a
confusing downstream failure. Minimal versioning, not a general plugin
format.

**Import creates a brand-new `Workspace`, never reuses the exported id.**
The exported file carries no `id`/`userId` at all (only `name` + `messages`)
— so there's nothing to collide across users or re-imports, and ownership
is unambiguously the importing user. This also avoids needing an
"overwrite existing workspace" UX.

**Imported message `createdAt` is preserved from the file; the new
workspace's own `createdAt` is "now."** The workspace is genuinely being
created now, but its messages represent real prior history — keeping their
original timestamps makes the reconstructed chat read correctly
(chronological order, realistic dates) instead of every message appearing
to have been sent in the same instant. Prisma's `@default(now())` on
`Message.createdAt` is simply overridden with an explicit value from the
DTO when present, and left to default when a message in the payload omits
it.

**Import does not increment the monthly message quota, and does not
enqueue simulated replies.** `UsageLimitGuard`/`TIER_MESSAGE_LIMITS` model
*sending new messages to the assistant*; importing is a data-restore
operation with no assistant interaction — gating it behind the send quota
would make "restore your own exported data" fail for a user near their
monthly limit, which isn't the quota's purpose. Replaying every imported
`USER` message through the `chat-reply` queue would also flood the
workspace with new simulated replies for messages that, in the original
export, already had their own real replies included — the import DTO
carries both `USER` and `ASSISTANT` messages verbatim specifically so no
regeneration is needed.

**Hard cap on import size**: `@ArrayMaxSize(2000)` messages,
`@MaxLength(100000)` per message content (matches `SendMessageDto`),
`@MaxLength(100)` on name (matches `CreateWorkspaceDto`). Prevents a
crafted oversized JSON payload from creating a pathologically large
workspace in one request; enforced via `class-validator`, consistent with
every other write endpoint in this module.

**Export is a plain `GET` returning JSON, not a `Content-Disposition:
attachment` response.** Every other endpoint in this API returns plain
JSON; adding attachment-header/streaming machinery for one route would be
new infrastructure for no real benefit — the frontend already fetches
through `chatAuthFetch` (a bearer-token JSON fetch, not a plain browser
navigation), so a native `Content-Disposition` download prompt doesn't
apply anyway. The frontend receives the JSON, wraps it in a `Blob`, and
triggers the download itself via a temporary `<a download>` — the same
technique is needed regardless of response headers, since the request must
carry an `Authorization` header a plain link-click can't send.

**Ownership check mirrors the existing convention exactly: not found, not
forbidden.** Exporting a workspace you don't own returns `404` (same as
`getMessages`/`sendMessage`/`renameWorkspace`/`deleteWorkspace`), never a
`403` that would reveal the workspace exists.

## Risks / Trade-offs

- **[Trade-off]** No merge/overwrite import means re-importing the same
  file twice produces two separate workspaces — by design, the simplest and
  safest option; duplicate workspace names are already unconstrained today.
- **[Risk]** A hand-edited/malicious JSON file could still pass DTO
  validation while containing nonsense `content` strings — acceptable,
  since content is already free-form user text everywhere else in chat (no
  sanitization gap introduced; the existing markdown renderer already
  handles arbitrary text safely).
- **[Trade-off]** Imported history bypassing the reply pipeline means an
  imported `USER` message with no matching `ASSISTANT` reply in the file
  simply has no reply — acceptable, since the file is the user's own prior
  export and reflects whatever history actually existed.

## Migration Plan

- Additive only: two new routes, one new DTO file, no schema migration, no
  changes to existing request/response contracts. Deploy by merging;
  rollback is removing the two routes.

## Open Questions

- None — scope, versioning, quota/reply interaction, and validation limits
  above are enough to implement.
