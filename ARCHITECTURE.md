# Architecture: Mnemonify

**Version:** 0.3 (In development)
**Companion to:** REQUIREMENTS.md
**Status:** Phases 1–4, Phase 3.5, and Phase 4.5 (4.5a stable IDs and migrations, 4.5b block registry and dependency index, and 4.5c the minimal Course Analyzer) are complete and verified against real production course data. Phase 4.6 is partially complete: Course Health finding grouping shipped with 4.5c, while Basic/Advanced settings grouping and the bulk alt-text review screen remain. Phase 5 is partially complete: interactive video, captions/transcripts, PDF publish artifacts, flashcards, matching, ordering, image hotspot, and reflection are built; analytics telemetry capture/storage is built but reporting UI is not; Smart Import, AI Import, and text-to-speech remain unbuilt. Phase 5.5 P1-68 through P1-75 are shipped. Phase 6 (6a accounts/roles/permissions, 6b review/commenting, and 6c anonymous share links) is complete and verified against real accounts and real course data, including direct server-side role-enforcement checks. Recent verification/hardening fixes and v1-scope additions are complete, with remaining live SCORM/manual verification items recorded in DECISIONS.md.
**Last updated:** August 14, 2026 — Phase 6 completion and pre-deployment accuracy reconciliation

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
    objectives[]         <- optional course-level learning objectives
  variables[]            <- course-level, shared across all pages
  assets[]               <- images, media, captions, with ids, alt text, captions
  question_banks[]       <- reusable bank questions and draw sources
  linked_entities[]      <- optional canonical content shared by page/bank usages
  glossary_terms[]       <- course-specific terms; meta.glossary_id attaches one library glossary
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

Rich-text fields continue to use the existing segment array. Inline formatting and block-level lists/alignment are stored as sanitized HTML in `html` segments; the editor/player allowlist preserves `ul`, `ol`, `li`, and only `center`, `right`, or `justify` text alignment. No new list/alignment segment type or migration is required, and the player re-sanitizes the HTML before rendering.
7. **Translations are a parallel content layer.** The translations object at course level holds BCP-47 language codes as keys. Each key maps to a partial course structure with only the content fields that differ. The player merges the selected language over the default content at render time.

### 3.3 Course meta settings

```json
"meta": {
  "course_id": "crs_a1b2",
  "title": "Intro to Frozen Sections",
  "schema_version": 1,
  "theme": { "accent": "#0f766e", "font_pair": "default" },
  "nav_mode": "linear",
  "back_button_enabled": false,
  "page_groups": [
    {
      "group_id": "grp_01",
      "title": "Case 1",
      "page_ids": ["pg_01", "pg_02"],
      "objective_ids": ["obj_01"]
    }
  ],
  "objectives": [
    {
      "objective_id": "obj_01",
      "label": "Identify features of MDS with del(5q)",
      "description": "Recognize the defining morphologic and molecular features."
    }
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
- Cell content is plain text only. No rich text, no nested blocks.
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
    {
      "objective_id": "obj_01",
      "label": "Identify features of MDS with del(5q)",
      "description": "Recognize the defining morphologic and molecular features."
    }
  ],
  "concepts": [
    { "concept_id": "cpt_01", "name": "Immunohistochemistry interpretation" }
  ]
}
```

- `header` / `footer`: rendered on every page in the player and included in PDF export. Optional; omit or leave empty to render nothing.
- `page_numbering`: when true, nav drawer and player chrome show "Page N of M", recalculated on page add/delete/reorder.
- `objectives`: optional course-level objects with required `objective_id` and `label`, plus optional `description`. This is the author-facing shape specified by P1-68. The existing P1-37 schema hook remains readable for backward compatibility; courses that omit objectives require no migration and behave exactly as before.
- `page_groups[].objective_ids`: optional references to course-level objective ids. A group/module does not own or duplicate objectives; this is membership/assignment only. An empty or omitted array means the module has no objective filter.
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
- `objective_ids` / `concept_ids`: optional arrays referencing course-level ids. For a `knowledge_check` block, `objective_ids` maps the question to one or more learning objectives. The same field is used on each reusable question-bank question so inline and bank-sourced questions share one mapping shape. Other block types may retain the field for future objective coverage and compatibility, but P1-68's selection behavior applies to questions.

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

### 3.11 Flashcards, Matching, Ordering, Image Hotspot block schemas (Phase 5)

**Flashcards** (P1-59) — a study aid, not an assessment. No scoring, no trigger events beyond standard onClick if needed later.

```json
{
  "type": "flashcards",
  "content": {
    "cards": [
      {
        "card_id": "crd_01",
        "front": { "rich_text": [], "image_id": null },
        "back": { "rich_text": [], "image_id": null }
      }
    ]
  }
}
```

Player: one card visible at a time, click/tap flips front↔back, Previous/Next navigate the deck, a position indicator shows "Card N of M." Enter/Space flips the focused card; arrows or Tab-reachable buttons navigate.

**Matching** (P1-60) — fixed prompts on the left, each with a dropdown of shuffled answer options on the right.

```json
{
  "type": "matching",
  "content": {
    "prompts": [
      { "prompt_id": "mp_01", "text": { "rich_text": [] }, "correct_option_id": "mo_02" }
    ],
    "options": [
      { "option_id": "mo_01", "text": { "rich_text": [] } },
      { "option_id": "mo_02", "text": { "rich_text": [] } }
    ],
    "allow_retry": true
  }
}
```

Player: Submit checks all pairs at once; per-row correct/incorrect feedback after submit, matching the existing knowledge-check visual pattern. Score (correct pairs / total) reports to the trigger engine the same way a knowledge check does — same SET_VAR/onCorrect/onIncorrect wiring, no new engine concept.

**Ordering** (P1-61) — a shuffled vertical list; Up/Down buttons (and keyboard equivalents) reorder.

```json
{
  "type": "ordering",
  "content": {
    "items": [
      { "item_id": "ord_01", "text": { "rich_text": [] }, "correct_position": 0 },
      { "item_id": "ord_02", "text": { "rich_text": [] }, "correct_position": 1 }
    ]
  }
}
```

Player: items render in shuffled order at load; Submit compares final positions against `correct_position`. Scoring is partial credit: (items in correct position) / (total items). Feedback after submit highlights each item's correctness individually, not just a single pass/fail.

**Image Hotspot** (P1-62) — rectangular regions only in v1; author picks a mode per block.

```json
{
  "type": "hotspot",
  "content": {
    "image_asset_id": "ast_x",
    "mode": "exploratory",
    "regions": [
      {
        "region_id": "hs_01",
        "shape": "rect",
        "x_pct": 20.0, "y_pct": 15.0, "width_pct": 30.0, "height_pct": 25.0,
        "label": { "rich_text": [] },
        "correct": null
      }
    ]
  }
}
```

`mode` is `"exploratory"` or `"quiz"`. In exploratory mode, `correct` is unused/null — every region simply reveals its `label` content on click via the existing modal system. In quiz mode, `correct` is `true`/`false` per region, and the block tracks which correct/incorrect regions the learner has clicked, reporting a result to the trigger engine the same way a knowledge check does. Region coordinates are stored as percentages of the image's dimensions so hotspots stay correctly positioned across responsive breakpoints. Regions are keyboard-reachable in `region_id` order; Enter/Space activates a focused region in addition to click/tap.

All four block types plug into the existing trigger engine, media manager (n/a for these), and design system without any new engine capability — they are new block types in the registry (Phase 4.5b), not new architectural concepts.

### 3.12 Scoring, publish settings, system variables, interpolation, question banks (Phase 5.5)

**Course-level publish settings** (course.meta.publish_settings):

```json
"publish_settings": {
  "completion_criteria": "viewed_all_pages",
  "report_status_as": "both",
  "success_enabled": true,
  "passing_score_pct": 80
}
```

- `completion_criteria`: `"viewed_all_pages"` | `"passed_assessment"` | `"either"`
- `report_status_as`: `"completion_only"` | `"success_only"` | `"both"` — maps directly to whether cmi.completion_status, cmi.success_status, or both are meaningfully set at course end (Phase 2's SCORM module already sets both fields when available; this setting controls whether success_status is computed at all, or left as `"unknown"`)
- `success_enabled` / `passing_score_pct`: only meaningful if at least one Scored interaction exists in the course; if none exist, success/passing simply doesn't apply regardless of this setting, and the SCORM module reports completion_status only

`publish_settings` is authoritative for new courses. The earlier
`meta.completion_rule` field remains accepted for backward compatibility and
is translated by the v3 document migration; `passed_final_quiz` maps to
`completion_criteria: "passed_assessment"`.

**Scored flag on interaction blocks:** knowledge_check, matching, ordering, and hotspot (quiz mode) content objects all gain:

```json
"scored": true
```

Default `true` (matches existing implicit behavior for knowledge_check pre-Phase-5.5). When `false`: the block still evaluates and displays correct/incorrect feedback to the learner exactly as normal, but is excluded from the ScoreRaw/ScoreMax tally (P1-65) and from success/passing determination.

**System score variables:** maintained by the player itself, not stored in course.variables (they are computed, not authored). Reserved names, validated against at variable-creation time so an author cannot create a conflicting custom variable:

- `ScoreRaw` — count of correctly-answered Scored interactions across the whole course, live-updating
- `ScoreMax` — total count of Scored interactions in the course
- `ScorePercent` — `ScoreRaw / ScoreMax * 100`, rounded
- `ScorePassed` — boolean, `ScorePercent >= publish_settings.passing_score_pct` (only meaningful once a passing score is configured)

These feed the SCORM module's cmi.score.* and cmi.success_status fields directly at course completion, and are also usable inside the trigger engine's condition builder (e.g. "if ScorePercent >= 70, show congratulations block") and in text interpolation (below), the same as any author-created variable — they're just read-only.

**Live variable interpolation in rich text:** the existing rich_text array format (Section 3.2) gains a new segment type alongside `text` and `asset_link`:

```json
{ "t": "variable", "var_name": "ScorePercent" }
```

At render time, the player looks up the current value of `var_name` (checking system variables first, then course.variables) and substitutes it live. This re-renders reactively whenever the underlying variable changes (same reactivity model already used for P1-55's self-owned block visibility conditions). Works for both author-created and system score variables identically — no special-casing needed at the render layer, only at variable-name validation time (to reserve system names).

**Question banks:**

```json
"question_banks": [
  {
    "bank_id": "bnk_case_reviews",
    "questions": [
      {
        "question_id": "bq_01",
        "content": { /* same shape as a knowledge_check's content */ },
        "scored": true,
        "objective_ids": ["obj_01"]
      }
    ]
  }
]
```

A course-level array, sibling to `variables` and `assets`. A new block type references a bank:

```json
{
  "type": "question_bank_draw",
  "content": {
    "bank_id": "bnk_case_reviews",
    "draw_count": 5,
    "objective_fallback": "draw_fewer"
  }
}
```

At course launch, the player selects `draw_count` random questions from the eligible pool (seeded once per learner attempt — store the seed or the drawn question_ids in SCORM suspend_data so revisiting a page mid-attempt shows the SAME drawn questions, not a re-randomized set). Each drawn question renders and scores exactly like an inline knowledge_check block. The same bank can be referenced by multiple `question_bank_draw` blocks at different points in a course (e.g. five per-case quizzes and one larger final-assessment draw all pulling from the same or different banks), which is what makes cross-course reuse and a cumulative final assessment possible.

For a draw block inside a module/group with `objective_ids`, the eligible pool is the bank's questions whose `objective_ids` intersect the module's assigned objectives. Questions with no objective ids are treated as unmapped; questions mapped only to other objectives remain outside the filtered pool. If the filtered pool is smaller than `draw_count`, the editor prompts the author at that draw insertion with two choices:

- `objective_fallback: "draw_fewer"`: draw as many matching questions as are available.
- `objective_fallback: "include_unmapped"`: draw all possible matching questions and use unmapped questions to fill the remainder, up to `draw_count`.

`objective_fallback` is serialized only on that `question_bank_draw` block instance so a published course has a deterministic per-insertion decision. It is not a course-level or question-bank setting and is never used as a default for another insertion. If the draw is not in a module with assigned objectives, the full bank remains eligible and this fallback is irrelevant. A module with no assigned objectives therefore preserves the P1-67 behavior exactly.

### 3.13 Multi-select knowledge checks (P1-69)

Knowledge-check content remains one interaction and keeps its existing
single-select shape by default. The schema adds these optional fields to the
knowledge-check content object:

~~~json
{
  "multi_select": false,
  "correct_option_id": "opt_a",
  "correct_option_ids": [],
  "feedback_mode": "summary"
}
~~~

- "multi_select" defaults to false. When false, "correct_option_id" is the
  authoritative answer and the existing radio-button behavior is unchanged.
- When "multi_select" is true, "correct_option_ids" is the authoritative
  non-empty array of option ids. "correct_option_id" is omitted or null and
  must not be used for scoring.
- "feedback_mode" is "summary" or "per_option" and defaults to "summary". It
  controls post-submit presentation only; both modes use the same all-or-
  nothing score.
- A multi-select submission is correct only when its selected option-id set
  exactly equals "correct_option_ids"; ordering does not matter. A scored
  question contributes one possible point and at most one earned point.
- Per-option feedback is derived at submit time from the selected set and the
  correct set. It is not a second scoring model and does not change the
  persisted answer identity.

The existing single-select fields are not rewritten when a course is loaded.
The schema migration only supplies the new defaults when needed, so old
knowledge checks remain byte-compatible in meaning. Question-bank questions
use the same content shape, including these fields. Objective ids, variable
segments, answer-state persistence, and the score-state idempotency guard are
shared with single-select knowledge checks.

### 3.14 Named version history (P1-70)

The existing immutable course_versions model is extended for manual named
snapshots. A version record keeps the complete course JSON snapshot and asset
references, and gains:

~~~json
{
  "version_id": "ver_012",
  "course_id": "crs_a1b2",
  "kind": "named_snapshot",
  "name": "Beta review",
  "created_by": "usr_07",
  "created_at": "2026-07-22T15:30:00Z",
  "restored_from_version_id": null,
  "course_json": { "schema_version": 1 },
  "asset_manifest": []
}
~~~

- "kind" distinguishes a manual named_snapshot from a published version;
  existing published-version records remain valid.
- "name", "created_by", and "created_at" are required for named snapshots.
- "restored_from_version_id" is set when a restore creates a new version from
  an earlier snapshot. It is lineage metadata, not a mutable pointer.
- Saving a version and restoring a version are transactional operations. A
  restore reads the immutable source snapshot, updates the current editable
  course document, and inserts a new version record; it never updates or
  deletes the source or any intervening version.
- Autosave does not insert version rows. Publish continues to create the
  existing publish snapshot and version-assignment behavior is unchanged.

The editor's version-history modal reads an ordered list of records and
displays name, timestamp, author, kind, and restore lineage. Permissions use
the existing course author/editor authorization boundary.

### 3.15 Searchable shareable glossary (P1-71)

Glossaries are organisation-scoped library records. A course attaches at most
one library glossary and may carry its own terms:

~~~json
{
  "meta": {
    "glossary_id": "glo_pathology"
  },
  "glossary_terms": [
    {
      "term_id": "term_course_01",
      "term": "del(5q)",
      "definition": { "rich_text": [ { "t": "text", "v": "A deletion..." } ] },
      "source": "course",
      "shared_library_term_id": null
    }
  ]
}
~~~

Library records contain stable glossary_id and term_id values, term text,
rich-text definition, optional pronunciation/synonyms metadata, and owning
organisation. glossary_terms contains only course-specific terms; the player
resolves the learner-facing glossary as the union of the attached library
terms and these local terms, with a course-specific term taking precedence
for the same normalized term text.

Accepted links add a rich-text segment alongside text, asset_link, and
variable:

~~~json
{ "t": "glossary_link", "term_id": "term_course_01", "v": "del(5q)" }
~~~

The "v" value preserves the displayed text while term_id preserves the
definition identity. Detection and suggestion are authoring-time operations;
the player renders only accepted glossary_link segments and never silently
links matching plain text. A tooltip/focus preview and the full searchable
glossary panel both resolve through the same union. Sharing a course term
creates or promotes a library term explicitly and records
shared_library_term_id; it does not mutate other courses silently.

### 3.16 Question-bank editor redesign (P1-72)

This feature is primarily an editor presentation and workflow change. It does
not change the runtime question_banks or question_bank_draw block shape. The
bank question object gains an optional author-managed tags array to support
bank-local filtering and bulk assignment:

~~~json
{
  "question_id": "bq_01",
  "content": { "question": { "rich_text": [] }, "options": [] },
  "scored": true,
  "objective_ids": [ "obj_01" ],
  "tags": [ "cytogenetics", "review" ]
}
~~~

Missing tags is treated as an empty array. Search indexes question text,
question type, objective_ids, and tags; bulk operations update only the
selected bank questions. The large modal, master-detail selection, and dirty
state behavior are editor concerns and are not serialized into published
course JSON.

### 3.17 Question-bank export and import (P1-73)

Native exports use a versioned envelope so the importer can distinguish a
Mnemonify document from a standard-format file:

~~~json
{
  "format": "mnemonify.question_bank",
  "format_version": 1,
  "exported_at": "2026-07-22T15:30:00Z",
  "bank": {
    "bank_id": "bnk_case_reviews",
    "title": "Case reviews",
    "questions": []
  }
}
~~~

The native bank payload preserves all supported question fields, rich-text
segments, asset references, scoring flags, objective ids, tags, and stable
source ids. Standard QTI/GIFT exports are adapters over the same bank model;
they may omit Mnemonify-specific feedback, assets, objectives, variables, or
other fields and must report those omissions.

Import is a staged operation. The parser first normalizes the source into an
import-preview model, resolves references against the target course, and
reports missing objective ids and variable names with question and field
locations. The author then chooses merge into an existing bank or create_new
and confirms the preview. Imported ids are regenerated when necessary to
avoid collisions; existing questions are never overwritten. Missing
references are retained as unresolved validation findings and cannot be
silently dropped or auto-created. No import-preview state is part of the
published course JSON.

### 3.18 Linked question-to-bank entities (P1-74)

Linked use requires a canonical course-level entity rather than two copies of
the block content. The document adds an optional collection:

~~~json
{
  "linked_entities": [
    {
      "entity_id": "ent_01",
      "block_type": "knowledge_check",
      "content": { "question": { "rich_text": [] }, "options": [] },
      "metadata": { "scored": true, "objective_ids": [], "tags": [] }
    }
  ]
}
~~~

Any registered block type may be represented by block_type and its complete
content/settings payload. A page block usage and a bank entry can reference
the same entity:

~~~json
{
  "type": "knowledge_check",
  "linked_entity_id": "ent_01"
}
~~~

~~~json
{
  "question_id": "bq_01",
  "linked_entity_id": "ent_01"
}
~~~

When linked_entity_id is present, the entity is authoritative and an
embedded duplicate content payload is not stored. Existing inline blocks and
legacy bank questions without the reference remain valid. Linking from either
the block action or bank drop target calls the same relationship operation.

An edit is first held as an editor pending change. Confirmation applies one
canonical update to the entity and all usages; cancellation leaves the entity
and every usage untouched. Unlinking materializes independent content for the
affected usage and removes only that relationship. Delete-everywhere removes
the entity and all usages atomically after confirmation. This is deliberately
whole-entity linking: there is no field-level relationship or independent
scoring copy.

### 3.19 Back button, generic button block, and external rich-text links (v1)

Course navigation may opt into an automatically rendered Back button with the
optional `meta.back_button_enabled` boolean (default `false`). The player
derives the previous page from the authoritative `pages[]` order; it renders
nothing on the first page and backward navigation remains available in linear
mode. No page-level override is added because the existing page-settings model
has no course-default override pattern for this setting.

The generic Button block is registered as `button` and uses the existing
internal page-id reference shape used by utility and trigger navigation:

~~~json
{
  "type": "button",
  "content": { "text": "Go to Case 1", "target_page_id": "pg_case_1" }
}
~~~

Its only v1 action is internal page navigation. The editor reuses the shared
page list and page-id value, while the player invokes the same direct page
navigation path used by author-configured page jumps. It is excluded from PDF
content by the registry default.

Rich-text links remain in the existing `html` segment format; no new segment
type or schema migration is required. The sanitizer allows only `http` and
`https` anchor destinations and removes all other protocols/attributes. The
player renders accepted external anchors with `target="_blank"` and
`rel="noopener noreferrer"`, which is the deliberate v1 exception to the
general in-player containment rule because this feature explicitly requires
learners to open external links in a new tab.

### 3.20 Dashboard course search (P1-75)

Dashboard search is an editor-only presentation concern and does not alter the
course JSON document, schema version, migrations, server API, or course-list
fetching contract. `CourseLibrary.jsx` owns the transient query state and
passes it to the pure `filterCoursesByTitle()` helper and `CourseResults`
presentational component. The helper trims and lowercases the query and title,
then performs a substring match; an empty query returns the original array so
the existing ordering and card behavior are preserved.

When the loaded course list is non-empty, the dashboard renders a tokenized
search input above the grid. A query with no matches renders a status empty
state instead of an empty grid. Course-card duplicate, delete, and navigation
callbacks continue to receive the same course objects and use the existing
handlers. Search state is intentionally not persisted: leaving or reloading
the dashboard starts with the complete course list.

The implementation uses the existing `--border-strong`, `--radius-input`,
`--text-tertiary`, `--accent`, and `--accent-soft` tokens. Focused editor tests,
the full repository test suite, the editor production build, and a local
browser smoke test covering match, no-match, and clear-to-restore behavior
passed on July 25, 2026. This browser check does not claim live SCORM or
cross-browser verification.

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
- Custom items: author-defined label + action (OPEN_MODAL with content payload or JUMP_TO_PAGE). Modal items retain the legacy required `target` string and may additionally carry `target_rich_text`, an optional rich-text segment array used when the author formats the message. The player prefers `target_rich_text` and falls back to the legacy string, so existing courses require no migration. No external links.
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
| course_versions | immutable publish and named-snapshot records; version_id, kind, name, created_by, created_at, restored_from_version_id, published_at, publish_mode (push_all / lock_existing), course_json, asset manifest |
| version_assignments | learner_id + course_id + version_id; one record per learner per course |
| assets | uploaded media metadata; files on disk in dev, S3-compatible later |
| glossaries | organisation-scoped reusable glossary metadata and attachment library |
| glossary_terms | glossary term text, rich-text definition, synonyms/pronunciation metadata, and stable term ids |
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

On video upload, server sends audio track to Whisper (runs server-side, no external API cost) when `WHISPER_ENABLED` permits it. Production deployments without the Whisper runtime set `WHISPER_ENABLED=false`; those uploads create a manual-required caption/transcript state instead of starting a job, and the editor presents VTT/SRT upload plus manual transcript entry. Returns draft WebVTT saved to captions table with source: whisper and review_status: draft when automatic generation is enabled. Author reviews in caption editor. Author can upload own WebVTT or SRT to override (source: manual). Captions delivered to player as a text track on the video element. Learner toggles CC button. Caption styling respects OS-level preferences.

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
7. Server triggers caption generation for any new video assets when `WHISPER_ENABLED` is on; otherwise marks them manual-required
8. Thin launcher zip (already in Ethos) does not need to be replaced

### 15.2 Content server URL

The thin launcher includes a config.json with the Mnemonify content server base URL and course_id. On every launch, the launcher fetches:

GET /content/{course_id}?learner_id={hashed_id}

The server checks version_assignments, returns the correct version's player bundle URL and course JSON URL. The launcher loads both.

### 15.3 Version history and rollback

The course_versions table retains all published versions and P1-70 named
snapshots. The version-history UI lists both kinds, with named snapshots
identified by name, author, and creation time. Admin can roll back to any
prior published version: this creates a new version record pointing to the
prior snapshot's JSON and assets, then pushes to all (or a chosen segment).
Named restore uses the same additive rule but updates the editable course
state rather than publishing automatically. Rollback and restore are always
additive, never destructive; no existing course_versions row is overwritten.

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
3. Return a complete Mnemonify course JSON, valid against the CURRENT schema version at generation time (packages/schema/course.schema.json — never hardcode a specific version number; a freshly generated document must be born at whatever schema_version is current when it's created, since it has no prior stored state to migrate from)
4. Flag any sections it could not confidently map, with a reason

The server validates the returned JSON against the schema. The editor presents a pre-import review screen showing: mapped blocks (count and types), flagged sections (with Claude's reason), and any image filenames that need to be uploaded separately. Author confirms and the draft course is created. Always produces a draft, never auto-publishes.

The Claude API call uses the standard Anthropic /v1/messages endpoint. The system prompt, mapping rules, and JSON schema are stored in packages/server/src/storyboard-converter/ and are versioned alongside the code so the mapping can be improved over time without touching the server logic.

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

# Phase 4.5a: Stable IDs and Schema Migration Service

Add this section to ARCHITECTURE.md (technical foundation) and reference it from REQUIREMENTS.md's Phase 4.5 row. Commit before requesting a build prompt.

## Problem

Every addressable entity needs a stable, permanent ID so that later work (dependency index, Course Analyzer findings, safe-delete, "used by" navigation) can reference objects reliably instead of by array position or text matching. Some entities already have IDs (blocks, pages, assets per ARCHITECTURE.md 3.2). Others do not: individual answer options, nested accordion/tab items, per-option feedback variants, objectives, and objective-to-question mappings.

Separately, `schema_version` exists as a field but there is no actual migration pipeline. Opening an older course document currently has no deterministic upgrade path.

## Part 1: Stable IDs

### Scope — entities that need a stable ID and currently may not have one
- Answer options within knowledge-check and multi-select questions
- Nested items within accordion, tabs, flashcards, matching, ordering blocks
- Per-option feedback variants (correct/incorrect feedback tied to a specific option)
- Objectives (course-level and any per-module assignment records)
- Objective-to-question mapping records
- Any other nested/repeated sub-object identified during implementation that lacks an ID today

### Requirements
- ID format matches the existing convention (`ARCHITECTURE.md` 3.2: short unique string with a type prefix, e.g. `opt_`, `obj_`, `map_`) — do not invent a new ID scheme.
- IDs are generated once at creation and never change, matching the existing rule for blocks/pages/assets.
- Existing courses that lack these IDs get them generated deterministically during migration (Part 2), not silently at runtime — a course opened twice should not get two different sets of generated IDs.
- No visible change to authors — this is a data-layer addition, not a new authoring surface.

## Part 2: Schema migration service

### Requirements
- A sequential migration chain: `load → inspect schema_version → migrate N to N+1 (repeat until current) → validate → normalize → open`.
- Each migration step is a pure function: takes a course document at version N, returns a document at version N+1. No side effects, fully repeatable.
- Migrations run in the `schema` package (shared by editor, player, server per ARCHITECTURE.md Section 2), since all three need consistent migrated output.
- The original (pre-migration) document is retained until the migrated document saves successfully — never destroy the source before confirming the migration succeeded.
- Migrations emit structured diagnostics (what changed, what was added/generated) rather than silently transforming data.
- Downgrades are not supported or assumed.
- Test suite includes representative historical fixtures (real or representative course JSON at older schema versions) that must migrate correctly and deterministically.

### First real migration
The first migration implemented under this service is the one that adds the stable IDs from Part 1 to existing course documents that predate them. This proves the pipeline works end-to-end on real data before anything else depends on it.

## Out of scope for 4.5a
- The block registry (4.5b, next stage)
- The dependency index (4.5b, next stage)
- The Course Analyzer (4.5c, next stage)
- Plugin-owned migration hooks (future, per ARCHITECTURE-AUDIT.md 4.3 — noted for later, not built now)
- Any UI changes — this is entirely a data/schema-layer change

## Acceptance criteria
- Every entity listed in Part 1's scope has a stable ID, generated once and preserved across saves/reloads
- A course document at an older schema version opens correctly and is migrated to current version automatically
- The migration is a pure, tested, repeatable function living in the `schema` package
- Historical fixture tests pass
- No existing functionality regresses — this is purely additive at the data layer
- Manual verification: Sebastin opens a real pre-existing course (created before this change) and confirms it loads correctly, IDs are visibly present in the saved JSON, and nothing in the authoring experience changed

# Phase 4.5b: Block Registry and Dependency Index

Add this section to ARCHITECTURE.md. Commit before requesting a build prompt. Depends on Phase 4.5a (stable IDs) being complete — this stage assumes every entity it needs to index already has a stable ID.

## Problem

Per ARCHITECTURE-AUDIT.md Section 4.1: "Block behavior should not be distributed across switch statements and manually synchronized menus." Today, adding or reasoning about a block type likely means touching several separate places (editor component, player renderer, Add Block menu, PDF export, block-discovery surfaces) that are not derived from one source. Similarly, per Section 4.4, references between objects (which question uses which objective, which page a trigger targets, which asset a block displays) are not indexed anywhere — so deleting or renaming something can silently break a reference elsewhere with no warning.

## Part 1: Block registry

### Requirements
A central registry, one entry per block type, containing at minimum (per ARCHITECTURE-AUDIT.md 4.1, scoped to what already exists in the codebase — do not build adapters for exporters/contracts that don't exist yet):
- stable type identifier (matches existing block `type` field values)
- default/empty content shape for that block type
- editor component reference
- player renderer reference
- PDF export inclusion default (matches existing `include_in_pdf` per-type defaults, ARCHITECTURE.md 3.2 rule 6)
- icon, label, and category metadata (matches what the Add Block popup already displays, per commit ceeedcd2)
- nested-content permissions (which block types may contain nested blocks — two-column, accordion, tabs already do this; the registry should describe this declaratively rather than each container special-casing it)
- supported trigger events/actions for that block type, where applicable

### Migration approach
This is a refactor, not new functionality. Existing block-discovery surfaces (Add Block popup, editor rendering switch, player rendering switch, PDF export logic) should be refactored to derive from this registry rather than duplicating block-type lists. Behavior must not change for authors — this is invisible restructuring.

### Explicitly out of scope for 4.5b
- Plugin/extension capability model (ARCHITECTURE-AUDIT.md 4.2) — future, requires its own security/capability design
- Migration functions living in the registry (mentioned in the audit's ideal registry shape) — the 4.5a migration service is separate for now; unifying them is a future refinement, not required here
- Static preview renderer, Word export adapters — only build what block types actually already have equivalents for today

## Part 2: Dependency index

### Requirements
A derived (not separately authored) index of references between objects, built from the canonical course JSON. Per ARCHITECTURE-AUDIT.md 4.4, it should cover the reference types that actually exist in the current schema:
- objective → question/module (already tracked via `objective_ids` arrays)
- trigger → target block (`SHOW_BLOCK`/`HIDE_BLOCK`/`JUMP_TO_PAGE` targets, etc.)
- block → asset (image/video/carousel asset references)
- question bank → block (`question_bank_draw` blocks referencing a `bank_id`)
- variable → trigger/condition (which triggers read or set a given variable)
- linked entities (`linked_entities[]`) → their usages

### Capabilities this unlocks (build only what's needed for the capabilities below, not speculative extras)
- **Broken-reference detection:** find any reference (trigger target, asset_id, bank_id, objective_id, variable name) that points to an object that no longer exists.
- **"Used by" lookup:** given an object (an asset, a variable, an objective, a bank), list everything that references it.
- **Safe-delete check:** before deleting an object, check the dependency index and warn the author what currently references it, rather than silently breaking those references.

### Requirements
- The index is derived and rebuildable from course JSON at load/save time (or on demand) — it is never a second source of truth that could drift from the actual document.
- It should be efficient enough to run on save/load for realistically-sized courses without noticeable delay (no specific performance budget mandated yet — that's Phase 4.5's own future concern per the audit, not blocking this stage).

## Out of scope for 4.5b entirely
- The Course Analyzer itself (4.5c, next stage) — this stage only builds the index the Analyzer will consume
- Any new author-facing UI (no "used by" panel, no safe-delete confirmation dialog yet) — 4.5c and later UX work will surface this data to authors; 4.5b just makes the data available
- Rename/replace operations, orphan cleanup tooling, impact analysis reports — future capabilities once the index exists

## Acceptance criteria
- A single block registry exists; Add Block popup, editor rendering, player rendering, and PDF export logic all derive block-type behavior from it rather than independent lists
- No change in authoring or player behavior — this is a refactor
- A dependency index can be built from any course JSON, covering the reference types listed in Part 2
- Given a test course with a deliberately broken reference (e.g. a trigger targeting a deleted block, a question bank draw referencing a nonexistent bank), the index correctly identifies it
- Given an object referenced from multiple places, a "used by" query returns all of them correctly
- All automated tests pass
- Manual verification: Sebastin confirms in a real course that adding/editing a block still works exactly as before (no regression), and reviews the registry/index code or a demo output showing broken-reference detection working on a real example

# Phase 4.5c: Minimal Course Analyzer

Add this section to ARCHITECTURE.md (or REQUIREMENTS.md if that better matches where Course Health / analyzer-facing specs already live — follow existing convention). Commit before requesting a build prompt. Depends on Phase 4.5a (stable IDs) and 4.5b (block registry + dependency index) — both complete.

## Scope discipline

Per COURSE-ANALYZER.md, this is "Phase 1: foundation" only — a small, deterministic slice of that document's much larger multi-year vision. This stage builds ONLY:
- Schema and reference errors (using the 4.5b dependency index directly — no new detection logic needed for these, just surfacing what it already finds)
- Basic accessibility checks
- Basic asset checks
- The finding model, a Course Health panel with click-to-navigate, and pre-publish error gating

Explicitly NOT in this stage: analyzer profiles, snapshots/history, the learning-alignment graph, instructional-design suggestions, pedagogical rules, or any of COURSE-ANALYZER.md's other rule categories beyond the three above. If implementation surfaces a rule that feels valuable but falls outside this scope, note it as a future candidate rather than building it now.

## Part 1: Finding model

A finding has, at minimum:
- a stable rule ID (e.g. `broken-reference`, `missing-alt-text`)
- severity: `error` (blocks publish) or `warning` (does not block)
- a human-readable message
- the entity/object it concerns, referenced by its stable ID (per 4.5a) and type (per 4.5b's registry), so the UI can navigate directly to it
- category (matches the three scope areas above: reference, accessibility, asset)

## Part 2: Rules (~15 total across the three categories)

### Reference errors (source: 4.5b dependency index directly)
1. Broken reference of any kind returned by `getBrokenReferences()` (trigger target, asset reference, bank reference, objective reference, variable reference) — each broken reference type from 4.5b becomes its own finding, or one generic rule parameterized by reference type, whichever fits the registry better.
2. Orphaned question bank (a bank with zero blocks referencing it via `getDependents()`) — warning, not error (an author may intentionally keep a bank in reserve).
3. Duplicate `question_id`/`block_id`/other stable ID collision, if one is ever found (defensive check — should be prevented by 4.5a, but worth a rule in case a manual edit or future migration reintroduces one) — error.

### Basic accessibility checks
4. Image asset with missing or empty `alt` text — warning.
5. Video asset with `caption_status` not `ready` — warning (matches the existing caption/transcript status fields already in the schema).
6. Video asset with `transcript_status` not `ready` — warning.
7. Embed block with no descriptive `label` — warning.
8. Heading block with empty or missing text — warning.

### Basic asset checks
9. Asset referenced in course JSON but with no corresponding uploaded file (broken asset, distinct from broken block-reference — this checks the asset's own file existence, not who references it).
10. Resource (per `meta.resources[]`) with a `file_path` that doesn't resolve to an actual uploaded file — error (a missing downloadable resource is a real authoring mistake, not just a style warning).
11. Duplicate asset filenames that could cause ambiguity, if detectable cheaply — warning.
12. Video/image asset exceeding a sane file-size threshold likely to cause slow load — warning (threshold to be decided during implementation based on realistic course sizes; do not over-engineer this).

### Structural completeness (small additions to round out ~15, still within "schema/reference" and "basic asset" spirit — implementer may adjust count as long as scope stays within the three categories)
13. Question bank block (`question_bank_draw`) with a `draw_count` greater than the number of questions actually available in the referenced bank — error (this would fail silently or misbehave at runtime otherwise).
14. Page with zero blocks — warning.
15. Course with zero pages, or a `page_groups` entry with zero `page_ids` — warning.

The exact final rule set may be adjusted slightly during implementation as real schema shapes are examined, as long as it stays within the three scope categories above and around 15 rules — this list is a strong starting point, not a rigid contract.

## Part 3: Course Health panel

- Extends the existing Course Health icon-rail drawer (already present as a placeholder/existing feature per prior UI work) rather than building a new UI surface.
- Lists findings grouped by category (Reference, Accessibility, Asset) per ARCHITECTURE-AUDIT.md/COURSE-ANALYZER.md's own recommendation for finding grouping (this also satisfies part of the still-outstanding Phase 4.6 UX item).
- Each finding is clickable and navigates the author directly to the relevant page/block, using the stable ID from the finding model.
- Shows counts (e.g. "3 errors, 5 warnings") consistent with the existing warnings-badge pattern already in the top bar.
- Findings recompute on course load and on save (or on-demand via a refresh action — implementer's choice, note which was built).

## Part 4: Pre-publish gating

- Findings with severity `error` block publishing. The Publish button (or the publish action) must check for zero unresolved errors before proceeding.
- Findings with severity `warning` do not block publishing but should be visible to the author before they publish (e.g. shown in a summary if any exist, without a hard stop).
- This must not silently fail — if publish is blocked, the author needs a clear message pointing them to the Course Health panel to see what's blocking.

## Out of scope for 4.5c
- Everything listed under "Scope discipline" above
- Bulk alt-text review screen (a real Phase 4.6 item, but distinct enough in scope to be its own follow-up rather than bundled here)
- Any UI beyond the Course Health panel itself (no dashboard-level health summary across all courses, for instance)

## Acceptance criteria
- All ~15 rules implemented, using the finding model consistently
- Course Health panel groups findings by category, shows counts, and each finding navigates to the right object
- Publishing is blocked when unresolved errors exist, with a clear message; warnings do not block
- Manual verification: Sebastin runs this against a real course with at least one deliberately introduced error (e.g. a broken reference, a bank with insufficient questions for its draw count) and confirms the panel surfaces it correctly, navigation works, and publish is correctly blocked — then removes the issue and confirms publish is unblocked


# Phase 6a: Accounts, Roles, and Permissions

Add this section to ARCHITECTURE.md (technical foundation) with a summary/reference in REQUIREMENTS.md's Phase 6 row. Commit before requesting a build prompt.

## Decisions (confirmed)

- **Authentication:** self-hosted email/password auth using a mature, well-vetted library for the security-sensitive parts (password hashing, session management) — not a third-party SaaS auth provider. This keeps the tool freely self-hostable per its AGPL-3.0 open-source intent, with no external service dependency or cost imposed on future self-hosters.
- **Roles:** role-based permissions are required — owner, editor, reviewer (at minimum), not flat equal access within an organization.
- Multi-tenancy foundation already exists (`organisation_id` is present throughout the schema per real course data) — this phase builds real accounts and membership on top of that existing structure, not a new tenancy model from scratch.

## Part 1: Authentication

### Requirements
- Email/password signup and login.
- Passwords hashed with a modern, vetted algorithm (bcrypt or argon2 — implementer's choice, argon2 preferred if available without adding heavy new infra).
- Secure session handling: HttpOnly, Secure, SameSite cookies; sessions stored server-side (e.g. in Postgres or Redis if already available — do not introduce a new infra dependency without asking) rather than trusting client-side tokens alone.
- Rate limiting on login attempts to prevent brute-force.
- Email verification on signup (can be a simple token-link flow; do not over-engineer).
- Password reset flow (token-link via email).
- Logout invalidates the session server-side, not just client-side cookie clearing.

### Out of scope for this pass
- Social login (Google/Microsoft/etc.) — future, addable independently later.
- SSO/SAML — future, only relevant if enterprise customers require it.
- Two-factor authentication — future.

## Part 2: Organizations and membership

- A user can belong to one or more organizations (the existing `organisation_id` concept), each with their own role.
- Organization owner can invite users by email; invited users who don't yet have an account get a signup-and-join flow, existing users get added directly.
- Organization owner can change a member's role or remove them.
- At least one owner must always exist per organization (prevent removing/demoting the last owner).

## Part 3: Roles and permissions

Minimum three roles, each with clearly defined permissions:
- **Owner:** full control — manage organization membership/roles, create/edit/delete/publish any course, access all settings.
- **Editor:** create/edit courses, manage content, cannot manage organization membership or delete the organization.
- **Reviewer:** read-only access to courses plus the ability to leave comments (Phase 6b) — cannot edit course content or publish.

### Requirements
- Every course-affecting action (edit, publish, delete, manage banks/objectives, etc.) checks the acting user's role and is denied with a clear message if insufficient.
- Enforcement happens server-side (API-level checks), not just hidden/disabled UI in the editor — the editor UI should also reflect permissions (e.g. hide edit controls for a Reviewer), but the real security boundary is the server.
- Existing single-user/no-auth local development and testing flows should continue to work in a development mode (do not break the existing dev/test setup) — clarify with a sensible default (e.g. a seeded default owner account for local dev) rather than breaking existing test fixtures.

## Out of scope for 6a entirely

- Review/commenting UI and data model (Phase 6b, next stage)
- Anonymous share links (Phase 6c)
- Deployment (separate, near-term item, not blocked by this phase)
- Any billing/subscription concept — not part of this project's scope as currently discussed

## Acceptance criteria

- A user can sign up, verify their email, log in, and log out securely
- An organization owner can invite a member, assign a role, change a role, and remove a member (except the last owner)
- Permissions are enforced server-side for at least: editing a course, publishing a course, managing organization membership
- Existing courses/data (organisation_id: "00000000-0000-0000-0000-000000000001" seen in real production data) migrate cleanly to have a real owning organization and at least one owner account
- All automated tests pass
- Manual verification: Sebastin creates a second account, invites it to his organization as a Reviewer, and confirms that account cannot edit or publish a course but can view it; then confirms an Editor-role account can edit but not manage membership

# Phase 6b: Review and Commenting

Add this section to ARCHITECTURE.md, with a summary/reference in REQUIREMENTS.md's Phase 6 row. Commit before requesting a build prompt. Depends on Phase 6a (accounts, roles, permissions) being complete — this stage assumes real users, organizations, and roles already exist and are enforced.

## Decisions (confirmed)

- Comments are anchored to a specific block or page — not a single flat course-level thread.
- Comments support resolve/reopen (a comment thread can be marked resolved, and reopened if needed).

## Part 1: Data model

- A comment belongs to a course, and is anchored to either a specific block (via its stable `block_id` from Phase 4.5a) or a specific page (via `page_id`) when no specific block is the target.
- A comment has: author (the real user, per Phase 6a accounts), body (plain text is sufficient for v1 of this feature — rich text formatting is not required), created timestamp, and a status (open or resolved).
- Comments form threads: a top-level comment can have replies (a simple flat reply list under each top-level comment is sufficient — no nested reply-to-reply threading required for this pass).
- Resolving a comment resolves the whole thread (top-level + replies together), not individual replies.
- Reopening a resolved thread returns it to open status.
- Use the Phase 4.5b dependency index / block registry conventions where relevant (e.g. if a commented-on block is later deleted, the comment should be handled per Phase 4.5b's existing "used by"/safe-delete awareness — at minimum, do not silently orphan comments with no way to see what they were about; note the block/page title or content snippet at comment-creation time as a fallback label).

## Part 2: Permissions

- All three roles (Owner, Editor, Reviewer) can view comments.
- All three roles can create comments and replies — commenting is the core capability a Reviewer needs, per the whole point of adding the Reviewer role in 6a.
- All three roles can resolve/reopen threads (a Reviewer should be able to resolve their own feedback once addressed, not just the person who "outranks" them) — unless you have a strong reason to restrict this differently, keep it permissive; note in your summary if you think a restriction makes more sense and why.
- A user can edit or delete their own comments; Owners can delete any comment (moderation capability) — Editors cannot delete other users' comments.
- Enforce server-side, consistent with the 6a permission model (not just hidden UI).

## Part 3: Editor UI

- A way to view comments anchored to the currently-selected block (e.g. a comment icon/indicator on blocks that have comments, similar in spirit to the existing block hover toolbar pattern) and a way to add a new comment to a block or page.
- A course-wide comments view/panel (e.g. its own icon-rail drawer item, consistent with the existing icon-rail pattern from Phase 1C/1D) listing all comments across the course, filterable by open/resolved, with click-to-navigate to the relevant block/page (reusing the same navigation pattern established for Course Health findings in Phase 4.5c).
- Visual distinction between open and resolved threads (e.g. resolved threads collapsed/greyed by default, per common review-tool conventions).

## Part 4: Notifications (minimal, if in scope — otherwise defer)

- This pass does NOT need to build email notifications for new comments/replies/resolutions — that's a reasonable future enhancement, not required for a working review/commenting feature. Note this explicitly as deferred rather than silently skipped.

## Out of scope for 6b

- Anonymous share links (Phase 6c, next stage) — commenting in this phase is only for authenticated organization members with a role
- Email notifications (noted above, deferred)
- Rich-text formatting within comments (plain text is sufficient)
- Nested reply-to-reply threading (flat replies under a top-level comment are sufficient)

## Acceptance criteria

- A comment can be created anchored to a specific block or page, by any of the three roles
- Replies can be added to a comment thread
- A thread can be resolved and reopened
- Comments are visible to all roles; creation/reply/resolve are available to all roles; delete is restricted per the Part 2 rules
- Permission checks are enforced server-side
- The course-wide comments panel correctly lists and filters comments, with working navigation to the anchored block/page
- Manual verification: Sebastin creates comments as different real role accounts (Owner, Editor, Reviewer — reusing the accounts from 6a), confirms resolve/reopen works, confirms an Editor cannot delete another user's comment while an Owner can (tested via real server requests, not just UI, consistent with how 6a's permissions were verified)

# Phase 6c: Anonymous Share Links

Add this section to ARCHITECTURE.md, with a summary/reference in REQUIREMENTS.md's Phase 6 row. Commit before requesting a build prompt. Depends on Phase 6a (accounts, roles) being complete for the authenticated management side of this feature.

## Decisions (confirmed)

- Anonymous share links are **read-only** — viewing/preview only, no commenting, no editing.
- A share link shows **only the last published version** of a course, never the live draft being edited.
- Links support **optional expiration** (the author can set an expiration date) and can be **manually revoked at any time**, independent of any expiration date.

## Part 1: Data model

- A share link record belongs to a course, with: a unique unguessable token (used in the URL), created-by user, created-at timestamp, optional expires-at timestamp (nullable — no expiration if not set), and a revoked boolean/revoked-at timestamp.
- A course can have more than one active share link at a time (e.g. an author may want to revoke and regenerate without needing to track down every place the old link was shared, or may want multiple links for different purposes) — do not assume a single link per course.
- The token itself must be unguessable (sufficiently long, cryptographically random) — this is the only access control for anonymous viewers, so it carries real security weight.

## Part 2: Access behavior

- Visiting a valid, non-expired, non-revoked share link's URL renders the course's last published version in the player, without requiring login.
- Visiting an expired or revoked link's URL shows a clear message (e.g. "This link is no longer available") rather than an error page or a confusing failure.
- If a course has never been published, there is nothing for a share link to show — either prevent link creation until the course has a published version, or show a clear "not yet published" message if a link is created before the first publish (implementer's choice, note which was built and why).
- If a course is republished after a link was created, the link should show the NEW last-published version (links point to "the course's last published version," not a frozen snapshot of the version at link-creation time) — confirm this is the intended behavior; if a frozen-snapshot-at-creation-time model would be simpler or safer, note that tradeoff in your summary rather than silently picking one.
- Anonymous viewers must not be able to access anything beyond the published content itself — no access to comments (Phase 6b), no access to editor-only data, no access to other courses in the organization.

## Part 3: Authenticated management UI

- Course owners/editors can create a share link, see existing links (with their expiration/revoked status), set or change an expiration date, and revoke a link — from within the course's settings (e.g. the Course drawer, consistent with where other course-level settings live).
- Copy-to-clipboard convenience for the link URL.
- Permission: creating/revoking share links follows the same permission model as publishing (i.e. if only Owner/Editor can publish, the same roles should manage share links — Reviewers should not be able to create or revoke links, consistent with their read-only role). Enforce server-side.

## Out of scope for 6c

- Anonymous commenting (explicitly decided against — links are read-only)
- Password-protecting a share link (not requested; note as a possible future enhancement if you think it's valuable, but do not build it now)
- Analytics on share-link views (e.g. view counts) — not requested, future enhancement if wanted later

## Acceptance criteria

- A share link can be created, shows the correct last-published content to an anonymous (logged-out) visitor, and requires no authentication
- An expired or revoked link correctly shows an unavailable message instead of content
- A link continues to work across multiple republishes, always showing the current last-published version (or, if a snapshot model was chosen instead, this is clearly documented and justified)
- Only Owner/Editor roles (matching the publish permission) can create or revoke links; enforced server-side
- Anonymous viewers cannot access comments or any other authenticated-only data through the share link
- Manual verification: Sebastin creates a share link, opens it in a logged-out/incognito browser session and confirms it works; revokes it and confirms it stops working; confirms a Reviewer-role account cannot create/revoke links (tested via real server requests, consistent with the verification rigor used in 6a/6b)

# Deploy-A: Cloudflare R2 Storage Integration

Add this section to ARCHITECTURE.md. Commit before requesting a build prompt.

## Problem

All uploaded assets (images, videos, audio), course resources (PDFs, Word, Excel, PowerPoint, ZIP, text files), and generated artifacts (publish-time PDFs) are currently written to local disk at `packages/server/uploads/`. This works in local development but is incompatible with the planned production hosting (Render), which uses ephemeral containers — anything on local disk is lost on every restart or redeploy. This must be fixed before any production deployment.

## Decisions

- Storage provider: Cloudflare R2 (S3-compatible API).
- Local disk storage is KEPT as the default for local development — do not force every developer to have R2 credentials just to run the app locally. Storage backend is selected via environment variable/configuration, defaulting to local disk when R2 credentials are absent.
- Existing relative-path conventions in course JSON/database (e.g. `"uploads/<courseId>/<filename>"`) should be preserved as the logical identifier where possible — the storage abstraction should resolve these to either a local file path or an R2 object key depending on the active backend, rather than requiring a schema/data-model change to every existing course.

## Part 1: Storage abstraction layer

- Build a single storage interface (e.g. `upload(key, buffer/stream)`, `getUrl(key)`, `delete(key)`, `exists(key)`) with two implementations: local disk (current behavior, unchanged) and R2 (new).
- All current call sites that read/write to `packages/server/uploads/` directly — asset uploads (`assets.js`), resource uploads (`resources.js`), the PDF pipeline (`pdfPipeline.js`), and the caption pipeline's temp file handling (`captionPipeline.js`) — should go through this abstraction instead of calling `fs` directly.
- R2 credentials (Account ID, Access Key ID, Secret Access Key, bucket name) are read from environment variables. Document the exact variable names used in `.env.example` and HANDOFF.md.

## Part 2: URL generation

- When R2 is the active backend, asset/resource URLs served to the player and editor should resolve to R2 (either R2's public bucket URL, or a Cloudflare-fronted custom domain if one is set up — implementer's choice for this pass, note which was built).
- When local disk is the active backend (dev default), URL generation remains exactly as it is today (`/uploads/...` same-origin paths) — no change to local dev behavior.
- Existing `CONTENT_BASE_URL` environment variable (already present per `.env.example`) should be leveraged/extended for this rather than inventing a separate URL-construction mechanism, if it fits.

## Part 3: PDF and caption pipelines

- The PDF generation pipeline should write its output through the storage abstraction (R2 in production, local disk in dev) rather than always writing to local disk.
- The caption pipeline's temporary ffmpeg working files (audio extraction, etc.) can remain on local/ephemeral disk during processing regardless of backend — these are genuinely temporary and cleaned up after each job; only the SOURCE video/audio file (read from storage) and the FINAL caption/transcript content (already stored in Postgres text columns, not files) matter for persistence. Confirm this understanding is correct during implementation and flag if it's not.

## Part 4: Migration of existing local files

- The ~339MB of files currently in local `packages/server/uploads/` need a path to reach R2 for anything currently in the local database that will be used going forward (e.g. test courses used for ongoing verification). Provide a one-time migration script/command that uploads existing local files to R2 and confirms each one, rather than requiring Sebastin to manually re-upload everything. This does not need to be automatic/triggered — a documented manual command is sufficient.

## Out of scope for this pass

- CDN/custom domain fronting for R2 beyond whatever is simplest to get working correctly (advanced caching/CDN tuning is a future optimization, not required now)
- Multi-region or redundant storage configuration
- Automatic cleanup/lifecycle policies for old/unused assets (a future Course Analyzer-adjacent concern, not this pass)

## Acceptance criteria

- With R2 credentials configured, uploading an image/video/resource writes it to the R2 bucket, not local disk
- With no R2 credentials configured (local dev default), behavior is completely unchanged from today
- Generated PDFs and the existing PDF-serving fix (commit 1239c751) continue to work correctly with R2 as the backend
- The migration script successfully uploads existing local files to R2 and they become correctly servable
- Manual verification: Sebastin runs the app with real R2 credentials, uploads a new image/video to a test course, confirms the file actually appears in the Cloudflare R2 dashboard, and confirms it renders correctly in both editor preview and a real player session — and separately confirms local dev (no R2 credentials) still works exactly as before

# Deploy-B: Production Email via Resend

Add this section to ARCHITECTURE.md. Commit before requesting a build prompt. Depends on Phase 6a (accounts, invitations, email verification, password reset) being complete — this replaces the local-dev console-logging fallback with real email delivery.

## Problem

Phase 6a built the full email-dependent flows (signup verification, invitations, password reset) but only ever delivers them via a local-dev fallback that logs the link to the server console / returns it in the API response for the UI to display. This works for local development but cannot work in production — real users need actual emails delivered to their inbox.

## Decisions

- Email provider: Resend, using their HTTP API (not raw SMTP).
- Sending domain: `mail.mnemonify.org`, already verified in Resend (DKIM, SPF, sending-MX confirmed; inbound receiving deliberately disabled since the app only sends, never receives).
- Local development behavior is UNCHANGED — the existing console-log/API-response fallback remains the default when no Resend API key is configured, exactly like R2's local-disk fallback pattern in Deploy-A.

## Part 1: Email sending abstraction

- Build a single email-sending interface (e.g. `sendEmail({to, subject, body/template, ...})`) with two implementations: the existing local-dev fallback (log/return the content, unchanged) and a real Resend implementation (new).
- Selection between the two is via environment variable (presence of a Resend API key), consistent with the pattern established for storage in Deploy-A.
- Resend API key and the "from" address (e.g. `noreply@mail.mnemonify.org` or similar — implementer's choice of local part, note which was chosen) are read from environment variables. Document the exact variable names in `.env.example` and HANDOFF.md.

## Part 2: Email flows to convert

Route each of these through the new sending abstraction, replacing their current local-dev-only delivery:
- Signup email verification link
- Organization invitation link
- Password reset link

Each email should have reasonably clear, plain subject lines and body content (a simple multipart plain-text and minimal-HTML template is sufficient — this does not need branded HTML email design work in this pass, note if you think that's worth a fast-follow but don't build it now).

## Part 3: Error handling

- If Resend's API call fails (network issue, invalid key, rate limit, etc.), the underlying action (signup, invite, password reset request) should NOT silently appear to succeed to the user while secretly failing to deliver — surface a clear error, or at minimum log it prominently server-side so failures are noticeable rather than silent.
- Respect Resend's rate limits (100/day on the free tier) — this should be more than sufficient for pilot-scale usage, but note in your summary if you see any flow that could plausibly send many emails in a short burst (e.g. bulk operations) that might need throttling awareness later.

## Out of scope for this pass

- Branded/designed HTML email templates (plain and functional is sufficient for now)
- Any additional email types beyond the three listed (e.g. comment notifications, which were already explicitly deferred in Phase 6b)
- Email delivery analytics/tracking beyond what Resend provides by default

## Acceptance criteria

- With a real Resend API key configured, signup verification, invitation, and password reset emails are actually delivered to a real inbox
- With no Resend API key configured (local dev default), behavior is completely unchanged from today
- A failed send is surfaced/logged clearly, not silently swallowed
- Manual verification: Sebastin signs up a real test account (or invites a real email address he can check) with Resend configured, and confirms an actual email arrives in the inbox with a working link — for all three flows (verification, invitation, password reset)

# Self-Contained SCORM Package Export

Add this section to ARCHITECTURE.md, with a summary/reference in REQUIREMENTS.md. Commit before requesting a build prompt.

## Problem

The existing launcher tool (packages/launcher) produces a "dynamic launcher" SCORM package: a small zip containing imsmanifest.xml, a thin index.html, and the SCORM 2004 communication bridge — but the actual course content stays live on the Mnemonify server, fetched at runtime via /content/:courseId. This means the package only works while the Mnemonify server is reachable; it is not truly portable.

Sebastin needs a genuinely self-contained SCORM package: everything (player, course content, all assets, captions) bundled inside the zip, with zero runtime dependency on any Mnemonify server, suitable for upload to SCORM Cloud, CAP's LMS (Ethos), or any standard SCORM 2004 3rd Edition compliant LMS.

## Decisions

- Target: SCORM 2004 3rd Edition (already the project's stated standard).
- The package must work with NO network dependency on Mnemonify's own infrastructure once uploaded to a third-party LMS. It may still depend on genuinely external third-party services the course author has chosen to embed (see "Known inherent limitations" below) — that is a property of the embedded content itself, not something packaging can or should fix.
- The package is generated for a specific PUBLISHED version of a course (addressing the existing gap where VERSION_ID exists in the launcher's config but isn't actually used to resolve a specific snapshot) — publishing a new version and re-exporting produces a new, independent package; the export is a point-in-time snapshot, not a live link.

## Part 1: Course data embedding

- The player currently fetches course_json via a live network call to /content/:courseId at startup. For the self-contained package, course_json (the specific published version being exported) must be embedded directly, not fetched at runtime.
- Recommended approach: inline the course_json data as a JavaScript object literal directly in the packaged index.html (e.g. `window.__MNEMONIFY_COURSE_DATA__ = {...}`), rather than as a separate file the player fetches via XHR/fetch — this avoids potential issues with how strict some LMS environments are about in-package file access, and matches common practice among established SCORM-exporting tools.
- The player needs a code change to support this "embedded data" mode: check for this embedded global data source first, and only fall back to the live /content/:courseId fetch when it's absent (preserving all existing live-hosting behavior, including everything tested throughout this deployment work, completely unchanged).

## Part 2: Asset bundling

- All assets (images, video, audio) and resources (PDFs, generated PDFs, etc.) referenced by the course being exported must be downloaded from R2 (or local disk in local dev) and included in the package, with their paths rewritten to relative local paths that resolve correctly within the unzipped package structure.
- Captions/transcripts (currently stored as text content in Postgres, not files) must be written out as actual static files (e.g. .vtt) within the package, since there's no live database to query from inside a SCORM package.
- Reuse patterns already established in the PDF pipeline (buffer generation, storage abstraction) where they fit, per the existing investigation's finding that this is a reasonable pattern to follow.

## Part 3: Known inherent limitations (out of scope to "fix", but must be clearly communicated to the author)

- Embedded external content the author has chosen to include — the DigitalScope WSI viewer embed, SurveyMonkey evaluation embeds, or any other iframe/embed pointing to a third-party URL — will still require that third-party service to be reachable at runtime, regardless of how self-contained the Mnemonify-authored portion of the package is. This is a property of the embedded content, not a packaging gap.
- The export flow should clearly surface this to the author before/during export (e.g. "This course contains N external embeds that will still require internet access to [DigitalScope/SurveyMonkey/etc.] even in the exported package") rather than implying full offline capability where it doesn't apply.

## Part 4: Manifest, SCORM bridge, and version resolution

- Reuse and extend the existing manifest generation (packages/launcher/manifest.js) and the existing SCORM 2004 communication code (packages/player/src/lms/scorm2004.js) — do not rewrite working SCORM-compliance logic from scratch.
- Fix the version-resolution gap identified in the prior investigation: the export must resolve and bundle the actual specific published version requested, not rely on a VERSION_ID that isn't currently wired through.

## Part 5: Export trigger and delivery

- Add an authenticated Owner/Editor-only "Download SCORM Package" action in the Course drawer (or wherever fits the existing UI pattern best), consistent with the permission model already established (Owner/Editor per the publish permission, Reviewer cannot export).
- Requires the course to have a published version — if unpublished, show a clear message rather than a broken/empty export.
- Force-save current edits before triggering export is NOT required (per the existing publish flow, which already requires an explicit publish step before this kind of export makes sense) — exporting operates on the last published version, consistent with how the anonymous share links (Phase 6c) also work off the last-published version, for consistency.
- Given package size could be substantial for video-heavy courses, generate the package as a background job (return a "generating" state, then a download link when ready) rather than a synchronous request that could time out — reuse whatever async/background-job pattern already exists in the codebase if one does (check the PDF pipeline and caption pipeline for existing patterns), or note if a new one is needed.

## Acceptance criteria

- A published course can be exported as a single zip file containing: the player bundle, the specific published version's course data (embedded, not fetched), all referenced assets/resources (bundled as local files with rewritten paths), captions/transcripts as static files, a correct imsmanifest.xml, and the SCORM 2004 communication bridge
- The exported zip, uploaded to SCORM Cloud with no network connection to any Mnemonify server, launches and functions correctly: navigation, scoring, variable interpolation, and completion reporting all work
- External embeds (if any) are clearly flagged to the author as still requiring third-party connectivity
- Only Owner/Editor roles can trigger export; enforced server-side
- Manual verification: Sebastin builds a real test course (ideally reusing course f9dc55f6 or a similar test course already used throughout this project), exports it, and uploads the resulting zip directly to SCORM Cloud with his own local network completely disconnected from Mnemonify's server (or Mnemonify's server temporarily stopped) to prove genuine independence — completing a full run-through including scored questions and confirming SCORM Cloud reports the score/completion correctly

## UX Redesign — Phase 0 Baseline

See UX_REDESIGN_INVENTORY.md for the current UI surface inventory, and UX_Redesign_Acceptance_Checklist.md for the acceptance criteria this redesign is measured against. Both are the Phase 0 deliverable for the editor UX redesign, tracked on the ux-redesign branch.