// Deliberately duplicated from packages/editor/src/lib/idGen.js rather
// than cross-imported -- same precedent as richText.js's cross-package
// duplication (DECISIONS.md 2026-07-12/2026-07-17): packages/schema must
// stay dependency-free of the editor's own module graph (the player and
// server also depend on packages/schema; neither should pull in editor
// code transitively), and this is three functions, not worth the coupling.
// Same output format as idGen.js's shortId() -- MUST stay in sync if that
// format ever changes, since ids from both must be visually and formally
// indistinguishable (DECISIONS.md, Phase 4.5a ID convention).
function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export const genItemId = () => `itm_${shortId()}`;
export const genVariableId = () => `var_${shortId()}`;
