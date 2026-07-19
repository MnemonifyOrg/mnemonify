# Conceptual Data Model

**Status:** Proposed companion to `ARCHITECTURE.md`  
**Purpose:** Describe ownership, identity, references, derived indexes, and persistence boundaries without replacing the canonical schema specification.

## 1. Core hierarchy

```text
Course
├── Metadata
├── Theme
├── Settings
├── Sections
│   └── Pages
│       └── Blocks
│           └── Nested items or child blocks
├── Variables
├── Triggers
├── Assets
├── Objectives
├── Translations
├── Utilities and resources
└── Extension data
```

## 2. Identity rules

Every addressable entity has a stable ID.

Stable IDs are required for:

- sections;
- pages;
- blocks;
- nested interaction items;
- answer options;
- variables;
- triggers;
- assets;
- objectives;
- resources;
- translation units;
- reusable objects.

IDs must not encode visible order. Reordering preserves identity.

## 3. Course

The course owns:

- schema version;
- course identity;
- draft metadata;
- global settings;
- content hierarchy;
- course-level variables and triggers;
- asset references;
- theme selection;
- translation map;
- publishing configuration.

Published versions should be immutable snapshots of a saved course revision.

## 4. Sections and pages

Sections organize navigation. Pages own an ordered block collection and page-level settings.

A page may declare:

- title;
- navigation status;
- completion rule;
- linear-lock behavior;
- utility overrides;
- page-level triggers;
- PDF inclusion;
- objective links.

Page order is presentation data, not identity.

## 5. Blocks

A block contains:

```json
{
  "id": "block-id",
  "type": "core.image",
  "type_version": 1,
  "label": "Optional author-facing label",
  "data": {},
  "settings": {},
  "visibility_condition": null,
  "include_in_pdf": true
}
```

The exact schema remains block-defined through the registry.

Author-facing labels are optional. Generated labels are derived and may change with order; references always use IDs.

## 6. Nested items

Accordions, tabs, questions, carousels, scenarios, and similar blocks contain nested addressable items.

Nested items require stable IDs when they can be:

- translated;
- tracked;
- targeted by a trigger;
- referenced in feedback;
- reordered;
- compared across versions.

## 7. Variables

Supported core types may include:

- boolean;
- number;
- text.

A variable declares:

- ID;
- author-facing name;
- type;
- initial value;
- scope;
- persistence behavior;
- optional description.

Variable names may change without breaking references because triggers use IDs.

## 8. Triggers

A trigger is declarative:

```json
{
  "id": "trigger-id",
  "event": {
    "source_id": "block-id",
    "type": "completed"
  },
  "conditions": [],
  "actions": []
}
```

Conditions and actions reference stable IDs and typed operands.

Trigger ordering must be explicit where outcome depends on sequence.

## 9. Assets

The course references assets by ID rather than embedding path assumptions in blocks.

Asset record:

```json
{
  "id": "asset-id",
  "kind": "image",
  "filename": "diagram.png",
  "mime": "image/png",
  "size": 245001,
  "hash": "sha256:...",
  "metadata": {
    "width": 1600,
    "height": 900,
    "alt": "",
    "license": null
  },
  "variants": []
}
```

Blocks may add context-specific alt text where the same image conveys different meaning in different locations. The asset library may store a suggested default.

## 10. Objectives

Objectives should have stable IDs and may be linked to:

- pages;
- blocks;
- assessment items;
- Analyzer coverage reports.

Objective links are explicit references, not inferred solely from text.

## 10.1 Outcomes, objectives, and instructional roles

Objectives are part of a broader domain-neutral learning model.

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

interface LearningOutcome {
  id: string;
  text: string;
}

interface LearningObjective {
  id: string;
  text: string;
  outcomeIds?: string[];
  level?: string;
}
```

A block type may imply a default instructional role, but templates and authors may explicitly refine it. Interaction count or block type alone must not be treated as evidence of learning quality.

## 10.2 Learning mappings

Mappings explicitly connect objectives to authored learning elements.

```ts
interface LearningMapping {
  id: string;
  objectiveId: string;
  targetId: string;
  relationship:
    | "instructs"
    | "demonstrates"
    | "practices"
    | "assesses"
    | "remediates"
    | "supports_transfer";
}
```

Mappings reference stable IDs, not visible labels or array positions. Renaming or reordering an objective must not break its relationships.

## 10.3 Assessment identity

Assessment items, answer options, feedback variants, and remediation targets require stable IDs. This supports:

- objective mapping;
- answer-level feedback;
- Analyzer findings;
- translation overlays;
- item reuse;
- change-impact analysis;
- later psychometric history.

## 11. Translations

Translations are overlays keyed by stable object and field identity.

```text
locale
└── object ID
    └── field path or nested item ID
        └── translated value and source revision
```

The source course remains canonical. Translation status may include:

- untranslated;
- draft;
- reviewed;
- stale because source changed;
- approved.

## 12. Theme

Course theme data should reference curated tokens and presets. Avoid storing arbitrary CSS.

Theme may define:

- accent;
- logo;
- approved font pairing;
- preset;
- accessible color choices.

The player maps theme data to design tokens.

## 13. Runtime state versus course data

Course data describes authored behavior. Runtime state describes learner progress.

Runtime state should not be written into the course document.

Examples of learner state:

- current page;
- visited pages;
- completion;
- score;
- variable values;
- attempts;
- block completion;
- resume position.

## 14. Published version

A published version links:

- immutable course snapshot;
- course revision;
- schema version;
- player version;
- plugin compatibility set;
- asset manifest;
- output mode;
- publish timestamp;
- validation report.

Dynamic SCORM may retrieve content remotely, but the published version must still identify the exact content contract it represents.

## 15. Derived indexes

The following are derived and rebuildable:

- ID lookup;
- dependency graph;
- search index;
- trigger graph;
- learning-alignment graph;
- objective, instruction, practice, and assessment coverage;
- asset usage;
- translation completeness;
- Analyzer findings;
- estimated package size.

They may be cached for performance but are not manually authored.

## 16. Dependency edges

Example edge types:

- trigger reads variable;
- trigger writes variable;
- trigger targets block;
- trigger navigates to page;
- block uses asset;
- block instructs objective;
- block demonstrates objective;
- block practices objective;
- assessment item assesses objective;
- feedback remediates objective or misconception;
- transfer activity supports objective;
- translation overlays field;
- reusable instance links to source;
- page contains block;
- section contains page.

Edges should retain source, target, relationship type, and location.

## 17. Extension data

Plugin data must be namespaced and versioned. Unknown extension data should be preserved when safe.

Avoid a generic ungoverned metadata bag for core behavior. Promote broadly used fields into the formal schema.

## 18. Revisions and commands

Editor commands produce document changes and revision identifiers. Revision history may store patches, snapshots, or a hybrid, but the materialized course document remains canonical.

Exports should reference a saved revision, not unsaved UI state.

## 18.1 Analyzer suppressions and snapshots

Analyzer suppressions and snapshots are governance records associated with course revisions. They are not embedded runtime state.

A suppression records:

- stable finding fingerprint;
- rule ID and version;
- justification;
- author and timestamp;
- scope;
- applicable revision or revision range.

A snapshot records the normalized course revision, Analyzer engine version, enabled rule-pack versions, findings, and suppressions used for a review or publish decision.

## 19. Invariants

The normalized course document should guarantee:

- IDs are unique within their namespace;
- references resolve or produce explicit diagnostics;
- block data matches its registered schema;
- variables have type-compatible values;
- page and block ordering is deterministic;
- no runtime state is embedded as authoring state;
- translations reference valid stable identities;
- learning mappings reference valid stable identities;
- assessment options and feedback variants have stable IDs;
- schema version is known;
- required migrations have run;
- unsupported plugin data is preserved and surfaced.
