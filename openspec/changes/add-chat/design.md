## Context

`dashboard-shell` (archived) built the chrome around this feature — protected route, sidebar, switcher UI, chat panel layout — all against placeholder data, by design. This change fills that in for real, and is the first time this project actually uses BullMQ or WebSockets, both already named in `CLAUDE.md`'s tech stack but never implemented.

Relevant existing pieces this builds on rather than replaces:
- `authFetch` ([lib/stores/auth.ts](apps/frontend/lib/stores/auth.ts)) — the 401-retry-via-refresh wrapper every authenticated call already goes through.
- The access token itself (short-lived JWT, `{ sub, role }`, `JWT_ACCESS_EXPIRES_IN` seconds) — needs to also authenticate the WebSocket connection, not just HTTP calls.
- `RedisService` is already `ioredis`-backed, which is what BullMQ requires — no new Redis client needed, just a second connection/config for the queue.
- `workspace.store.ts`'s current shape (`{ workspaces: Workspace[], activeId, setActive }`) is the piece this change breaks — it goes from a static array to network-backed state.

## Goals / Non-Goals

**Goals:**
- A user can send a message in a workspace, see it persisted, and receive a simulated assistant reply shortly after — without a page reload, via a real background job and a real WebSocket push.
- Chat history persists across reloads (unlike the current placeholder, which resets every mount).
- Message content renders as markdown with code highlighting — a message containing a fenced code block should look like code, not a wall of raw text.
- The simulated nature stays honest: the assistant's reply is visibly canned/templated, not dressed up to look like a real model output.

**Non-Goals:**
- Any real LLM integration — the reply is templated/canned, matching `CLAUDE.md`'s explicit framing of COS Assistant as a UX/plumbing demo, not a functional AI.
- Import/export, message editing/deletion, workspace renaming/deletion, multi-user workspaces — all separate, smaller follow-ups.
- Horizontally scaling the WebSocket gateway (sticky sessions, Redis pub/sub adapter for multi-instance) — single-instance dev/deploy is assumed, same as the rest of this project today.

## Decisions

**Data model: `Workspace` and `Message` as new Prisma models.**
```
Workspace: id, userId (FK → User), name, createdAt
Message: id, workspaceId (FK → Workspace), role (USER | ASSISTANT), content, createdAt
```
Straightforward one-to-many both ways (`User → Workspace → Message`), no new complexity beyond what `User` already has. Two indexes matter for query performance as data grows: `Message.workspaceId` (history lookups) and `Workspace.userId` (listing a user's workspaces) — both are the natural FK indexes Prisma sets up by default, called out here so they're not accidentally dropped.

**Reply pipeline: BullMQ job → worker → DB write → WebSocket push, all in the existing Nest process.**
Sending a message is one HTTP request: persist the user's `Message`, enqueue a job (`{ workspaceId, userId }`), return the persisted user message immediately (the request does *not* wait for the reply). A `@Processor` in the same Nest application picks the job up, waits a randomized short delay (selling "thinking"), writes an assistant `Message`, then emits a WebSocket event to that user. Running the worker in the same process (not a separate deployable) is the right scope for this project — a portfolio app doesn't need worker/API process separation, and `CLAUDE.md`'s own queue examples (email sending, invoice generation) are already framed as in-process jobs.

**WebSocket auth and addressing: reuse the existing JWT, room-per-user.**
The socket handshake carries the same access token used for HTTP (as an auth payload, not a header — WebSocket handshakes don't carry arbitrary headers the way `fetch` does). The gateway verifies it with the same secret/`JwtService` config `JwtStrategy` already uses, then joins that socket to a room named `user:{userId}`. Since workspaces aren't shared between users, addressing by user (not by workspace) is sufficient — the client filters incoming messages by `workspaceId` itself to decide whether to render them immediately or just update an unread indicator for a workspace that isn't currently open.

**Access token expiry vs. long-lived socket connections — the real risk in this design.**
Access tokens live for `JWT_ACCESS_EXPIRES_IN` seconds (short — see `auth.controller.ts`'s cookie config for the analogous refresh token's lifetime, access is shorter still). A WebSocket connection authenticated at connect-time doesn't automatically pick up a refreshed token. Two honest options: (a) reconnect the socket whenever `authFetch` obtains a new access token (piggyback on the existing refresh flow, since that already knows exactly when a new token exists), or (b) have the gateway itself tolerate an expired token for an already-established connection and only enforce validity at connect-time. (a) is more correct (a truly revoked session should also drop the socket) and is what this design assumes; call out in tasks as the one piece worth extra care.

**Frontend workspace store becomes network-backed, with an explicit status field — same pattern as the auth store.**
```
{ workspaces: Workspace[], activeId: string | null, status: 'loading' | 'loaded' | 'error' }
```
Fetched once on dashboard mount via `authFetch`. This is the same shape-of-solution as `useAuthStore`'s `loading/authenticated/unauthenticated` — consistent with a pattern already established in this codebase, not a new one invented for this change. `Sidebar`/`ChatPanel` need to handle `status === 'loading'` (they never had to before, since the placeholder array was always instantly populated).

**Markdown + code highlighting: a dedicated rendering component, not raw `dangerouslySetInnerHTML`.**
Use a markdown library (e.g. `react-markdown`) with a syntax-highlighting plugin/renderer for fenced code blocks, rather than hand-rolling markdown parsing or trusting raw HTML from message content. This is ordinary frontend rendering work — no backend-integration concerns, since it only touches how already-fetched message content displays.

## Risks / Trade-offs

- **[Risk] Worker runs in the same process as the API** — a slow/stuck job could compete with request handling under real load → **Mitigation**: acceptable for this project's scale; a separate worker process is a known, standard scaling step if ever needed, not a redesign.
- **[Risk] Socket reconnect-on-refresh adds a real synchronization point between two independent systems (HTTP auth state and socket connection state)** → **Mitigation**: called out explicitly in tasks as needing its own careful verification, not just "should work."
- **[Risk] `workspace.store.ts`'s breaking shape change ripples into `Sidebar`/`ChatPanel`, both already built and verified in `dashboard-shell`** → **Mitigation**: those components' core UX (switcher list, active highlight, header) stays intentionally unchanged in spirit — only the data source and loading-state handling change, not the interaction design.

## Open Questions

- Whether creating a new workspace needs its own explicit UI (a "New chat" affordance in the sidebar) or whether auto-provisioning a single default workspace on first load is enough for this pass — leaning toward including a minimal "New chat" action now, since a chat feature with no way to start a second conversation feels incomplete, but flagging this as a judgment call for task-level scoping rather than settling it here.
