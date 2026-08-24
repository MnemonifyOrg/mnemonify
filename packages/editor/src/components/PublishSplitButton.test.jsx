import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PublishSplitButton from './PublishSplitButton.jsx';
import { PUBLISH_MENU_ITEMS } from '../lib/publishMenu.js';

globalThis.React = React;

describe('PublishSplitButton', () => {
  it('keeps the main Publish action and exposes the three quick-navigation entries', () => {
    const html = renderToStaticMarkup(
      <PublishSplitButton onPublish={() => {}} onSelect={() => {}} publishing={false} published />,
    );

    expect(html).toContain('>Publish<');
    expect(html).toContain('aria-label="More publish options"');
    expect(PUBLISH_MENU_ITEMS.map((item) => item.label)).toEqual(['Share Links', 'SCORM Export', 'Publish Settings']);
  });

  it('marks Share Links and SCORM Export as publish-gated entries', () => {
    expect(PUBLISH_MENU_ITEMS.filter((item) => item.requiresPublished).map((item) => item.id)).toEqual(['share-links', 'scorm-export']);
    expect(PUBLISH_MENU_ITEMS.find((item) => item.id === 'publish-settings').requiresPublished).toBeUndefined();
  });
});
