# Figure 11. Type Tiles Entity Relationship Diagram

The Entity Relationship Diagram (ERD) presents the current relational database structure of Type Tiles: A Gamified Standalone Typing Application Using Falling Tile Mechanics for Skill Development. The schema comprises eleven (11) application tables that support account management, typing sessions, performance summaries, administrative activity, user feedback, email verification, and password recovery. Primary keys identify individual records, while foreign keys connect related records and enforce referential integrity.

The **USERS** entity stores account credentials and profile information, including usernames, email addresses, password hashes, display names, avatars, backgrounds, and tiers. It also maintains user roles, account restrictions, email verification status, and session versions. The application recognizes Administrator, Teacher, and Student roles; legacy player accounts are treated as Students. Profile information is stored directly in USERS rather than in a separate profile entity.

The **USER_STATS** entity stores cumulative performance indicators, including games played, wins, losses, total score, best words per minute (WPM), average accuracy, and highest combo. Its unique user_id foreign key allows each account to have at most one statistics record. These summary values complement the detailed session records used to review typing progress.

The **MATCHES** entity stores session settings for both solo practice and multiplayer classroom gameplay. Its attributes include mode, difficulty, round duration, word set, practice format, background, status, and creation and ending timestamps. The optional owner_user_id foreign key identifies the account that owns a classroom match. At the application level, classroom hosting is restricted to Teachers. Ownership may be absent for solo sessions and historical matches.

The **MATCH_PARTICIPANTS** entity connects user accounts with matches, allowing one user to participate in multiple matches and one match to contain multiple participants. It stores each participant's score, WPM, accuracy, position, completed words, error rate, ending reason, and remaining lives. Detailed performance history is retrieved by relating these records to USERS and MATCHES, rather than through separate solo gameplay, multiplayer gameplay, and performance history entities.

The **MATCH_RESULTS** entity is defined in the schema to store a user's result and rank change for a match. Each record references one user and one match. However, the current gameplay code does not populate this table; implemented performance history uses MATCH_PARTICIPANTS and MATCHES. Its inclusion in the ERD documents the existing database structure without implying that a separate result-recording workflow is active.

The **ADMIN_LOGS** entity records administrative actions, the Administrator who performed them, an optional target user, supporting details, and the time of the action. Its two foreign keys reference USERS in different capacities: the acting Administrator and the account affected by an operation. The **FEEDBACK** entity stores messages submitted by registered users and links each message to its author.

Account security is supported by **EMAIL_VERIFICATION_CODES** and **PASSWORD_RESET_CODES**. Each entity links verification or recovery records to a user account and stores a code hash, expiration time, attempt count, consumption time, and creation and update timestamps. Their respective supporting entities, **EMAIL_VERIFICATION_RATE_LIMITS** and **PASSWORD_RESET_RATE_LIMITS**, store request counters and time-window information. These rate-limit tables use a text key as their primary key and have no declared foreign-key relationship with USERS.

Together, these eleven entities provide the database foundation for the application's implemented account, gameplay, classroom, reporting, feedback, and administrative functions. The structure distinguishes per-match performance records from cumulative user statistics and includes supporting records for account verification and recovery.

## Figure notes and implementation scope

- Use `type-tiles-erd.svg` for a scalable figure or `type-tiles-erd.png` for insertion into a document. The editable Mermaid source is `type-tiles-erd.mmd`.
- PK means primary key; FK means foreign key; UK means unique constraint. A circle denotes zero, a bar denotes one, and a crow's foot denotes many. The diagram expresses database constraints, so USERS to USER_STATS is zero-or-one even though account creation normally initializes statistics.
- All eleven application tables are shown, including the two independent rate-limit tables. PostgreSQL additionally has a technical table, `typetiles_schema_migrations`, for migration tracking; it is excluded from the application ERD.
- Room codes and live lobby state are managed in memory in `server/src/lan.ts`; they are not persistent columns in MATCHES. There is no separate classroom-membership or teacher-student assignment table.
- There is no direct foreign key from MATCH_RESULTS to MATCH_PARTICIPANTS, and no database uniqueness constraint on the pair `(match_id, user_id)` in either table. The ERD does not invent these constraints.
- The figure uses the PostgreSQL column types from the migrations. SQLite implements the same application entities, with some differences in timestamp and numeric declarations. An epoch-millisecond security timestamp uses BIGINT in PostgreSQL; general record timestamps use TIMESTAMPTZ.
- This documentation reflects repository definitions and code inspected on November 9, 2026; it does not certify the contents or migration status of a deployed database. The eleven-table count replaces the previous six-entity conceptual description. The existing project title is retained; deployment terminology elsewhere in Chapter 3 should be checked against the intended study scope.

## Source files

- `server/src/db.ts`: SQLite schema and additive migrations.
- `supabase/migrations/20261018000100_initial_type_tiles.sql`: PostgreSQL application tables.
- `supabase/migrations/20261108000100_classroom_ownership.sql`: nullable match owner foreign key.
- `server/src/routes/matches.ts`: solo results, performance history, and teacher reporting.
- `server/src/lan.ts`: classroom ownership, in-memory rooms, and participant performance persistence.
- `server/src/auth.ts`: application role normalization.

Regenerate the Mermaid source with `node docs/erd/generate-erd.mjs`. Render with Mermaid CLI using the generated Puppeteer configuration if Chrome is installed at the specified path.
