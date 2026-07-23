function plainDefinition(definition) {
  return (definition?.rich_text || []).map((segment) => segment.v || '').join('').replace(/<[^>]+>/g, '');
}

export function filterGlossaryTerms(terms = [], query = '') {
  const needle = String(query || '').trim().toLocaleLowerCase();
  if (!needle) return terms;
  return terms.filter((term) => `${term.term} ${plainDefinition(term.definition)}`.toLocaleLowerCase().includes(needle));
}
