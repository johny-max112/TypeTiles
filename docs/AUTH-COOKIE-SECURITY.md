# Cookie authentication, logout revocation and login throttling

Implemented locally on 14 November 2026. No deployment, production data changes, environment-file edits, migrations, or dependency installation were performed.

## What changed

- Login sets an HttpOnly JWT cookie instead of returning a token in JSON. Production uses the `__Host-typetiles_session` name, Secure, Path=/, no Domain attribute, and SameSite=Lax by default. Development uses `typetiles_session` over local HTTP. Cookie and JWT lifetimes are 15 minutes. There is no refresh-token flow or sliding renewal: users must log in again after expiry. JWT verification also imposes a maximum age of 15 minutes and rejects missing expiration/version claims.
- `authMiddleware` parses the cookie directly without installing cookie-parser. Bearer authentication is no longer accepted. Every protected request retains database checks for account existence, verification, ban status, session_version and current role. Protected responses and login/logout are no-store.
- Student/Teacher and Admin clients include credentials and restore sessions through `/api/auth/me`. Neither stores nor sends JWTs from localStorage. The remaining classroom localStorage keys contain room/endpoint navigation preferences, not authentication credentials. Clear old `player_token` and `admin_token` entries manually in browser site storage during migration; this code never reads those legacy values.
- `POST /api/auth/logout` requires authentication and CSRF protection, atomically increments the user's persisted session_version, emits the existing invalidate event and clears the cookie using matching options. This logs out **all devices**, not only the current browser. Failed logout requests are reported by the UI instead of pretending revocation succeeded. Already expired sessions need reauthentication before an account-wide logout can be requested.
- Login permits five failed/in-flight attempts per normalized submitted account identifier in a fixed 15-minute window. The sixth is rejected with HTTP 429, Retry-After, a generic error and a JSON retryAfter value. A second bucket allows 300 failed/in-flight attempts per IP/window to accommodate classroom NAT. Successful attempts release their own reservations; they do not erase other failures or concurrent reservations. Unknown accounts are throttled too, and perform dummy bcrypt comparison to reduce username timing differences. Other valid logins are not counted as failures. Registration remains unchanged.
- The limiter is a bounded, synchronous in-process store (20,000 buckets); reservations happen before awaiting DB/bcrypt. Expired buckets are removed. When full it fails closed with 429 instead of evicting protection. This is suitable only for the current single-process deployment model: restart resets counters, and independent replicas do not share counters. A shared atomic store is required before scaling out or requiring restart-persistent throttling. Temporary account throttling can be abused to deny a targeted account login; no permanent account lock is introduced.

## CSRF, CORS and WebSockets

Cookie authentication introduces CSRF risk. All production API mutations require both an exact allowed Origin and `X-TypeTiles-Request: 1`. Login, registration, verification, recovery and logout are included. All application writes already use JSON/API clients, so no browser form endpoint is exempt. The static custom header is a custom-header/preflight defense, not a secret CSRF token. Its security depends on the exact CORS allowlist; do not allow attacker-controlled origins.

CORS allows credentials, explicitly permits Content-Type and X-TypeTiles-Request, and exposes Retry-After. Production origins come only from CLIENT_URL and CLIENT_ORIGINS. Localhost/private LAN HTTP origins on development ports 5173/5174 are permitted only outside production. The private-origin convenience must not be treated as a production allowlist.

WebSocket upgrades validate Origin before accepting the connection. Identity comes exclusively from the handshake cookie; JSON `token` fields are ignored, and tokens in URLs are not supported. The existing per-message database checks, role/ownership checks and five-second idle-session sweep remain. The existing invalidate event closes same-process sockets immediately after logout; another process observes the persisted version on its next action or sweep (up to approximately five seconds for idle sockets). Reconnect uses the browser's current cookie. An expired session cannot reconnect without login. Old clients sending message tokens will no longer authenticate.

## Required production topology decision

The existing frontend `https://playtypetiles.com` and API `https://typetiles.onrender.com` are **different sites**. SameSite=Lax or Strict cookies will not be attached to cross-site fetches, even with credentials included. Do not deploy these default settings to that topology and assume login will work.

Recommended: attach an API custom domain such as `https://api.playtypetiles.com` to the existing Render backend, with valid HTTPS/WSS. Keep the frontend on `https://playtypetiles.com` and any Admin frontend on a trusted same-site subdomain. Set each frontend build's API URL to that same-site API endpoint and rebuild. Cross-origin requests still need CORS, but same-site cookies avoid third-party-cookie dependence. No custom domain, DNS or hosting configuration was changed by this implementation.

Temporary cross-site option: production `AUTH_COOKIE_SAME_SITE=none` sets Secure + SameSite=None. It still requires strict Origin checks and credentials. Browsers may block third-party cookies anyway, affecting both REST and WebSockets. This is not a reliable substitute for same-site hosting. The configuration deliberately rejects SameSite=None in development HTTP mode.

## Environment configuration (names and non-secret examples only)

| Setting | Purpose |
|---|---|
| `NODE_ENV=production` | Secure, __Host-prefixed cookie and strict production origin policy. Use development for HTTP localhost/LAN. |
| `JWT_SECRET` | Existing strong backend-only secret, at least 32 characters. Never put it in a VITE_ variable. |
| `CLIENT_URL=https://playtypetiles.com` | Exact frontend origin, no trailing slash or path. Required at production startup. |
| `CLIENT_ORIGINS` | Optional comma-separated additional trusted exact origins, including Admin if separately hosted. Do not use wildcard origins. Avoid public preview/tenant origins. |
| `AUTH_COOKIE_SAME_SITE=lax` | Default. `strict` is also supported; `none` is a production-only cross-site workaround subject to browser blocking. |
| `TRUST_PROXY` | Only the trusted proxy addresses/subnets or verified hop count for the actual Render/network topology. Do not blindly use true or trust arbitrary forwarded headers. Verify real client IP handling before release. |
| `VITE_API_URL=https://api.playtypetiles.com/api` | Example frontend/Admin build setting **after** that domain is configured. Online WS derives from the shared backend endpoint. |

`FRONTEND_URL` is not consumed by this project; use the existing CLIENT_URL. `COOKIE_DOMAIN` is deliberately not supported: the production __Host- cookie must remain host-only. The backend can set its own host cookie; it cannot set a playtypetiles.com cookie while serving from onrender.com. Existing database, Resend and verification/recovery secrets remain unchanged.

For local HTTP, use the same hostname on both sides: localhost frontend with localhost backend, or the same LAN IP for frontend and backend. Different ports are allowed. Mixing localhost, 127.0.0.1 and a LAN IP may turn the request into a cross-site request. Authenticate against the selected classroom backend; cookies do not transfer between backend hosts. Production API access from localhost requires explicit allowlisting and usually cross-site cookie policy; use a local backend for normal local development.

Student, Teacher and Admin apps now share one session cookie for a backend host within a browser profile. Cookies are not separated by frontend port. Use separate browser profiles/devices when demonstrating different accounts. Logging into another account replaces the cookie, and global logout revokes all sessions for the currently authenticated account.

## Changed source files

- Backend: server/src/auth.ts, cookieSecurity.ts (new), loginLimiter.ts (new), middleware.ts, routes/auth.ts, index.ts, lan.ts.
- Main frontend: src/lib/playerApi.ts, PlayerAuthContext.tsx, src/components/AppShell.tsx, src/pages/Settings.tsx, Lobby.tsx, Game.tsx.
- Admin: admin/src/api.ts, App.tsx, pages/Login.tsx.
- New security coverage: server/tests/cookieAuth.test.ts, cookieAuthChecks.ts, cookieFixtures.ts. Existing auth, authorization, registration, password-reset, deletion, results-integrity, classroom capacity/formats/reliability, endpoint-navigation and progress fixtures were migrated to cookies. PostgreSQL uses the existing isolated PGlite adapter; no live Supabase was accessed.

Gameplay, Gregg assets/mappings, scoring, database providers/schema, classroom capacity and result-finalization logic were not changed. No new tables are needed because session_version already exists.

## Validation and remaining release checks

Executed commands and actual counts are recorded in AUTH-COOKIE-VALIDATION.md after the final run. Security coverage includes cookie/no-token response, short expiry, cookie-only middleware, disallowed Origin/missing-header rejection, current role/status/version, global logout, socket eviction, cookie-only socket authentication, hostile WS origin, concurrent login throttling, limiter expiry and school-IP behavior. Existing capacity tests connect 50 simulated students plus a host and verify final SQLite persistence.

Automated Node HTTP tests do not certify actual browser cookie acceptance in the deployed topology. Before release, test Chrome/Edge and a browser that restricts third-party cookies; inspect HttpOnly/Secure/SameSite in DevTools, prove no token in localStorage or JSON, verify `/me` after reload, Admin access, classroom navigation/reconnect, global logout from a second browser and expiry during an active classroom. In the default short-session design, expiry can interrupt matches lasting beyond the session lifetime; there is no silent refresh. Schedule login immediately before a demo or design a reviewed refresh/session-renewal feature separately.

Deploy backend and both frontends as a coordinated change during a classroom maintenance window. Old Bearer-based clients and old socket message-token clients are intentionally incompatible. Active in-memory rooms do not survive backend deployment. This change is implemented and locally validated; it is not a claim of end-to-end production readiness.

## Rollback

Revert the auth-related backend, main frontend and Admin changes together and redeploy the matching builds/configuration. No schema rollback is needed. Do not decrement persisted session_version: globally revoked sessions must stay revoked. Old versions may accept legacy bearer credentials; review secret rotation/revocation before restoring an older release. Keep the unrelated demo documentation and existing gameplay changes intact.

## References

- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN Set-Cookie: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- OWASP custom-header CSRF defense: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP WebSocket security: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
