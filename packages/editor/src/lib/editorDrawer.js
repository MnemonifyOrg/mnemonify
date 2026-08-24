import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';

export const TOOL_GROUPS = Object.freeze([
  {
    id: 'course',
    label: 'Course',
    items: [{ id: 'course', label: 'Course settings' }],
  },
  {
    id: 'learner-experience',
    label: 'Learner Experience',
    items: [{ id: 'player', label: 'Player settings' }],
  },
  {
    id: 'advanced-tools',
    label: 'Advanced Tools',
    items: [
      { id: 'variables', label: 'Variables' },
      { id: 'objectives', label: 'Objectives' },
      { id: 'question-banks', label: 'Question Banks' },
      { id: 'glossary', label: 'Glossary', flag: 'glossary' },
    ],
  },
  {
    id: 'review-release',
    label: 'Review & Release',
    items: [
      { id: 'comments', label: 'Comments' },
      { id: 'course-health', label: 'Course Health' },
      { id: 'version-history', label: 'Version History', flag: 'versionHistory', requiresEdit: true },
      { id: 'publish-share', label: 'Publish & Share' },
    ],
  },
]);

export function visibleToolGroups(featureFlags = FEATURE_FLAGS, { canEdit = true } = {}) {
  return TOOL_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (!item.flag || featureFlags[item.flag]) && (!item.requiresEdit || canEdit)),
  })).filter((group) => group.items.length > 0);
}

export function findTool(toolId, featureFlags = FEATURE_FLAGS, options) {
  return visibleToolGroups(featureFlags, options).flatMap((group) => group.items).find((item) => item.id === toolId) || null;
}

export function toggleTool(activeItem, nextItem) {
  return activeItem === nextItem ? null : nextItem;
}
