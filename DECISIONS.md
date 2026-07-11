# Decisions Log
Running record of architectural choices made and why.
Format: Date | Decision | Reason
---

2026-07-11 | Defined concrete `content` JSON shapes for the heading, image, list, tabs, and knowledge-check block types (heading: `{text, level}`; image: `{asset_id}`; list: `{style, items[]}`; tabs: `{items: [{label, body_blocks}]}`; knowledge-check: `{question, options: [{id, text, correct}]}`). ARCHITECTURE.md Section 3.3 only shows worked examples for `text` and `accordion`. | Phase 1 required a hand-written sample course and a schema that validates it, which meant these shapes had to be decided somewhere. Documented here so the schema, player, and future editor/trigger-builder stay consistent with the same content model.

2026-07-11 | Phase 1 trigger engine (`packages/player/src/engine/triggerEngine.js`) fully implements only `SET_VAR` and `ADJUST_VAR`. The other actions in the documented vocabulary (`SHOW_BLOCK`, `HIDE_BLOCK`, `ENABLE_BLOCK`, `DISABLE_BLOCK`, `JUMP_TO_PAGE`, `OPEN_LIGHTBOX`, `SET_STATE`, `SCORM_COMPLETE`, `SCORM_SET_SCORE`) are valid per the schema but log a "not implemented" warning if fired. | Matches REQUIREMENTS.md Section 10 Phase 1 scope: the sample course only exercises an `onOpen` → `SET_VAR` trigger, and the full trigger builder UI/behavior (block visibility, page navigation, lightbox, SCORM reporting) belongs to later phases. Avoids building interaction behavior ahead of the phase that owns it.
