# ADR-0007: Derived Learning-Alignment Graph

**Status:** Accepted

## Context

Mnemonify needs to analyze relationships among outcomes, objectives, instruction, practice, assessment, feedback, remediation, and transfer. Storing a separately authored graph would create a second source of truth and increase synchronization risk.

## Decision

The canonical course JSON stores stable learning objects and explicit mappings. A typed learning-alignment graph is derived from that document and may be cached for performance.

The graph uses stable IDs and may include technical dependencies such as triggers, branches, assets, and embeds. It is rebuildable and must not be edited independently.

## Consequences

- Analyzer rules can inspect course-wide alignment.
- Renaming or reordering objects does not break mappings.
- Caches may be discarded and rebuilt.
- Schema migrations must preserve stable identities.
- The graph does not prove learning effectiveness; it exposes observable structure and gaps.
