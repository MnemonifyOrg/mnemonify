# Course Analyzer

**Status:** Proposed subsystem  
**Purpose:** Provide deterministic technical, accessibility, learning-alignment, assessment, maintenance, publishing, and performance analysis.

## 1. Goals

The Course Analyzer should:

- detect invalid or broken course structures;
- identify likely accessibility failures;
- surface logic defects before publishing;
- help non-specialists improve instructional structure;
- make maintenance safer;
- explain findings in plain language;
- navigate to the affected object;
- run without AI or external services;
- produce stable results suitable for CI and publish gates.

It should not claim that a course is pedagogically effective. It should identify observable patterns and explain the limits of each suggestion.

## 2. Architecture

```text
Course JSON
    |
Normalize and validate schema
    |
Build derived indexes
    |- object lookup
    |- dependency graph
    |- text and asset index
    |- trigger graph
    |- learning-alignment graph
    |- objective/content/practice/assessment map
    |
Run rules
    |
Aggregate and deduplicate findings
    |
Present editor panel / publish gate / report / CI output
```

## 2.1 Learning-alignment graph

The Analyzer operates over a derived, rebuildable learning-alignment graph. The canonical course document remains the source of truth.

The graph may contain nodes for:

- intended outcomes;
- learning objectives;
- pages, blocks, and nested items;
- instruction, examples, and demonstrations;
- practice activities;
- assessment items and answer options;
- feedback and remediation;
- reflection and transfer activities;
- variables, triggers, branches, assets, and embeds.

Core relationship types include:

```text
outcome -> objective
objective -> instruction
objective -> practice
objective -> assessment
assessment option -> feedback
feedback -> remediation
objective -> transfer activity
```

Mappings use stable IDs. They must not depend on visible labels, text matching, or array position. Graph indexes may be cached, but they must be reproducible from canonical course JSON.

## 3. Finding model

```json
{
  "id": "finding-instance-id",
  "rule_id": "a11y.image.alt.missing",
  "rule_version": 1,
  "severity": "error",
  "category": "accessibility",
  "message": "This image has no alternative text.",
  "why": "Learners using screen readers may not receive the information conveyed by the image.",
  "location": {
    "page_id": "page-2",
    "block_id": "block-8",
    "field": "alt"
  },
  "fix": {
    "type": "navigate",
    "label": "Add alternative text"
  },
  "suppressible": true,
  "fingerprint": "stable-fingerprint"
}
```

### 3.1 Finding evidence and confidence

Findings distinguish verified defects from contextual recommendations. Each finding should record:

- `confidence`: certain, high, moderate, or low;
- `basis`: schema, graph, computed, metadata, text heuristic, external validator, or optional AI suggestion;
- affected object IDs and field paths;
- evidence used to produce the finding;
- whether human judgment is required;
- active Analyzer profile and rule-pack version.

A rule must not present a heuristic instructional recommendation as a proven defect.

## 4. Severity

| Severity | Meaning | Default publish behavior |
|---|---|---|
| Error | Invalid, broken, inaccessible, or unsafe output | Block publish |
| Warning | Likely defect or significant risk | Allow with confirmation/policy |
| Suggestion | Quality improvement with context | Allow |
| Info | Inventory, complexity, or observation | Allow |

Some deployments may define stricter policies.

## 5. Rule contract

```ts
interface AnalyzerRule {
  id: string;
  version: number;
  category: AnalyzerCategory;
  defaultSeverity: Severity;
  scope: "course" | "page" | "block" | "asset" | "trigger";
  evaluate(context: AnalyzerContext): AnalyzerFinding[];
}
```

Rules must be:

- deterministic;
- side-effect free;
- versioned;
- independently testable;
- explicit about false-positive risk;
- localized;
- able to return stable fingerprints;
- efficient enough for incremental evaluation where appropriate.

## 6. Rule categories

### 6.1 Structural validity

- Duplicate object IDs
- Missing page referenced by navigation
- Block type is unknown
- Block data fails schema
- Required course metadata missing
- Invalid language code
- Invalid theme token
- Empty page
- Nested block exceeds supported depth
- Required plugin unavailable
- Course schema version unsupported

### 6.2 Accessibility

- Informative image missing alt text
- Decorative image not marked decorative
- Alt text duplicates filename
- Alt text contains placeholder text
- Video missing captions
- Audio missing transcript
- Caption track language missing
- Heading level skips
- Page has no primary heading
- Link text is ambiguous (“click here,” raw URL)
- Link has no accessible name
- Table missing header cells
- Complex table lacks description
- Form control lacks label
- Feedback depends only on color
- Interaction lacks keyboard instructions where needed
- Auto-advance may move focus unexpectedly
- Timed content has no extension or pause
- Contrast token combination below target
- Embedded content lacks title
- PDF resource lacks accessible alternative metadata
- Motion-heavy block lacks reduced-motion behavior

### 6.3 Trigger and logic

- Trigger references missing object
- Condition references missing variable
- Action uses incompatible variable type
- Trigger has no event
- Trigger has no action
- Trigger can target itself recursively
- Definite trigger cycle
- Possible repeated execution loop
- Contradictory actions on the same event
- Show and hide same block in one execution group
- Navigation actions conflict
- Trigger is unreachable
- Event is not supported by source block
- Action is not supported by target block
- Condition is always true
- Condition is always false
- Variable is read but never assigned
- Variable is assigned but never read
- Page is locked with no reachable unlock path
- Continue condition cannot be satisfied
- Branch target is deleted or disabled
- Score comparison exceeds possible score
- Text variable compared numerically
- Trigger order changes outcome
- Hidden block contains required completion event
- Auto-advance can bypass required content

### 6.4 Content quality

- Placeholder text remains
- Empty accordion, tab, carousel, or scenario
- Duplicate page title
- Duplicate objective text
- Very long unbroken paragraph
- Excessive heading length
- Resource has no descriptive label
- Image appears to contain essential text without description
- Repeated content across pages
- Glossary term has no definition
- Feedback is identical for correct and incorrect responses
- Question has no correct answer
- Multiple-choice item has only one option
- Distractors are exact duplicates
- Assessment has no feedback
- Required field is blank
- Page title is generic or default
- Course description is missing
- Contact utility is enabled but incomplete
- External link uses insecure protocol

### 6.5 Instructional design suggestions

These rules should be phrased cautiously.

- Objective is not linked to any content or assessment
- Assessment item is not linked to an objective
- Objective uses a non-observable verb
- Long sequence contains no learner interaction
- Course has no retrieval practice
- Course has no summary or closure
- Concept is introduced but never practiced
- Practice occurs before supporting content
- High-stakes assessment has no feedback
- Scenario choice has no consequence or explanation
- Reflection is requested but no prompt context is provided
- Page presents many concepts without segmentation
- Course relies heavily on passive media
- Knowledge checks cluster only at the end
- Remediation exists but no branch reaches it
- Learner choice is presented but does not affect experience
- Objective count appears disproportionate to course size
- Assessment coverage is uneven across objectives

### 6.6 Learning alignment

- Objective has no supporting instruction
- Objective has no meaningful practice
- Objective has no assessment
- Objective has no feedback or remediation where required
- Content has no declared objective or instructional purpose
- Assessment item maps to no objective
- Assessment tests content not taught or practiced
- Objective is substantially over-assessed or under-assessed
- Performance-oriented objective is measured only through recall
- Transfer-oriented objective has no application or transfer activity
- Mapping references a missing object
- Mapping relationship conflicts with the target object's instructional role

### 6.7 Assessment quality

- Missing keyed answer or inconsistent scoring
- Single-select interaction has multiple acceptable answers
- Multiple-select interaction does not define partial-credit behavior
- Duplicate or substantially overlapping options
- Correct answer is a conspicuous length or grammar outlier
- Distractor has no rationale or is implausible by configuration
- Feedback only states correct or incorrect
- Assessment type does not match the mapped objective
- Summative assessment appears before relevant instruction or practice
- Repeated item or option text may expose an answer elsewhere

### 6.8 Learning design and transfer

- Long passive sequence has no retrieval, application, or reflection opportunity
- Scenario decision has no consequence or explanatory feedback
- Practice is absent before a high-stakes assessment
- Remediation is unavailable after repeated failure
- Reflection is collected but never revisited or applied
- Course claims behavior or performance change but contains only knowledge checks
- Transfer activity is missing for a declared workplace or real-world outcome

These are contextual recommendations. Profiles may adjust thresholds, and authors may suppress findings with justification.

### 6.9 Mobile and responsive behavior

- Table exceeds recommended column count
- Label likely overflows narrow control
- Two-column content contains unsuitable wide media
- Interaction requires hover
- Fixed-width embed exceeds viewport
- Image has no responsive variant
- Long unbreakable string
- Excessive nested layout depth
- Tap target likely too small
- Modal content has excessive minimum width
- Horizontal interaction lacks accessible alternative
- Mobile page estimated to be excessively long
- Utility item count exceeds mobile drawer guidance

### 6.10 Media and asset management

- Asset file missing
- Duplicate asset hash
- Asset is unused
- Very large image without optimized variant
- Video bitrate or dimensions exceed guidance
- Transcript exists but is empty
- Caption file cannot be parsed
- Poster frame missing
- Asset license missing for community content
- Attribution required but absent
- Asset filename is opaque
- Unsupported MIME type
- External media host not allowlisted
- Audio autoplay configured
- More than one simultaneous media source possible

### 6.11 Publishing and export

- No content included in PDF
- Interactive block lacks PDF fallback
- Word export omits required content
- SCORM completion rule is unsatisfiable
- SCORM suspend data estimate exceeds budget
- Course title invalid for manifest
- Resource path collision
- Filename contains unsafe characters
- Package contains orphaned large assets
- External dependency prevents offline standalone use
- Dynamic delivery URL missing or invalid
- Publish snapshot differs from saved revision
- Required accessibility error unresolved
- Unknown plugin renderer in target output

### 6.12 Performance

- Course package exceeds configured threshold
- Page contains too many heavy blocks
- Too many images loaded eagerly
- Excessive trigger count on a single event
- Very deep trigger dependency chain
- Large inline data payload
- Too many caption tracks bundled
- Duplicate binary assets
- Video lacks streaming or optimization variant
- Course JSON exceeds warning threshold
- Excessive revision history embedded in export
- Large nested interaction likely to affect editor performance

### 6.13 Translation and localization

- Source string changed after translation
- Translation missing
- Translation is empty
- Translation references missing object
- Nested item lacks stable ID
- Locale uses unsupported font pairing
- Text expansion likely to overflow constrained control
- Directionality unsupported by block
- Caption language does not match course locale
- Localized asset missing
- Variable-driven text contains untranslated branch
- Hard-coded player string detected in plugin metadata

### 6.14 Maintenance

- Unused variable
- Unused trigger
- Unused asset
- Orphaned translation
- Deprecated block version
- Plugin update requires migration
- Duplicate reusable object
- Linked reusable object has update available
- Course contains unresolved legacy field
- Page has unusually high reference count
- Object has generic auto-label despite many similar items
- Broken link
- Link has redirected repeatedly
- Last published version is substantially behind draft
- Suppressed finding no longer matches an object
- Course uses feature scheduled for deprecation

## 7. Analyzer profiles and rule packs

Rules are grouped into composable, versioned profiles. A course or organization may enable several profiles simultaneously.

Initial profiles may include:

- structural integrity;
- accessibility;
- learning alignment;
- assessment quality;
- scenario-based learning;
- retrieval practice;
- maintenance;
- publishing;
- organization-specific standards.

Starter packs may recommend profiles, but they must not require domain-specific core schema. Profiles configure analysis behavior; they do not mutate course content.

## 8. Analyzer snapshots and reproducibility

A stored Analyzer snapshot identifies:

- course revision;
- Analyzer engine version;
- enabled profile and rule-pack versions;
- findings and suppressions;
- execution timestamp;
- optional publish decision.

Published outputs may record the snapshot used during validation. Re-running the same deterministic rules against the same normalized revision must produce equivalent findings.

## 9. Quality score

A single score can help orientation but must not hide details.

Recommended model:

- show category scores separately;
- errors cap the overall status;
- disclose calculation;
- avoid presenting suggestions as objective truth;
- permit institutional rule profiles;
- preserve historical scores by rule-set version.

Example categories:

- Validity
- Accessibility
- Logic
- Maintainability
- Mobile
- Media
- Publishing
- Instructional structure

Status labels may be more useful than an exact percentage:

- Blocked
- Needs attention
- Healthy
- Strong

## 10. Incremental analysis

During editing, run local rules for the changed object immediately. Recompute course-wide graphs using a debounced or worker-based process.

Suggested modes:

- inline field validation;
- page scan;
- full course scan;
- pre-publish scan;
- CI/headless scan.

## 11. User experience

The Analyzer panel should support:

- filter by severity and category;
- group by page or rule;
- jump to object;
- one-click deterministic fixes where safe;
- mark reviewed;
- suppress with reason;
- restore suppressed findings;
- export report;
- compare to last publish;
- explain rule;
- show affected references.

Do not overwhelm first-time authors with every suggestion. Errors and high-confidence warnings should appear first.

## 12. Safe automatic fixes

Examples:

- generate missing stable ID;
- remove orphaned reference;
- convert raw URL label to domain label with confirmation;
- optimize duplicate asset reference;
- create transcript placeholder;
- normalize heading level where unambiguous;
- rename duplicate auto-generated labels;
- detach impossible trigger target.

Automatic fixes must be previewable and undoable.

## 13. Suppression

A finding may be suppressed only when:

- the rule permits suppression;
- the author supplies a reason;
- the suppression is tied to a stable fingerprint;
- the suppressed result remains visible in reports;
- schema or rule changes can invalidate the suppression.

Errors involving invalid schema, missing required runtime code, or unsafe output may be non-suppressible.

## 14. Headless interface

A CLI or service should support:

```bash
mnemonify analyze course.json --profile default --format json
```

Outputs:

- human-readable summary;
- JSON findings;
- SARIF or equivalent CI format later;
- nonzero exit code according to policy.

## 15. Governance

Rule changes can alter publish outcomes. Therefore:

- rules are versioned;
- release notes identify new blocking rules;
- profiles pin rule-set versions where necessary;
- controversial instructional suggestions remain non-blocking;
- accessibility rules cite the relevant standard internally;
- plugin rules identify their owner;
- false-positive reporting is supported.

## 16. Delivery phases

### Phase 1: foundation

- finding model;
- schema and reference errors;
- basic accessibility checks;
- basic asset checks;
- pre-publish report.

### Phase 2: graph analysis

- dependency index;
- unused objects;
- trigger references;
- cycles and unreachable paths;
- safe delete integration.

### Phase 3: quality and maintenance

- mobile heuristics;
- instructional suggestions;
- complexity indicators;
- version comparison;
- report export.

### Phase 4: ecosystem

- plugin rules;
- institutional profiles;
- CI tooling;
- community rule packs;
- optional AI explanations that do not affect findings.
