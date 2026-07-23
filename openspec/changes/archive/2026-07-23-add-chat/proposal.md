## Why

`dashboard-shell` (archived) deliberately deferred real chat: the workspace switcher reads a hardcoded local array, and the chat panel's input/send button are disabled placeholders. This change replaces both with the real feature `CLAUDE.md` describes — persisted workspaces, persisted messages, and a simulated AI reply (no real LLM) delivered through a background job and pushed to the client over a WebSocket, using the queue/WebSocket infrastructure already named in the project's tech stack for exactly this purpose.

## What Changes

- Add `Workspace` and `Message` Prisma models — a workspace belongs to a user, a message belongs to a workspace and is authored by either the user or the (simulated) assistant.
- Add a backend chat module: list/create workspaces for the authenticated user, send a message (persists it, enqueues a reply job), fetch a workspace's message history.
- Add a BullMQ queue + worker that simulates "thinking" with a delay, then writes an assistant `Message` row — new infrastructure for this project (first real use of BullMQ).
- Add an authenticated WebSocket gateway (reuses the existing access token) that pushes the new assistant message to the client once the worker finishes — first real use of WebSockets in this project.
- Frontend: replace `workspace.store.ts`'s static placeholder array with real API-backed data (fetched via the existing `authFetch` pattern), wire the chat panel's input/send box to actually send messages and render real history, connect to the WebSocket to receive simulated replies live, render message content as markdown with code highlighting.
- **BREAKING**: `workspace.store.ts`'s shape changes from an always-populated static array to network-backed state (loading/error included) — components consuming it (`Sidebar`, `ChatPanel`) need to handle an empty/loading state that couldn't occur before.

**Explicitly out of scope:**
- Chat/workspace import-export (`CLAUDE.md` lists it as a separate feature bullet from the core chat loop) — a distinct, separable follow-up.
- Real subscription-tier gating or usage-limit enforcement — no billing backend exists yet (same deferral `dashboard-shell`'s usage view already made explicit).
- Editing or deleting messages, renaming/deleting workspaces, multi-user or shared workspaces.

## Capabilities

### New Capabilities
- `chat`: workspace and message persistence, the simulated-reply pipeline (BullMQ job + WebSocket push), and the real chat UI (send, receive, history, markdown/code rendering).

### Modified Capabilities
- `dashboard-shell`: the "Workspace/chat switcher" requirement changes from listing a hardcoded placeholder list to listing real, per-user workspace data. The "Empty/placeholder chat panel" requirement is removed — the chat panel is no longer a placeholder, and its real behavior is now specified under the new `chat` capability instead.

## Impact

- New backend: `apps/backend/src/chat/*` (module, controller, service, gateway, queue/worker), `Workspace`/`Message` Prisma models + migration
- New frontend: chat API client (`authFetch`-based), WebSocket client hook, markdown/code-highlighting rendering for messages
- Modified: `apps/frontend/lib/stores/workspace.store.ts` (static → network-backed), `Sidebar.tsx`/`ChatPanel.tsx` (handle loading/empty states, wire real send/receive)
- New dependencies: BullMQ (+ a WebSocket library, e.g. `@nestjs/websockets`/`socket.io`, and a markdown/code-highlighting renderer on the frontend)
- Reuses as-is: `<RequireAuth>`, `useAuth()`, the existing JWT access token (for authenticating the WebSocket connection), `authFetch`'s 401-retry pattern, Redis (already ioredis-backed, compatible with BullMQ's connection requirements)
