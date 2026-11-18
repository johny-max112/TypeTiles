# Admin dashboard metrics

This update changes reporting only. It adds no schema, migrations, heartbeat, or gameplay writes.

## Definitions

- **Total Users:** all currently stored users, including administrators, teachers, unverified accounts and banned accounts. Permanently deleted users are absent.
- **Total Matches:** all currently stored match rows, regardless of mode or status.
- **Completed / Cancelled:** rows with those exact persisted statuses. These are database status counts, not reconstructed gameplay outcomes. Legacy Solo matches may retain active status even after results were submitted.
- **Players in matches (24h):** distinct existing non-banned users with participation in a match created within the rolling 24 hours ending at the response generation time. Repeated participation counts once. Includes Solo and classroom participation, regardless of match status or current role. It does not mean online, logged in, recently joined, or recently finished. A participant joining a classroom created more than 24 hours ago is outside this metric.
- **Solo leaderboard:** top ten non-banned users with games_played greater than zero in user_stats, ordered by total_score descending, then user ID. The existing Solo submission flow updates this aggregate; classroom finalization does not. Existing aggregate values are not rebuilt by this update.
- **Average accuracy:** the stored user_stats.avg_accuracy already uses a 0–100 percentage scale. Render one decimal without multiplying by 100. Missing/out-of-range values display a dash rather than a fabricated correction.
- **Best WPM:** stored maximum, displayed to one decimal. Missing/negative/non-finite values display a dash.
- **Games:** persisted user_stats.games_played, now returned by the dashboard endpoint.

## Refresh and access

The page fetches on mount and through its Refresh button. Last updated uses the backend response timestamp, displayed in the viewer's local timezone. A failed refresh retains prior data with an error notice and its prior timestamp. There is no automatic polling. The endpoint remains behind current-session authentication and Admin authorization.

## Validation and rollout

Shared dashboard integration checks run against isolated SQLite and PGlite PostgreSQL fixtures. They test unauthorized access, distinct recent participants, old active rows, banned-user exclusion, match status counts, and leaderboard fields. PGlite is not a live Supabase test.

Deploy the backend first, then build/deploy the Admin frontend. No game frontend deployment, new environment variables, or production migration is required. Verify the dashboard with an existing Admin account, inspect refresh and the displayed timestamp, and compare with read-only database queries if production reconciliation is needed. Roll back the backend/Admin versions together if necessary; this update makes no data changes to reverse.

Remaining limitations: no online-presence measurement, no repair of historical statuses or aggregates, no new Solo submission idempotency policy, and no reconstruction of potentially duplicated historical aggregate updates.
