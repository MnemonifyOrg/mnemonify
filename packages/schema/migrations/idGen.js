// Deliberately duplicated from packages/editor/src/lib/idGen.js rather
// than cross-imported -- packages/schema must stay dependency-free of the
// editor's module graph. Runtime/editor creation remains random; migrations
// use the deterministic helper below so the same historical document always
// receives the same IDs.
function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

function hash(input) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(36).padStart(7, '0').slice(0, 8);
}

export function stableId(prefix, seed, used = new Set()) {
  let suffix = hash(`${prefix}:${seed}`);
  let id = `${prefix}_${suffix}`;
  let attempt = 1;
  while (used.has(id)) {
    suffix = `${hash(`${prefix}:${seed}:${attempt}`)}`;
    id = `${prefix}_${suffix}`;
    attempt += 1;
  }
  used.add(id);
  return id;
}

// Retain the old exports for the v1->v2 migration's public shape. Passing a
// seed now makes them deterministic; omitting one preserves runtime-like
// generation for any legacy caller that still uses these helpers directly.
export const genItemId = (seed) => seed === undefined ? `itm_${shortId()}` : stableId('itm', seed);
export const genVariableId = (seed) => seed === undefined ? `var_${shortId()}` : stableId('var', seed);
