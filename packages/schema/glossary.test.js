import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCourse } from './index.js';
import { applyGlossarySuggestion, effectiveGlossaryTerms, findGlossarySuggestions } from './glossary.js';

function course(overrides = {}) {
  const { meta: metaOverride, ...rest } = overrides;
  return {
    schema_version: 5,
    meta: { course_id: 'crs_glossary', title: 'Glossary', theme: { accent: '#0f766e' }, ...metaOverride },
    variables: [], assets: [], question_banks: [], linked_entities: [],
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [{ block_id: 'blk_one', type: 'text', content: { rich_text: [{ t: 'text', v: 'A biopsy shows anemia.' }] } }] }],
    ...rest,
  };
}

test('schema accepts optional attachment, local terms, and accepted glossary links', () => {
  const result = validateCourse(course({
    meta: { glossary_id: 'glo_pathology' },
    glossary_terms: [{ term_id: 'term_local', term: 'anemia', definition: { rich_text: [{ t: 'text', v: 'Low red-cell mass.' }] }, source: 'course', shared_library_term_id: null }],
    pages: [{ page_id: 'pg_one', title: 'One', blocks: [{ block_id: 'blk_one', type: 'text', content: { rich_text: [{ t: 'glossary_link', term_id: 'term_local', v: 'anemia' }] } }] }],
  }));
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('course terms override an attached library term with the same normalized text', () => {
  const terms = effectiveGlossaryTerms({
    libraryTerms: [{ term_id: 'library', term: 'Anemia', definition: { rich_text: [{ t: 'text', v: 'Library' }] } }],
    courseTerms: [{ term_id: 'local', term: ' anemia ', definition: { rich_text: [{ t: 'text', v: 'Local' }] } }],
  });
  assert.deepEqual(terms.map((term) => term.term_id), ['local']);
});

test('detection suggests matches without changing authored text, and confirmation creates a stable link', () => {
  const original = course({ glossary_terms: [{ term_id: 'term_anemia', term: 'anemia', definition: { rich_text: [{ t: 'text', v: 'Low red-cell mass.' }] }, source: 'course' }] });
  const suggestions = findGlossarySuggestions(original);
  assert.equal(suggestions.length, 1);
  assert.equal(original.pages[0].blocks[0].content.rich_text[0].t, 'text');
  const linked = applyGlossarySuggestion(original, suggestions[0]);
  assert.deepEqual(linked.pages[0].blocks[0].content.rich_text, [
    { t: 'text', v: 'A biopsy shows ' },
    { t: 'glossary_link', term_id: 'term_anemia', v: 'anemia' },
    { t: 'text', v: '.' },
  ]);
});

test('courses without glossary data produce no suggestions and remain unchanged', () => {
  const original = course();
  assert.deepEqual(findGlossarySuggestions(original), []);
  assert.deepEqual(effectiveGlossaryTerms({}), []);
});
