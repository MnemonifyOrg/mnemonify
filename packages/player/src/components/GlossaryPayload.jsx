import { useMemo, useState } from 'react';
import RichText from '../blocks/RichText.jsx';
import { filterGlossaryTerms } from './glossary.js';
import { FEATURE_FLAGS } from '@mnemonify/schema/featureFlags.js';

export default function GlossaryPayload({ payload, featureFlags = FEATURE_FLAGS }) {
  const [query, setQuery] = useState('');
  const terms = useMemo(() => filterGlossaryTerms(payload.terms || [], query), [payload.terms, query]);
  if (!featureFlags.glossary) return null;
  return (
    <div className="glossary-payload">
      <h2>Glossary</h2>
      <label htmlFor="player-glossary-search">Search glossary</label>
      <input id="player-glossary-search" className="input" type="search" role="searchbox" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search terms or definitions" autoFocus />
      {terms.length === 0 ? <p className="modal-payload__placeholder">No matching glossary terms.</p> : (
        <ul className="glossary-payload__list">
          {terms.map((term) => (
            <li key={term.term_id} className="glossary-payload__term">
              <strong>{term.term}</strong>
              <div><RichText value={term.definition} glossaryTerms={payload.terms || []} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
