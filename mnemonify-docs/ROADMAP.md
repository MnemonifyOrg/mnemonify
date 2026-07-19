# Architecture and Product Roadmap

**Status:** Proposed sequencing guide  
**Purpose:** Organize development around capability gates rather than an unrestricted feature list.

This roadmap complements the priorities in `REQUIREMENTS.md`. It does not replace release planning.

## Guiding rule

A phase is complete when its architectural contracts, tests, documentation, migrations, and failure behavior are complete—not only when its UI appears functional.

## Phase 0 — Foundations already established

Core direction:

- responsive block-based authoring;
- canonical course JSON;
- separate editor and player;
- deterministic variables and triggers;
- SCORM 2004 3rd Edition publishing;
- standalone delivery;
- in-player resource containment;
- brand and design-token system;
- accessibility requirements;
- self-hosting path.

Continue treating the existing top-level specifications and decisions log as authoritative.

## Phase 1 — Stabilize the core authoring platform

### Product capabilities

- reliable core block set;
- direct text editing;
- drag and reorder;
- autosave;
- responsive preview;
- templates;
- core assessments;
- player navigation and completion;
- static SCORM export.

### Architectural gates

- formal schema validation;
- sequential migration service;
- saved-revision export contract;
- block lifecycle documentation;
- accessibility acceptance template;
- editor error boundary strategy;
- representative fixture library;
- performance budgets for common courses.

### Exit criteria

- historical fixtures migrate automatically;
- every core block passes phone, keyboard, PDF, and player tests;
- publish never uses unsaved or invalid course state;
- no duplicate or unresolved IDs in normalized documents.

## Phase 2 — Make advanced logic trustworthy

### Product capabilities

- plain-language trigger builder;
- conditions and variables;
- block visibility and states;
- conditional Continue behavior;
- score-driven branches;
- interactive video actions.

### Architectural gates

- typed trigger registry;
- state ownership model;
- dependency index;
- trigger execution ordering;
- execution depth and cycle protection;
- preview reset;
- trigger trace/debugger;
- safe deletion and rename impact.

### Exit criteria

- authors can inspect why a trigger did or did not run;
- missing references are detected before publish;
- impossible completion paths are identified;
- learner state resumes consistently.

## Phase 3A — Technical Course Health

### Product capabilities

- Course Analyzer panel;
- accessibility checks;
- broken-reference reporting;
- unused variables, assets, and triggers;
- mobile warnings;
- embed and external-link diagnostics;
- package-size guidance;
- course complexity summary;
- publish comparison.

### Architectural gates

- versioned rule API;
- stable finding fingerprints;
- finding evidence and confidence model;
- suppression model;
- headless Analyzer;
- incremental derived indexes;
- rule-set version recorded at publish.

### Exit criteria

- blocking errors prevent invalid packages;
- findings navigate to exact objects;
- Analyzer runs without external services;
- reports can be exported for review.

## Phase 3B — Learning Alignment and Instructional Analysis

### Product capabilities

- objective, instruction, practice, assessment, feedback, and transfer mapping;
- coverage matrix and alignment reports;
- assessment-quality rules;
- feedback and remediation analysis;
- instructional-role metadata;
- Analyzer profiles and organization-specific rule packs;
- transparent recommendations with justified suppression;
- revision-bound Analyzer snapshots.

### Architectural gates

- stable IDs for objectives, assessment items, options, feedback, and mappings;
- derived learning-alignment graph;
- versioned profile and rule-pack contracts;
- deterministic finding evidence;
- Analyzer snapshot and reproducibility model;
- Course Health navigation and impact links.

### Exit criteria

- authors can see where each objective is instructed, practiced, assessed, and supported for transfer;
- unmapped or unsupported learning elements are detected;
- heuristic recommendations are clearly distinguished from verified defects;
- profiles can be combined without changing canonical course data;
- the same revision and rule versions reproduce equivalent findings.

## Phase 4 — Team workflow and content operations

### Product capabilities

- shared workspaces;
- roles;
- record locking;
- review comments;
- version history and rollback;
- Word storyboard flow;
- translation workflow;
- richer media library.

### Architectural gates

- optimistic concurrency or explicit locking contract;
- immutable published versions;
- asset hashes and metadata;
- translation identity and stale-source tracking;
- audit events for privileged actions;
- backup and recovery documentation.

### Exit criteria

- concurrent edits cannot silently overwrite work;
- a published course can be reconstructed;
- translation survives reordering;
- asset replacement shows impact.

## Mid-flight reprioritization after Phase 4

The application has completed its current implementation Phase 4 milestone. The capability phases in this handbook are strategic groupings and should not be used to retroactively renumber or invalidate completed build work. The next development cycle should prioritize the Phase 3A and Phase 3B capabilities that remain incomplete, then continue into templates and instructional recipes.

Public extension SDK and marketplace work should remain later-stage unless a narrow internal registry capability is required to implement first-party Analyzer rules, templates, or embed presets.

## Phase 5 — Reuse and instructional recipes

### Product capabilities

- intent-led authoring;
- instructional recipe library;
- trigger recipes;
- reusable pages and block groups;
- linked or pinned learning objects;
- deterministic course documentation.

### Architectural gates

- explicit copy/link/pin/detach semantics;
- dependency-aware updates;
- recipe schema and compatibility;
- provenance and license metadata;
- update conflict workflow.

### Exit criteria

- authors understand whether content is linked or copied;
- source updates cannot silently overwrite local changes;
- recipes generate normal editable course JSON.

## Phase 6 — Extension SDK

### Product capabilities

- public Block Registry contract;
- build-time third-party plugins;
- plugin recipes and Analyzer rules;
- specialized disciplinary blocks.

### Architectural gates

- semantic plugin API version;
- namespaced plugin data;
- plugin migrations;
- compatibility matrix;
- security capability declarations;
- plugin accessibility and export contracts;
- unknown-plugin recovery.

### Exit criteria

- a contributor can implement a block without changing core code;
- courses with missing plugins remain recoverable;
- plugin failures produce contained diagnostics;
- every plugin declares supported output targets.

## Phase 7 — Community catalog

### Product capabilities

- discoverable community packages;
- starter packs;
- open-license content;
- reviews and compatibility metadata;
- managed installation for hosted deployments.

### Architectural and governance gates

- package integrity/signing;
- malware and dependency scanning;
- moderation and takedown process;
- license and attribution enforcement;
- abandoned-package policy;
- verified status criteria;
- compatibility testing;
- rollback.

### Exit criteria

- administrators can assess trust before installation;
- package removal does not destroy course data;
- community content includes clear provenance.

## Phase 8 — Analytics and integrations

### Product capabilities

- aggregate dashboards;
- xAPI-compatible delivery;
- institutional exports;
- approved external integrations.

### Architectural gates

- stable event vocabulary;
- privacy and retention policy;
- tenant isolation;
- offline/retry behavior;
- consent and configuration controls;
- integration capability boundaries.

### Exit criteria

- telemetry is minimal and documented;
- core course behavior does not depend on analytics availability;
- integrations can be disabled without breaking playback.

## Phase 9 — Optional AI assistance

### Product capabilities

- draft objectives;
- question and distractor suggestions;
- summaries;
- translation drafts;
- alt-text suggestions;
- recipe recommendations;
- plain-language explanations.

### Architectural gates

- provider-neutral interface;
- explicit user invocation;
- data disclosure controls;
- review-before-apply workflow;
- provenance;
- safe patch API;
- no-AI feature parity for the core product.

### Exit criteria

- disabling AI removes no essential authoring or publishing capability;
- generated changes become normal course data;
- private content is not transmitted without clear configuration.

## Cross-phase workstreams

### Accessibility

Maintain per-block contracts, automated checks, manual testing, and publish reporting in every phase.

### Security

Threat-model uploads, embeds, publishing, multi-tenancy, plugins, and integrations as they are introduced.

### Performance

Test representative small, medium, and large courses. Track editor latency, player load, package size, and publish resource usage.

### Documentation

Update architecture, requirements, ADRs, migration notes, contributor guidance, and examples with every material change.

### Community governance

Define contribution review, release ownership, code of conduct, security reporting, and maintainer succession before ecosystem scale demands them.

## Features to keep out unless strategy changes

- free-form slide canvas;
- arbitrary author JavaScript;
- unrestricted CSS themes;
- named student records;
- rosters and gradebooks;
- real-time teacher-paced delivery;
- native mobile apps;
- core dependency on proprietary AI;
- public marketplace without trust controls.
