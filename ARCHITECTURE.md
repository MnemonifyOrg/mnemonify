# Architecture: Mnemonify

**Version:** 0.2 (In development)
**Companion to:** REQUIREMENTS.md
**Status:** Phase 1 complete
**Last updated:** July 11, 2026

This document is the technical source of truth. Claude Code must read it at the start of every session and must not deviate from it without updating it first.

---

## 1. System Overview

Three strictly separated parts, all reading the same course JSON:

```
+-------------------+       +-------------------+
|      EDITOR       |       |      PLAYER       |
|  (React app for   |       |  (React app that  |
|   authors)        |       |   renders courses |
|                   |       |   for learners)   |
+---------+---------+       +---------+---------+
          |                           |
          |     Course JSON document  |
          +------------+--------------+
                       |
             +---------+---------+
             |      BACKEND      |
             |  (Node.js API +   |
             |   PostgreSQL)     |
             +-------------------+
```

**The golden rule:** the editor writes JSON, the player reads JSON, the backend stores JSON. The player has zero editor code in it, because the player ships inside every SCORM package and must stay small, fast, and dependency-light.

- **Editor:** React + Vite single-page app. Authors build courses. Talks to the backend API.
- **Player:** React + Vite, built as a self-contained bundle. Runs in four contexts with identical behavior: (a) live preview inside the editor, (b) inside a SCORM thin launcher loaded by an LMS, (c) standalone web export, (d) review mode with comment overlay. Context is detected at startup.
- **Backend:** Node.js (Express or Fastify) + PostgreSQL. Stores courses, users, organisations, media, comments, analytics events. Performs SCORM packaging, PDF generation, caption generation, and translation.

## 2. Repository Structure (monorepo)

```
mnemonify/
  REQUIREMENTS.md
  ARCHITECTURE.md
  DECISIONS.md            <- running log of choices made and why
  LICENSE                 <- AGPL-3.0
  packages/
    schema/               <- JSON schema definitions + validation (shared)
    player/               <- the course player
    editor/               <- the authoring app
    server/               <- Node.js API, SCORM packager, PDF, captions, translation
  samples/
    sample-course.json    <- hand-written reference course, kept current
  deploy/
    railway.json          <- one-click Railway deploy config
    render.yaml           <- one-click Render deploy config
    docker-compose.yml    <- local dev environment
```

The `schema` package is shared by all three parts. Any schema change happens there first.

## 3. Course JSON Document Model

### 3.1 Hierarchy

```
Course
  meta (title, version, settings, theme, nav_mode, pdf_settings, utility_bar)
  variables[]            <- course-level, shared across all pages
  assets[]               <- images, media, captions, with ids, alt text, captions
  translations{}         <- per-language content overrides keyed by BCP-47 code
  pages[]
    page meta (id, title, group)
    blocks[]
      block (id, type, content, layout hints, include_in_pdf, triggers[])
```

### 3.2 Key design rules

1. **Variables live at course level only.** Blocks reference variables by name; they never own them.
2. **Assets are course-level objects with ids.** Blocks and inline text links reference assets by asset_id. Alt text and captions live on the asset, in one place.
3. **Every id is a short unique string** (blk_, pg_, ast_, trg_ prefixes) generated once and never changed, so triggers never break when content is edited.
4. **All learner-facing text lives in the JSON**, never hardcoded in the player. This is what makes translation possible.
5. **Schema is versioned.** "schema_version": 1 at the top. The player refuses or migrates mismatched versions, never guesses.
6. **include_in_pdf is a block-level boolean.** Defaults by type: true for text, heading, image, list, accordion, tabs, carousel, references; false for knowledge_check, embed, button, interactive_video overlay blocks.
7. **Translations are a parallel content layer.** The translations object at course level holds BCP-47 language codes as keys. Each key maps to a partial course structure with only the content fields that differ. The player merges the selected language over the default content at render time.

### 3.3 Course meta settings

```json
"meta": {
  "course_id": "crs_a1b2",
  "title": "Intro to Frozen Sections",
  "schema_version": 1,
  "theme": { "accent": "#0f766e", "font_pair": "default" },
  "nav_mode": "linear",
  "page_groups": [
    { "group_id": "grp_01", "title": "Case 1", "page_ids": ["pg_01", "pg_02"] }
  ],
  "pdf_settings": {
    "enabled": true,
    "mode": "both",
    "resources_page": true
  },
  "utility_bar": {
    "contact": { "enabled": true, "email": "education@example.org", "subject_prefix": "[Course Help]" },
    "resources": { "enabled": true },
    "custom": []
  }
}
```

### 3.4 Reference block example (abridged)

```json
{
  "block_id": "blk_acc1",
  "type": "accordion",
  "include_in_pdf": true,
  "content": { "items": [ { "title": "Reveal diagnosis", "body_blocks": [] } ] },
  "triggers": [
    { "trigger_id": "trg_001", "event": "onOpen",
      "actions": [ { "action": "SET_VAR", "var": "readCaseIntro", "value": true } ] }
  ]
}
```

### 3.5 Translation structure example

```json
"translations": {
  "es": {
    "meta": { "title": "Introducción a Secciones en Congelación" },
    "pages": {
      "pg_intro": {
        "title": "Discusión del Caso",
        "blocks": {
          "blk_case1": {
            "content": { "rich_text": [ { "t": "text", "v": "La biopsia mostró " } ] }
          }
        }
      }
    }
  }
}
```

## 4. Trigger and Variable Engine (player core)

A small event bus inside the player. Nothing else in the player mutates state.

**Events:**
- Block-level: onPageEnter, onPageExit, onClick, onOpen, onClose, onComplete, onCorrect, onIncorrect, onVarChange
- Media: onPlay, onPause, onComplete (video/audio ends), onTimeReached (timeline trigger for interactive video)
- Modal: onModalOpen, onModalClose

**Actions:**
- Variables: SET_VAR, ADJUST_VAR (numeric +/-)
- Blocks: SHOW_BLOCK, HIDE_BLOCK, ENABLE_BLOCK, DISABLE_BLOCK, SET_STATE
- Navigation: JUMP_TO_PAGE, JUMP_TO_TIMESTAMP (for interactive video branching)
- Modal: OPEN_MODAL (opens the unified modal layer with a content payload: image lightbox, PDF viewer, embed, email compose)
- SCORM: SCORM_COMPLETE, SCORM_SET_SCORE

**Conditions:** comparisons (==, !=, >, <, >=, <=) on variables, combinable with AND/OR using nested { "all": [...] } / { "any": [...] } structure.

**Rules:**
- Actions are declarative data, never author-supplied code.
- Engine is pure and unit-testable: given (state, event) returns (new state, effects).
- Full variable state + current page serialize to compact JSON for SCORM suspend_data (64KB budget; abbreviate keys).

## 5. Player

Single-column, block-stacking layout. Mobile-first CSS (flexbox/grid). No pixel positioning, ever. Design system baked in as CSS custom properties (type scale, spacing scale, color tokens, accent from course theme). Contrast-safe token pairs only.

Print CSS (@media print) built in Phase 1, used in Phase 5. Rules: navigation chrome hidden, images full-width with caption, references as numbered list, no-print class display:none, page break before top-level headings.

### 5.1 Player chrome

**Top bar (all breakpoints):**
- Left: hamburger button (opens/closes nav drawer)
- Center: course title
- Right: utility items on desktop (text links or icon+label); on mobile, a single overflow icon if any utility items exist

**Progress bar:** thin line directly below top bar, fills proportionally as pages marked complete.

**Nav drawer:**
- Desktop default: open as left sidebar, collapsible
- Mobile: full-height overlay, closes on outside tap
- Contents: page list (flat or grouped into collapsible sections per course setting)
- Page status icons: circle (not visited), half-fill (in progress), checkmark (complete), lock (locked in linear mode)
- In linear mode: future pages not clickable; Previous always available

**Continue button:** rendered as the last block on every page. Standard button block type with a reserved role. Author attaches optional trigger conditions (e.g., Continue only enables after accordion is opened). When clicked: marks page complete, advances to next page, fires onPageExit and onPageEnter.

**Utility bar:**
- Contact: opens an in-player email modal pre-populated with course name and configured recipient. Author sets email and optional subject prefix in course settings. Optional per course.
- Resources: opens in-player PDF viewer modal showing course PDFs. Optional per course.
- Custom items: author-defined label + action (OPEN_MODAL with content payload or JUMP_TO_PAGE). No external links.
- Mobile: utility items render in a persistent bottom bar. Max 4 visible; scrolls horizontally beyond 4.
- If no utility items are configured, utility bar does not render at all.

### 5.2 In-player containment (hard rule)

No player action ever navigates the browser to an external URL or opens a new tab or window. This is enforced at the player level, not left to author configuration. All external content resolves through one of:
- OPEN_MODAL with image lightbox payload
- OPEN_MODAL with PDF viewer payload (embedded PDF.js or native browser PDF renderer inside iframe)
- OPEN_MODAL with sandboxed iframe payload (for embed blocks)
- OPEN_MODAL with email compose payload (for Contact)

This rule applies in all four player contexts: editor preview, SCORM launcher, standalone web, review mode.

### 5.3 Unified modal layer

One modal component handles all in-player overlays. Payloads:
- image: renders asset at full viewport width with caption, download button optional
- pdf: renders PDF.js viewer with download button
- iframe: renders sandboxed iframe (embed block content)
- email: renders pre-populated email form, sends via mailto or configured SMTP
- interactive_video_overlay: renders question/text/button block on top of paused video

Modal is always dismissible by Escape key and a close button (WCAG requirement). Focus is trapped inside modal while open and returned to trigger element on close.

### 5.4 Zoom engine (pathology track)

Shared zoom abstraction used by the side-by-side compare block (P1-12) and the deep-zoom viewer (P2-8). Built once for Phase 5 (compare block). The deep-zoom viewer in Phase 7 extends it, never replaces it. Pan and zoom transforms synchronised across two viewports in compare mode. Annotations stored as asset-level data (coordinates, reveal-at-zoom-level, caption).

### 5.5 Confidence-weighted knowledge check

A knowledge-check variant that writes two variables per question: answer correctness and learner-selected confidence level. Both are ordinary course variables so existing triggers handle all downstream logic. No special-casing in the engine.

### 5.6 Runtime context detection

On startup the player checks:
1. Does window.parent or window.opener expose API_1484_11? → SCORM context; load content from Mnemonify content server URL embedded in launcher
2. Is a review token present in URL params? → Review context; load content from API, enable comment overlay wrapper
3. Is content URL a local file or bundled JSON? → Editor preview or standalone context

## 6. Media Manager

One active media item at a time per page, enforced by a media manager module. Nothing else in the player touches media playback state.

**Container-aware lifecycle:**
- When a tab closes or accordion collapses: all media inside pauses; playback position saved to media manager state
- When that tab or accordion opens again: media resumes from saved position, not from the beginning

**Audio scroll detection:** Intersection Observer watches each audio block. When the block leaves the viewport (threshold 0%), media manager pauses it.

**Video controls:** native browser controls styled via CSS to match design system. No custom JavaScript scrubber. Reliable across Safari, Chrome, and mobile browsers.

**iOS autoplay:** if a video or audio block is set to autoplay, it starts muted on iOS (browser restriction). Player shows a visible unmute button. No silent failures.

**onTimeReached event:** the media manager monitors playback position for each video block that has timeline triggers defined. When playback reaches a trigger timestamp (within a 250ms tolerance window): pauses video, fires onTimeReached event with the timestamp value, trigger engine processes attached actions (typically OPEN_MODAL with interactive overlay payload). When overlay is dismissed, trigger engine decides whether to resume or jump to a different timestamp.

## 7. SCORM 2004 3rd Edition Module

All LMS communication isolated in packages/player/src/lms/scorm2004.js. Nothing else in the player touches SCORM. This isolation is what makes xAPI addition possible later (P2-2).

**Dynamic SCORM thin launcher (Phase 2):**
The published SCORM zip contains only:
- index.html: minimal launcher shell
- scorm2004.js: SCORM API communication
- config.json: Mnemonify content server URL + course_id + published_version_id

On launch, the shell connects to the LMS via API_1484_11, then fetches the course player bundle and content JSON from the Mnemonify content server. SCORM tracking data (completion, score, suspend_data, session_time) flows directly between the learner's browser and the LMS. Mnemonify content server is never in the SCORM data path.

**Version resolution:** the content server receives learner_id and course_id on each launch. It checks the version_assignments table to determine which published version to serve. If no assignment exists (new learner), serves the latest published version and creates an assignment record.

**Structural change detection:** on launch, the player compares the incoming course JSON's page_ids against the page_id stored in cmi.location (the learner's last saved position). If the page no longer exists, the player resets to page 1 and shows a brief in-player message ("This course was recently updated. Starting from the beginning."). Never crashes.

**Standard SCORM reporting:**
- cmi.completion_status: incomplete / completed
- cmi.success_status: passed / failed / unknown
- cmi.score.scaled/raw/min/max
- cmi.location: current page_id
- cmi.suspend_data: serialised variable state + page position + media playback positions
- cmi.exit: suspend on close, normal on completion
- cmi.session_time: ISO 8601 duration

Completion rule is a course setting: "viewed all pages" (default) or "passed final knowledge check."

## 8. Editor

React SPA. Left: page/group list. Center: live block canvas with inline click-to-edit text. Right: contextual settings panel for selected block.

Preview toggle renders the actual player bundle at 375 / 768 / 1280 px widths inside the editor. Same player, no separate preview renderer.

**Trigger builder UI:** sentence-style dropdowns. Only valid choices for the selected block type and event are shown. Triggers render as readable sentences. Timeline trigger builder for interactive video shows a visual timeline bar with draggable markers.

**Caption editor:** side-by-side view showing auto-generated WebVTT with editable text and timecodes. Play-along preview shows video with caption overlay.

**Translation editor:** side-by-side view showing default language (left) and target language (right) field by field. Clinical terminology flags (terms matching a medical wordlist) are highlighted in amber for human review.

**Pre-publish checklist:** runs before publish completes. Warnings (blockable if WCAG compliance mode enabled): missing alt text on images, missing captions on video, missing transcript on audio. Notices (non-blocking): Continue button missing on a page, empty references block.

**Autosave:** debounced PATCH to API within 5 seconds of any change. Last-write-wins with a record lock warning if another author has the course open.

## 9. Backend and Data Model

Node.js + PostgreSQL. Core tables (all rows carry organisation_id):

| Table | Purpose |
|---|---|
| organisations | tenant boundary from day one |
| users | email + hashed password, role (admin/author) |
| courses | course metadata + current JSON document (JSONB) |
| course_versions | snapshot on every publish; version_id, published_at, publish_mode (push_all / lock_existing) |
| version_assignments | learner_id + course_id + version_id; one record per learner per course |
| assets | uploaded media metadata; files on disk in dev, S3-compatible later |
| captions | WebVTT content per asset_id, source (whisper / manual), review_status |
| review_links | tokenised share links, no reviewer account needed |
| comments | pinned to course_id + block_id, threaded via parent_comment_id, status open/resolved |
| analytics_events | event_type, course_id, version_id, learner_id, block_id, payload (JSONB), timestamp |
| translations | course_id, language_code, translated_json (JSONB), review_status, generated_at |

API is plain REST JSON. The editor is its only client in v1.

**Review mode:** review link serves player in review context plus a lightweight comment layer (pins on blocks, thread panel). Reviewers identify by typed name only. PDF artifact generated and accessible during review publish.

**Embed security:** iframes sandboxed (minimal sandbox attribute allowances). Editor validates embed URLs against per-organisation domain allowlist (YouTube and Vimeo included by default).

## 10. Templates and Word Storyboard Pipeline

### 10.1 Templates

A template is a course JSON with "is_template": true and "template_scope": "personal" | "org" in meta. Content fields contain labeled placeholders. Trigger logic, block structure, design settings, pdf_settings, and utility_bar config are preserved.

Stored in the courses table with a template flag. Course library UI filters on the flag for the Templates view.

### 10.2 Word template export

Server generates .docx using the docx Node.js library. Structure: one section per page, one table per page. Columns: Block Type | Field | Content | Notes. Notes column carries block_id and field name for round-trip import. Knowledge check rows include question, each option, correct flag, correct feedback, incorrect feedback. Cover sheet lists template name, page count, instructions.

### 10.3 Word storyboard import

Upload filled .docx. Server parses with mammoth.js, maps rows to block types using Notes column. Pre-import review screen shows mapped, flagged, and skipped rows. Author confirms. Draft created with status: draft. Never auto-publishes.

Best-effort fallback if Notes column is absent (non-Mnemonify doc): positional heuristics, everything flagged for review.

## 11. Bulk Image Upload and Media Library

### 11.1 Bulk upload

/assets/bulk endpoint accepts multiple files via multipart or a single ZIP (adm-zip). Validates MIME type and file size (10MB per file, 500MB ZIP). Creates one asset record per image with filename as default alt placeholder. Post-upload bulk edit screen for alt text and captions.

### 11.2 Carousel batch assignment

Carousel block builder shows media library picker with checkboxes. Multi-select and "Add to carousel" populates all asset_ids in one action. Ordering via drag-to-reorder after batch add.

### 11.3 include_in_pdf defaults

| Block type | Default |
|---|---|
| text, heading, image, list, accordion, tabs, carousel, references | true |
| knowledge_check, embed, button, interactive_video overlays | false |

## 12. PDF as Publish-Time Build Artifact

Server-side PDF generation using Puppeteer (headless Chromium). Chosen over pdfkit/jsPDF because Puppeteer renders the actual player HTML and CSS, so PDF output visually matches the authored course.

### 12.1 When PDFs are generated

- At every publish (standard or dynamic version push) if pdf_settings.enabled is true on the course
- At every review publish so reviewers can check the summary document
- Never on demand by learners; always server-side at publish time

### 12.2 Pipeline

1. Server receives publish request
2. For each page where all blocks have include_in_pdf evaluated: Puppeteer renders the page through the player in print media query mode with no-print blocks hidden
3. Combined mode: pages merged in page order via pdf-lib into one PDF
4. Per-page mode: one PDF per page
5. Both mode: both outputs generated
6. PDFs stored as assets in the assets table, linked to the course version
7. If pdf_settings.resources_page is true: server appends an auto-generated Resources page to the course JSON (a list of download links to the PDFs, rendered in the player as the last page)
8. PDF viewer modal (in-player containment rule) is how learners access the PDFs

### 12.3 Print CSS (built Phase 1, used Phase 5)

@media print stylesheet in the player from Phase 1. Navigation chrome hidden, images full-width with caption below, references as numbered list, no-print class display:none, page break before top-level heading blocks.

## 13. Captions, Transcripts, and Translation

### 13.1 Captions

On video upload, server sends audio track to Whisper (runs server-side, no external API cost). Returns draft WebVTT saved to captions table with source: whisper and review_status: draft. Author reviews in caption editor. Author can upload own WebVTT or SRT to override (source: manual). Captions delivered to player as a text track on the video element. Learner toggles CC button. Caption styling respects OS-level preferences.

### 13.2 Transcripts

Generated from the same Whisper output as captions. Saved to captions table as transcript type. Rendered as a collapsible panel below the video or audio block. Inline in the player, not in a modal.

### 13.3 Translation pipeline

1. Author selects target language in editor
2. Server sends content JSON (all learner-facing strings extracted) to DeepL API
3. DeepL returns translated strings; server stores in translations table with review_status: draft
4. Author reviews in side-by-side translation editor; clinical terms flagged amber
5. Author approves; translation published as part of next course publish
6. Translation JSON stored in translations table; merged into course JSON at player render time for the selected language
7. Player chrome UI strings (Continue, Resources, Contact, Previous, Next, CC, Close) localised per language code

## 14. Analytics Telemetry

### 14.1 Event structure

Every telemetry event is structured as an xAPI-compatible statement, stored in the analytics_events table. Fields: event_type, course_id, version_id, learner_id (hashed), block_id (where applicable), payload (JSONB), timestamp.

Events fired by the player to /events on the backend, independent of SCORM. The SCORM module and telemetry module never share data.

### 14.2 Event types tracked

- resource_opened: asset_id, modal_open_time, modal_close_time
- media_play, media_pause, media_scrub, media_complete, media_dropoff (includes timestamp)
- block_interaction: accordion open, tab switch, carousel advance, lightbox open
- page_enter, page_exit (with time_on_page)
- knowledge_check_attempt: question_id, answer_selected, confidence_level, correct (boolean)
- continue_clicked: page_id, conditions_met (array)
- course_complete

### 14.3 Analytics dashboard

Built-in dashboard in the editor/admin interface. Views:
- Aggregate: completion rates, average time-on-page, resource open counts, video drop-off charts, knowledge check performance by question
- Per-learner: full event timeline for any individual learner, accessible to org admins and the course author only
- Anonymised aggregate export for leadership: CSV or Excel, no learner identifiers

### 14.4 xAPI readiness

Events stored in xAPI statement format from day one. When an LRS connection is added (P2-2), the backend forwards events to the LRS in addition to storing them locally. No rebuild required.

## 15. Dynamic SCORM and Version Control

### 15.1 Publish flow

1. Author clicks Publish
2. Author chooses: push to all learners OR lock existing learners to current version
3. Server creates a new record in course_versions (snapshot of full course JSON + all assets at this moment)
4. If push to all: no version assignments updated; all future launches resolve to new version
5. If lock existing: for every learner_id that has an existing version_assignment for this course, their assignment is not changed; new learners get the new version
6. Server generates PDF artifact if enabled
7. Server triggers caption generation for any new video assets
8. Thin launcher zip (already in Ethos) does not need to be replaced

### 15.2 Content server URL

The thin launcher includes a config.json with the Mnemonify content server base URL and course_id. On every launch, the launcher fetches:

GET /content/{course_id}?learner_id={hashed_id}

The server checks version_assignments, returns the correct version's player bundle URL and course JSON URL. The launcher loads both.

### 15.3 Version history and rollback

course_versions table retains all published versions. Admin can roll back to any prior version: this creates a new version record pointing to the prior snapshot's JSON and assets, then pushes to all (or a chosen segment). Rollback is always additive, never destructive.

## 16. Onboarding

### 16.1 First login experience

On first login, the dashboard shows:
1. A "Welcome to Mnemonify" banner with a Start Guided Tour button
2. A starter template library grid (6 to 12 templates covering common use cases: blank course, case-based learning, video lesson, quiz-only, pathology case)
3. A "Create blank course" option clearly visible but not the default focus

### 16.2 Guided tour

Step-by-step overlay walkthrough of the editor: adding a block, editing text, adding an image, setting a trigger, previewing on mobile, publishing. Each step is dismissible. Tour progress saved so a user who closes mid-tour can resume.

### 16.3 Tooltips

Every non-obvious control in the editor has a tooltip (hover on desktop, long-press on mobile) with a plain-language explanation. No jargon. Trigger builder dropdowns show examples ("e.g., When this accordion opens") alongside options.

## 17. Deployment

### 17.1 One-click deploy

Railway and Render one-click deploy configs in deploy/ directory. Each config provisions: Node.js server, PostgreSQL database, S3-compatible storage (Railway Volumes or Render Disks), and sets required environment variables via a setup wizard. Non-technical self-hosters can deploy without touching the command line.

### 17.2 Manual self-host

Full setup guide (Phase 6 deliverable) covering: Node.js + PostgreSQL install, environment variables, asset storage config, SMTP for email notifications, optional Whisper install for local caption generation, optional DeepL API key for translation.

### 17.3 Dev environment

docker-compose.yml in deploy/ starts PostgreSQL and the server locally. Player and editor run via Vite dev server (npm run dev in their respective packages).

## 18. Security and Deployment Baseline

- Passwords hashed (argon2). Sessions via httpOnly cookies.
- All author-supplied text sanitised before render (no raw HTML injection through content fields).
- No author-supplied executable code in v1 (see trigger engine rules and P2-7).
- Telemetry learner_id is a hashed value, not a raw LMS user identifier.
- Embed iframes sandboxed with minimal allowances. Domain allowlist enforced server-side.
- One-click deploy configs use environment variables for all secrets; no secrets in the repository.

## 19. Development Workflow (for Claude Code sessions)

1. Every session starts by reading REQUIREMENTS.md, ARCHITECTURE.md, DECISIONS.md.
2. Work only on the current phase; do not build ahead (see REQUIREMENTS.md Section 10).
3. Any architectural deviation requires updating this document in the same commit, plus a DECISIONS.md entry (date, decision, reason).
4. The trigger engine, media manager, SCORM module, and analytics telemetry module require unit tests. UI relies on manual checks against phase acceptance criteria.
5. samples/sample-course.json is the living reference. Every new block type or trigger capability is added to it and it must always render clean in the player.
6. Git commit at every working milestone with plain-language messages so a non-technical owner can roll back safely.

## 20. Deliberate Simplifications (v1)

- No microservices, no GraphQL, no state management libraries beyond React built-ins unless a concrete need appears.
- No CSS frameworks in the player; hand-rolled design tokens keep the SCORM launcher bundle small.
- Last-write-wins editing with lock warnings instead of collaborative editing.
- Local file storage for assets in development; storage abstraction in one module so S3 slots in later.
- Whisper runs server-side locally in development; can be replaced with a hosted API in production without changing the caption pipeline interface.
