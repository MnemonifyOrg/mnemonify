// Phase 5.5 P1-74: introduce the canonical linked-entity collection. The
// collection is required in schema v5, but existing inline blocks and bank
// questions remain standalone and are not rewritten into entities.
export default {
  id: '0004-add-linked-entities',
  fromVersion: 4,
  toVersion: 5,
  migrate(document) {
    return {
      document: {
        ...document,
        schema_version: 5,
        linked_entities: Array.isArray(document.linked_entities) ? document.linked_entities : [],
      },
      diagnostics: {
        linkedEntitiesAdded: Array.isArray(document.linked_entities) ? 0 : 1,
      },
    };
  },
};
