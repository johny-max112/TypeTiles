# Classroom authentication on Lobby -> Game reconnect

15 November 2026. Implemented locally; not committed, pushed or deployed.

## Finding

The deployed public bundle was checked and uses `https://api.playtypetiles.com/api`, cookie credentials, and no player_token storage. The Game screen opens a new WSS connection after leaving the Lobby. The server previously relied entirely on the cookie captured in that new socket's handshake.

An isolated Chrome diagnostic against the public site stored a synthetic HttpOnly/Secure/SameSite=Lax API-domain cookie, then opened WSS. The diagnostic handshake did not contain a Cookie header, despite the stored cookie. The test used no real account, password or valid session, and did not create or join a classroom. This reproduces the missing-cookie transport condition, not the exact private session state of the reporting user. Expired, revoked or deleted accounts can also legitimately produce authentication failures.

## Fix

Before create_room or join_room, the main frontend requests `POST /api/auth/classroom-ticket` through the authenticated, credentialed API client. Existing CSRF Origin/custom-header validation, current account/role/verification checks and session_version validation remain in force.

The endpoint returns an opaque random 256-bit ticket, not a JWT, with a 30-second lifetime. It is bound to the HTTP request's Origin, consumed once, stored only in memory, and sent only in the first WebSocket room message (never localStorage or URL). Storage is bounded at 5,000 pending tickets overall and five pending tickets per user. Capacity exhaustion returns 429 with Retry-After.

The socket server validates its upgrade Origin, consumes the ticket and then runs the existing JWT/database identity validation before creating/joining a room. The actual JWT remains HttpOnly. The ticket does not bypass role, capacity, ownership, ban, verification, logout, deletion or expiry checks. A ticket minted before global logout cannot revive a revoked JWT. Once authenticated, the existing token and database checks govern every action and idle-session sweep. Existing cookie-authenticated sockets remain supported.

Lobby, Game navigation and subsequent reconnects obtain fresh tickets. Late HTTP responses are discarded if the target socket has already closed. API failures are shown; a 401 triggers the existing session-ended behavior. Short session expiry remains 15 minutes and is not extended by ticket issuance. This patch does not add refresh-token rotation or gameplay recovery after backend restart.

## Source changes

- `server/src/classroomTickets.ts`: bounded one-use ticket store.
- `server/src/routes/auth.ts`: authenticated ticket endpoint.
- `server/src/lan.ts`: origin-bound ticket authentication on create/join, while preserving cookie fallback and existing checks.
- `src/lib/playerApi.ts`: credentialed ticket request.
- `src/lib/classroomSocket.ts`: shared ticket-send helper, with no localStorage credential.
- `src/pages/Lobby.tsx`, `src/pages/Game.tsx`: use that helper for initial entry and rejoin.
- `server/tests/classroomTickets.test.ts`, `cookieAuthChecks.ts`, `classroomConnectivity.test.ts`: new tests and harness integration. SQLite and PGlite PostgreSQL run the same cookie/ticket checks.

The local Admin proxy files already in the workspace are a separate earlier fix. They are not required by public multiplayer. No image/crop, gameplay engine, scoring, schema, provider, environment file or production configuration was modified by this patch.

## Validation

Focused checks cover opaque/one-use/expired/wrong-Origin tickets, per-account storage bounds, no JWT in ticket responses, fresh tickets per reconnect, late-response cancellation, rejected anonymous message tokens and revoked pre-logout tickets. The integration scenario creates a teacher room without a WSS cookie, joins a student via ticket, starts the match, closes the student's Lobby socket and successfully rejoins through a new Game-style socket/ticket without a cookie. It verifies that the student retains one participant record. Existing capacity/regression checks are run in the full server suite; see `output/classroom-ticket-tests.log` for final actual results.

The isolated Chrome diagnostic checks transport only; the real-account deployed Teacher/Student game still requires user validation after release. No production account actions were performed by the agent.

Executed results: the full server suite passed 95 tests with zero failures (including the earlier local Admin proxy checks); frontend TypeScript/Vite build passed with the existing bundle-size warning; backend TypeScript build passed after adding an explicit missing-entry guard to ticket consumption; the five focused ticket/cookie tests were rerun after that guard and passed. `git diff --check` passed. The full-suite run also verified 50 student connections plus Teacher and durable SQLite results. Admin was not changed again by this multiplayer patch.

## Release

Keep the current `VITE_API_URL`, CLIENT_URL and SameSite=Lax settings. No cookie-policy weakening or extra frontend secrets are needed. Deploy the backend with the new endpoint first, then the updated frontend (coordinated outside an active classroom). Both must be updated before expecting the fix. Hard-refresh and sign in again; use separate browser profiles/devices for Teacher and Student. Test create, join, ready, start, Lobby -> Game, rank updates, reconnect and final saved results.

Tickets are process-local, matching the current process-local classroom room model. Backend restart invalidates outstanding tickets. Multiple replicas would require shared atomic ticket storage or a reviewed routing/session design; this patch does not claim distributed operation.

Rollback the ticket helper/endpoint/store and associated Lobby/Game/lan changes together. No schema rollback is needed. Do not restore token storage in localStorage or weaken persisted authorization checks as a workaround.
