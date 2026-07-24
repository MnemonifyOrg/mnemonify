import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';

export const RAIL_ITEMS = Object.freeze([
  { id: 'course', label: 'Course' },
  { id: 'player', label: 'Player' },
  { id: 'variables', label: 'Variables' },
  { id: 'question-banks', label: 'Question Banks' },
  { id: 'objectives', label: 'Objectives' },
  { id: 'glossary', label: 'Glossary', flag: 'glossary' },
  { id: 'version-history', label: 'Version History', flag: 'versionHistory' },
]);

export function visibleRailItems(featureFlags = FEATURE_FLAGS) {
  return RAIL_ITEMS.filter((item) => !item.flag || featureFlags[item.flag]);
}

export function toggleRailDrawer(activeItem, nextItem) {
  return activeItem === nextItem ? null : nextItem;
}
