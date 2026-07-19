# Mnemonify Architecture and Product Handbook

This directory contains forward-looking product and architecture guidance for Mnemonify. It complements the repository's top-level specifications:

- `REQUIREMENTS.md` — product scope, priorities, user stories, and constraints
- `ARCHITECTURE.md` — current implementation architecture
- `DECISIONS.md` — implementation decisions and verified behavior
- `BRAND-GUIDE.md` — visual identity and design tokens

The files in this directory do not replace those sources. They provide contributor-facing principles, extension contracts, subsystem proposals, and phased recommendations.

## Reading order

1. `PRODUCT-VISION.md` — stable product identity, audience, and promise
2. `DESIGN-PRINCIPLES.md` — non-negotiable product and engineering principles
3. `ARCHITECTURE-AUDIT.md` — risks, gaps, and recommended architectural direction
4. `ARCHITECTURE.md` — system architecture and implementation boundaries
5. `DATA-MODEL.md` — canonical entities, identities, mappings, and derived indexes
6. `BLOCK-LIFECYCLE.md` — contract from registration through deprecation
7. `COURSE-ANALYZER.md` — deterministic analysis, learning alignment, findings, and profiles
8. `PLUGIN-ARCHITECTURE.md` — extension boundaries and capability model
9. `ROADMAP.md` — phased delivery and mid-flight reprioritization
10. `PRODUCT-OPPORTUNITIES.md` — forward-looking product opportunities and strategic options
11. `adr/` — accepted architectural decisions and their consequences

`PRODUCT-VISION.md` defines the durable direction. `PRODUCT-OPPORTUNITIES.md` is intentionally more exploratory and may change more frequently.

## Document status

| Document | Purpose | Status |
|---|---|---|
| `PRODUCT-VISION.md` | Product positioning and long-term direction | Proposed |
| `DESIGN-PRINCIPLES.md` | Rules for product and engineering decisions | Proposed |
| `ARCHITECTURE-AUDIT.md` | Independent assessment and recommendations | Review draft |
| `DATA-MODEL.md` | Conceptual ownership and reference model | Proposed |
| `BLOCK-LIFECYCLE.md` | Contract for every block type | Proposed |
| `PLUGIN-ARCHITECTURE.md` | Community extension model | Proposed |
| `COURSE-ANALYZER.md` | Deterministic course-quality subsystem | Proposed |
| `ROADMAP.md` | Capability sequencing and architectural gates | Proposed |
| `adr/` | Durable records of major decisions | Initial set |

## Documentation conventions

- **MUST** indicates a requirement.
- **SHOULD** indicates the preferred default unless a documented exception exists.
- **MAY** indicates an optional capability.
- “Course document” means the canonical Mnemonify course JSON.
- “Player” means the learner-facing runtime.
- “Editor” means the authoring application.
- “Block” means a typed content or interaction unit within a page.
- “Plugin” means an independently registered package that extends Mnemonify through a supported contract.

## Change process

Material architectural changes should update:

1. the relevant specification or handbook document;
2. an ADR when the decision is durable or difficult to reverse;
3. migration logic when persisted course data changes;
4. validation and Course Analyzer rules when author-facing behavior changes;
5. tests for editor, player, export, accessibility, and migration behavior.

## Added learning-engineering ADRs

- `adr/ADR-0007-derived-learning-alignment-graph.md`
- `adr/ADR-0008-versioned-analyzer-rules-findings.md`
- `adr/ADR-0009-starter-packs-canonical-course-data.md`
- `adr/ADR-0010-domain-specialization-data-before-schema.md`
