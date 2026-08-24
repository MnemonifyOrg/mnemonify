import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ToolsMenu from './ToolsMenu.jsx';
import { visibleToolGroups } from '../lib/editorDrawer.js';

globalThis.React = React;

describe('ToolsMenu', () => {
  it('renders grouped navigation with flagged entries only when enabled', () => {
    const html = renderToStaticMarkup(
      <ToolsMenu featureFlags={{ glossary: false, versionHistory: false }} onSelect={() => {}} />,
    );

    expect(html).toContain('Tools');
    expect(html).toContain('aria-haspopup="true"');
    const items = visibleToolGroups({ glossary: false, versionHistory: false })
      .flatMap((group) => group.items)
      .map((item) => item.id);
    expect(items).toEqual(['course', 'player', 'variables', 'objectives', 'question-banks', 'comments', 'course-health', 'publish-share']);
  });
});
