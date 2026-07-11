# Product Requirements: Mnemonify

**Version:** 0.3 (In development)
**Owner:** Sebastin
**Status:** Phase 1 complete
**License intent:** AGPL-3.0, open source
**Last updated:** July 11, 2026

---

## 1. Problem Statement

Educators and small training teams cannot afford modern eLearning authoring tools. Articulate 360 costs over $1,000 per seat per year and dominKnow is enterprise-priced. The affordable end of the market forces a bad trade-off: tools that are easy to use produce simple, static courses (Rise-style), while tools that support real interactivity (variables, triggers, states, branching) are expensive, desktop-bound, and produce courses that break on mobile devices (Storyline-style). Educators without budget end up hacking together interactive PowerPoints published as PDFs.

There is no free or affordable tool that combines a Rise-like intuitive authoring experience and clean mobile-responsive output with Storyline-like interactive logic, a professional workflow for teams, and genuine accessibility for non-technical educators.

## 2. Vision

A free, open source, web-based eLearning authoring tool that any educator can use in a browser with no installation, no setup, and no training required to build their first course. Courses are built by stacking blocks (like Rise), always look clean and work on phones (enforced by a built-in design system), and can include real interactive logic (variables, triggers, conditions, states) through a plain-language trigger builder that requires zero programming. Courses export as SCORM 2004 3rd Edition packages for any LMS, run as standalone web courses, and include automatically generated PDF summaries.

Long-term sustainability model: free self-hosting for anyone with one-click deploy options, with an optional low-cost hosted version priced only to cover hosting and maintenance.

## 3. Goals

1. An author with no technical background can build and publish a mobile-responsive course with at least one interactive element in under 60 minutes, on their first use, without training.
2. Every published course passes SCORM 2004 3rd Edition conformance testing on SCORM Cloud and runs correctly in Ethos by Cadmium.
3. Every published course is fully usable on a phone, tablet, and desktop with no author effort.
4. Interactive logic (show/hide, variables, conditions) can be authored entirely through UI dropdowns, with no code and no logic jargon.
5. The codebase is structured so an outside open source contributor can understand the architecture from the docs alone.
6. A learner never leaves the course player window involuntarily; all resources, PDFs, links, and media open inside the player.

## 4. Non-Goals

1. **Free-form slide layout (Storyline-style canvas).** Pixel positioning is what breaks mobile responsiveness. All layout is block-stacking within the design system. This is a permanent constraint, not a v1 limitation.
2. **Custom theming beyond accent color, logo, and font pairing choices in v1.** The locked design system is the product. Broader theming may come later as curated presets only.
3. **Real-time multi-author co-editing (Google Docs style).** Too complex for early versions. Simple record locking is sufficient.
4. **AI content generation in v1.** Valuable later, but it is a separate initiative and must not delay the core authoring engine.
5. **xAPI LRS connection in v1.** Analytics telemetry is built xAPI-compatible from day one, but the LRS connection is P2. SCORM 2004 3rd Ed is the primary LMS reporting protocol.
6. **Native mobile apps.** The web app is responsive; that is sufficient.

## 5. Target Users

- **Primary: The solo educator.** Teacher, trainer, or instructional designer with no budget and no coding skills. Uses the hosted version. Success means they never see a JSON file or a line of code. First course built in under 60 minutes on first login.
- **Secondary: The small L&D team.** 2 to 15 people sharing a course library, publishing to an LMS. Needs shared workspace, SCORM export, basic roles, and Word storyboard workflow.
- **Tertiary: The self-hosting institution.** A school or non-profit IT person deploying the open source version via one-click deploy to Railway or Render, or manual server setup.

## 6. User Stories

### Authoring (P0)
- As a solo educator, I want to create a course by adding and stacking content blocks so that I can build a lesson without design skills.
- As a solo educator, I want to see a live preview in phone, tablet, and desktop widths so that I trust the course will work for my learners.
- As a solo educator, I want to edit text directly on the block (click and type) so that authoring feels like writing a document, not filling out forms.
- As an author, I want to reorder blocks by dragging so that restructuring a lesson takes seconds.
- As an author, I want autosave so that I never lose work.

### Onboarding (P1)
- As a first-time user, I want a guided walkthrough when I first log in so that I can build my first course without reading documentation.
- As a first-time user, I want a starter template library on my first login so that I never face a blank canvas.
- As an author, I want tooltips and plain-language labels throughout the editor so that I never need to decode jargon.

### Interactivity (P0 engine, P0/P1 UI)
- As an author, I want to create named variables (true/false, number, text) so that my course can remember what the learner has done.
- As an author, I want to attach triggers to blocks using plain-language dropdowns ("When learner opens this accordion, set HasReadIntro to true") so that I can build logic without programming.
- As an author, I want to show or hide blocks based on conditions so that I can build branching and adaptive paths.
- As an author, I want a knowledge check block whose score can drive conditions so that learners get different content based on performance.

### Publishing (P0)
- As an author, I want to export my course as a SCORM 2004 3rd Edition zip so that I can upload it to my LMS.
- As a learner, I want my progress and completion reported to the LMS so that my training record is accurate.
- As a learner, I want to close a course mid-way and resume where I left off, with my variable states intact.

### Player navigation and chrome (P1)
- As a learner, I want a collapsible navigation drawer showing all pages so that I can see my progress through the course.
- As a learner, I want page status icons (not visited, in progress, completed, locked) so that I know where I am at a glance.
- As an author, I want to enforce linear navigation so that learners cannot skip ahead until they complete each page.
- As an author, I want to organise pages into named sections or modules in the nav drawer so that longer courses feel structured.
- As an author, I want a Continue button at the bottom of each page, with optional trigger conditions, so that page completion is explicit and controllable.
- As an author, I want to add optional utility items (Contact, Resources, custom) to the player chrome so that learners can access support without leaving the course.
- As an author, I want Contact and Resources to be optional per course or template, not forced on every course.

### In-player containment (P1)
- As a learner, I want all PDFs, links, and media to open inside the course player so that I never accidentally leave the course window and lose my place.
- As a learner, I want PDFs to open in an embedded modal viewer with a download button so that I can read them without leaving the course.

### Media and interactive video (P1)
- As an author, I want to upload video and audio files directly into the course so that content is self-contained.
- As a learner, I want only one video or audio item to play at a time so that sound never overlaps when a page has multiple media blocks in tabs or accordions.
- As a learner, I want audio to pause automatically when I scroll past it so that it does not play unheard in the background.
- As an author, I want a video block to optionally advance to the next page when it ends so that I can build linear video-driven courses.
- As an author, I want to add pause points to a video at specific timestamps with overlay questions so that learners interact with the video content.
- As an author, I want video overlay questions to branch to different timestamps based on the learner's answer so that I can build full decision-tree video experiences.

### Captions, transcripts, and accessibility (P1)
- As an author, I want captions auto-generated on video upload so that I do not have to create them manually.
- As an author, I want to review and correct the auto-generated captions before publishing so that clinical terminology is accurate.
- As an author, I want to upload my own caption file to override auto-generation so that I have full control.
- As a learner, I want to toggle captions on or off on any video so that I can choose my viewing preference.
- As a learner, I want a readable transcript below any audio or video block so that I can follow along or search the content.
- As an author, I want a pre-publish checklist that flags missing alt text, captions, and transcripts so that accessibility gaps are caught before release.

### Review and feedback (P1)
- As an author, I want to share a review link so that SMEs can view the course without an account or LMS.
- As an author, I want the course PDF to be generated and viewable during review so that reviewers can check the summary document before publication.
- As a reviewer, I want to leave comments pinned to a specific block so that my feedback has clear context.
- As an author, I want to reply to and resolve comments so that review rounds stay organized.

### Rich media and specialised content (P1)
- As an author, I want an embed block for YouTube, Vimeo, web pages, and survey tools so that external content lives inside the course.
- As a pathology educator, I want an image carousel so that learners can step through a set of static slide images in sequence.
- As a pathology educator, I want images to open enlarged in a lightbox with a caption so that learners can examine slide detail.
- As a pathology educator, I want to link a term inside a case discussion text block to a lightbox image so that learners can view the referenced slide without leaving the text.

### Pathology differentiation track (P1/P2)
- As a pathology educator, I want a side-by-side compare block with two synced images that pan and zoom together so that learners can correlate morphology (e.g., H&E vs. IHC, before vs. after).
- As a pathology educator, I want knowledge checks to optionally capture the learner's confidence alongside their answer so that a confidently-wrong response can be surfaced for priority review.
- As a pathology educator, I want a deep-zoom slide viewer block so that learners can pan and zoom actual whole-slide detail, with author-placed annotations that reveal at set zoom levels.

### Templates and Word workflow (P1)
- As an author, I want to save any course as a reusable template so that my team can start new courses from a proven structure.
- As an author, I want to create a new course from a template so that block structure, trigger logic, and design settings are already in place.
- As an author, I want to mark a template as shared with my organisation so that colleagues can use it.
- As an author, I want PDF generation mode (combined or per-page or both) set at the template level so that every course created from that template inherits the right setting.
- As an author, I want to export a blank Word document generated from a template so that SMEs can fill in content in Word without using Mnemonify.
- As an author, I want to import a filled-in Mnemonify Word template back into the app so that content populates the course blocks automatically.

### Bulk image upload (P1)
- As an author, I want to drag and drop a folder or ZIP of images into the media library in one action so that I can bring 30 to 150 images into a course without uploading them one at a time.
- As an author, I want to multi-select images from the media library and add them all to a carousel at once so that building a multi-image case takes seconds.

### PDF summary (P1)
- As an author, I want a course PDF automatically generated at publish time so that I do not have to create it separately.
- As an author, I want to choose whether PDF generation is on or off per course, or inherit the setting from the template.
- As an author, I want to choose combined (all pages, one PDF) or per-page (one PDF per case) or both, at the course or template level.
- As a learner, I want the course PDF available on the Resources page inside the player so that I have a printable summary without leaving the course.
- As an author, I want knowledge check blocks excluded from the PDF by default so that quiz questions do not appear in the summary.
- As an author, I want a per-block toggle to include or exclude any block from the PDF so that I have full control.

### Analytics and reporting (P1)
- As an author, I want to see which resources learners opened, including PDFs, and how long they spent so that I know which materials are useful.
- As an author, I want to see video engagement data (play, pause, drop-off point) so that I know where learners disengage.
- As an author, I want aggregate views (how many learners completed a page, opened a resource) so that I can report to leadership.
- As an author, I want per-learner drilldown so that I can support individual learners who are struggling.
- As an author, I want to export analytics as CSV or Excel so that my evaluation team can analyse data in their own tools.

### Dynamic SCORM and version control (P1)
- As an author, I want to update a published course and have learners automatically receive the updated content without replacing the SCORM zip in the LMS so that corrections are instant.
- As an author, I want to choose at each publish whether to push the update to all learners or lock existing learners to their current version so that I control the impact of changes.
- As an author, I want a full publish history with rollback capability so that I can recover from a bad update.

### Translation (P1)
- As an author, I want to generate a translation of my course in any DeepL-supported language so that I can reach learners in their preferred language.
- As an author, I want to review and correct auto-translated content in a side-by-side editor so that clinical terminology is accurate.
- As a learner, I want to select my preferred language at course launch if translations are available so that I learn in my first language.

### Team and platform (P1)
- As a team lead, I want colleagues to log in to a shared workspace so that we maintain one course library.
- As a team member, I want to duplicate an existing course so that I can reuse structures.
- As a self-hoster, I want one-click deploy to Railway or Render so that I can set up Mnemonify without deep server knowledge.
- As a self-hoster, I want documented manual setup steps as an alternative so that I can deploy on any server I choose.

## 7. Requirements

### P0: Must have (cannot ship v1 without)

| # | Requirement | Acceptance criteria (summary) |
|---|---|---|
| P0-1 | Course JSON document model: course > pages > blocks, with course-level variables, block-level triggers | Schema documented in ARCHITECTURE.md; a hand-written JSON file renders correctly in the player |
| P0-2 | Responsive player with built-in design system | Player renders 7 core block types; passes visual check at 375px, 768px, 1280px; no horizontal scrolling on mobile |
| P0-3 | Trigger and variable engine in the player | Supports events (onOpen, onClick, onComplete, onCorrect, onIncorrect, onPageEnter, onTimeReached, onVarChange), actions (SET_VAR, ADJUST_VAR, SHOW/HIDE block, ENABLE/DISABLE block, JUMP_TO_PAGE, OPEN_LIGHTBOX, OPEN_MODAL, SET_STATE, SCORM_COMPLETE, SCORM_SET_SCORE), and conditions (==, !=, >, <, >=, <=, AND/OR) |
| P0-4 | SCORM 2004 3rd Edition export | Exported zip passes SCORM Cloud conformance; reports completion_status, success_status, score; suspend/resume restores page position and all variable values; verified working in Ethos |
| P0-5 | Block editor UI | Add, edit inline, reorder (drag), duplicate, delete blocks; live responsive preview toggle; autosave within 5 seconds of change |
| P0-6 | Trigger builder UI | Author builds any P0-3 trigger through dropdowns only; invalid combinations are impossible to select; triggers display as readable sentences |
| P0-7 | Course library with backend persistence | Courses stored in PostgreSQL via API; create, rename, duplicate, delete; every course record carries an organization_id |

### P1: Should have (fast follows)

| # | Requirement |
|---|---|
| P1-1 | User accounts and shared team workspace (email + password; simple admin/author roles) |
| P1-2 | Additional block types: flashcards, image hotspot, video (upload or embed), audio, divider, quote, button, interactive video |
| P1-3 | Block states (e.g., normal/visited/completed visual states) driven by the trigger engine |
| P1-4 | Standalone web export (non-SCORM zip for hosting anywhere) |
| P1-5 | Course-level settings: accent color, logo, font pairing (curated presets only) |
| P1-6 | Media library per organisation with bulk upload (folder drag-drop or ZIP, 10MB per file, 500MB ZIP limit) and batch carousel assignment |
| P1-7 | Embed block: YouTube, Vimeo, and generic iframe for web pages and survey tools, with per-organisation domain allowlist for security. All embeds render inside the player; no external navigation |
| P1-8 | Image carousel block: ordered image set, per-image captions, swipe/arrow navigation, lightbox-compatible, bulk-assignable from media library |
| P1-9 | Lightbox/modal system: unified in-player modal layer used by image lightbox, PDF viewer, embed viewer, and any custom utility. OPEN_MODAL action in trigger engine. No content ever opens outside the player window |
| P1-10 | Review and commenting: shareable review link (no account required), comments pinned to blocks, threaded replies, resolve/reopen, author notification. PDF generated and viewable during review publish |
| P1-11 | WCAG 2.1 AA conformance target: semantic HTML, full keyboard operability, screen reader support, alt text on all image blocks, sufficient contrast enforced by design system. Pre-publish checklist flags missing alt text, captions, and transcripts. Drag-and-drop interactions excluded from conformance scope and not offered as block types |
| P1-12 | **Pathology track:** Side-by-side compare block. Two images with synchronised pan and zoom; optional independent-toggle mode; captions per side. Built on the shared zoom engine (see Architecture) |
| P1-13 | **Pathology track:** Confidence-weighted knowledge check. Learner selects answer and confidence level (low/medium/high). Both stored as variables for trigger-driven feedback and priority review |
| P1-14 | Templates: any author can save a course as a template (personal or org-shared). Template library view in course library. New course creation offers blank or from-template. Templates carry block structure, trigger logic, design settings, PDF mode setting, and utility bar config; content fields replaced with labeled placeholders |
| P1-15 | Word template export: generate a structured .docx from any template. One table per page, labeled columns (Block Type, Field, Content, Notes). Notes column carries block_id and field name for round-trip import. Cover sheet with import instructions |
| P1-16 | Word storyboard import: upload a Mnemonify-generated .docx, parse labeled rows back to block types, pre-import review screen flags unmapped rows. Always produces a draft, never auto-publishes |
| P1-17 | References block: structured citations (author, title, source, URL, year). Numbered list in player. Included in PDF by default. Excluded from SCORM completion logic |
| P1-18 | PDF as publish-time build artifact: generated automatically on publish (and on review publish). Optional per course or inherited from template. Mode: combined (all pages, one PDF), per-page (one PDF per page), or both. PDFs stored as course assets. Surfaced on optional Resources page at end of course via in-player PDF viewer modal. Knowledge check blocks excluded by default via include_in_pdf flag. Per-block override available |
| P1-19 | Player chrome: hybrid drawer navigation. Top bar (course title, hamburger, optional utility items on desktop). Thin progress bar below top bar. Drawer shows page list (flat or grouped into sections/modules, author chooses per course). Page status icons: not visited, in progress, completed, locked. Continue button at bottom of each page; author can add trigger conditions. Linear or free navigation, set per course or template. Utility items (Contact, Resources, custom) optional per course; Contact opens pre-populated email modal; Resources opens in-player PDF modal. On mobile: utility items in persistent bottom bar (max 4, scrolls horizontally beyond 4); on desktop: utility items in top bar as text links |
| P1-20 | In-player containment (hard architectural rule): all PDFs, URLs, images, and resources open inside the player viewport via the unified modal layer. No link or action ever navigates the learner outside the player window. Applies in SCORM, standalone web, and review contexts |
| P1-21 | Media manager: one active media item at a time per page. Container-aware lifecycle: tabs and accordions pause media on close, resume from saved timestamp on reopen. Audio pauses when scrolled out of view (Intersection Observer). Native browser controls styled to design system. iOS muted autoplay with visible unmute button. Video onComplete is a first-class trigger engine event |
| P1-22 | Interactive video: author places timeline pause points on a video at specific timestamps. At each pause point, an overlay block (question, text, button) renders on top of the video. Video resumes or branches to a different timestamp based on trigger actions. onTimeReached is a trigger event. Full trigger engine available at each pause point |
| P1-23 | Captions and transcripts: Whisper auto-generates draft WebVTT captions on video upload. Author reviews and corrects in a caption editor. Author can upload own WebVTT or SRT to override. Captions rendered via native browser caption track with CC toggle. Transcript (also from Whisper) renders as collapsible panel below video or audio block. WCAG compliance mode (org-level setting) blocks publish if captions or transcripts are missing |
| P1-24 | Analytics telemetry: player fires structured events to Mnemonify backend independently of SCORM. Events: resource opened (which PDF, time spent), video/audio play/pause/scrub/complete/drop-off, block interactions (accordion open, tab switch, carousel advance, lightbox open), page time-on-page, knowledge check attempts with answers and confidence ratings, Continue button clicks, course completion. Events structured as xAPI statements internally. Built-in analytics dashboard (aggregate and per-learner views). CSV/Excel export of any view. Per-learner data visible to org admins and course authors only. Anonymised aggregate view available for leadership sharing |
| P1-25 | Dynamic SCORM: published SCORM zip contains only a thin launcher (HTML + SCORM API communication + Mnemonify content server URL). Course content (JSON, media, player bundle) served from Mnemonify servers. Author chooses at each publish: push to all learners or lock existing learners to current version. Full publish history with rollback. Structural change detection: if a new publish removes pages referenced in a learner's saved progress, player detects mismatch on launch and restarts gracefully with a brief explanation. SCORM tracking data (completion, score, suspend_data) flows directly between learner browser and LMS, unchanged and independent of Mnemonify content server |
| P1-26 | Translation: course content translatable into any DeepL-supported language. Author selects target language, Mnemonify generates draft via DeepL API. Side-by-side review editor; clinical terminology flagged for human review. Spanish first validated language; all DeepL-supported languages available from launch. Language switcher in player top bar appears only if course has at least one published translation. Falls back to default language gracefully if translation is incomplete. Player chrome UI strings localised for each supported language |
| P1-27 | Onboarding: guided first-course walkthrough on first login. Starter template library on first login dashboard. Tooltips and plain-language labels throughout editor. No blank-canvas first experience |

### P2: Future considerations (design for, do not build)

| # | Requirement | Architectural implication now |
|---|---|---|
| P2-1 | Adaptive learning paths (rule-based content release by performance) | Trigger engine conditions support quiz score variables from day one; P2-1 is mostly a UI feature later |
| P2-2 | xAPI LRS connection | Analytics events already structured as xAPI statements (P1-24); LRS connection is a new output module only |
| P2-3 | Hosted multi-tenant SaaS with billing | organization_id on all records from day one (P0-7) |
| P2-4 | ~~Translation/localization~~ **PROMOTED TO P1-26** | - |
| P2-5 | AI-assisted content drafting | None required now |
| P2-6 | Template and starter course gallery (community-shared) | None required now |
| P2-7 | Custom JavaScript block (Storyline-style). Explicitly optional and cuttable: security risk in multi-tenant context. If built: sandboxed, self-hosted-only | Expose player.getVar/setVar API so extension point exists without opening the full runtime |
| P2-8 | **Pathology track, signature feature:** Deep-zoom whole-slide viewer (OpenSeadragon-style). Pan and zoom gigapixel slides; author-placed annotations reveal at set zoom levels | Build P1-12 compare block on shared zoom engine abstraction so deep-zoom is an extension, not a rewrite |
| P2-9 | Gamification presets: points, badges, progress unlocking as pre-wired template patterns | Trigger engine and numeric variables already support all mechanics; P2-9 is a template and UI layer only |
| P2-10 | Google Classroom integration: push course link as assignment via Classroom API | None required now; Mnemonify courses already run in browser without an LMS |
| P2-11 | Lesson plan, handout, and worksheet generation from course content | Word export pipeline (P1-15) is the foundation; extend to teacher-facing document formats |

## 8. Success Metrics

Leading (first 90 days after any public release):
- Time to first published course for a new user: under 60 minutes (target), under 30 (stretch)
- SCORM conformance pass rate on SCORM Cloud: 100%
- Percentage of test courses usable on mobile without author fixes: 100%
- Percentage of new users who complete the onboarding flow and publish at least one course: target 60%

Lagging (post open source launch):
- External self-host deployments and GitHub stars/forks as adoption signals
- At least one outside contributor PR merged within 6 months of public release
- Hosted version (if launched) covers its own hosting costs

During development, the practical metric per phase is: the phase acceptance criteria pass, verified by Sebastin manually and in SCORM Cloud where applicable.

## 9. Constraints

- Built and maintained by a non-technical owner using Claude Code; therefore documentation quality and architectural simplicity are hard requirements, not nice-to-haves.
- Developed on personal time, personal hardware, and a personal GitHub account, with no employer content or work product included. Owner to review employment agreement IP clause before public release.
- SCORM target is fixed: SCORM 2004 3rd Edition (Ethos requirement).
- Stack: React + Vite frontend, Node.js backend, PostgreSQL. Runs locally during development; AWS later.
- License: AGPL-3.0, added to the repository at project start.

## 10. Phasing

| Phase | Deliverable | Definition of done |
|---|---|---|
| 1 | JSON schema + responsive player | Hand-written sample course renders responsively with 7 core block types (text, heading, image, list, accordion, tabs, knowledge check). Keyboard accessibility verified on Safari and Chrome. Print CSS stub added. **COMPLETE** |
| 2 | Dynamic SCORM 2004 3rd Ed wrapper | Thin launcher zip passes SCORM Cloud; completion, score, suspend/resume verified; content served from Mnemonify dev server; tested in Ethos |
| 3 | Block editor + templates + Word import/export + bulk image upload + onboarding | Author builds Phase 1 sample course in UI; saves as template; exports Word .docx; re-imports it; bulk-uploads 30 images into carousel; guided onboarding walkthrough completes without errors |
| 4 | Trigger and variable engine + trigger builder UI + player chrome + media manager | Author builds a branching course through dropdowns only; player chrome renders with hybrid drawer, Continue button, linear nav; one-active-media rule verified with two videos in tabs |
| 5 | States, expanded block types, interactive video, captions, translation, PDF artifact, analytics, in-player containment | All P1-2 through P1-27 complete; 4-case pathology course with interactive video, auto-captions, Spanish translation, and PDF summary on Resources page passes full manual QA |
| 6 | Accounts, shared library, review and commenting, deployment docs | Team of 5 in shared workspace; reviewer completes comment round; one-click deploy to Railway verified by a non-technical tester; manual self-host guide also tested |
| 7 | Pathology signature: deep-zoom whole-slide viewer (P2-8) | Learner pans/zooms tiled slide; annotations reveal at zoom levels; reuses Phase 5 zoom engine |

Accessibility (P1-11) is a build practice, not a phase. Semantic HTML, keyboard operability, and alt text fields are implemented from Phase 1, with a formal WCAG AA audit before public release.

Phases 5 and 7 form the pathology differentiation wedge. No free tool or AI generator currently offers this combination.

## 11. Open Questions

1. **(Legal, blocking before public release)** Does Sebastin's employment agreement contain an IP assignment clause covering personal projects? Confirm before open-sourcing.
2. **(Product) CLOSED.** Project name is Mnemonify. Domains mnemonify.org and mnemonify.app registered. Business email active. GitHub org: MnemonifyOrg.
3. **(Product) CLOSED.** Phase 1 block set confirmed: text, heading, image, list, accordion, tabs, knowledge check (7 types). All implemented and keyboard-verified.
4. **(Technical, resolve in Phase 2)** Ethos-specific SCORM quirks and dynamic content serving: verify Ethos allows content loaded from an external URL inside the SCORM launcher. Test with a minimal package early.
5. **(Product, resolve by Phase 6)** Hosted version pricing model, if any: donations, flat nominal fee, or free with paid support.

## 12. Out-of-Scope Parking Lot

Ideas raised and deliberately deferred: AI content generation, PowerPoint import, collaborative real-time editing, discussion/social blocks, LTI integration, drag-and-drop interaction blocks (excluded partly for accessibility reasons).

Bigger future bets noted but not scheduled: spaced-repetition of missed concepts across SCORM sessions (courses that remember the learner), content-graph model where a concept updated once propagates to every course referencing it (living courses rather than static documents), deep-zoom whole-slide pathology viewer (scheduled as Phase 7).
