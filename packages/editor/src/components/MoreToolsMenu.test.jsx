import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MoreToolsMenu from './MoreToolsMenu.jsx';

globalThis.React = React;

describe('MoreToolsMenu', () => {
  it('supports the modern icon-only trigger with an accessible label and tooltip', () => {
    const html = renderToStaticMarkup(
      <MoreToolsMenu
        iconOnly
        ariaLabel="More tools"
        icon={<span aria-hidden="true">•••</span>}
        items={[{ label: 'Image Library', onClick: () => {} }]}
      />
    );

    expect(html).toContain('aria-label="More tools"');
    expect(html).toContain('title="More tools"');
    expect(html).toContain('course-editor__icon-button');
    expect(html).not.toContain('>More tools ▾<');
  });
});
