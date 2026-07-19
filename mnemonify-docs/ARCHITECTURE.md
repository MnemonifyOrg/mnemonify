# Architecture: Mnemonify

**Version:** 0.3 (In development)
**Companion to:** REQUIREMENTS.md
**Status:** Phases 1-3 complete; Phase 3.5 next
**Last updated:** July 14, 2026

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

### 3.6 Two-column block schema

The two-column block is a container block that holds two inner blocks, one per slot. It is the primary layout pattern for pathology courses where clinical text sits left and a WSI embed sits right.

```json
{
  "block_id": "blk_col1",
  "type": "two_column",
  "include_in_pdf": true,
  "layout": { "split": 40, "split_min": 25, "split_max": 75 },
  "left": {
    "block_id": "blk_col1_left",
    "type": "text",
    "content": { "rich_text": [ { "t": "text", "v": "Clinical information..." } ] },
    "triggers": []
  },
  "right": {
    "block_id": "blk_col1_right",
    "type": "embed",
    "content": {
      "url": "https://www.digitalscope.org/LinkHandler.axd?LinkId=...",
      "label": "View Whole Slide Image",
      "sandbox": "allow-scripts allow-same-origin allow-popups"
    },
    "triggers": []
  },
  "triggers": []
}
```

Rules:
- `split` is the left column width as a percentage (integer 25 to 75). Right column is 100 minus split.
- Allowed inner block types for left and right slots: text, heading, image, embed. No nested two-column blocks.
- Inner block_ids use the parent block_id as a prefix (e.g., blk_col1_left, blk_col1_right).
- On mobile (below 768px): left slot stacks on top, right slot below, both full width. No author effort required.
- The draggable divider in the editor updates split live and triggers autosave.
- PDF rendering: left content prints full width, right content prints full width below it.

### 3.7 Table block schema

Required for CBC results, lab value tables, and other structured data in pathology cases.

```json
{
  "block_id": "blk_tbl1",
  "type": "table",
  "include_in_pdf": true,
  "content": {
    "has_header_row": true,
    "has_header_col": true,
    "rows": [
      ["", "WBC", "RBC", "HGB"],
      ["Result", "5.2 x 10³", "2.7 x 10³", "9.9 g/dL"],
      ["Range", "4.0-10.0", "3.7-5.3", "11.7-16.0"]
    ]
  },
  "triggers": []
}
```

Rules:
- rows is a 2D array of strings. All rows must have the same column count.
- has_header_row: first row renders as th elements.
- has_header_col: first cell of each row renders as th.
- Cell content is plain text only. No rich text, no nested blocks. One narrow, deliberate exception (Phase 3.5 QA fix): a cell string may contain inline `<sup>`/`<sub>` tags and nothing else -- no bold/italic/underline, no line breaks -- for pathology lab notation like 10³. Authored via the same X²/X₂ toolbar as text blocks, sanitized to that two-tag allowlist on every save and re-sanitized defensively on every render (`packages/{editor,player}/src/lib/richText.js`, `SUP_SUB_TAGS`). See DECISIONS.md.
- Player renders as a standard HTML table with overflow-x: auto wrapper for narrow screens.
- Editor: add/remove row, add/remove column, each cell is a contentEditable field.

### 3.8 Schema hooks added ahead of their UI

These fields enter the schema now because retrofitting them after Phase 4 means touching the schema, player, editor, Word export, and every existing course document. Adding them now costs almost nothing.

**Course meta additions:**

```json
"meta": {
  "header": { "rich_text": [] },
  "footer": { "rich_text": [ { "t": "text", "v": "© 2026 Example Org" } ] },
  "page_numbering": false,
  "objectives": [
    { "objective_id": "obj_01", "text": "Identify features of MDS with del(5q)", "standard_code": "" }
  ],
  "concepts": [
    { "concept_id": "cpt_01", "name": "Immunohistochemistry interpretation" }
  ]
}
```

- `header` / `footer`: rendered on every page in the player and included in PDF export. Optional; omit or leave empty to render nothing.
- `page_numbering`: when true, nav drawer and player chrome show "Page N of M", recalculated on page add/delete/reorder.
- `objectives`: `standard_code` is free text — Common Core, NGSS, state standards, or CME/accreditation codes all fit. No UI in Phase 3.5; the field simply exists.
- `concepts`: enables concept-level analytics and remediation later without a migration.

**Block-level additions (every block type):**

```json
{
  "block_id": "blk_x",
  "faculty_notes": { "rich_text": [] },
  "objective_ids": ["obj_01"],
  "concept_ids": ["cpt_01"]
}
```

- `faculty_notes`: **never rendered in any player context, in any mode.** Visible only in the editor, in review mode, and in the instructor guide export (P2-20). This is a hard rule — the player's block renderer must not read this field at all.
- `objective_ids` / `concept_ids`: optional arrays referencing course-level ids.

**Knowledge check answer-level feedback:**

```json
{
  "type": "knowledge_check",
  "content": {
    "question": { "rich_text": [] },
    "question_image_id": "ast_x",
    "options": [
      {
        "option_id": "opt_a",
        "label": { "rich_text": [] },
        "image_id": null,
        "correct": false,
        "feedback": {
          "rich_text": [ { "t": "text", "v": "ICUS is incorrect because..." } ],
          "image_id": "ast_y",
          "reference_ids": []
        }
      }
    ],
    "correct_feedback": { "rich_text": [], "image_id": null },
    "incorrect_feedback": { "rich_text": [], "image_id": null }
  }
}
```

Per-option `feedback` is optional and coexists with block-level `correct_feedback` / `incorrect_feedback`. When an option carries its own feedback, the player shows that instead of the generic block-level feedback. This mirrors the CAP HPATH storyboard structure exactly, where each ancillary study option has its own detailed rationale.

**Table caption:**

```json
{ "type": "table", "content": { "caption": "CBC results with reference ranges", "..." : "" } }
```

Rendered as a real HTML `<caption>` element inside the `<table>`, programmatically associated for screen readers.

**Reflection block:**

```json
{
  "type": "reflection",
  "include_in_pdf": true,
  "content": {
    "prompt": { "rich_text": [ { "t": "text", "v": "What surprised you about this case?" } ] },
    "storage_mode": "local"
  }
}
```

`storage_mode` is `"local"` and only `"local"` in v1. Learner text lives in browser memory for the session and is never transmitted to the backend, never written to SCORM `suspend_data`, and never persisted server-side. The field exists so the decision is explicit and visible in every course document rather than implicit in code. Any future change to this value is a privacy and legal decision (FERPA/COPPA), not an engineering one — see REQUIREMENTS.md Non-Goals.

In PDF worksheet mode, a reflection block prints its prompt followed by blank ruled lines.

## 3.8 Learning alignment and Analyzer hooks

The canonical document may contain stable outcomes, objectives, assessment identities, and explicit learning mappings. Derived services build a learning-alignment graph connecting instruction, practice, assessment, feedback, remediation, and transfer.

The graph, Analyzer findings, coverage matrices, and change-impact reports are derived and rebuildable. They must not become a second authored source of truth.

Domain-specific starter packs produce normal course JSON. Specialist services such as whole-slide imaging should normally be integrated through the general embed block and provider presets rather than embedded in the core schema.

### 3.9 Editor undo/redo (design now, before Phase 4)

Unreliable undo is the single most-cited flaw in dominKnow and a recurring complaint across every authoring tool researched. It cannot be bolted on later — it constrains how editor state is managed, so it is designed in before Phase 4 adds the trigger builder and player chrome.

Design:
- The editor holds the course document in a single immutable state object. Every mutation produces a new document rather than mutating in place.
- An undo stack holds the last 50 document snapshots. A redo stack holds forward states, cleared on any new mutation.
- Every author action that changes the document pushes a snapshot: text edits (debounced to one snapshot per 500ms of continuous typing, so undo steps are meaningful rather than per-keystroke), block add/delete/duplicate/reorder, column split drag (one snapshot on drag end, not during), settings changes, move/copy to page, page add/delete/rename.
- Cmd+Z / Ctrl+Z undoes, Cmd+Shift+Z / Ctrl+Y redoes. Both also available in the editor top bar.
- Undo/redo triggers autosave like any other change.
- Asset uploads are **not** undoable (the file is on disk); removing an image block via undo leaves the asset in the media library. This is correct and expected behaviour.
- Snapshots are held in memory only, not persisted. Undo history does not survive a page reload; this is an accepted v1 simplification.

### 3.10 Save-before-export pattern

Any operation that reads course content from the server (Word export, PDF preview, publish) must first await a forced save of the current editor state. The client calls saveNow() (which bypasses the 5-second debounce and immediately PATCHes the current course_json to the API) and awaits its promise before triggering the export or publish request. A "Saving..." indicator shows if the save takes more than 500ms. This prevents a race condition where in-flight edits are missing from exported content.

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

## 10.4 Starter-pack contract

A starter pack may contain course and page templates, reusable block patterns, predefined variables and triggers, instructional recipes, Analyzer profile recommendations, embed presets, import mappings, sample assets, and author guidance.

Instantiation creates ordinary editable course JSON. Existing courses must not depend on the continued installation of the source pack.

## 11. Bulk Image Upload and Media Library

### 11.1 Bulk upload

/assets/bulk endpoint accepts multiple files via multipart or a single ZIP (adm-zip). Validates MIME type and file size (10MB per file, 500MB ZIP). Creates one asset record per image with filename as default alt placeholder. Post-upload bulk edit screen for alt text and captions.

### 11.2 Carousel batch assignment

Carousel block builder shows media library picker with checkboxes. Multi-select and "Add to carousel" populates all asset_ids in one action. Ordering via drag-to-reorder after batch add.

### 11.3 include_in_pdf defaults

| Block type | Default |
|---|---|
| text, heading, image, list, accordion, tabs, carousel, references | true |
| knowledge_check, embed, video, audio, button, interactive_video overlays | false |

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

### 15.0 Two publish modes

Authors choose at publish. Both produce valid SCORM 2004 3rd Ed packages that pass conformance.

| | Dynamic launcher (default) | Traditional ZIP |
|---|---|---|
| Zip contains | Thin launcher + SCORM API + content server URL | Player bundle + course JSON + all assets |
| Content source at launch | Mnemonify content server | The zip itself |
| Update a published course | Republish; no LMS action needed | Upload a new zip to the LMS |
| Version assignment / rollback | Supported | Not supported |
| Works if LMS blocks external content | No | Yes |
| Works offline / air-gapped | No | Yes |

Dynamic is the strategic differentiator and the default. Traditional ZIP exists because some institutions block externally loaded content outright, and for those environments a working course beats a clever one. The SCORM tracking path (completion, score, suspend_data) is identical in both modes — it flows directly between the learner's browser and the LMS, and Mnemonify servers are never in that path either way.

### 15.1 Publish flow (dynamic mode)

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

### 17.0 Hosted production stack (revised — replaces earlier AWS assumption)

```
User Browser
  |  app.mnemonify.org
  v
Vercel — editor SPA + public site + docs
  |  REST API calls
  v
Railway — Node.js API
  |  SQL
  v
Railway PostgreSQL
  |  media, assets, PDFs, SCORM packages
  v
Cloudflare R2
```

| Layer | Service | Why |
|---|---|---|
| Public site, docs, editor SPA | Vercel | Deploys from GitHub, preview deployments per branch, trivial custom domains, free tier covers early usage |
| API + database | Railway | Native Node.js and PostgreSQL, simple env var management, deploys from GitHub, keeps API and DB adjacent |
| Assets, media, PDFs, packages | Cloudflare R2 | **Zero egress fees** — decisive for image-heavy pathology courses. S3-compatible API, so the storage module needs no rewrite and AWS migration stays open |

Rough cost: $20-40/month versus $100-200+ on AWS for equivalent capability, with no infrastructure to operate solo.

Explicitly avoided until real usage pressure justifies them: EC2, ECS, Kubernetes, microservices, self-managed PostgreSQL on a VM, complex CI/CD, multi-cloud.

**Environments:**

| Environment | Purpose | URL |
|---|---|---|
| Local | Claude Code development, schema changes, player testing | localhost (Vite dev servers + local Postgres via docker-compose) |
| Staging | Pre-production, SCORM Cloud testing, Ethos testing, reviewer testing | staging.mnemonify.org |
| Production | Real hosted users, public demos | mnemonify.org, app.mnemonify.org |

**Domains:** mnemonify.org (project home), app.mnemonify.org (hosted app), docs.mnemonify.org (documentation), staging.mnemonify.org (staging), mnemonify.app (redirect to app subdomain initially; may become a product landing page later).

**Operational baseline required before any real user uploads content:** PostgreSQL backups, R2 replication or backup plan, error logging, uptime monitoring, admin account recovery, rate limiting on login and upload endpoints, file type validation, file size limits, a virus scanning plan for uploads, privacy policy, terms of use, license clarity for uploaded content, and a visible open-source license notice.

### 17.1 One-click deploy (self-hosters)

Railway and Render one-click deploy configs in deploy/ directory. Each config provisions: Node.js server, PostgreSQL database, S3-compatible storage (Railway Volumes or Render Disks), and sets required environment variables via a setup wizard. Non-technical self-hosters can deploy without touching the command line.

### 17.2 Manual self-host

Full setup guide (Phase 6 deliverable) covering: Node.js + PostgreSQL install, environment variables, asset storage config, SMTP for email notifications, optional Whisper install for local caption generation, optional DeepL API key for translation.

### 17.3 Dev environment

docker-compose.yml in deploy/ starts PostgreSQL and the server locally. Player and editor run via Vite dev server (npm run dev in their respective packages).

## 18. Word Importers (Phase 5)

Two importers, one shared pipeline. Both accept a .docx upload, both produce a proposed course JSON plus a flagged-items list, both feed the same pre-import review screen, and both always create a draft rather than publishing. The author chooses which at upload time.

### 18.1 Smart Import (rule-based, free, no API key)

This is the default and the one that must work for every educator, including those who will never configure an API key. Built on mammoth.js, already in the stack.

The parser reads the .docx's semantic structure and applies deterministic rules:

| Word structure | Mnemonify block |
|---|---|
| Heading 1 / 2 / 3 styles | heading block at matching level |
| Normal paragraph | text block |
| Bulleted list | list block (unordered) |
| Numbered list | list block (ordered) |
| Table | table block |
| Embedded image | image block; binary extracted via mammoth, saved as an asset, referenced in position |
| 3+ consecutive images | carousel block |
| Bold/heading paragraph followed by A. B. C. D. options | knowledge_check block |
| Paragraph after a "Correct answer:" label | correct_feedback on the preceding knowledge_check |

**Explicit author hints.** If the document contains a bracketed marker before a section — `[[Accordion]]`, `[[Tabs]]`, `[[Two Column]]`, `[[Reflection]]` — the parser treats it as authoritative and builds that block type without inference. Authors who learn this convention get materially better imports; authors who don't still get a useful rough draft. The marker is stripped from the output content.

Honest limits, surfaced in the review screen rather than hidden: the parser has no understanding of context. It cannot know that a CAP "Ancillary Studies feedback" section means a per-option accordion. Image placement within flowing text is approximate. Anything ambiguous is flagged for the author rather than guessed at.

### 18.2 AI Import (Claude API, optional, power users)

For documents the rule-based parser cannot handle well: narrative-heavy storyboards, inconsistent formatting, or domain structures like the CAP HPATH format where section meaning matters more than document structure.

Requires an API key configured at organisation level. If no key is configured, the option is hidden and Smart Import is the only choice.

The server extracts the document text and table structure using mammoth.js, then sends it to the Claude API (claude-sonnet-4-6) with a system prompt that instructs it to:

1. Identify which of the two CAP storyboard formats is present (HPATH table format or NP narrative format)
2. Map each section to a Mnemonify block type using this mapping:
   - Clinical Information, Specimen Source, Clinical History → text block
   - Test Results with data table → table block
   - Whole Slide Image with DigitalScope URL → two_column block (text description left, embed block right)
   - Ancillary Studies with per-option feedback → accordion block (one item per study option)
   - Diagnostic List / Questions with A-E options → knowledge_check block
   - Diagnostic Images with Image Name references → image blocks (filenames flagged for upload)
   - Discussion, Diagnosis, Take Home Points → text and heading blocks
   - References → references block
3. Return a complete Mnemonify course JSON (schema version 1, valid against packages/schema/course.schema.json)
4. Flag any sections it could not confidently map, with a reason

The server validates the returned JSON against the schema. The editor presents a pre-import review screen showing: mapped blocks (count and types), flagged sections (with Claude's reason), and any image filenames that need to be uploaded separately. Author confirms and the draft course is created. Always produces a draft, never auto-publishes.

The Claude API call uses the standard Anthropic /v1/messages endpoint. The system prompt, mapping rules, and JSON schema are stored in packages/server/src/storyboard-converter/ and are versioned alongside the code so the mapping can be improved over time without touching the server logic.

## 18.3 Normalized import plan

Rule-based and optional AI importers must first create a reviewable normalized import plan containing proposed pages and blocks, source locations, extracted assets, inferred relationships, confidence, warnings, unresolved fields, and required author decisions. Importers must not write unvalidated source material directly into canonical course data.

## 19. Security and Deployment Baseline

- Passwords hashed (argon2). Sessions via httpOnly cookies.
- All author-supplied text sanitised before render (no raw HTML injection through content fields).
- No author-supplied executable code in v1 (see trigger engine rules and P2-7).
- Telemetry learner_id is a hashed value, not a raw LMS user identifier.
- Embed iframes sandboxed with minimal allowances. Domain allowlist enforced server-side.
- One-click deploy configs use environment variables for all secrets; no secrets in the repository.

## 20. Development Workflow (for Claude Code sessions)

1. Every session starts by reading REQUIREMENTS.md, ARCHITECTURE.md, DECISIONS.md.
2. Work only on the current phase; do not build ahead (see REQUIREMENTS.md Section 10).
3. Any architectural deviation requires updating this document in the same commit, plus a DECISIONS.md entry (date, decision, reason).
4. The trigger engine, media manager, SCORM module, and analytics telemetry module require unit tests. UI relies on manual checks against phase acceptance criteria.
5. samples/sample-course.json is the living reference. Every new block type or trigger capability is added to it and it must always render clean in the player.
6. Git commit at every working milestone with plain-language messages so a non-technical owner can roll back safely.

## 21. Deliberate Simplifications (v1)

- No microservices, no GraphQL, no state management libraries beyond React built-ins unless a concrete need appears.
- No CSS frameworks in the player; hand-rolled design tokens keep the SCORM launcher bundle small.
- Last-write-wins editing with lock warnings instead of collaborative editing.
- Local file storage for assets in development; storage abstraction in one module so S3 slots in later.
- Whisper runs server-side locally in development; can be replaced with a hosted API in production without changing the caption pipeline interface.
