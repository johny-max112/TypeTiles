# Teacher-specific Student Progress

## API and ownership

- GET /api/teacher/students returns distinct eligible participants with their
  identity, session_count, average_wpm, average_accuracy, best_wpm and latest
  session creation date.
- GET /api/teacher/students/:studentId/history returns that participant's
  qualifying session IDs, creation dates, categories, difficulty, score, WPM,
  accuracy, saved rank, end reason and completion status.
- Both endpoints require the current authenticated, verified Teacher role.
  Every data query filters matches.owner_user_id using req.user.userId.
  Query parameters such as teacherId do not change authorization. Invalid,
  unrelated, nonexistent or non-qualifying student IDs share the same 404.
  Admins receive the existing teacher-only 403; no Admin bypass is added.
- No user_stats aggregate, permanent enrollment, or new student identity is used.
  Responses use Cache-Control: no-store.

## Calculation rules

1. A qualifying classroom has persisted ownership by this teacher and status
   exactly completed. Ordinary Solo matches have NULL ownership and are excluded.
   Ownership, not a frontend category/mode label, defines the classroom scope.
2. Its participant must differ from the owner and have end_reason time or health.
   Active, cancelled, interrupted, NULL-owner, unfinished, and empty sessions do
   not contribute. A teacher's own participant row never contributes.
3. Each match/student pair contributes once. For legacy duplicates, the highest
   participant ID is the canonical stored row, selected before completion checks.
   This is a read-only reporting rule; no duplicate rows are removed or changed.
4. Repeated classrooms are separate samples, regardless of repeated category.
   A finished zero-score/zero-WPM/zero-accuracy sample counts, including its zero
   metrics. Score alone never decides eligibility.
5. Averages are arithmetic means of available persisted metrics, equally weighted
   per qualifying session, not by duration or words. NULL WPM/accuracy are ignored
   independently; legacy negative WPM or accuracy outside 0..100 are also ignored
   in aggregates. No samples for a metric produces NULL, displayed as a dash.
   Session counts still include finished attempts with missing metrics.
6. Best WPM uses the same WPM eligibility. Latest date is MAX(matches.created_at).
   Dates are classroom creation times, not start or individual completion times.
7. History displays saved metrics and saved position without recomputing gameplay
   scores or ranks. A missing rank is a dash. Completion status is Finished for
   qualifying attempts. Existing Results reports continue showing broader session
   participation, so their counts can differ from this finished-attempt view.
8. Current user names are displayed. Past participation remains eligible if a
   student's role later changes. Account deletion and historical retention remain
   unchanged; deleted participation does not remain in this report.

## UI

The existing application shell shows Student Progress after Results for teachers
only. /app/student-progress redirects other roles to /app. Directory summaries
lead to per-student session history. Loading, empty, failure/retry, missing
metrics, zero metrics and stale asynchronous selection responses are handled.
The page uses stacked responsive panels and a horizontally scrollable history
table. Results -> Multiplayer is unchanged. Unused TeacherDashboard is not routed.

## Deployment and rollback

No new schema, environment variables, dependencies or production data edits are
required. Keep Phase 1 ownership and Phase 3B integrity protections. Stage the
backend first, then deploy the new main frontend with its existing API setting.
Schedule backend restarts outside active classrooms because rooms are in memory.
No Admin frontend deployment is required by this feature.

Smoke-test two teachers with a shared student, teacher-owned session reports,
zero results, empty progress and direct student navigation. Confirm actual hosted
latency and narrow-screen layout before production rollout.

Rollback by removing the frontend page/link and reverting only these new progress
API changes. Preserve Phase 3B and earlier protections. No database rollback or
role/history rewriting is needed.

CSV export, pagination, recovery and retention changes are deliberately deferred.
Reports currently load all qualifying records; large histories need future query
plan/index and pagination work. Automated PostgreSQL coverage uses PGlite, not
hosted Supabase performance or multi-process concurrency.

## Executed validation

- Backend `npm test`: 83 passed, 0 failed, including SQLite/PostgreSQL progress
  checks, teacher-only route/navigation, async selection/error states and the
  existing security, registration, capacity and gameplay regression suites.
- Focused `tsx --test tests/teacherProgress.test.ts tests/postgres.test.ts`:
  13 passed, 0 failed. Focused frontend progress tests: 3 passed, 0 failed.
- `node tests/frontend-email-verification.cjs`: passed.
- Root, backend and Admin `npm run build`: passed, including TypeScript checks.
  The root Vite build retains its existing chunk-size warning.
- `git diff --check`: passed. No production operations were performed.
