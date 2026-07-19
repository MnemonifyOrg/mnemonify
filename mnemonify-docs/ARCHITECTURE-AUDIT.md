# Architecture Audit

**Project:** Mnemonify  
**Status:** Independent review draft  
**Reviewed sources:** `REQUIREMENTS.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `BRAND-GUIDE.md`  
**Review date:** July 2026

## 1. Executive summary

Mnemonify has a strong product premise and a notably coherent set of foundational choices. Its central proposition, responsive block-based authoring with variables, triggers, states, branching, SCORM publishing, and a low learning curve, addresses a real gap between simple page builders and complex slide-based authoring suites. Its strongest emerging opportunity is to become a general learning-engineering platform that helps authors connect objectives, instruction, practice, assessment, feedback, and transfer, then evaluate those relationships through transparent deterministic analysis.

The current architecture is strongest where it establishes hard constraints:

- the course JSON is the canonical source of truth;
- the editor and player are separate applications;
- layouts are responsive rather than pixel-positioned;
- trigger behavior is deterministic;
- the player contains linked resources rather than unexpectedly ejecting learners;
- accessibility is a product requirement rather than an optional audit step;
- AI is outside the core authoring engine;
- the project avoids becoming an LMS.

These decisions provide a sound base for v1.

The primary architectural risk is not that the design is incorrect. It is that the application may become successful before several ecosystem and maintenance contracts are formalized. The current architecture can support a well-built application, but it needs additional boundaries to support years of schema evolution, community extensions, reusable content, large courses, complex logic, and multiple rendering targets.

The highest-priority additions are:

1. a formal block registry and extension contract;
2. sequential course-schema migrations;
3. an explicit dependency index;
4. a shared block lifecycle and rendering contract;
5. hierarchical runtime and editor state boundaries;
6. trigger tracing, cycle protection, and static logic analysis;
7. a derived learning-alignment graph and deterministic Course Analyzer;
8. versioned analyzer rules, findings, profiles, and snapshots;
9. a data-first starter-pack and embed-provider model;
10. durable accessibility, security, analytics, and translation contracts.

None of these recommendations requires abandoning the existing architecture.

## 2. Overall assessment

| Area | Assessment | Notes |
|---|---:|---|
| Product vision | Excellent | Clear target audience, differentiated promise, disciplined non-goals |
| Requirements | Strong | Detailed stories, priorities, deployment and workflow considerations |
| Core architecture | Strong | JSON-first, editor/player separation, deterministic runtime |
| Responsive strategy | Excellent | Permanent constraint avoids slide-layout failure modes |
| Accessibility direction | Strong | Needs a formal per-block acceptance contract |
| Extensibility | Developing | Registry and plugin boundaries should be formalized early |
| Schema longevity | Developing | Version field exists; migration pipeline should be specified |
| Maintainability | Strong foundation | Dependency analysis and shared rendering contracts will improve it |
| Community readiness | Developing | Contributor SDK, compatibility policy, and governance are future gates |
| AI readiness | Appropriate | Optional boundary should remain downstream of deterministic services |

## 3. Architectural strengths

### 3.1 Canonical course JSON

A single course document reduces synchronization failures between authoring, playback, export, translation, analytics, and future services. It enables deterministic publishing and makes courses portable across hosted and self-hosted deployments.

This decision should remain permanent. Databases may index, cache, and version course content, but they should not become a second semantic source of truth.

### 3.2 Editor and player separation

The editor produces valid course data. The player consumes course data. This separation:

- keeps the learner runtime smaller;
- reduces SCORM packaging complexity;
- supports standalone web delivery;
- enables independent runtime testing;
- prevents authoring dependencies from leaking into published courses;
- allows future renderers to consume the same document.

The player should remain a renderer and runtime, not a hidden second editor.

### 3.3 Responsive block composition

Rejecting a free-form slide canvas is a strategic strength. Automatic layout behavior makes mobile support enforceable and significantly lowers the design burden on educators. New capabilities should be introduced through responsive blocks, layouts, patterns, and recipes—not unrestricted coordinates.

### 3.4 Deterministic interaction model

The event → condition → action model is explainable, testable, serializable, and compatible with non-technical authoring. It is a better core than arbitrary scripting. Mnemonify should continue increasing capability through typed events, conditions, actions, and recipes rather than adding an embedded programming language.

### 3.5 Deliberate product boundaries

The non-goals are unusually valuable. Avoiding native apps, gradebooks, rosters, named student records, real-time classroom orchestration, and unrestricted theming protects the product from becoming an LMS or a generic website builder.

### 3.6 In-player containment

Treating containment as a hard rule improves learner continuity, especially inside LMS windows. Modal viewers and controlled external-link behavior should be tested as part of every relevant block and export target.

## 4. Architectural gaps and recommendations

### 4.1 Formal block registry

Block behavior should not be distributed across switch statements and manually synchronized menus. A central registry should describe each block type.

A registry entry should include:

- stable type identifier;
- schema and default data;
- schema version;
- editor component;
- player renderer;
- static preview renderer;
- PDF and Word export adapters;
- validation rules;
- accessibility contract;
- analytics vocabulary;
- migration functions;
- icon, label, category, and capability metadata;
- nested-content permissions;
- supported trigger events and actions.

All block-discovery surfaces should derive from the registry.

### 4.2 Plugin and extension architecture

Community extensions are central to the long-term “WordPress for learning” ambition. The plugin system should be capability-based and deny access by default.

A plugin should not receive arbitrary editor or server access. It should declare capabilities such as:

- register a block;
- register a validator;
- register a recipe;
- register an exporter;
- register a theme preset;
- register a Course Analyzer rule;
- register a migration.

Early versions may support build-time plugins only. Runtime installation, marketplaces, and third-party server code should wait until signing, compatibility, permissions, and security policies are mature.

### 4.3 Sequential schema migrations

A `schema_version` field is necessary but not sufficient. Opening old course data should run a deterministic migration chain:

```text
load → inspect version → migrate N to N+1 → validate → normalize → open
```

Migration requirements:

- migrations are pure and repeatable;
- every persisted shape change includes a migration;
- the original is retained until the migrated document saves successfully;
- migrations emit structured diagnostics;
- tests include representative historical fixtures;
- downgrades are not assumed;
- plugin-owned data has plugin-owned migration hooks.

### 4.4 Dependency index

References between objects should be discoverable. The system should index relationships among pages, blocks, variables, triggers, assets, objectives, assessment items, translations, themes, and reusable objects.

This enables:

- safe deletion;
- rename and replace operations;
- “used by” inspection;
- broken-reference detection;
- orphan detection;
- impact analysis;
- maintenance reports;
- reusable-object updates;
- Course Analyzer rules.

The dependency index may be derived from course JSON and cached. It should not become a separately authored source of truth.


### 4.5 Learning-alignment graph

The Course Analyzer should operate over a derived learning graph built from the canonical course document.

The graph should represent relationships among:

- outcomes;
- objectives;
- pages and blocks;
- instructional content;
- examples and demonstrations;
- practice activities;
- assessment items;
- answer options;
- feedback and remediation;
- transfer or application activities;
- variables, triggers, and branches;
- assets and external embeds.

The graph is derived and rebuildable. It must not become a second source of truth.

Objectives, assessments, answer options, feedback variants, mappings, and instructional relationships require stable IDs. Mappings must reference IDs rather than labels, array positions, or inferred text matches. Renaming or reordering an objective must not break its relationship to content or assessment.

A lightweight, domain-neutral instructional-role taxonomy should be available to blocks and reusable patterns:

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
```

Where a role is obvious from the block type, it may be inferred. Authors and templates should be able to override or clarify it.

### 4.6 Analyzer rule, finding, and snapshot contracts

Analyzer rules should be organized into versioned profiles or rule packs. Examples include structural integrity, accessibility, assessment quality, objective alignment, scenario-based learning, retrieval practice, maintenance, publishing, and institution-specific standards.

A stable finding contract should distinguish verified defects from contextual recommendations:

```ts
interface AnalyzerFinding {
  id: string;
  fingerprint: string;
  ruleId: string;
  ruleVersion: string;
  category: string;
  severity: "error" | "warning" | "suggestion" | "info";
  confidence: "certain" | "high" | "moderate" | "low";
  objectIds: string[];
  evidence: FindingEvidence[];
  message: string;
  rationale?: string;
  recommendation?: string;
  requiresHumanJudgment: boolean;
  profileIds: string[];
}
```

Suppressions should include the finding fingerprint, justification, author, timestamp, and applicable revision or scope.

A stored Analyzer snapshot should identify:

- course revision;
- analyzer engine version;
- enabled rule-pack versions;
- profile configuration;
- findings;
- suppressions;
- execution timestamp.

Published outputs may record the Analyzer snapshot used during validation.

### 4.7 Starter packs, templates, and embed providers

Starter packs should be data-first packages rather than forks of the core application.

A starter pack may contain:

- course templates;
- page templates;
- reusable block patterns;
- instructional recipes;
- predefined variables and triggers;
- analyzer-profile recommendations;
- embed presets;
- sample assets;
- author guidance.

Instantiation must produce ordinary canonical course JSON. Removing a starter pack must not prevent previously created courses from opening or playing.

Templates, recipes, analyzer profiles, and embed presets should be preferred over plugins whenever existing core capabilities can represent the experience. A plugin is justified only when a contribution requires a genuinely new block behavior, runtime capability, exporter, validator, or integration boundary.

Embed providers should be registered through provider presets containing:

- allowed domains;
- URL matching and normalization;
- sandbox and permission requirements;
- responsive sizing behavior;
- authentication expectations;
- fallback-link behavior;
- accessibility declaration;
- export compatibility;
- optional interaction or completion messaging.

Provider presets configure the general embed block and should not require provider-specific course schema.

### 4.8 State boundaries

Editor state, course state, runtime state, persisted learner state, and temporary UI state should be distinguished explicitly.

Recommended layers:

| Layer | Examples | Persistence |
|---|---|---|
| Application | user preferences, workspace, feature flags | Account/local |
| Editor UI | selected block, open panel, drag state | Usually transient |
| Course authoring | pages, blocks, variables, triggers, theme | Course JSON |
| Player session | current page, media state, modal state | Session |
| Learner resume | completion, score, variables, visited pages | SCORM/local |
| Block runtime | selected tab, attempt state, revealed feedback | Defined per block |

Each state owner should specify serialization, reset behavior, preview behavior, and SCORM suspend-data impact.

### 4.9 Trigger graph safeguards

The trigger UI may remain sentence-based while the internal engine gains graph-level protections:

- deterministic ordering;
- maximum execution depth;
- repeated-action suppression where appropriate;
- cycle detection;
- self-trigger detection;
- missing-target detection;
- execution tracing;
- preview debugger;
- static “may never run” analysis;
- duplicate and contradictory action warnings.

Trigger recipes should generate normal triggers rather than creating a second logic system.

### 4.10 Shared rendering contract

Every block should define how it behaves in each supported target:

- editor canvas;
- player;
- mobile player;
- static review;
- print/PDF;
- Word storyboard;
- translation extraction;
- accessibility tree;
- analytics.

Not all targets require identical visual output. They require intentional fallback behavior. An accordion may be interactive in the player and fully expanded in PDF. An interactive video may become a poster, transcript, and question list in print.

### 4.11 Asset model maturity

The asset model should grow beyond file path and MIME type. Recommended metadata includes:

- stable ID;
- original filename;
- MIME type;
- size;
- cryptographic hash;
- dimensions or duration;
- thumbnails and poster frames;
- caption and transcript tracks;
- language;
- alt text and long description;
- creator and source;
- license and attribution;
- optimization variants;
- usage references;
- upload and modification timestamps.

Hashing enables duplicate detection and safe replacement. Licensing metadata is especially relevant to community-contributed starter content.

### 4.12 Analytics event contract

Analytics should use a stable, versioned event envelope. Events should describe learner behavior without embedding unnecessary personal data.

Suggested fields:

```json
{
  "event_version": 1,
  "event_type": "knowledge_check.submitted",
  "timestamp": "ISO-8601",
  "course_id": "course-id",
  "course_version": "version-id",
  "page_id": "page-id",
  "block_id": "block-id",
  "session_id": "anonymous-session",
  "actor_hash": "optional-hash",
  "payload": {}
}
```

The vocabulary should distinguish viewed, started, interacted, submitted, completed, passed, failed, skipped, and abandoned states.

### 4.13 Translation identity

Every translatable item needs stable identity, including nested accordion items, tabs, answer options, feedback variants, captions, glossary items, resource labels, and utility labels.

Translations should be keyed by identity rather than array position. Reordering content must not invalidate translations.

### 4.14 Accessibility contract

Each block specification should include:

- semantic structure;
- accessible name calculation;
- keyboard model;
- focus entry and exit;
- screen-reader announcement behavior;
- reduced-motion behavior;
- contrast requirements;
- zoom and reflow expectations;
- caption/transcript requirements;
- error and feedback communication;
- print/PDF fallback;
- automated and manual test cases.

A block should not be considered complete until this contract passes.

### 4.15 Security architecture

Security should be a named architecture section, not only implementation guidance. It should cover:

- rich-text sanitization;
- SVG handling;
- upload type and signature validation;
- iframe allowlists and sandbox attributes;
- Content Security Policy;
- URL protocol restrictions;
- archive extraction safety;
- export-path traversal prevention;
- plugin trust boundaries;
- dependency scanning;
- secrets management;
- tenant separation for hosted deployments;
- audit logs for privileged operations.

Published courses should not execute arbitrary author-supplied JavaScript.

### 4.16 Large-course performance

The editor should be designed for courses larger than the initial examples. Recommended techniques include:

- page-level lazy loading;
- block virtualization where useful;
- normalized lookup indexes;
- debounced validation;
- incremental dependency analysis;
- background media processing;
- chunked upload;
- bounded undo history;
- memoized renderers;
- publish-time streaming rather than loading all binary assets into memory.

Performance budgets should be defined for editor startup, page switching, typing latency, preview refresh, publish duration, and player load.

### 4.17 Search and command architecture

As features increase, authors need fast retrieval. A shared search index can support:

- page and block search;
- asset search;
- variable and trigger search;
- command palette;
- “go to reference” navigation;
- Course Analyzer result navigation;
- reusable-content discovery.

Search results should identify object type, location, and context.

### 4.18 Undo, autosave, and conflict boundaries

Undo/redo should operate on authoring commands or patches, not full opaque snapshots where possible. Autosave, record locking, export, and migration should use explicit revision identifiers to prevent silent overwrite.

Recommended states:

- clean;
- locally changed;
- saving;
- saved;
- save failed;
- remote revision changed;
- migration pending;
- publish snapshot created.

### 4.19 Reusable learning objects

Reusable objects should be introduced after dependency tracking and versioning exist. They need clear semantics:

- copy: independent duplicate;
- linked instance: receives source updates;
- pinned instance: linked to a specific version;
- detached instance: becomes local content;
- override: limited local customization.

Ambiguous reuse behavior creates maintenance problems. The UI should make the chosen model explicit.

### 4.20 Structured import adapter boundary

Importers should be external adapters that convert source formats into a normalized import plan before creating course objects.

An import plan should include:

- proposed pages and blocks;
- source locations;
- extracted assets;
- inferred relationships;
- confidence;
- unresolved fields;
- warnings;
- required author decisions.

Importers must not write directly into the course document without validation and review. Domain starter packs may contribute import mappings for common storyboard formats without changing the canonical schema.

### 4.21 Optional AI boundary

AI should consume stable services rather than become infrastructure. The deterministic system should provide:

- course schema;
- validation results;
- dependency data;
- translation units;
- content extraction;
- change application APIs.

Optional AI features may suggest text, questions, summaries, distractors, translations, or alt text. Suggestions must be reviewable and should resolve into normal course data. Validation, publishing, migrations, scoring, accessibility checks, and runtime behavior must not require an AI service.

## 5. Recommended target architecture

```text
Authoring UI
    |
Authoring Commands and Document Services
    |
Canonical Course JSON
    |------------------------------|
Schema and Migrations      Derived Services
                           - dependency graph
                           - learning-alignment graph
                           - search index
                           - Analyzer engine
                           - change-impact analysis
    |
Registries and Contracts
    |-----------|------------|-------------|
Blocks      Recipes      Analyzer Rules   Embed Providers
    |
Editor / Player / Exporters / Importers
    |
Publishing and Validation Pipeline
    |----------|-----------|
SCORM      Standalone   Dynamic delivery
```

Cross-cutting services:

- accessibility;
- security;
- analytics;
- media processing;
- revision history;
- testing and diagnostics;
- analyzer snapshots and provenance.

## 6. Priority sequence

### Before a public plugin ecosystem

1. Block Registry
2. Block Lifecycle contract
3. Schema migration pipeline
4. Accessibility contract
5. Security capability model
6. Plugin compatibility policy

### Before complex adaptive courses

1. State ownership model
2. Dependency index
3. Trigger execution trace
4. Cycle and missing-reference analysis
5. Preview reset and reproducibility rules

### Before large institutional libraries

1. Asset metadata and hashing
2. Search index
3. reusable-object semantics
4. revision and locking model
5. translation identity
6. large-course performance budgets

### Before positioning the Course Analyzer as a primary differentiator

1. Stable IDs for objectives, assessments, options, feedback, and mappings
2. Instructional-role metadata
3. Learning-alignment graph
4. Versioned Analyzer rule contract
5. Finding and suppression model
6. Incremental analysis
7. Analyzer profiles
8. Snapshot and reproducibility model
9. Course Health navigation and evidence display

### Before optional AI features

1. Structured content extraction
2. Safe patch and application API
3. User review and provenance
4. Provider-neutral integration boundary
5. Analyzer findings exposed through stable services

## 7. Risks if deferred

| Area | Likely consequence |
|---|---|
| Registry | Block behavior becomes duplicated across menus, renderers, and exporters |
| Migrations | Old courses become difficult or unsafe to open |
| Dependencies | Deletions and renames silently break logic |
| State boundaries | Resume, preview, undo, and triggers interfere unpredictably |
| Accessibility contract | Quality varies by block and regressions escape |
| Security model | Embeds, rich text, uploads, and plugins expand attack surface |
| Trigger diagnostics | Authors lose trust in advanced interactivity |
| Shared rendering | PDF, Word, review, and player output drift |
| Translation identity | Reordering content invalidates localization work |
| Performance budgets | Large courses expose architectural bottlenecks late |
| Learning graph | Alignment analysis remains shallow or dependent on fragile text inference |
| Analyzer contracts | Findings become inconsistent, non-reproducible, or difficult to suppress responsibly |
| Starter-pack boundaries | Domain needs fragment the core into special-case code |
| Embed-provider contract | External tools behave inconsistently across preview, player, and export |

## 8. Final assessment

Mnemonify should continue its current direction. Its differentiation comes from combining responsive simplicity with controlled interactivity, not from matching every feature of established authoring suites.

The architecture should evolve by formalizing boundaries around the capabilities already implied by the product vision. The next architectural milestone is not a larger list of blocks. It is a stable platform contract: registry, migrations, dependencies, learning-alignment graph, lifecycle, diagnostics, versioned analyzer rules, and deterministic analysis.

With those foundations, Mnemonify can grow from a strong application into a sustainable open-source authoring ecosystem without sacrificing the simplicity promised to educators.
