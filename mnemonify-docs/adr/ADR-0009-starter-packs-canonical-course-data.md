# ADR-0009: Starter Packs Instantiate Canonical Course Data

**Status:** Accepted

## Context

Mnemonify's WordPress-for-learning strategy requires templates and domain starter packs without fragmenting the runtime or making courses dependent on proprietary pack code.

## Decision

Starter packs are data-first packages containing templates, recipes, predefined logic, Analyzer profile recommendations, embed presets, import mappings, sample assets, and author guidance. Instantiation produces ordinary canonical course JSON.

Removing or updating a starter pack must not prevent existing courses from opening, editing, playing, or exporting.

## Consequences

- Domain packs remain portable and editable.
- Community contributions do not automatically expand the executable plugin surface.
- Pack updates require explicit conflict and provenance handling for linked resources.
- New executable behavior still requires a governed plugin contract.
