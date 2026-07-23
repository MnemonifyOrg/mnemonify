import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryTerm, validateGlossaryName, validateGlossaryTerm } from './glossaries.js';

test('publishing a course term creates a stable library term payload without mutating the source definition', () => {
  const definition = { rich_text: [{ t: 'text', v: 'A definition.' }] };
  const result = createLibraryTerm({ glossaryId: 'glo_one', term: '  Anemia ', definition, termId: 'term_library', createdBy: 'user_one' });
  assert.deepEqual(result, {
    term_id: 'term_library', glossary_id: 'glo_one', term: 'Anemia', normalized_term: 'anemia', definition, created_by: 'user_one',
  });
  result.definition.rich_text[0].v = 'Changed copy';
  assert.equal(definition.rich_text[0].v, 'A definition.');
});

test('glossary names and terms reject empty values while accepting rich definitions', () => {
  assert.throws(() => validateGlossaryName(''), /required/);
  assert.equal(validateGlossaryName('  Pathology  '), 'Pathology');
  assert.throws(() => validateGlossaryTerm('Anemia', {}), /rich text/);
  assert.deepEqual(validateGlossaryTerm(' Anemia ', { rich_text: [] }).normalizedTerm, 'anemia');
});
