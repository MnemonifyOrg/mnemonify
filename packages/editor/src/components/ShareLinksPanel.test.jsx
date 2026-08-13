import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareLinksPanel from './ShareLinksPanel.jsx';

globalThis.React = React;

describe('ShareLinksPanel', () => {
  it('keeps link management out of the Reviewer surface', () => {
    const html = renderToStaticMarkup(<ShareLinksPanel courseId="course-1" canManage={false} published />);
    expect(html).toContain('Only course owners and editors can manage anonymous share links.');
    expect(html).not.toContain('Create link');
  });

  it('renders publish gating and expiration controls for an owner/editor', () => {
    const html = renderToStaticMarkup(<ShareLinksPanel courseId="course-1" canManage published={false} />);
    expect(html).toContain('Publish this course before creating a share link.');
    expect(html).toContain('Expiration (optional)');
    expect(html).toContain('Create link');
  });
});
