import { BLOCK_REGISTRY } from '@mnemonify/schema/block-registry.js';

// Backward-compatible export for the picker tests/consumers. The actual
// icon data now lives in the central registry and is only projected here.
export const BLOCK_ICON_PATHS = Object.fromEntries(
  Object.values(BLOCK_REGISTRY).map((definition) => [definition.type, definition.iconPaths])
);

export function filterBlockDefinitions(grouped, query) {
  const needle = query.trim().toLowerCase();
  return Object.entries(grouped).reduce((filtered, [category, definitions]) => {
    const matches = needle
      ? definitions.filter((definition) => definition.displayName.toLowerCase().includes(needle))
      : definitions;
    if (matches.length > 0) filtered[category] = matches;
    return filtered;
  }, {});
}

export function firstMatchingBlockType(grouped, query) {
  const filtered = filterBlockDefinitions(grouped, query);
  return Object.values(filtered)[0]?.[0]?.type || null;
}
