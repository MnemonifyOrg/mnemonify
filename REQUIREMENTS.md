# Product Requirements: Open Course Builder (working title)

**Version:** 0.1 (Draft)
**Owner:** Sebastin
**Status:** Pre-development
**License intent:** AGPL-3.0, open source
**Last updated:** July 10, 2026

---

## 1. Problem Statement

Educators and small training teams cannot afford modern eLearning authoring tools. Articulate 360 costs over $1,000 per seat per year and dominKnow is enterprise-priced. The affordable end of the market forces a bad trade-off: tools that are easy to use produce simple, static courses (Rise-style), while tools that support real interactivity (variables, triggers, states, branching) are expensive, desktop-bound, and produce courses that break on mobile devices (Storyline-style). Educators without budget end up hacking together interactive PowerPoints published as PDFs.

There is no free or affordable tool that combines a Rise-like intuitive authoring experience and clean mobile-responsive output with Storyline-like interactive logic.

## 2. Vision

A free, open source, web-based eLearning authoring tool that any educator can use in a browser. Courses are built by stacking blocks (like Rise), always look clean and work on phones (enforced by a built-in design system), and can include real interactive logic (variables, triggers, conditions, states) through a plain-language trigger builder that requires zero programming. Courses export as SCORM 2004 3rd Edition packages for any LMS, or as standalone web courses.

Long-term sustainability model: free self-hosting for anyone, with an optional low-cost hosted version priced only to cover hosting and maintenance.

## 3. Goals

1. An author with no technical background can build and publish a mobile-responsive course with at least one interactive element in under 60 minutes, on their first use, without training.
2. Every published course passes SCORM 2004 3rd Edition conformance testing on SCORM Cloud and runs correctly in Ethos by Cadmium.
3. Every published course is fully usable on a phone, tablet, and desktop with no author effort.
4. Interactive logic (show/hide, variables, conditions) can be authored entirely through UI dropdowns, with no code and no logic jargon.
5. The codebase is structured so an outside open source contributor can understand the architecture from the docs alone.

## 4. Non-Goals

1. **Free-form slide layout (Storyline-style canvas).** Pixel positioning is what breaks mobile responsiveness. All layout is block-stacking within the design system. This is a permanent constraint, not a v1 limitation.
2. **Custom theming beyond accent color, logo, and font pairing choices in v1.** The locked design system is the product. Broader theming may come later as curated presets only.
3. **Real-time multi-author co-editing (Google Docs style).** Too complex for early versions. Simple record locking is sufficient.
4. **AI content generation in v1.** Valuable later, but it is a separate initiative and must not delay the core authoring engine.
5. **xAPI/cmi5, SCORM 1.2, and AICC support in v1.** SCORM 2004 3rd Ed only, because that is the validated Ethos target. Others are P2.
6. **Native mobile apps.** The web app is responsive; that is sufficient.

## 5. Target Users

- **Primary: The solo educator.** Teacher, trainer, or instructional designer with no budget and no coding skills. Uses the hosted version. Success means they never see a JSON file or a line of code.
- **Secondary: The small L&D team.** 2 to 15 people sharing a course library, publishing to an LMS. Needs shared workspace, SCORM export, basic roles.
- **Tertiary: The self-hosting institution.** A school or non-profit IT person deploying the open source version on their own server.

## 6. User Stories

### Authoring (P0)
- As a solo educator, I want to create a course by adding and stacking content blocks so that I can build a lesson without design skills.
- As a solo educator, I want to see a live preview in phone, tablet, and desktop widths so that I trust the course will work for my learners.
- As a solo educator, I want to edit text directly on the block (click and type) so that authoring feels like writing a document, not filling out forms.
- As an author, I want to reorder blocks by dragging so that restructuring a lesson takes seconds.
- As an author, I want autosave so that I never lose work.

### Interactivity (P0 engine, P0/P1 UI)
- As an author, I want to create named variables (true/false, number, text) so that my course can remember what the learner has done.
- As an author, I want to attach triggers to blocks using plain-language dropdowns ("When learner opens this accordion, set HasReadIntro to true") so that I can build logic without programming.
- As an author, I want to show or hide blocks based on conditions so that I can build branching and adaptive paths.
- As an author, I want a knowledge check block whose score can drive conditions so that learners get different content based on performance.

### Publishing (P0)
- As an author, I want to export my course as a SCORM 2004 3rd Edition zip so that I can upload it to my LMS.
- As a learner, I want my progress and completion reported to the LMS so that my training record is accurate.
- As a learner, I want to close a course mid-way and resume where I left off, with my variable states intact.

### Review and feedback (P1)
- As an author, I want to share a review link so that SMEs can view the course without an account or LMS.
- As a reviewer, I want to leave comments pinned to a specific block so that my feedback has clear context.
- As an author, I want to reply to and resolve comments so that review rounds stay organized.

### Rich media and specialized content (P1)
- As an author, I want an embed block for YouTube, Vimeo, web pages (e.g., DigitalScope), and survey tools (e.g., SurveyMonkey) so that external content lives inside the course.
- As a pathology educator, I want an image carousel so that learners can step through a set of static slide images in sequence.
- As a pathology educator, I want images to open enlarged in a lightbox with a caption so that learners can examine slide detail.
- As a pathology educator, I want to link a term inside a case discussion text block to a lightbox image so that learners can view the referenced slide without leaving the text.

### Pathology differentiation track (P1/P2)
- As a pathology educator, I want a deep-zoom slide viewer block so that learners can pan and zoom actual whole-slide detail, with author-placed annotations that reveal at set zoom levels.
- As a pathology educator, I want a side-by-side compare block with two synced images that pan and zoom together so that learners can correlate morphology (e.g., H&E vs. IHC, before vs. after).
- As a pathology educator, I want knowledge checks to optionally capture the learner's confidence alongside their answer so that a confidently-wrong response can be surfaced for priority review.

### Team and platform (P1)
- As a team lead, I want colleagues to log in to a shared workspace so that we maintain one course library.
- As a team member, I want to duplicate an existing course so that I can reuse structures.
- As a self-hoster, I want documented setup steps so that I can deploy on my own server.

## 7. Requirements

### P0: Must have (cannot ship v1 without)

| # | Requirement | Acceptance criteria (summary) |
|---|---|---|
| P0-1 | Course JSON document model: course > pages > blocks, with course-level variables, block-level triggers | Schema documented in ARCHITECTURE.md; a hand-written JSON file renders correctly in the player |
| P0-2 | Responsive player with built-in design system | Player renders text, image, list, accordion, tabs, knowledge check blocks; passes visual check at 375px, 768px, 1280px widths; no horizontal scrolling on mobile |
| P0-3 | Trigger and variable engine in the player | Supports events (onOpen, onClick, onComplete, onCorrect, onIncorrect, onPageEnter), actions (SET variable, SHOW/HIDE block, ENABLE/DISABLE block, JUMP to page), and conditions (==, !=, >, <, AND/OR) |
| P0-4 | SCORM 2004 3rd Edition export | Exported zip passes SCORM Cloud conformance; reports completion_status, success_status, score; suspend/resume restores page position and all variable values; verified working upload in Ethos |
| P0-5 | Block editor UI | Add, edit inline, reorder (drag), duplicate, delete blocks; live responsive preview toggle; autosave within 5 seconds of change |
| P0-6 | Trigger builder UI | Author builds any P0-3 trigger through dropdowns only; invalid combinations are impossible to select; triggers display as readable sentences |
| P0-7 | Course library with backend persistence | Courses stored in PostgreSQL via API; create, rename, duplicate, delete; every course record carries an organization_id |

### P1: Should have (fast follows)

| # | Requirement |
|---|---|
| P1-1 | User accounts and shared team workspace (email + password; simple admin/author roles) |
| P1-2 | Additional block types: flashcards, image hotspot, video (upload or embed), divider, quote, button |
| P1-3 | Block states (e.g., normal/visited/completed visual states) driven by the trigger engine |
| P1-4 | Standalone web export (non-SCORM zip for hosting anywhere) |
| P1-5 | Course-level settings: accent color, logo, font pairing (curated presets only) |
| P1-6 | Media library per organization |
| P1-7 | Embed block: YouTube, Vimeo, and generic iframe embed for web pages and survey tools, with a per-organization domain allowlist for security |
| P1-8 | Image carousel block: ordered image set with per-image captions, swipe/arrow navigation, works with the lightbox |
| P1-9 | Lightbox: any image (standalone, in a carousel, or referenced from an inline text link) opens enlarged in a modal with caption; implemented as an OPEN_LIGHTBOX action in the trigger engine so inline text links can target any image asset |
| P1-10 | Review and commenting: shareable review link (no account required for reviewers), comments pinned to blocks, threaded replies, resolve/reopen, author notification of new comments |
| P1-11 | WCAG 2.1 AA conformance target for the player and all published courses: semantic HTML, full keyboard operability, screen reader support, alt text fields on all image-type blocks, sufficient contrast enforced by the design system. Drag-and-drop style interactions are excluded from the conformance requirement and are simply not offered as block types |
| P1-12 | **Pathology track:** Side-by-side compare block. Two images with synchronized pan and zoom; optional independent-toggle mode; captions per side. Built on the same zoom engine as P1-13 |
| P1-13 | **Pathology track:** Confidence-weighted knowledge check. Learner selects an answer and a confidence level (e.g., low/medium/high). Both are stored as variables so triggers can surface confidently-wrong items for priority review and drive tailored feedback |

### P2: Future considerations (design for, do not build)

| # | Requirement | Architectural implication now |
|---|---|---|
| P2-1 | Adaptive learning paths (rule-based release of content by performance) | Trigger engine conditions must support quiz score variables from day one; this makes P2-1 mostly a UI feature later |
| P2-2 | xAPI/cmi5 export | Keep LMS communication in one isolated player module so a second protocol can be added |
| P2-3 | Hosted multi-tenant SaaS with billing | organization_id on all records from day one (P0-7) |
| P2-4 | Translation/localization of authored courses | Keep all learner-facing strings in the JSON content, never hardcoded in the player |
| P2-5 | AI-assisted content drafting | None required now |
| P2-6 | Template/starter course gallery | None required now |
| P2-7 | Custom JavaScript block for technically inclined authors (Storyline-style "Execute JavaScript"). Explicitly optional and cuttable: it carries real security risk in a hosted multi-tenant context (cross-tenant script injection), so if built, it ships sandboxed and/or self-hosted-only | Expose a small, documented, read/write JavaScript API to course variables in the player (e.g., player.getVar/setVar), so an extension point exists without opening the whole runtime |
| P2-8 | **Pathology track, signature feature:** Deep-zoom whole-slide viewer block (OpenSeadragon-style). Learner pans and zooms gigapixel slide imagery; author places pinned annotations that reveal at defined zoom levels. Staged after P1-12 because it requires a tiled-image pipeline (either author-uploaded tiled images or a supported hosting format), which is a meaningful backend addition | Build the P1-12 compare block on a zoom-engine abstraction so the deep-zoom viewer is an extension of it, not a separate stack. Keep image tiling/storage behind the same asset-storage module (Architecture Section 8) |

## 8. Success Metrics

Leading (first 90 days after any public release):
- Time to first published course for a new user: under 60 minutes (target), under 30 (stretch)
- SCORM conformance pass rate on SCORM Cloud: 100%
- Percentage of test courses usable on mobile without author fixes: 100%

Lagging (post open source launch):
- External self-host deployments and GitHub stars/forks as adoption signals
- At least one outside contributor PR merged within 6 months of public release
- Hosted version (if launched) covers its own hosting costs

During development, the practical metric per phase is: the phase's acceptance criteria pass, verified by Sebastin manually and in SCORM Cloud where applicable.

## 9. Constraints

- Built and maintained by a non-technical owner using Claude Code; therefore documentation quality and architectural simplicity are hard requirements, not nice-to-haves.
- Developed on personal time, personal hardware, and a personal GitHub account, with no employer content or work product included, to keep the project's IP unambiguously personal. Owner to review employment agreement IP clause before public release.
- SCORM target is fixed: SCORM 2004 3rd Edition (Ethos requirement).
- Stack: React + Vite frontend, Node.js backend, PostgreSQL. Runs locally during development; AWS later.
- License: AGPL-3.0, added to the repository at project start.

## 10. Phasing

| Phase | Deliverable | Definition of done |
|---|---|---|
| 1 | JSON schema + responsive player | Hand-written sample course renders responsively with 7 core block types |
| 2 | SCORM 2004 3rd Ed wrapper | Sample course zip passes SCORM Cloud; completion, score, suspend/resume verified; tested in Ethos |
| 3 | Block editor | Author can build the Phase 1 sample course entirely through the UI |
| 4 | Trigger and variable engine + trigger builder UI | Author can build a branching course with variables through dropdowns only |
| 5 | States, expanded block types (incl. embed, carousel, lightbox, side-by-side compare), scored and confidence-weighted knowledge checks reporting to LMS | P1-2, P1-3, P1-7, P1-8, P1-9, P1-12, P1-13 complete; lightbox-from-text-link and a synced compare block work in a sample pathology case course |
| 6 | Accounts, shared library, review and commenting, deployment docs | Team of 5 using a shared workspace; a reviewer without an account completes a comment round; self-host guide tested by a stranger |

Accessibility (P1-11) is not a phase; it is a build practice. Semantic HTML, keyboard operability, and alt text fields are implemented from the first block in Phase 1, with a formal AA audit before public release. Retrofitting accessibility is far costlier than building it in.

| 7 | Pathology signature: deep-zoom whole-slide viewer with zoom-triggered annotations (P2-8) | Learner pans/zooms a tiled slide image; annotations reveal at defined zoom levels; reuses the Phase 5 zoom engine |

Each phase ends with a working, testable artifact. No phase begins until the prior phase's definition of done is met. Phases 5 and 7 form the pathology differentiation wedge and are the features no free tool or AI generator currently offers.

## 11. Open Questions

1. **(Legal, blocking before public release, not before development)** Does Sebastin's employment agreement contain an IP assignment clause covering personal projects? Confirm before open-sourcing.
2. **(Product, non-blocking)** Project name. Needed before repo creation is finalized, but a working title is fine to start.
3. **(Product, non-blocking)** Exact v1 block list for Phase 1: proposed set is text, heading, image, list, accordion, tabs, knowledge check (multiple choice). Confirm or adjust.
4. **(Technical, resolve in Phase 2)** Ethos-specific SCORM quirks: does Ethos handle suspend_data and score reporting per spec? Verify with a minimal test package early.
5. **(Product, resolve by Phase 6)** Hosted version pricing model, if any: donations, flat nominal fee, or free with paid support.

## 12. Out-of-Scope Parking Lot

Ideas raised and deliberately deferred: AI content generation, PowerPoint import, collaborative real-time editing, discussion/social blocks, LTI integration, course analytics dashboard, marketplace for shared templates, drag-and-drop interaction blocks (excluded partly for accessibility reasons). Bigger future bets noted but not scheduled: spaced-repetition of missed concepts across sessions using SCORM suspend_data (courses that remember the learner), and a content-graph model where a concept updated once propagates to every course referencing it (living courses rather than static documents).
