function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeGlossaryTerm(term) {
  return String(term || '').trim().toLocaleLowerCase();
}

export function effectiveGlossaryTerms({ libraryTerms = [], courseTerms = [] } = {}) {
  const byText = new Map();
  libraryTerms.forEach((term) => {
    const key = normalizeGlossaryTerm(term.term);
    if (key) byText.set(key, { ...clone(term), source: term.source || 'library' });
  });
  courseTerms.forEach((term) => {
    const key = normalizeGlossaryTerm(term.term);
    if (key) byText.set(key, { ...clone(term), source: 'course' });
  });
  return [...byText.values()];
}

function isTermBoundary(character) {
  return !character || !/[A-Za-z0-9_]/.test(character);
}

function findTermRanges(text, term) {
  const source = String(text || '');
  const needle = String(term || '');
  if (!source || !needle) return [];
  const lowerSource = source.toLocaleLowerCase();
  const lowerNeedle = needle.toLocaleLowerCase();
  const ranges = [];
  let offset = 0;
  while (offset < lowerSource.length) {
    const start = lowerSource.indexOf(lowerNeedle, offset);
    if (start < 0) break;
    const end = start + needle.length;
    if (isTermBoundary(source[start - 1]) && isTermBoundary(source[end])) ranges.push({ start, end, text: source.slice(start, end) });
    offset = end;
  }
  return ranges;
}

function displayText(segment) {
  if (!segment || !['text', 'html'].includes(segment.t)) return '';
  if (segment.t === 'html' && /<[^>]+>/.test(segment.v || '')) return '';
  return String(segment.v || '');
}

function locationLabel(path, node) {
  const pageIndex = path.indexOf('pages');
  const blockIndex = path.indexOf('blocks');
  const page = pageIndex >= 0 ? Number(path[pageIndex + 1]) + 1 : null;
  const block = blockIndex >= 0 ? node.block_id || `Block ${Number(path[blockIndex + 1]) + 1}` : 'Course text';
  return page ? `Page ${page} · ${block}` : block;
}

export function findGlossarySuggestions(courseJson, { libraryTerms = [] } = {}) {
  const terms = effectiveGlossaryTerms({ libraryTerms, courseTerms: courseJson?.glossary_terms || [] })
    .sort((a, b) => String(b.term).length - String(a.term).length);
  const suggestions = [];

  function inspectRichText(richText, path, owner) {
    richText.forEach((segment, segmentIndex) => {
      if (segment.t === 'glossary_link' || !displayText(segment)) return;
      terms.forEach((term) => {
        findTermRanges(segment.v, term.term).forEach((range) => {
          suggestions.push({
            suggestion_id: `${path.join('.')}:${segmentIndex}:${range.start}:${term.term_id}`,
            path,
            segment_index: segmentIndex,
            match_start: range.start,
            match_end: range.end,
            matched_text: range.text,
            term_id: term.term_id,
            term: term.term,
            definition: clone(term.definition),
            location: locationLabel(path, owner),
          });
        });
      });
    });
  }

  function walk(node, path = [], owner = node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, index], owner));
      return;
    }
    if (path[0] === 'glossary_terms') return;
    if (Array.isArray(node.rich_text)) inspectRichText(node.rich_text, [...path, 'rich_text'], owner);
    const nextOwner = node.block_id ? node : owner;
    Object.entries(node).forEach(([key, value]) => {
      if (key === 'rich_text' || key === 'definition') return;
      walk(value, [...path, key], nextOwner);
    });
  }

  walk(courseJson);
  return suggestions;
}

function valueAtPath(root, path) {
  return path.reduce((value, key) => value?.[key], root);
}

export function applyGlossarySuggestion(courseJson, suggestion) {
  const richText = valueAtPath(courseJson, suggestion.path);
  const segment = richText?.[suggestion.segment_index];
  if (!Array.isArray(richText) || !segment || !displayText(segment)) return clone(courseJson);
  const source = String(segment.v || '');
  if (source.slice(suggestion.match_start, suggestion.match_end).toLocaleLowerCase() !== String(suggestion.matched_text).toLocaleLowerCase()) return clone(courseJson);
  const before = source.slice(0, suggestion.match_start);
  const after = source.slice(suggestion.match_end);
  const replacement = [
    ...(before ? [{ t: segment.t, v: before }] : []),
    { t: 'glossary_link', term_id: suggestion.term_id, v: suggestion.matched_text },
    ...(after ? [{ t: segment.t, v: after }] : []),
  ];
  const next = clone(courseJson);
  const nextRichText = valueAtPath(next, suggestion.path);
  nextRichText.splice(suggestion.segment_index, 1, ...replacement);
  return next;
}
