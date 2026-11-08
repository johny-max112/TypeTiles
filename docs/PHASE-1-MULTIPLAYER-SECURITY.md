# Multiplayer authorization security patch

This patch does not enable direct teacher registration. No production migration,
deployment, account-role change, or data backfill is performed by development.

## Ownership and access rules

- Only WebSocket room creation records `matches.owner_user_id`, using the
  authenticated teacher ID. Browser-supplied owner IDs are ignored.
- Teacher report list/detail use that persisted owner, never participation.
- Historical matches keep NULL ownership. Teacher-only report access is denied
  for these records; participant history and participant match details remain.
  Recovering historical ownership requires separately reviewed authoritative
  evidence. Do not infer it from current roles, participant order, or mode.
- REST join is not an admission path. Existing participants retain the existing
  409 response. New membership requests receive 403; the lobby's authenticated
  WebSocket join/reconnect remains the sole classroom admission authority.
- Generic match details require participation or current teacher ownership.
  Unrelated users receive the same 404 as a nonexistent match. No new Admin
  bypass is introduced: teacher reports retain their existing teacher-only
  policy, and existing Admin dashboard endpoints are unchanged.
- Current teacher authorization and room ownership gate start, configuration,
  cancellation, reconnect, and host-triggered result finalization on leaving.
  Commands use the token bound to the socket, not a replacement message token.
- Ordinary role management cannot demote an Admin. Target checking, role update,
  and audit log run in one transaction.

## Migration and deployment (manual, not executed)

1. Back up the target database and verify a restoration procedure. Schedule
   maintenance with no active classrooms. Live rooms are process-local and a
   backend restart does not resume them.
2. For PostgreSQL, review and apply only the new additive migration
   `supabase/migrations/20261108000100_classroom_ownership.sql` using the existing
   trusted database-owner migration process. Do not rerun a database reset.
   It adds a nullable foreign key column and records its version; re-running is
   idempotent. No users, roles, verification flags, or historical results change.
3. New PostgreSQL backend startup requires the new migration version as well
   as the initial version. Apply the migration before updating/restarting it.
   SQLite adds the nullable column through its existing startup migration path.
4. Run the existing `npm run db:check` in the backend's intended PostgreSQL
   environment. Initialization checks both migration versions without writes.
5. Build/deploy the backend using the existing process, restart, and smoke-test
   owner versus outsider reports, participant details, classroom join/start,
   reconnect, Admin role protection, and final result persistence.
6. No environment variable changes, frontend deployment, new dependencies, or
   authentication-secret changes are required for this patch.

## Rollback

Stop new classroom admission if the security behavior is unacceptable. Keep
the database intact; do not automatically restore an older backup, drop the new column,
rewrite roles, or delete results. Old application code can coexist with the
nullable column, but restoring it reintroduces the authorization weaknesses and
new rooms created by it have unknown persisted ownership. Prefer a forward fix;
if emergency code rollback is necessary, restrict public access until secured.

## Limits

This patch cannot validate pre-patch participation rows or recover undocumented
historical owners. Existing participant detail/history access is preserved.
It does not introduce school isolation, public teacher signup, permission
delegation, or an approval system. Account eligibility is checked at command
time; already accepted operations are not undone by later role changes.

Tests use temporary SQLite databases and isolated PGlite PostgreSQL engines.
PGlite validates SQL/API behavior, not hosted Supabase networking, multi-process
production concurrency, or cross-network browser gameplay.

## Validation results

- `npm test` in `server`: 75 passed, 0 failed. Includes both-provider security
  checks, migration preservation/idempotency, real local 50-student-plus-host
  connections, capacity/reconnect/ranking/durable results, auth and gameplay.
- `npm run build` at root, in `server`, and in `admin`: passed (TypeScript is
  part of all three builds). The main Vite build retains its large-chunk warning.
- `git diff --check`: passed.
- `node tests/frontend-email-verification.cjs`: failed before requests because
  its browser mock supplies a hostname but no protocol to the existing endpoint
  resolver. The committed HEAD copy reproduces the same failure and its loaded
  frontend source files are unchanged by this patch. Left unchanged as unrelated
  test-harness maintenance; this is not a claim that every automated test passes.

Ready for isolated staging after applying the ownership migration. Production
rollout still requires the manual migration, maintenance window, and browser
smoke tests above, with acknowledgement of historical report access behavior.
