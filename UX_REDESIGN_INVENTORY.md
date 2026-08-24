# Mnemonify Editor UX Surface Inventory

Status: baseline inventory for the UX redesign. This document describes the
editor as it exists on the `ux-redesign` branch; it intentionally does not
propose changes.

Inventory date: 2026-08-23

## How to read this inventory

Line counts are approximate source-file sizes from the current branch. They
are useful as an effort/complexity signal, not as a measure of rendered UI
size. “Low”, “medium”, and “high” describe the amount of state, interaction,
nesting, and cross-component behavior in the surface.

The main editor route is `CourseEditor.jsx`. The course library is a separate
authenticated surface, but its Team, Import Word, and New Course flows are
included because they are part of the current authoring journey and are
reachable immediately before entering the editor.

## Current editor shell at a glance

```text
CourseEditor
├── fixed top bar
├── left page/module outline
├── center canvas
│   ├── inline block editors
│   ├── between-block insertion points
│   └── live preview iframe mode
└── fixed right icon rail
    └── contextual drawer or page/module/block settings drawer
```

The right rail is persistent. The drawer is an overlay that slides in to the
left of the rail and places a transparent backdrop over the rest of the
editor. Rail items and contextual selections are mutually exclusive. Escape,
the close button, or the backdrop closes an open drawer.

## Primary persistent surfaces

| Surface | Component/file | Current contents and controls | Approx. size / complexity |
|---|---|---|---|
| Editor route/orchestrator | `packages/editor/src/pages/CourseEditor.jsx` | Loads the course, assets, resources, comments, and optional glossary data; owns course JSON, selection, drawer, preview, autosave, undo/redo, publish, version history, export, analyzer, comments, template, and linked-entity state; wires every major child surface together. | 1,822 lines; high. This is the central coordination surface and the largest coupling point. |
| Drawer shell and rail | `packages/editor/src/components/EditorDrawerShell.jsx` | Fixed right rail; icon buttons with labels/tooltips; active state; backdrop; slide-in drawer; header and close action; Escape handling. It also contains an unused placeholder renderer, but `CourseEditor` supplies the real drawer body. | 112 lines; medium shell, low visual content. |
| Rail registry | `packages/editor/src/lib/editorDrawer.js` | Declares rail order, labels, IDs, and feature flags for Course, Player, Variables, Question Banks, Objectives, Comments, Course Health, Glossary, and Version History. | 28 lines; low, but it controls the editor’s information architecture. |
| Left outline | `packages/editor/src/components/PageList.jsx` | Pages and modules; flat or grouped display; active-page/module selection; collapse/expand modules; drag reorder pages/modules; assign page to module; inline rename; per-page kebab menu; add/duplicate/delete/save page template; add module; insert page from template. | 445 lines; high interaction complexity because it combines navigation, editing, grouping, and drag/drop. |
| Center canvas | `packages/editor/src/components/BlockCanvas.jsx` | Renders the active page’s blocks; empty state; sortable block list; between-block `+` insertion points; bottom Add Block button; selection; block wrapper chrome; nested block editor rendering; Move/Copy and Link-to-bank modal launch. | 346 lines; high. It is the main authoring surface and delegates to every block editor. |
| Add Block picker | `packages/editor/src/components/BlockPickerModal.jsx` | Modal-style picker with autofocus search, registry categories, block icons, display names, keyboard buttons, empty search state, and cancel. It creates a default block at a chosen insertion index. | 75 lines; medium interaction, low data complexity. |
| Live preview mode | Inline JSX in `CourseEditor.jsx`; styles around `.preview-frame-container` in `courseEditor.css` | Replaces the center canvas with an iframe to relative `/player?courseId=...&preview=true`; phone/tablet/desktop width buttons; Close Preview; saves before opening. | ~45 JSX lines plus CSS; medium because it switches the center surface and depends on the player route. |
| Main editor stylesheet | `packages/editor/src/styles/courseEditor.css` | Nearly all editor layout, rail/drawer, top bar, outline, canvas, block chrome, settings, rich text, block-specific editors, media library, onboarding, modal, health, trigger, variable, and responsive rules. | 3,629 lines; very high breadth and coupling. |

## Persistent right icon rail and drawers

The visible set is controlled by `packages/schema/featureFlags.js`. Defaults
are `versionHistory: false`, `glossary: false`, `bankImportExport: false`, and
`linkedQuestions: false`; the first two rail entries that correspond to those
flags are therefore normally hidden unless enabled by environment flags.

All rail content is routed through
`packages/editor/src/components/DrawerSettingsContent.jsx` (597 lines). The
drawer router itself is a dense composition point: it supplies shared course,
page, variable, bank, asset, comment, finding, and role callbacks to the
selected panel.

| Rail item / drawer | Component/file | Current contents and controls | Approx. size / complexity |
|---|---|---|---|
| Course | `DrawerSettingsContent.jsx` → internal `CourseSettings`; `ShareLinksPanel.jsx`; `ScormExportPanel.jsx` | Course title; accent color; navigation mode (linear/free); page display (flat/grouped); completion rule; rich-text header/footer; page numbers; Back button. Also share-link management and SCORM package export. Share links expose create, expiration, copy, and revoke controls; SCORM export requires published content and shows generating/download state. Owner/Editor gating is passed from `CourseEditor`. | Router portion ~135 lines; `ShareLinksPanel.jsx` 194 lines, medium; `ScormExportPanel.jsx` 68 lines, medium. Overall drawer: medium/high. |
| Player | `packages/editor/src/components/PlayerSettingsPanel.jsx` | LMS publish settings: completion criteria, completion/success reporting, passing score; Contact button and email/subject; PDF publishing mode and generated-resource visibility; Resources toggle, upload, label, remove; custom utility items with modal-message or jump-to-page actions. Rich-text editing and variable insertion are available for custom modal messages. | 376 lines; high breadth, medium interaction complexity. |
| Variables | `packages/editor/src/components/VariableManagerPanel.jsx` | Lists variables with name/type/default; add/edit/delete; validates names and types; protects read-only/system variables; renames through the course-level callback. | 158 lines; medium. |
| Question Banks | `packages/editor/src/components/QuestionBankManagerPanel.jsx` | Bank selector; create bank; compact “Open bank editor” action; when non-compact, bank name/count, delete, optional import/export, and linked-question drop zone. Opens the master/detail question-bank editor and transfer modals. | 186 lines; high because it coordinates bank data, feature flags, file import/export, linked entities, assets, and nested modals. |
| Objectives | `packages/editor/src/components/ObjectivesPanel.jsx` | Lists course/module objective assignments; add/edit/remove objective; objective label/description fields; module/course context; multi-select assignment to page groups. | 134 lines; medium. |
| Comments | `packages/editor/src/components/CommentsPanel.jsx` | Filter all/open/resolved; new comment composer; page/block anchor; thread list; reply composer; edit/delete own comments; resolve/reopen; moderation actions based on role; navigate from a thread to its page/block. | 232 lines; high interaction density. |
| Course Health | `packages/editor/src/components/CourseHealthPanel.jsx` | Empty/healthy state; analyzer findings grouped by category, then severity/rule; expandable groups; finding navigation to the affected page/block/variable/asset; “Review all” alt text path. The top bar also exposes a warning/error count badge that opens this drawer. | 140 lines; medium/high because it is a navigation hub into other surfaces. |
| Glossary (flagged) | `packages/editor/src/components/GlossaryPanel.jsx` | Attached glossary selection/creation, term list, term publishing, suggestions, and applying glossary suggestions to course content. Only rendered when the `glossary` feature flag is on. | 152 lines; medium. |
| Version History (flagged) | Rail ID in `editorDrawer.js`; opened from More Tools and rendered by `CourseEditor.jsx` as `VersionHistoryModal`, not as a `DrawerSettingsContent` branch | Version history is registered as a rail item, but the current implementation’s working surface is a modal: list saved versions, create named snapshot, restore with confirmation, loading/error state. The rail button exists in the shell when enabled, but the content router has no `version-history` branch. | `VersionHistoryModal.jsx` 129 lines; medium. This is a current implementation split worth noting in the inventory. |

### Contextual drawers (not rail items)

The same right-side drawer shell also opens from outline/canvas selection.
These drawers replace the active rail item and are routed by the same
`DrawerSettingsContent.jsx` file.

| Context | Component/file | Current contents and controls | Approx. size / complexity |
|---|---|---|---|
| Page Settings | `DrawerSettingsContent.jsx` → `PageSettingsPanel.jsx` | Page title/settings; page-level Continue gate using the shared condition builder; page triggers; page-specific navigation/behavior settings. | `PageSettingsPanel.jsx` 98 lines; medium. |
| Module Settings | `DrawerSettingsContent.jsx` → `ObjectivesPanel.jsx` with module context | Explains that module objective assignments live in Objectives; shows module-scoped objective assignment UI. | Very small wrapper; underlying Objectives panel is 134 lines. |
| Block Settings | `DrawerSettingsContent.jsx` → internal `BlockSettingsContent`; `packages/editor/src/components/blocks/settingsIndex.js` | Basic block-type settings when the registry declares them; scored interaction toggle; collapsed Advanced section with custom block name, conditional visibility, legacy hidden-until-trigger visibility, triggers/timeline, and faculty notes. It can launch variable management from conditions/actions. The drawer opens from the block hover toolbar’s gear, not merely from selecting a block. | `DrawerSettingsContent.jsx` block section ~150 lines plus settings index; high because the registry routes into 12 type-specific settings components and shared advanced behaviors. |

## Top bar and top-level editor controls

The top bar is rendered directly in `CourseEditor.jsx` (roughly lines
1490–1575) and styled in the opening section of `courseEditor.css`.

| Area | Current controls |
|---|---|
| Left | Back to course library; clickable course title that becomes an inline input; Undo and Redo buttons when editable. |
| Center/tools | Preview; Focus Mode toggle; icon-only More Tools menu. |
| Right | Course Health issue badge when findings exist; autosave status (`Saved`, `Saving`, `Unsaved changes`); Publish button for editors/owners. |
| State/feedback | Publish notice appears below the header for success/error; save status updates during the five-second autosave cycle; title editing commits on blur/Enter. |

The top bar reserves room for the fixed right rail. Focus Mode collapses the
left outline for the session and does not alter course data. Preview saves
before switching the center panel into iframe mode.

## More Tools menu

The reusable menu is `packages/editor/src/components/MoreToolsMenu.jsx`
(69 lines). It is an icon-only overflow button in the top bar, closes on
outside click or Escape, and renders only truthy item definitions. The
current item list is assembled in `CourseEditor.jsx`:

| Menu item | Availability | Current behavior |
|---|---|---|
| Image Library | Always | Opens `MediaLibraryPanel` as an overlay. |
| Save as Template | `canEdit` | Opens `SaveAsTemplateModal` for the whole course. |
| Export Worksheet | `canEdit` | Saves current edits, queues worksheet generation, and shows a publish notice that the result will appear in Resources. |
| Version History | `canEdit` plus `versionHistory` feature flag | Saves and loads versions, then opens `VersionHistoryModal`. |
| Export Word | Only when `course.is_template` | Saves current edits and navigates to the Word export endpoint; while waiting, the menu item reads “Saving before export...” and is disabled. |

## Left page/module outline

Primary file: `packages/editor/src/components/PageList.jsx` (445 lines),
with outline styles from `courseEditor.css` around lines 611–977.

Current hierarchy and behavior:

- Header: “Pages & Modules”.
- Flat mode: one sortable page list.
- Grouped mode: sortable module headers, collapsible module bodies, empty
  module state, ungrouped-pages section, and a module drop target.
- Page row: drag handle, active state, click-to-select, double-click/rename,
  and kebab actions.
- Page kebab: Move to module submenu, Duplicate, Rename, Save as Page
  Template, and Delete when more than one page exists.
- Module header: drag handle, collapse/expand, click-to-select module
  settings, rename, and Delete module. Deleting a module keeps its pages and
  makes them ungrouped.
- Footer: Add Page and From Template.
- View state such as collapsed modules is local/session state; document edits
  such as page order, grouping, titles, and IDs flow back to `CourseEditor`
  for undo/autosave.

## Center canvas, block chrome, and block settings

### Block hover/selection toolbar

The toolbar is inside `BlockCanvas.jsx`’s `BlockWrapper` (roughly lines
45–250) and styled around `courseEditor.css` lines 1040–1210. Every block
gets a wrapper, label, drag handle, and toolbar. The controls currently are:

- drag/reorder handle;
- optional linked-question drag affordance;
- comment button with count, or Add comment label;
- Move to page;
- Copy to page;
- gear: Open settings;
- first-use “Open block settings here” hint, remembered in localStorage;
- optional Add to bank action for eligible question blocks;
- Duplicate;
- Delete.

Selecting a block applies visual selection and closes competing drawers. The
gear explicitly opens Block Settings. Clicking the canvas background clears
selection. The wrapper is keyboard-selectable with Enter/Space, while
drag-and-drop uses `@dnd-kit`.

### Block settings drawer

The settings surface is composed by `DrawerSettingsContent.jsx` and the
type map in `packages/editor/src/components/blocks/settingsIndex.js`.

- The registry determines which settings component is shown in the Basic
  section.
- Common controls include scored interaction (for knowledge check,
  matching, ordering, and quiz hotspots).
- Advanced is a disclosure that remembers expanded state per block for the
  current session.
- Advanced controls include Block name, conditional visibility, hidden until
  shown by a trigger, Triggers, and private Faculty notes.
- Condition Builder is shared by block visibility, page Continue gates, and
  trigger conditions.
- Block types without a settings entry still render the common/advanced
  surface and a “No additional settings” message.

### Inline block editor family

`packages/editor/src/components/blocks/index.js` maps the 20 registered
block types to inline editor components. These are the actual content editing
surfaces inside the canvas; they are not separate routes or drawers.

| Block/editor file | Current inline editing surface | Size / complexity |
|---|---|---|
| `TextBlock.jsx` | Rich text body with inline editable field and toolbar affordances. | 28 lines; low wrapper, shared rich-text complexity. |
| `HeadingBlock.jsx` | Editable heading with level/type settings. | 53 lines; low/medium. |
| `ImageBlock.jsx` | Upload/select image, preview, alt text/caption-related fields, image display settings. | 165 lines; medium. |
| `ListBlock.jsx` | Editable list content and list style/settings. | 67 lines; low/medium. |
| `AccordionBlock.jsx` | Accordion item headers and nested block stacks; add/remove/reorder item behavior. | 71 lines plus `ItemBlockStack.jsx` 119; medium/high nesting. |
| `TabsBlock.jsx` | Tab labels, active tab, and nested block stack per tab. | 86 lines plus `ItemBlockStack.jsx`; medium/high nesting. |
| `KnowledgeCheckBlock.jsx` | Question stem, question mode, options, correctness, scoring, feedback, images, objective controls, and rich editing. | 548 lines; very high. |
| `CarouselBlock.jsx` | Image slide list, media-library selection, slide ordering, captions/alt-related fields. | 88 lines; medium. |
| `ReflectionBlock.jsx` | Prompt and learner-response placeholder configuration. | 28 lines; low. |
| `ButtonBlock.jsx` | Button label and destination/page target settings. | 49 lines; low/medium. |
| `TwoColumnBlock.jsx` | Two editable child slots, per-slot add block picker, nested blocks, responsive layout. | 217 lines; high nesting/layout. |
| `TableBlock.jsx` | Caption, rows/cells, header marking, add/remove row/column, cell editing. | 225 lines; high data-grid interaction. |
| `EmbedBlock.jsx` | External URL/embed fields, preview, warning/sandbox behavior. | 104 lines; medium. |
| `VideoBlock.jsx` | Video upload/preview, autoplay/loop and caption/transcript entry/settings paths. | 76 lines; medium. |
| `AudioBlock.jsx` | Audio upload/preview and media settings parallel to video. | 65 lines; low/medium. |
| `FlashcardsBlock.jsx` | Card front/back editing, optional card images, card management. | 46 lines; medium through nested controls. |
| `MatchingBlock.jsx` | Prompt/answer matching pairs, editing and row actions. | 35 lines; medium data interaction. |
| `OrderingBlock.jsx` | Ordered item editing and row actions. | 10 lines; low wrapper. |
| `HotspotBlock.jsx` | Image selection, interactive canvas region creation/editing, labels/feedback. | 34 lines; medium/high coordinate interaction. |
| `QuestionBankDrawBlock.jsx` | Bank selection, draw count/configuration, objective/scoring-related settings. | 51 lines; medium. |
| Shared rich text | `EditableRichField.jsx` 94 lines, `RichTextToolbar.jsx` 140, `TextColorPicker.jsx` 153, `VariablePicker.jsx` 112, `LinkPicker.jsx` 99 | Content-editable serialization, formatting commands, links, colors, variable insertion, selection preservation. High cross-cutting impact because it is reused by multiple editor surfaces. |
| Shared nested stack | `ItemBlockStack.jsx` 119 | Renders nested child blocks in accordion/tab/two-column contexts and supplies nested add/remove/settings behavior. Medium/high because it recursively reuses the canvas model. |

Type-specific settings are provided by exports in the same block files and
registered in `settingsIndex.js`: heading, list, image, knowledge check,
two-column, table, video, audio, matching, hotspot, question-bank draw, and
button. The other block types rely on common advanced settings only.

## Modal and overlay surfaces

The editor uses a shared visual pattern (`.modal-overlay`/`.modal-card`) but
does not have one modal manager. Modal state is distributed across
`CourseEditor`, `BlockCanvas`, question-bank panels, and block editors.

| Surface | Component/file | Current contents / trigger | Approx. size / complexity |
|---|---|---|---|
| New Course | Internal `NewCourseModal` in `packages/editor/src/pages/CourseLibrary.jsx` | Blank-course title flow or starter/template selection; creates a course and navigates to the editor. | ~80 JSX lines inside a 351-line page; medium. |
| Delete course confirmation | Inline overlay in `CourseLibrary.jsx` | Confirms irreversible course deletion. | ~20 lines; low. |
| Import Word | `packages/editor/src/components/ImportWordModal.jsx` | File selection, target template selection, upload, review/confirmation state, import result navigation. Opened from the course-library top bar. | 100 lines; medium. |
| Team members | `packages/editor/src/components/OrganizationMembersPanel.jsx` | Organization member list; invite by email/role; change role; remove member; close. Opened from the course-library Team button, not the editor rail. | 66 lines; medium. |
| Save course as template | `packages/editor/src/components/SaveAsTemplateModal.jsx` | Template name and personal/organization scope; saves and shows completion/link state. | 51 lines; low/medium. |
| Save page as template | `packages/editor/src/components/SavePageAsTemplateModal.jsx` | Page template name/scope; strips instance IDs before save; success/error state. | 69 lines; low/medium. |
| Insert from page template | `packages/editor/src/components/PageTemplateGalleryModal.jsx` | Loads page templates, displays selectable gallery/list, inserts selected template, handles loading/error/empty states. | 37 lines; low. |
| Version History | `packages/editor/src/components/VersionHistoryModal.jsx` | Version list, named snapshot creation, restore confirmation, loading/error/action states, Escape close. | 129 lines; medium. |
| Media/Image Library | `packages/editor/src/components/MediaLibraryPanel.jsx` | Asset refresh, upload including bulk/ZIP path, image grid, selection mode, course-asset reconciliation, alt/caption metadata editing, delete with dependency awareness. Opened from More Tools or from image/carousel/KC/flashcard/hotspot editors. | 195 lines; high because it is both a management panel and a reusable picker. |
| Bulk alt-text review | `packages/editor/src/components/BulkAltTextReview.jsx` | Review list of image assets missing alt text; edit values; mark completed; close. Opened from Course Health. | 74 lines; low/medium. |
| Move/Copy block | `packages/editor/src/components/MoveCopyBlockModal.jsx` | Lists other pages and confirms moving or copying the selected block. | 29 lines; low. |
| Link question to bank | `packages/editor/src/components/LinkToBankModal.jsx` | Selects a question bank and confirms shared canonical-question linking. | 28 lines; low. |
| Linked entity edit/delete prompt | `packages/editor/src/components/LinkedEntityPrompt.jsx` | When a linked question is edited/deleted, choose update all usages, detach this usage, or cancel. Feature-flagged. | 32 lines; low/medium. |
| Question Bank editor | `packages/editor/src/components/QuestionBankEditorModal.jsx` | Large master/detail modal: search, type/objective filters, select visible, question list, add/move/remove, bulk objective/tag actions, selected-question settings, question-type editor, scoring, objectives, assets, feedback, and linked-question actions. | 322 lines; very high. |
| Bank export | `packages/editor/src/components/BankExportModal.jsx` | Chooses Native Mnemonify JSON or GIFT export. Feature-flagged. | 23 lines; low. |
| Bank import review | `packages/editor/src/components/BankImportReviewModal.jsx` | Reviews imported bank, shows compatibility/fidelity warnings, chooses create-new/merge target behavior, confirms or cancels. Feature-flagged. | 71 lines; medium. |
| Trigger builder | `packages/editor/src/components/TriggerBuilderModal.jsx` | Event selection, optional condition builder, action rows, variable/block/page/value pickers, add/remove actions, save/cancel. Launched by page/block/timeline trigger sections. | 425 lines; very high because it is a nested authoring system. |
| Onboarding tour | `packages/editor/src/components/OnboardingTour.jsx` | Guided overlay steps anchored to editor elements, positioning/repositioning, progress, previous/next/skip/finish, persisted step state. | 181 lines; high positioning/state complexity. |
| Caption editor | `packages/editor/src/components/CaptionEditor.jsx` | VTT/SRT upload, cue editing, transcript field/status, caption actions; embedded in media editing/settings rather than a top-level overlay. | 194 lines; medium/high. |

Some of these overlays can stack conceptually: for example, the Question
Bank editor can launch asset selection, and a block can launch Move/Copy or
Link-to-bank while the canvas remains visible underneath. The code does not
centralize these layers into a single modal stack.

## CourseEditor.jsx structure

The following is a responsibility map of the ~1,822-line file, rather than a
line-by-line code summary.

| Approx. region | Responsibility |
|---|---|
| 1–49 | Imports for React/router/API, ID generation, outline/canvas/drawer/modal components, schema analyzers/dependency/link helpers, feature flags, auth, and stylesheet. |
| 50–118 | Autosave/preview/settings-hint constants and small inline SVG icons for Undo, Redo, Preview, Focus Mode, More Tools, and dividers. |
| 119–251 | Route/auth context, course/page/block/drawer/preview/modal/publish/comment/version state; panel collapse/focus state; selection and drawer toggle/close behavior; block-settings hint persistence. |
| 252–410 | Refs and effects: undo/redo stacks; feature-flagged glossary loading; course/assets/resources loading; comment loading; course ref synchronization; embed focus guard; publish notice expiry; before-unload protection; global keyboard undo/redo. |
| 411–487 | Save/autosave scheduling; version history load/open/save/restore; Word export save-before-download; current course publish flow including analyzer gating, status update, PDF artifact queueing, and notices. |
| 488–639 | Undo/redo implementation and `updateCourseJson`, the single mutation choke point; burst coalescing; restored snapshot application; save scheduling. |
| 640–878 | Course data mutation callbacks: meta, variables, banks, glossary, linked entity edit/delete/detach, block-to-bank linking, page/group selection and reorder, variable-manager navigation, Course Health finding navigation, and scroll-to-target behavior. |
| 879–933 | Asset/resource upload, metadata, attach/update/remove, onboarding completion, back navigation, active-page lookup, comment refresh/create/reply/status/edit/delete/navigation, and comment anchoring. |
| 934–1045 | Page/module add, rename, duplicate, insert-template, delete; block change handling with linked-entity protection. |
| 1046–1307 | Block ID regeneration/copy/duplicate helpers, nested entity ID rebuilding, trigger-target remapping, page-template insertion support, block move/copy/delete/add/reorder. |
| 1308–1419 | Course analyzer memoization, materialized linked entities, active page/selected block derivation, save/health/comment labels, and the start of the render tree. |
| 1420–1575 | Top bar: back/title editing, undo/redo, Preview, Focus Mode, More Tools, health badge, save status, and Publish. |
| 1576–1655 | Publish notice, onboarding tour, Version History, course/page template modals, media library, bulk alt-text review, and linked entity prompts. |
| 1656–1754 | Main body: collapsible left outline and PageList; center live preview iframe or BlockCanvas with all data/action callbacks. |
| 1755–1822 | EditorDrawerShell and the full DrawerSettingsContent prop wiring for all rail/contextual drawers, panels, comments, findings, resources, glossary, linked entities, and feature flags. |

## Main editor stylesheet structure

`packages/editor/src/styles/courseEditor.css` is 3,629 lines. Its major
sections, in source order, are:

1. Course-editor base/read-only styling and share-link panel styling.
2. Top bar layout, title editing, undo/redo, Preview, Focus Mode, save
   status, and Publish controls.
3. Left/center body layout and the fixed right icon rail/drawer shell,
   including backdrop, slide-in animation, header, and placeholder states.
4. Comments panel, thread/reply/resolution states, and comment navigation.
5. Page list: rows, active selection, drag handles, kebab menus/submenus,
   footer actions, grouped modules, collapse/drop targets, and the shared
   styled select/multi-select controls.
6. Block canvas: empty state, Add Block, between-block insertion points,
   block wrapper selection/chrome/toolbar, drag handle, comment indicator,
   settings hint, delete separation, and generic fallback preview.
7. Block picker: category headings, search, grid buttons/icons, empty state.
8. Settings panel base layout, section headings, labels, hints, checkboxes,
   and the question-bank manager/transfer/review/modal layouts.
9. Linked-entity prompt and the large Question Bank master/detail modal,
   including responsive behavior.
10. Shared form controls, custom block labels, faculty notes, editable rich
    fields, rich-text toolbar/link picker/variable picker/color picker.
11. Inline block editors and nested block stacks: headings, text, lists,
    accordion, tabs, knowledge checks, image/media, carousels, flashcards,
    matching, ordering, hotspot, reflection, two-column, tables, embeds,
    captions, and related settings.
12. Live preview iframe/device toolbar and media-library panel/grid/item
    styles; glossary suggestion styles.
13. Block-specific compact editor layouts for flashcards, matching,
    ordering, and hotspot.
14. Onboarding tour overlay, reflection, two-column, embed, table, and
    move/copy/page-template helper styles.
15. Objectives, Player settings, resource rows, custom utility items,
    conditional visibility, triggers, timeline triggers, and Caption Editor.
16. Condition Builder and Trigger Builder modal styles.
17. Variable Manager styles.
18. Course Health grouping, top-bar badge, publish notices, and Bulk Alt
    Text Review.
19. Modal overlay stacking rules, More Tools menu, info tooltips, and the
    Basic/Advanced settings disclosure.

Other editor styles are split across smaller files: `base.css` (255 lines),
`courseLibrary.css` (317), `mnemonify-tokens.css` (65), `brand.css` (58),
`auth.css` (18), `index.css` (21), and `tokens.css` (6). The editor’s
effective visual language therefore comes from both the large route-specific
stylesheet and these shared/base token files.

## Non-editor authenticated surfaces immediately around the editor

These are not part of the CourseEditor canvas itself, but they are current
authoring surfaces users encounter before or alongside it:

| Surface | Component/file | Current contents | Approx. size / complexity |
|---|---|---|---|
| Course library/dashboard | `packages/editor/src/pages/CourseLibrary.jsx` | Top navigation/brand, Templates link, Import Word, Team, New Course, Sign out, onboarding banner/tour entry, title search, course cards with status/date/cover, duplicate/delete menus, empty state. | 351 lines; high page-level coordination. |
| Template library | `packages/editor/src/pages/TemplateLibrary.jsx` | Browse/select template cards and return/open actions. | 106 lines; low/medium. |
| Auth shell | `packages/editor/src/auth/AuthPages.jsx`, `packages/editor/src/auth/AuthContext.jsx` | Sign-in/sign-up/verification/password-reset flows and session state. | Outside the editor canvas; relevant to entry/exit but not included in the redesign canvas inventory. |

This file is intentionally an inventory only. It records the current
surfaces, ownership, and complexity so later redesign work can make explicit
decisions about what stays, moves, combines, or disappears.
