# Architecture: Open Course Builder (working title)

**Version:** 0.1 (Draft)
**Companion to:** REQUIREMENTS.md
**Status:** Pre-development
**Last updated:** July 10, 2026

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
- **Player:** React + Vite, built as a self-contained bundle. Runs in three contexts with identical behavior: (a) live preview inside the editor, (b) inside an exported SCORM zip in an LMS, (c) standalone web export. Context is detected at startup.
- **Backend:** Node.js (Express or Fastify) + PostgreSQL. Stores courses, users, organizations, media, comments. Also performs SCORM packaging.

## 2. Repository Structure (monorepo)

```
course-builder/
  REQUIREMENTS.md
  ARCHITECTURE.md
  DECISIONS.md            <- running log of choices made and why
  LICENSE                 <- AGPL-3.0
  packages/
    schema/               <- JSON schema definitions + validation (shared)
    player/               <- the course player
    editor/               <- the authoring app
    server/               <- Node.js API + SCORM packager
  samples/
    sample-course.json    <- hand-written reference course, kept current
```

The `schema` package is shared by all three parts so there is exactly one definition of what a course is. Any schema change happens there first.

## 3. Course JSON Document Model

### 3.1 Hierarchy

```
Course
  meta (title, version, settings, theme choices)
  variables[]            <- course-level, shared across all pages
  assets[]               <- images, media, with ids, alt text, captions
  pages[]
    page meta (id, title)
    blocks[]
      block (id, type, content, layout hints, triggers[])
```

### 3.2 Key design rules

1. **Variables live at course level only.** Blocks reference variables by name; they never own them. This lets any block react to any other block's actions.
2. **Assets are course-level objects with ids.** Blocks and inline text links reference assets by `asset_id`. This is what makes the lightbox-from-text-link feature work (P1-9) and keeps alt text and captions in one place (P1-11).
3. **Every id is a short unique string** (`blk_`, `pg_`, `ast_`, `trg_` prefixes) generated once and never changed, so triggers never break when content is edited.
4. **All learner-facing text lives in the JSON**, never hardcoded in the player (future localization, P2).
5. **Schema is versioned.** `"schema_version": 1` at the top. The player must refuse or migrate mismatched versions, never guess.

### 3.3 Reference example (abridged)

```json
{
  "schema_version": 1,
  "meta": {
    "course_id": "crs_a1b2",
    "title": "Intro to Frozen Sections",
    "theme": { "accent": "#0f766e", "font_pair": "default" }
  },
  "variables": [
    { "name": "readCaseIntro", "type": "boolean", "default": false },
    { "name": "quizScore", "type": "number", "default": 0 }
  ],
  "assets": [
    {
      "asset_id": "ast_slide01",
      "kind": "image",
      "src": "assets/slide01.jpg",
      "alt": "H&E stained section showing ...",
      "caption": "Figure 1. Frozen section, 10x."
    }
  ],
  "pages": [
    {
      "page_id": "pg_intro",
      "title": "Case Discussion",
      "blocks": [
        {
          "block_id": "blk_case1",
          "type": "text",
          "content": {
            "rich_text": [
              { "t": "text", "v": "The biopsy showed " },
              { "t": "asset_link", "v": "clear margins", "asset_id": "ast_slide01" },
              { "t": "text", "v": " on initial review." }
            ]
          },
          "triggers": []
        },
        {
          "block_id": "blk_acc1",
          "type": "accordion",
          "content": { "items": [ { "title": "Reveal diagnosis", "body_blocks": [] } ] },
          "triggers": [
            { "trigger_id": "trg_001", "event": "onOpen",
              "actions": [ { "action": "SET_VAR", "var": "readCaseIntro", "value": true } ] }
          ]
        },
        {
          "block_id": "blk_next",
          "type": "button",
          "content": { "label": "Continue" },
          "visibility": { "initial": "hidden" },
          "triggers": [
            { "trigger_id": "trg_002", "event": "onVarChange",
              "condition": { "var": "readCaseIntro", "op": "==", "value": true },
              "actions": [ { "action": "SHOW_BLOCK", "target": "blk_next" } ] }
          ]
        }
      ]
    }
  ]
}
```

Note: `asset_link` inside rich text is how a phrase in a case discussion opens a lightbox. The player renders it as an accessible button-styled link whose default action is `OPEN_LIGHTBOX(asset_id)`.

## 4. Trigger and Variable Engine (player core)

A small event bus inside the player. Nothing else in the player mutates state.

- **Events:** `onPageEnter`, `onPageExit`, `onClick`, `onOpen`, `onClose`, `onComplete`, `onCorrect`, `onIncorrect`, `onVarChange`, `onTimerEnd` (timer P1)
- **Actions:** `SET_VAR`, `ADJUST_VAR` (numeric +/-), `SHOW_BLOCK`, `HIDE_BLOCK`, `ENABLE_BLOCK`, `DISABLE_BLOCK`, `JUMP_TO_PAGE`, `OPEN_LIGHTBOX`, `SET_STATE` (block visual state, P1-3), `SCORM_COMPLETE`, `SCORM_SET_SCORE`
- **Conditions:** comparisons (`==`, `!=`, `>`, `<`, `>=`, `<=`) on variables, combinable with `AND`/`OR` (nested `{ "all": [...] }` / `{ "any": [...] }` structure)

Rules:
- Actions are declarative data, never author-supplied code. (The P2 JavaScript block, if ever built, goes through a separate sandboxed path and the documented `player.getVar`/`player.setVar` API only.)
- The engine is pure and unit-testable: given (state, event) it returns (new state, effects). This is the most-tested module in the codebase.
- Full variable state + current page serialize to a compact string for SCORM `suspend_data` (64KB budget; abbreviate keys).

## 5. Player

- Renders the block tree top to bottom, single column, mobile-first CSS (flexbox/grid). Optional `layout: "row"` groups stack on narrow screens automatically. No pixel positioning anywhere, ever.
- **Design system is baked in:** type scale, spacing scale, color tokens (accent applied from course theme), block styles. Contrast-safe token pairs only (P1-11).
- **Accessibility as build practice:** semantic HTML, keyboard operability, visible focus, ARIA where needed, alt text from assets. Every new block type ships with a keyboard + screen reader check.
- **Runtime contexts:** detects SCORM (finds `API_1484_11` in parent frames), preview (message channel from editor), or standalone. All LMS communication is isolated in one module: `packages/player/src/lms/scorm2004.js`. Nothing else in the player touches SCORM. (This isolation is what keeps xAPI possible later, P2-2.)

### 5.1 Zoom engine (pathology track)

The side-by-side compare block (P1-12) and the deep-zoom whole-slide viewer (P2-8) share one zoom-engine abstraction, built once. It handles pan, zoom, and (for compare) synchronized transforms across two viewports. Requirements:

- Build the compare block first (Phase 5) directly on this abstraction, even though a single-image case is simpler, so the deep-zoom viewer (Phase 7) is an extension, not a rewrite.
- The deep-zoom viewer consumes tiled images (e.g., DZI/OpenSeadragon-style tiles). Tiling and tile storage sit behind the same asset-storage module (Section 8); the player only requests tiles by asset id and zoom/position.
- Annotations are asset-level data (coordinates + reveal-at-zoom-level + caption), so they travel in the JSON like any other content and stay accessible.

### 5.2 Confidence-weighted knowledge check (pathology track)

The confidence check (P1-13) is not a new engine, just a knowledge-check variant that writes two variables per question instead of one: the answer correctness and the learner-selected confidence level. Because both are ordinary course variables, existing triggers and conditions handle everything downstream (e.g., `if answer == incorrect AND confidence == high then SHOW_BLOCK review_flag`). No special-casing in the engine; the pedagogy lives in author-built triggers.

## 6. SCORM 2004 3rd Edition Module

- Discovers `API_1484_11` per spec (walk parent/opener frames).
- Reports: `cmi.completion_status`, `cmi.success_status`, `cmi.score.scaled/raw/min/max`, `cmi.location` (page id), `cmi.suspend_data` (serialized variables), `cmi.exit`, `cmi.session_time`.
- Completion rule is a course setting: "viewed all pages" (default) or "passed final knowledge check."
- **Packaging (server-side):** the server bundles the player build + course JSON + assets + `imsmanifest.xml` (SCORM 2004 3rd Ed schema files) into a zip.
- **Test path:** every packaging change is verified on SCORM Cloud before Ethos. Ethos quirks (if any) get documented in DECISIONS.md.

## 7. Editor

- React SPA. Left: page list. Center: live block canvas with inline click-to-edit text. Right: contextual settings panel for the selected block.
- Preview toggle renders the actual player at 375 / 768 / 1280 px widths inside the editor. Same player bundle, no separate preview renderer.
- **Trigger builder UI:** sentence-style dropdowns ("When [this accordion] [is opened], [set] [readCaseIntro] to [true]"). Dropdowns are populated only with valid choices for the selected block type, so invalid triggers are impossible to construct. Triggers render back as readable sentences.
- Autosave: debounced PATCH to the API within 5 seconds of any change; last-write-wins with a simple record lock warning if another author has the course open (no real-time co-editing, per non-goals).

## 8. Backend and Data Model

Node.js + PostgreSQL. Core tables (all rows carry `organization_id`):

| Table | Purpose |
|---|---|
| organizations | tenant boundary from day one (P2-3 insurance) |
| users | email + password (hashed), role (admin/author) |
| courses | course metadata + current JSON document (JSONB column) |
| course_versions | snapshot on publish; enables rollback |
| assets | uploaded media metadata; files on disk in dev, S3-compatible storage later |
| review_links | tokenized share links (no reviewer account needed, P1-10) |
| comments | pinned to `course_id` + `block_id`, threaded via `parent_comment_id`, status open/resolved |

API is a plain REST JSON API. The editor is its only client in v1; keep it boring and documented.

**Review mode (P1-10):** a review link serves the player in "review" context plus a lightweight comment layer (comment pins on blocks, thread panel). Reviewers identify by typed name only. This reuses the player untouched; the comment layer is a wrapper.

**Embed block security (P1-7):** iframes render sandboxed (`sandbox` attribute, minimal allowances) and the editor validates embed URLs against a per-organization allowlist (defaults include YouTube and Vimeo).

## 9. Security and Deployment Baseline

- Passwords hashed (argon2/bcrypt); sessions via httpOnly cookies.
- All author-supplied text sanitized before render (no raw HTML injection through content fields).
- No author-supplied executable code anywhere in v1 (see trigger engine rules).
- Dev: everything runs locally via `docker compose` (Postgres) or local Postgres install. Prod later: single small AWS instance or container service; S3 for assets. Self-host guide is a Phase 6 deliverable.

## 10. Development Workflow (for Claude Code sessions)

1. Every session starts by reading REQUIREMENTS.md, ARCHITECTURE.md, DECISIONS.md.
2. Work only on the current phase; do not build ahead (see REQUIREMENTS.md Section 10).
3. Any architectural deviation requires updating this document in the same commit, plus a DECISIONS.md entry (date, decision, reason).
4. The trigger engine and SCORM module require unit tests; UI can rely on manual checks against phase acceptance criteria.
5. `samples/sample-course.json` is the living reference: every new block type or trigger capability is added to it and it must always render clean in the player.
6. Git commit at every working milestone with plain-language messages, so a non-technical owner can roll back safely.

## 11. Deliberate Simplifications (v1)

- No microservices, no GraphQL, no state management libraries beyond React's built-ins unless a concrete need appears.
- No CSS frameworks in the player; hand-rolled design tokens keep the SCORM bundle small.
- Last-write-wins editing with lock warnings instead of collaborative editing.
- Local file storage for assets in development; storage abstraction kept to one module so S3 can slot in later.
