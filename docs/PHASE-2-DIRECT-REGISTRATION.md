# Direct Student/Teacher registration

## Behavior

The registration form defaults to Student and offers Student/Teacher radio
options with descriptions. Login remains shared. The selected role travels
through the typed frontend auth context and API client to the existing register
endpoint, verification service, and users.role column.

Only exact public role strings `student` and `teacher` are accepted. An omitted
role defaults to student for older deployed clients. Explicit admin/player,
unknown or differently cased strings, whitespace variants, null, arrays,
objects, numbers, booleans and undefined are rejected. Registration inserts
the validated role with email_verified=0 and never updates existing accounts.

Verification updates only the existing verification fields and consumes the
code. It does not change the role or create a login session. Existing expiry,
resend, cooldown, attempt limits and authentication/session checks are reused.

No teacher approval/request workflow is added. Anyone who controls a usable
email can self-register as Teacher; email verification does not establish
employment or school membership. Phase 1 owner/report and host-role checks
remain authoritative. School isolation is not introduced.

## Database and account compatibility

No Phase 2 schema migration, environment changes, dependencies, role backfill,
or account conversion is required. Existing student, teacher, admin and legacy
player records remain unchanged. Duplicate username/email registration fails
without overwriting the old account's role, password or verification state.

## Local validation

The frontend harness checks Student default, both role payloads, absence of an
Admin option, login-only behavior and existing verification navigation/resend.
Its pre-existing missing browser protocol and URL mocks were repaired as part
of extending registration coverage; no runtime endpoint behavior changed.

Shared integration checks run against isolated SQLite and PGlite PostgreSQL:
strict role rejection, legacy omission, persistence, unverified login/socket
denial, verification preserving the account, duplicate rejection, authenticated
teacher hosting, student joining/hosting denial and cross-teacher report denial.
Existing Phase 1 authorization and gameplay suites remain part of npm test.

Executed locally:

- `npm test` in server: 77 passed, 0 failed.
- `node tests/frontend-email-verification.cjs`: passed.
- `npm run build` at root, in server, and in admin: all passed, including
  TypeScript checks. The main frontend retains its existing chunk-size warning.
- `git diff --check`: passed.

No production database or email provider was used by the automated tests.

## Manual staging/deployment checklist (not executed)

1. Verify Phase 1 is present and its PostgreSQL ownership migration is applied
   before starting that backend. Phase 2 does not remove this prerequisite.
2. Run backend tests, the frontend verification harness, TypeScript/builds and
   diff checks. Test the form at desktop and narrow viewport sizes in a browser.
3. Deploy the backend first, keeping existing secrets, database provider and
   origins. Older frontends omit role and continue creating students.
4. Confirm API role behavior in staging, then deploy the new frontend with its
   existing VITE_API_URL. Deploying the frontend first could make Teacher appear
   selectable while an older backend still ignores the choice.
5. Test real email delivery and verification for both account types, login,
   student join, teacher hosting and owner-only reports. Isolated mocked email
   tests do not establish production Resend delivery or hosted concurrency.
6. Schedule the backend restart outside active classrooms: rooms are still
   process-local. No Admin frontend deployment is required by this feature.

## Rollback

Revert the registration UI first, then return the backend to the secured Phase 1
version if needed. Preserve Phase 1 ownership/membership/Admin protections.
Leave the database and newly created accounts intact; rollback does not demote
teachers, reset verification or delete records. No Phase 2 schema rollback is
necessary. Existing verified teachers still retain their authorized features.
