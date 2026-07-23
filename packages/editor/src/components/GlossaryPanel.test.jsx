import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import GlossaryPanel from './GlossaryPanel.jsx';

globalThis.React = React;

const courseJson = {
  glossary_terms: [{ term_id: 'term_local', term: 'Anemia', definition: { rich_text: [{ t: 'text', v: 'Low red-cell mass.' }] }, source: 'course', shared_library_term_id: null }],
  pages: [{ page_id: 'pg_one', blocks: [{ block_id: 'blk_one', type: 'text', content: { rich_text: [{ t: 'text', v: 'Anemia appears here.' }] } }] }],
};

describe('glossary authoring panel', () => {
  it('exposes attachment, local term editing, publishing, and suggestion review', () => {
    const html = renderToStaticMarkup(
      <GlossaryPanel
        courseJson={courseJson}
        meta={{ glossary_id: 'glo_pathology' }}
        libraryGlossaries={[{ glossary_id: 'glo_pathology', name: 'Pathology', term_count: 3 }]}
        libraryTerms={[]}
        onChangeMeta={() => {}}
        onChangeTerms={() => {}}
        onCreateGlossary={() => {}}
        onPublishTerm={() => {}}
        onApplySuggestion={() => {}}
      />
    );
    expect(html).toContain('Attached library glossary');
    expect(html).toContain('Publish to library');
    expect(html).toContain('Suggested links');
    expect(html).toContain('Accept link');
    expect(html).toContain('Reject');
  });

  it('keeps the no-glossary empty state graceful', () => {
    const html = renderToStaticMarkup(<GlossaryPanel courseJson={{ glossary_terms: [], pages: [] }} meta={{}} onChangeMeta={() => {}} onChangeTerms={() => {}} />);
    expect(html).toContain('No course-specific terms yet.');
    expect(html).toContain('No unreviewed glossary matches found.');
  });
});
