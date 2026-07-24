# Product Requirements: Mnemonify

**Version:** 0.5 (In development)
**Owner:** Sebastin
**Status:** Phases 1, 2, 3 complete (brand applied, bug fixes complete)
**License intent:** AGPL-3.0, open source
**Last updated:** July 14, 2026

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
7. **LTI 1.3 integration, student rosters, and gradebooks.** These are the K-12 and higher-ed LMS integration path (Canvas, Schoology, Google Classroom). Each is a project, not a feature, and building them means building a sliver of an LMS. Mnemonify is an authoring tool. Anonymous share links (P2-24) serve the classroom use case without this scope.
8. **Named per-student result storage.** Storing student names alongside their answers is FERPA and COPPA territory in US K-12: data retention policy, parental consent, district procurement review. This is a legal and policy decision, not an engineering one. Analytics stays hashed-learner and aggregate. The reflection block (P1-46) stores nothing at all, by design.
9. **Teacher-paced live mode / peer instruction.** Requires a real-time synchronous architecture fundamentally different from asynchronous SCORM delivery. Deliberately out of scope.

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

### Layout and editor (P0/P1)
- As a pathology educator, I want a two-column layout block so that I can show clinical information on the left and a WSI embed on the right, the same layout I currently build in Storyline.
- As a pathology educator, I want to resize the two columns by dragging a divider so that I can control the balance between text and image area.
- As an author, I want the two-column layout to automatically stack on mobile so that the course stays readable on phones with no extra effort.
- As a pathology educator, I want the left and right slots of a two-column block to accept text, image, or embed blocks so that I can combine clinical narrative with a WSI viewer or static image.
- As an author, I want a table block for structured data like lab results so that CBC values and reference ranges display correctly.
- As an author, I want to move or copy a block to a different page so that I can restructure a course without rebuilding blocks from scratch.
- As an author, I want to save a whole page as a reusable page template so that a standard case page layout can be applied to new pages in one click.
- As an author, I want to add images to the question stem, answer options, and feedback fields of a knowledge check so that learners can identify pathology in an image as part of a question.
- As an author, I want superscript and subscript formatting in text blocks so that I can write pathology notation correctly (e.g., 5.2 x 10³, del(5q)).

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
| P0-8 | **Two-column layout block (promoted from P1 after reviewing CAP storyboard format):** A container block with left and right slots. Each slot accepts one inner block: text, heading, image, or embed. Column split ratio stored as a percentage (e.g., 40/60) adjusted by a draggable divider between columns. On mobile (below 768px) columns stack automatically, left first. The right slot is where DigitalScope WSI embeds live next to clinical narrative text. This layout is the primary screen pattern in CAP pathology courses and is required before any CAP course can be authored in Mnemonify | Two-column block renders correctly at 375px (stacked), 768px (side by side at 50/50), and 1280px (at custom split ratio); dragging the divider updates the ratio live; embed block in right slot renders DigitalScope URL inside sandboxed iframe |

### P1: Should have (fast follows)

| # | Requirement |
|---|---|
| P1-1 | User accounts and shared team workspace (email + password; simple admin/author roles) |
| P1-2 | Additional block types: video (upload or embed), audio, divider, quote, button, interactive video, flashcards (P1-59), matching (P1-60), ordering (P1-61), image hotspot (P1-62) |
| P1-51 | **Rich text formatting consistency:** every text-editable field across all block types (accordion, tabs, table cells, KC fields) gets the same formatting toolbar available elsewhere (bold/italic/underline at minimum), so authors never discover formatting is silently unavailable in one block but not another. Table cells specifically gain bold/italic in addition to the existing superscript/subscript |
| P1-52 | **Accordion and tabs bodies contain nested blocks, not plain rich text:** accordion items and tab bodies are restructured to hold an array of inner blocks (text, heading, image), the same container pattern already used by the two-column block (ARCHITECTURE.md Section 3.6). This lets authors add images, additional paragraphs, or a mix of content inside an accordion item or tab, rather than being limited to a single rich-text field. This is a schema and rendering change to both blocks, done once, consistently, rather than a special-cased fix |
| P1-53 | **Table paste-in:** authors can copy a block of cells from Excel, Google Sheets, or Word (tab-separated / newline-separated data) and paste directly into a table block, filling multiple cells in one action instead of typing cell by cell. Pasting a grid larger than the current table auto-expands rows/columns as needed |
| P1-54 | **Curated text color palette:** heading and text blocks gain an optional text color control limited to a small pre-approved palette (4-6 swatches drawn from the design system, each pre-verified to pass WCAG AA contrast against the standard light and dark backgrounds). This is deliberately not an open color picker — preventing low-contrast combinations is a conscious design system constraint, not an oversight |
| P1-3 | Block states (e.g., normal/visited/completed visual states) driven by the trigger engine |
| P1-55 | **Self-owned block visibility rule (real-user finding, Phase 4):** every block gets its own "Show this block only if [condition]" rule, authored directly on that block's own settings — independent of any other block's trigger. This coexists with the existing SHOW_BLOCK/HIDE_BLOCK trigger actions (another block can still target it), giving authors two ways to control visibility: from the block's own perspective, or from a triggering block's perspective. Added because usability testing by an experienced instructional designer (with Storyline/Captivate/dominKnow background) found the trigger-only model counter-intuitive — the natural expectation is "I control when I appear," not "I must find whichever other block might affect me" |
| P1-56 | **Custom block labels:** every block can be given an optional author-set name (e.g. "Diagnosis Reveal", "Case 1 Slide Photo") shown in every dropdown that references blocks by name (trigger target pickers, visibility rule pickers, move/copy-to-page pickers). Falls back to "{Block Type} ({position})" (e.g. "Image (3)") when unset. Directly motivated by real confusion once a course has several blocks of the same type |
| P1-57 | **Player settings tab:** a dedicated "Player" tab in the course settings area (alongside Course/Page/Variables), consolidating everything about the player chrome and its optional utility items into one discoverable place: Contact toggle + email/subject config, Resources toggle, custom menu items (label + action). Replaces having this configuration buried inside general course meta with no clear settings home |
| P1-58 | **Manually attached course resources (distinct from the auto-generated PDF pipeline, P1-18/19):** authors can upload arbitrary files (PDF, Word, Excel, ZIP, and similar common document types) as course-level resources via the Player settings tab. These are simple author-attached downloads, not the auto-generated course summary PDF planned for Phase 5 — the two features are independent and can both exist. The player's Resources button (utility bar) opens a modal listing every attached resource with its filename and a download action, using the in-player containment pattern already established (no navigating away from the player to download). File type allowlist for security: pdf, doc, docx, xls, xlsx, ppt, pptx, zip, txt. Executable and script file types are always rejected regardless of extension spoofing (validate by MIME type, not just extension). Reasonable size limit per file (e.g. 50MB) |
| P1-4 | Standalone web export (non-SCORM zip for hosting anywhere) |
| P1-5 | Course-level settings: accent color, logo, font pairing (curated presets only) |
| P1-6 | **Image Library** (renamed from "Media Library" for scope honesty — it manages images only; video and audio are uploaded and managed on their own block's settings panel, not here) per organisation with bulk upload (folder drag-drop or ZIP, 10MB per file, 500MB ZIP limit) and batch carousel assignment |
| P1-7 | Embed block: YouTube, Vimeo, and generic iframe for web pages and survey tools, with per-organisation domain allowlist for security. All embeds render inside the player; no external navigation |
| P1-8 | Image carousel block: ordered image set, per-image captions, swipe/arrow navigation, lightbox-compatible, bulk-assignable from media library |
| P1-9 | Lightbox/modal system: unified in-player modal layer used by image lightbox, PDF viewer, embed viewer, and any custom utility. OPEN_MODAL action in trigger engine. No content ever opens outside the player window. **Image lightbox includes pan and zoom:** zoom in/out controls, scroll-wheel or pinch-to-zoom, click-drag to pan when zoomed. Applies to standalone image blocks and every image within a carousel block. When opened from a carousel, the lightbox also displays that image's caption/description and Previous/Next navigation so the learner can zoom through the set without closing the modal; zoom level resets on navigating to a different image or closing the modal. This is a lightweight pan/zoom on a static image, distinct from the deep-zoom tiled whole-slide viewer (P2-8, Phase 7) |
| P1-10 | Review and commenting: shareable review link (no account required), comments pinned to blocks, threaded replies, resolve/reopen, author notification. PDF generated and viewable during review publish |
| P1-11 | WCAG 2.1 AA conformance target: semantic HTML, full keyboard operability, screen reader support, alt text on all image blocks, sufficient contrast enforced by design system. Pre-publish checklist flags missing alt text, captions, and transcripts. Drag-and-drop interactions excluded from conformance scope and not offered as block types |
| P1-12 | **Pathology track:** Side-by-side compare block. Two images with synchronised pan and zoom; optional independent-toggle mode; captions per side. Built on the shared zoom engine (see Architecture) |
| P1-13 | **Pathology track:** Confidence-weighted knowledge check. Learner selects answer and confidence level (low/medium/high). Both stored as variables for trigger-driven feedback and priority review |
| P1-14 | Templates: any author can save a course as a template (personal or org-shared). Template library view in course library. New course creation offers blank or from-template. Templates carry block structure, trigger logic, design settings, PDF mode setting, and utility bar config; content fields replaced with labeled placeholders |
| P1-15 | Word template export: generate a structured .docx from any template. One table per page, labeled columns (Block Type, Field, Content, Notes). Notes column carries block_id and field name for round-trip import. Cover sheet with import instructions |
| P1-16 | Word storyboard import: upload a Mnemonify-generated .docx, parse labeled rows back to block types, pre-import review screen flags unmapped rows. Always produces a draft, never auto-publishes |
| P1-17 | ~~References block~~ **PARKED — see P3-2.** Deferred deliberately: entering structured citation fields (author, title, source, URL, year) one at a time is real author friction for content that's typically already proofread and formatted by the ID/author elsewhere (e.g. in Storyline or Rise today, references are simply pasted into a text block). A plain text block already solves this. Revisit only if real usage shows a structured references block adds value beyond copy/paste |
| P1-18 | PDF as publish-time build artifact: generated automatically on publish (and on review publish). Optional per course or inherited from template. Mode: combined (all pages, one PDF), per-page (one PDF per page), or both. PDFs stored as course assets. Surfaced on optional Resources page at end of course via in-player PDF viewer modal. Knowledge check blocks excluded by default via include_in_pdf flag. Per-block override available |
| P1-19 | Player chrome: hybrid drawer navigation. Top bar (course title, hamburger, optional utility items on desktop). Thin progress bar below top bar. Drawer shows page list (flat or grouped into sections/modules, author chooses per course). Page status icons: not visited, in progress, completed, locked. Continue button at bottom of each page; author can add trigger conditions. Linear or free navigation, set per course or template. Utility items (Contact, Resources, custom) optional per course; Contact opens pre-populated email modal; Resources opens in-player PDF modal. On mobile: utility items in persistent bottom bar (max 4, scrolls horizontally beyond 4); on desktop: utility items in top bar as text links |
| P1-20 | In-player containment (hard architectural rule): all PDFs, URLs, images, and resources open inside the player viewport via the unified modal layer. No link or action ever navigates the learner outside the player window. Applies in SCORM, standalone web, and review contexts |
| P1-21 | Media manager: one active media item at a time per page. Container-aware lifecycle: tabs and accordions pause media on close, resume from saved timestamp on reopen. Audio pauses when scrolled out of view (Intersection Observer). Native browser controls styled to design system. iOS muted autoplay with visible unmute button. Video onComplete is a first-class trigger engine event |
| P1-22 | Interactive video: author places timeline pause points on a video at specific timestamps. At each pause point, an overlay block (question, text, button) renders on top of the video. Video resumes or branches to a different timestamp based on trigger actions. onTimeReached is a trigger event. Full trigger engine available at each pause point |
| P1-23 | Captions and transcripts: Whisper auto-generates draft WebVTT captions on video upload. Author reviews and corrects in a caption editor. Author can upload own WebVTT or SRT to override. Captions rendered via native browser caption track with CC toggle. Transcript (also from Whisper) renders as collapsible panel below video or audio block. WCAG compliance mode (org-level setting) blocks publish if captions or transcripts are missing |
| P1-24 | Analytics telemetry: player fires structured events to Mnemonify backend independently of SCORM. Events: resource opened (which PDF, time spent), video/audio play/pause/scrub/complete/drop-off, block interactions (accordion open, tab switch, carousel advance, lightbox open), page time-on-page, knowledge check attempts with answers and confidence ratings, Continue button clicks, course completion. Events structured as xAPI statements internally. Built-in analytics dashboard (aggregate and per-learner views). CSV/Excel export of any view. Per-learner data visible to org admins and course authors only. Anonymised aggregate view available for leadership sharing |
| P1-25 | Dynamic SCORM: published SCORM zip contains only a thin launcher (HTML + SCORM API communication + Mnemonify content server URL). Course content (JSON, media, player bundle) served from Mnemonify servers. Author chooses at each publish: push to all learners or lock existing learners to current version. Full publish history with rollback. Structural change detection: if a new publish removes pages referenced in a learner's saved progress, player detects mismatch on launch and restarts gracefully with a brief explanation. SCORM tracking data (completion, score, suspend_data) flows directly between learner browser and LMS, unchanged and independent of Mnemonify content server |
| P1-26 | ~~Translation~~ **PARKED — see P3-1.** Deferred deliberately: separable from all other Phase 5 work, carries an ongoing per-language API cost, and its real requirements (which languages matter, how much clinical-terminology review is actually needed) are better answered by real beta usage data than guessed now. Revisit after beta testing with real users on the base product |
| P1-27 | Onboarding: guided first-course walkthrough on first login. Starter template library on first login dashboard. Tooltips and plain-language labels throughout editor. No blank-canvas first experience |
| P1-28 | **Table block:** Author-built data table with configurable rows and columns. Header row optional. Cell content is plain text (no nested blocks). Renders as a responsive HTML table in the player; on narrow screens, scrolls horizontally rather than breaking layout. Required for CBC results, lab value tables, and similar structured data in pathology cases |
| P1-29 | **Move or copy block between pages:** Author can select any block in the editor and move it to a different page, or copy it to one or more pages. Context menu or drag-to-page-list interaction. Block retains its trigger logic and settings |
| P1-30 | **Page templates:** Author can save any page as a named page template (personal or org-shared). Applying a page template inserts a copy of that page's block structure (with placeholder content) at the current position. Separate from course templates; a page template is a reusable single-page layout pattern |
| P1-31 | **Images in knowledge check:** Author can add an image (from media library) to the question stem, to individual answer option labels, and to correct and incorrect feedback sections. Images in answer options render as image + text label pairs. Useful for "what do you see in this image?" diagnostic questions |
| P1-32 | **Superscript and subscript text formatting:** Available in text blocks, heading blocks, and knowledge check fields. Required for pathology notation (e.g., 5.2 x 10³, del(5q), H₂O). Rendered using HTML sup and sub elements |
| P1-33 | **AI storyboard converter (Phase 5, optional/power-user):** Author uploads an existing CAP-format Word storyboard (.docx, either HPATH table format or NP narrative format). The server sends it to the Claude API, which reads the content, maps sections to Mnemonify block types, and returns a draft course JSON. Requires an API key configured at org level. Handles ambiguous, complex, or narrative-heavy documents that the rule-based importer (P1-34) cannot. Draft opens in the editor for author review; never auto-publishes |
| P1-34 | **Smart Import: rule-based Word importer (Phase 5, free for everyone, no API required).** Built into Mnemonify using mammoth.js (already in stack). Parses any uploaded .docx by semantic structure and maps to blocks: Heading 1/2/3 styles → heading blocks at matching level; normal paragraphs → text blocks; bulleted lists → list blocks; numbered lists → ordered list blocks; Word tables → table blocks; embedded images → image blocks extracted and saved as assets in position; 3+ consecutive images → carousel block; a bold or heading paragraph followed by A./B./C./D. lettered options → knowledge check block; paragraphs after a "Correct answer:" label → correct feedback. Optional explicit author hints: if the document contains `[[Accordion]]`, `[[Tabs]]`, `[[Two Column]]` etc. before a section, the parser treats it as authoritative and builds that block type without guessing. Shares the same pre-import review screen and draft-creation flow as P1-33. Author chooses "Smart Import" (free) or "AI Import" (needs API key) at upload |
| P1-35 | **Answer-level feedback per option (schema now, UI Phase 5):** Every knowledge check answer option supports its own optional feedback object with rich text, an image (asset_id), and reference links, in addition to the block-level correct/incorrect feedback. In medical education the learning happens in the distractors; learners need to know why each attractive alternative is wrong. Matches the CAP HPATH storyboard structure where every ancillary study option carries its own detailed explanation |
| P1-36 | **Faculty notes (schema now, UI Phase 5/6):** Any block can carry an optional `faculty_notes` rich-text field. Never rendered to learners in any player context. Visible in the editor, in review mode, and included in the instructor guide export. Replaces the common workaround of keeping teaching logic in separate Word docs or email threads |
| P1-37 | **Course objectives and standards tagging (schema foundation; authoring and objective-driven selection are specified in P1-68):** Course meta carries an optional `objectives` array and blocks can carry `objective_ids`. The earlier schema hook remains backward compatible; P1-68 defines the author-facing objective model and mapping workflow. |
| P1-38 | **Course concepts (schema now, UI later):** Course meta carries a `concepts` array of `{ concept_id, name }`. Blocks, images, questions, and feedback can each carry a `concept_ids` array. Enables concept-level analytics and remediation later without a schema migration |
| P1-39 | **Version change notes:** The `course_versions` table gains a `change_notes` text field. At publish, the author is prompted for a brief plain-language summary of what changed ("Fixed Case 3 diagnostic criteria"). Displayed in publish history. Required for accreditation audits and reviewer signoff |
| P1-40 | **Course-wide header and footer:** Course meta carries optional `header` and `footer` rich-text fields. Rendered on every page in the player (footer typically a copyright line, e.g. "© 2026 College of American Pathologists"). Included in PDF export. Among the most repeated unmet requests in the Rise community |
| P1-41 | **Duplicate knowledge check question:** One-click duplicate of a knowledge check block including all options, feedback, and answer-level feedback, with new block_id and option ids. Long-standing unmet request across Rise and iSpring |
| P1-42 | **Media library folders and multi-select delete:** Assets can be organised into named folders per course or per organisation. Multi-select checkboxes support bulk delete and bulk move. Cited as a real gap in dominKnow and Rise |
| P1-43 | **Global find and replace:** Search across all text content in a course (all blocks, all pages, all fields) and optionally replace. Results list shows page, block type, and surrounding context before replacing. A long-standing unmet Storyline request |
| P1-44 | **Page auto-numbering:** Optional course setting that displays page numbers in the nav drawer and optionally in the player chrome ("Page 3 of 12"). Automatically recalculates on page add, delete, or reorder. Storyline's oldest publicly unfulfilled feature request (10+ years) |
| P1-45 | **Table captions (accessibility):** Table blocks carry an optional `caption` field, rendered as a proper HTML `<caption>` element programmatically associated with the table so screen reader users navigating by table know what each table contains. Listed as an open accessibility gap in Rise's own published maturity plan |
| P1-46 | **Reflection block (local storage only):** A learner-response block with a prompt and a free-text textarea. Learner types a reflection; text is held in browser memory for the session only. Never transmitted to the Mnemonify backend, never written to SCORM suspend_data, never stored server-side. This is a deliberate privacy decision: free-text learner input is a different data category from click telemetry, and local-only storage avoids FERPA and COPPA exposure entirely. Author sets the prompt text; no author-visible responses. Learner can copy their own text out if they wish |
| P1-47 | **Text-to-speech on text blocks:** A speaker button on any text, heading, or list block reads the content aloud using the browser's built-in SpeechSynthesis API. No server call, no API key, no cost. Supports differentiation and accessibility for learners who prefer or need audio |
| P1-48 | **Worksheet export (print mode):** A third PDF export mode alongside combined and per-page. Worksheet mode strips interactivity and prints knowledge check questions with blank answer lines for handwritten completion, includes reflection prompts with blank space, and omits feedback and answer keys. Reuses the existing Puppeteer pipeline |
| P1-49 | **Non-drag interaction block types:** Matching (via dropdown selection per item), Ordering (via up/down buttons per item), and Image Hotspot (click regions). These deliver the pedagogy of drag-and-drop interactions while remaining fully keyboard operable and WCAG 2.1 AA conformant, consistent with the permanent exclusion of drag-and-drop interactions (see Non-Goals) |
| P1-59 | **Flashcards block, fully specced:** a simple deck — one card visible at a time, click/tap to flip between front and back, Previous/Next arrows to move through the deck. Each card's front and back support rich text and an optional image. Deck shows a position indicator ("Card 3 of 12"). No scoring/correctness — this is a study aid, not an assessment. Keyboard operable: Enter/Space flips the focused card, arrow keys or Tab-reachable buttons navigate the deck |
| P1-60 | **Matching block, fully specced:** a fixed left column of prompt items, each paired with a dropdown on the right listing all possible answer options (shuffled). Author defines the correct pairing per prompt. A Submit button checks all pairs at once; after submitting, each row shows correct/incorrect feedback (matching the existing knowledge-check visual pattern) and the block reports a score (number of correct pairs / total) into the trigger engine the same way a knowledge check does. Author can allow retry (course-level or block-level setting, consistent with existing KC retry patterns if any exist — otherwise default to allow retry) |
| P1-61 | **Ordering block, fully specced:** a vertical list of items presented in shuffled order. Each item has Up/Down buttons (and corresponding keyboard support) to move it within the list. A Submit button checks the final sequence against the author-defined correct order. Scoring is partial credit: score = number of items in their correct position / total items, reported to the trigger engine the same way a knowledge check score is. Feedback after submit highlights which positions are correct/incorrect (not just a single pass/fail) |
| P1-62 | **Image Hotspot block, fully specced:** author uploads an image and draws one or more rectangular regions on it (author-facing editor: click-drag to define each rectangle's position and size as percentages of the image, so it stays responsive). Each region has: a label/tooltip content (rich text, shown on click), and a mode flag. Author picks the block's mode: **Exploratory** (every region simply reveals its content on click, no correct/incorrect, good for labeling a diagram) or **Quiz** (each region is flagged correct or incorrect by the author; the block tracks which correct/incorrect regions the learner has clicked, similar in spirit to a knowledge check, useful for "find the abnormality" prompts). Regions are keyboard-reachable (Tab order follows region definition order) and Enter/Space activates a focused region, in addition to mouse/touch click. Rectangle regions only in v1 (no circle or freeform polygon) |
| P1-63 | **LMS publish settings (real-user-driven, matches standard authoring-tool practice — Storyline, Captivate):** course-level settings, exposed in the Player/Course settings area: **Completion criteria** ("Viewed all pages" / "Passed the assessment" / "Either"); **Report status to LMS as** ("Completion only" / "Success only" / "Both", matching SCORM's completion_status and success_status being independently reportable); **Passing score %** — only shown/relevant when at least one scored interaction exists in the course and "Success" reporting is enabled. If no interaction is marked Scored anywhere in the course, success/passing criteria simply don't apply — completion-only reporting is used |
| P1-64 | **Scored vs. Unscored toggle, per interaction block:** every knowledge check, matching, ordering, and hotspot-quiz-mode block gets a Scored/Unscored setting (default: Scored, matching existing implicit behavior). An Unscored interaction still shows the learner correct/incorrect feedback exactly as normal — it is simply excluded from the aggregate score tally used for LMS success/passing determination. This lets authors include practice/ungraded interactions alongside graded ones without them affecting the passing score |
| P1-65 | **System score variables (author-readable, not author-editable):** the player automatically maintains a small set of reserved variables reflecting real-time aggregate scoring across every Scored interaction in the course, regardless of how many pages or modules they're scattered across: `ScoreRaw` (count correct), `ScoreMax` (count of all scored items), `ScorePercent` (0-100), `ScorePassed` (boolean, once a passing score % is configured). These names are reserved — an author cannot create a custom variable with the same name (validation error if attempted). Unlike author-created variables, these cannot be set via SET_VAR; they update automatically as scored interactions are answered anywhere in the course |
| P1-66 | **Live variable interpolation in rich text:** any text field (text block, heading, knowledge-check feedback, etc.) can contain a live reference to a variable — author-created or system (P1-65) — which renders as that variable's current value at runtime, updating reactively as the value changes. This is what makes a "Results Summary" page possible: an author builds an ordinary page with a heading ("Your Score") and a text block containing "{ScorePercent}}% ({ScoreRaw} of {ScoreMax} correct)" — no dedicated Results block type needed, this is just an authoring capability layered onto the existing rich-text/variable system |
| P1-67 | **Question banks:** a reusable pool of interchangeable questions (initially knowledge-check-shaped: question, options, feedback, Scored/Unscored), stored at the course level. A "Question Bank" block placed on any page references a bank and a draw count (e.g. "5 of 10"); at course launch, that many questions are randomly selected from the bank for that learner's attempt, staying stable across page revisits within the same session (seeded once per attempt, not re-randomized on every visit). The same bank can be drawn from at multiple points in a course (e.g. a per-case quiz and a cumulative final assessment both pulling from banks), supporting reuse across a module or the whole course |
| P1-68 | **Course learning objectives and objective-to-question mapping:** An `Objectives` course-level panel/tab lets authors create, edit, and delete optional objectives, each with an `objective_id`, required `label`, and optional `description`. Module/group settings expose an optional multi-select of those objectives, and the knowledge-check/question-bank question editor exposes the same multi-select so one question can assess multiple objectives. A Question Bank draw inserted into a module with assigned objectives filters its eligible pool to questions matching at least one assigned objective. If that filtered pool is smaller than the requested draw count, the author is prompted at that insertion point to either draw fewer questions or include unmapped questions to fill the remainder. The choice is local to that draw insertion, never a course-wide or bank-wide default. Courses with no objectives, unassigned modules, or untagged questions retain the existing Question Bank behavior. All fields are optional and existing courses without objectives behave exactly as they do today. |
| P1-69 | **Multi-select knowledge check:** Knowledge checks can be configured as "select all that apply" with all-or-nothing scoring. Authors choose multiple correct options and either summary or per-option feedback; existing single-select knowledge checks remain backward compatible. |
| P1-70 | **Named version history:** Authors can manually save named snapshots of a course and restore any snapshot. Restoring creates a new version and never deletes or rewrites existing history; auto-versioning and diffing are out of scope. |
| P1-71 | **Searchable shareable glossary:** A course may attach one library glossary and add course-specific terms. Authors confirm suggested links in course text; learners get term tooltips and a searchable panel containing the combined attached and course-specific glossary. |
| P1-72 | **Question bank editor redesign:** The question-bank editor uses a large master-detail modal instead of a cramped side panel, with question search/filtering and bulk delete/objective/tag assignment within one bank. |
| P1-73 | **Question bank export/import:** Authors can export a bank as full-fidelity Mnemonify JSON or an interoperability format such as QTI/GIFT, and import by merging into an existing bank or creating a new one. Missing objectives and variables are reported explicitly and never auto-created. |
| P1-74 | **Linked question-to-bank:** A page question/block and a bank entry can reference one shared entity. Add-to-bank and drag-to-bank create the link; edits require confirmation before propagating; deletion offers unlink or delete-everywhere. The linking model applies to all registered block types and is fully linked or unlinked, never partially linked. |
| P1-50 | **Traditional SCORM ZIP export mode:** Alongside the dynamic launcher (P1-25), authors can publish a fully self-contained SCORM 2004 3rd Ed package with the player bundle, course JSON, and all assets inside the zip. No dependency on Mnemonify servers at learner launch. Required for locked-down LMS environments that block externally loaded content. Author chooses mode at publish; dynamic remains the default and the strategic differentiator |

### P1-69 — Multi-select knowledge check

**Problem:** Authors need a "select all that apply" question type where multiple options can be correct, while preserving the current single-select radio behavior for existing courses.

**Authoring requirements:**

- The knowledge-check settings expose a `Select all that apply` toggle. It defaults off.
- With the toggle off, the existing single `correct_option_id` authoring flow and radio controls remain unchanged.
- With the toggle on, answer options use checkboxes and the author can mark any number of options as correct.
- A `Feedback style` setting appears only for multi-select questions, with `Summary` and `Per-option` choices. The default is `Summary`.

**Player and scoring requirements:**

- Learners see checkboxes for multi-select questions and may submit any selected set.
- Scoring is all-or-nothing: the learner receives full credit only when the selected option-id set exactly equals the configured correct set. There is no partial credit.
- Summary feedback reports the overall result as correct or incorrect.
- Per-option feedback marks each option's learner-selected and author-correct status after submission, while still reporting one overall correct/incorrect result for scoring.
- A scored multi-select question contributes one interaction to `ScoreMax` and contributes one point to `ScoreRaw` only when the exact set is correct. An unscored question behaves identically for feedback but does not affect aggregate scoring.
- Variable interpolation, question-bank draws, resume state, and objective mapping use the same paths and identity rules as single-select knowledge checks.

**Out of scope:** partial credit, minimum/maximum selection rules, and new answer-shuffling constraints.

### P1-70 — Named version history

**Problem:** Authors need named draft/alpha/beta/gold/final snapshots that can be restored without losing the intervening work or prior history.

**Functional requirements:**

- A `Version History` toolbar action opens a modal listing saved versions with name, timestamp, and author.
- `Save as version` prompts for a required author-chosen name and stores an immutable snapshot of the current course JSON and associated versioned assets.
- Saving is manual only. Autosave and ordinary editing do not create named versions.
- Restoring a version replaces the current editable course state with that snapshot and immediately creates a new history entry identifying the restore source. The restored source and every intervening version remain browsable.
- A restored version can itself be renamed/saved again as a new version; no history row is overwritten or silently archived.
- Version permissions follow course author/editor permissions, and published learner assignments continue to follow the existing publish/version-assignment rules.

**Out of scope:** visual or field-level diffing, auto-versioning, and destructive history cleanup.

### P1-71 — Searchable shareable glossary

**Problem:** Authors need a reusable vocabulary that can be connected to course text and explored by learners without silently changing authored content.

**Authoring requirements:**

- Glossaries are library assets. A course may attach zero or one library glossary.
- Authors can add, edit, and delete course-specific terms independently of the attached library glossary.
- A course-specific term can be explicitly published/shared into the organisation's glossary library; sharing is an author action, not an automatic side effect.
- The authoring UI scans rich-text content for matching attached-library or course-specific terms and presents link suggestions with the affected location and definition. No suggestion is linked until the author accepts it; the author can reject individual suggestions.
- Accepted links are represented as rich-text glossary references, not as raw text syntax, so later edits can preserve term identity.

**Learner requirements:**

- A linked term shows a quick definition preview on hover or keyboard focus.
- Activating the term opens the in-player glossary panel, which provides a searchable list of all terms from the attached library plus course-specific terms.
- Glossary definitions use the existing rich-text rendering and sanitization rules. The glossary panel and tooltip never navigate the learner outside the player.

**Out of scope:** attaching more than one library glossary to a course and silent automatic linking.

### P1-72 — Question bank editor redesign

**Problem:** The current question-bank side panel does not provide enough room for authoring or managing a substantial bank.

**Functional requirements:**

- Replace the side-panel bank editor with a large modal overlay; the page editor remains visible but dimmed behind it.
- Use a master-detail layout: the left pane lists bank questions and the right pane renders the existing full-size knowledge-check authoring fields for the selected question.
- The question list supports text search and filters for question type and objective tag.
- Multi-select supports bulk delete and bulk assignment/removal of objectives and author-defined tags for the selected questions.
- Existing add, edit, remove, reorder, image, feedback, Scored/Unscored, and question-bank draw behavior remains available.
- The modal is keyboard operable and preserves unsaved edits according to the existing editor autosave/dirty-state rules.

**Out of scope:** searching across multiple banks and bulk actions spanning multiple banks.

### P1-73 — Question bank export/import

**Export requirements:**

- Each bank can be exported as native Mnemonify JSON containing the bank metadata, stable question ids, all rich text and media references, scoring state, objectives, tags, and other supported fields.
- Each bank can also be exported in a standard interoperability format selected by the author, initially QTI or GIFT as supported by the implementation. The export must clearly indicate when Mnemonify-only fields cannot be represented.

**Import requirements:**

- The author chooses whether to merge imported questions into an existing target bank or create a new bank before committing the import.
- Import uses a review step that shows the questions to be added, the target bank, any id collisions, and all unresolved references.
- If questions reference objectives or variables absent from the target course, the review lists each missing objective/variable by name and location. The author can correct or cancel the import; the system never silently drops a reference or auto-creates a missing object.
- Native Mnemonify imports preserve all fields supported by the source version. Standard-format imports map what the format supports and report lossy or unsupported fields before commit.
- Imported question ids are made unique within the target course; existing questions are not silently overwritten.

**Out of scope:** automatic objective/variable creation and a guarantee that standard-format exports can round-trip every Mnemonify field.

### P1-74 — Linked question-to-bank

**Functional requirements:**

- An author can link a page block to a bank through an `Add to bank` action on the block or by dragging the block into a bank target in the bank side panel. Both actions use the same link-creation operation.
- A linked entity has one canonical content and identity. It can be used on a page and in one or more bank contexts without creating independent copies.
- Editing any usage opens an explicit confirmation step summarizing the affected usages. Only after confirmation does the edit propagate to all linked usages. Cancel leaves every usage unchanged.
- Deleting an on-page usage prompts for `Unlink` or `Delete everywhere`. Unlink materializes independent page/bank copies and removes the shared relationship; Delete everywhere removes the shared entity and all usages after confirmation.
- Linking is all-or-nothing for a block's supported content and settings. Partial linking of text, scoring, feedback, or other fields is not supported.
- The model works for every registered block type, not only knowledge checks. Existing unlinked blocks and bank questions remain valid.

**Out of scope:** partial-field linking and silent propagation without author confirmation.

### P2: Future considerations (design for, do not build)

| # | Requirement | Architectural implication now |
|---|---|---|
| P2-1 | Adaptive learning paths (rule-based content release by performance) | Trigger engine conditions support quiz score variables from day one; P2-1 is mostly a UI feature later |
| P2-2 | xAPI LRS connection | Analytics events already structured as xAPI statements (P1-24); LRS connection is a new output module only |
| P2-3 | Hosted multi-tenant SaaS with billing | organization_id on all records from day one (P0-7) |
| P2-4 | ~~Translation/localization~~ **PROMOTED TO P1-26, THEN PARKED TO P3-1** — see P3 table below | - |
| P2-5 | AI-assisted content drafting | None required now |
| P2-6 | Template and starter course gallery (community-shared) | None required now |
| P2-7 | Custom JavaScript block (Storyline-style). Explicitly optional and cuttable: security risk in multi-tenant context. If built: sandboxed, self-hosted-only | Expose player.getVar/setVar API so extension point exists without opening the full runtime |
| P2-8 | **Pathology track, signature feature:** Deep-zoom whole-slide viewer (OpenSeadragon-style). Pan and zoom gigapixel slides; author-placed annotations reveal at set zoom levels | Build P1-12 compare block on shared zoom engine abstraction so deep-zoom is an extension, not a rewrite |
| P2-9 | Gamification presets: points, badges, progress unlocking as pre-wired template patterns | Trigger engine and numeric variables already support all mechanics; P2-9 is a template and UI layer only |
| P2-10 | Google Classroom integration: push course link as assignment via Classroom API | None required now; Mnemonify courses already run in browser without an LMS |
| P2-11 | Lesson plan, handout, and worksheet generation from course content | Word export pipeline (P1-15) is the foundation; extend to teacher-facing document formats |
| P2-12 | Reusable learning objects: save block groups as objects reusable across courses, with controlled update propagation | Needs new tables (learning_objects, object_usages). Concepts array (P1-38) and stable block ids are the prerequisite groundwork |
| P2-13 | "Where is this used?" dependency view for assets, references, questions, and learning objects | Requires a usage-tracking table populated at publish time. Stable asset_ids and block_ids already support this |
| P2-14 | Question banks: org-level reusable questions with tags, concepts, difficulty, and usage tracking | Needs new tables. Answer-level feedback (P1-35) and concepts (P1-38) are the schema prerequisites |
| P2-15 | Content aging alerts: review metadata (last_reviewed, next_review, reviewer, status) on courses, assets, references, and learning objects, with a dashboard flagging overdue content | Add review_metadata object to courses and assets schema when convenient; dashboard is the real work |
| P2-16 | SME review wizard: review links carry a review type (accuracy, image quality, distractor quality, clinical terminology, CME concerns); reviewer sees guided prompts | Extends P1-10 review links with a category field |
| P2-17 | Accessibility heat map: plain-language accessibility status panel by course, page, and block, with direct links to fix each issue | Extends the P1-11 pre-publish checklist into a persistent visual panel |
| P2-18 | Decision path visualization: auto-generated map of branching logic, showing unreachable pages, circular paths, and missing completion paths | Reads the Phase 4 trigger JSON; no schema change needed |
| P2-19 | Learning path templates: pre-wired trigger patterns (case study, remediation path, pre-test to personalized review, confidence-based feedback, video-then-branch) selectable by name | Same mechanism as gamification presets (P2-9); a template and UI layer over the existing trigger engine |
| P2-20 | Instructor guide PDF: course export including faculty notes, answer keys, mapped objectives, discussion prompts, and timing guide | Faculty notes (P1-36) and objectives (P1-37) are the schema prerequisites; extends the Puppeteer PDF pipeline |
| P2-21 | CME/CE credit evidence package: structured accreditation documentation bundle (objectives, content, references, assessments, completion rules, version history, accessibility status, review metadata) | Depends on P1-37, P1-39, P2-15. High value for CAP and other accrediting bodies specifically |
| P2-22 | Concept prerequisite mapping and course memory: concept-level learner history across courses within an organisation, powering recommendations and aggregate remediation reporting | Concepts array (P1-38) and xAPI-structured telemetry (P1-24) are the groundwork. The cross-course intelligence layer is the real work |
| P2-23 | Full-text search across course content for learners | dominKnow offers this and users praise it; no current schema blocker |
| P2-24 | Anonymous student links: tokenised no-account share link for classroom use; aggregate results only, no named per-student data | Reuses the P1-10 review-link mechanism and hashed-learner telemetry. Deliberately aggregate-only: named per-student results are a FERPA/COPPA scope decision, not a feature |

### P3: Post-beta (deliberately gated behind real user data, not effort)

| # | Requirement | Reason for gating |
|---|---|---|
| P3-1 | **Translation:** course content translatable into any DeepL-supported language, with a side-by-side review editor, clinical-terminology flagging, and localised player chrome strings. (Full spec preserved from the original P1-26 for whenever this is picked back up.) | Deliberately separable from every other Phase 5 item. Carries an ongoing per-language API cost. Its real requirements — which languages actually matter, how much clinical review authors need — are answerable by real beta usage, not by guessing pre-launch. Revisit after beta testing on the base product |
| P3-2 | **References block:** a dedicated structured-citation block type (author, title, source, URL, year fields, auto-formatted as a numbered list). (Full spec preserved from the original P1-17.) | Authors already have proofread, formatted reference lists from their existing workflow (Storyline/Rise: paste into a text block). A structured entry UI adds friction without proven benefit over pasting into an existing text block. Revisit only if real usage shows the structured version is worth building |

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
- Stack: React + Vite frontend, Node.js backend, PostgreSQL. Runs locally during development.
- Hosting (revised, replaces earlier AWS assumption): Vercel for the public site and editor SPA; Railway for the Node.js API and PostgreSQL; Cloudflare R2 for media, assets, generated PDFs, and published packages. Chosen over AWS deliberately: roughly $20-40/month versus $100-200+, no infrastructure to operate solo, and R2 has zero egress fees which matters materially for image-heavy pathology courses. R2 is S3-compatible, so migration to AWS remains open if usage pressure ever justifies it. Avoid until there is real usage: EC2, ECS, Kubernetes, microservices, self-managed PostgreSQL, multi-cloud.
- Domains: mnemonify.org (public project home), app.mnemonify.org (hosted authoring app), docs.mnemonify.org (documentation), staging.mnemonify.org (pre-production testing), mnemonify.app (redirect to app subdomain initially).
- License: AGPL-3.0, added to the repository at project start.

## 10. Phasing

| Phase | Deliverable | Definition of done |
|---|---|---|
| 1 | JSON schema + responsive player | 7 core block types, keyboard accessibility verified. **COMPLETE** |
| 2 | Dynamic SCORM 2004 3rd Ed wrapper | Thin launcher passes SCORM Cloud; suspend/resume verified; Ethos confirmed working. **COMPLETE** |
| 3 | Block editor, backend, templates, Word round-trip, bulk upload, onboarding, brand | 16-step integration test passed; brand applied; 3 bug fixes shipped. **COMPLETE** |
| 3.5 | Two-column block, table block, schema hooks, editor quality fixes | Two-column block renders at all breakpoints with draggable divider; embed block works in right slot (DigitalScope test); table block renders lab results with caption; move/copy block between pages works; page templates work; images in KC work; superscript/subscript work; undo/redo works reliably across all editor actions; schema carries answer-level feedback, faculty_notes, objectives, concepts, header/footer |
| 4 | Trigger and variable engine + trigger builder UI + player chrome + media manager | Author builds a branching course through dropdowns only; player chrome renders with hybrid drawer, Continue button, linear nav; one-active-media rule verified with two videos in tabs. Plus post-phase fixes: content-server stability root cause, self-owned block visibility rule (P1-55), custom block labels (P1-56), Player settings tab (P1-57), manually-attached course resources (P1-58). **COMPLETE** |
| 4.5 | Foundations for Course Health (informed by ARCHITECTURE-AUDIT.md and the strategic docs) | **4.5a Identity + migration:** stable IDs on every addressable entity (answer options, nested accordion/tab items, feedback variants, objectives, mappings); sequential schema migration service with the first real migration; historical fixtures migrate automatically. **4.5b Block registry + dependency index:** block behavior consolidated into a central registry (all block-discovery surfaces derive from it); derived dependency index enabling safe-delete, "used by", broken-reference detection. **4.5c Minimal technical Course Analyzer:** ~15 deterministic high-confidence rules (schema validity, broken references, missing alt text/captions, unused variables/assets), finding model, panel that navigates to the affected object, pre-publish error gating. No profiles/snapshots/pedagogical rules yet — those are the later "Learning Alignment" grouping |
| 4.6 | UX polish pass (informed by UX-AUDIT.md, Priority 1 items only) | Basic/Advanced settings grouping (built on the 4.5b registry so it's consistent per block); collapsible page and settings panels + Focus Mode; between-block insertion controls; simplified primary toolbar (Preview consolidated, device widths inside preview; less-frequent actions under "More tools"); clearer module/page visual hierarchy; reduced border/icon density on unselected blocks; contextual "i" info tooltips; **Course Health finding grouping** (identical findings collapse into one entry with a count, e.g. "18 images missing alt text", rather than N separate rows — needed as findings scale); **bulk alt-text review screen** reachable from a grouped alt-text finding, showing every flagged image in one focused list (thumbnail, its existing caption as read-only reference text, an editable alt-text field the author fills or adapts) instead of hunting through pages one image at a time — explicitly does NOT auto-copy caption into alt text silently, since a screen reader announces both and silent duplication makes the listening experience worse, not better; author always makes the conscious edit. **Terminology decision:** keep all existing standard terminology as the visible labels (Trigger, Variables, Completion rule, etc.) — do NOT rename — and add accessible, keyboard-operable "i" info tooltips with teaching-oriented plain-language explanations (sourced from UX-AUDIT.md section 5's explanations) on domain-specific/advanced controls only. This serves both the first-time educator and the experienced-ID validation audience without a credibility tax. Intent-based Add Content (UX-AUDIT §6), plain-language logic recipes (UX-AUDIT §14), and AI-suggested alt text (a real future idea, needs an API integration and is properly Phase 5+ scope per the project's principle of keeping AI features optional and outside the free core) are explicitly DEFERRED — they are real features, not UX polish |
| 5 | States, expanded block types, interactive video, captions, PDF artifacts, analytics (ANALYTICS TELEMETRY COMPLETE — see DECISIONS.md), Word importers. Translation parked to P3-1, revisit post-beta | 4-case pathology course with WSI in two-column layout, interactive video, auto-captions, PDF summary, and worksheet export passes full manual QA. Smart Import (rule-based) produces a usable draft from a real Word document with no API key. AI Import produces a usable draft from a real CAP storyboard. Flashcard (P1-59), matching (P1-60), ordering (P1-61), hotspot (P1-62), and reflection blocks all work and are keyboard operable. Text-to-speech works on text blocks |
| 6 | Accounts, shared library, review and commenting, anonymous links, deployment, and the P1-69 through P1-74 authoring/reuse extensions | Team of 5 in shared workspace; reviewer completes comment round; anonymous share link works with aggregate-only results; both SCORM modes (dynamic and traditional ZIP) pass SCORM Cloud; multi-select scoring, named restore, glossary linking, redesigned bank workflow, bank import/export, and linked-entity propagation pass focused acceptance tests; deployed to Vercel + Railway + R2; one-click deploy verified by a non-technical tester |
| 7 | Pathology signature: deep-zoom whole-slide viewer (P2-8) | Learner pans/zooms tiled slide; annotations reveal at zoom levels; reuses Phase 5 zoom engine |

Accessibility (P1-11) is a build practice, not a phase. Semantic HTML, keyboard operability, and alt text fields are implemented from Phase 1, with a formal WCAG AA audit before public release.

Phases 5 and 7 form the pathology differentiation wedge. No free tool or AI generator currently offers this combination.

## 10.1 Strategic direction and document set

Following an architecture audit and UX audit (July 2026), Mnemonify is framed as a general-purpose learning-engineering platform, with pathology/medical education as a flagship starter pack and validation audience rather than a core-architecture constraint. This is a re-framing of intent, not a restart — every foundational decision (canonical course JSON, editor/player separation, deterministic triggers, responsive-by-construction, accessibility-as-requirement, AI-outside-the-core) is preserved.

The authoritative strategic and architectural document set lives in the `mnemonify-docs/` directory and MUST be read by Claude Code at the start of any Phase 4.5+ session, alongside REQUIREMENTS.md, ARCHITECTURE.md, and DECISIONS.md: PRODUCT-VISION.md, PRODUCT-OPPORTUNITIES.md, ARCHITECTURE-AUDIT.md, COURSE-ANALYZER.md, DATA-MODEL.md, ROADMAP.md, DESIGN-PRINCIPLES.md, BLOCK-LIFECYCLE.md, PLUGIN-ARCHITECTURE.md, UX-AUDIT.md, and ADRs 0007-0010.

**Numbering convention (to avoid collision):** the implementation phase numbers in the table above (1, 2, 3, 3.5, 4, 4.5, 4.6, 5, 6, 7) are the canonical build sequence. The ROADMAP.md capability groupings (its "Phase 1-9") are strategic groupings referred to by NAME only (e.g. "Technical Course Health," "Learning Alignment," "Reuse and instructional recipes"), never by their roadmap numbers. Completed build work is never retroactively renumbered.

**Guiding restraint:** the strategic docs describe a multi-year platform. The discipline is to build incrementally on the proven foundation, ship useful capability to real users, and resist architecture-astronomy — formalizing boundaries only as they become load-bearing, per the audit's own priority sequence.

## 11. Open Questions

1. **(Legal, blocking before public release)** Does Sebastin's employment agreement contain an IP assignment clause covering personal projects? Confirm before open-sourcing.
2. **(Product) CLOSED.** Project name is Mnemonify. Domains mnemonify.org and mnemonify.app registered. Business email active. GitHub org: MnemonifyOrg.
3. **(Product) CLOSED.** Phase 1 block set confirmed: text, heading, image, list, accordion, tabs, knowledge check (7 types). All implemented and keyboard-verified.
4. **(Technical) PARTIALLY CLOSED.** Ethos dynamic SCORM confirmed working via ngrok in dev. Ethos UAT full test pending (UAT site was down). Retest when UAT is restored and document any Ethos quirks in DECISIONS.md.
5. **(Product, resolve by Phase 6)** Hosted version pricing model, if any: donations, flat nominal fee, or free with paid support.
6. **(Technical, verify after Phase 4)** Two QA items fixed but not yet independently confirmed outside the editor's dev environment: (a) table block scrollbar visibility/affordance on a paste-in-created table, (b) embed block scroll-jump on page load. Deferred deliberately: Phase 4 builds the full player chrome (nav drawer, top bar, progress bar), which changes the page's scroll container structure — better to verify both against the final chrome once, via a real SCORM package test, than re-verify twice.

## 12. Out-of-Scope Parking Lot

Ideas raised and deliberately deferred: AI content generation, PowerPoint import, collaborative real-time editing, discussion/social blocks, LTI integration, drag-and-drop interaction blocks (excluded partly for accessibility reasons), per-course/organisation logo customization in the player top bar (real user request, Phase 4 — needs its own proper design pass: upload flow, sizing/aspect-ratio rules, fallback behavior when unset — deliberately not rushed into the Player settings tab work).

Learning-objective extensions deliberately out of scope for P1-68 and parked for a future phase: objective-based reporting or analytics (for example, score by objective), and learner-facing display of objectives in the player UI. P1-68 stores and uses objective mappings for authoring and question selection only.

Word template redesign: considered and parked. The current Mnemonify Word template (machine-parseable table format) is retained. Instead of redesigning it to match CAP storyboard format, a storyboard converter (P1-33, Phase 5) will allow authors to upload their existing storyboards and receive a draft Mnemonify course JSON, eliminating the need for SMEs to learn any new template format.

Bigger future bets noted but not scheduled: spaced-repetition of missed concepts across SCORM sessions (courses that remember the learner), content-graph model where a concept updated once propagates to every course referencing it (living courses rather than static documents), deep-zoom whole-slide pathology viewer (scheduled as Phase 7).

# P1-C / P1-D: Left Nav Cleanup + Icon Rail / Drawer Redesign

Add this section to REQUIREMENTS.md (or ARCHITECTURE.md, whichever holds UI/IA specs in the current repo structure) and commit before generating any build prompt.

## Problem

The right inspector pane currently renders six tabs (Course, Page, Player, Variables, Question Banks, Course Health) in a single ~260-320px column, mixing course-global settings with page/block-contextual settings in the same space. The left nav additionally renders inline objective-assignment text fields and a per-page module-assignment dropdown, both always visible, which clutters the page/module list and is easy to lose track of.

## Goals

1. Separate global course tools from contextual (page/block) settings into two distinct UI surfaces.
2. Remove objective-assignment UI and the module-assignment dropdown from the left nav entirely.
3. Reduce the left nav to pure structure: modules (collapsible, draggable) and pages (draggable), with actions in a kebab menu.

## Decisions (confirmed)

- **Icon rail:** a 48px vertical icon rail, fixed at the right edge of the editor, always visible regardless of selection state. Icons: Course, Player, Variables, Question Banks, Objectives. (Glossary and Version History icons exist but stay hidden while their feature flags are off, per P1-A.)
- **Drawer behavior:** clicking an icon-rail item opens a single overlay drawer (~400px wide) sliding in from the right edge, on top of the canvas. Only one panel is ever open at a time — **opening an icon-rail drawer deselects any selected block and closes its block-settings drawer, and vice versa: selecting a block closes any open icon-rail drawer.** There is no simultaneous dual-panel state.
- **Objectives scope:** the Objectives icon-rail item is the single home for ALL objective mapping — both course-level objectives and module-level objective assignment live together in this one drawer (not split between the drawer and the Page/Module inspector). The drawer should let the author pick a module (or "Course-level") as a sub-context within the Objectives panel itself.
- **Contextual inspector:** selecting a block opens a Block Settings drawer (same visual treatment as the icon-rail drawers: slides from the right edge, ~400px, one at a time) showing that block's settings. Selecting a page or module in the left nav opens a Page/Module Settings drawer. Nothing selected = no drawer open = full-width canvas.
- **Question Banks drawer:** contains only the bank selector dropdown, "New bank" button, and "Open bank editor" button (which opens the existing P1-72 modal). Bank content editing (name field, question list, export/import buttons) stays entirely inside that modal, not in the drawer.
- **Viewport support:** desktop-only for v1. No responsive/tablet-width handling required in this pass.

## Left Nav (after this change)

Left nav shows only structure:
- Module rows: collapse/expand chevron, module name, kebab menu (rename, delete module — existing actions, relocated into the menu)
- Page rows: drag handle (existing), page name, kebab menu with "Move to module" (submenu listing modules + "No module"), Duplicate, Delete
- No inline objective text, no always-visible module-assignment dropdown
- Existing drag-and-drop reorder behavior (pages within/between modules, modules themselves) is preserved exactly as-is — this task does not touch drag-and-drop logic, only what's rendered alongside it

## Out of scope for this pass

- Any changes to drag-and-drop mechanics (already implemented, do not touch)
- Glossary/Version History icons' actual drawer content (stays flagged off per P1-A; only reserve their position in the rail)
- Course Health: stays as-is for this pass (its own future item is converting it to a pre-publish check dialog — not part of P1-C/P1-D)
- Mobile/tablet responsive behavior

## Acceptance criteria

- Right inspector's 6-tab layout is fully replaced; no tabbed panel remains
- Icon rail always visible; each icon opens its drawer; only one drawer (icon-rail OR block/page-module) open at any time
- Selecting a block closes any open icon-rail drawer and opens Block Settings; opening an icon-rail item closes any open block/page/module drawer
- Left nav renders no objective UI and no module-assignment dropdown
- All previously-accessible settings (Course, Player, Variables, Question Banks, Objectives incl. module-level, Page, Block) remain reachable and functional through the new drawers — this is a relocation of UI, not a removal of functionality
- Existing drag-and-drop reorder (pages and modules) works unchanged
- All automated tests pass; manual verification of drawer switching and objective mapping (course + module) performed by Sebastin before considering this done
