# Phase 6D-1: secure classroom connectivity

## Frontend configuration

`VITE_API_URL` selects one backend for REST authentication, history/results, and classroom WebSockets. No separate WebSocket variable is needed.

Online, set this in the frontend hosting provider's build environment, or in the repository root's `.env.local` for local frontend development:

```dotenv
VITE_API_URL=https://typetiles.onrender.com/api
```

The resulting endpoints are:

- REST: `https://typetiles.onrender.com/api`
- Classroom: `wss://typetiles.onrender.com/ws`
- Lobby host: `https://typetiles.onrender.com`

Vite embeds this setting at build time. Restart the development frontend or rebuild the deployed frontend after changing it. A value in `server/.env` does not configure Vite. Never put database credentials, Resend keys, or signing secrets in frontend variables.

## Local / LAN

For an HTTP-served local frontend without `VITE_API_URL`, both connections use the frontend hostname on port 3001:

- REST: `http://<frontend-hostname>:3001/api`
- Classroom: `ws://<frontend-hostname>:3001/ws`

For example, a classroom frontend served from `http://192.168.1.20:5173` uses backend `http://192.168.1.20:3001` by default. The backend must be accessible from each student's device.

If the backend is on another machine or port, explicitly configure its API before starting/building the frontend, e.g. `VITE_API_URL=http://192.168.1.20:3001/api`. Log in against that backend. Entering a different server only in the lobby is rejected, because its accounts, database, and token configuration might differ. Switching between online and LAN profiles requires updating the frontend configuration, restarting/rebuilding, and logging in to the selected backend; it does not synchronize databases.

The lobby accepts a matching bare hostname with port, HTTP(S) origin/API URL, or WS(S) `/ws` URL. It normalizes the selection to the configured backend origin. IPv6 addresses must use brackets, e.g. `[::1]:3001`.

## Invalid configurations

- HTTPS pages require an explicit HTTPS API URL; there is no insecure port-3001 fallback on HTTPS.
- HTTPS pages cannot connect to HTTP LAN servers. Serve the local frontend over HTTP for the existing LAN setup, or provide an HTTPS-enabled backend.
- Credentials, query parameters, fragments, unsupported schemes/paths, invalid ports and backend mismatches are rejected before requests or sockets are opened.
- Supported API paths are the backend root and `/api`; the socket route remains `/ws`.
- Invalid settings produce request/connection errors rather than crashing the application at module initialization.

## Navigation and reconnection

Lobby and Game use `getBackendEndpoints()` from `src/lib/endpoints.ts`. The lobby passes its normalized connected backend through the existing `hostAddress` route-state field. Game captures the validated socket URL for all retry attempts, preserving its latest performance snapshot and the existing retry/session-close behavior.

Saved room codes are now paired with `type_tiles_lan_room_endpoint` in local storage. A mismatched or invalid saved backend is not joined. Legacy room codes without a backend identity are not automatically rejoined; enter the room code again on the configured backend. No room messages or server APIs changed.

## Validation and deployment boundary

Endpoint unit tests and headless component tests cover online/LAN resolution, invalid URLs, mixed content, REST/socket alignment, navigation, saved-room restore, and Game reconnect/performance resending. Component tests run the actual component handlers/effects with a simulated browser transport; they do not certify browser TLS, CORS, DNS, or internet connectivity.

Existing server tests exercise real local WebSocket clients, including 50 students plus a teacher and SQLite result persistence. Full remote browser testing is still required after deployment: teacher and students on different networks, HTTPS/WSS handshake, reconnects, formats, rankings, and final results/history.

This phase does not change backend CORS, authentication, database settings/schema, capacity, scoring, Gregg content, DNS or deployments. Before public use, configure Render's existing `CLIENT_URL` / `CLIENT_ORIGINS` for the actual frontend origins. Active rooms remain process-local and do not survive backend restarts or span multiple backend instances.

## Implementation validation (November 8, 2026)

- Full server test command: `cd server && npm test` — 72 tests passed, zero failed.
- New endpoint/component tests: eight passed, covering HTTPS online and HTTP LAN flows.
- Capacity regression: 50 simultaneous local student WebSockets plus teacher, rejection of student 51, reconnects, ranked final results, and SQLite reopen persistence passed.
- Existing classroom format, Solo/Gregg gameplay, authentication, and PostgreSQL-engine regression tests passed. PostgreSQL tests use PGlite; they do not certify the production Supabase deployment.
- Frontend and backend TypeScript checks passed.
- `npm run build` passed; Vite retains its large-bundle warning.
- `git diff --check` passed.
- A read-only connection to `wss://typetiles.onrender.com/ws` completed its TLS/WebSocket handshake. No authentication messages, rooms, matches, emails, or database writes were requested.
- Full authenticated remote browser multiplayer and cross-network capacity testing remain manual deployment checks. No commit, push, deployment, or environment-file change was performed.
