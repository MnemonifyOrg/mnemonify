# Block Lifecycle

**Status:** Proposed contract  
**Purpose:** Define the complete responsibilities of every Mnemonify block type.

## 1. Lifecycle overview

```text
Registered
→ Created
→ Configured
→ Validated
→ Saved
→ Previewed
→ Rendered
→ Interacted with
→ Tracked
→ Exported
→ Migrated
→ Reused or Archived
```

A block is more than an editor component. It participates in authoring, runtime, accessibility, analytics, publishing, translation, migration, and maintenance.

## 2. Registration

A block definition is registered before a course containing that type is opened.

Required metadata:

- unique type;
- type version;
- title and description;
- author-facing category;
- icon;
- default data;
- JSON schema;
- supported containers;
- child-content rules;
- trigger capabilities;
- renderer and exporter adapters;
- accessibility contract;
- migrations.

## 3. Creation

`createDefault()` must return a valid minimal block.

Creation requirements:

- stable block ID;
- current type version;
- sensible accessible defaults;
- no placeholder that can be mistaken for finished content;
- deterministic initial state;
- explicit PDF inclusion default;
- no network dependency;
- undoable insertion.

## 4. Configuration

Configuration may occur:

- inline;
- in a settings panel;
- through an asset picker;
- through a trigger recipe;
- through a recipe-generated structure;
- through import.

Rules:

- common controls appear first;
- advanced controls are disclosed progressively;
- incompatible options are prevented;
- labels use author language;
- every field maps to course data or derived UI state explicitly;
- changing a setting must not silently discard nested data.

## 5. Validation

Validation occurs at multiple levels:

1. field constraints;
2. block schema;
3. block semantics;
4. page/container compatibility;
5. cross-object references;
6. accessibility;
7. export support;
8. performance guidance.

A block may be locally valid but produce a course-level finding.

## 6. Editor rendering

The editor adapter must support:

- selected and unselected states;
- direct editing where appropriate;
- keyboard selection and movement;
- drag/reorder behavior;
- duplication;
- deletion with dependency impact;
- undo/redo;
- responsive preview;
- error and warning indicators;
- custom block labels;
- nested editing when supported.

The editor must not be treated as the authoritative player implementation.

## 7. Preview

Preview should use the actual player renderer or a contract-equivalent environment.

Preview requirements:

- resettable learner state;
- selectable viewport;
- trigger trace access;
- media coordination;
- simulated SCORM context;
- deterministic restart;
- clear distinction between author controls and learner output.

## 8. Player rendering

The player adapter receives:

- validated block data;
- runtime state services;
- variable and trigger services;
- navigation services;
- analytics emitter;
- media coordinator;
- localization data;
- accessibility preferences;
- environment context.

A player block must not mutate course authoring data.

## 9. Runtime state

Each block declares:

- initial runtime state;
- persisted learner state;
- transient state;
- completion conditions;
- reset behavior;
- resume serialization;
- maximum suspend-data estimate;
- events emitted;
- actions accepted.

Example:

| State | Persist? | Example |
|---|---:|---|
| current carousel item | Optional | Resume at prior item |
| answer selection | Yes when required | Restore attempt |
| hover state | No | UI only |
| video playhead | Policy-dependent | Resume media |
| expanded accordion items | Optional | Restore exploration |

## 10. Trigger contract

A block declares supported events, such as:

- entered viewport;
- opened;
- closed;
- selected;
- submitted;
- completed;
- passed;
- failed;
- media started;
- media ended.

It may accept actions such as:

- show;
- hide;
- enable;
- disable;
- reset;
- play;
- pause;
- seek;
- set state.

Events and actions must be typed and documented.

## 11. Accessibility contract

Required sections:

- semantic HTML outline;
- keyboard commands;
- focus order;
- focus restoration;
- announcements;
- error communication;
- color-independent meaning;
- reduced-motion behavior;
- zoom/reflow behavior;
- touch target behavior;
- captions/transcripts;
- static fallback;
- automated and manual tests.

## 12. Analytics contract

A block defines the events it emits and the permitted payload fields. It should avoid logging free-text learner content unless a product and privacy requirement explicitly permits it.

Events should be meaningful and bounded. Avoid emitting high-volume events such as every scroll pixel.

## 12.1 Instructional-role contract

A block definition may declare one or more default instructional roles:

```ts
type InstructionalRole =
  | "instruction"
  | "example"
  | "demonstration"
  | "practice"
  | "assessment"
  | "feedback"
  | "remediation"
  | "reflection"
  | "transfer"
  | "reference";

interface BlockDefinition {
  instructionalRoles?: InstructionalRole[];
  analyzerMetadata?: BlockAnalyzerMetadata;
}
```

Templates or authors may refine the role when context changes. Blocks expose structured facts to the Analyzer; they do not independently decide whether the course is instructionally sound.

## 12.2 Analyzer contribution

A block may contribute deterministic diagnostics about its own schema, accessibility, runtime requirements, exports, and provider dependencies. Cross-course judgments, such as objective coverage or transfer alignment, remain the responsibility of Analyzer rules operating over derived indexes.

## 13. Translation extraction

The block identifies each translatable field with a stable nested ID.

Extraction must preserve:

- context;
- field type;
- character guidance;
- rich-text structure;
- variables/placeholders;
- source revision;
- locale status.

Reordering nested items must not change translation identity.

## 14. PDF and print

The block declares one of:

- equivalent static representation;
- expanded representation;
- transcript representation;
- summary representation;
- intentional omission with visible warning;
- unsupported and publish-blocking.

Examples:

- accordion → all items expanded;
- tabs → all panels under headings;
- video → poster, title, transcript, and optional link;
- branching scenario → decision paths or authored summary;
- reflection → prompt and optional writing space.

## 15. Word storyboard

Word export should preserve author intent in an editable format. It may include:

- block type;
- author notes;
- learner-visible text;
- asset references;
- alt text;
- interaction instructions;
- trigger summary;
- PDF inclusion state.

Import must define which fields are round-trippable.

## 16. Migration

Each block owns sequential migrations for its data.

Migration testing includes:

- oldest supported fixture;
- every adjacent version;
- idempotence at the current version;
- missing optional fields;
- malformed legacy data diagnostics;
- preservation of unknown safe fields where policy allows.

## 17. Duplication and reuse

Duplication creates new identities for the block and nested addressable items. References internal to the duplicated structure should be remapped intentionally.

Reuse modes must identify whether the block is:

- copied;
- linked;
- pinned to a source version;
- locally overridden;
- detached.

## 18. Deletion

Before deletion, the editor checks:

- incoming trigger references;
- variable dependencies;
- navigation targets;
- translations;
- objective links;
- reusable-object relationships;
- asset ownership.

Deletion should be undoable and should not silently remove unrelated referenced objects.

## 19. Deprecation

A deprecated block type remains readable and migratable for a documented period.

Deprecation includes:

- replacement guidance;
- Analyzer warning;
- migration where possible;
- export support policy;
- removal target;
- compatibility notes.

## 20. Definition of done

- instructional role metadata is declared or intentionally omitted;
- Analyzer metadata and deterministic diagnostics are tested;

A block is complete only when it has:

- schema and defaults;
- editor;
- player;
- mobile behavior;
- accessibility contract and tests;
- validation;
- trigger contract;
- analytics contract;
- translation extraction;
- PDF behavior;
- Word behavior or declared limitation;
- migrations;
- fixtures;
- documentation;
- performance review;
- security review for embeds/uploads;
- Course Analyzer rules.
