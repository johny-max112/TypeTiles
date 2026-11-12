# Type Tiles defense guide — generation and validation report

Date: 9 November 2026 (Asia/Manila).

## Deliverables

- `TypeTiles_Developer_Defense_Study_Guide.md` — complete source document, 17 chapters and approximately 15,224 whitespace-delimited words.
- `TypeTiles_Developer_Defense_Study_Guide.pdf` — 55 A4 pages, numbered headers/footers, tagged text and document outline.
- Four standalone SVG diagrams: architecture, authentication, database ERD and multiplayer sequence. Keep these beside the Markdown to display its image links.
- `study-guide.html`, generation scripts, review screenshots and JSON validation/source-inventory records support reproduction and review.

## Scope and source accuracy

All 17 requested parts are present. The guide includes 40 main technical questions, each with an answer, source reference, follow-up question and suggested follow-up answer; 33 REST endpoint contracts; 15 live-code walkthrough groups; exact gameplay formulas; a repository map; database relationships; testing/deployment explanations; and a seven-day review plan.

The source inventory records 117 application-source, test and migration files. Their hashes were rechecked after document generation: none changed during this task. The existing modification to root `index.html` predates this documentation task and was preserved. Environment files were not read. A generated-document scan found no PostgreSQL connection-URI, Resend-key or JWT credential patterns. That limited scan supplements the deliberate exclusion of environment files; it is not a general security certification.

## Tools used and actual checks

- Existing Node.js v22.19.0; built-in filesystem, crypto, child-process and WebSocket support.
- Existing Google Chrome in headless mode through Chrome DevTools Protocol. No packages or PDF dependencies installed.
- Markdown generated first; HTML derived directly from the same Markdown; Chrome printed that HTML to PDF.
- Verified the PDF signature, end marker, 55 page objects and A4 MediaBox (approximately 595 × 842 PDF points).
- Verified all 17 numbered chapter entries exist in the actual PDF document outline with valid destination pages.
- Verified all four diagram images loaded in the HTML used for printing.
- Checked tables, preformatted code blocks and images for horizontal overflow: zero failures.
- Opened the actual PDF in Chrome's PDF viewer; its toolbar displayed 55 pages. Inspected the cover and selected actual PDF pages for database tables, API documentation, defense Q&As and the final study guide. Reviewed diagram/print-layout screenshots as well.
- Corrected crowded ERD relationship labels during document review. Sampled final pages showed no clipped text or overlapping tables. This was sampled visual review plus automated checks, not a claim that every line of every PDF page was manually inspected.
- The generated PDF and Markdown share substantive content. The PDF adds typography, pagination, page numbers and outline bookmarks.

Application tests and application builds were **not run during this documentation task**. Their existing source was inspected and their coverage/limitations documented. Running their normal workflows can write outside `defense-review/`, contrary to the explicit documentation-only write restriction. Earlier conversational test/build results are not presented as fresh validation of this snapshot. No databases, migrations, production services, secrets, deployment settings or application source files were modified.

## Important findings requiring separate work or verification

1. The active Exercise 7 crop mapping has six playable groups, but `GameScene.spawnWord` still expects seven. That local development pilot can reject its crop bank. This audit documents the issue without implementing a repair.
2. Solo submissions are not backend-idempotent; repeated valid requests can re-add global statistics. The Solo submission handler also does not finalize the match status/ended_at as the classroom helper does.
3. Classroom rankings are server-ordered, but gameplay metrics are client-reported. Full anti-cheat validation is not implemented.
4. Room state is memory-only. Exact restart/refresh recovery, distributed rooms and automatic reliable interruption reconciliation are not implemented.
5. Live production deployment identity, hosted 50-device capacity, proxy IP behavior, Resend deliverability/domain status, backups and production database data were not verified.
6. Gregg instructor verification, teacher credential vetting and academic retention after account deletion remain separate confirmation/product decisions.

## Remaining generation issues

None blocking delivery. The PDF opens and all chapters/diagrams are present. Automatic approval review rejected cleanup of temporary browser-profile directories with the reason “blocked by policy”; those temporary folders remain inside `defense-review/` and are not required by the deliverables. SVG images should remain next to the Markdown if sharing it; the PDF is self-contained. No commit, push or deployment was performed.
