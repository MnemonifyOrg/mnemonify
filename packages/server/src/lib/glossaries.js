import crypto from 'node:crypto';
import { normalizeGlossaryTerm } from '@mnemonify/schema/glossary.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function validateGlossaryName(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  if (!value) throw new Error('Glossary name is required.');
  if (value.length > 120) throw new Error('Glossary name must be 120 characters or fewer.');
  return value;
}

export function validateGlossaryTerm(term, definition) {
  const value = typeof term === 'string' ? term.trim() : '';
  if (!value) throw new Error('Glossary term is required.');
  if (value.length > 160) throw new Error('Glossary term must be 160 characters or fewer.');
  if (!definition || !Array.isArray(definition.rich_text)) throw new Error('Glossary definition must be rich text.');
  return { term: value, definition: clone(definition), normalizedTerm: normalizeGlossaryTerm(value) };
}

export function createLibraryTerm({ glossaryId, term, definition, termId = `term_lib_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`, createdBy }) {
  const validated = validateGlossaryTerm(term, definition);
  return {
    term_id: termId,
    glossary_id: glossaryId,
    term: validated.term,
    normalized_term: validated.normalizedTerm,
    definition: validated.definition,
    created_by: createdBy,
  };
}
