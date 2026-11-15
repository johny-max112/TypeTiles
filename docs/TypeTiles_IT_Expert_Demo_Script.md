# TYPE TILES
## Natural Taglish IT Expert Demo Script

Prepared 14 November 2026 (Asia/Manila). Updated against the inspected local repository.

Read only the Speaker paragraphs aloud. Demo cues are silent coordination notes; technical backups are for questions. Confirm the deployed build matches before presenting. No application code was changed for this document.

## Opening and public website

### 01. Opening introduction

**Speaker:** Good day po. Today, ipapakita namin ang Type Tiles: A Gamified Standalone Typing Application Using Falling Tile Mechanics for Skill Development. Sa current implementation namin, browser-based ang system at accessible through our public website. Ginawa itong falling-tile typing game para maging mas interactive ang practice. May three user roles kami: Student, Teacher, and Admin. Ipapakita namin ang flow mula registration hanggang gameplay, classroom monitoring, at system management.

**Silent demo cue:** Show the public website. Do not read the cue or technical backup aloud.

**Technical backup (only if asked):** Academic title retains Standalone. The current repository does not establish a packaged desktop installer or complete offline PWA. Do not describe the hosted browser build as a native desktop app.

### 02. Website and development team

**Speaker:** Ito ang public website namin, playtypetiles.com. Mula rito, puwedeng pumunta sa registration o login. May public About page din para makilala ang Wanderpets, ang five-member Information Technology team behind the project. Ang protected features ay accessible after authentication.

**Silent demo cue:** Show Welcome. Briefly point to Meet the development team; return to authentication.

**Technical backup (only if asked):** React and TypeScript provide the application interface. React Router selects app screens. The public /about/ page is static HTML and can be opened without login.

## Registration, verification, and login

### 03. Student and Teacher signup

**Speaker:** Sa registration, puwedeng pumili bilang Student o Teacher. Vina-validate ng backend ang registration details at selected role, at chine-check ang duplicate accounts. Hindi available ang Admin sa public signup. Pag successful, unverified account muna ang nalilikha; wala pang login session.

**Silent demo cue:** Show Student/Teacher selection. Use a prepared test account if registration must be demonstrated.

**Technical backup (only if asked):** Explicit public roles must be student or teacher; omitted role defaults to student for older clients. Existing accounts cannot gain a new role by registering again. Passwords are stored as bcrypt hashes.

### 04. Email verification and login

**Speaker:** Magpapadala ang system ng six-digit verification code sa registered email. Kailangan munang ma-verify ang email bago makapag-login. Pag verified na, username at password ang ginagamit sa login. Email ownership ang kino-confirm nito; hindi pa ito school approval o professional verification ng Teacher identity.

**Silent demo cue:** Show verification, then log in with a prepared verified Student account. Hide codes and passwords.

**Technical backup (only if asked):** Resend delivers the email. Codes are protected with keyed hashing, expire, and have attempt/request controls. The backend checks password, verification and account status before issuing a JWT.

## Session security and the Student dashboard

### 05. Authentication, password recovery, and logout

**Speaker:** Kapag logged in, ginagamit ang signed token para sa protected requests. Chine-check din ng backend ang current account status at permissions. Kapag nakalimutan ang password, may recovery-code flow para makapag-set ng bagong password. Ang password reset ay nag-iinvalidate ng older login tokens. Ang Logout naman ay nagki-clear ng saved local session sa browser.

**Silent demo cue:** Point out Forgot Password without resetting the live demo account. Return to the active session.

**Technical backup (only if asked):** JWT is stored in localStorage. Backend checks session_version, current role and account status. Logout alone is not global token revocation. Login rate limiting was discussed but is not implemented in the inspected login handler.

### 06. Student dashboard

**Speaker:** Ito ang Student dashboard. Dito nagsisimula ang access sa typing practice at personal performance information. Ang account-linked statistics ay galing sa backend. Mula rito, makakapunta rin sa Multiplayer, Results, at Profile gamit ang navigation.

**Silent demo cue:** Show the actual account statistics, then open the Play flow.

**Technical backup (only if asked):** Distinguish backend-backed personal statistics from illustrative dashboard elements. Do not describe daily directives or static examples as a live task engine.

## Solo configuration and gameplay

### 07. Category, format, difficulty, and countdown

**Speaker:** Bago maglaro, pipili ang Student ng category, supported gameplay format, difficulty, at round duration. May Word/Phrase at Full Sentence formats, depende sa available content. Kapag nagsimula, gagawa muna ang backend ng Solo match record. Susunod ang three-second countdown bago mag-start ang game.

**Silent demo cue:** Show the available selections. Start a short regular typing round.

**Technical backup (only if asked):** PreMatch creates the match before navigating to Game. React handles the menus and lifecycle; Phaser 3 handles the real-time scene. Gregg Word/Phrase has separate production restrictions.

### 08. Falling targets and scoring

**Speaker:** Habang bumabagsak ang targets, kailangang i-type ang matching word, phrase, o sentence bago ito umabot sa bottom. Bawat completed target ay plus ten points. Ang wrong key ay minus two points. Ang missed target ay minus five points at bawas isang life. Nagtatapos ang round kapag naubos ang oras o lives.

**Silent demo cue:** Complete a target, make one wrong key, and demonstrate a miss if time allows.

**Technical backup (only if asked):** Current GameScene scoring is +10 completion, -2 wrong key, -5 miss; missed tiles reduce lives. Correct completion is per target, not per individual word inside a sentence.

## Performance, results, and saved records

### 09. WPM, accuracy, and feedback

**Speaker:** Makikita sa HUD ang score, lives, remaining time, WPM, at accuracy. Ang WPM ay characters ng completed targets, divided by five, then divided by elapsed minutes. Ang accuracy naman ay correct keystrokes divided by total correct and incorrect keystrokes, multiplied by one hundred. May visual feedback din habang nagta-type at nagko-complete ng targets.

**Silent demo cue:** Point to the live HUD. Demonstrate pause/resume only if useful in Solo.

**Technical backup (only if asked):** Gameplay metrics originate in the client. Do not claim the server reconstructs every keystroke. A local pause does not imply that a classroom server deadline pauses.

### 10. Results, history, and leaderboard

**Speaker:** After the round, makikita ang final score, WPM, accuracy, at available match details. Ipinapadala ang Solo result sa backend at naka-associate ito sa user at match. Sa Results at personal match records, puwedeng balikan ang saved performance. May global leaderboard din na gumagamit ng recorded personal aggregate statistics para sa ranking.

**Silent demo cue:** Show a successful saved result and the available history/leaderboard navigation. Use existing records as backup.

**Technical backup (only if asked):** Confirm save success before claiming persistence. Solo REST submission and classroom finalization are separate paths. Classroom scores do not automatically increase global personal aggregates. History exists as a route; use the navigation actually visible in the deployed build.

## Gregg stenography and Word Bank

### 11. Gregg Full Sentence gameplay

**Speaker:** Aside from regular typing content, may Gregg stenography exercises ang Type Tiles. Sa Full Sentence mode, shorthand image ang visual prompt at ita-type ng player ang corresponding English answer. Nakatago ang English caption sa gameplay para hindi direktang ipinapakita ang sagot. Preserved pa rin ang underlying answer para sa validation at performance calculations.

**Silent demo cue:** Show a production-supported Gregg Full Sentence exercise. Do not open the development crop editor.

**Technical backup (only if asked):** The master images are repository assets. This is predefined-answer validation, not OCR or automatic shorthand translation. Cropped Word/Phrase content remains a restricted development pilot; Exercise 7 has a known expected-count mismatch.

### 12. Word Bank

**Speaker:** Sa Word Bank, puwedeng i-review ng Student ang available learning content, categories, at exercises. Reference area ito bago o pagkatapos ng practice. Ang English reference sa Word Bank ay hiwalay sa hidden captions during actual Gregg gameplay.

**Silent demo cue:** Open Word Bank through the available Student screen and show the actual references.

**Technical backup (only if asked):** The Word Bank route is Student-restricted. Do not promise teacher-created content publishing or automatic Gregg interpretation.

## Profile and customization

### 13. Avatar, display name, and background

**Speaker:** Sa Profile, puwedeng baguhin ang display name, pumili ng available avatar, o mag-upload ng sariling profile photo. May background choices din. Kapag pinindot ang Save, sine-save ang supported changes sa account. Ginagamit din ang selected background sa gameplay para consistent ang personalized experience.

**Silent demo cue:** Open Profile. Change one avatar or background, save, and confirm success. A profile photo upload is optional.

**Technical backup (only if asked):** Profile navigation opens Customize.tsx; these are one screen, not two independent features. The frontend allows image selection under 1.5 MB, and the backend validates supported avatar/background values and profile fields.

### 14. Accessing Settings

**Speaker:** Mula sa Profile, may Settings button para sa account-related controls. Sa Account Settings, puwedeng i-update ang display name. Makikita rin ang username at role bilang read-only details, kaya hindi puwedeng baguhin ng ordinary user ang sariling permissions mula rito.

**Silent demo cue:** Open Settings from Profile, then Account Settings. Show the read-only username and role.

**Technical backup (only if asked):** Changing the profile display name does not change the login username or assigned role. Updates use the authenticated profile API.

## Settings, support, and feedback

### 15. Notifications, Help, and About

**Speaker:** Kasama sa Settings ang Notifications, Help and Support, at About Type Tiles. Ang Notifications page ay nagpapaliwanag na in-app system at match messages ang kasalukuyang gamit; wala pang email, push, o SMS preference controls. Sa Help, may guidance sa gameplay at classroom flow. Sa About naman makikita ang project information at Wanderpets development team.

**Silent demo cue:** Briefly show Notifications, Help, and About. Do not present informational pages as extra automated services.

**Technical backup (only if asked):** Notifications currently is an informational screen. About includes a link to the public team page. Email verification/recovery is separate from notification preferences.

### 16. Feedback and secondary interfaces

**Speaker:** Sa Feedback, puwedeng magsumite ang authenticated user ng comments o suggestions. Vina-validate at sine-save ito sa backend. May Friends at Achievements interfaces din sa code, pero static examples pa ang current data. Hindi pa namin ipinapresent ang mga iyon bilang complete social network o automated badge system.

**Silent demo cue:** Show Feedback. Submit only a clearly labelled test message if needed. Friends/Achievements may be skipped in the main demo.

**Technical backup (only if asked):** Feedback has a database-backed authenticated endpoint. Static Friends and Achievements pages should not take time away from working core features.

## Teacher classroom creation and joining

### 17. Teacher role and room configuration

**Speaker:** Punta naman tayo sa Teacher account. Shared ang main application, pero may additional classroom at Student Progress features. Sa classroom creation, Teacher ang pumipili ng category, Word/Phrase o Full Sentence format, difficulty, at available settings. Server ang nagva-validate at nagbibigay ng room code. Supported ang hanggang fifty students plus one Teacher host.

**Silent demo cue:** Use a separate prepared Teacher browser profile/device. Create a room and show configuration, code, count, and participant list.

**Technical backup (only if asked):** Teacher hosting requires current backend permissions. Students cannot independently override room configuration. Gregg production restrictions still apply. The 50-student limit is capacity, not proof of a 50-device live load test today.

### 18. Student join, readiness, and start

**Speaker:** Sa Student account, ilalagay ang room code para sumali. Makikita ng Teacher ang joined participants at ready status bago mag-start. Kapag nag-start, pare-parehong validated configuration at target sequence ang matatanggap ng students. Teacher ang may authority para sa classroom controls.

**Silent demo cue:** Join from another authenticated Student browser/device, become Ready, and start from Teacher.

**Technical backup (only if asked):** Room codes identify sessions but do not replace authentication. Duplicate/reconnect logic and server-side capacity checks are part of the existing room flow. Do not promise exact gameplay recovery after refresh or backend restart.

## Live standings and classroom records

### 19. Real-time monitoring and finalization

**Speaker:** Habang naglalaro ang students, makikita ng Teacher ang live standings. Ang server ang nag-oorder ng received scores at performance metrics, kaya hindi kailangan i-refresh ang page. Sa Student side, may personal rank information. Pag natapos ang classroom match, sine-save ang final results at rankings through a database transaction.

**Silent demo cue:** Keep Teacher in the monitoring lobby while Student plays. Show final results after the match.

**Technical backup (only if asked):** WebSocket provides two-way live events. Client-reported metrics are not full anti-cheat verification. Atomic finalization helps avoid partial writes. Live rooms are process memory; persisted results and live room survival are different concerns.

### 20. Results: session-first reporting

**Speaker:** Sa Results, then Multiplayer, pipili muna ang Teacher ng classroom session. Makikita rito ang participants at recorded score, WPM, accuracy, ranking, at available status details. Session-first ang view: isang activity, tapos performance ng participants. Naka-filter ang access sa owned classroom records ng logged-in Teacher.

**Silent demo cue:** Open an owned session with prepared results. Explain its displayed status before interpreting metrics.

**Technical backup (only if asked):** Teacher history is not restricted only to completed sessions: cancelled/interrupted records and some sessions with recorded metrics can appear. Ownership is enforced with matches.owner_user_id.

## Teacher-specific Student Progress

### 21. Student directory and performance summaries

**Speaker:** Sa Student Progress, student naman ang unang pinipili. May directory ng students na may qualifying participation sa classrooms ng logged-in Teacher. Makikita ang session count, average WPM, average accuracy, best WPM, at latest qualifying session date. Useful ito para ma-review ang performance across multiple activities.

**Silent demo cue:** Show a prepared student with at least two qualifying completed sessions, if available.

**Technical backup (only if asked):** Aggregates use persisted classroom participant metrics, not global user_stats. Completed teacher-owned sessions and finished time/health attempts qualify. Repeated sessions count separately; latest attempt per student/match is selected. Missing metrics are ignored in their averages; valid zero values count.

### 22. Individual history and ownership

**Speaker:** Kapag pumili ng student, makikita ang session history niya, including session date, category, difficulty, score, WPM, accuracy, rank, at completion information. Ang isang student ay puwedeng sumali sa classrooms ng iba-ibang Teacher, pero bawat Teacher ay sariling authorized records lang ang makikita. Hindi ito permanent enrollment list; based ito sa actual classroom participation.

**Silent demo cue:** Open the student history and compare it with the session-first Results view.

**Technical backup (only if asked):** The backend derives Teacher identity from authentication and filters by persisted owner_user_id. Solo sessions and NULL-owner records do not enter teacher progress. Another Teacher cannot obtain private history by changing a student ID.

## Admin management

### 23. Authorized Admin application

**Speaker:** Sa Admin side, separate application ang interface pero shared ang backend identity at API. Hindi available ang Admin role sa public registration. Ang authorized Admin ay may system-level dashboard at user management controls, habang ang Student at Teacher ay restricted sa kani-kanilang allowed actions.

**Silent demo cue:** Open the prepared authorized Admin app/session. Never display passwords or environment settings.

**Technical backup (only if asked):** Admin routes require backend authentication and Admin authorization. A hidden frontend button is not the security boundary.

### 24. User actions, deletion, and audit logs

**Speaker:** Puwedeng mag-search ng users, mag-ban o unban ng eligible accounts, mag-change ng allowed Student/Teacher roles, mag-update ng tiers, at mag-reset ng personal statistics. May permanent account deletion at audit logs din. Hindi kami magde-delete ng actual user sa demo dahil may epekto ito sa related records.

**Silent demo cue:** Show controls and existing audit logs. Do not confirm destructive actions.

**Technical backup (only if asked):** Deletion is transactional and protects Admin accounts. Related user records can be removed; ownership references are cleared by the deletion flow. Logs record implemented administrative actions, not every user keystroke or all site activity.

## Architecture, limitations, and closing

### 25. Technical architecture

**Speaker:** React at TypeScript ang gamit sa interface, at Phaser 3 para sa real-time gameplay. Node.js with Express ang backend. REST API ang ginagamit sa authentication, reports, at Solo result submission. WebSocket naman para sa live classroom events. Hosted ang frontend sa Cloudflare Workers, backend sa Render, at online PostgreSQL database sa Supabase. Sa local setup, puwedeng gumamit ng SQLite bilang alternative provider.

**Silent demo cue:** Show an architecture slide, or explain while the final screen remains visible.

**Technical backup (only if asked):** SQLite and PostgreSQL do not automatically synchronize. Online email delivery still needs connectivity and a configured sender. HTTPS hosting uses secure WSS for online classroom connections.

### 26. Security, honest limitations, and closing

**Speaker:** May hashed passwords, verified-email login, signed-token authentication, role checks, at Teacher ownership protection ang system. May limitations pa rin: self-declared ang Teacher role, client-reported ang gameplay metrics, at hindi durable ang live classroom room state after a backend restart. Static pa ang ilang secondary screens. That concludes our Type Tiles demonstration. We welcome your technical feedback and recommendations para mas mapabuti pa ang system. Thank you po.

**Silent demo cue:** Pause for questions. Use the technical backups only when asked.

**Technical backup (only if asked):** Do not claim cheat-proof gameplay, full offline capability, automatic database sync, deployed login throttling, or guaranteed restart recovery. This document reviews source behavior; it does not certify the live deployment or claim newly executed gameplay tests.

## Before the meeting

- Prepare verified Student, Teacher, and authorized Admin accounts. Keep credentials private.
- Use separate browser profiles/devices for Teacher and Student; ordinary tabs can share localStorage and overwrite the session.
- Check public website, backend response, email delivery if demonstrated, and WSS classroom connectivity before the meeting.
- Prepare a short Solo round, a supported Gregg Full Sentence exercise, and existing completed classroom results.
- Prepare at least two qualifying completed classroom sessions for one student to make Student Progress meaningful.
- Rehearse avatar/background Save and confirm the expected UI result. Do not upload personal/private material.
- Keep Teacher in the live monitoring lobby; let Student play in a separate session.
- Do not refresh an active match to demonstrate recovery. Do not reset statistics, delete users, or change production configuration.
- For a shorter meeting, prioritize authentication, Solo gameplay, Profile/Settings, classroom, Results vs Student Progress, and Admin.
- If the demo fails, describe what failed honestly and use prepared records/screenshots. Do not claim a successful save without confirmation.

## Important source references

- **Authentication and verification:** src/components/PlayerAuth.tsx; src/lib/PlayerAuthContext.tsx; server/src/routes/auth.ts; server/src/emailVerification.ts; server/src/passwordReset.ts; server/src/middleware.ts
- **Menus and gameplay:** src/App.tsx; src/components/AppShell.tsx; src/pages/PreMatch.tsx; src/pages/Game.tsx; src/scenes/GameScene.ts
- **Profile and settings:** src/pages/Customize.tsx; src/pages/Settings.tsx; src/lib/profileAssets.ts
- **Classroom and reports:** src/pages/Lobby.tsx; src/pages/Results.tsx; src/pages/StudentProgress.tsx; server/src/lan.ts; server/src/classroomPersistence.ts; server/src/routes/matches.ts
- **Gregg, Admin and deployment:** src/data/stenoExercises.ts; src/lib/greggGameplay.ts; server/src/routes/admin.ts; server/src/db.ts; wrangler.jsonc

Validation scope: source review and document checks only. No live account actions or new application test runs were performed for this script.
