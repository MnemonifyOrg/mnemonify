# Plugin Architecture

**Status:** Proposed design  
**Goal:** Permit safe, maintainable community extension without coupling plugins to internal implementation details.

## 1. Scope

The plugin model may support:

- block types;
- instructional recipes;
- trigger events, conditions, and actions;
- Course Analyzer rules;
- exporters;
- importers;
- theme presets;
- media processors;
- integrations.

The first implementation should prioritize build-time registration of blocks, recipes, and analyzer rules. Runtime marketplace installation should be deferred.

## 2. Principles

1. Plugins use public contracts only.
2. Capabilities are declared explicitly.
3. Plugin data is namespaced and versioned.
4. Core course validity cannot depend on an unavailable optional plugin without a visible compatibility error.
5. Plugins must define accessible and responsive behavior.
6. Published output must not execute arbitrary author-supplied code.
7. Plugins own migrations for their persisted data.
8. Compatibility is based on semantic versions and declared API ranges.
9. A plugin failure should be isolated where technically possible.
10. Unknown plugin content must remain recoverable and exportable as source data.

## 2.1 Prefer data packages before executable plugins

Domain specialization should use templates, recipes, Analyzer profiles, embed-provider presets, and import mappings whenever existing core behavior is sufficient.

A plugin is justified when a contribution introduces genuinely new executable behavior, such as:

- a new learner interaction or block runtime;
- an exporter or importer requiring executable transformation;
- an external validator;
- a provider integration with runtime messaging;
- a new authoring capability that cannot be represented as canonical data.

Normal domain labels, workflows, and page sequences are not sufficient reasons to create a plugin.

## 3. Package shape

```text
mnemonify-plugin-example/
├── package.json
├── mnemonify.plugin.json
├── src/
│   ├── index.ts
│   ├── blocks/
│   ├── recipes/
│   ├── analyzer/
│   └── migrations/
├── tests/
├── README.md
├── LICENSE
└── CHANGELOG.md
```

Example manifest:

```json
{
  "id": "org.example.process-map",
  "name": "Process Map",
  "version": "1.2.0",
  "mnemonify": {
    "api": "^1.0.0",
    "courseSchema": ">=5 <8"
  },
  "capabilities": [
    "block.register",
    "analyzer.rule.register"
  ],
  "license": "MIT",
  "entry": "./dist/index.js"
}
```

## 4. Registration API

Conceptual API:

```ts
export interface MnemonifyPlugin {
  manifest: PluginManifest;
  register(context: PluginRegistrationContext): void;
}

context.blocks.register(blockDefinition);
context.recipes.register(recipeDefinition);
context.analyzer.register(ruleDefinition);
context.migrations.register(migrationDefinition);
```

Registration should occur before course validation and UI catalog construction.

## 5. Block definition

```ts
interface BlockDefinition<TData> {
  type: string;
  version: number;
  title: string;
  category: string;
  icon: IconReference;
  schema: JsonSchema;
  createDefault(): TData;

  editor: EditorAdapter<TData>;
  player: PlayerAdapter<TData>;
  staticPreview?: StaticPreviewAdapter<TData>;
  pdf: ExportAdapter<TData>;
  word: ExportAdapter<TData>;

  validate(context: ValidationContext<TData>): Finding[];
  accessibility: AccessibilityContract;
  analytics: AnalyticsContract;
  triggers: TriggerCapabilityContract;
  migrations: BlockMigration[];
}
```

Every registered block type must have a globally unique identifier. Recommended naming:

```text
core.text
core.image
org.example.process-map
```

## 6. Capability model

Candidate capabilities:

| Capability | Purpose |
|---|---|
| `block.register` | Add block definitions |
| `recipe.register` | Add deterministic authoring recipes |
| `analyzer.rule.register` | Add static course checks |
| `trigger.event.register` | Add supported runtime event |
| `trigger.action.register` | Add supported runtime action |
| `exporter.register` | Add output target |
| `importer.register` | Add controlled source importer |
| `theme.register` | Add curated theme preset |
| `media.processor.register` | Add server-side media pipeline |
| `integration.register` | Add external service integration |

Capabilities that execute server code, access files, or contact networks require stronger trust and deployment controls than declarative blocks.

## 7. Course data

Plugin-owned data should be stored in namespaced structures.

```json
{
  "id": "block-123",
  "type": "org.example.process-map",
  "type_version": 2,
  "data": {
    "nodes": []
  }
}
```

Unknown plugin blocks must not be discarded. The editor should display:

- plugin identifier;
- required version or compatibility;
- affected page;
- raw-data preservation status;
- options to install, replace, or remove.

## 8. Migrations

Plugin migrations use sequential versions:

```ts
{
  pluginId: "org.example.process-map",
  blockType: "org.example.process-map",
  from: 1,
  to: 2,
  migrate(data) {
    return { ...data, layout: data.layout ?? "vertical" };
  }
}
```

Rules:

- migrations are pure;
- no network calls;
- no UI prompts during migration;
- diagnostics are returned separately;
- migration fixtures are required;
- failed migrations do not overwrite the source.

## 9. Editor isolation

Initial trusted plugins may compile into the application. Later untrusted UI extensions should use stronger isolation, such as sandboxed frames or a constrained declarative editor schema.

Plugins should not directly manipulate global editor state. They should call documented commands:

- update block data;
- request asset selection;
- create variable;
- open modal;
- report validation issue;
- request preview.

## 10. Player isolation

Published plugins must meet a stricter standard than editor plugins.

Preferred order:

1. declarative renderer using platform components;
2. audited compiled renderer;
3. sandboxed isolated renderer for exceptional use cases.

Arbitrary network access should be disabled unless the course and deployment explicitly permit it.

## 11. Accessibility requirements

A plugin block must provide:

- semantic model;
- keyboard interaction table;
- focus behavior;
- accessible-name rules;
- color and contrast behavior;
- reduced-motion behavior;
- screen-reader test notes;
- mobile reflow behavior;
- print/PDF fallback;
- automated accessibility test coverage.

Plugins without a complete accessibility contract should not receive a “verified” status.

## 12. Export requirements

A block must declare support for each target:

- full;
- simplified;
- transcript/static fallback;
- omitted with warning;
- unsupported and publish-blocking.

PDF and Word behavior cannot be inferred automatically for complex interactions.

## 13. Analyzer and validation rules

Plugins may register:

- block-local validity rules;
- course-wide quality rules;
- migration diagnostics;
- accessibility findings;
- performance estimates.

Plugin findings use the same severity and navigation model as core findings.

## 13.1 Additional registries

The platform may expose narrowly scoped registries for:

- versioned Analyzer rules;
- Analyzer profiles;
- starter-pack manifests;
- embed-provider presets;
- structured import adapters.

Data-only registrations must be preferred where executable code is unnecessary. A starter pack must instantiate ordinary course JSON, and uninstalling it must not make existing courses unreadable.

## 14. Compatibility

Compatibility dimensions:

- plugin API version;
- course schema version;
- editor version;
- player version;
- exporter version;
- deployment capabilities.

A compatibility matrix should be machine-readable.

## 15. Trust levels

Suggested future levels:

| Level | Meaning |
|---|---|
| Local | Installed manually by an administrator |
| Community | Published, identity and metadata verified |
| Verified | Automated checks and human review passed |
| Core | Maintained with Mnemonify releases |

Trust status must not imply pedagogical endorsement.

## 16. Marketplace gates

Do not launch a public marketplace until the project has:

- signed packages or integrity verification;
- malware and dependency scanning;
- license metadata;
- moderation and takedown procedures;
- compatibility checks;
- accessibility declarations;
- security reporting process;
- abandoned-plugin policy;
- review and rating safeguards;
- reproducible package builds where feasible.

## 17. Testing contract

Each block plugin should test:

- default creation;
- schema validation;
- editor rendering;
- player rendering;
- phone and desktop behavior;
- keyboard use;
- screen-reader semantics;
- trigger events and actions;
- PDF/Word fallback;
- analytics events;
- migrations from supported versions;
- missing-plugin recovery.

## 18. Phased implementation

### Phase A: internal registry

Move core blocks behind the same registry contract.

### Phase B: first-party packages

Split selected core or specialized blocks into packages while retaining a trusted build.

### Phase C: build-time third-party plugins

Self-hosters install dependencies and rebuild.

### Phase D: managed plugin catalog

Hosted deployment allows reviewed packages.

### Phase E: runtime installation

Only after isolation, signing, permissions, compatibility, and rollback are proven.
