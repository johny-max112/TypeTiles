# Chapter I revision notes

Prepared on 13 November 2026, Asia/Manila.

## Files and intended use

`Chapter_I_Revised_Manuscript.md` contains the complete proposed Chapter I text in the original section order. It preserves suitable introductory prose and uses the same formal academic English style for corrections. This notes file is separate so implementation commentary and unresolved decisions are not inadvertently pasted into the manuscript body.

Use the existing Google Docs manuscript as the formatting authority. Preserve Times New Roman, current heading styles, body font size, justification, first-line indent, line spacing, margins, headers, borders and page-number placement. When inserting text into an existing styled paragraph, **Paste without formatting** can preserve the destination style. Replace section content within the existing structure and check that numbered/bulleted lists and headings retain their intended styles. Markdown itself does not store Word/Google Docs font and page-layout settings.

The chapter is a proposed replacement; the live Google Doc and original PDF have not been edited. Figure 1's caption is retained as a placement cue. Its actual image has not yet been revised or verified against the replacement description. Do not insert the caption a second time if the existing figure remains in place.

## Original-to-revised change record

Page references are physical PDF page numbers from the 62-page source; the printed manuscript page is generally one lower.

| Section / PDF page | Original wording or claim | Replacement / action | Reason and current source |
|---|---|---|---|
| Background / 2, paragraphs 1–2 | General typing context and repetition/motivation rationale | Preserved the wording | These passages establish the original study context rather than making implementation-specific claims. Literature support still belongs to the research references. |
| Background / 2 | “progressive difficulty” and an unconditional claim about engagement | “selectable difficulty levels”; frame reviewed literature as the basis for examining engagement | The application uses chosen difficulty settings; improvement is an evaluation outcome, not established by code. `src/scenes/GameScene.ts`: init. |
| Background / 2 | “a standalone desktop typing application” and words/characters falling | “a browser-based typing application”; words, sentences or supplied Gregg images | `src/main.tsx`; `src/components/GameMount.tsx`; `src/data/stenoExercises.ts`. |
| Background / 2–3 | Claims of improved reaction time and hand-eye coordination | Focus the system objective on typing speed/accuracy and time-pressured interaction | The engine stores WPM/accuracy/errors and gameplay metrics, not a separate reaction-time/coordination score. `src/scenes/GameScene.ts`: GameResult, endMatch. |
| Background / 3 | Practice offline regardless of connectivity conditions | Explain hosted access and locally running frontend/backend/SQLite; email delivery needs connectivity | `src/lib/endpoints.ts`; `server/src/db.ts`; `server/src/email.ts`. |
| Background / 3 | Approved long project title | Retained verbatim | A technical revision does not authorize changing an approved academic title. Confirm any title change with the adviser. |
| General Objective / 4 | “gamified standalone”; reaction time and progressive levels | “gamified typing application”; speed/accuracy support, selectable levels and classroom activities | Match measurable engine fields and teacher-hosted operation. Actual educational improvement still requires evaluation. |
| Specific Objectives / 4 | Desktop GUI; generic room code; metrics only; effectiveness claim | Retain five numbered objectives while adding browser UI, role-aware navigation, fifty Students plus host, saved reporting, and evaluation of suitability | `src/App.tsx`; `server/src/lan.ts`; `server/src/routes/matches.ts`. Research design/evaluation wording remains subject to adviser review. |
| Significance / 5 | Teacher manages multiplayer “while also participating ... as a player” | Teacher hosts/monitors Students; separately may use Solo | Teacher remains in Lobby; Student participants enter Game. `src/pages/Lobby.tsx`; `server/src/lan.ts`: getStudentResults. |
| Significance / 5 | General public can practice offline anytime | Hosted/local access with the required services available | A browser bundle alone does not replace the local server or email service. `src/pages/PreMatch.tsx`; `src/lib/playerApi.ts`. |
| Significance / 5–6 | Unqualified benefit/effectiveness statements | Preserve beneficiary order and frame benefits as potential support for practice and review | No new research findings are invented. Existing evidence must support effectiveness conclusions. |
| Scope / 6–7 | Desktop application; offline operation; eight users | Browser gameplay, supported formats, teacher reports, 50 Students + Teacher, selected database provider | `src/scenes/GameScene.ts`; `server/src/classroomConfig.ts`; `server/src/lan.ts`; `server/src/db.ts`. |
| Scope / 6–7 | Role/account and progress details absent | Add direct Student/Teacher registration, email verification and teacher-owned reports | `server/src/emailVerification.ts`: validateRegistration, register; `server/src/middleware.ts`; `server/src/routes/matches.ts`: TEACHER_PROGRESS. |
| Limitations / 7 | No web version, no online multiplayer, no cloud storage | Replace obsolete exclusions with current browser/local prerequisites and actual capacity/recovery/storage limits | `package.json`; `server/package.json`; `src/lib/endpoints.ts`; `server/src/lan.ts`; `server/src/db.ts`. |
| Limitations / 7 | No explanation of current Gregg verification boundary | Add full-sentence availability, pending development crops, no automatic image interpretation | `src/lib/greggGameplay.ts`; `src/data/greggCropMappings.ts`; `server/src/classroomConfig.ts`. |
| Framework / 8 | Outputs “measurable improvements”; levels/rewards | Describe actual feedback/records and scoring/challenges; preserve Gamification/HCI/IPO structure | Stored metrics support evaluation but do not establish educational improvement or an implemented reward/progression engine. |
| Framework / 9 | MySQL/XAMPP in software tools | React, TypeScript, Vite, Phaser, Express, Node, PostgreSQL/SQLite | Actual package manifests, entry points and provider selection. Visual Studio Code was already named in the source; confirm other historical design tools before listing them. |
| Framework / 10 | Development using MySQL; guaranteed correct features | Use actual stack; describe testing activities without asserting unexecuted success | `package.json`; `server/package.json`; existing `server/tests/`. No application tests were run for this drafting task. |
| Framework / 10–11 | Improved typing, improved accuracy and enhanced reaction time listed as automatic system outputs | Substitute WPM feedback, accuracy/error feedback, completed activities, reports and evaluation information | These are observable outputs supported by the implementation. Research benefits may be discussed as intended outcomes, but require evidence to be reported as achieved. |
| Framework / 11 | System automatically adjusts difficulty, becomes smarter and personalized | Users/Teachers review feedback and select later settings; development feedback informs revisions | No adaptive difficulty or personalization mechanism identified in the current gameplay flow. |
| Terms / 12 | Accuracy and errors count words; health falls after errors or misses | Keystroke-based percentages; lives fall on bottom misses | `src/scenes/GameScene.ts`: updateHud, onWrongKey, onMissBottom. |
| Terms / 13 | Score based on speed/performance; generic words/minute | Explain actual completion/wrong-key/miss points and character-equivalent WPM | `src/scenes/GameScene.ts`: handleTyping, onWrongKey, onMissBottom, updateHud. |
| Terms / 13 | Standalone means a packaged offline desktop system | Explain title retention and actual locally served architecture | No Electron/Tauri dependency or native desktop entry point in the inspected manifests. Title decision requires adviser confirmation. |
| Terms / 12–13 | Reaction time/coordination/engagement read as stored measured outcomes | Retain terms but explicitly distinguish gameplay interaction and research assessment from stored engine metrics | Avoids implying that code records educational outcomes it does not measure. |

## Figure 1 / IPO update notes

Revise the original figure in its existing notation and visual style after visually inspecting it. The text extraction does not expose the full content of the diagram image. The following are the intended labels to reconcile with the revised discussion, not an assertion that the figure image has already been edited:

| IPO area | Content to reflect |
|---|---|
| Input | Actual software stack, hardware/network prerequisites, development knowledge; account/configuration/typing inputs where the figure shows operational inputs |
| Process | Requirements, design, development, testing, review and deployment; role/verification handling, Phaser gameplay, classroom coordination and result persistence where relevant |
| Output | WPM, accuracy/error feedback, completed activities, saved results/classroom reports and information for evaluation |
| Feedback | Users/Teachers review recorded performance and choose settings; team reviews feedback to refine the system |

Remove MySQL/XAMPP, automatic adaptive learning, guaranteed measured improvement and a packaged offline desktop executable wherever the existing diagram asserts them as current implementation facts. Keep the approved figure-number convention until the overall figure list is corrected; Figure 1 is currently duplicated elsewhere in the manuscript.

## Decisions retained for research/adviser confirmation

1. **Approved title:** preserved as supplied, including “Standalone.” The definition makes the current implementation explicit. If the adviser approves a revised title, update it consistently across the cover, chapter text, figures and references to the project.
2. **Research tense and status:** the source uses proposal wording. This draft retains its general stance rather than inventing completion of evaluation. Once the team confirms actual completed activities, apply an agreed tense consistently across Chapters I–III.
3. **Educational outcomes:** code establishes available functions and measured engine values; it cannot prove typing improvement or classroom engagement. Objective 5's evaluation wording needs to match the actual instrument/design.
4. **Formatting:** Times New Roman is confirmed. Exact body size, line spacing, margins and numbering must follow the existing editable document/template, rather than guessing from a selected toolbar value in one screenshot.
5. **Literature support:** retained broad research rationale needs the team's real references. No external literature authenticity review or new citations were added in this drafting task.
6. **Locally running versus public services:** the local option needs configured services and local verified accounts; hosted and local databases do not sync automatically. Real deployments and classroom capacity should be validated separately from source-level capability.

## Validation performed for this draft

- Read the source Chapter I across PDF pages 2–13 and preserved its major heading order and beneficiary order.
- Rechecked current source for provider selection, role registration/verification, classroom configuration/capacity, teacher-scoped progress and gameplay formulas.
- Kept implementation annotations in this file and clean manuscript prose in the replacement file.
- Did not modify application code, run migrations, invent survey results or edit the live Google Doc.

Chapter II's application-specific synthesis and Chapter III's architecture, database, DFD and flowchart explanations remain separately listed in `Manuscript_Revision_Review.md`; they are not claimed as revised by this Chapter I draft.
