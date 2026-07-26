import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CourseHealthPanel from './CourseHealthPanel.jsx';

globalThis.React = React;

const findings = [
  {
    ruleId: 'reference.broken_reference',
    severity: 'error',
    category: 'reference',
    message: 'A block references a missing page.',
    entityType: 'block',
    entityId: 'blk_one',
    location: { page_id: 'pg_one', block_id: 'blk_one' },
  },
  {
    ruleId: 'accessibility.image_alt_missing',
    severity: 'warning',
    category: 'accessibility',
    message: 'Image is missing alt text.',
    entityType: 'asset',
    entityId: 'ast_one',
    location: {},
  },
];

describe('CourseHealthPanel', () => {
  it('groups findings under Reference and Accessibility with error/warning counts', () => {
    const html = renderToStaticMarkup(<CourseHealthPanel findings={findings} onNavigateToFinding={() => {}} />);

    expect(html).toContain('data-category="reference"');
    expect(html).toContain('data-category="accessibility"');
    expect(html).not.toContain('data-category="asset"');
    expect(html).toContain('1 error, 1 warning');
    expect(html).toContain('A block references a missing page.');
    expect(html).toContain('Image is missing alt text.');
  });

  it('renders each finding as a button so the parent can navigate by stable entity ID', () => {
    const html = renderToStaticMarkup(<CourseHealthPanel findings={findings} onNavigateToFinding={() => {}} />);

    expect(html).toContain('course-health__item-btn');
    expect(html).toContain('A block references a missing page.');
    expect(html).toContain('Image is missing alt text.');
  });

  it('shows the clean state when no findings exist', () => {
    const html = renderToStaticMarkup(<CourseHealthPanel findings={[]} onNavigateToFinding={() => {}} />);

    expect(html).toContain('No issues found');
    expect(html).not.toContain('data-category=');
  });
});
