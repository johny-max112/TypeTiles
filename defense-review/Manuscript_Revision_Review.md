# Type Tiles manuscript revision review

Review date: 13 November 2026, Asia/Manila.

## Author's revision preferences — confirmed 13 November 2026

- Preserve Times New Roman for the manuscript body, as confirmed by the author. Preserve existing font sizes, paragraph indentation, justification, spacing, margins, headers, borders and page-number placement from the editable manuscript; the screenshot alone does not establish all document-wide settings.
- Preserve the existing formal academic English voice, chapter/section order, heading wording and paragraph structure wherever possible. Use targeted factual corrections instead of rewriting otherwise suitable prose in a different style.
- Keep unchanged introductory and literature passages when they remain accurate. Revise claims tied to the old desktop/offline implementation wherever they recur, rather than correcting only the architecture section.
- Present revision notes by section and original PDF page, with the original passage, proposed replacement and a short reason/source reference. Separate prose corrections, diagram updates and matters requiring research/adviser confirmation.
- Update the database/ERD, system architecture, affected DFD processes/stores and related flowcharts/use cases together with their explanatory paragraphs. Preserve caption style; resolve duplicate numbering consistently once the school's numbering convention is confirmed.
- For DFDs, distinguish conceptual stores from physical database tables. Map existing stores to the actual implementation instead of automatically treating every conceptual store as a separate SQL table. Preserve the manuscript's chosen DFD notation and level convention after inspecting the original diagram.
- Do not invent measured results, participant counts, administered questionnaire scales, automatic adaptation, desktop packaging or other unimplemented functionality. Preserve the approved academic title until a title change is confirmed separately.
- The Google Docs screenshot supplies visual context. Editing the live Google Doc is a separate action and has not been performed in this review.

### Recommended revision-note format

| Section / page | Existing wording or diagram element | Proposed wording or diagram adjustment | Reason / code evidence |
|---|---|---|---|
| Architecture / PDF p. 33 | Database layer uses MySQL | The database layer uses PostgreSQL for the hosted implementation and SQLite for the local implementation to store user accounts, match records, and typing performance data. | `server/src/db.ts`: provider selection; actual schema and migrations |
| Scope / PDF p. 6 | Up to eight users | The multiplayer classroom supports up to fifty student participants and one teacher host in a single session. | `server/src/lan.ts`: DEFAULT_MAX_STUDENTS and host separation |
| ERD / PDF pp. 53–55 | Six physical entities with separate Solo, multiplayer and history stores | Use actual SQL entities and ownership/participation relationships; explain that reporting derives history from existing match records. | `server/src/db.ts`; `server/src/routes/matches.ts` |

The sample replacements above illustrate the intended academic tone. Final replacements should be placed within their original paragraphs so transitions and surrounding wording remain consistent.

## Reading source and scope

The file in `capsdoc/` is a damaged PDF: its binary streams contain UTF-8 replacement characters and compressed content could not be decoded. An intact PDF with the exact same filename was found in `C:/Users/deo/Downloads/` and used as the reading source:

`_Group-5_-Type-Tiles_-A-Gamified-Standalone-Typing-Application-Using-Falling-Tile-Mechanics-for-Skill-Development-4 (1).pdf`

The intact copy has 62 PDF pages, covering Chapters I–III and references. This review extracted and read its text; diagrams embedded as images require a separate visual review. The damaged repository copy was not replaced. The Downloads copy was not modified. Findings below refer to physical PDF page numbers, rather than the manuscript's printed page numbers, which are generally one lower after the cover.

No manuscript passages, application code, database configuration or research results were changed by this review. The extracted reading copy is `manuscript-extracted.md`; page-indexed text is in `manuscript-pages.json`.

## System descriptions that require revision

| PDF pages | Manuscript description | Required correction based on the current implementation |
|---|---|---|
| 2–7, 12–13 | Standalone desktop application, fully offline, no browser/web version, local data only | Describe the current browser application with a locally served/LAN option. Public use contacts the hosted backend. The code does not currently package an Electron desktop executable or implement automatic database synchronization. Keep the approved academic title until an adviser approves any title change. |
| 5 | Teacher manages multiplayer while also participating as a player | The teacher hosts and monitors the classroom in Lobby. Student participants play and are ranked; the host is excluded from the student competition. Teachers may separately play Solo. |
| 6–7 | Up to eight users; multiplayer limited to local use | Current room cap is 50 students plus one teacher, configurable downward. The endpoint resolver supports secure online WebSocket connections and local HTTP/LAN connections. This is a room capacity rule, not a verified overall hosted-user capacity. |
| 9–10, 33 | MySQL/XAMPP database; Electron desktop framework | Current manifests and entry points show React, TypeScript, Vite, Phaser 3, Express and ws; persistence selects SQLite or PostgreSQL through the common adapter. No Electron dependency/desktop entry point was identified. Development/design tools should be included only if the team actually used them. |
| 11 | Performance feedback automatically adjusts difficulty and personalizes word selection | Difficulty is selected by the user/teacher; the current engine selects content and speed from that configuration. Do not describe adaptive personalization as an existing feature without an implementation and evidence. |
| 12–13 | Accuracy/error percentages based on correct/incorrect words; WPM simply counts correct words per minute | Accuracy and error rate use keystroke-attempt counters. WPM uses completed target characters divided by five and elapsed minutes. Scoring is +10 per completed target, −2 per wrong key, −5 per bottom miss. No separate reaction-time result field or active combo multiplier was identified. |
| 23 | Stenography described as a translation module rendering shorthand strings | Explain master Gregg PNGs, expected English answers, full-sentence gameplay and development crop mappings. There is no automatic Gregg interpretation/OCR/translation engine. Classroom cropped Word/Phrase remains disallowed while verification is pending. |
| 32–33 | Architecture assigns gameplay/scoring processing to Node and stores room codes in the database | Separate React/Phaser client rendering and metric calculation from backend authorization, classroom coordination, accepted ranking and persistence. Room codes and live room state are in memory; match ownership and participant metrics are persisted. |
| 38–39, 53–55 | Six physical database entities: USER_ACCOUNTS, USER_PROFILES, SYSTEM_RECORDS, SOLO_GAMEPLAY_RECORDS, MULTIPLAYER_RECORDS and PERFORMANCE_HISTORY_RECORDS | Replace the physical ERD narrative with actual tables and relationships. Profiles are columns in users; Solo and classroom records share matches/match_participants; Student Progress queries existing rows. Conceptual DFD stores can remain conceptual if explicitly mapped to the physical schema and made consistent. |
| 41 | Admin can add/edit game categories, manage game content and configure general system settings | Current Admin routes cover account listing/search, ban/unban, deletion, tier/role changes, personal-stat reset, dashboard counts and audit logs. Do not include category editing/system configuration as implemented controls without corresponding code. |
| 43 | Every login begins with email entry and a verification code; repeated attempts continue until correct | Current flow is Student/Teacher registration → mandatory email verification → username/password login → shared home with role-sensitive access. Recovery uses separate OTP endpoints. Codes expire and have attempt/rate limits. Verification does not itself create a login session. |
| 44, 46–48 | Results/progress are always automatically saved | Explain successful persistence and error states. Solo submission can fail; classroom finalization commits before broadcasting final results. Exact resume/recovery after browser refresh or backend restart is limited. |
| 48, 52 | Generic history without a clear distinction between teacher reports and student progress | Document Results → Multiplayer as session-first reports, and Student Progress as student-first history across finished attempts in the teacher's completed classrooms. Both use persisted ownership filters; a teacher cannot read another teacher's private records. |
| 55–57 | All data is local, offline use supplies security, cloud storage is absent | Describe actual backend access controls, password hashing, verified accounts, current-role checks, TLS configuration and selected database provider. Discuss hosted data and deletion accurately. Offline operation alone does not establish confidentiality. Retain ethical commitments only when they reflect the actual approved research procedure. |

## Current physical database to use for the ERD

Application tables are `users`, `user_stats`, `matches`, `match_participants`, `match_results`, `admin_logs`, `feedback`, `email_verification_codes`, `email_verification_rate_limits`, `password_reset_codes`, and `password_reset_rate_limits`. PostgreSQL also has `typetiles_schema_migrations` for bookkeeping.

Key relationships: users have a unique per-account stats row; matches optionally reference their teacher owner through `owner_user_id`; match_participants connects users to matches and stores metrics/rank; verification/recovery codes reference users; feedback references its author; admin_logs references its Admin author and optionally a target account. The match_results table exists in schema, but the current gameplay/reporting flow primarily stores metrics in match_participants. An ERD should distinguish tables that exist from tables actively populated by a feature.

Current authority: `server/src/db.ts`, `server/src/postgresDatabase.ts`, and the two SQL files in `supabase/migrations/`. Teacher queries are in `server/src/routes/matches.ts`; room state is in `server/src/lan.ts`.

## Internal consistency and formatting issues

- **Figure numbering:** “Figure 1” appears for the conceptual framework on PDF page 8 and again for architecture on page 32. “Figure 9” appears for Results on page 47 and Profile/Settings on page 49. Choose the school's required consecutive or chapter-based numbering and update captions, cross-references and any lists together.
- **Questionnaire scale:** page 29 specifies a five-point Likert scale; pages 34–35 specify and interpret a four-point scale. The team/adviser must confirm which instrument was actually administered before revision. This cannot be resolved by a formatting guess.
- **Research tense:** future, present and completed-action statements are mixed, including participant selection and evaluation. Establish what was planned versus actually completed before converting prose to final-manuscript tense.
- **Evidence claims:** page 31 calls the software “bug-free”; the conceptual framework and synthesis make improvement/personalization claims that need appropriate research evidence. Replace absolute implementation claims with the actual validation performed; do not invent test results or improvement percentages.
- **Sampling description:** purposive selection, a Slovin calculation and total enumeration are discussed together. Ask the adviser to confirm the intended sampling explanation and actual respondent counts. Do not infer inferential validity from a sample-size calculation alone.
- **Literature repetition:** Fodor & Varga (2020) is discussed twice across pages 20–21. Consolidate repeated discussion while retaining the source's real supported contribution.
- **Citation consistency:** in-text author–date citations coexist with differently formatted reference entries, including IEEE-like entries. Normalize to the school's required style only after confirming that style. Bibliographic source authenticity, DOI metadata and quoted study conclusions were not externally verified during this local reading task.
- **Names and spelling:** standardize Type Tiles versus TypeTiles, “System Flow Chart” versus the school's preferred terminology, “Word Per Minute” versus “Words Per Minute,” and the heading “Cybersecurity and PRotection from Harm.”
- **Page size:** the source PDF declares a 612 × 792 point MediaBox, which is US Letter. Confirm whether the required final manuscript is Letter or A4. Do not automatically reuse the A4 settings of the separate defense study guide.
- **Layout details:** exact margins, heading styles, line spacing, paragraph indents, table/figure placement and page-number rules require the school's prescribed format or template. Text extraction alone does not establish full visual-layout compliance.
- **Cover date/title:** the cover says May 2026. Confirm the approved submission date and title with the adviser; do not silently change either based on the current date or deployment status.

## Suggested revision sequence

1. Confirm the approved final title, required document template/style, actual research stage, administered questionnaire scale and respondent information.
2. Correct Chapter I's objectives, scope, limitations, operational terms and framework to match actual browser/local-server use, gameplay metrics and room capacity.
3. Revise Chapter II's synthesis to align its application-specific claims with the system. Retain relevant literature but verify citations separately before final submission.
4. Update Chapter III's architecture, tools, authentication/gameplay/classroom flows, teacher progress, Admin functions, DFD descriptions and physical ERD.
5. Correct ethics/data-handling claims and distinguish implementation capability from measured educational effectiveness.
6. Apply the confirmed format to an editable Word/Google Docs manuscript; renumber figures/tables and regenerate contents/lists/page references.
7. Export a new review PDF, compare it with the editable source and inspect every revised diagram/table/page break.

## Information still needed for a faithful final rewrite

The actual school/adviser formatting requirements, an editable manuscript if available, approval status of the current academic title, the administered scale and final research/evaluation details. Those facts are not determined by application source code.
