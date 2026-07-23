import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GlossaryPayload from './GlossaryPayload.jsx';
import { filterGlossaryTerms } from './glossary.js';
import { GlossaryLink } from '../blocks/RichText.jsx';

const terms = [
  { term_id: 'term_one', term: 'Anemia', definition: { rich_text: [{ t: 'text', v: 'Low red-cell mass.' }] } },
  { term_id: 'term_two', term: 'Biopsy', definition: { rich_text: [{ t: 'text', v: 'A tissue sample.' }] } },
];

describe('learner glossary', () => {
  it('filters by term and definition text', () => {
    expect(filterGlossaryTerms(terms, 'tissue').map((term) => term.term_id)).toEqual(['term_two']);
  });

  it('renders a searchable full glossary panel', () => {
    const html = renderToStaticMarkup(<GlossaryPayload payload={{ terms }} />);
    expect(html).toContain('Glossary');
    expect(html).toContain('role="searchbox"');
    expect(html).toContain('Anemia');
    expect(html).toContain('Low red-cell mass.');
  });

  it('renders accepted terms as keyboard-focusable links with definition preview metadata', () => {
    const html = renderToStaticMarkup(
      <GlossaryLink
        segment={{ t: 'glossary_link', term_id: 'term_one', v: 'anemia' }}
        glossaryTerm={terms[0]}
        onOpenGlossary={() => {}}
      />
    );
    expect(html).toContain('class="glossary-link"');
    expect(html).toContain('aria-label="anemia: Low red-cell mass."');
    expect(html).toContain('anemia');
  });
});
