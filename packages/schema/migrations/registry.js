import migration0001 from './0001-add-missing-stable-ids.js';
import migration0002 from './0002-add-scoring-settings.js';

// Ordered chain of course-document migrations. index.js walks this list
// by matching each step's fromVersion against the document's current
// schema_version -- order in this array doesn't itself matter (the
// matching is by fromVersion, not position), but keeping it in ascending
// version order makes the chain readable at a glance.
export default [migration0001, migration0002];
