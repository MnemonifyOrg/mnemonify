# Design Principles

These principles guide product, architecture, UX, and contributor decisions. A proposal that conflicts with them requires an explicit ADR.

## 1. The course document is canonical

Persisted course meaning lives in versioned JSON. Other stores may cache, index, render, or report on it, but they must not become competing semantic sources of truth.

## 2. The player renders; the editor authors

Published courses must not include editor dependencies or hidden authoring behavior. The player receives validated course data and executes a defined runtime contract.

## 3. Responsive behavior is enforced

Do not add pixel-positioned authoring. New layouts must define behavior for phone, tablet, desktop, zoom, reflow, and print.

## 4. Prefer composition over configuration

A small set of composable blocks, patterns, and recipes is preferable to blocks with dozens of special-case controls.

## 5. Prefer deterministic behavior over opaque behavior

Rules, validation, and runtime state must be reproducible and explainable. Identical inputs should produce identical outputs.

## 6. No embedded author scripting

Do not expose arbitrary JavaScript or a general-purpose programming language. Extend logic through typed variables, events, conditions, actions, and supported plugins.

## 7. Progressive disclosure protects simplicity

Basic tasks should require basic controls. Advanced logic should be available without dominating the default interface.

## 8. Author language beats implementation language

Use “When the learner completes the video” rather than “on media ended event.” Product terminology should reflect teaching intent.

## 9. Accessibility is part of the block contract

A block is incomplete until keyboard, focus, semantic, screen-reader, contrast, reduced-motion, media-alternative, and export behavior are defined and tested.

## 10. Mobile is not a secondary renderer

Phone behavior is a first-class acceptance target. A feature that works only on desktop is not complete.

## 11. Every reference must be inspectable

Variables, triggers, pages, blocks, assets, objectives, and reusable objects should expose “used by” information. Destructive changes should show impact.

## 12. Persist stable identity, derive presentation order

IDs survive reordering. Visible numbering and labels may be derived. Translations, triggers, and analytics must not depend on array position.

## 13. Schema changes require migrations

Changing persisted course data requires a version increment, migration, validation, fixtures, and release documentation.

## 14. Exports consume the same model

SCORM, standalone web, PDF, Word, review, and future targets should derive from the canonical course document and block registry.

## 15. Fallback behavior must be intentional

Interactive content needs explicit static, print, unsupported-browser, and accessibility fallbacks. Silent omission is not acceptable.

## 16. Make invalid states difficult to create

Use constrained controls, defaults, validation, and recipes. Do not rely exclusively on documentation or publish-time errors.

## 17. Errors explain recovery

Every author-facing error should state what happened, why it matters, where it occurred, and what action can resolve it.

## 18. Maintenance is a primary workflow

Optimize for updates, replacement, translation, versioning, reuse, and repair—not only first creation.

## 19. Security denies capability by default

Embeds, uploads, HTML, plugins, and integrations receive only declared permissions. Published courses must not execute arbitrary author code.

## 20. Collect the minimum learner data

Anonymous or hashed telemetry is preferred. Do not introduce named learner storage without explicit legal, policy, security, and product decisions.

## 21. AI is optional and downstream

Core authoring, validation, publishing, runtime behavior, and course portability must work without an AI provider.

## 22. Generated content becomes normal content

Recipes and optional AI may generate structures, but the result must be editable, valid course data—not an opaque special mode.

## 23. Community extensions follow platform contracts

A community plugin must declare compatibility, accessibility, security, migrations, export support, and maintenance status.

## 24. Avoid feature duplication

Before creating a new subsystem, determine whether an existing block, recipe, action, validator, or exporter can be extended cleanly.

## 25. Prefer explicit state ownership

Every state value should have one authoritative owner and defined reset, persistence, serialization, and preview behavior.

## 26. Preview should be reproducible

Authors must be able to reset learner state, replay behavior, and inspect trigger execution. Preview should not accumulate unexplained state.

## 27. Performance has budgets

Typing, page switching, preview, player load, and publish operations require measurable targets. Large-course behavior should be tested deliberately.

## 28. Brand constraints support product clarity

Use the approved Mnemonify identity, typography, tokens, and logo geometry. Theme flexibility should remain curated and accessible.

## 29. Documentation is part of the interface

Contributor-facing architecture, block contracts, migrations, ADRs, and examples should be sufficient for an outside contributor to understand the system.

## 30. Strategic restraint is a feature

Declining capabilities that compromise responsive design, simplicity, safety, or product focus is valid product work.
## 31. Instructional relationships are explicit

Objectives, instruction, practice, assessment, feedback, remediation, and transfer should be connected through stable, inspectable relationships rather than inferred only from proximity or text.

## 32. Analyzer recommendations preserve author judgment

The system distinguishes definite defects from contextual recommendations. Heuristic findings explain their basis and may be suppressed with justification.

## 33. Domain specialization prefers data over code

Use templates, recipes, Analyzer profiles, embed presets, and import mappings before creating domain-specific schemas or plugins.

## 34. Starter packs instantiate ordinary course data

Courses created from starter packs remain editable, portable, and functional without the originating pack.

## 35. Interaction is not evidence of learning

Do not treat interaction count, animation, novelty, or visual complexity as proof of instructional quality.

## 36. Analysis is reproducible

Analyzer findings used for review or publishing identify the course revision, engine version, and rule-pack versions that produced them.

