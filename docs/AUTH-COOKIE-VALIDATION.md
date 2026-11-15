# Authentication refactor validation

Date: 14 November 2026 (Asia/Manila).

| Executed command | Actual result |
|---|---|
| `npm test --prefix server` | Final run: 91 tests passed, 0 failed, 0 skipped/cancelled. Includes existing frontend component harnesses. |
| `npm run build --prefix server` | Passed backend TypeScript compilation. |
| `npm run build --prefix admin` | Passed Admin TypeScript and Vite build. |
| `npm run build` | Passed frontend TypeScript and Vite build; existing large-chunk warning remains. |
| `git diff --check` | Passed; Git emitted informational LF/CRLF conversion warnings. |
| Source scan of `src/`, `admin/src/`, and backend auth paths | No localStorage auth-token access, Bearer-header injection, or PLAYER_TOKEN_KEY remains in application source. |

The final backend test log is `output/auth-cookie-validation.log` (local verification artifact). Initial runs exposed old test expectations for JSON/bearer tokens and legacy JWTs without expiry; fixtures and assertions were updated to the cookie-only contract, and the final suite passed. No Bearer compatibility bypass was added to production code.

Confirmed test coverage:

- Login response has no JWT JSON field; session cookie is HttpOnly, SameSite=Lax, 900-second max age; production options are Secure, host-only and __Host-prefixed.
- Expired/missing-version JWTs, bearer-only requests, duplicate cookie names, inactive/unverified users and persisted-version mismatch are rejected.
- Current role is read from the database rather than trusted from JWT claims.
- Login/logout reject hostile Origin or missing custom CSRF header.
- Logout increments session_version, clears the cookie, rejects both prior browser sessions and evicts a live classroom socket.
- Five concurrent failed attempts are admitted and the sixth is throttled with 429/Retry-After, on SQLite and the PostgreSQL provider through PGlite.
- Fixed-window expiry, successful login reservations, account/IP isolation, shared-school-IP capacity and bounded limiter storage are checked.
- WebSockets use the handshake cookie; a JSON token cannot authenticate an anonymous connection; hostile upgrade origins are rejected.
- Existing capacity test connects 50 simulated Student WebSockets plus a Teacher, rejects student 51, tests reconnects/standings and verifies all final SQLite records survive reopening.
- Existing role/ownership, registration, verification, recovery, result-integrity, classroom formats/reliability, progress queries and frontend endpoint/navigation checks pass with cookie transport. Existing gameplay-format/Gregg content tests also pass.

No live Supabase, Render, DNS, Resend delivery, production migration, real-classroom browser load, or production browser cookie flow was exercised. Database tests use isolated SQLite and the existing embedded PostgreSQL engine adapter, not a remote Supabase connection. New production topology, proxy behavior, actual browser cookie acceptance, Admin and main-frontend interaction, and 15-minute expiry during active classroom use still require release testing. See AUTH-COOKIE-SECURITY.md for configuration and rollback.

No changes to database schema, gameplay, Gregg mappings/images, scoring or classroom capacity were made. No dependencies were installed. No commit, push or deployment was performed.
