# Phase 6D-2: Cloudflare Pages deployment preparation

Prepared November 8, 2026. This guide prepares a temporary `pages.dev` deployment only. Do not connect `playtypetiles.com`, change DNS, or deploy until the owner approves the external actions.

## Readiness verdict

Ready for an owner-approved initial Pages deployment, subject to committing/reviewing Phase 6D-1, building with the production API URL, and authorizing the actual Pages origin in Render. Public registration is not accepted as complete until verification email delivery is demonstrated.

The root application is the student/teacher frontend. `admin/` is a separate app; `server/` is the existing Render backend. Neither is the Pages project root. Frontend shared imports reference files under `server/src`, so retain the repository structure.

Inspected: root `package.json` / lockfile / Vite configuration, `src/main.tsx`, `src/App.tsx`, `src/lib/endpoints.ts`, `src/lib/playerApi.ts`, Lobby and Game connection/navigation, public assets, Gregg/image loading and production guards, and `server/src/index.ts` CORS configuration. No application code or hosting configuration file needed changing for this phase.

## Git state and review gate

At inspection the current branch was `main`, latest commit `eecad94` (`teacherUI_GameFormat`). Phase 6D-1 was still local: modified `src/lib/playerApi.ts`, `src/pages/Game.tsx`, `src/pages/Lobby.tsx`; new endpoint utility, two test files, and its documentation. This phase adds only this deployment guide. A Git-based build does not include uncommitted or unpushed files.

The following commands are instructions for the owner; the agent has not executed staging, commit, or push:

```powershell
git branch --show-current
git status --short
git diff -- src/lib/playerApi.ts src/pages/Game.tsx src/pages/Lobby.tsx
```

Review the new files as well, because unstaged `git diff` does not display untracked file contents. Then stage only the reviewed scope:

```powershell
git add src/lib/endpoints.ts src/lib/playerApi.ts src/pages/Lobby.tsx src/pages/Game.tsx server/tests/endpoints.test.ts server/tests/classroomConnectivity.test.ts docs/PHASE-6D-1-CONNECTIVITY.md docs/PHASE-6D-2-CLOUDFLARE-PAGES.md
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Check that no unrelated staged changes, environment files, credentials, local databases, or generated `dist` files are included. After approval, if deploying the inspected `main` branch:

```powershell
git commit -m "Prepare secure classroom connectivity and Pages deployment"
git push origin main
```

If using a different approved branch, substitute that branch in both Git push and the Pages production-branch selection. Pushing a connected branch may also trigger an existing Render auto-deploy; wait for it to become healthy before browser tests. Do not force-push or discard changes to resolve a rejected push.

## Exact Pages project settings

| Setting | Value |
| --- | --- |
| Service type | Cloudflare **Pages**, Git-connected static project |
| Repository | The existing TypeTiles GitHub repository |
| Production branch | Approved pushed branch (`main` was inspected) |
| Framework preset | React (Vite); if unavailable, None with the explicit settings below |
| Root directory | Repository root (leave optional subdirectory blank) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Build system | Current v3 build image |
| Node override | `NODE_VERSION=22.23.4` (current documented v3 default; satisfies Vite's Node requirement) |
| Required application variable | `VITE_API_URL=https://typetiles.onrender.com/api` |

Local validation used Node `22.19.0`; installed Vite requires `^20.19.0 || >=22.12.0`. The suggested Pages Node version is compatible but its remote build has not been run. The root lockfile matches the package manifest.

Pages normally installs dependencies automatically. Use `npm ci` for a clean local/CI installation, or as the install command if a separate install-command field is available. Do not assume the dashboard has that field. If explicitly requiring `npm ci` on Pages, its documented custom-install alternative is `SKIP_DEPENDENCY_INSTALL=true` plus build command `npm ci && npm run build`; use this alternative consistently rather than running two installers. The primary configuration above retains `npm run build` and automatic installation.

Do not set `NODE_ENV=production` for dependency installation if that causes devDependencies to be omitted: TypeScript and Vite are needed to build. `vite build` already generates a production bundle. No start command, Express deployment, Worker entry point or Wrangler configuration is needed for this static Pages project.

References:

- [Cloudflare React/Vite build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image, Node override and custom installation](https://developers.cloudflare.com/pages/configuration/build-image/)

## Environment and endpoint behavior

Set the variable in the Pages project's **Production** build environment, not just local `.env.local` or Render's backend environment:

```dotenv
VITE_API_URL=https://typetiles.onrender.com/api
```

The shared resolver produces:

```text
REST       https://typetiles.onrender.com/api
WebSocket  wss://typetiles.onrender.com/ws
```

No additional socket variable is needed. Any change to `VITE_API_URL` needs a new frontend build/deployment. Preview deployments have separate environment settings and origins; configure those separately only when testing them.

Never place `DATABASE_URL`, database passwords, Resend API keys, JWT secrets, reset secrets or verification secrets in Pages frontend variables or public assets. `NODE_VERSION` is a build-tool setting, not an application secret.

The production resolver uses the configured Render URL. LAN fallback code remains deliberately available in the shared source for local HTTP operation, but is not the selected production backend. HTTPS without a configured API fails with a clear error instead of attempting an insecure local API/socket.

## SPA routing and assets

The app uses `BrowserRouter`. Cloudflare Pages provides SPA fallback automatically when the deployed root has no `404.html`. This repository/build has no such file, so no `_redirects` file is needed. Keep actual files served normally and do not add a top-level `404.html` without revisiting routing.

Expected direct URLs include `/login`, `/register`, `/verify-email`, `/forgot-password`, `/app`, `/app/lobby`, and `/app/history`. Protected routes may legitimately send an unauthenticated visitor to login; they must not show a Cloudflare 404. `/app/game` depends on route state: directly opening a fresh tab without state uses the existing fallback configuration rather than restoring an in-progress classroom. Test classroom refresh/resumption from `/app/lobby`; a static route returning HTML does not prove match restoration.

Vite emits imported Phaser/Gregg/background/avatar images into `dist/assets`. Files in `public/figma/type-tiles-home` are copied to `/figma/type-tiles-home`. The provider subdomain hosts the application at `/`, matching the current root-relative asset paths. The production crop/editor guards remain unchanged: pending Gregg crops are not activated in production, original full-sentence images remain available, and gameplay captions stay hidden.

Local artifact checks found all 24 public assets copied unchanged, no case mismatches in inspected image imports, the Render API literal present, no literal localhost/127.0.0.1 port-3001 API endpoint, and no development crop-editor route in the production JavaScript. This is static/local evidence, not a deployed browser certificate.

Reference: [Cloudflare Pages SPA serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## Local validation results

Performed November 8, 2026, without changing environment files:

| Check | Result |
| --- | --- |
| Production build with process-only `VITE_API_URL=https://typetiles.onrender.com/api` | Passed (`tsc && vite build`) |
| Backend TypeScript, no emit | Passed |
| Full automated suite | 72 passed, zero failed |
| Endpoint/navigation/reconnect coverage | Eight endpoint/component tests passed within the full suite |
| Existing capacity/results | 50 student WebSockets plus teacher, 51st rejection, reconnects and SQLite reopen persistence passed |
| Existing Solo/Gregg/format/auth/PostgreSQL-engine regressions | Passed; PostgreSQL-engine tests use PGlite, not production Supabase |
| Local production preview fallback | Nine routes returned the built app shell: `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/app`, `/app/lobby`, `/app/game`, `/app/history` |
| Local preview asset requests | 30 returned non-HTML assets: 24 public files plus five Gregg PNGs and the Phaser waterdrop sprite |
| Public files copied unchanged | 24 of 24 |
| Inspected image import filename casing / tracked case collisions | No errors found |
| Compiled API / dev-route inspection | Render API present; no literal localhost/127.0.0.1 API endpoint or development crop-editor route |
| Git whitespace check | Passed |

The local preview server was closed after checks. No Cloudflare deployment, real frontend-origin CORS test, authenticated remote classroom test or email delivery test was performed. Vite's existing large-chunk warning remains; no asset compression or gameplay changes were made.

## Manual Cloudflare deployment

After the approved commit/push:

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/), using the account intended to own the Pages project.
2. Go to **Workers & Pages** (possibly under **Compute**).
3. Choose **Create application**, then the **Pages** / **Import an existing Git repository** path. Do not create a Worker application by mistake.
4. Connect GitHub if needed; authorize access to the TypeTiles repository.
5. Select the repository and approved production branch.
6. Enter a desired project name. Availability and the resulting URL are not assumed.
7. Apply the build settings above: repository root, React (Vite), `npm run build`, `dist`.
8. Before starting the build, set Production `VITE_API_URL` and the Node override. If the interface requires saving the project first, set the variables immediately afterward and start a new deployment with them.
9. Review the configuration and, only after owner approval, choose **Save and Deploy**.
10. Inspect logs for dependency installation, Node version, TypeScript, Vite build, `dist` upload, and successful deployment.
11. Record the actual stable production address assigned by Cloudflare, in the form `https://<assigned-project>.pages.dev`. Do not use an example name from this guide as though it is already assigned. A commit-preview URL is a different origin.
12. Do not open Custom Domains, change nameservers/DNS, or connect `playtypetiles.com` in this phase. Existing Resend DNS records remain untouched.

Cloudflare's guide: [Deploy React on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).

## Render CORS after the URL is known

The backend already supports exact origins from `CLIENT_URL` and comma-separated `CLIENT_ORIGINS`. No backend code change is required just to add the temporary Pages origin. Do not use `*` or a wildcard `*.pages.dev` value: the current code compares exact strings.

The exact value cannot be finalized before Pages assigns the URL. Once recorded, use its scheme and hostname only, without a trailing slash, `/api`, path or query:

```text
https://<actual-assigned-project>.pages.dev
```

Owner action, after approval:

1. Open Render > the existing TypeTiles backend > **Environment**.
2. Either set `CLIENT_URL` to that exact origin, or append it to the existing comma-separated `CLIENT_ORIGINS` while preserving other authorized origins.
3. Save and allow Render to redeploy/restart. Do not change database/provider, authentication or Resend settings.
4. Wait for **Live** and check `https://typetiles.onrender.com/health`.
5. Retry browser API requests from the actual Pages origin. In Network, confirm requests go to Render and the preflight/API response authorizes that exact origin.

Example only (replace the placeholder, do not copy it literally):

```dotenv
CLIENT_URL=https://<actual-assigned-project>.pages.dev
```

Cross-origin login/registration can fail with a browser fetch/CORS error until this is configured even when the static site and `/health` load. A successful WSS handshake does not prove REST CORS is correct. The existing WebSocket server authenticates its messages; this phase does not change authentication or upgrade-origin policy.

## Initial deployed browser smoke-test checklist

All items below remain pending until deployment and manual testing. Use separate student/teacher accounts and a second device or browser profile where appropriate.

- [ ] Stable `pages.dev` address loads over HTTPS with no certificate warning.
- [ ] `/login`, `/register`, `/verify-email`, `/forgot-password` open directly and survive refresh without a Cloudflare 404.
- [ ] Render health endpoint works; Network shows API calls to `https://typetiles.onrender.com/api`, not localhost, port 3001, or the Pages hostname.
- [ ] CORS preflight and API responses authorize the actual Pages origin.
- [ ] Invalid login errors render normally rather than as an unhandled crash.
- [ ] A verified student can log in; dashboard and protected-route refresh work.
- [ ] Registration creates a pending account. Confirm actual delivery to a different user's inbox/spam folder and Resend email logs, enter the code, then log in. Do not declare public registration complete based only on a 201 response or a verified sending domain.
- [ ] Solo Word / Phrase and Full Sentence can start, accept typing and save results/history.
- [ ] Production Gregg Full Sentence shows original images with captions hidden; pending crop preview/editor routes are unavailable.
- [ ] Category images, gameplay sprite/backgrounds and Gregg textures return actual image content without 404s, case errors or HTML fallback responses.
- [ ] Teacher can create a classroom, select category/format/difficulty, see participant counts and start controls.
- [ ] Student joins by room code; Network > WS shows `wss://typetiles.onrender.com/ws` and a successful upgrade, with no mixed-content error.
- [ ] Both users receive the same teacher configuration/content; live ranks and leaderboard update.
- [ ] After a brief connection interruption, rejoin retains the correct endpoint; scores and final results/history remain correct.
- [ ] Check dashboard/classroom refresh from their normal entry points. Separately record any route-state/gameplay-resumption limitations.

## Remaining gates before Phase 6D-3

- Owner approval, reviewed commit/push, and successful actual Pages build.
- Assigned stable `pages.dev` URL recorded and authorized in Render.
- Browser smoke tests completed, including secure classroom connection and results.
- Real Resend delivery/verification confirmed. Sending quotas and shared classroom registration rate limits still apply.
- Assess existing performance warnings: approximately 1.54 MB uncompressed JavaScript and several multi-megabyte avatar PNGs. Optimization is outside this phase.
- Document existing operational limits: 50 students plus one teacher per room, backend-process-local active rooms, restart interruption, and no proven global simultaneous-player capacity. Local capacity tests do not certify the deployed Render plan.
- Custom domain and DNS changes remain explicitly deferred.
