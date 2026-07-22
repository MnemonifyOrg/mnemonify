// Phase 5.5 Part 2: add the course-level question-bank collection. The new
// draw block and variable rich-text segment are additive schema capabilities;
// old documents only need an empty collection to satisfy the v4 contract.
export default {
  id: '0003-add-question-banks',
  fromVersion: 3,
  toVersion: 4,
  migrate(document) {
    return {
      document: {
        ...document,
        schema_version: 4,
        question_banks: Array.isArray(document.question_banks) ? document.question_banks : [],
      },
      diagnostics: {
        questionBanksAdded: Array.isArray(document.question_banks) ? 0 : 1,
      },
    };
  },
};
