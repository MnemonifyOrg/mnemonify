import { useMemo, useState } from 'react';
import { effectiveGlossaryTerms, findGlossarySuggestions } from '@mnemonify/schema/glossary.js';
import { genGlossaryTermId } from '../lib/idGen.js';

function definitionText(definition) {
  return (definition?.rich_text || []).map((segment) => segment.v || '').join('');
}

function newTerm() {
  return {
    term_id: genGlossaryTermId(),
    term: '',
    definition: { rich_text: [{ t: 'text', v: '' }] },
    source: 'course',
    shared_library_term_id: null,
  };
}

export default function GlossaryPanel({
  courseJson,
  meta,
  libraryGlossaries = [],
  libraryTerms = [],
  onChangeMeta,
  onChangeTerms,
  onCreateGlossary,
  onPublishTerm,
  onApplySuggestion,
}) {
  const [rejectedSuggestions, setRejectedSuggestions] = useState(() => new Set());
  const [newGlossaryName, setNewGlossaryName] = useState('');
  const [creatingGlossary, setCreatingGlossary] = useState(false);
  const [publishingTermId, setPublishingTermId] = useState(null);
  const courseTerms = courseJson.glossary_terms || [];
  const suggestions = useMemo(
    () => findGlossarySuggestions(courseJson, { libraryTerms }).filter((suggestion) => !rejectedSuggestions.has(suggestion.suggestion_id)),
    [courseJson, libraryTerms, rejectedSuggestions]
  );
  const effectiveTerms = useMemo(() => effectiveGlossaryTerms({ libraryTerms, courseTerms: courseJson.glossary_terms || [] }), [libraryTerms, courseJson.glossary_terms]);

  function updateTerm(termId, patch) {
    onChangeTerms(courseTerms.map((term) => (term.term_id === termId ? { ...term, ...patch } : term)));
  }

  function addTerm() {
    onChangeTerms([...courseTerms, newTerm()]);
  }

  function removeTerm(termId) {
    const term = courseTerms.find((candidate) => candidate.term_id === termId);
    if (!term || !window.confirm(`Delete glossary term “${term.term || 'this term'}”? Existing accepted links will remain but may become unresolved.`)) return;
    onChangeTerms(courseTerms.filter((candidate) => candidate.term_id !== termId));
  }

  async function createGlossary(event) {
    event.preventDefault();
    const name = newGlossaryName.trim();
    if (!name) return;
    setCreatingGlossary(true);
    try {
      const glossary = await onCreateGlossary(name);
      onChangeMeta({ ...meta, glossary_id: glossary.glossary_id });
      setNewGlossaryName('');
    } finally {
      setCreatingGlossary(false);
    }
  }

  async function publishTerm(term) {
    if (!meta.glossary_id) return;
    setPublishingTermId(term.term_id);
    try {
      await onPublishTerm(term);
    } finally {
      setPublishingTermId(null);
    }
  }

  function acceptSuggestion(suggestion) {
    onApplySuggestion(suggestion);
    setRejectedSuggestions((current) => new Set([...current, suggestion.suggestion_id]));
  }

  return (
    <div className="settings-panel__section glossary-panel">
      <h3>Glossary</h3>
      <p className="settings-panel__hint">Attach one shared glossary, add course-specific terms, and review suggested links before they appear in course text.</p>

      <label htmlFor="attached-glossary">Attached library glossary</label>
      <select
        id="attached-glossary"
        className="input"
        value={meta.glossary_id || ''}
        onChange={(event) => onChangeMeta({ ...meta, glossary_id: event.target.value || undefined })}
      >
        <option value="">No glossary attached</option>
        {libraryGlossaries.map((glossary) => <option key={glossary.glossary_id} value={glossary.glossary_id}>{glossary.name} ({glossary.term_count || 0} terms)</option>)}
      </select>

      <form className="glossary-panel__create" onSubmit={createGlossary}>
        <label htmlFor="new-glossary-name">Create shared glossary</label>
        <div className="glossary-panel__create-row">
          <input id="new-glossary-name" className="input" value={newGlossaryName} onChange={(event) => setNewGlossaryName(event.target.value)} placeholder="e.g. Pathology terms" />
          <button type="submit" className="btn" disabled={creatingGlossary || !newGlossaryName.trim()}>Create</button>
        </div>
      </form>

      <div className="glossary-panel__section-header">
        <h4>Course-specific terms</h4>
        <button type="button" className="btn" onClick={addTerm}>+ Add term</button>
      </div>
      {courseTerms.length === 0 ? <p className="settings-panel__empty">No course-specific terms yet.</p> : (
        <div className="glossary-panel__terms">
          {courseTerms.map((term) => (
            <div className="glossary-panel__term card" key={term.term_id}>
              <label htmlFor={`glossary-term-${term.term_id}`}>Term</label>
              <input id={`glossary-term-${term.term_id}`} className="input" value={term.term || ''} onChange={(event) => updateTerm(term.term_id, { term: event.target.value })} placeholder="e.g. del(5q)" />
              <label htmlFor={`glossary-definition-${term.term_id}`}>Definition</label>
              <textarea id={`glossary-definition-${term.term_id}`} className="input" rows={3} value={definitionText(term.definition)} onChange={(event) => updateTerm(term.term_id, { definition: { rich_text: [{ t: 'text', v: event.target.value }] } })} placeholder="Explain the term." />
              <div className="glossary-panel__term-actions">
                {term.shared_library_term_id ? <span className="badge">Shared to library</span> : <button type="button" className="btn" disabled={!meta.glossary_id || !term.term.trim() || publishingTermId === term.term_id} onClick={() => publishTerm(term)}>Publish to library</button>}
                <button type="button" className="btn-text settings-panel__danger-action" onClick={() => removeTerm(term.term_id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glossary-panel__section-header">
        <h4>Suggested links</h4>
        <span className="settings-panel__hint">{suggestions.length} awaiting review · {effectiveTerms.length} effective terms</span>
      </div>
      {suggestions.length === 0 ? <p className="settings-panel__empty">No unreviewed glossary matches found.</p> : (
        <ul className="glossary-panel__suggestions">
          {suggestions.map((suggestion) => (
            <li key={suggestion.suggestion_id} className="glossary-panel__suggestion">
              <div><strong>{suggestion.matched_text}</strong> · {suggestion.location}<p className="settings-panel__hint">{definitionText(suggestion.definition)}</p></div>
              <div className="glossary-panel__suggestion-actions"><button type="button" className="btn btn-primary" onClick={() => acceptSuggestion(suggestion)}>Accept link</button><button type="button" className="btn-text" onClick={() => setRejectedSuggestions((current) => new Set([...current, suggestion.suggestion_id]))}>Reject</button></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
