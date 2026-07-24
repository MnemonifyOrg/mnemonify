import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MessagePayload from './MessagePayload.jsx';

globalThis.React = React;

describe('custom utility message payload', () => {
  it('renders legacy plain text literally instead of treating it as markup', () => {
    const html = renderToStaticMarkup(<MessagePayload payload={{ message: 'Use <Author> for help.' }} />);
    expect(html).toContain('Use &lt;Author&gt; for help.');
  });

  it('renders the optional rich-text message segments and live variables', () => {
    const html = renderToStaticMarkup(
      <MessagePayload payload={{ richText: [{ t: 'text', v: 'Score: ' }, { t: 'variable', var_name: 'ScorePercent' }] }} />,
    );
    expect(html).toContain('Score:');
    expect(html).toContain('data-variable="ScorePercent"');
  });
});
